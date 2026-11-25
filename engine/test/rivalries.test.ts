import { describe, expect, it } from 'vitest';
import { nemesisOf, recordText, rivalRecords, type Rival, type RivalWeek } from '../src/rivalries.ts';

const week = (season: string, n: number, pairs: [string, string, 'win' | 'draw' | 'loss'][]): RivalWeek => {
  const results: RivalWeek['results'] = {};
  const flip = { win: 'loss', draw: 'draw', loss: 'win' } as const;
  for (const [a, b, outcome] of pairs) {
    results[a] = { opponent: b, outcome };
    if (b !== 'HOUSE') results[b] = { opponent: a, outcome: flip[outcome] };
  }
  return { season, week: n, results };
};

describe('Rivalry records', () => {
  it('A rivalry record counts every 1v1 week two players met, across seasons, from each side', () => {
    const records = rivalRecords([
      week('s1', 1, [['maya', 'jordan', 'win']]),
      week('s1', 2, [['maya', 'jordan', 'draw']]),
      week('s2', 1, [['jordan', 'maya', 'win']]),
    ]);
    expect(records.maya?.jordan).toEqual({ win: 1, draw: 1, loss: 1, lastMet: { season: 's2', week: 1 } });
    expect(records.jordan?.maya).toEqual({ win: 1, draw: 1, loss: 1, lastMet: { season: 's2', week: 1 } });
    expect(recordText(records.maya?.jordan)).toBe('1–1–1');
    expect(recordText(undefined)).toBe('0–0–0');
  });

  it("Weeks against The House don't count", () => {
    const records = rivalRecords([week('s1', 1, [['sam', 'HOUSE', 'loss']]), week('s1', 2, [['sam', 'maya', 'win']])]);
    expect(Object.keys(records.sam ?? {})).toEqual(['maya']);
    expect(records.HOUSE).toBeUndefined();
  });

  it('Season 10 comes after season 9, so the last meeting is the latest week', () => {
    const records = rivalRecords([week('s10', 1, [['maya', 'sam', 'win']]), week('s9', 12, [['maya', 'sam', 'loss']])]);
    expect(records.maya?.sam?.lastMet).toEqual({ season: 's10', week: 1 });
  });
});

describe('The nemesis tag', () => {
  const rival = (win: number, draw: number, loss: number, season = 's1', at = 1): Rival => ({ win, draw, loss, lastMet: { season, week: at } });

  it('Your nemesis is whoever has beaten you most', () => {
    expect(nemesisOf({ maya: rival(0, 0, 1), jordan: rival(2, 0, 3), sam: rival(5, 0, 2) })).toBe('jordan');
  });

  it('A tie goes to whoever you have the worse record against, then to the one you met last', () => {
    expect(nemesisOf({ maya: rival(2, 0, 2), jordan: rival(0, 1, 2) })).toBe('jordan');
    expect(nemesisOf({ maya: rival(1, 0, 2, 's1', 4), jordan: rival(1, 0, 2, 's2', 1) })).toBe('jordan');
  });

  it('Nobody is your nemesis until someone has beaten you', () => {
    expect(nemesisOf({ maya: rival(3, 1, 0) })).toBeNull();
    expect(nemesisOf(undefined)).toBeNull();
  });
});
