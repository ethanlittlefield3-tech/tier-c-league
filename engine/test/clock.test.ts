import { describe, expect, it } from 'vitest';
import { fastLeagueClock, zoneClock } from '../src/clock.ts';

const MIN = 60_000;

describe("A league's clock", () => {
  it('A real league goes by its time zone: 9 pm on a date, and the date and hour at any moment', () => {
    const clock = zoneClock('America/New_York');
    const nine = clock.timeOf('2027-01-05', 21);
    expect(nine).toBe(Date.UTC(2027, 0, 6, 2));
    expect(clock.dateOf(nine)).toBe('2027-01-05');
    expect(clock.hourOf(nine)).toBe(21);
    expect(clock.timeOf('2027-01-05', 11, 30)).toBe(Date.UTC(2027, 0, 5, 16, 30));
  });

  it('Across a daylight saving change, 9 pm is still 9 pm on the wall', () => {
    const clock = zoneClock('America/New_York');
    // Clocks went forward on Sunday March 14, 2027.
    expect(clock.timeOf('2027-03-14', 21)).toBe(Date.UTC(2027, 2, 15, 1));
  });

  it("The fast test league's hours are slices of its short days", () => {
    const startsAt = Date.UTC(2027, 0, 6, 15);
    const clock = fastLeagueClock('2027-01-04', { startsAt, dayMinutes: 8 });
    // 9 pm is seven eighths of the way through the day: 7 minutes into an 8-minute day.
    expect(clock.timeOf('2027-01-05', 21)).toBe(startsAt + 8 * MIN + 7 * MIN);
    expect(clock.hourOf(startsAt + 8 * MIN + 7 * MIN)).toBe(21);
    expect(clock.dateOf(startsAt + 8 * MIN + 7 * MIN)).toBe('2027-01-05');
    expect(clock.hourOf(startsAt + 2 * MIN)).toBe(6);
    // Before the start, the hours still run on.
    expect(clock.hourOf(startsAt - 2 * MIN)).toBe(18);
  });
});
