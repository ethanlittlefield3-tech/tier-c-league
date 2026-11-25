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
import { revealDemolitions, sameReveals } from './lib/reveals.ts';
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
      players[player] = {
        logs: Object.fromEntries(logs.filter((log) => log.exists).map((log) => [log.get('date'), plain(log.data()!) as unknown as PlayerWeekData['logs'][string]])),
        kit: kit.docs.map((play) => plain(play.data()) as unknown as PlayerWeekData['kit'][number]),
        adjustments: fixes.docs.map((fix) => plain(fix.data()) as unknown as PlayerWeekData['adjustments'][number]),
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
  });
  await seasonRef
    .collection('standings')
    .doc('current')
    .set({ rows: rows.map(({ coin: _coin, ...row }) => row), asOf: FieldValue.serverTimestamp() });
  console.log(`League ${league.id}, season ${seasonId}: standings for ${rows.length} players.`);
}

console.log(`Done: ${settledWeeks} week${settledWeeks === 1 ? '' : 's'} settled${emulator ? ' in the local emulator' : ''}.`);
