import { describe, expect, it } from 'vitest';
import { daysLeft, historyBefore, paceSoFar, recentDailyAverage, weekOdds, winMeter } from '../src/meter.ts';

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

describe("A week's odds", () => {
  const week = (season: string, n: number, points: number) => ({ season, period: `w${String(n).padStart(2, '0')}`, points });

  it("A week's odds come from each player's final weeks before the one just played, since that one is final only on the Tuesday", () => {
    const history = [week('s1', 1, 20), week('s1', 2, 22), week('s1', 3, 24), week('s1', 4, 26)];
    // Week 4's odds: weeks 1 and 2 only, so they are the same on Monday as at the end of the week.
    expect(historyBefore(history, 's1', 4)).toEqual([history[0], history[1]]);
    // Last season's weeks count too.
    expect(historyBefore([week('s0', 11, 30), ...history], 's1', 3)).toEqual([week('s0', 11, 30), history[0]]);
    expect(historyBefore(undefined, 's1', 4)).toEqual([]);
  });

  it("They are the win meter at kickoff: nothing scored yet, a whole week left, each side's recent daily average", () => {
    const strong = [week('s1', 1, 35), week('s1', 2, 35)];
    const weak = [week('s1', 1, 14), week('s1', 2, 14)];
    expect(weekOdds(strong, weak, 's1', 4)).toBeCloseTo(winMeter({ points: 0, dailyAverage: 5 }, { points: 0, dailyAverage: 2 }, 7));
    expect(weekOdds(strong, weak, 's1', 4)).toBeGreaterThan(0.5);
    expect(weekOdds(weak, strong, 's1', 4)).toBeCloseTo(1 - weekOdds(strong, weak, 's1', 4));
  });

  it('With nothing final to go on, a week is even', () => {
    expect(weekOdds([], [], 's1', 1)).toBe(0.5);
    expect(weekOdds([week('s1', 1, 30)], [week('s1', 1, 10)], 's1', 2)).toBe(0.5);
  });
});
