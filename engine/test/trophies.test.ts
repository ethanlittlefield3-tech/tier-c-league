import { describe, expect, it } from 'vitest';
import { TROPHIES, seasonTrophies, type TrophyPlayer } from '../src/trophies.ts';

const day = (screenMinutes: number | null, beers = 0, mark: 'in' | 'out' | 'skip' = 'in') => ({ mark, screenMinutes, beers });
const player = (days: TrophyPlayer['days'], weeks: TrophyPlayer['weeks'] = []): TrophyPlayer => ({ days, weeks });
const none = { players: [], right: 0 };

describe('The season trophy case', () => {
  it("SCOPE.md's ten trophies, the three playoff ones coming with the playoffs", () => {
    expect(TROPHIES.map((trophy) => trophy.name)).toEqual(['Champion', 'Finalist', 'Regular-Season Leader', 'Screen Time King', 'Iron Streak', 'Demolition Derby', 'Brewmaster', 'Prophet', 'MVP of the Season', 'Whiff Bowl']);
    expect(TROPHIES.filter((trophy) => trophy.later).map((trophy) => trophy.id)).toEqual(['champion', 'finalist', 'whiffBowl']);
  });

  it('Regular-Season Leader is the top of the final standings, and Prophet the best predictions record', () => {
    const trophies = seasonTrophies({ leader: { player: 'maya', points: 210 }, players: {}, prophets: { players: ['sam'], right: 31 } });
    expect(trophies.leader).toEqual({ winners: ['maya'], value: 210 });
    expect(trophies.prophet).toEqual({ winners: ['sam'], value: 31 });
  });

  it('Screen Time King is the lowest average over the days logged, among players who logged at least half the days', () => {
    const trophies = seasonTrophies({
      leader: null,
      prophets: none,
      players: {
        maya: player([day(60), day(30), day(null), day(null)]),
        sam: player([day(10), day(null), day(null), day(null)]),
        alex: player([day(50), day(40), day(45), day(null)]),
      },
    });
    // Sam logged a quarter of the days; Maya averages 45, Alex 45 too: they share it.
    expect(trophies.screenTimeKing).toEqual({ winners: ['alex', 'maya'], value: 45 });
  });

  it('Iron Streak, Demolition Derby, Brewmaster and MVP of the Season go to the most of each, at least one, ties shared', () => {
    const trophies = seasonTrophies({
      leader: null,
      prophets: none,
      players: {
        maya: player([day(30, 2), day(30, 0), day(30, 0, 'out'), day(30, 1)], [{ mvp: true, demolitionsLanded: 2 }, { mvp: true, demolitionsLanded: 0 }]),
        sam: player([day(30, 3), day(30, 0), day(30, 0, 'skip'), day(30, 0)], [{ mvp: false, demolitionsLanded: 2 }, { mvp: true, demolitionsLanded: 0 }]),
      },
    });
    expect(trophies.ironStreak).toEqual({ winners: ['sam'], value: 3 });
    expect(trophies.demolitionDerby).toEqual({ winners: ['maya', 'sam'], value: 2 });
    expect(trophies.brewmaster).toEqual({ winners: ['maya', 'sam'], value: 3 });
    expect(trophies.mvp).toEqual({ winners: ['maya'], value: 2 });
  });

  it('A trophy nobody qualifies for stays empty: no beers means no Brewmaster', () => {
    const trophies = seasonTrophies({ leader: null, prophets: none, players: { maya: player([day(30)], [{ mvp: false, demolitionsLanded: 0 }]) } });
    expect(trophies.brewmaster).toBeUndefined();
    expect(trophies.demolitionDerby).toBeUndefined();
    expect(trophies.mvp).toBeUndefined();
    expect(trophies.prophet).toBeUndefined();
  });
});
