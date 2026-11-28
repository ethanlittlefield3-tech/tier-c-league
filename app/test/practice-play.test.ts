import { describe, expect, it } from 'vitest';
import { playSeasonOf, practiceOf } from '../src/practice/play.ts';

const mark = { season: 'practice', status: 'live' as const, startsAt: 1000, dayMinutes: 4, finalAt: 2000, clearAt: null };

describe('Which season a phone plays', () => {
  it("The league's season, with no practice week on", () => {
    expect(playSeasonOf({ season: 's1' })).toBe('s1');
    expect(playSeasonOf({ season: null })).toBeNull();
    expect(playSeasonOf(null)).toBeNull();
  });

  it('The practice week while one is on, and while its results are up', () => {
    expect(playSeasonOf({ season: 's1', practice: mark })).toBe('practice');
    expect(playSeasonOf({ season: 's1', practice: { ...mark, status: 'done', clearAt: 3000 } })).toBe('practice');
    expect(playSeasonOf({ season: null, practice: mark })).toBe('practice');
  });

  it("Never a season that isn't the practice week's, or a mark that isn't whole", () => {
    expect(playSeasonOf({ season: 's1', practice: { ...mark, season: 's2' } })).toBe('s1');
    expect(practiceOf({ season: 's1', practice: { season: 'practice', status: 'live' } })).toBeNull();
  });
});
