/**
 * Settles each finished week and keeps the standings.
 *
 *   On GitHub:  every hour (Actions, "Settle the weeks"), and by hand
 *   Locally:    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node jobs/weekly.ts
 *
 * Once a week's Sunday locks (noon on Monday) its results post as
 * provisional; at midnight on Tuesday they are final. Safe to run any number
 * of times: it works everything out again from the logs. LEAGUE_ID limits it
 * to one league. Logs are public, so it logs counts and IDs only.
 */
import { randomInt } from 'node:crypto';
import { FieldValue, Timestamp, getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { connect } from './admin.ts';
import { DODGE_PENALTY, STARTER_DARES, dareStatus, receiptFixes, wheelPool, type StoredReceipt } from '../engine/src/index.ts';
import { PROOF_DAYS, staleProofs } from './lib/proofs.ts';
import { revealDemolitions, sameReveals } from './lib/reveals.ts';
import { approvedDares, drawsDue, type Draw } from './lib/wheel.ts';
import { settleDue, standingsFrom, type PlayerWeekData, type WeekLineStored } from './lib/settle.ts';

const { app, emulator } = connect();
const db = getFirestore(app);
const ms = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : value);
const plain = (data: DocumentData) => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, ms(value)]));

const only = process.env.LEAGUE_ID?.trim();
const leagues = only ? [await db.collection('leagues').doc(only).get()] : (await db.collection('leagues').get()).docs;
const now = Date.now();
let settledWeeks = 0;

for (const league of leagues) {
  const seasonId = league.get('season');
  if (!league.exists || typeof seasonId !== 'string') continue;
  const seasonRef = league.ref.collection('seasons').doc(seasonId);
  const season = await seasonRef.get();
  if (!season.exists) continue;
  const members = Object.keys((league.get('members') ?? {}) as Record<string, boolean>);

  const calendar = (await seasonRef.collection('calendar').get()).docs.map((day) => plain(day.data()));
  const weeks = (await seasonRef.collection('weeks').get()).docs.sort((a, b) => Number(a.get('week')) - Number(b.get('week')));

  // Each player's points in the weeks already settled, oldest first, for the Bust.
  const earlier: Record<string, number[]> = {};
  const addEarlier = (lines: WeekLineStored[]) => {
    for (const line of lines) (earlier[line.player] ??= []).push(line.points);
  };

  for (const week of weeks) {
    const pairs = week.get('pairs') as { a: string; b: string }[] | undefined;
    if (!Array.isArray(pairs) || pairs.length === 0) continue;
    if (week.get('status') === 'final') {
      addEarlier((week.get('lines') ?? []) as WeekLineStored[]);
      continue;
    }
    const period = week.id;
    const days = calendar.filter((day) => day.period === period) as unknown as Parameters<typeof settleDue>[0]['days'];
    if (days.length === 0) continue;

    const players: Record<string, PlayerWeekData> = {};
    for (const player of new Set(pairs.flatMap((pair) => [pair.a, pair.b]).filter((id) => id !== 'HOUSE'))) {
      const logs = await db.getAll(...days.map((day) => seasonRef.collection('days').doc(`${player}_${day.date}`)));
      const kit = await seasonRef.collection('kit').where('player', '==', player).get();
      const fixes = await seasonRef.collection('adjustments').where('player', '==', player).get();
      // Receipts count like the commish's fixes: backed down, or failed once the deadline passes.
      const asked = await seasonRef.collection('receipts').where('target', '==', player).get();
      players[player] = {
        logs: Object.fromEntries(logs.filter((log) => log.exists).map((log) => [log.get('date'), plain(log.data()!) as unknown as PlayerWeekData['logs'][string]])),
        kit: kit.docs.map((play) => plain(play.data()) as unknown as PlayerWeekData['kit'][number]),
        adjustments: [
          ...fixes.docs.map((fix) => plain(fix.data()) as unknown as PlayerWeekData['adjustments'][number]),
          ...receiptFixes(asked.docs.map((receipt) => plain(receipt.data()) as unknown as StoredReceipt), now),
        ],
      };
    }
    const sealed = await seasonRef.collection('sealed').where('period', '==', period).get();
    const demolitions = sealed.docs.filter((item) => item.get('kind') === 'demolition').map((item) => plain(item.data()) as unknown as Parameters<typeof settleDue>[0]['demolitions'][number]);

    // Demolitions whose day has locked, with how they went, for the feed.
    const reveals = revealDemolitions({ par: season.get('par'), timeZone: season.get('timeZone'), days, players, demolitions, now });
    if (!sameReveals(reveals, week.get('reveals'))) {
      await week.ref.set({ reveals }, { merge: true });
      console.log(`League ${league.id}, ${period}: ${reveals.length} Demolition${reveals.length === 1 ? '' : 's'} revealed.`);
    }

    const settled = settleDue({
      week: Number(week.get('week')),
      period,
      par: season.get('par'),
      timeZone: season.get('timeZone'),
      days,
      pairs,
      players,
      demolitions,
      earlier,
      now,
    });
    if (!settled) continue;

    await week.ref.set(
      {
        status: settled.status,
        results: settled.results,
        house: settled.house,
        awards: settled.awards,
        lines: settled.lines,
        ...(week.get('settledAt') ? {} : { settledAt: FieldValue.serverTimestamp() }),
        ...(settled.status === 'final' ? { finalAt: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true },
    );
    settledWeeks += 1;
    if (settled.status === 'final') addEarlier(settled.lines);
    console.log(`League ${league.id}, ${period}: ${settled.status}, ${settled.lines.length} players.`);
  }

  // The Wheel of Shame: once a week is final, a sealed draw for each of its
  // spinners, and a new one when a dare's proof is voted down. The pool is the
  // draft's dares that stand, then starter dares in a random order.
  const finalWeeks = (await seasonRef.collection('weeks').get()).docs.filter((week) => week.get('status') === 'final' && Array.isArray(week.get('awards')?.wheel));
  // Each dodged dare (no proof by the deadline) takes 3 Season Points off.
  const penalties: Record<string, number> = {};
  if (finalWeeks.length > 0) {
    const spins = await seasonRef.collection('spins').get();
    const proofVotes = (await seasonRef.collection('votes').where('kind', '==', 'proof').get()).docs.map((vote) => vote.data());
    let pool: string[] | null = null;
    const poolNow = async () => {
      if (pool) return pool;
      const dares = (await seasonRef.collection('dares').get()).docs.map((dare) => ({ player: dare.id, text: String(dare.get('text')), version: Number(dare.get('version')) }));
      const votes = (await seasonRef.collection('votes').where('kind', '==', 'dare').get()).docs.map((vote) => ({ player: String(vote.get('player')), version: Number(vote.get('version')), choice: String(vote.get('choice')) }));
      const order = STARTER_DARES.map((_, index) => ({ index, key: randomInt(1_000_000_000) })).sort((a, b) => a.key - b.key).map((item) => item.index);
      pool = wheelPool(approvedDares(dares, votes, Math.max(0, members.length - 1)), STARTER_DARES, order);
      return pool;
    };
    for (const week of finalWeeks) {
      const existing = (week.get('wheel') ?? {}) as Record<string, Draw>;
      const statuses = Object.values(existing).map((draw) => {
        const spin = spins.docs.find((found) => found.id === draw.id);
        const votes = proofVotes.filter((vote) => vote.draw === draw.id);
        const status = dareStatus({
          spunAt: spin ? Number(ms(spin.get('at'))) : null,
          proofAt: spin?.get('proofAt') ? Number(ms(spin.get('proofAt'))) : null,
          dueAt: Number(ms(draw.dueAt)),
          now,
          eligible: Math.max(0, members.length - 1),
          counts: votes.filter((vote) => vote.choice === 'counts').length,
          doesntCount: votes.filter((vote) => vote.choice === 'doesntCount').length,
        });
        return { draw, status };
      });
      for (const { draw, status } of statuses) {
        if (status === 'dodged') penalties[draw.player] = (penalties[draw.player] ?? 0) + DODGE_PENALTY;
      }
      const redo = statuses.filter(({ status }) => status === 'redo').map(({ draw }) => draw.id);
      const spinners = (week.get('awards').wheel as string[]).filter((player) => player !== 'HOUSE');
      const needsDraw = spinners.some((player) => !existing[`${week.id}_${player}_1`]) || redo.length > 0;
      if (!needsDraw) continue;
      const due = drawsDue({ period: week.id, spinners, existing, redo, pool: await poolNow(), now, timeZone: season.get('timeZone'), roll: () => randomInt(1_000_000_000) });
      if (due.length === 0) continue;
      const batch = db.batch();
      for (const { draw, slice } of due) {
        batch.set(seasonRef.collection('sealed').doc(`wheel_${draw.id}`), { kind: 'wheel', draw: draw.id, slice, dare: draw.pool[slice] });
        // Times are stored as timestamps: the security rules compare the deadline with the server's clock.
        batch.set(week.ref, { wheel: { [draw.id]: { ...draw, drawnAt: Timestamp.fromMillis(draw.drawnAt), dueAt: Timestamp.fromMillis(draw.dueAt) } } }, { merge: true });
      }
      await batch.commit();
      console.log(`League ${league.id}, ${week.id}: ${due.length} Wheel draw${due.length === 1 ? '' : 's'} sealed.`);
    }
  }

  // Proof photos go after 14 days, for receipts and Wheel dares alike. Only
  // their times are read, never the photos.
  for (const kind of ['proofs', 'dareProofs']) {
    const proofs = await seasonRef.collection(kind).select('at').get();
    const stale = staleProofs(
      proofs.docs.map((proof) => ({ id: proof.id, at: Number(ms(proof.get('at'))) })),
      now,
    );
    for (let start = 0; start < stale.length; start += 400) {
      const batch = db.batch();
      for (const id of stale.slice(start, start + 400)) batch.delete(seasonRef.collection(kind).doc(id));
      await batch.commit();
    }
    if (stale.length > 0) console.log(`League ${league.id}: ${stale.length} ${kind === 'proofs' ? 'receipt' : 'dare'} photo${stale.length === 1 ? '' : 's'} deleted after ${PROOF_DAYS} days.`);
  }

  // The standings, from every week with results. Each player's sealed coin
  // for the last tiebreak is drawn once, here, with real randomness.
  const settledDocs = (await seasonRef.collection('weeks').get()).docs.filter((week) => week.get('results'));
  const coins: Record<string, number> = {};
  for (const player of members) {
    const coinRef = seasonRef.collection('sealed').doc(`coin_${player}`);
    const coin = await coinRef.get();
    if (coin.exists) {
      coins[player] = Number(coin.get('value'));
    } else {
      coins[player] = randomInt(1_000_000_000) / 1_000_000_000;
      await coinRef.set({ kind: 'coin', player, value: coins[player], revealAt: Timestamp.fromMillis(Date.UTC(2100, 0, 1)) });
    }
  }
  const rows = standingsFrom({
    members,
    weeks: settledDocs.map((week) => ({ results: week.get('results'), lines: week.get('lines') ?? [] })),
    coins,
    penalties,
  });
  await seasonRef
    .collection('standings')
    .doc('current')
    .set({ rows: rows.map(({ coin: _coin, ...row }) => row), asOf: FieldValue.serverTimestamp() });
  console.log(`League ${league.id}, season ${seasonId}: standings for ${rows.length} players.`);
}

console.log(`Done: ${settledWeeks} week${settledWeeks === 1 ? '' : 's'} settled${emulator ? ' in the local emulator' : ''}.`);
