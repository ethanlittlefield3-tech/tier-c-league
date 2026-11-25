import { describe, expect, it } from 'vitest';
import { aerialDays, boostDays, canCancelAerial, canTakeBack, demolitionDays, restDays, ruleOneCount, ruleOneDays, type CalDay } from '../src/today/kit.ts';
import { liveDayScore } from '../src/today/model.ts';

const H = 3_600_000;
const NOW = Date.UTC(2027, 0, 13, 15); // Wednesday of Week 2, 10:00 am in New York
const FULL = ['aerial', 'demolition', 'fullBoost'];

/** A day of Week 2, `offset` days from Wednesday, with its window placed around NOW. */
function day(dayIndex: number, overrides: Partial<CalDay> = {}): CalDay {
  const offset = dayIndex - 2;
  const start = NOW - 10 * H + offset * 24 * H;
  return {
    date: `2027-01-${String(11 + dayIndex).padStart(2, '0')}`,
    period: 'w02',
    week: 2,
    dayIndex,
    phase: 'regular',
    kit: FULL,
    start,
    lock: start + 36 * H,
    periodStart: NOW - 60 * H,
    sundayStart: NOW - 10 * H + 4 * 24 * H,
    restOpens: NOW - 200 * H,
    ...overrides,
  };
}
const WEEK = [0, 1, 2, 3, 4, 5, 6].map((index) => day(index));
const dates = (indexes: number[]) => indexes.map((index) => WEEK[index]!.date);

describe('Aerial', () => {
  it('Can be set on any day of this week that has not started', () => {
    expect(aerialDays(WEEK, NOW)).toEqual(dates([3, 4, 5, 6]));
  });

  it('Not before the week\'s kit refills, and not in a week without Aerial', () => {
    expect(aerialDays(WEEK.map((d) => ({ ...d, periodStart: NOW + H })), NOW)).toEqual([]);
    expect(aerialDays(WEEK.map((d) => ({ ...d, kit: [] })), NOW)).toEqual([]);
  });

  it('Can be cancelled until its day starts', () => {
    expect(canCancelAerial(WEEK[3]!, NOW)).toBe(true);
    expect(canCancelAerial(WEEK[2]!, NOW)).toBe(false);
  });
});

describe('Demolition', () => {
  it('Can be aimed at any day of this week that has not started', () => {
    expect(demolitionDays(WEEK, NOW, null)).toEqual(dates([3, 4, 5]));
  });

  it("Never at the opponent's rest day: Sunday unless they moved it", () => {
    expect(demolitionDays(WEEK, NOW, null)).not.toContain(WEEK[6]!.date);
    expect(demolitionDays(WEEK, NOW, WEEK[4]!.date)).toEqual(dates([3, 5, 6]));
  });
});

describe('Full Boost', () => {
  it('Can be used on a day that is open: today, and yesterday until noon', () => {
    expect(boostDays(WEEK, NOW, null)).toEqual(dates([1, 2]));
  });

  it('Never on your own rest day', () => {
    expect(boostDays(WEEK, NOW, WEEK[2]!.date)).toEqual(dates([1]));
  });

  it('Full Boost and Rule One can be taken back until the day locks', () => {
    expect(canTakeBack(WEEK[1]!, NOW)).toBe(true);
    expect(canTakeBack(WEEK[0]!, NOW)).toBe(false);
  });
});

describe('Rule One', () => {
  it('Can be declared on an open day of the regular season', () => {
    expect(ruleOneDays(WEEK, NOW)).toEqual(dates([1, 2]));
    expect(ruleOneDays(WEEK.map((d) => ({ ...d, phase: 'playoff' })), NOW)).toEqual([]);
  });

  it('Counts the ones that have arrived, and offers the lowest unused one next', () => {
    const issue = [NOW - 100 * H, NOW + 300 * H];
    expect(ruleOneCount(issue, [], NOW)).toEqual({ arrived: 1, used: 0, next: 1 });
    expect(ruleOneCount(issue, [1], NOW)).toEqual({ arrived: 1, used: 1, next: null });
    expect(ruleOneCount(issue, [1], NOW + 400 * H)).toEqual({ arrived: 2, used: 1, next: 2 });
  });
});

describe('The rest day', () => {
  it('Can move to any day of the week that has not started, while Sunday is still ahead', () => {
    expect(restDays(WEEK, NOW, false)).toEqual(dates([3, 4, 5, 6]));
  });

  it('Not before the week before begins', () => {
    expect(restDays(WEEK.map((d) => ({ ...d, restOpens: NOW + H })), NOW, false)).toEqual([]);
  });

  it('Once Sunday has started, a rest day that was never moved stays on Sunday', () => {
    const late = WEEK.map((d) => ({ ...d, sundayStart: NOW - H }));
    expect(restDays(late, NOW, false)).toEqual([]);
    // A rest day already moved to a later day can still move, while both days are ahead.
    expect(restDays(late, NOW, true)).toEqual(dates([3, 4, 5, 6]));
  });
});

describe("The live score counts your own power-ups", () => {
  const entry = { goals: { mind: true, body: false, wildcard: false }, screenMinutes: 30, beers: 0 };

  it('Aerial doubles the day', () => {
    // 1 goal and 30 minutes at par 3 (+3) is 4, doubled is 8.
    expect(liveDayScore({ par: 3, entry, restDay: false, locked: false, aerial: true }).total).toBe(8);
  });

  it('Full Boost counts a missed goal as hit', () => {
    expect(liveDayScore({ par: 3, entry, restDay: false, locked: false, fullBoost: 'body' }).total).toBe(5);
  });

  it('Rule One makes the day 0', () => {
    expect(liveDayScore({ par: 3, entry, restDay: false, locked: false, ruleOne: true }).total).toBe(0);
  });
});
