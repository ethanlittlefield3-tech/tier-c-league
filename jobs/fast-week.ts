/**
 * The fast test league (PHASE1.md, Checkpoint D): makes a demo league whose
 * days last a few minutes, then plays its three made-up players and settles
 * its weeks as it goes, so a whole week of locks, reveals, settlement and the
 * Wheel plays out in about an hour and a half while the commish watches.
 *
 *   On GitHub:  Actions, "Fast test week", Run workflow
 *   Locally:    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node jobs/fast-week.ts
 *
 *   node jobs/fast-week.ts          make a fast league and run it
 *   node jobs/fast-week.ts make     only make it
 *   node jobs/fast-week.ts step     one turn for the made-up players (LEAGUE_ID)
 *
 * DAY_MINUTES sets each day's length (8), LEAD_MINUTES the time before Monday
 * of Week 1 starts (5), and RUN_MINUTES how long to run (until Week 2's
 * Saturday, about 100 minutes). LEAGUE_ID runs a fast league made earlier. It refuses any league
 * that isn't a fast demo league. Logs are public, so it logs counts and IDs
 * only, never the code or a key: both are in the Firebase console.
 */
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Timestamp, getFirestore, type DocumentData, type DocumentReference } from 'firebase-admin/firestore';
import { makeRecoveryKey } from '../engine/src/ids.ts';
import { connect } from './admin.ts';
import { botMoves, type BotDay, type BotState } from './lib/bots.ts';
import { FAST_BOTS, fastClockOf, fastDocs } from './lib/fast.ts';
import { newLeague } from './lib/league-seed.ts';

const { app, emulator } = connect();
const db = getFirestore(app);
const run = promisify(execFile);
const weeklyJob = fileURLToPath(new URL('./weekly.ts', import.meta.url));
const random = (bytes: number) => new Uint8Array(randomBytes(bytes));
const ms = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : value);
const plain = (data: DocumentData) => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, ms(value)]));
const number = (name: string, fallback: number) => {
  const value = Number(process.env[name]?.trim() || fallback);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number.`);
  return value;
};

const mode = process.argv[2] ?? 'run';
if (!['run', 'make', 'step'].includes(mode)) throw new Error(`Unknown mode "${mode}": use run, make or step.`);
const dayMinutes = number('DAY_MINUTES', 8);
if (dayMinutes < 1 || dayMinutes > 60) throw new Error('DAY_MINUTES must be from 1 to 60.');

/** Makes a fast league and returns its id. */
async function make(): Promise<string> {
  const league = newLeague({ name: 'Fast Test League', commishName: 'Commish', random });
  const bots = FAST_BOTS.map(() => ({ id: Array.from(random(16), (byte) => 'abcdefghjkmnpqrstuvwxyz23456789'[byte % 30]).join(''), key: makeRecoveryKey(random(8)) }));
  const docs = fastDocs({ league, bots, now: Date.now(), dayMinutes, leadMinutes: number('LEAD_MINUTES', 5), timeZone: process.env.TIME_ZONE?.trim() || 'America/New_York' });
  // The league and its code are created, never overwritten; the rest goes in batches.
  const first = db.batch();
  for (const { path, data } of docs.slice(0, 5)) first.create(db.doc(path), data);
  await first.commit();
  for (let start = 5; start < docs.length; start += 400) {
    const batch = db.batch();
    for (const { path, data } of docs.slice(start, start + 400)) batch.set(db.doc(path), data);
    await batch.commit();
  }
  console.log(`Fast test league made${emulator ? ' in the local emulator' : ''}: id ${league.id}, ${bots.length + 1} players, days of ${dayMinutes} minutes.`);
  console.log('To watch, on a computer (so your phone stays in your real league), you need two things from the Firebase console, under Firestore Database:');
  console.log(`  1. The league code: open "codes" and find the document whose "league" field is ${league.id}. The code is its name.`);
  console.log(`  2. The recovery key: open leagues, ${league.id}, keys, ${league.commish}. The key is its "key" field.`);
  console.log('Then open the app, tap "I\'m already in a league", and enter both.');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `league=${league.id}\n`);
  return league.id;
}

/** The league, checked to be a fast demo league, with what the turns need that never changes. */
async function open(id: string) {
  const league = await db.collection('leagues').doc(id).get();
  const seasonRef = league.ref.collection('seasons').doc(String(league.get('season')));
  const season = await seasonRef.get();
  const clock = league.exists && season.exists ? fastClockOf({ demo: league.get('demo') }, { fast: plain(season.get('fast') ?? {}) }) : null;
  if (!clock) throw new Error(`League ${id} is not a fast test league. Only a league made by this job can run fast.`);
  const calendar = (await seasonRef.collection('calendar').get()).docs.map((day) => plain(day.data()) as unknown as BotDay).sort((a, b) => a.start - b.start);
  return { seasonRef, clock, calendar, watcher: String(league.get('commish')) };
}

/** One turn: what the made-up players see, and what they do. Returns how many saves. */
async function turn(league: string, setup: Awaited<ReturnType<typeof open>>): Promise<number> {
  const { seasonRef, clock, calendar, watcher } = setup;
  const now = Date.now();
  const bots = clock.bots;
  const players = [watcher, ...bots];
  const today = calendar.find((day) => day.start <= now && now < day.end);
  const period = today?.period ?? null;
  const openDays = calendar.filter((day) => day.start <= now && now < day.lock);

  const weeks = await seasonRef.collection('weeks').get();
  const targets: BotState['targets'] = Object.fromEntries(weeks.docs.map((week) => [week.id, (week.get('targets') ?? {}) as Record<string, string[]>]));
  const draws = weeks.docs.flatMap((week) => Object.values((week.get('wheel') ?? {}) as Record<string, DocumentData>).map((draw) => ({ id: String(draw.id), player: String(draw.player), period: week.id, drawnAt: Number(ms(draw.drawnAt)), dueAt: Number(ms(draw.dueAt)) })));
  const rival = period ? targets[period]?.[watcher]?.[0] : undefined;

  const read = async (refs: DocumentReference[]) => (refs.length ? db.getAll(...refs) : []);
  const [dayDocs, kitDocs, sealedDocs, spinDocs, slotDocs, wallDocs] = await Promise.all([
    read(players.flatMap((player) => openDays.map((day) => seasonRef.collection('days').doc(`${player}_${day.date}`)))),
    read(period ? bots.flatMap((bot) => ['aerial', 'fullBoost'].map((item) => seasonRef.collection('kit').doc(`${period}_${bot}_${item}`))) : []),
    read(period ? bots.map((bot) => seasonRef.collection('sealed').doc(`${period}_${bot}_demolition`)) : []),
    read(draws.map((draw) => seasonRef.collection('spins').doc(draw.id))),
    read(period && rival ? [seasonRef.collection('receiptSlots').doc(`${period}_${rival}_1`)] : []),
    read([seasonRef.parent.parent!.collection('wall').doc('fast-taunt')]),
  ]);
  const spins: BotState['spins'] = Object.fromEntries(spinDocs.filter((spin) => spin.exists).map((spin) => [spin.id, { at: Number(ms(spin.get('at'))), proofAt: spin.get('proofAt') ? Number(ms(spin.get('proofAt'))) : null }]));
  const proven = draws.filter((draw) => spins[draw.id]?.proofAt != null);
  const voteDocs = await read(proven.flatMap((draw) => bots.map((bot) => seasonRef.collection('votes').doc(`${bot}_proof_${draw.id}`))));
  const ids = (docs: FirebaseFirestore.DocumentSnapshot[]) => docs.filter((found) => found.exists).map((found) => found.id);

  const moves = botMoves({
    now,
    calendar,
    bots,
    watcher,
    days: Object.fromEntries(dayDocs.filter((day) => day.exists).map((day) => [day.id, { goals: day.get('goals') }])),
    kit: ids(kitDocs),
    sealed: ids(sealedDocs),
    targets,
    draws,
    spins,
    votes: ids(voteDocs),
    slots: ids(slotDocs),
    wall: ids(wallDocs),
  });
  if (moves.length === 0) return 0;
  const batch = db.batch();
  for (const move of moves) {
    const ref = move.under === 'league' ? seasonRef.parent.parent!.collection(move.path.split('/')[0]!).doc(move.path.split('/')[1]!) : seasonRef.collection(move.path.split('/')[0]!).doc(move.path.split('/')[1]!);
    if (move.merge) batch.set(ref, move.data, { merge: true });
    else batch.set(ref, move.data);
  }
  await batch.commit();
  console.log(`League ${league}: ${moves.length} save${moves.length === 1 ? '' : 's'} by the made-up players${today ? ` (${today.period}, day ${today.dayIndex + 1})` : ''}.`);
  return moves.length;
}

/** The weekly job, for this league only: results, reveals, the Wheel and the standings. */
async function settle(league: string): Promise<void> {
  const { stdout } = await run(process.execPath, [weeklyJob], { env: { ...process.env, LEAGUE_ID: league } });
  for (const line of stdout.split('\n')) if (/provisional|final|revealed|Wheel draw/.test(line)) console.log(line);
}

const given = process.env.LEAGUE_ID?.trim();
if (mode === 'make') {
  await make();
} else if (mode === 'step') {
  if (!given) throw new Error('Set LEAGUE_ID to the fast league to play a turn in.');
  await turn(given, await open(given));
} else {
  const id = given || (await make());
  const setup = await open(id);
  // Long enough for Week 1 to go final, the Wheel to be drawn, and its dare proven and voted on.
  const runFor = number('RUN_MINUTES', Math.max(0, (setup.clock.startsAt - Date.now()) / 60_000) + 12 * dayMinutes);
  const end = Date.now() + runFor * 60_000;
  console.log(`Running league ${id} for ${Math.round(runFor)} minutes.`);
  let lastSettle = 0;
  while (Date.now() < end) {
    await turn(id, setup);
    if (Date.now() - lastSettle >= 2 * 60_000) {
      lastSettle = Date.now();
      await settle(id);
    }
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }
  await settle(id);
  console.log(`Done: league ${id} ran for ${Math.round(runFor)} minutes. Delete it with "Demo league", "delete", when you're finished.`);
}
