import { describe, expect, it } from 'vitest';
import { seedBracket, settleSemis } from '../../engine/src/playoffs.ts';
import { playoffDue, roundDoc, roundResults } from '../lib/playoff-docs.ts';

const H = 3_600_000;
const top4 = { playoffs: 'oneWeek' as const, playoffSize: 4 as const };
const ranked = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const totals = (points: Record<string, number>) => Object.fromEntries(Object.entries(points).map(([player, value]) => [player, { points: value, beers: 0 }]));

describe("The playoffs' documents", () => {
  it('The semifinal week holds both semifinals and the Whiff Bowl games as 1v1s, each player able to demolish their opponent', () => {
    const doc = roundDoc(seedBracket(ranked, top4)!, 'p01', 7);
    expect(doc).toMatchObject({ week: 7, period: 'p01', phase: 'playoff', round: 'semi', mode: 'regular' });
    expect(doc.pairs).toEqual([{ a: 'a', b: 'd' }, { a: 'b', b: 'c' }, { a: 'e', b: 'h' }, { a: 'f', b: 'g' }]);
    expect(doc.targets).toMatchObject({ a: ['d'], d: ['a'], h: ['e'] });
  });

  it('The final week holds the final, and the Whiff Bowl racers, who race with no single opponent', () => {
    const bracket = settleSemis(seedBracket(ranked, top4)!, totals({ a: 10, d: 12, b: 15, c: 9, e: 8, h: 3, f: 6, g: 7 }));
    expect(roundDoc(bracket, 'p02', 7)).toMatchObject({ round: 'final', pairs: [{ a: 'd', b: 'b' }], targets: { d: ['b'], b: ['d'] }, racers: ['h', 'f'] });
    expect(roundDoc(bracket, 'p03', 8)).toMatchObject({ round: 'suddenDeath', pairs: [{ a: 'd', b: 'b' }] });
  });

  it('Each step comes due in turn: seeding once the last regular week posts, then each round at 6 pm the day after its last day locks', () => {
    const locks = { p01: 1000 * H, p02: 2000 * H, p03: 3000 * H };
    expect(playoffDue({ bracket: null, regularDone: false, locks, now: 0 })).toBeNull();
    expect(playoffDue({ bracket: null, regularDone: true, locks, now: 0 })).toBe('seed');
    const seeded = seedBracket(ranked, top4)!;
    expect(playoffDue({ bracket: seeded, regularDone: true, locks, now: 1005 * H })).toBeNull();
    expect(playoffDue({ bracket: seeded, regularDone: true, locks, now: 1006 * H })).toBe('semis');
    const semis = settleSemis(seeded, totals({ a: 10, d: 12, b: 15, c: 9, e: 8, h: 3, f: 6, g: 7 }));
    expect(playoffDue({ bracket: semis, regularDone: true, locks, now: 2006 * H })).toBe('final');
    expect(playoffDue({ bracket: { ...semis, suddenDeath: true }, regularDone: true, locks, now: 2006 * H })).toBeNull();
    expect(playoffDue({ bracket: { ...semis, suddenDeath: true }, regularDone: true, locks, now: 3006 * H })).toBe('suddenDeath');
    expect(playoffDue({ bracket: { ...semis, champion: 'd' }, regularDone: true, locks, now: 9999 * H })).toBeNull();
  });

  it('Playoff results count for rivalry records and badges, but never as Season Points', () => {
    const bracket = settleSemis(seedBracket(ranked, top4)!, totals({ a: 10, d: 12, b: 15, c: 9 }));
    const results = roundResults(bracket.semis, totals({ a: 10, d: 12, b: 15, c: 9 }));
    expect(results.a).toEqual({ player: 'a', opponent: 'd', points: 10, beers: 0, opponentPoints: 12, opponentBeers: 0, outcome: 'loss', decidedBy: 'points', bonus: 0, seasonPoints: 0, mode: 'playoff' });
    expect(results.d).toMatchObject({ outcome: 'win', seasonPoints: 0 });
  });
});
