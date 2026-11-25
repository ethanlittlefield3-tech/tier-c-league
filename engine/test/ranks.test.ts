import { describe, expect, it } from 'vitest';
import { RANK_NAMES, maxWeekPoints, rankFor, rankFromWeeks, rankMove } from '../src/ranks.ts';

describe('Ranks', () => {
  it('The most a week can score is 39 at par 3: six goal days of +6 and a rest day of +3', () => {
    expect(maxWeekPoints(3)).toBe(39);
    expect([1, 2, 4, 5, 6].map(maxWeekPoints)).toEqual([25, 32, 46, 53, 60]);
  });

  it('Rank is the average of the last 4 weeks, as a share of that most, in the tiers SCOPE.md lists', () => {
    // At par 3: Grand Champ from 31.2, Champion from 25.35, Diamond from 19.5, Platinum from 13.65, Gold from 7.8.
    const at = (points: number) => rankFor([points], 3)?.rank;
    expect([31.2, 31.1, 25.4, 25.3, 19.5, 19.4, 13.7, 13.6, 7.8, 7.7, 0, -1].map(at)).toEqual([
      'grandChamp',
      'champion',
      'champion',
      'diamond',
      'diamond',
      'platinum',
      'platinum',
      'gold',
      'gold',
      'silver',
      'silver',
      'bronze',
    ]);
    expect(RANK_NAMES.grandChamp).toBe('Grand Champ');
  });

  it('Only the last 4 weeks count, and until 4 exist the average uses the weeks there are', () => {
    expect(rankFor([0, 0, 0, 39, 39, 39, 39], 3)).toMatchObject({ rank: 'grandChamp', average: 39 });
    expect(rankFor([20, 10], 3)).toMatchObject({ average: 15, rank: 'platinum' });
  });

  it('A player with no final week yet is unranked', () => {
    expect(rankFor([], 3)).toBeNull();
    expect(rankFromWeeks([])).toBeNull();
  });

  it('Rank history carries across seasons: each week counts as a share of the most its own season allowed', () => {
    // 31.2 of 39 at par 3, then 36.8 of 46 at par 4: both exactly 80%.
    expect(rankFromWeeks([{ points: 31.2, max: 39 }, { points: 36.8, max: 46 }])?.rank).toBe('grandChamp');
    // Only the last 4 weeks count.
    expect(rankFromWeeks([{ points: -5, max: 39 }, { points: 39, max: 39 }, { points: 39, max: 39 }, { points: 39, max: 39 }, { points: 39, max: 39 }])?.share).toBe(1);
  });

  it('A rank change is up or down; a first rank counts as up', () => {
    expect(rankMove('gold', 'platinum')).toBe('up');
    expect(rankMove('diamond', 'gold')).toBe('down');
    expect(rankMove('gold', 'gold')).toBe('same');
    expect(rankMove(null, 'silver')).toBe('up');
  });
});
