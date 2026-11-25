/**
 * Shared setup for the security-rule tests.
 *
 * Every test starts from the same small league in the Firestore emulator:
 * three players, one season, and a calendar built around the real clock, so
 * "today", "yesterday" and "tomorrow" are always in the same place.
 *
 *   Week 2 is this week.     Monday    locked yesterday at noon
 *                            Tuesday   yesterday: open for fixes until noon
 *                            Wednesday today: started 6 hours ago
 *                            Thursday  tomorrow, and so on to Sunday
 *   Week 3 is next week, week 4 the one after.
 *
 * The rules never read a date's meaning. They only compare the server's clock
 * with the start and lock times in the calendar documents, which is also how
 * the fast test league will run a whole week in an hour.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { addDays, weekPeriod } from '../../engine/src/index.ts';

export { assertFails, assertSucceeds };
export type Db = firebase.firestore.Firestore;

export const now = () => firebase.firestore.FieldValue.serverTimestamp();
export const remove = () => firebase.firestore.FieldValue.delete();

const HOUR = 3_600_000;
const KICKOFF = '2027-01-04';

export const LEAGUE = 'L1';
export const SEASON = 's1';
export const CODE = 'JKLMNPQR';
export const league = `leagues/${LEAGUE}`;
export const season = `${league}/seasons/${SEASON}`;

/** Players and the device each one is signed in on. p1 is the commish. */
export const KEYS = { p1: 'TCL-AAAA-AAAA', p2: 'TCL-BBBB-BBBB', p3: 'TCL-CCCC-CCCC' } as const;
export const NEW_KEY = 'TCL-DDDD-DDDD';

const dateOf = (week: number, dayIndex: number) => addDays(KICKOFF, (week - 1) * 7 + dayIndex);
/** 'w02' for Week 2: the tag kit documents are filed under. */
const periodOf = (week: number) => weekPeriod(week);

export const MON2 = dateOf(2, 0);
export const TUE2 = dateOf(2, 1);
export const WED2 = dateOf(2, 2);
export const THU2 = dateOf(2, 3);
export const FRI2 = dateOf(2, 4);
export const SAT2 = dateOf(2, 5);
export const SUN2 = dateOf(2, 6);
export const MON3 = dateOf(3, 0);
export const TUE3 = dateOf(3, 1);
export const WED4 = dateOf(4, 2);
/** A playoff day that happens to be open right now. */
export const PLAYOFF_DAY = '2027-03-01';
/** A day that starts tomorrow in a week with no power-ups, like an Alley week. */
export const NO_KIT_DAY = '2027-03-02';
/** A playoff day that starts tomorrow. */
export const PLAYOFF_TOMORROW = '2027-03-03';

let env: RulesTestEnvironment;
let seededAt = 0;

/** Milliseconds from the moment the league was seeded to the start of a day. */
function startOffset(week: number, dayIndex: number): number {
  return -6 * HOUR + ((week - 2) * 7 + (dayIndex - 2)) * 24 * HOUR;
}

function stamp(offset: number): firebase.firestore.Timestamp {
  return firebase.firestore.Timestamp.fromMillis(seededAt + offset);
}

function calendarDay(week: number, dayIndex: number, overrides: Record<string, unknown> = {}) {
  const start = startOffset(week, dayIndex);
  return {
    date: dateOf(week, dayIndex),
    period: periodOf(week),
    week,
    dayIndex,
    phase: 'regular',
    kind: 'play',
    kit: ['aerial', 'demolition', 'fullBoost'],
    start: stamp(start),
    end: stamp(start + 24 * HOUR),
    lock: stamp(start + 36 * HOUR),
    sixPm: stamp(start + 18 * HOUR),
    nextEnd: stamp(start + 48 * HOUR),
    periodStart: stamp(startOffset(week, 0)),
    sundayStart: stamp(startOffset(week, 6)),
    restOpens: stamp(week === 1 ? -100_000 * HOUR : startOffset(week - 1, 0)),
    ...overrides,
  };
}

export async function startEmulator(): Promise<void> {
  env = await initializeTestEnvironment({
    projectId: 'demo-tier-c',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(fileURLToPath(new URL('../../firebase/firestore.rules', import.meta.url)), 'utf8'),
    },
  });
}

export async function stopEmulator(): Promise<void> {
  await env.cleanup();
}

/** Write straight to the database, past the rules, the way a job does. */
export async function asJob(write: (db: Db) => Promise<unknown>): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    await write(context.firestore());
  });
}

/** The database as one signed-in device sees it. */
export function device(uid: string): Db {
  return env.authenticatedContext(uid).firestore();
}

/** The database as a visitor who is not signed in sees it. */
export function visitor(): Db {
  return env.unauthenticatedContext().firestore();
}

export const dev1 = () => device('dev1'); // p1, the commish
export const dev2 = () => device('dev2'); // p2
export const dev3 = () => device('dev3'); // p3
export const stranger = () => device('dev9'); // signed in, but not in the league

export async function seedLeague(): Promise<void> {
  await env.clearFirestore();
  seededAt = Date.now();
  await asJob(async (db) => {
    const batch = db.batch();
    batch.set(db.doc(`codes/${CODE}`), { league: LEAGUE, name: 'Test League' });
    batch.set(db.doc(league), {
      name: 'Test League',
      code: CODE,
      commish: 'p1',
      coCommish: null,
      joining: 'open',
      members: { p1: true, p2: true, p3: true },
      season: SEASON,
    });
    const names = { p1: 'Alex', p2: 'Maya', p3: 'Sam' };
    for (const [index, player] of (['p1', 'p2', 'p3'] as const).entries()) {
      batch.set(db.doc(`${league}/players/${player}`), { displayName: names[player], joinedAt: stamp(-1000 * HOUR) });
      batch.set(db.doc(`${league}/keys/${player}`), { key: KEYS[player], rotatedAt: stamp(-1000 * HOUR) });
      batch.set(db.doc(`${league}/lookup/${KEYS[player]}`), { player });
      batch.set(db.doc(`${league}/claims/dev${index + 1}`), { player, key: KEYS[player], at: stamp(-1000 * HOUR) });
    }
    batch.set(db.doc(season), {
      name: 'Season 1',
      status: 'active',
      regularWeeks: 6,
      playoffs: 'oneWeek',
      playoffSize: 4,
      par: 3,
      groupWeeks: [3, 5],
      timeZone: 'America/New_York',
      kickoff: KICKOFF,
      draftAt: null,
      joinMidSeason: false,
      holidayEvents: true,
      // Written by the jobs: the Rule One for Week 1 is out, the one for Week 5 is not.
      ruleOneIssue: [stamp(startOffset(1, 0)), stamp(startOffset(5, 0))],
    });
    for (const week of [1, 2, 3, 4]) {
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        batch.set(db.doc(`${season}/calendar/${dateOf(week, dayIndex)}`), calendarDay(week, dayIndex));
      }
    }
    const openNow = { start: stamp(-HOUR), end: stamp(23 * HOUR), lock: stamp(35 * HOUR), periodStart: stamp(-HOUR) };
    batch.set(db.doc(`${season}/calendar/${PLAYOFF_DAY}`), calendarDay(9, 0, { date: PLAYOFF_DAY, phase: 'playoff', ...openNow }));
    batch.set(db.doc(`${season}/calendar/${NO_KIT_DAY}`), calendarDay(9, 1, { date: NO_KIT_DAY, kit: [], start: stamp(20 * HOUR), lock: stamp(56 * HOUR), periodStart: stamp(-HOUR) }));
    batch.set(db.doc(`${season}/calendar/${PLAYOFF_TOMORROW}`), calendarDay(9, 2, { date: PLAYOFF_TOMORROW, phase: 'playoff', start: stamp(20 * HOUR), lock: stamp(56 * HOUR), periodStart: stamp(-HOUR), sundayStart: stamp(100 * HOUR), restOpens: stamp(-HOUR) }));
    // This week p1 plays p2 and p3 has the bye. Next week p1 plays p3.
    batch.set(db.doc(`${season}/weeks/w02`), { week: 2, mode: 'regular', targets: { p1: ['p2'], p2: ['p1'], p3: ['HOUSE'] } });
    batch.set(db.doc(`${season}/weeks/w03`), { week: 3, mode: 'regular', targets: { p1: ['p3'], p3: ['p1'], p2: ['HOUSE'] } });
    batch.set(db.doc(`${season}/weeks/w09`), { week: 9, mode: 'regular', targets: { p1: ['p2'], p2: ['p1'], p3: ['HOUSE'] } });
    await batch.commit();
  });
}

// ---------------------------------------------------------------------------
// Documents the tests write
// ---------------------------------------------------------------------------

export const dayPath = (player: string, date: string) => `${season}/days/${player}_${date}`;
export const kitPath = (id: string) => `${season}/kit/${id}`;
export const sealedPath = (id: string) => `${season}/sealed/${id}`;

/** A normal day's log, ready to save. */
export function dayLog(player: string, date: string, overrides: Record<string, unknown> = {}) {
  return {
    player,
    date,
    goals: { mind: true, body: false, wildcard: true },
    screenMinutes: 150,
    beers: 1,
    firstAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

export const aerial = (player: string, week: number, date: string) => ({ player, item: 'aerial', period: periodOf(week), date, at: now() });
export const fullBoost = (player: string, week: number, date: string, lane = 'body') => ({ player, item: 'fullBoost', period: periodOf(week), date, lane, at: now() });
export const restDay = (player: string, week: number, date: string) => ({ player, item: 'rest', period: periodOf(week), date, at: now() });
export const ruleOne = (player: string, number: number, date: string) => ({ player, item: 'ruleOne', number, date, at: now() });

/** A Demolition as the app saves it. `lock` is read from the calendar first, like the app does. */
export async function demolition(db: Db, player: string, week: number, target: string, date: string, lane = 'mind') {
  const calendar = await db.doc(`${season}/calendar/${date}`).get();
  return { kind: 'demolition', player, period: periodOf(week), target, date, lane, revealAt: calendar.get('lock'), at: now() };
}

/** A commish change always travels with its audit entry, in one batch. */
export function auditEntry(action: string, target: string, reason = 'Test reason') {
  return { by: 'p1', at: now(), action, target, reason };
}
