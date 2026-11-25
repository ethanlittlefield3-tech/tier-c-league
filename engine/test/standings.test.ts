import { describe, expect, it } from 'vitest';
import { rankStandings, type Game, type StandingRow } from '../src/index.ts';

function row(player: string, seasonPoints: number, beers = 0, perfectDays = 0, coin = 0.5): StandingRow {
  return { player, seasonPoints, beers, perfectDays, coin };
}

const order = (rows: StandingRow[], games: Game[] = []) => rankStandings(rows, games).map((r) => r.player);

describe('9. Standings', () => {
  it('Standings rank by Season Points, most first', () => {
    const ranked = rankStandings([row('sam', 88), row('alex', 104), row('maya', 97)], []);
    expect(ranked.map((r) => [r.rank, r.player, r.tieBreak])).toEqual([
      [1, 'alex', null],
      [2, 'maya', null],
      [3, 'sam', null],
    ]);
  });

  it('Tied on Season Points: head-to-head decides first', () => {
    const rows = [row('alex', 100, 2, 9), row('maya', 100, 30, 0)];
    // Maya has more beers and fewer perfect days, but she beat Alex.
    const ranked = rankStandings(rows, [{ a: 'alex', b: 'maya', result: 'b' }]);
    expect(ranked.map((r) => r.player)).toEqual(['maya', 'alex']);
    expect(ranked[0]?.tieBreak).toBe('headToHead');
  });

  it('Head-to-head counts every meeting between the tied players', () => {
    const rows = [row('alex', 100), row('maya', 100)];
    const games: Game[] = [
      { a: 'alex', b: 'maya', result: 'b' },
      { a: 'maya', b: 'alex', result: 'b' },
      { a: 'alex', b: 'maya', result: 'a' },
    ];
    expect(order(rows, games)).toEqual(['alex', 'maya']); // Alex leads the series 2 to 1
  });

  it('Head-to-head level or never played: fewer beers decides', () => {
    const rows = [row('alex', 100, 14, 3), row('maya', 100, 6, 1)];
    const drew: Game[] = [{ a: 'alex', b: 'maya', result: 'draw' }];
    expect(order(rows, drew)).toEqual(['maya', 'alex']);
    expect(order(rows, [])).toEqual(['maya', 'alex']);
    expect(rankStandings(rows, [])[0]?.tieBreak).toBe('beers');
  });

  it('Still tied: more perfect days decides', () => {
    const rows = [row('alex', 100, 6, 3), row('maya', 100, 6, 5)];
    const ranked = rankStandings(rows, []);
    expect(ranked.map((r) => r.player)).toEqual(['maya', 'alex']);
    expect(ranked[0]?.tieBreak).toBe('perfectDays');
  });

  it('Still tied: the sealed coin flip decides', () => {
    const rows = [row('alex', 100, 6, 3, 0.81), row('maya', 100, 6, 3, 0.12)];
    const ranked = rankStandings(rows, []);
    expect(ranked.map((r) => r.player)).toEqual(['maya', 'alex']);
    expect(ranked[0]?.tieBreak).toBe('coinFlip');
  });

  it('A game against a player outside the tie never counts as head-to-head', () => {
    const rows = [row('alex', 100, 9), row('maya', 100, 4), row('sam', 60)];
    // Alex beat Sam, but Sam is not part of the tie, so beers decide it.
    const games: Game[] = [{ a: 'alex', b: 'sam', result: 'a' }];
    expect(order(rows, games)).toEqual(['maya', 'alex', 'sam']);
  });

  it('A three-way tie uses the results among the three', () => {
    const rows = [row('alex', 100), row('maya', 100), row('sam', 100)];
    const games: Game[] = [
      { a: 'alex', b: 'maya', result: 'a' },
      { a: 'alex', b: 'sam', result: 'a' },
      { a: 'maya', b: 'sam', result: 'a' },
    ];
    expect(order(rows, games)).toEqual(['alex', 'maya', 'sam']);
  });

  it('When a tiebreaker separates some of a group, whoever is still level starts again from head-to-head', () => {
    // Alex beat both. Maya and Sam never met, so they fall to beers.
    const rows = [row('sam', 100, 3), row('maya', 100, 8), row('alex', 100, 20)];
    const games: Game[] = [
      { a: 'alex', b: 'maya', result: 'a' },
      { a: 'alex', b: 'sam', result: 'a' },
    ];
    const ranked = rankStandings(rows, games);
    expect(ranked.map((r) => [r.player, r.tieBreak])).toEqual([
      ['alex', 'headToHead'],
      ['sam', 'beers'],
      ['maya', 'beers'],
    ]);

    // Beers split off Alex first; then Maya's win over Sam settles the other two.
    const second = rankStandings(
      [row('sam', 100, 5), row('maya', 100, 5), row('alex', 100, 1)],
      [{ a: 'maya', b: 'sam', result: 'a' }, { a: 'sam', b: 'alex', result: 'a' }, { a: 'alex', b: 'maya', result: 'a' }],
    );
    // Head-to-head among all three is level (one win each), so beers go first.
    expect(second.map((r) => [r.player, r.tieBreak])).toEqual([
      ['alex', 'beers'],
      ['maya', 'headToHead'],
      ['sam', 'headToHead'],
    ]);
  });

  it('Ranks always run 1, 2, 3 with no shared places', () => {
    const rows = [row('a', 50, 1, 1, 0.3), row('b', 50, 1, 1, 0.1), row('c', 50, 1, 1, 0.2), row('d', 70)];
    expect(rankStandings(rows, []).map((r) => [r.rank, r.player])).toEqual([
      [1, 'd'],
      [2, 'b'],
      [3, 'c'],
      [4, 'a'],
    ]);
  });
});
