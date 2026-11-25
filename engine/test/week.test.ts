import { describe, expect, it } from 'vitest';
import {
  HOUSE,
  decideMatchup,
  houseSide,
  matchupBonus,
  settleWeek,
  totalWeek,
} from '../src/index.ts';
import { log, score } from './helpers.ts';

describe('7. Matchups and Season Points', () => {
  it("A week's points are the sum of its seven days", () => {
    const week = [
      score(log('MBW', '0:45')), // 6, perfect
      score(log('M-W', '2:30', 1)), // 2
      score(null), // -5 no-show
      score(log('MB-', '3:00', 2)), // 0
      score(log('MBW', '1:15'), { aerial: true }), // 10, perfect
      score(log('--W', '4:15', 3)), // -3
      score(log('---', '1:30', 1), { restDay: true }), // 1
    ];
    expect(totalWeek(week)).toEqual({ points: 11, beers: 7, perfectDays: 2, noShows: 1, checkIns: 6 });
  });

  it('Beers logged on a Rule One day still count toward the beers tiebreak', () => {
    const week = [score(log('---', '2:00', 5), { ruleOne: true }), score(log('MBW', '0:45', 1))];
    expect(totalWeek(week)).toMatchObject({ points: 5, beers: 6 });
  });

  it('Most points wins the 1v1', () => {
    expect(decideMatchup({ points: 18, beers: 9 }, { points: 13, beers: 0 })).toEqual({
      a: 'win',
      b: 'loss',
      decidedBy: 'points',
    });
  });

  it('A tie on points goes to the player with fewer beers', () => {
    expect(decideMatchup({ points: 16, beers: 11 }, { points: 16, beers: 3 })).toEqual({
      a: 'loss',
      b: 'win',
      decidedBy: 'beers',
    });
  });

  it('Still tied after beers is a draw', () => {
    expect(decideMatchup({ points: 15, beers: 6 }, { points: 15, beers: 6 })).toEqual({
      a: 'draw',
      b: 'draw',
      decidedBy: 'none',
    });
  });

  it('Season Points are your own points plus 5 for a win, 2 for a draw and 0 for a loss', () => {
    expect(matchupBonus('win')).toBe(5);
    expect(matchupBonus('draw')).toBe(2);
    expect(matchupBonus('loss')).toBe(0);
    const { results } = settleWeek(
      [
        ['alex', 'maya'],
        ['sam', 'jordan'],
      ],
      {
        alex: { points: 18, beers: 2 },
        maya: { points: 13, beers: 0 },
        sam: { points: 15, beers: 6 },
        jordan: { points: 15, beers: 6 },
      },
    );
    expect(results.alex).toMatchObject({ outcome: 'win', bonus: 5, seasonPoints: 23 });
    expect(results.maya).toMatchObject({ outcome: 'loss', bonus: 0, seasonPoints: 13 });
    expect(results.sam).toMatchObject({ outcome: 'draw', bonus: 2, seasonPoints: 17 });
    expect(results.jordan).toMatchObject({ outcome: 'draw', bonus: 2, seasonPoints: 17 });
  });

  it('Your own points always count: a losing week adds them, and a negative week subtracts', () => {
    const { results } = settleWeek([['riley', 'alex']], {
      riley: { points: -1, beers: 9 },
      alex: { points: 18, beers: 2 },
    });
    expect(results.riley).toMatchObject({ outcome: 'loss', seasonPoints: -1 });
  });

  it("The House scores that week's league average, without the bye player", () => {
    expect(houseSide([{ points: 18, beers: 2 }, { points: 13, beers: 6 }])).toEqual({ points: 15.5, beers: 4 });
    const { house, results } = settleWeek(
      [
        ['alex', 'jordan'],
        ['riley', HOUSE],
      ],
      {
        alex: { points: 18, beers: 2 },
        jordan: { points: 13, beers: 6 },
        riley: { points: 40, beers: 0 }, // a monster week that must not lift the average
      },
    );
    expect(house).toEqual({ points: 15.5, beers: 4 });
    expect(results.riley).toMatchObject({ opponent: HOUSE, opponentPoints: 15.5 });
  });

  it('The House average is never rounded', () => {
    const others = [
      { points: 17, beers: 0 },
      { points: 17, beers: 0 },
      { points: 17, beers: 0 },
      { points: 18, beers: 0 },
    ];
    // The average is 17.25, so 17 points is a loss and 18 is a win.
    expect(decideMatchup({ points: 17, beers: 0 }, houseSide(others)).a).toBe('loss');
    expect(decideMatchup({ points: 18, beers: 0 }, houseSide(others)).a).toBe('win');
  });

  it('Beating The House earns the +5, like any other 1v1', () => {
    const { results } = settleWeek(
      [
        ['alex', 'jordan'],
        ['riley', HOUSE],
      ],
      {
        alex: { points: 18, beers: 2 },
        jordan: { points: 13, beers: 6 },
        riley: { points: 16, beers: 1 },
      },
    );
    expect(results.riley).toMatchObject({ outcome: 'win', bonus: 5, seasonPoints: 21 });
  });

  it('Level with The House on points, fewer beers than the league average wins, and the same is a draw', () => {
    const others = [
      { points: 14, beers: 3 },
      { points: 16, beers: 5 },
    ];
    const house = houseSide(others); // 15 points, 4 beers
    expect(decideMatchup({ points: 15, beers: 3 }, house)).toMatchObject({ a: 'win', decidedBy: 'beers' });
    expect(decideMatchup({ points: 15, beers: 5 }, house)).toMatchObject({ a: 'loss', decidedBy: 'beers' });
    expect(decideMatchup({ points: 15, beers: 4 }, house)).toMatchObject({ a: 'draw' });
  });

  it('With an even count nobody plays The House', () => {
    const { house } = settleWeek([['alex', 'maya']], {
      alex: { points: 10, beers: 0 },
      maya: { points: 9, beers: 0 },
    });
    expect(house).toBeNull();
  });
});
