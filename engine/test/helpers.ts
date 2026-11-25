import {
  scoreDay,
  wallTimeToInstant,
  type DayInput,
  type DayLog,
  type DayScore,
  type Instant,
  type SeasonClock,
} from '../src/index.ts';

/** The season every timing test uses: Season 1 as proposed, 6 weeks from Monday, January 4, 2027. */
export const SEASON: SeasonClock = {
  kickoff: '2027-01-04',
  regularWeeks: 6,
  timeZone: 'America/New_York',
};

/** "2:30" -> 150 minutes. */
export function minutes(clock: string): number {
  const [h, m] = clock.split(':');
  return Number(h) * 60 + Number(m);
}

/**
 * A day's log in shorthand.
 * @param goals   Letters for the goals hit, in lane order: 'MBW' is all three,
 *                'M-W' is Mind and Wildcard, '---' is none.
 * @param screen  Unproductive screen time as "h:mm", or `null` for not logged.
 * @param beers   Beers logged.
 */
export function log(goals: string, screen: string | null, beers = 0): DayLog {
  return {
    goals: {
      mind: goals.includes('M'),
      body: goals.includes('B'),
      wildcard: goals.includes('W'),
    },
    screenMinutes: screen === null ? null : minutes(screen),
    beers,
  };
}

/** A day at par 3 unless told otherwise. */
export function day(dayLog: DayLog | null, extras: Partial<DayInput> = {}): DayInput {
  return { par: 3, log: dayLog, ...extras };
}

/** The official points for a day at par 3. */
export function points(dayLog: DayLog | null, extras: Partial<DayInput> = {}): number {
  return scoreDay(day(dayLog, extras)).total;
}

export function score(dayLog: DayLog | null, extras: Partial<DayInput> = {}): DayScore {
  return scoreDay(day(dayLog, extras));
}

/** An instant from league wall-clock time: at('2027-01-05', '11:59'). */
export function at(date: string, clock: string, timeZone = SEASON.timeZone): Instant {
  const [h, m] = clock.split(':');
  return wallTimeToInstant(date, Number(h), Number(m), timeZone);
}

/** An instant from a UTC timestamp, for checking the calendar against known answers. */
export function utc(iso: string): Instant {
  return Date.parse(iso);
}
