/**
 * The rules of the Today screen that are not drawing: which day is today, when
 * a day can be logged, and the live score. Scores come from the engine, so the
 * phone shows exactly what the official result will be.
 *
 * The phone's clock only decides what to show. Whether a save is accepted is
 * decided by the server, against the calendar (firebase/firestore.rules).
 */
import { addDays, fastDate, localDate, scoreDay, type DateStr, type DayLog, type DayScore, type FastClock, type Lane, type Square } from '@tcl/engine';

/** What a player has logged for a day: three yes-or-no goals, screen minutes (or none yet) and beers. */
export interface DayEntry {
  goals: { mind: boolean; body: boolean; wildcard: boolean };
  screenMinutes: number | null;
  beers: number;
}

export const SCREEN_MAX = 1440;
export const SCREEN_STEP = 15;
export const BEERS_MAX = 30;

export function leagueDates(now: number, timeZone: string): { today: DateStr; yesterday: DateStr } {
  const today = localDate(now, timeZone);
  return { today, yesterday: addDays(today, -1) };
}

/** A season document's fields that decide its dates. */
export interface SeasonClockDoc {
  timeZone: string;
  kickoff?: string;
  /** Only a fast test league has this (DECISIONS.md, "The fast test league"). */
  fast?: { startsAt?: number; dayMinutes?: number } | null;
}

/** The fast test league's clock, or `null` for a league on the real calendar. */
export function fastOf(season: SeasonClockDoc): (FastClock & { kickoff: string }) | null {
  const fast = season.fast;
  if (!fast || !season.kickoff || typeof fast.startsAt !== 'number' || typeof fast.dayMinutes !== 'number' || fast.dayMinutes <= 0) return null;
  return { kickoff: season.kickoff, startsAt: fast.startsAt, dayMinutes: fast.dayMinutes };
}

/** Today and yesterday in a season: by the league's time zone, or by a fast test league's own clock. */
export function seasonDates(now: number, season: SeasonClockDoc): { today: DateStr; yesterday: DateStr } {
  const fast = fastOf(season);
  if (!fast) return leagueDates(now, season.timeZone);
  const today = fastDate(fast.kickoff, fast, now);
  return { today, yesterday: addDays(today, -1) };
}

/**
 * - `none`: no calendar entry, so no logging that day.
 * - `before`: the day has not started.
 * - `open`: it can be logged, until noon the next day.
 * - `locked`: done.
 */
export type DayWindow = 'none' | 'before' | 'open' | 'locked';

export function windowOf(calendar: { start: number; lock: number } | null, now: number): DayWindow {
  if (!calendar) return 'none';
  if (now < calendar.start) return 'before';
  return now < calendar.lock ? 'open' : 'locked';
}

function toLog(entry: DayEntry | null): DayLog | null {
  return entry ? { goals: entry.goals, screenMinutes: entry.screenMinutes, beers: entry.beers } : null;
}

/**
 * The day's score as it stands, with your own power-ups on it. While the day
 * is open, nothing logged shows 0 so far (DECISIONS.md, call 6). Demolitions
 * aimed at you stay hidden until the day locks, so they are not in here.
 */
export function liveDayScore(input: {
  par: number;
  entry: DayEntry | null;
  restDay: boolean;
  locked: boolean;
  aerial?: boolean;
  fullBoost?: Lane | null;
  ruleOne?: boolean;
  demolitions?: readonly Lane[];
  /** Squares the commish voided, and docks or corrections, for this day. */
  voided?: readonly Square[];
  adjustments?: readonly number[];
}): DayScore {
  return scoreDay(
    {
      par: input.par,
      log: toLog(input.entry),
      restDay: input.restDay,
      aerial: input.aerial === true,
      fullBoost: input.fullBoost ?? null,
      ruleOne: input.ruleOne === true,
      demolitions: input.demolitions ?? [],
      voided: input.voided ?? [],
      adjustments: input.adjustments ?? [],
    },
    { open: !input.locked },
  );
}

/** A player's rest day: in the engine, shared with the weekly job. */
export { isRestDay } from '@tcl/engine';

export function formatScreen(minutes: number | null): string {
  if (minutes === null) return 'Not logged';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Screen time after a step, kept to 15-minute marks between 0 and 24 hours. Not logged yet starts from 0. */
export function stepScreen(minutes: number | null, delta: number): number {
  const next = Math.floor(((minutes ?? 0) + delta) / SCREEN_STEP) * SCREEN_STEP;
  return Math.min(SCREEN_MAX, Math.max(0, next));
}

/** "+3", "0" or "−2", with a true minus sign. */
export function formatPoints(points: number): string {
  if (points > 0) return `+${points}`;
  if (points < 0) return `−${-points}`;
  return '0';
}

/** Screen time as the card shows it: "2 h 15m". */
export function formatScreenShort(minutes: number | null): string {
  if (minutes === null) return 'Not logged';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest}m`;
}

/** "+1 pt", "+2 pts", "0 pts", "−1 pt". */
export function pointsChip(points: number): string {
  return `${formatPoints(points)} ${Math.abs(points) === 1 ? 'pt' : 'pts'}`;
}

/** The screen-time scale at a par: one row an hour up to 7 hours, then "each hour more". */
export function screenScale(par: number): { label: string; points: string }[] {
  const rows = [{ label: 'Under 1 h', points: formatPoints(par) }];
  for (let hour = 1; hour < 7; hour += 1) rows.push({ label: `${hour}–${hour + 1} h`, points: formatPoints(par - hour) });
  rows.push({ label: 'Each hour more', points: formatPoints(-1) });
  return rows;
}

/** Which row of the scale a screen time falls in: 0 for under an hour, 7 for 7 hours or more. */
export function scaleRowOf(minutes: number | null): number | null {
  if (minutes === null) return null;
  return Math.min(7, Math.floor(minutes / 60));
}

/** The day total, part by part: "Goals +2 · screen +1 · beers −1". */
export function breakdown(score: DayScore): string {
  if (score.kind === 'ruleOne') return 'Rule One: the day scores 0';
  if (score.kind === 'noShow') return `Nothing logged: ${formatPoints(score.total)}`;
  if (score.kind === 'restNoLog') return `Nothing logged on a rest day: ${formatPoints(score.total)}`;
  if (score.kind === 'open') return '';
  const parts = [`Goals ${formatPoints(score.goalPoints)}`];
  if (score.screen.state === 'logged') parts.push(`screen ${formatPoints(score.screen.points)}`);
  if (score.screen.state === 'notLogged' || score.screen.state === 'voided') parts.push(`screen not logged ${formatPoints(score.screen.points)}`);
  parts.push(`beers ${formatPoints(score.beerPoints)}`);
  if (score.aerial === 'doubled') parts.push('Aerial ×2');
  return parts.join(' · ');
}
