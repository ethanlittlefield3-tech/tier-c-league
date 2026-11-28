import { describe, expect, it } from 'vitest';
import { HOUSE, PRACTICE_GOALS, practiceLength, practicePairs, practiceWindow } from '../src/index.ts';

const MIN = 60_000;
const NOW = Date.UTC(2026, 11, 1, 18, 0);

describe('The practice week', () => {
  it('Runs seven days, then its results go final at the end of an eighth: 32 minutes with 4-minute days', () => {
    expect(practiceLength(4)).toBe(32 * MIN);
    expect(practiceLength(30)).toBe(240 * MIN);
  });

  it('Can run before any season exists, or while the season is in setup', () => {
    const plan = { startsAt: NOW + 15 * MIN, dayMinutes: 4, now: NOW, kickoffStart: null };
    expect(practiceWindow({ ...plan, season: null })).toEqual({ ok: true });
    expect(practiceWindow({ ...plan, season: { status: 'setup', draftAt: null } })).toEqual({ ok: true });
  });

  it('Can run after the draft, as long as it ends before the first day of the season starts', () => {
    const season = { status: 'active', draftAt: NOW - 60 * MIN };
    expect(practiceWindow({ season, kickoffStart: NOW + 60 * MIN, startsAt: NOW + 15 * MIN, dayMinutes: 4, now: NOW })).toEqual({ ok: true });
    expect(practiceWindow({ season, kickoffStart: NOW + 40 * MIN, startsAt: NOW + 15 * MIN, dayMinutes: 4, now: NOW })).toMatchObject({ ok: false, reason: expect.stringContaining('kickoff') });
    expect(practiceWindow({ season, kickoffStart: NOW - MIN, startsAt: NOW + 15 * MIN, dayMinutes: 4, now: NOW })).toMatchObject({ ok: false, reason: expect.stringContaining('only before kickoff') });
  });

  it("Can't run during the draft, or run into a draft that is coming up", () => {
    expect(practiceWindow({ season: { status: 'draft', draftAt: NOW - MIN }, kickoffStart: null, startsAt: NOW + 15 * MIN, dayMinutes: 4, now: NOW })).toMatchObject({ ok: false, reason: expect.stringContaining('draft is on') });
    expect(practiceWindow({ season: { status: 'setup', draftAt: NOW + 30 * MIN }, kickoffStart: null, startsAt: NOW + 15 * MIN, dayMinutes: 4, now: NOW })).toMatchObject({ ok: false, reason: expect.stringContaining('run into the draft') });
    expect(practiceWindow({ season: { status: 'setup', draftAt: NOW + 60 * MIN }, kickoffStart: null, startsAt: NOW + 15 * MIN, dayMinutes: 4, now: NOW })).toEqual({ ok: true });
  });

  it("Isn't for a season in its offseason", () => {
    expect(practiceWindow({ season: { status: 'finished', draftAt: null }, kickoffStart: null, startsAt: NOW + 15 * MIN, dayMinutes: 4, now: NOW })).toMatchObject({ ok: false });
  });

  it('Each practice day lasts 2 to 30 minutes, and it starts some time ahead', () => {
    const plan = { season: null, kickoffStart: null, now: NOW };
    expect(practiceWindow({ ...plan, startsAt: NOW + 15 * MIN, dayMinutes: 1 })).toMatchObject({ ok: false });
    expect(practiceWindow({ ...plan, startsAt: NOW + 15 * MIN, dayMinutes: 31 })).toMatchObject({ ok: false });
    expect(practiceWindow({ ...plan, startsAt: NOW + 15 * MIN, dayMinutes: 2.5 })).toMatchObject({ ok: false });
    expect(practiceWindow({ ...plan, startsAt: NOW - MIN, dayMinutes: 4 })).toMatchObject({ ok: false });
  });

  it('Pairs everyone off in the order given, and the odd one out faces The House', () => {
    expect(practicePairs(['a', 'b', 'c', 'd'])).toEqual([
      { a: 'a', b: 'b' },
      { a: 'c', b: 'd' },
    ]);
    expect(practicePairs(['a', 'b', 'c'])).toEqual([
      { a: 'a', b: 'b' },
      { a: 'c', b: HOUSE },
    ]);
    expect(practicePairs(['a'])).toEqual([{ a: 'a', b: HOUSE }]);
  });

  it('Has stand-in goals for anyone the draft has not set goals for: each one doable in a few minutes', () => {
    expect(Object.keys(PRACTICE_GOALS).sort()).toEqual(['body', 'mind', 'wildcard']);
    for (const text of Object.values(PRACTICE_GOALS)) expect(text.length).toBeLessThanOrEqual(40);
  });
});
