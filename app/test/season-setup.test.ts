import { describe, expect, it } from 'vitest';
import { defaultDraftAt, defaultSettings, settingsProblems, timeZoneChoices } from '../src/commish/season.ts';

const NY = 'America/New_York';

describe('Season setup: the defaults', () => {
  const settings = defaultSettings({ today: '2027-01-06', seasons: 0 });

  it('Start as SCOPE.md lists them: 6 weeks, a 1-week playoff of the top 4, par 3, group play in Weeks 3 and 5, Eastern time', () => {
    expect(settings).toMatchObject({
      name: 'Season 1',
      regularWeeks: 6,
      playoffs: 'oneWeek',
      playoffSize: 4,
      par: 3,
      groupWeeks: [3, 5],
      timeZone: NY,
      joinMidSeason: false,
      holidayEvents: true,
    });
  });

  it('Kickoff defaults to the first Monday at least a week away', () => {
    // 2027-01-06 is a Wednesday: the next Monday is the 11th, too soon, so the 18th.
    expect(settings.kickoff).toBe('2027-01-18');
    expect(defaultSettings({ today: '2027-01-11', seasons: 0 }).kickoff).toBe('2027-01-18');
  });

  it('The draft defaults to 7 pm league time, the Sunday before kickoff', () => {
    expect(new Date(defaultDraftAt('2027-01-18', NY)).toISOString()).toBe('2027-01-18T00:00:00.000Z');
    expect(settings.draftAt).toBe(defaultDraftAt('2027-01-18', NY));
  });

  it('A later season is named for its number', () => {
    expect(defaultSettings({ today: '2027-01-06', seasons: 2 }).name).toBe('Season 3');
  });
});

describe('Season setup: what is checked before saving', () => {
  const good = defaultSettings({ today: '2027-01-06', seasons: 0 });
  const problems = (changes: Partial<typeof good>) => settingsProblems({ ...good, ...changes }, '2027-01-06');

  it('Good settings have no problems', () => {
    expect(problems({})).toEqual([]);
  });

  it('A name is 1 to 40 characters', () => {
    expect(problems({ name: '  ' })).toContain('Give the season a name.');
    expect(problems({ name: 'x'.repeat(41) })).toContain('The name can be up to 40 characters.');
  });

  it('The regular season is 3 to 12 weeks, and par is 1 to 6 hours', () => {
    expect(problems({ regularWeeks: 2 })).toContain('The regular season is 3 to 12 weeks.');
    expect(problems({ regularWeeks: 13 })).toContain('The regular season is 3 to 12 weeks.');
    expect(problems({ par: 0 })).toContain('Screen time par is 1 to 6 hours.');
    expect(problems({ par: 7 })).toContain('Screen time par is 1 to 6 hours.');
  });

  it('Kickoff is a Monday, and in the future', () => {
    expect(problems({ kickoff: '2027-01-19' })).toContain('Kickoff has to be a Monday.');
    expect(problems({ kickoff: '2027-01-04' })).toContain('Kickoff has to be in the future.');
    expect(problems({ kickoff: 'soon' })).toContain('Pick a kickoff date.');
  });

  it('Group-play weeks are after Week 1 and inside the regular season', () => {
    expect(problems({ groupWeeks: [1] })).toContain('Group-play weeks come after Week 1 and inside the regular season.');
    expect(problems({ regularWeeks: 4, groupWeeks: [3, 5] })).toContain('Group-play weeks come after Week 1 and inside the regular season.');
    expect(problems({ regularWeeks: 4, groupWeeks: [2, 4] })).toEqual([]);
  });

  it('The draft, if set, comes before kickoff', () => {
    expect(problems({ draftAt: Date.parse('2027-01-18T12:00:00Z') })).toContain('The draft has to be before kickoff.');
    expect(problems({ draftAt: null })).toEqual([]);
  });

  it('The time zone is a real one', () => {
    expect(problems({ timeZone: 'Mars/Olympus' })).toContain('Pick a time zone.');
  });
});

describe('Time zones on offer', () => {
  it("Lists the US zones, and the phone's own zone if it is not one of them", () => {
    const zones = timeZoneChoices('Europe/London').map((zone) => zone.id);
    expect(zones.slice(0, 3)).toEqual(['America/New_York', 'America/Chicago', 'America/Denver']);
    expect(zones).toContain('Europe/London');
    expect(timeZoneChoices('America/Chicago').filter((zone) => zone.id === 'America/Chicago')).toHaveLength(1);
  });
});
