/**
 * The practice week's documents, and when the alerts job starts or clears one
 * (the commish's request, 2026-11-28; engine/src/practice.ts has the rules).
 *
 * It runs as its own season, `practice`, beside the real one, on a fast
 * clock: every screen, rule and job works as in a real week. The weekly job
 * settles it with everything that reaches past the season switched off, so
 * nothing in it touches a profile: no ranks, badges, rivalries, stickers,
 * trophies or banner. Nothing here reads a clock or makes randomness: the
 * caller passes both in.
 */
import { localDate } from '../../engine/src/calendar.ts';
import { fastCalendar } from '../../engine/src/fast.ts';
import { PRACTICE_GOALS, PRACTICE_RESULTS_MINUTES, PRACTICE_SEASON, practiceLength, practiceWeek, type PracticeMode } from '../../engine/src/practice.ts';
import type { Lane } from '../../engine/src/scoring.ts';
import { calendarDocsFrom, mondayOf } from './calendar-docs.ts';
import type { SeedDoc } from './league-seed.ts';

const MIN = 60_000;

export interface PracticeInput {
  leagueId: string;
  /** Everyone playing, in a random order the caller drew: the league's members, less anyone marked as left. */
  order: string[];
  /** The real season's par and time zone, if it has been set up. */
  real: { par: number; timeZone: string } | null;
  /** Goals the draft has set, by player. Everyone else gets the stand-ins. */
  goals: Record<string, Partial<Record<Lane, string>>>;
  startsAt: number;
  dayMinutes: number;
  /** A regular 1v1 week, or one of the six group-play modes. */
  mode?: PracticeMode;
  now: number;
}

/** The mark on the league document that tells every phone a practice week is on, and which season it plays. */
export interface PracticeMark {
  season: string;
  status: 'live' | 'done';
  startsAt: Date;
  dayMinutes: number;
  mode: PracticeMode;
  /** When its results go final. */
  finalAt: Date;
  clearAt: Date | null;
}

/** Every document of a practice week, ready to write, and the league's mark. */
export function practiceDocs(input: PracticeInput): { docs: SeedDoc[]; mark: PracticeMark } {
  const season = `leagues/${input.leagueId}/seasons/${PRACTICE_SEASON}`;
  const now = new Date(input.now);
  const timeZone = input.real?.timeZone ?? 'America/New_York';
  // Its dates are only labels: this week's, from Monday.
  const kickoff = mondayOf(localDate(input.now, timeZone));
  const clock = { startsAt: input.startsAt, dayMinutes: input.dayMinutes };
  const mode = input.mode ?? 'regular';
  const docs: SeedDoc[] = [];

  docs.push({
    path: season,
    data: {
      name: 'Practice Week',
      status: 'active',
      // Only the practice job ever writes this: the rules keep it off every season a phone can save.
      practice: true,
      regularWeeks: 1,
      playoffs: 'none',
      playoffSize: 4,
      par: input.real?.par ?? 3,
      groupWeeks: mode === 'regular' ? [] : [1],
      timeZone,
      kickoff,
      draftAt: null,
      joinMidSeason: false,
      holidayEvents: false,
      updatedAt: now,
      scheduledAt: now,
      // One Rule One, from the start, as in a real season.
      ruleOneIssue: [new Date(input.startsAt)],
      fast: { startsAt: new Date(input.startsAt), dayMinutes: input.dayMinutes },
    },
  });
  // Each day's power-ups follow the mode, as in a real week of it.
  for (const day of calendarDocsFrom(fastCalendar({ kickoff, regularWeeks: 1, timeZone, ...(mode === 'regular' ? {} : { modes: { 1: mode } }) }, clock))) docs.push({ path: `${season}/calendar/${day.id}`, data: day.data });

  for (const player of input.order) {
    const own = input.goals[player] ?? {};
    const goal = (lane: Lane) => ({ text: own[lane]?.trim() || PRACTICE_GOALS[lane], version: 1 });
    docs.push({ path: `${season}/roster/${player}`, data: { goals: { mind: goal('mind'), body: goal('body'), wildcard: goal('wildcard') } } });
  }

  const week = practiceWeek(mode, input.order);
  docs.push({ path: `${season}/weeks/w01`, data: { week: 1, period: 'w01', mode, monday: kickoff, ...week } });

  const finalAt = new Date(input.startsAt + practiceLength(input.dayMinutes));
  return { docs, mark: { season: PRACTICE_SEASON, status: 'live', startsAt: new Date(input.startsAt), dayMinutes: input.dayMinutes, mode, finalAt, clearAt: null } };
}

/** The commish's request, as the jobs read it, with its times in milliseconds. */
export interface PracticeRequest {
  status: 'requested' | 'live' | 'ending' | 'done' | 'clearing' | 'failed';
  startsAt: number;
  dayMinutes: number;
  /** When the alerts job last started a practice job for it. */
  dispatchedAt?: number | null;
  /** The practice job's heartbeat, every half minute while it runs. */
  driverAt?: number | null;
}

/** The league's mark, as the jobs read it. */
export interface PracticeMarkRead {
  status: 'live' | 'done';
  finalAt: number;
  clearAt?: number | null;
}

/**
 * What the alerts job does about a league's practice week on each run:
 * start the practice job for it, clear it away, or leave it be.
 *
 * - It starts the job up to 20 minutes before the start, so the week is
 *   ready, and again if the job has stopped answering mid-week.
 * - It clears a finished week once its results have been up for a while, or
 *   when the commish clears or ends it and no job is running to do it.
 * - A week that never got going is given up two hours after it should have
 *   finished.
 */
export function practiceStep(input: { request: PracticeRequest | null; mark: PracticeMarkRead | null; now: number }): 'start' | 'clear' | null {
  const { request, mark, now } = input;
  if (!request && !mark) return null;
  if (mark?.status === 'done') return request?.status === 'clearing' || now >= (mark.clearAt ?? 0) ? 'clear' : null;
  if (!request) return 'clear';
  if (request.status === 'failed') return null;
  const alive = typeof request.driverAt === 'number' && now - request.driverAt < 3 * MIN;
  if (request.status === 'ending' || request.status === 'clearing' || request.status === 'done') return alive ? null : 'clear';
  if (alive) return null;
  if (now > request.startsAt + practiceLength(request.dayMinutes) + 120 * MIN) return 'clear';
  if (now < request.startsAt - 20 * MIN) return null;
  if (typeof request.dispatchedAt === 'number' && now - request.dispatchedAt < 15 * MIN) return null;
  return 'start';
}

/** When a finished practice week clears itself: its results stay up this long. */
export function practiceClearAt(finalAt: number): number {
  return finalAt + PRACTICE_RESULTS_MINUTES * MIN;
}
