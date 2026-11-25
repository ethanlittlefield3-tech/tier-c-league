/**
 * The fast test league (PHASE1.md, Step 4): a season with each day squeezed
 * into a few minutes, so a week of locks, reveals, settlement and the Wheel
 * plays out in about an hour. Only a demo league made by its own job ever has
 * one; every other league runs on the real calendar.
 *
 * Every time keeps its place within the day: 6 pm is three quarters through,
 * the day ends at its midnight, and it locks at noon the next day.
 */
import { addDays, daysBetween, weekdayIndex, type DateStr, type Instant } from './calendar.ts';
import { regularCalendar, type CalendarDay, type SeasonPlan } from './season.ts';

export interface FastClock {
  /** When the season's first day starts. */
  startsAt: Instant;
  /** How long each day lasts, in minutes. */
  dayMinutes: number;
}

const dayLength = (clock: FastClock) => clock.dayMinutes * 60_000;

/** When a date starts, on a fast clock. */
export function fastStart(kickoff: DateStr, clock: FastClock, date: DateStr): Instant {
  return clock.startsAt + daysBetween(kickoff, date) * dayLength(clock);
}

/** The league's date at a moment, on a fast clock. */
export function fastDate(kickoff: DateStr, clock: FastClock, at: Instant): DateStr {
  return addDays(kickoff, Math.floor((at - clock.startsAt) / dayLength(clock)));
}

/** Monday 12:00 am of a week, on a fast clock: the week starts and kits refill. */
export function fastWeekStart(clock: FastClock, week: number): Instant {
  return clock.startsAt + (week - 1) * 7 * dayLength(clock);
}

/** The season's calendar on a fast clock: the same days as a real season, each a few minutes long. */
export function fastCalendar(season: SeasonPlan, clock: FastClock): CalendarDay[] {
  const day = dayLength(clock);
  return regularCalendar(season).map((real) => {
    const start = fastStart(season.kickoff, clock, real.date);
    const monday = fastWeekStart(clock, real.week);
    return {
      ...real,
      start,
      sixPm: start + 0.75 * day,
      end: start + day,
      lock: start + 1.5 * day,
      nextEnd: start + 2 * day,
      periodStart: monday,
      sundayStart: monday + 6 * day,
      restOpens: real.week === 1 ? 0 : monday - 7 * day,
    };
  });
}

/** A Wheel dare's deadline on a fast clock: the end of the Sunday after the draw. */
export function fastDareDue(kickoff: DateStr, clock: FastClock, drawnAt: Instant): Instant {
  const date = fastDate(kickoff, clock, drawnAt);
  const sunday = addDays(date, 6 - weekdayIndex(date));
  return fastStart(kickoff, clock, sunday) + dayLength(clock);
}
