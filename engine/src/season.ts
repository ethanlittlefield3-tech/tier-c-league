/**
 * The calendar entries the security rules read.
 *
 * The rules cannot do time zone maths. They only compare the server's clock
 * with numbers in a `calendar/{date}` document. The jobs build those
 * documents from the functions here, so the rules and the engine can never
 * disagree about when a day starts, locks, or stops taking a power-up.
 */

import {
  addDays,
  dayEnd,
  dayLock,
  dayStart,
  seasonDay,
  wallTimeToInstant,
  weekDates,
  weekStart,
  type DateStr,
  type Instant,
} from './calendar.ts';
import { weekPeriod } from './ids.ts';
import type { SeasonClock } from './kit.ts';
import { LATE_REQUEST_HOUR } from './receipts.ts';
import type { WeekMode } from './schedule.ts';

export interface SeasonPlan extends SeasonClock {
  /** Group-play weeks and their modes. Any week not listed is a regular 1v1. */
  modes?: Readonly<Record<number, WeekMode>>;
}

export type KitName = 'aerial' | 'demolition' | 'fullBoost';

/** Which power-ups a week offers (SCOPE.md, "Kit by week type"). */
export function kitForMode(mode: WeekMode): KitName[] {
  if (mode === 'rumble' || mode === 'alley') return [];
  if (mode === 'bounty') return ['aerial', 'fullBoost'];
  return ['aerial', 'demolition', 'fullBoost'];
}

export interface CalendarDay {
  date: DateStr;
  /** The stretch of play this day's kit belongs to: 'w02' for Week 2. */
  period: string;
  week: number;
  /** 0 for Monday through 6 for Sunday. */
  dayIndex: number;
  phase: 'regular' | 'playoff';
  /** Playoff reset days are 'reset': nobody logs on them. */
  kind: 'play' | 'reset';
  mode: WeekMode;
  kit: KitName[];
  /** 12:00 am: the day starts, and logging and Full Boost open. */
  start: Instant;
  /** 12:00 pm the same day: a Rumble Boot's goal must be picked by now. */
  noon: Instant;
  /** 6:00 pm: receipts asked for from now on are due a day later. */
  sixPm: Instant;
  /** The next 12:00 am: receipts asked for before 6 pm are due. */
  end: Instant;
  /** 12:00 pm the next day: the day locks. */
  lock: Instant;
  /** The 12:00 am after that: receipts asked for at 6 pm or later are due. */
  nextEnd: Instant;
  /** When this period's kit refills: Monday 12:00 am in the regular season. */
  periodStart: Instant;
  /** The start of this week's Sunday, the default rest day. */
  sundayStart: Instant;
  /** The earliest this week's rest day can be set: the start of the week before. */
  restOpens: Instant;
}

export function regularCalendarDay(season: SeasonPlan, date: DateStr): CalendarDay {
  const { week, dayIndex } = seasonDay(season.kickoff, date);
  if (week < 1 || week > season.regularWeeks) {
    throw new RangeError(`${date} is outside the regular season.`);
  }
  const zone = season.timeZone;
  const mode = season.modes?.[week] ?? 'regular';
  const monday = addDays(season.kickoff, 7 * (week - 1));
  return {
    date,
    period: weekPeriod(week),
    week,
    dayIndex,
    phase: 'regular',
    kind: 'play',
    mode,
    kit: kitForMode(mode),
    start: dayStart(date, zone),
    noon: wallTimeToInstant(date, 12, 0, zone),
    sixPm: wallTimeToInstant(date, LATE_REQUEST_HOUR, 0, zone),
    end: dayEnd(date, zone),
    lock: dayLock(date, zone),
    nextEnd: dayEnd(addDays(date, 1), zone),
    periodStart: dayStart(monday, zone),
    sundayStart: dayStart(addDays(monday, 6), zone),
    restOpens: week === 1 ? 0 : weekStart(season.kickoff, week - 1, zone),
  };
}

/** Every day of the regular season, in order. */
export function regularCalendar(season: SeasonPlan): CalendarDay[] {
  const days: CalendarDay[] = [];
  for (let week = 1; week <= season.regularWeeks; week += 1) {
    for (const date of weekDates(season.kickoff, week)) days.push(regularCalendarDay(season, date));
  }
  return days;
}

/**
 * The number a new season takes: one more than the highest-numbered season
 * there is (`s1`, `s2` and so on). A practice week never takes one, and after
 * a season reset the next season takes the reset one's number again.
 */
export function nextSeasonNumber(ids: readonly string[]): number {
  return Math.max(0, ...ids.map((id) => (/^s([0-9]+)$/.test(id) ? Number(id.slice(1)) : 0))) + 1;
}
