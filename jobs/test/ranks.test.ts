import { describe, expect, it } from 'vitest';
import { matchupOf, withWeek, type RankEntry } from '../lib/ranks.ts';

describe('Ranks after a final week', () => {
  it("A final week joins the player's rank history, and their rank is worked out again", () => {
    const first = withWeek([], { season: 's1', period: 'w01', points: 20, par: 3 });
    expect(first.rank).toBe('diamond');
    expect(first.history).toEqual([{ season: 's1', period: 'w01', points: 20, max: 39, rank: 'diamond' }]);
    const second = withWeek(first.history, { season: 's1', period: 'w02', points: 4, par: 3 });
    // (20 + 4) / 2 = 12 of 39: Gold.
    expect(second.rank).toBe('gold');
    expect(second.history.map((entry) => entry.rank)).toEqual(['diamond', 'gold']);
  });

  it("Each week keeps how the matchup ended and the other side's points, so a phone can celebrate a win", () => {
    const won = withWeek([], { season: 's1', period: 'w01', points: 20, par: 3, outcome: 'win', against: 14 });
    expect(won.history).toEqual([{ season: 's1', period: 'w01', points: 20, max: 39, rank: 'diamond', outcome: 'win', against: 14 }]);
    // Counted again after an unlock: the new result replaces the old.
    const again = withWeek(won.history, { season: 's1', period: 'w01', points: 12, par: 3, outcome: 'loss', against: 14 });
    expect(again.history[0]).toMatchObject({ points: 12, outcome: 'loss', against: 14 });
  });

  it("In Team Week and 2v2 the matchup is the two sides' averages; a Bounty or Alley week has none", () => {
    expect(matchupOf({ outcome: 'win', opponentPoints: 14 })).toEqual({ outcome: 'win', against: 14 });
    expect(matchupOf({ outcome: 'win', opponentPoints: 30.5, side: { points: 33.5 }, against: { points: 30.5 } })).toEqual({ outcome: 'win', against: 30.5, ours: 33.5 });
    expect(matchupOf({ outcome: 'none', opponentPoints: 0 })).toEqual({});
    expect(matchupOf(undefined)).toEqual({});
    const won = withWeek([], { season: 's1', period: 'w03', points: 39, par: 3, outcome: 'win', against: 30.5, ours: 33.5 });
    expect(won.history[0]).toMatchObject({ outcome: 'win', against: 30.5, ours: 33.5 });
  });

  it('A week counted again after the commish unlocks it replaces its old entry', () => {
    const history: RankEntry[] = [{ season: 's1', period: 'w01', points: 20, max: 39, rank: 'diamond' }];
    const again = withWeek(history, { season: 's1', period: 'w01', points: 32, par: 3 });
    expect(again.history).toHaveLength(1);
    expect(again.rank).toBe('grandChamp');
  });

  it('A new season goes on from the last: rank history carries across seasons', () => {
    const history: RankEntry[] = [1, 2, 3, 4].map((n) => ({ season: 's1', period: `w0${n}`, points: 39, max: 39, rank: 'grandChamp' }));
    const next = withWeek(history, { season: 's2', period: 'w01', points: 0, par: 4 });
    // Three perfect weeks and one empty one: 75%, Champion.
    expect(next.rank).toBe('champion');
  });
});
