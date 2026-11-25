/**
 * Power-up and rest-day timing.
 *
 * These are the same checks the security rules make with the server's clock.
 * The app uses them to grey out buttons and explain why; the rules are what
 * actually stop a late or illegal play.
 *
 * A kit item belongs to the week of the day it is played on. So Sunday's Full
 * Boost can still be used on Monday morning, before Sunday locks at noon.
 */

import {
  addDays,
  dayLock,
  dayStart,
  seasonDay,
  weekStart,
  type DateStr,
  type Instant,
} from './calendar.ts';

export interface SeasonClock {
  /** The kickoff Monday. */
  kickoff: DateStr;
  /** Regular-season weeks, 3 to 12. */
  regularWeeks: number;
  timeZone: string;
}

export type Verdict = { ok: true } | { ok: false; reason: string };

const OK: Verdict = { ok: true };
const no = (reason: string): Verdict => ({ ok: false, reason });

/** The date's week if it falls in the regular season, otherwise `null`. */
function regularWeekOf(season: SeasonClock, date: DateStr): number | null {
  const { week } = seasonDay(season.kickoff, date);
  return week >= 1 && week <= season.regularWeeks ? week : null;
}

// ---------------------------------------------------------------------------
// Rule One
// ---------------------------------------------------------------------------

/** One grace day per 4 weeks of regular season, rounded up. */
export function ruleOneAllowance(regularWeeks: number): number {
  return Math.ceil(regularWeeks / 4);
}

/** Rule Ones arrive at the start of Weeks 1, 5 and 9, as far as the season runs. */
export function ruleOneIssueWeeks(regularWeeks: number): number[] {
  const weeks: number[] = [];
  for (let week = 1; week <= regularWeeks; week += 4) weeks.push(week);
  return weeks;
}

/** How many Rule Ones a player has been handed so far. Unused ones carry to the end of the season. */
export function ruleOnesIssued(season: SeasonClock, now: Instant): number {
  return ruleOneIssueWeeks(season.regularWeeks).filter(
    (week) => now >= weekStart(season.kickoff, week, season.timeZone),
  ).length;
}

/** Declare from the start of the day until it locks at 12:00 pm the next day. Regular season only. */
export function canDeclareRuleOne(
  season: SeasonClock,
  target: DateStr,
  now: Instant,
  state: { used: number },
): Verdict {
  if (regularWeekOf(season, target) === null) return no('Rule One works in the regular season only.');
  if (now < dayStart(target, season.timeZone)) return no("That day hasn't started yet.");
  if (now >= dayLock(target, season.timeZone)) return no('That day locked at 12:00 pm.');
  if (ruleOnesIssued(season, now) - state.used <= 0) return no('You have no Rule One left.');
  return OK;
}

// ---------------------------------------------------------------------------
// The weekly kit
// ---------------------------------------------------------------------------

/**
 * Aerial and Demolition share one window: after the week's kit refills on
 * Monday at 12:00 am, and before the target day starts. That makes Monday
 * safe from both, and Tuesday the first day either can hit.
 */
function beforeDayStarts(season: SeasonClock, target: DateStr, now: Instant, name: string): Verdict {
  const week = regularWeekOf(season, target);
  if (week === null) return no(`${name} works on regular-season days only.`);
  if (now < weekStart(season.kickoff, week, season.timeZone)) {
    return no("That week's kit refills Monday at 12:00 am.");
  }
  if (now >= dayStart(target, season.timeZone)) {
    return no(`${name} has to be set before that day starts.`);
  }
  return OK;
}

export function canSetAerial(season: SeasonClock, target: DateStr, now: Instant): Verdict {
  return beforeDayStarts(season, target, now, 'Aerial');
}

/** Aerial can be cancelled until its day starts. Demolition is final once set. */
export function canCancelAerial(season: SeasonClock, target: DateStr, now: Instant): Verdict {
  if (now >= dayStart(target, season.timeZone)) return no('That day has started, so the Aerial is locked in.');
  return OK;
}

export function canSetDemolition(
  season: SeasonClock,
  target: DateStr,
  now: Instant,
  opponent: { isHouse: boolean; restDay: DateStr | null },
): Verdict {
  if (opponent.isHouse) return no('The House has no goals to demolish.');
  const window = beforeDayStarts(season, target, now, 'Demolition');
  if (!window.ok) return window;
  if (opponent.restDay === target) return no("Demolition can't target a rest day.");
  return OK;
}

/** From the start of the day until it locks at 12:00 pm the next day. */
export function canUseFullBoost(
  season: SeasonClock,
  target: DateStr,
  now: Instant,
  state: { restDay: boolean },
): Verdict {
  if (regularWeekOf(season, target) === null) return no('Full Boost works on regular-season days only.');
  if (state.restDay) return no('Full Boost has nothing to fix on a rest day.');
  if (now < dayStart(target, season.timeZone)) return no("That day hasn't started yet.");
  if (now >= dayLock(target, season.timeZone)) return no('That day locked at 12:00 pm.');
  return OK;
}

// ---------------------------------------------------------------------------
// Rest day
// ---------------------------------------------------------------------------

/** Sunday, unless the player moves it. */
export function defaultRestDay(kickoff: DateStr, week: number): DateStr {
  return addDays(kickoff, 7 * (week - 1) + 6);
}

/**
 * A rest day moves to another day of the same week while both days are still
 * ahead. There is no limit on how many times (commish ruling, 2026-11-25). This week's
 * and next week's can be set; anything further out has to wait.
 */
export function canMoveRestDay(
  season: SeasonClock,
  move: { from: DateStr; to: DateStr },
  now: Instant,
): Verdict {
  const week = regularWeekOf(season, move.from);
  if (week === null) return no('Rest days exist in the regular season only.');
  if (regularWeekOf(season, move.to) !== week) return no('A rest day stays inside its own week.');
  if (move.from === move.to) return no('That is already your rest day.');
  if (week > 1 && now < weekStart(season.kickoff, week - 1, season.timeZone)) {
    return no("You can set this week's and next week's rest day, no further ahead.");
  }
  if (now >= dayStart(move.from, season.timeZone)) return no('Your rest day has already started.');
  if (now >= dayStart(move.to, season.timeZone)) return no('That day has already started.');
  return OK;
}
