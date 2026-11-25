import { describe, expect, it } from 'vitest';
import { calendarStamp, weekReads } from '../lib/week-reads.ts';

const H = 3_600_000;
const T = Date.UTC(2027, 0, 11, 5); // Monday 12:00 am in New York
const days = [0, 1, 2, 3, 4, 5, 6].map((index) => ({ date: `2027-01-${11 + index}`, start: T + index * 24 * H, lock: T + index * 24 * H + 36 * H }));
const pairs = [{ a: 'alex', b: 'maya' }, { a: 'sam', b: 'HOUSE' }];

describe('What the weekly job reads each hour', () => {
  it('A week that has not started needs nothing read', () => {
    expect(weekReads({ days, pairs, demolitions: [], now: T - 1 })).toBeNull();
  });

  it("Mid-week, with no Demolition's day locked, nothing is read either", () => {
    expect(weekReads({ days, pairs, demolitions: [{ target: 'maya', date: '2027-01-14' }], now: T + 3 * 24 * H })).toBeNull();
  });

  it("Once a Demolition's day locks, only its target is read, to work out how it went", () => {
    // Wednesday locked at noon on Thursday.
    expect(weekReads({ days, pairs, demolitions: [{ target: 'maya', date: '2027-01-13' }, { target: 'alex', date: '2027-01-15' }], now: T + 3.6 * 24 * H })).toEqual({ settle: false, players: ['maya'] });
  });

  it('Once Sunday locks, everyone in the week is read to settle it, but never The House', () => {
    expect(weekReads({ days, pairs, demolitions: [], now: T + 7.5 * 24 * H })).toEqual({ settle: true, players: ['alex', 'maya', 'sam'] });
  });

  it("The calendar's stamp changes when its settings do", () => {
    const stamp = calendarStamp({ kickoff: '2027-01-04', regularWeeks: 6, timeZone: 'America/New_York' });
    expect(calendarStamp({ kickoff: '2027-01-04', regularWeeks: 6, timeZone: 'America/New_York' })).toBe(stamp);
    expect(calendarStamp({ kickoff: '2027-01-11', regularWeeks: 6, timeZone: 'America/New_York' })).not.toBe(stamp);
    expect(calendarStamp({ kickoff: '2027-01-04', regularWeeks: 7, timeZone: 'America/New_York' })).not.toBe(stamp);
    expect(calendarStamp({ kickoff: '2027-01-04', regularWeeks: 6, timeZone: 'America/Chicago' })).not.toBe(stamp);
  });
});
