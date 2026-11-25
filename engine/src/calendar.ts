/**
 * League calendar.
 *
 * One league time zone sets every day, deadline and reset (SCOPE.md, call 5).
 * - A "date" is a league-local calendar day written 'YYYY-MM-DD'.
 * - An "instant" is a moment in real time, in epoch milliseconds (UTC).
 *
 * Nothing in here reads the device clock. Callers pass `now` in, and for
 * anything that matters the caller is the server: security rules compare
 * `request.time` with the calendar docs the jobs build from these functions.
 */

export type DateStr = string;
export type Instant = number;

export const DEFAULT_TIME_ZONE = 'America/New_York';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** Index 0 is Monday, because league weeks run Monday to Sunday. */
export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

// ---------------------------------------------------------------------------
// Calendar dates (no time zone involved)
// ---------------------------------------------------------------------------

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A date as milliseconds at 00:00 UTC. Only for date arithmetic, never a league instant. */
function civil(date: DateStr): number {
  const match = DATE_PATTERN.exec(date);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const ms = Date.UTC(year, month - 1, day);
    const back = new Date(ms);
    if (
      back.getUTCFullYear() === year &&
      back.getUTCMonth() === month - 1 &&
      back.getUTCDate() === day
    ) {
      return ms;
    }
  }
  throw new RangeError(`Not a calendar date (YYYY-MM-DD): ${String(date)}`);
}

function fromCivil(ms: number): DateStr {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isDate(value: unknown): value is DateStr {
  if (typeof value !== 'string') return false;
  try {
    civil(value);
    return true;
  } catch {
    return false;
  }
}

export function addDays(date: DateStr, days: number): DateStr {
  return fromCivil(civil(date) + days * DAY);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: DateStr, to: DateStr): number {
  return Math.round((civil(to) - civil(from)) / DAY);
}

/** 0 for Monday through 6 for Sunday. */
export function weekdayIndex(date: DateStr): number {
  return (new Date(civil(date)).getUTCDay() + 6) % 7;
}

// ---------------------------------------------------------------------------
// Time zones
// ---------------------------------------------------------------------------

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

export interface LocalTime {
  date: DateStr;
  hour: number;
  minute: number;
  second: number;
}

/** What the league's wall clock reads at an instant. */
export function toLocal(instant: Instant, timeZone: string): LocalTime {
  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;
  let second = 0;
  for (const part of formatterFor(timeZone).formatToParts(new Date(instant))) {
    if (part.type === 'year') year = Number(part.value);
    else if (part.type === 'month') month = Number(part.value);
    else if (part.type === 'day') day = Number(part.value);
    else if (part.type === 'hour') hour = Number(part.value) % 24;
    else if (part.type === 'minute') minute = Number(part.value);
    else if (part.type === 'second') second = Number(part.value);
  }
  const pad = (n: number, width: number) => String(n).padStart(width, '0');
  return { date: `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`, hour, minute, second };
}

/** The league date an instant falls on. */
export function localDate(instant: Instant, timeZone: string): DateStr {
  return toLocal(instant, timeZone).date;
}

/** Wall clock minus UTC at an instant, in milliseconds. */
function offsetAt(instant: Instant, timeZone: string): number {
  const local = toLocal(instant, timeZone);
  const wall = civil(local.date) + local.hour * HOUR + local.minute * MINUTE + local.second * 1000;
  return wall - Math.floor(instant / 1000) * 1000;
}

/**
 * The instant a league wall-clock time happens.
 *
 * Daylight saving makes some wall times happen twice and others never:
 * - a repeated time (clocks go back) resolves to its first occurrence;
 * - a skipped time (clocks go forward) resolves to the same distance past the
 *   jump, so a skipped midnight becomes the moment the jump lands.
 */
export function wallTimeToInstant(
  date: DateStr,
  hour: number,
  minute: number,
  timeZone: string,
): Instant {
  const wall = civil(date) + hour * HOUR + minute * MINUTE;
  const offsetBefore = offsetAt(wall - DAY, timeZone);
  const offsetAfter = offsetAt(wall + DAY, timeZone);
  const early = wall - offsetBefore;
  const late = wall - offsetAfter;
  const earlyFits = offsetAt(early, timeZone) === offsetBefore;
  const lateFits = offsetAt(late, timeZone) === offsetAfter;
  if (earlyFits && lateFits) return Math.min(early, late);
  if (earlyFits) return early;
  if (lateFits) return late;
  return early;
}

const dayStartCache = new Map<string, Instant>();

/** The first instant of a league day: 12:00 am league time. */
export function dayStart(date: DateStr, timeZone: string): Instant {
  const key = `${timeZone}|${date}`;
  const cached = dayStartCache.get(key);
  if (cached !== undefined) return cached;
  let start = wallTimeToInstant(date, 0, 0, timeZone);
  const startsOnDate = toLocal(start, timeZone).date === date;
  const isFirstInstant = toLocal(start - 1, timeZone).date < date;
  if (!startsOnDate || !isFirstInstant) start = firstInstantOf(date, timeZone);
  dayStartCache.set(key, start);
  return start;
}

/** Slow path for zones that skip or repeat midnight: search for the first moment on or after the date. */
function firstInstantOf(date: DateStr, timeZone: string): Instant {
  // No zone runs more than 14 h ahead of UTC or 12 h behind it, so these
  // bounds are always before and on-or-after the date.
  let before = civil(date) - 15 * HOUR;
  let onOrAfter = civil(date) + 13 * HOUR;
  while (onOrAfter - before > 1) {
    const middle = Math.floor((before + onOrAfter) / 2);
    if (toLocal(middle, timeZone).date >= date) onOrAfter = middle;
    else before = middle;
  }
  return onOrAfter;
}

/** A day locks at 12:00 pm league time the next day. After this, nothing about it can change. */
export function dayLock(date: DateStr, timeZone: string): Instant {
  return wallTimeToInstant(addDays(date, 1), 12, 0, timeZone);
}

/** The first instant of the following day. "By 11:59 pm" deadlines end here. */
export function dayEnd(date: DateStr, timeZone: string): Instant {
  return dayStart(addDays(date, 1), timeZone);
}

// ---------------------------------------------------------------------------
// Season weeks: Monday to Sunday, counted from the kickoff Monday
// ---------------------------------------------------------------------------

export function assertKickoff(kickoff: DateStr): void {
  if (weekdayIndex(kickoff) !== 0) {
    throw new RangeError(`Kickoff must be a Monday, and ${kickoff} is a ${WEEKDAYS[weekdayIndex(kickoff)]}.`);
  }
}

/** The seven dates of a season week, Monday first. Week 1 starts on the kickoff date. */
export function weekDates(kickoff: DateStr, week: number): DateStr[] {
  assertKickoff(kickoff);
  const monday = addDays(kickoff, 7 * (week - 1));
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(monday, offset));
}

/** Which season week and weekday a date is. Week 0 or less means before kickoff. */
export function seasonDay(kickoff: DateStr, date: DateStr): { week: number; dayIndex: number } {
  assertKickoff(kickoff);
  const days = daysBetween(kickoff, date);
  return { week: Math.floor(days / 7) + 1, dayIndex: ((days % 7) + 7) % 7 };
}

/** Monday 12:00 am: the week starts and kits refill. */
export function weekStart(kickoff: DateStr, week: number, timeZone: string): Instant {
  assertKickoff(kickoff);
  return dayStart(addDays(kickoff, 7 * (week - 1)), timeZone);
}

/** The next Monday 12:00 am. */
export function weekEnd(kickoff: DateStr, week: number, timeZone: string): Instant {
  return weekStart(kickoff, week + 1, timeZone);
}

/** The next Monday 12:00 pm: Sunday locks and provisional results post. */
export function provisionalAt(kickoff: DateStr, week: number, timeZone: string): Instant {
  assertKickoff(kickoff);
  return dayLock(addDays(kickoff, 7 * (week - 1) + 6), timeZone);
}

/** The next Tuesday 12:00 am: receipt windows have closed and results go final. */
export function finalAt(kickoff: DateStr, week: number, timeZone: string): Instant {
  assertKickoff(kickoff);
  return dayStart(addDays(kickoff, 7 * week + 1), timeZone);
}
