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
import { DODGE_PENALTY, STARTER_DARES, dareStatus, fastDareDue, fastLeagueClock, receiptFixes, wheelPool, zoneClock, type StoredReceipt } from '../engine/src/index.ts';
import { fastClockOf } from './lib/fast.ts';
import { PROOF_DAYS, staleProofs } from './lib/proofs.ts';
import { revealDemolitions, sameReveals } from './lib/reveals.ts';
import { approvedDares, drawsDue, type Draw } from './lib/wheel.ts';
import { settleDue, standingsFrom, type PlayerWeekData, type WeekLineStored } from './lib/settle.ts';
import { badgeUpdate, seasonBadgeData } from './lib/badge-facts.ts';
import { reactionCount } from './lib/activity.ts';
import { withWeek, type RankEntry } from './lib/ranks.ts';
import { weekReads } from './lib/week-reads.ts';

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

  let wentFinal = false;
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

    // This period's Demolitions: one query, and nothing more while none can be revealed or settled.
    const sealed = await seasonRef.collection('sealed').where('period', '==', period).get();
    const demolitions = sealed.docs.filter((item) => item.get('kind') === 'demolition').map((item) => plain(item.data()) as unknown as Parameters<typeof settleDue>[0]['demolitions'][number]);
    const reads = weekReads({ days, pairs, demolitions, now });
    if (!reads) continue;

    const players: Record<string, PlayerWeekData> = {};
    for (const player of reads.players) {
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
    if (settled.status === 'final') {
      addEarlier(settled.lines);
      // Ranks update when results go final: each player's history gains the week (SCOPE.md, "Ranks and trophies").
      for (const line of settled.lines) {
        const profile = league.ref.collection('players').doc(line.player);
        const found = await profile.get();
        if (!found.exists) continue;
        const result = settled.results[line.player];
        const ranked = withWeek((found.get('rankHistory') ?? []) as RankEntry[], {
          season: seasonId,
          period,
          points: line.points,
          par: Number(season.get('par')),
          ...(result ? { outcome: result.outcome, against: result.opponentPoints } : {}),
        });
        await profile.set({ rank: ranked.rank, rankHistory: ranked.history }, { merge: true });
        // A rank change is news for the league feed.
        const before = found.get('rank') as string | undefined;
        if (before !== ranked.rank) {
          await league.ref.collection('feed').doc(`rank_${line.player}_${seasonId}_${period}`).set({ at: FieldValue.serverTimestamp(), kind: 'rank', player: line.player, data: { rank: ranked.rank, from: before ?? null } });
        }
      }
      wentFinal = true;
    }
    console.log(`League ${league.id}, ${period}: ${settled.status}, ${settled.lines.length} players.`);
  }

  // The Wheel of Shame: once a week is final, a sealed draw for each of its
  // spinners, and a new one when a dare's proof is voted down. The pool is the
  // draft's dares that stand, then starter dares in a random order.
  const finalWeeks = (await seasonRef.collection('weeks').get()).docs.filter((week) => week.get('status') === 'final' && Array.isArray(week.get('awards')?.wheel));
  // Each dodged dare (no proof by the deadline) takes 3 Season Points off.
  const penalties: Record<string, number> = {};
  const daresDone: Record<string, number> = {};
  if (finalWeeks.length > 0) {
    const spins = await seasonRef.collection('spins').get();
    const proofVotes = (await seasonRef.collection('votes').where('kind', '==', 'proof').get()).docs.map((vote) => vote.data());
    let pool: string[] | null = null;
    const poolNow = async () => {
      if (pool) return pool;
      const dares = (await seasonRef.collection('dares').get()).docs.map((dare) => ({ player: dare.id, text: String(dare.get('text')), version: Number(dare.get('version')), removed: dare.get('removed') === true }));
      const votes = (await seasonRef.collection('votes').where('kind', '==', 'dare').get()).docs.map((vote) => ({ player: String(vote.get('player')), version: Number(vote.get('version')), choice: String(vote.get('choice')) }));
      // Starter dares the commish took off the Wheel stay off it.
      const removed = ((await seasonRef.collection('config').doc('wheel').get()).get('removedStarters') ?? []) as number[];
      const order = STARTER_DARES.map((_, index) => ({ index, key: randomInt(1_000_000_000) }))
        .filter((item) => !removed.includes(item.index))
        .sort((a, b) => a.key - b.key)
        .map((item) => item.index);
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
        if (status === 'counted') daresDone[draw.player] = (daresDone[draw.player] ?? 0) + 1;
      }
      const redo = statuses.filter(({ status }) => status === 'redo').map(({ draw }) => draw.id);
      const spinners = (week.get('awards').wheel as string[]).filter((player) => player !== 'HOUSE');
      const needsDraw = spinners.some((player) => !existing[`${week.id}_${player}_1`]) || redo.length > 0;
      if (!needsDraw) continue;
      // A fast test league's dares are due on its own clock.
      const fast = fastClockOf({ demo: league.get('demo') }, { fast: plain(season.get('fast') ?? {}) });
      const dueOf = fast ? (drawnAt: number) => fastDareDue(String(season.get('kickoff')), fast, drawnAt) : undefined;
      const due = drawsDue({ period: week.id, spinners, existing, redo, pool: await poolNow(), now, timeZone: season.get('timeZone'), dueOf, roll: () => randomInt(1_000_000_000) });
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

  // Badges (SCOPE.md, "Garage and achievements"): once a week goes final,
  // each player's season is checked again. What is newly earned is kept for
  // good and announced in the league feed. One read of the season a week.
  if (wentFinal) {
    const fresh = await (async () => {
      const [allWeeks, days, kit, fixes, asked, sealed, wall] = await Promise.all([
        seasonRef.collection('weeks').get(),
        seasonRef.collection('days').get(),
        seasonRef.collection('kit').get(),
        seasonRef.collection('adjustments').get(),
        seasonRef.collection('receipts').get(),
        seasonRef.collection('sealed').where('kind', '==', 'demolition').get(),
        league.ref.collection('wall').get(),
      ]);
      const finals = allWeeks.docs.filter((week) => week.get('status') === 'final' && week.get('results')).sort((a, b) => Number(a.get('week')) - Number(b.get('week')));
      const fast = fastClockOf({ demo: league.get('demo') }, { fast: plain(season.get('fast') ?? {}) });
      const clock = fast ? fastLeagueClock(String(season.get('kickoff')), fast) : zoneClock(String(season.get('timeZone')));
      const lockOf = (date: string) => calendar.find((day) => day.date === date)?.lock as number | undefined;
      const players: Parameters<typeof seasonBadgeData>[0]['players'] = {};
      const mineOf = (player: string) => (players[player] ??= { logs: {}, kit: [], adjustments: [], demolitionsOn: [] });
      for (const log of days.docs) mineOf(String(log.get('player'))).logs[String(log.get('date'))] = plain(log.data()) as never;
      for (const play of kit.docs) mineOf(String(play.get('player'))).kit.push(plain(play.data()) as never);
      for (const fix of fixes.docs) mineOf(String(fix.get('player'))).adjustments.push(plain(fix.data()) as never);
      const receiptsBy: Record<string, StoredReceipt[]> = {};
      for (const receipt of asked.docs) (receiptsBy[String(receipt.get('target'))] ??= []).push(plain(receipt.data()) as unknown as StoredReceipt);
      for (const [player, list] of Object.entries(receiptsBy)) mineOf(player).adjustments.push(...receiptFixes(list, now));
      for (const hit of sealed.docs) {
        const lock = lockOf(String(hit.get('date')));
        if (lock !== undefined && now >= lock) mineOf(String(hit.get('target'))).demolitionsOn.push({ date: String(hit.get('date')), lane: hit.get('lane') });
      }
      const history = seasonBadgeData({
        season: seasonId,
        par: Number(season.get('par')),
        clock,
        calendar: calendar as never,
        weeks: finals.map((week) => ({ period: week.id, results: week.get('results'), awards: week.get('awards'), reveals: week.get('reveals') ?? [] })),
        players,
      });
      // The season is over once every regular week is final: then the most beers is a shame badge.
      const regular = Number(season.get('regularWeeks'));
      const over = finals.length >= regular && regular > 0;
      const beers: Record<string, number> = {};
      for (const week of finals) for (const line of (week.get('lines') ?? []) as WeekLineStored[]) beers[line.player] = (beers[line.player] ?? 0) + line.beers;
      const mostBeers = Math.max(0, ...Object.values(beers));
      const posts = wall.docs.map((post) => ({ id: post.id, ...plain(post.data()) })) as unknown as (Parameters<typeof reactionCount>[0] & { kind: string; deleted?: boolean })[];
      const news: { player: string; badge: string }[] = [];
      for (const player of members) {
        const profile = league.ref.collection('players').doc(player);
        const found = await profile.get();
        if (!found.exists) continue;
        const mine = posts.filter((post) => post.by === player && !post.deleted);
        const had = Object.keys((found.get('badges') ?? {}) as Record<string, unknown>);
        const update = badgeUpdate(had, {
          days: history[player]?.days ?? [],
          weeks: history[player]?.weeks ?? [],
          finishedSeasons: over ? [{ id: seasonId, mostBeers: mostBeers > 0 && beers[player] === mostBeers }] : [],
          commishSeasons: league.get('commish') === player && finals.length > 0 ? 1 : 0,
          tauntsSent: mine.filter((post) => post.kind === 'taunt' || post.kind === 'quick').length,
          bragReactions: mine.filter((post) => post.kind === 'brag').map(reactionCount),
          reactionsReceived: mine.reduce((sum, post) => sum + reactionCount(post), 0),
          daresCompleted: daresDone[player] ?? 0,
          reachedGrandChamp: ((found.get('rankHistory') ?? []) as RankEntry[]).some((entry) => entry.rank === 'grandChamp'),
        });
        if (update.fresh.length === 0) continue;
        await profile.set({ badges: Object.fromEntries(update.fresh.map((badge) => [badge, { at: FieldValue.serverTimestamp(), season: seasonId }])) }, { merge: true });
        for (const badge of update.fresh) {
          await league.ref.collection('feed').doc(`badge_${player}_${badge}`).set({ at: FieldValue.serverTimestamp(), kind: 'badge', player, data: { badge } });
          news.push({ player, badge });
        }
      }
      return news.length;
    })();
    if (fresh > 0) console.log(`League ${league.id}: ${fresh} badge${fresh === 1 ? '' : 's'} earned.`);
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
