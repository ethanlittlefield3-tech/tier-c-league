/**
 * Streaks: check-in streaks and perfect-day streaks.
 */

import type { DayScore } from './scoring.ts';

/**
 * How a day counts toward a check-in streak:
 * - `in`: something was logged, so the streak grows.
 * - `out`: a goal day with nothing logged, so the streak breaks.
 * - `skip`: the streak neither grows nor breaks. A blank rest day and a
 *   no-show covered by Rule One both skip.
 */
export type StreakMark = 'in' | 'out' | 'skip';

export function streakMark(day: DayScore): StreakMark {
  if (day.checkedIn) return 'in';
  if (day.restDay || day.kind === 'ruleOne') return 'skip';
  return 'out';
}

export interface Streak {
  /** The streak still running after the last day given. */
  current: number;
  /** The longest run seen, including any streak carried in. */
  best: number;
}

/**
 * @param marks  Days in order, oldest first.
 * @param carry  The streak already running before the first day.
 */
export function checkInStreak(marks: readonly StreakMark[], carry = 0): Streak {
  let current = carry;
  let best = carry;
  for (const mark of marks) {
    if (mark === 'in') current += 1;
    else if (mark === 'out') current = 0;
    if (current > best) best = current;
  }
  return { current, best };
}

/** Perfect days in a row. Rest days are skipped; any other day that is not perfect breaks the run. */
export function perfectStreak(days: readonly DayScore[], carry = 0): Streak {
  let current = carry;
  let best = carry;
  for (const day of days) {
    if (day.perfect) current += 1;
    else if (!day.restDay) current = 0;
    if (current > best) best = current;
  }
  return { current, best };
}
