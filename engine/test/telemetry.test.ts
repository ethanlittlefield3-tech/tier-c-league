import { describe, expect, it } from 'vitest';
import { biggestLeak, formScore, habitDay, habitDays, habitStats, leagueCompare, paceScore, weekdayShape, type HabitDay } from '../src/index.ts';

const PAR = 3;
const all = { mind: true, body: true, wildcard: true };
const none = { mind: false, body: false, wildcard: false };
const day = (dayIndex: number, log: Parameters<typeof habitDay>[0]['log'], rest = false): HabitDay => habitDay({ date: `2027-01-${String(4 + dayIndex).padStart(2, '0')}`, dayIndex, par: PAR, log, rest });

describe('Telemetry: your days, as habits', () => {
  it("A finished day's points are scored before any power-up: what you did, not what a power-up made of it", () => {
    expect(day(0, { goals: all, screenMinutes: 30, beers: 0 })).toMatchObject({ logged: true, points: 6, perfect: true });
    expect(day(1, { goals: { mind: true, body: false, wildcard: false }, screenMinutes: 300, beers: 2 })).toMatchObject({ points: 1 - 2 - 2, perfect: false });
    expect(day(2, null)).toMatchObject({ logged: false, points: -5 });
    expect(day(6, null, true)).toMatchObject({ logged: false, rest: true, points: -3 });
  });

  it('Where the points go, against a best normal day: each missed goal, screen time short of its best, each beer, and days with nothing logged', () => {
    const stats = habitStats(
      [
        day(0, { goals: { mind: true, body: false, wildcard: true }, screenMinutes: 200, beers: 1 }),
        day(1, null),
        day(6, { goals: none, screenMinutes: 30, beers: 2 }, true),
      ],
      PAR,
    );
    // Day 1: one missed goal, 3h20 at par 3 scores 0 (3 short), a beer. Day 2: nothing logged, 6 short of +6 and down to -5: 11.
    // The rest day: screen time at its best, 2 beers.
    expect(stats.leaks).toEqual({ goals: 1, screen: 3, beers: 3, noShows: 11 });
    expect(stats).toMatchObject({ days: 3, goalDays: 2, logged: 2, noShows: 1, beers: 3, perfect: 0, screenDays: 2, screenMinutes: 230 });
    expect(stats.hits).toEqual({ mind: 1, body: 0, wildcard: 1 });
  });

  it('Names the biggest leak, as points a week, and the weakest lane when it is missed goals', () => {
    const goals = habitStats([0, 1, 2, 3, 4, 5].map((index) => day(index, { goals: { mind: true, body: index < 3, wildcard: false }, screenMinutes: 30, beers: 0 })), PAR);
    expect(biggestLeak(goals)).toEqual({ kind: 'goals', perWeek: 10.5, lane: 'wildcard' });
    const screen = habitStats([0, 1, 2, 3, 4, 5].map((index) => day(index, { goals: all, screenMinutes: 330, beers: 0 })), PAR);
    expect(biggestLeak(screen)).toMatchObject({ kind: 'screen', perWeek: 35 });
    expect(biggestLeak(habitStats([day(0, { goals: all, screenMinutes: 0, beers: 0 })], PAR))).toBeNull();
  });

  it('Shows the shape of your week: your average day on each weekday', () => {
    const shape = weekdayShape([day(0, { goals: all, screenMinutes: 30, beers: 0 }), day(0, null), day(5, { goals: none, screenMinutes: 400, beers: 3 })]);
    expect(shape[0]).toEqual({ dayIndex: 0, average: 0.5, days: 2 });
    expect(shape[5]).toEqual({ dayIndex: 5, average: -6, days: 1 });
    expect(shape[3]).toEqual({ dayIndex: 3, average: null, days: 0 });
  });
});

describe('Telemetry: your form, the one number', () => {
  it('Form is your rank measure as a score out of 100: your last 4 final weeks against the most each could score', () => {
    expect(formScore([{ points: 39, max: 39 }, { points: 19.5, max: 39 }])).toBe(75);
    expect(formScore([1, 2, 3, 4, 5].map(() => ({ points: 26, max: 39 })))).toBe(67);
    expect(formScore([])).toBeNull();
  });

  it('Form never shows below 0 or above 100', () => {
    expect(formScore([{ points: -10, max: 39 }])).toBe(0);
    expect(formScore([{ points: 60, max: 39 }])).toBe(100);
  });

  it("This week's pace: your points so far, as a week at that rate, out of 100", () => {
    expect(paceScore(12, 3, PAR)).toBe(72);
    expect(paceScore(0, 0, PAR)).toBeNull();
  });
});

describe('Telemetry: you against the league', () => {
  const stats = (points: number, beers: number, hits: number, screenMinutes: number) => ({
    ...habitStats([], PAR),
    days: 7,
    goalDays: 6,
    logged: 7,
    hits: { mind: hits, body: hits, wildcard: hits },
    screenDays: 7,
    screenMinutes,
    beers,
    weeks: 1,
    weekPoints: points,
  });

  it("Sets each of your numbers against the league's average, with your place: fewer beers and less screen time place higher", () => {
    const rows = leagueCompare({ me: stats(30, 2, 6, 700), maya: stats(20, 6, 3, 1400), sam: stats(25, 0, 4, 1050) }, 'me');
    const row = (key: string) => rows.find((each) => each.key === key)!;
    expect(row('points')).toMatchObject({ you: 30, league: 25, place: 1, of: 3 });
    expect(row('beers')).toMatchObject({ you: 2, league: 8 / 3, place: 2, of: 3 });
    expect(row('screen')).toMatchObject({ you: 100, league: 150, place: 1 });
    expect(row('goals')).toMatchObject({ you: 1, place: 1 });
  });

  it('Has nothing to compare until a week is in', () => {
    expect(leagueCompare({}, 'me')).toEqual([]);
  });
});

describe('Telemetry: finished days, from the logs', () => {
  it("A week's rest day is Sunday, unless the player moved it", () => {
    const days = [0, 1, 6].map((dayIndex) => ({ date: `2027-01-${String(4 + dayIndex).padStart(2, '0')}`, dayIndex, period: 'w01' }));
    const sunday = habitDays({ par: PAR, days, logs: {}, restByPeriod: {} });
    expect(sunday.map((one) => one.rest)).toEqual([false, false, true]);
    const moved = habitDays({ par: PAR, days, logs: {}, restByPeriod: { w01: '2027-01-05' } });
    expect(moved.map((one) => one.rest)).toEqual([false, true, false]);
  });
});
