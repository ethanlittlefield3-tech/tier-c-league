import { describe, expect, it } from 'vitest';
import { telemetryModel, type TelemetryInput } from '../src/telemetry/model.ts';

const KICKOFF = '2027-01-04';
const date = (offset: number) => {
  const day = new Date(`${KICKOFF}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
};
const all = { mind: true, body: true, wildcard: true };

const input = (overrides: Partial<TelemetryInput> = {}): TelemetryInput => ({
  me: 'me',
  season: { par: 3, kickoff: KICKOFF, regularWeeks: 6 },
  today: date(10),
  logs: {},
  kit: [],
  history: [],
  weeks: [],
  players: [],
  ...overrides,
});

describe('Telemetry, as your phone works it out', () => {
  it("Looks at the season's finished days only: nothing before kickoff, nothing from today on", () => {
    expect(telemetryModel(input({ today: KICKOFF })).started).toBe(false);
    expect(telemetryModel(input()).stats.days).toBe(10);
  });

  it('Form comes from your rank history; how it moved is against the form before your latest week', () => {
    const model = telemetryModel(input({ history: [{ points: 19.5, max: 39 }, { points: 39, max: 39 }] }));
    expect(model).toMatchObject({ form: 75, formBefore: 50, rank: 'champion' });
  });

  it('Your rank is the one the league shows: a week below 0 is Bronze, even though the gauge stops at 0', () => {
    expect(telemetryModel(input({ history: [{ points: -10, max: 39 }] }))).toMatchObject({ form: 0, rank: 'bronze' });
  });

  it("This week's pace is from this week's finished days", () => {
    // Today is Thursday of Week 2: Monday to Wednesday are finished, each +3 (three goals, screen time at par).
    const logs = Object.fromEntries([7, 8, 9].map((offset) => [date(offset), { goals: all, screenMinutes: 200, beers: 0 }]));
    expect(telemetryModel(input({ logs })).pace).toBe(Math.round((3 * 7 * 100) / 39));
  });

  it('Goal hit rates by lane are out of the goal days you logged, with the window before for the trend', () => {
    const logs = Object.fromEntries([0, 1, 2, 3].map((offset) => [date(offset), { goals: { mind: true, body: offset < 2, wildcard: false }, screenMinutes: 30, beers: 0 }]));
    const lanes = telemetryModel(input({ logs, today: date(4) })).lanes;
    expect(lanes).toEqual([
      { lane: 'mind', rate: 1, before: null },
      { lane: 'body', rate: 0.5, before: null },
      { lane: 'wildcard', rate: 0, before: null },
    ]);
  });

  it('Your logging streak: a rest day with nothing logged neither adds to it nor breaks it', () => {
    const logs = Object.fromEntries([3, 4, 5, 7, 8].map((offset) => [date(offset), { goals: all, screenMinutes: 30, beers: 0 }]));
    // Sunday (day 6) is a blank rest day; days 0 to 2 were blank goal days.
    expect(telemetryModel(input({ logs, today: date(9) })).streak).toEqual({ current: 5, best: 5 });
  });

  it("Your form against the league's: the average, and your place in it", () => {
    const model = telemetryModel(
      input({
        players: [
          { id: 'me', history: [{ points: 26, max: 39 }] },
          { id: 'maya', history: [{ points: 39, max: 39 }] },
          { id: 'sam', history: [] },
        ],
      }),
    );
    expect(model.league).toMatchObject({ form: 84, formPlace: 2, formOf: 2 });
  });

  it("Sums everyone's settled regular weeks for the league rows, leaving playoff rounds out", () => {
    const week = (points: number, beers: number) => ({ days: 7, goalDays: 6, logged: 7, noShows: 0, hits: { mind: 6, body: 6, wildcard: 6 }, screenDays: 7, screenMinutes: 700, beers, perfect: 0, points, leaks: { goals: 0, screen: 0, beers, noShows: 0 } });
    const model = telemetryModel(
      input({
        weeks: [
          { id: 'w01', stats: { me: week(30, 2), maya: week(20, 4) }, lines: [{ player: 'me', points: 31 }, { player: 'maya', points: 20 }] },
          { id: 'p01', stats: { me: week(99, 0), maya: week(0, 0) } },
        ],
      }),
    );
    expect(model.league.rows.find((row) => row.key === 'points')).toMatchObject({ you: 31, league: 25.5, place: 1, of: 2 });
    expect(model.league.rows.find((row) => row.key === 'beers')).toMatchObject({ you: 2, place: 1 });
  });
});
