/**
 * A league's clock: what date and hour it is in the league, and when a given
 * hour of a date comes round. A real league runs on its time zone; the fast
 * test league runs on its own fast clock, where each day is a few minutes
 * long and every hour keeps its place within the day.
 */
import { localDate, toLocal, wallTimeToInstant, type DateStr, type Instant } from './calendar.ts';
import { fastDate, fastStart, type FastClock } from './fast.ts';

export interface LeagueClock {
  /** The league's date at a moment. */
  dateOf(at: Instant): DateStr;
  /** The hour of the day at a moment, 0 to 23, in league time. */
  hourOf(at: Instant): number;
  /** When an hour (and minute) of a date comes round, in league time. */
  timeOf(date: DateStr, hour: number, minute?: number): Instant;
}

/** A league on its time zone, daylight saving and all. */
export function zoneClock(timeZone: string): LeagueClock {
  return {
    dateOf: (at) => localDate(at, timeZone),
    hourOf: (at) => toLocal(at, timeZone).hour,
    timeOf: (date, hour, minute = 0) => wallTimeToInstant(date, hour, minute, timeZone),
  };
}

/** The fast test league: each day lasts `dayMinutes`, from kickoff at `startsAt`. */
export function fastLeagueClock(kickoff: DateStr, clock: FastClock): LeagueClock {
  const day = clock.dayMinutes * 60_000;
  return {
    dateOf: (at) => fastDate(kickoff, clock, at),
    hourOf: (at) => Math.floor((((((at - clock.startsAt) % day) + day) % day) / day) * 24),
    timeOf: (date, hour, minute = 0) => fastStart(kickoff, clock, date) + ((hour * 60 + minute) / 1440) * day,
  };
}
