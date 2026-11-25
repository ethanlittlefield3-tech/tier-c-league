import { describe, expect, it } from 'vitest';
import { recentAverage, weeklyAwards, type WeekLine } from '../src/index.ts';

const line = (player: string, points: number, beers = 0): WeekLine => ({ player, points, beers });

describe('10. Weekly awards', () => {
  it('MVP is the most points that week', () => {
    const awards = weeklyAwards(1, [line('alex', 18), line('maya', 21), line('sam', 9)]);
    expect(awards.mvp).toEqual(['maya']);
  });

  it('An MVP tie goes to fewer beers', () => {
    const awards = weeklyAwards(1, [line('alex', 21, 4), line('maya', 21, 1), line('sam', 9)]);
    expect(awards.mvp).toEqual(['maya']);
  });

  it('Level on points and beers, the MVP is shared', () => {
    const awards = weeklyAwards(1, [line('alex', 21, 1), line('maya', 21, 1), line('sam', 9)]);
    expect(awards.mvp).toEqual(['alex', 'maya']);
  });

  it('In Weeks 1 and 2 the Bust is the lowest score', () => {
    const lines = [line('alex', 18), line('maya', 21), line('sam', 9)];
    expect(weeklyAwards(1, lines).bust).toEqual(['sam']);
    // Week 2 still uses the lowest score, even though one earlier week exists.
    expect(weeklyAwards(2, lines, { alex: [30], maya: [10], sam: [9] }).bust).toEqual(['sam']);
  });

  it('From Week 3 the Bust is the biggest drop below your own average', () => {
    const awards = weeklyAwards(
      5,
      [line('alex', 15), line('sam', 15), line('maya', 21), line('jordan', 9)],
      {
        alex: [16, 18, 14, 17], // average 16.25, dropped 1.25
        sam: [10, 12, 14, 16], // average 13, went up
        maya: [16, 20, 22, 19], // average 19.25, went up
        jordan: [14, 16, 15, 19], // average 16, dropped 7
      },
    );
    expect(awards.bust).toEqual(['jordan']);
    expect(awards.bustDrop).toBe(7);
  });

  it('The Bust is not always the lowest score: a strong player having an off week can take it', () => {
    const awards = weeklyAwards(
      4,
      [line('alex', 14), line('sam', 6)],
      {
        alex: [26, 27, 25], // average 26, dropped 12
        sam: [7, 8, 6], // average 7, dropped 1
      },
    );
    expect(awards.bust).toEqual(['alex']);
    expect(awards.wheel).toEqual(['sam']);
  });

  it('The average covers your last 4 weeks only', () => {
    expect(recentAverage([40, 40, 10, 10, 10, 10])).toBe(10);
  });

  it('Until 4 weeks exist, the average uses the weeks you have', () => {
    expect(recentAverage([12, 18])).toBe(15);
    expect(recentAverage([])).toBeNull();
    const awards = weeklyAwards(3, [line('alex', 10), line('maya', 20)], { alex: [12, 18], maya: [21, 23] });
    expect(awards.bust).toEqual(['alex']); // Alex dropped 5, Maya dropped 2
    expect(awards.bustDrop).toBe(5);
  });

  it('If nobody dropped below their own average, there is no Bust that week', () => {
    const awards = weeklyAwards(3, [line('alex', 20), line('maya', 25)], { alex: [12, 18], maya: [21, 23] });
    expect(awards.bust).toEqual([]);
    expect(awards.bustDrop).toBeNull();
  });

  it('Equal drops share the Bust, even when the averages are awkward fractions', () => {
    const awards = weeklyAwards(
      4,
      [line('alex', 10), line('maya', 13), line('sam', 20)],
      {
        alex: [13, 13, 14], // average 13.33, dropped 3.33
        maya: [16, 16, 17], // average 16.33, dropped 3.33
        sam: [20, 21, 20], // dropped 0.33
      },
    );
    expect(awards.bust).toEqual(['alex', 'maya']);
  });

  it('A Bust tie goes to more beers, the mirror of the MVP tiebreak', () => {
    // Weeks 1 and 2: level on the lowest score.
    expect(weeklyAwards(1, [line('alex', 16, 11), line('maya', 16, 3)]).bust).toEqual(['alex']);
    // Later weeks: level on the drop.
    const later = weeklyAwards(4, [line('alex', 10, 2), line('maya', 13, 5)], {
      alex: [13, 13, 14],
      maya: [16, 16, 17],
    });
    expect(later.bust).toEqual(['maya']);
  });

  it('The Wheel spinner is the lowest points that week', () => {
    const awards = weeklyAwards(3, [line('alex', 18), line('maya', 21), line('sam', 9)]);
    expect(awards.wheel).toEqual(['sam']);
  });

  it('Players tied for the lowest points all spin', () => {
    const awards = weeklyAwards(3, [line('alex', 9, 0), line('maya', 21), line('sam', 9, 12)]);
    expect(awards.wheel).toEqual(['alex', 'sam']);
  });
});
