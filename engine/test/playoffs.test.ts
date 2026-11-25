import { describe, expect, it } from 'vitest';
import { decideFinal, decideRound, decideSuddenDeath, playoffCalendar, playoffRounds, seedBracket, semifinalPairs, settleFinal, settleSemis, settleSuddenDeath, whiffLoser, whiffRoundOne } from '../src/index.ts';
import { utc } from './helpers.ts';

const SEASON = { kickoff: '2027-01-04', regularWeeks: 6, timeZone: 'America/New_York' };
const days = (settings: { playoffs: 'none' | 'oneWeek' | 'twoWeeks'; playoffSize: 2 | 4 }) =>
  playoffCalendar({ ...SEASON, ...settings }).map((day) => [day.date, day.period, day.kind, day.kit.length > 0 ? 'kit' : 'none']);

describe('The playoff calendar', () => {
  it('One week, top 4: semifinals Monday to Wednesday, a reset Thursday, the final Friday to Sunday, and sudden death the Monday after', () => {
    expect(days({ playoffs: 'oneWeek', playoffSize: 4 })).toEqual([
      ['2027-02-15', 'p1', 'play', 'kit'],
      ['2027-02-16', 'p1', 'play', 'kit'],
      ['2027-02-17', 'p1', 'play', 'kit'],
      ['2027-02-18', 'p2', 'reset', 'none'],
      ['2027-02-19', 'p2', 'play', 'kit'],
      ['2027-02-20', 'p2', 'play', 'kit'],
      ['2027-02-21', 'p2', 'play', 'kit'],
      ['2027-02-22', 'p3', 'play', 'none'],
    ]);
  });

  it('Two weeks, top 4: semifinals Monday to Saturday, a reset Sunday, the final Monday to Saturday, and sudden death that Sunday', () => {
    const two = days({ playoffs: 'twoWeeks', playoffSize: 4 });
    expect(two.filter((day) => day[1] === 'p1').map((day) => day[0])).toEqual(['2027-02-15', '2027-02-16', '2027-02-17', '2027-02-18', '2027-02-19', '2027-02-20']);
    expect(two.find((day) => day[2] === 'reset')?.[0]).toBe('2027-02-21');
    expect(two.filter((day) => day[1] === 'p2' && day[2] === 'play').map((day) => day[0])).toEqual(['2027-02-22', '2027-02-23', '2027-02-24', '2027-02-25', '2027-02-26', '2027-02-27']);
    expect(two.at(-1)).toEqual(['2027-02-28', 'p3', 'play', 'none']);
  });

  it('Top 2: the final only, Monday to Saturday, with sudden death on Sunday; no playoffs means no playoff days', () => {
    expect(days({ playoffs: 'oneWeek', playoffSize: 2 }).map((day) => day[1])).toEqual(['p2', 'p2', 'p2', 'p2', 'p2', 'p2', 'p3']);
    expect(days({ playoffs: 'twoWeeks', playoffSize: 2 })).toHaveLength(7);
    expect(days({ playoffs: 'none', playoffSize: 4 })).toEqual([]);
  });

  it("Every playoff day still locks at noon the next day, and each round's kit opens with the round, or on the reset day before it", () => {
    const calendar = playoffCalendar({ ...SEASON, playoffs: 'oneWeek', playoffSize: 4 });
    const friday = calendar.find((day) => day.date === '2027-02-19')!;
    expect(friday).toMatchObject({ phase: 'playoff', week: 7, dayIndex: 4 });
    expect(friday.lock).toBe(utc('2027-02-20T17:00:00Z'));
    // The final's kit opens on the reset day, so Aerial and Demolition can be set for Friday.
    expect(friday.periodStart).toBe(utc('2027-02-18T05:00:00Z'));
    expect(calendar[0]!.periodStart).toBe(utc('2027-02-15T05:00:00Z'));
  });

  it('A season knows its rounds: semifinal and final with four, the final alone with two', () => {
    expect(playoffRounds({ playoffs: 'oneWeek', playoffSize: 4 })).toEqual(['p1', 'p2']);
    expect(playoffRounds({ playoffs: 'twoWeeks', playoffSize: 2 })).toEqual(['p2']);
    expect(playoffRounds({ playoffs: 'none', playoffSize: 4 })).toEqual([]);
  });
});

describe('The bracket', () => {
  it('Seeds come from Season Points: 1 plays 4 and 2 plays 3; a missing seed is a bye', () => {
    expect(semifinalPairs(['a', 'b', 'c', 'd'])).toEqual([{ a: 'a', b: 'd' }, { a: 'b', b: 'c' }]);
    expect(semifinalPairs(['a', 'b', 'c'])).toEqual([{ a: 'a', b: null }, { a: 'b', b: 'c' }]);
  });

  it('A semifinal goes to more points, then fewer beers in the round, then the higher seed', () => {
    expect(decideRound({ points: 20, beers: 9, seed: 4 }, { points: 18, beers: 0, seed: 1 })).toBe('a');
    expect(decideRound({ points: 18, beers: 2, seed: 4 }, { points: 18, beers: 3, seed: 1 })).toBe('a');
    expect(decideRound({ points: 18, beers: 2, seed: 4 }, { points: 18, beers: 2, seed: 1 })).toBe('b');
  });

  it('The final goes to more points; level points go to sudden death', () => {
    expect(decideFinal({ points: 20 }, { points: 18 })).toBe('a');
    expect(decideFinal({ points: 18, }, { points: 18 })).toBeNull();
  });

  it('Sudden death: the first to miss any goal loses; if both hit everything or both miss, the day decides, then fewer beers in the round, then the higher seed', () => {
    expect(decideSuddenDeath({ missed: true, points: 9, beers: 0, seed: 1 }, { missed: false, points: 2, beers: 5, seed: 2 })).toBe('b');
    expect(decideSuddenDeath({ missed: false, points: 6, beers: 0, seed: 2 }, { missed: false, points: 5, beers: 0, seed: 1 })).toBe('a');
    expect(decideSuddenDeath({ missed: true, points: 3, beers: 4, seed: 1 }, { missed: true, points: 3, beers: 2, seed: 2 })).toBe('b');
    expect(decideSuddenDeath({ missed: true, points: 3, beers: 2, seed: 2 }, { missed: true, points: 3, beers: 2, seed: 1 })).toBe('b');
  });
});

describe('The Whiff Bowl', () => {
  it('Everyone outside the playoffs is paired best against worst; an odd one out, the best seed, is safe', () => {
    expect(whiffRoundOne(['e', 'f', 'g', 'h', 'i'])).toEqual({ pairs: [{ a: 'f', b: 'i' }, { a: 'g', b: 'h' }], safe: ['e'] });
    expect(whiffRoundOne(['e', 'f'])).toEqual({ pairs: [{ a: 'e', b: 'f' }], safe: [] });
  });

  it('The last round is a race for "not last": the fewest points loses, then the most beers, then the lower seed', () => {
    expect(whiffLoser([{ player: 'e', points: 12, beers: 0, seed: 5 }, { player: 'f', points: 9, beers: 0, seed: 6 }, { player: 'g', points: 15, beers: 3, seed: 7 }])).toBe('f');
    expect(whiffLoser([{ player: 'e', points: 9, beers: 1, seed: 5 }, { player: 'f', points: 9, beers: 3, seed: 6 }])).toBe('f');
    expect(whiffLoser([{ player: 'e', points: 9, beers: 1, seed: 5 }, { player: 'f', points: 9, beers: 1, seed: 6 }])).toBe('f');
  });
});

describe('The bracket, round by round', () => {
  const top4 = { playoffs: 'oneWeek' as const, playoffSize: 4 as const };
  const totals = (points: Record<string, number>, beers: Record<string, number> = {}) => Object.fromEntries(Object.entries(points).map(([player, value]) => [player, { points: value, beers: beers[player] ?? 0 }]));

  it('Seeding: the top 4 by Season Points play; everyone else is in the Whiff Bowl, and with fewer than 2 outside there is none', () => {
    const bracket = seedBracket(['a', 'b', 'c', 'd', 'e', 'f', 'g'], top4)!;
    expect(bracket.semis).toEqual([{ a: 'a', b: 'd' }, { a: 'b', b: 'c' }]);
    expect(bracket.whiff).toMatchObject({ pairs: [{ a: 'f', b: 'g' }], safe: ['e'] });
    expect(seedBracket(['a', 'b', 'c', 'd', 'e'], top4)!.whiff).toBeNull();
    expect(seedBracket(['a', 'b', 'c'], { playoffs: 'none', playoffSize: 4 })).toBeNull();
  });

  it('Semifinal winners meet in the final, the 1-4 winner first; the Whiff Bowl losers race on the final days', () => {
    const bracket = settleSemis(seedBracket(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], top4)!, totals({ a: 10, d: 12, b: 15, c: 9, e: 8, h: 3, f: 6, g: 7 }));
    expect(bracket.final).toEqual({ a: 'd', b: 'b' });
    expect(bracket.semis.map((game) => [game.winner, game.decidedBy])).toEqual([['d', 'points'], ['b', 'points']]);
    expect(bracket.whiff).toMatchObject({ racers: ['h', 'f'], loser: null });
  });

  it('A Whiff Bowl with one loser after its first round is settled then', () => {
    const bracket = settleSemis(seedBracket(['a', 'b', 'c', 'd', 'e', 'f'], top4)!, totals({ a: 1, b: 1, c: 1, d: 1, e: 9, f: 4 }));
    expect(bracket.whiff?.loser).toBe('f');
  });

  it('The final crowns a champion on points, and the Whiff Bowl racer with the fewest points is last; level points go to sudden death', () => {
    const semis = settleSemis(seedBracket(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], top4)!, totals({ a: 10, d: 12, b: 15, c: 9, e: 8, h: 3, f: 6, g: 7 }));
    const done = settleFinal(semis, totals({ d: 20, b: 18, h: 5, f: 4 }));
    expect(done).toMatchObject({ champion: 'd', finalist: 'b', suddenDeath: false, whiff: { loser: 'f' } });
    const level = settleFinal(semis, totals({ d: 18, b: 18, h: 5, f: 4 }));
    expect(level).toMatchObject({ champion: null, suddenDeath: true });
    const decided = settleSuddenDeath(level, { d: { points: 6, beers: 0, missed: false }, b: { points: 4, beers: 0, missed: true } }, totals({ d: 18, b: 18 }));
    expect(decided).toMatchObject({ champion: 'd', finalist: 'b', final: { winner: 'd', decidedBy: 'suddenDeath' } });
  });

  it('Top 2 is the final from the start, and everyone outside races for "not last" on its days', () => {
    const bracket = seedBracket(['a', 'b', 'c', 'd', 'e'], { playoffs: 'twoWeeks', playoffSize: 2 })!;
    expect(bracket).toMatchObject({ semis: [], final: { a: 'a', b: 'b' }, whiff: { racers: ['c', 'd', 'e'] } });
    expect(settleFinal(bracket, totals({ a: 9, b: 12, c: 5, d: 5, e: 7 }, { c: 2, d: 1 }))).toMatchObject({ champion: 'b', whiff: { loser: 'c' } });
  });
});
