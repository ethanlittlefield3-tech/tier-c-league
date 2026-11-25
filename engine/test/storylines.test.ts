import { describe, expect, it } from 'vitest';
import { storylines, type Story, type StoryWeek } from '../src/storylines.ts';

/** A headline as plain words, for reading the tests. */
const text = (story: Story) =>
  ({
    snapped: `${story.player}'s ${story.count}-game win streak snapped by ${story.other}`,
    leader: `${story.player} took down the leader, ${story.other}`,
    streak: `${story.player} has won ${story.count} straight`,
    firstWin: `${story.player} gets a first win of the season, after ${story.count} losses`,
    blowout: `${story.player} crushed ${story.other} by ${story.count}`,
    edged: `${story.player} edged ${story.other} by a single point`,
  })[story.kind];
const headlines = (weeks: StoryWeek[], week: number) => storylines(weeks, week).map(text);

/** A week of 1v1 games: [winner, loser, winner's points, loser's points]. Level points make a draw. */
function week(n: number, games: [string, string, number, number][]): StoryWeek {
  const results: StoryWeek['results'] = {};
  for (const [a, b, pa, pb] of games) {
    const outcome = pa > pb ? 'win' : pa < pb ? 'loss' : 'draw';
    const flip = { win: 'loss', loss: 'win', draw: 'draw' } as const;
    results[a] = { opponent: b, outcome, points: pa, opponentPoints: pb, seasonPoints: pa + (outcome === 'win' ? 5 : outcome === 'draw' ? 2 : 0) };
    if (b !== 'HOUSE') results[b] = { opponent: a, outcome: flip[outcome], points: pb, opponentPoints: pa, seasonPoints: pb + (flip[outcome] === 'win' ? 5 : flip[outcome] === 'draw' ? 2 : 0) };
  }
  return { week: n, results };
}

describe('Season storylines', () => {
  it("A win streak of 3 or more that ends is news: \"Alex's 4-game win streak snapped by Maya\"", () => {
    const weeks = [1, 2, 3, 4].map((n) => week(n, [['alex', 'sam', 20, 10]])).concat(week(5, [['maya', 'alex', 21, 15]]));
    expect(headlines(weeks, 5)[0]).toBe("alex's 4-game win streak snapped by maya");
  });

  it('So is a streak that reaches 3, and every win after', () => {
    const weeks = [1, 2, 3].map((n) => week(n, [['maya', 'sam', 20, 12]]));
    expect(headlines(weeks, 2)).not.toContain('maya has won 2 straight');
    expect(headlines(weeks, 3)).toContain('maya has won 3 straight');
  });

  it('Beating the player with the most Season Points going in is news; with a tie at the top, nobody leads', () => {
    const weeks = [week(1, [['alex', 'sam', 30, 10], ['maya', 'jordan', 12, 11]]), week(2, [['jordan', 'alex', 18, 17]])];
    expect(headlines(weeks, 2)).toContain('jordan took down the leader, alex');
    const level = [week(1, [['alex', 'sam', 20, 10], ['maya', 'jordan', 20, 10]]), week(2, [['jordan', 'alex', 18, 17]])];
    expect(headlines(level, 2).join()).not.toContain('took down the leader');
  });

  it('A first win after two or more losses is news', () => {
    const weeks = [week(1, [['maya', 'sam', 20, 10]]), week(2, [['alex', 'sam', 20, 10]]), week(3, [['sam', 'jordan', 14, 13]])];
    expect(headlines(weeks, 3)).toContain('sam gets a first win of the season, after 2 losses');
  });

  it('So are a blowout of 20 or more, and a win by a single point', () => {
    const weeks = [week(1, [['maya', 'sam', 32, 10], ['alex', 'jordan', 15, 14]])];
    expect(headlines(weeks, 1)).toEqual(['maya crushed sam by 22', 'alex edged jordan by a single point']);
  });

  it('A recap carries at most 3 headlines, the biggest news first, and weeks against The House make none', () => {
    const weeks = [1, 2, 3].map((n) => week(n, [['alex', 'sam', 30, 5], ['maya', 'HOUSE', 40, 10]])).concat(week(4, [['sam', 'alex', 15, 14], ['maya', 'jordan', 40, 10]]));
    const told = headlines(weeks, 4);
    expect(told).toHaveLength(3);
    expect(told[0]).toBe("alex's 3-game win streak snapped by sam");
    expect(told.join()).not.toContain('maya has won');
    expect(storylines([week(1, [['maya', 'HOUSE', 40, 10]])], 1)).toEqual([]);
  });
});
