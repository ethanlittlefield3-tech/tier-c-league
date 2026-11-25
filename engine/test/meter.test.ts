import { describe, expect, it } from 'vitest';
import { daysLeft, paceSoFar, recentDailyAverage, winMeter } from '../src/meter.ts';

const side = (points: number, dailyAverage: number | null = 2) => ({ points, dailyAverage });

describe('The win meter', () => {
  it('Level on points, with the same recent average, the bar is even', () => {
    expect(winMeter(side(10), side(10), 3)).toBeCloseTo(0.5);
  });

  it('A lead with days to go favors the leader, but never as a sure thing', () => {
    const share = winMeter(side(15), side(9), 3);
    expect(share).toBeGreaterThan(0.6);
    expect(share).toBeLessThan(0.97);
    expect(winMeter(side(60), side(0), 3)).toBe(0.97);
    expect(winMeter(side(0), side(60), 3)).toBe(0.03);
  });

  it('The same lead counts for more as the days run out', () => {
    expect(winMeter(side(14), side(10), 1)).toBeGreaterThan(winMeter(side(14), side(10), 4));
  });

  it('A better recent average can favor the player who trails, with enough days left', () => {
    // 8 + 4 × 4 = 24 against 10 + 1 × 4 = 14.
    expect(winMeter(side(8, 4), side(10, 1), 4)).toBeGreaterThan(0.5);
  });

  it('Once no day is left, the leader has it all, and a tie on points splits it', () => {
    expect(winMeter(side(20), side(19), 0)).toBe(1);
    expect(winMeter(side(19), side(20), 0)).toBe(0);
    expect(winMeter(side(20), side(20), 0)).toBe(0.5);
  });

  it('Each day to come counts as a whole day left, and the open day as half of one', () => {
    expect(daysLeft([{ state: 'locked' }, { state: 'open' }, { state: 'future' }, { state: 'future' }])).toBe(2.5);
  });

  it("A recent daily average is the last 4 final weeks' points over 7 days each; until then, this week's pace", () => {
    expect(recentDailyAverage([{ points: 70 }, { points: 14 }, { points: 14 }, { points: 14 }, { points: 14 }])).toBe(2);
    expect(recentDailyAverage([])).toBeNull();
    const day = (state: 'locked' | 'open', total: number) => ({ state, score: { total } });
    expect(paceSoFar([day('locked', 4), day('locked', 2), day('open', 6)])).toBe(3);
    expect(paceSoFar([day('open', 6)])).toBeNull();
  });
});
