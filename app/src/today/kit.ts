/**
 * When each power-up can be played, read from the calendar documents, the
 * same way the security rules read it. The phone only uses this to decide
 * which choices to offer. The server decides whether a play counts.
 */
import { isRestDay } from './model.ts';

/** A calendar day, as the app reads it: every time in milliseconds. */
export interface CalDay {
  date: string;
  period: string;
  week: number;
  dayIndex: number;
  phase: string;
  kit: string[];
  start: number;
  lock: number;
  periodStart: number;
  sundayStart: number;
  restOpens: number;
}

const notStarted = (day: CalDay, now: number) => now < day.start;
const isOpen = (day: CalDay, now: number) => now >= day.start && now < day.lock;
const byDate = (days: CalDay[]) => [...days].sort((a, b) => (a.date < b.date ? -1 : 1));

/** Aerial: after the week's kit refills, on a day that has not started. */
export function aerialDays(week: CalDay[], now: number): string[] {
  return byDate(week)
    .filter((day) => day.kit.includes('aerial') && now >= day.periodStart && notStarted(day, now))
    .map((day) => day.date);
}

/** An Aerial can be cancelled until its day starts. */
export const canCancelAerial = (day: CalDay, now: number): boolean => notStarted(day, now);

/** Demolition: like Aerial, but never on the target's rest day. */
export function demolitionDays(week: CalDay[], now: number, targetRest: string | null): string[] {
  return byDate(week)
    .filter((day) => day.kit.includes('demolition') && now >= day.periodStart && notStarted(day, now))
    .filter((day) => !isRestDay({ date: day.date, calendar: day, restDate: targetRest }))
    .map((day) => day.date);
}

/** Full Boost: on an open day, never on your own rest day. */
export function boostDays(days: CalDay[], now: number, myRest: string | null): string[] {
  return byDate(days)
    .filter((day) => day.kit.includes('fullBoost') && isOpen(day, now))
    .filter((day) => !isRestDay({ date: day.date, calendar: day, restDate: myRest }))
    .map((day) => day.date);
}

/** Full Boost and Rule One can be taken back until the day locks. */
export const canTakeBack = (day: CalDay, now: number): boolean => now < day.lock;

/** Rule One: on an open day of the regular season. */
export function ruleOneDays(days: CalDay[], now: number): string[] {
  return byDate(days)
    .filter((day) => day.phase === 'regular' && isOpen(day, now))
    .map((day) => day.date);
}

/** How many Rule Ones have arrived, how many are used, and which number to use next. */
export function ruleOneCount(issue: number[], used: number[], now: number): { arrived: number; used: number; next: number | null } {
  const arrived = issue.filter((at) => now >= at).length;
  let next: number | null = null;
  for (let number = 1; number <= arrived; number += 1) {
    if (!used.includes(number)) {
      next = number;
      break;
    }
  }
  return { arrived, used: used.length, next };
}

/**
 * Where the rest day can move: a regular day that has not started, once the
 * week before has begun. A rest day never moved before also needs Sunday to be
 * still ahead (ruling R2: both days must be ahead).
 */
export function restDays(week: CalDay[], now: number, moved: boolean): string[] {
  return byDate(week)
    .filter((day) => day.phase === 'regular' && notStarted(day, now) && now >= day.restOpens)
    .filter((day) => moved || now < day.sundayStart)
    .map((day) => day.date);
}
