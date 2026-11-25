import { describe, expect, it } from 'vitest';
import { weekStart } from '../../engine/src/calendar.ts';
import { calendarDocs } from '../lib/calendar-docs.ts';
import { seasonSync } from '../lib/season-sync.ts';

const NY = 'America/New_York';
const SETTINGS = { status: 'setup', kickoff: '2027-01-04', regularWeeks: 6, timeZone: NY };

/** The calendar as the database would hand it back: times as milliseconds. */
const stored = (settings: { kickoff: string; regularWeeks: number; timeZone: string }) =>
  calendarDocs(settings).map((doc) => ({
    id: doc.id,
    data: Object.fromEntries(Object.entries(doc.data).map(([key, value]) => [key, value instanceof Date ? value.getTime() : value])),
  }));

describe('Keeping a season\'s calendar in step with its settings', () => {
  it('A new season gets every day of its regular season, and when each Rule One arrives', () => {
    const sync = seasonSync({ settings: SETTINGS, existing: [], ruleOneIssue: null });
    expect(sync.skip).toBeNull();
    expect(sync.write).toHaveLength(42);
    expect(sync.remove).toEqual([]);
    // A 6-week season gets 2: at the start of Weeks 1 and 5.
    expect(sync.ruleOneIssue?.map((at) => at.getTime())).toEqual([weekStart('2027-01-04', 1, NY), weekStart('2027-01-04', 5, NY)]);
  });

  it('Running it again with nothing changed writes nothing: it is safe to run any number of times', () => {
    const issue = [weekStart('2027-01-04', 1, NY), weekStart('2027-01-04', 5, NY)];
    const sync = seasonSync({ settings: SETTINGS, existing: stored(SETTINGS), ruleOneIssue: issue });
    expect(sync.write).toEqual([]);
    expect(sync.remove).toEqual([]);
    expect(sync.ruleOneIssue).toBeNull();
  });

  it('When kickoff moves, the days no longer in the season are removed and the new ones written', () => {
    const moved = { ...SETTINGS, kickoff: '2027-01-11' };
    const sync = seasonSync({ settings: moved, existing: stored(SETTINGS), ruleOneIssue: null });
    expect(sync.remove).toEqual(['2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08', '2027-01-09', '2027-01-10']);
    // Every remaining day changes week number, so all 42 are written.
    expect(sync.write).toHaveLength(42);
  });

  it('A longer season adds its new weeks and leaves the others as they were', () => {
    const longer = { ...SETTINGS, regularWeeks: 7 };
    const sync = seasonSync({ settings: longer, existing: stored(SETTINGS), ruleOneIssue: null });
    expect(sync.write.map((doc) => doc.id)).toEqual(['2027-02-15', '2027-02-16', '2027-02-17', '2027-02-18', '2027-02-19', '2027-02-20', '2027-02-21']);
  });

  it("Each group-play week's days carry its mode and its power-ups: none in Rumble or the Alley, no Demolition in Bounty Week", () => {
    const sync = seasonSync({ settings: { ...SETTINGS, modes: { 2: 'rumble', 3: 'bounty', 4: 'alley', 5: 'teamWeek' } }, existing: [], ruleOneIssue: null });
    const week = (n: number) => sync.write.filter((doc) => doc.data.week === n).map((doc) => [doc.data.mode, doc.data.kit]);
    for (const day of week(1)) expect(day).toEqual(['regular', ['aerial', 'demolition', 'fullBoost']]);
    expect(week(2)).toContainEqual(['rumble', []]);
    expect(week(3)).toContainEqual(['bounty', ['aerial', 'fullBoost']]);
    expect(week(4)).toContainEqual(['alley', []]);
    expect(week(5)).toContainEqual(['teamWeek', ['aerial', 'demolition', 'fullBoost']]);
  });

  it('A season with playoffs gets its playoff days too: the rounds, the reset day and sudden death', () => {
    const sync = seasonSync({ settings: { ...SETTINGS, playoffs: 'oneWeek', playoffSize: 4 }, existing: [], ruleOneIssue: null });
    expect(sync.write).toHaveLength(42 + 8);
    expect(sync.write.at(-1)).toMatchObject({ id: '2027-02-22', data: { period: 'p3', phase: 'playoff', kind: 'play' } });
    expect(seasonSync({ settings: { ...SETTINGS, playoffs: 'none', playoffSize: 4 }, existing: [], ruleOneIssue: null }).write).toHaveLength(42);
  });

  it('A finished season, or one with broken settings, is left alone', () => {
    expect(seasonSync({ settings: { ...SETTINGS, status: 'done' }, existing: [], ruleOneIssue: null }).skip).toBe('finished');
    expect(seasonSync({ settings: { ...SETTINGS, kickoff: '2027-01-05' }, existing: [], ruleOneIssue: null }).skip).toBe('bad settings');
    expect(seasonSync({ settings: { ...SETTINGS, timeZone: 'Mars/Olympus' }, existing: [], ruleOneIssue: null }).skip).toBe('bad settings');
    expect(seasonSync({ settings: { ...SETTINGS, regularWeeks: 20 }, existing: [], ruleOneIssue: null }).skip).toBe('bad settings');
  });
});
