/**
 * The practice week (the commish's request, 2026-11-28): one week of the
 * whole game inside the league, each day a few minutes long, that the commish
 * asks for in Commish tools before a season starts. It runs as its own
 * season, `practice`, and nothing in it counts: the weekly job settles it
 * with everything that reaches a profile switched off, and it clears itself
 * once its results have been up for a while.
 *
 *   node jobs/practice.ts check   From the alerts workflow, every 10 minutes:
 *                                 which leagues need their practice job
 *                                 started (for GITHUB_OUTPUT), and clears
 *                                 finished practice weeks.
 *   node jobs/practice.ts run     LEAGUE_ID: sets the week up, then runs it:
 *                                 alerts every half minute and settlement
 *                                 every two, until its results are final.
 *   node jobs/practice.ts setup   LEAGUE_ID: only sets it up, from the request.
 *   node jobs/practice.ts clear   LEAGUE_ID: clears it away now.
 *
 * Locally, with FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 set. Logs are public:
 * counts and IDs only.
 */
import { execFile } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { FieldValue, Timestamp, getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { PRACTICE_MODES, PRACTICE_SEASON, practiceWindow, type PracticeMode } from '../engine/src/practice.ts';
import type { Lane } from '../engine/src/scoring.ts';
import { connect } from './admin.ts';
import { practiceClearAt, practiceDocs, practiceStep, type PracticeMarkRead, type PracticeRequest } from './lib/practice.ts';

const { app, emulator } = connect();
const db = getFirestore(app);
const run = promisify(execFile);
const MIN = 60_000;
const ms = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : value);
const plain = (data: DocumentData | undefined) => Object.fromEntries(Object.entries(data ?? {}).map(([key, value]) => [key, ms(value)]));
const job = (name: string) => fileURLToPath(new URL(`./${name}.ts`, import.meta.url));
const sleep = (wait: number) => new Promise((resolve) => setTimeout(resolve, wait));

/** The weekly or alerts job, for this league's practice week only. */
async function practiceJob(name: 'weekly' | 'tick', league: string): Promise<void> {
  const { stdout } = await run(process.execPath, [job(name)], { env: { ...process.env, LEAGUE_ID: league, SEASON_ID: PRACTICE_SEASON } });
  for (const line of stdout.split('\n')) if (/provisional|final|alerts,/.test(line)) console.log(line);
}

/** Clears a league's practice week away: its season, its trash talk, its alerts' record, the mark and the request. */
async function clear(id: string): Promise<void> {
  const league = db.collection('leagues').doc(id);
  const seasonRef = league.collection('seasons').doc(PRACTICE_SEASON);
  const season = await seasonRef.get();
  // Never a real season, whatever it is called.
  if (season.exists && season.get('practice') !== true) throw new Error(`League ${id}: the season called "${PRACTICE_SEASON}" isn't a practice week, so it is left alone.`);
  await db.recursiveDelete(seasonRef);
  const talk = await league.collection('wall').where('practice', '==', true).get();
  for (const post of talk.docs) await db.recursiveDelete(post.ref);
  await db.collection('jobs').doc(`tick_${id}_practice`).delete();
  if ((await league.get()).exists) await league.update({ practice: FieldValue.delete() });
  await league.collection('practice').doc('request').delete();
  console.log(`League ${id}: practice week cleared, with ${talk.size} practice post${talk.size === 1 ? '' : 's'}.`);
}

/** Sets a league's practice week up from the commish's request. Returns its start and when its results go final, or null if it can't run. */
async function setUp(id: string): Promise<{ startsAt: number; finalAt: number } | null> {
  const league = await db.collection('leagues').doc(id).get();
  const requestRef = league.ref.collection('practice').doc('request');
  const request = plain((await requestRef.get()).data());
  const realId = league.get('season');
  const real = typeof realId === 'string' ? await league.ref.collection('seasons').doc(realId).get() : null;
  const kickoff = real?.exists && typeof real.get('kickoff') === 'string' ? await real.ref.collection('calendar').doc(String(real.get('kickoff'))).get() : null;
  // A late start moves the whole week on, so every day keeps its length.
  const startsAt = Math.max(Number(request.startsAt), Date.now() + 2 * MIN);
  const dayMinutes = Number(request.dayMinutes);
  const mode: PracticeMode = PRACTICE_MODES.includes(request.mode as PracticeMode) ? (request.mode as PracticeMode) : 'regular';
  const window = practiceWindow({
    season: real?.exists ? { status: String(real.get('status')), draftAt: typeof ms(real.get('draftAt')) === 'number' ? Number(ms(real.get('draftAt'))) : null } : null,
    kickoffStart: kickoff?.exists ? Number(ms(kickoff.get('start'))) : null,
    startsAt,
    dayMinutes,
    now: Date.now(),
  });
  if (!window.ok) {
    await requestRef.update({ status: 'failed', reason: window.reason });
    console.log(`League ${id}: practice week can't run.`);
    return null;
  }

  // Everyone in the league plays, except anyone marked as left, in a random order.
  const former = Object.keys((league.get('former') ?? {}) as Record<string, string>);
  const order = Object.keys((league.get('members') ?? {}) as Record<string, boolean>)
    .filter((player) => !former.includes(player))
    .map((player) => ({ player, key: randomInt(1_000_000_000) }))
    .sort((a, b) => a.key - b.key)
    .map((item) => item.player);
  // Goals the draft has set carry over; everyone else gets stand-ins.
  const goals: Record<string, Partial<Record<Lane, string>>> = {};
  if (real?.exists) {
    for (const roster of (await real.ref.collection('roster').get()).docs) {
      const set = (roster.get('goals') ?? {}) as Partial<Record<Lane, { text?: string }>>;
      goals[roster.id] = { mind: set.mind?.text, body: set.body?.text, wildcard: set.wildcard?.text };
    }
  }
  const plan = practiceDocs({
    leagueId: id,
    order,
    real: real?.exists ? { par: Number(real.get('par') ?? 3), timeZone: String(real.get('timeZone') ?? 'America/New_York') } : null,
    goals,
    startsAt,
    dayMinutes,
    mode,
    now: Date.now(),
  });
  // Anything left from an earlier practice goes first.
  await db.recursiveDelete(league.ref.collection('seasons').doc(PRACTICE_SEASON));
  for (let start = 0; start < plan.docs.length; start += 400) {
    const batch = db.batch();
    for (const { path, data } of plan.docs.slice(start, start + 400)) batch.set(db.doc(path), data);
    await batch.commit();
  }
  await league.ref.update({ practice: plan.mark });
  await requestRef.update({ status: 'live', startsAt: Timestamp.fromMillis(startsAt) });
  console.log(`League ${id}: practice week set up for ${order.length} players, ${mode}, days of ${dayMinutes} minutes.`);
  return { startsAt, finalAt: plan.mark.finalAt.getTime() };
}

/** Runs a league's practice week until its results are final, or the commish ends it. */
async function runWeek(id: string): Promise<void> {
  const league = db.collection('leagues').doc(id);
  const requestRef = league.collection('practice').doc('request');
  const request = await requestRef.get();
  const status = request.get('status');
  if (!request.exists || !['requested', 'live'].includes(status)) {
    console.log(`League ${id}: no practice week to run.`);
    return;
  }
  await requestRef.update({ driverAt: FieldValue.serverTimestamp() });
  const mark = plain((await league.get()).get('practice'));
  const times = status === 'live' && typeof mark.finalAt === 'number' ? { startsAt: Number(mark.startsAt), finalAt: Number(mark.finalAt) } : await setUp(id);
  if (!times) return;

  const giveUpAt = times.finalAt + 30 * MIN;
  let lastSettle = 0;
  for (;;) {
    const now = Date.now();
    const asked = await requestRef.get();
    if (!asked.exists || ['ending', 'clearing'].includes(asked.get('status'))) {
      await clear(id);
      return;
    }
    await requestRef.update({ driverAt: FieldValue.serverTimestamp() });
    // The weekly job runs from the start: it draws Rumble's items and 2v2's duos when they are due.
    if (now - lastSettle >= 2 * MIN) {
      lastSettle = now;
      await practiceJob('weekly', id);
    }
    if (now >= times.startsAt) {
      await practiceJob('tick', id);
      const week = await league.collection('seasons').doc(PRACTICE_SEASON).collection('weeks').doc('w01').get();
      if (week.get('status') === 'final' || now > giveUpAt) {
        // One more run for the results alert, then the results stay up a while.
        await practiceJob('tick', id);
        await league.update({ 'practice.status': 'done', 'practice.clearAt': Timestamp.fromMillis(practiceClearAt(Date.now())) });
        await requestRef.update({ status: 'done' });
        console.log(`League ${id}: practice week's results are final.`);
        return;
      }
    }
    await sleep(30_000);
  }
}

/** For the alerts workflow: starts the practice job where one is due, and clears finished weeks. */
async function check(): Promise<void> {
  const start: string[] = [];
  const now = Date.now();
  for (const league of (await db.collection('leagues').get()).docs) {
    const request = await league.ref.collection('practice').doc('request').get();
    const mark = league.get('practice');
    if (!request.exists && !mark) continue;
    const step = practiceStep({
      request: request.exists ? (plain(request.data()) as unknown as PracticeRequest) : null,
      mark: mark ? (plain(mark) as unknown as PracticeMarkRead) : null,
      now,
    });
    if (step === 'start') {
      await request.ref.update({ dispatchedAt: FieldValue.serverTimestamp() });
      start.push(league.id);
    }
    if (step === 'clear') await clear(league.id);
  }
  console.log(`Practice weeks: ${start.length} to start${emulator ? ' (in the local emulator)' : ''}.`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `start=${start.join(' ')}\n`);
}

const mode = process.argv[2] ?? '';
const given = process.env.LEAGUE_ID?.trim() ?? '';
if (mode === 'check') await check();
else if (mode === 'run' || mode === 'setup' || mode === 'clear') {
  if (!/^[A-Za-z0-9]+$/.test(given)) throw new Error('Set LEAGUE_ID to the league whose practice week this is.');
  if (mode === 'run') await runWeek(given);
  else if (mode === 'setup') await setUp(given);
  else await clear(given);
} else throw new Error(`Unknown mode "${mode}": use check, run, setup or clear.`);
