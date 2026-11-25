import { describe, expect, it } from 'vitest';
import {
  HOUR,
  MINUTE,
  canMoveRestDay,
  canSetAerial,
  canUseFullBoost,
  defaultRestDay,
  kitForMode,
  proofDeadline,
  regularCalendar,
  regularCalendarDay,
  type CalendarDay,
  type SeasonPlan,
} from '../src/index.ts';
import { SEASON, utc } from './helpers.ts';

const PLAN: SeasonPlan = { ...SEASON, modes: { 3: 'bounty', 5: 'alley' } };

describe('The calendar the security rules read', () => {
  it('Every regular-season day gets one entry, Monday of Week 1 to Sunday of the last week', () => {
    const days = regularCalendar(PLAN);
    expect(days).toHaveLength(42);
    expect(days[0]?.date).toBe('2027-01-04');
    expect(days[41]?.date).toBe('2027-02-14');
    expect(days.map((day) => day.week).filter((week, i, all) => all.indexOf(week) === i)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('An entry holds the day start, its noon, the 6 pm receipt cutoff, the day end and the noon lock, in real time', () => {
    const day = regularCalendarDay(PLAN, '2027-01-06'); // Wednesday of Week 1
    expect(day).toMatchObject({ date: '2027-01-06', period: 'w01', week: 1, dayIndex: 2, phase: 'regular', kind: 'play', mode: 'regular' });
    expect(day.start).toBe(utc('2027-01-06T05:00:00Z'));
    expect(day.sixPm).toBe(utc('2027-01-06T23:00:00Z'));
    // Noon the same day: a Rumble Boot's deadline.
    expect(day.noon).toBe(utc('2027-01-06T17:00:00Z'));
    expect(day.end).toBe(utc('2027-01-07T05:00:00Z'));
    expect(day.lock).toBe(utc('2027-01-07T17:00:00Z'));
    expect(day.nextEnd).toBe(utc('2027-01-08T05:00:00Z'));
  });

  it("An entry also holds its week's kit refill, its Sunday, and when its rest day can first be set", () => {
    const week2Wednesday = regularCalendarDay(PLAN, '2027-01-13');
    expect(week2Wednesday.periodStart).toBe(utc('2027-01-11T05:00:00Z')); // Monday of Week 2
    expect(week2Wednesday.sundayStart).toBe(utc('2027-01-17T05:00:00Z'));
    expect(week2Wednesday.restOpens).toBe(utc('2027-01-04T05:00:00Z')); // Monday of Week 1
    // Week 1's rest day can be set any time before kickoff.
    expect(regularCalendarDay(PLAN, '2027-01-06').restOpens).toBe(0);
  });

  it('Entries stay right across a daylight saving change', () => {
    const season: SeasonPlan = { kickoff: '2027-03-08', regularWeeks: 3, timeZone: 'America/New_York' };
    const springForward = regularCalendarDay(season, '2027-03-14');
    expect(springForward.end - springForward.start).toBe(23 * HOUR);
    expect(springForward.lock).toBe(utc('2027-03-15T16:00:00Z')); // noon, now on daylight time
    expect(springForward.sixPm).toBe(utc('2027-03-14T22:00:00Z'));
    expect(springForward.noon).toBe(utc('2027-03-14T16:00:00Z'));
  });

  it('A date outside the regular season has no regular-season entry', () => {
    expect(() => regularCalendarDay(PLAN, '2027-01-03')).toThrow(/regular season/);
    expect(() => regularCalendarDay(PLAN, '2027-02-15')).toThrow(/regular season/);
  });

  it('The kit on offer depends on the kind of week', () => {
    const all = ['aerial', 'demolition', 'fullBoost'];
    expect(kitForMode('regular')).toEqual(all);
    expect(kitForMode('teamWeek')).toEqual(all);
    expect(kitForMode('twoVTwo')).toEqual(all);
    expect(kitForMode('dropShot')).toEqual(all);
    expect(kitForMode('bounty')).toEqual(['aerial', 'fullBoost']); // co-op, so no Demolition
    expect(kitForMode('rumble')).toEqual([]); // a random item a day instead
    expect(kitForMode('alley')).toEqual([]);
    expect(regularCalendarDay(PLAN, '2027-01-20').kit).toEqual(['aerial', 'fullBoost']); // Week 3 is Bounty Week
    expect(regularCalendarDay(PLAN, '2027-02-03').kit).toEqual([]); // Week 5 is Alley
  });
});

describe('The rules and the engine agree on every deadline', () => {
  // The security rules only compare the clock with the numbers in a calendar
  // entry. These checks walk a whole week in 47-minute steps and confirm that
  // those comparisons give the same answer as the engine's own timing rules.
  const season: SeasonPlan = SEASON;
  const week2 = regularCalendar(season).filter((day) => day.week === 2);
  const from = (week2[0] as CalendarDay).start - 36 * HOUR;
  const to = (week2[6] as CalendarDay).lock + 6 * HOUR;
  const moments: number[] = [];
  for (let now = from; now <= to; now += 47 * MINUTE) moments.push(now);

  it('Aerial and Demolition: after the kit refills and before the day starts', () => {
    for (const day of week2) {
      for (const now of moments) {
        const rules = now >= day.periodStart && now < day.start;
        expect(rules, `${day.date} at ${new Date(now).toISOString()}`).toBe(canSetAerial(season, day.date, now).ok);
      }
    }
  });

  it('Full Boost and logging: from the start of the day until it locks', () => {
    for (const day of week2) {
      for (const now of moments) {
        const rules = now >= day.start && now < day.lock;
        expect(rules, `${day.date} at ${new Date(now).toISOString()}`).toBe(
          canUseFullBoost(season, day.date, now, { restDay: false }).ok,
        );
      }
    }
  });

  it('First rest-day move: the new day and the default Sunday both still ahead', () => {
    const sunday = defaultRestDay(season.kickoff, 2);
    for (const day of week2.filter((d) => d.date !== sunday)) {
      for (const now of moments) {
        const rules = now < day.start && now >= day.restOpens && now < day.sundayStart;
        expect(rules, `${day.date} at ${new Date(now).toISOString()}`).toBe(
          canMoveRestDay(season, { from: sunday, to: day.date }, now).ok,
        );
      }
    }
  });

  it('Receipt proof: due at the end of the day, or the end of the next day when asked at 6 pm or later', () => {
    for (const day of week2) {
      for (const now of moments.filter((m) => m >= day.start && m < day.end)) {
        const rules = now < day.sixPm ? day.end : day.nextEnd;
        expect(rules, `${day.date} at ${new Date(now).toISOString()}`).toBe(proofDeadline(now, season.timeZone));
      }
    }
  });
});
