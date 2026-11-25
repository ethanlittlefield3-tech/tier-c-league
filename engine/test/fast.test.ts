import { describe, expect, it } from 'vitest';
import { regularCalendar } from '../src/season.ts';
import { fastCalendar, fastDareDue, fastDate, fastStart, fastWeekStart } from '../src/fast.ts';

const MIN = 60_000;
const KICKOFF = '2027-01-04'; // a Monday
const START = Date.UTC(2027, 0, 1, 17); // any moment: a fast clock ignores the wall clock
const clock = { startsAt: START, dayMinutes: 8 };
const DAY = 8 * MIN;
const plan = { kickoff: KICKOFF, regularWeeks: 2, timeZone: 'America/New_York' };

describe('The fast test league', () => {
  it('Each day lasts a few minutes, one after another from the start', () => {
    expect(fastStart(KICKOFF, clock, KICKOFF)).toBe(START);
    expect(fastStart(KICKOFF, clock, '2027-01-05')).toBe(START + DAY);
    expect(fastStart(KICKOFF, clock, '2027-01-11')).toBe(START + 7 * DAY);
  });

  it("A moment's date follows the fast clock, not the wall clock", () => {
    expect(fastDate(KICKOFF, clock, START)).toBe(KICKOFF);
    expect(fastDate(KICKOFF, clock, START + DAY - 1)).toBe(KICKOFF);
    expect(fastDate(KICKOFF, clock, START + DAY)).toBe('2027-01-05');
    expect(fastDate(KICKOFF, clock, START + 9.5 * DAY)).toBe('2027-01-13');
    // Before the start, it is still before kickoff.
    expect(fastDate(KICKOFF, clock, START - 1)).toBe('2027-01-03');
  });

  it('Its calendar has the same days as a real season, with every deadline in the same place within the day', () => {
    const fast = fastCalendar(plan, clock);
    const real = regularCalendar(plan);
    expect(fast.map((day) => [day.date, day.period, day.week, day.dayIndex, day.mode, day.kit])).toEqual(real.map((day) => [day.date, day.period, day.week, day.dayIndex, day.mode, day.kit]));
    const tuesday = fast[1]!;
    expect(tuesday.start).toBe(START + DAY);
    // 6 pm is three quarters through the day; the day ends at its midnight and locks at noon the next day.
    expect(tuesday.sixPm).toBe(tuesday.start + 0.75 * DAY);
    expect(tuesday.noon).toBe(tuesday.start + 0.5 * DAY);
    expect(tuesday.end).toBe(tuesday.start + DAY);
    expect(tuesday.lock).toBe(tuesday.start + 1.5 * DAY);
    expect(tuesday.nextEnd).toBe(tuesday.start + 2 * DAY);
  });

  it("The week's times move with it: the kit refills on Monday, and next week's rest day can be set from this Monday", () => {
    const fast = fastCalendar(plan, clock);
    const week2Wednesday = fast[9]!;
    expect(week2Wednesday.periodStart).toBe(START + 7 * DAY);
    expect(week2Wednesday.sundayStart).toBe(START + 13 * DAY);
    expect(week2Wednesday.restOpens).toBe(START);
    expect(fast[0]!.restOpens).toBe(0);
    expect(fastWeekStart(clock, 2)).toBe(START + 7 * DAY);
  });

  it("A Wheel dare is due by the end of the Sunday after it's drawn, on the fast clock", () => {
    // Drawn as Week 1 goes final, at the start of Week 2's Tuesday: due when Week 2's Sunday ends.
    expect(fastDareDue(KICKOFF, clock, START + 8 * DAY)).toBe(START + 14 * DAY);
    // Drawn during a Sunday: due when that Sunday ends.
    expect(fastDareDue(KICKOFF, clock, START + 13.5 * DAY)).toBe(START + 14 * DAY);
  });
});
