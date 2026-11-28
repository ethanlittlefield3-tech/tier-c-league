import { describe, expect, it } from 'vitest';
import { practiceDocs, practiceStep, type PracticeRequest } from '../lib/practice.ts';

const MIN = 60_000;
const NOW = Date.UTC(2026, 11, 1, 23, 0);
const STARTS = NOW + 15 * MIN;

const plan = (overrides: Partial<Parameters<typeof practiceDocs>[0]> = {}) =>
  practiceDocs({ leagueId: 'L1', order: ['alex', 'maya', 'sam'], real: { par: 3, timeZone: 'America/New_York' }, goals: { alex: { mind: 'Study 1 hour', body: 'Gym', wildcard: 'Cook dinner' } }, startsAt: STARTS, dayMinutes: 4, now: NOW, ...overrides });

describe('The practice week, as the job sets it up', () => {
  it("Is a season of its own, 'practice', marked as practice, one week long with no playoffs, on a fast clock of the commish's day length", () => {
    const season = plan().docs.find((doc) => doc.path === 'leagues/L1/seasons/practice')!;
    expect(season.data).toMatchObject({ status: 'active', practice: true, regularWeeks: 1, playoffs: 'none', par: 3, holidayEvents: false, fast: { dayMinutes: 4 } });
    expect((season.data.fast as { startsAt: Date }).startsAt.getTime()).toBe(STARTS);
  });

  it('Has seven calendar days, each as long as the commish set, the first starting when practice does', () => {
    const days = plan()
      .docs.filter((doc) => doc.path.startsWith('leagues/L1/seasons/practice/calendar/'))
      .map((doc) => doc.data as { start: Date; end: Date; lock: Date; dayIndex: number });
    expect(days).toHaveLength(7);
    expect(days[0]!.start.getTime()).toBe(STARTS);
    expect(days[0]!.end.getTime() - days[0]!.start.getTime()).toBe(4 * MIN);
    expect(days[6]!.dayIndex).toBe(6);
  });

  it('Keeps the goals the draft has set, and gives everyone else stand-in goals they can do in a few minutes', () => {
    const roster = (player: string) => plan().docs.find((doc) => doc.path === `leagues/L1/seasons/practice/roster/${player}`)!.data as { goals: Record<string, { text: string }> };
    expect(roster('alex').goals.body!.text).toBe('Gym');
    expect(roster('maya').goals.body!.text).toBe('10 push-ups or squats');
  });

  it('Pairs everyone off for one 1v1 week, the odd one out against The House', () => {
    const week = plan().docs.find((doc) => doc.path === 'leagues/L1/seasons/practice/weeks/w01')!;
    expect(week.data).toMatchObject({ week: 1, mode: 'regular', pairs: [{ a: 'alex', b: 'maya' }, { a: 'sam', b: 'HOUSE' }], targets: { alex: ['maya'], maya: ['alex'], sam: ['HOUSE'] } });
  });

  it('In a group-play mode, the week and its days follow the mode: Team Week has its squads, and Bounty Week has no Demolition', () => {
    const team = plan({ mode: 'teamWeek' });
    expect(team.docs.find((doc) => doc.path.endsWith('/weeks/w01'))!.data).toMatchObject({ mode: 'teamWeek', teams: { blue: ['alex', 'sam'], orange: ['maya'] } });
    expect(team.mark.mode).toBe('teamWeek');
    const bounty = plan({ mode: 'bounty' });
    const day = bounty.docs.find((doc) => doc.path.includes('/calendar/'))!.data as { mode: string; kit: string[] };
    expect(day).toMatchObject({ mode: 'bounty', kit: ['aerial', 'fullBoost'] });
    expect(bounty.docs.find((doc) => doc.path === 'leagues/L1/seasons/practice')!.data).toMatchObject({ groupWeeks: [1] });
  });

  it('Writes nothing outside its own season: no profile, feed, trophy or league document', () => {
    for (const doc of plan().docs) expect(doc.path.startsWith('leagues/L1/seasons/practice')).toBe(true);
  });

  it('Marks the league with its season, its start, and when its results go final: 8 days of the commish\'s length', () => {
    const { mark } = plan();
    expect(mark).toMatchObject({ season: 'practice', status: 'live', dayMinutes: 4, mode: 'regular', clearAt: null });
    expect(mark.finalAt.getTime()).toBe(STARTS + 32 * MIN);
  });
});

describe('When the alerts job starts or clears a practice week', () => {
  const asked = (overrides: Partial<PracticeRequest> = {}): PracticeRequest => ({ status: 'requested', startsAt: STARTS, dayMinutes: 4, ...overrides });

  it('Starts the practice job within 20 minutes of the start, once', () => {
    expect(practiceStep({ request: asked({ startsAt: NOW + 30 * MIN }), mark: null, now: NOW })).toBeNull();
    expect(practiceStep({ request: asked(), mark: null, now: NOW })).toBe('start');
    expect(practiceStep({ request: asked({ dispatchedAt: NOW - 5 * MIN }), mark: null, now: NOW })).toBeNull();
    expect(practiceStep({ request: asked({ dispatchedAt: NOW - 16 * MIN }), mark: null, now: NOW })).toBe('start');
  });

  it('Leaves a running practice job alone, and starts it again if it stops answering mid-week', () => {
    const live = asked({ status: 'live', dispatchedAt: NOW - 20 * MIN });
    expect(practiceStep({ request: { ...live, driverAt: NOW - MIN }, mark: { status: 'live', finalAt: STARTS + 32 * MIN }, now: NOW })).toBeNull();
    expect(practiceStep({ request: { ...live, driverAt: NOW - 5 * MIN }, mark: { status: 'live', finalAt: STARTS + 32 * MIN }, now: NOW })).toBe('start');
  });

  it('Clears a finished week once its results have been up a while, or as soon as the commish clears it', () => {
    const done = { status: 'done' as const, finalAt: NOW - 10 * MIN, clearAt: NOW + 20 * MIN };
    expect(practiceStep({ request: asked({ status: 'done' }), mark: done, now: NOW })).toBeNull();
    expect(practiceStep({ request: asked({ status: 'clearing' }), mark: done, now: NOW })).toBe('clear');
    expect(practiceStep({ request: asked({ status: 'done' }), mark: done, now: NOW + 21 * MIN })).toBe('clear');
  });

  it('Clears a week the commish ended, when no practice job is running to do it', () => {
    expect(practiceStep({ request: asked({ status: 'ending', driverAt: NOW - 30_000 }), mark: { status: 'live', finalAt: STARTS }, now: NOW })).toBeNull();
    expect(practiceStep({ request: asked({ status: 'ending', driverAt: NOW - 10 * MIN }), mark: { status: 'live', finalAt: STARTS }, now: NOW })).toBe('clear');
  });

  it("Gives up on a week that never got going, two hours after it should have finished; leaves one that couldn't run for the commish to see", () => {
    expect(practiceStep({ request: asked({ startsAt: NOW - 3 * 60 * MIN }), mark: null, now: NOW })).toBe('clear');
    expect(practiceStep({ request: asked({ status: 'failed' }), mark: null, now: NOW })).toBeNull();
  });

  it('Clears a practice mark left with no request', () => {
    expect(practiceStep({ request: null, mark: { status: 'live', finalAt: NOW }, now: NOW })).toBe('clear');
    expect(practiceStep({ request: null, mark: null, now: NOW })).toBeNull();
  });
});
