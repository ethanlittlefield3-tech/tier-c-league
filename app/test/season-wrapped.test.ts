import { describe, expect, it } from 'vitest';
import { seasonWrapped, type WrappedInput } from '../src/telemetry/wrapped.ts';

const KICKOFF = '2027-01-04';
const date = (offset: number) => {
  const day = new Date(`${KICKOFF}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
};
const all = { mind: true, body: true, wildcard: true };
const NAMES: Record<string, string> = {
  me: 'Maya',
  riley: 'Riley',
  sam: 'Sam',
  HOUSE: 'The House',
};

const input = (overrides: Partial<WrappedInput> = {}): WrappedInput => ({
  me: 'me',
  league: 'Tier C League',
  season: {
    name: 'Season 1',
    par: 3,
    kickoff: KICKOFF,
    regularWeeks: 2,
    champion: null,
  },
  logs: {},
  kit: [],
  weeks: [],
  rows: [],
  trophies: null,
  name: (player) => NAMES[player] ?? 'a former player',
  ...overrides,
});

const win = (opponent: string, points: number) => ({
  opponent,
  outcome: 'win' as const,
  points,
  opponentPoints: 0,
});
const loss = (opponent: string, points: number) => ({
  opponent,
  outcome: 'loss' as const,
  points,
  opponentPoints: 99,
});

describe('Season Wrapped, the card at the end of a season', () => {
  it('Shows where you finished in the standings, of how many, with your Season Points', () => {
    const rows = [
      { player: 'riley', rank: 1, seasonPoints: 150 },
      { player: 'me', rank: 2, seasonPoints: 142 },
      { player: 'sam', rank: 3, seasonPoints: 90 },
    ];
    expect(seasonWrapped(input({ rows }))).toMatchObject({
      place: 2,
      of: 3,
      seasonPoints: 142,
      champion: false,
    });
  });

  it('Says so when you won the playoffs', () => {
    expect(
      seasonWrapped(
        input({
          season: {
            name: 'Season 1',
            par: 3,
            kickoff: KICKOFF,
            regularWeeks: 2,
            champion: 'me',
          },
        }),
      ).champion,
    ).toBe(true);
  });

  it('Counts every goal you hit over the regular season, and your perfect days', () => {
    // Monday: all three goals, no beers, screen time at par: perfect. Tuesday: two goals.
    const logs = {
      [date(0)]: { goals: all, screenMinutes: 180, beers: 0 },
      [date(1)]: {
        goals: { mind: true, body: true },
        screenMinutes: 200,
        beers: 1,
      },
    };
    expect(seasonWrapped(input({ logs }))).toMatchObject({
      goals: 5,
      perfect: 1,
      beers: 1,
    });
  });

  it("Adds up the screen time you kept under par on the days you logged it, in hours; a day over par doesn't take any back", () => {
    // Par 3 h: 1 h is 2 h under, 2 h 30 m is 30 m under, 5 h is over and counts as nothing.
    const logs = {
      [date(0)]: { goals: {}, screenMinutes: 60, beers: 0 },
      [date(1)]: { goals: {}, screenMinutes: 150, beers: 0 },
      [date(2)]: { goals: {}, screenMinutes: 300, beers: 0 },
    };
    const wrapped = seasonWrapped(input({ logs }));
    expect(wrapped.underPar).toBe(2.5);
    expect(wrapped.screenPerDay).toBe(170);
  });

  it('Has no screen time numbers when you never logged it', () => {
    expect(seasonWrapped(input())).toMatchObject({
      underPar: null,
      screenPerDay: null,
    });
  });

  it('Finds your best regular-season week by your points, the earlier one on a tie; the playoffs are not in it', () => {
    const weeks = [
      { id: 'w01', week: 1, lines: [{ player: 'me', points: 30 }] },
      { id: 'w02', week: 2, lines: [{ player: 'me', points: 34 }] },
      { id: 'w03', week: 3, lines: [{ player: 'me', points: 34 }] },
      { id: 'p01', week: 4, lines: [{ player: 'me', points: 60 }] },
    ];
    expect(seasonWrapped(input({ weeks })).bestWeek).toEqual({
      week: 2,
      points: 34,
    });
  });

  it('Your longest streak of days logged: a rest day with nothing logged neither adds to it nor breaks it', () => {
    // Monday to Saturday logged, Sunday is the rest day with nothing, then Monday and Tuesday logged, then a miss.
    const logs = Object.fromEntries([0, 1, 2, 3, 4, 5, 7, 8].map((offset) => [date(offset), { goals: { mind: true }, screenMinutes: null, beers: 0 }]));
    expect(seasonWrapped(input({ logs })).streak).toBe(8);
  });

  it("Your record is every week's result, The House included", () => {
    const weeks = [
      { id: 'w01', week: 1, results: { me: win('riley', 30) } },
      { id: 'w02', week: 2, results: { me: loss('HOUSE', 20) } },
    ];
    expect(seasonWrapped(input({ weeks })).record).toEqual({
      win: 1,
      draw: 0,
      loss: 1,
    });
  });

  it('Your nemesis of the season is whoever beat you most this season, with your record against them; never The House', () => {
    const weeks = [
      { id: 'w01', week: 1, results: { me: loss('riley', 10) } },
      { id: 'w02', week: 2, results: { me: loss('HOUSE', 10) } },
      { id: 'w03', week: 3, results: { me: win('riley', 40) } },
      { id: 'w04', week: 4, results: { me: loss('riley', 12) } },
    ];
    expect(
      seasonWrapped(
        input({
          season: {
            name: 'Season 1',
            par: 3,
            kickoff: KICKOFF,
            regularWeeks: 4,
          },
          weeks,
        }),
      ).nemesis,
    ).toEqual({ name: 'Riley', record: '1–0–2' });
    expect(
      seasonWrapped(
        input({
          weeks: [{ id: 'w01', week: 1, results: { me: win('riley', 30) } }],
        }),
      ).nemesis,
    ).toBeNull();
  });

  it('Lists the trophies you won, ties included, in the trophy case order', () => {
    const trophies = {
      brewmaster: { winners: ['me'] },
      ironStreak: { winners: ['sam', 'me'] },
      leader: { winners: ['riley'] },
    };
    expect(seasonWrapped(input({ trophies })).trophies).toEqual(['Iron Streak', 'Brewmaster']);
  });

  it("Has the same card as words, with real names, for sharing where a picture can't go", () => {
    const wrapped = seasonWrapped(
      input({
        rows: [{ player: 'me', rank: 1, seasonPoints: 88 }],
        logs: { [date(0)]: { goals: all, screenMinutes: 60, beers: 0 } },
        weeks: [
          {
            id: 'w01',
            week: 1,
            results: { me: win('riley', 30) },
            lines: [{ player: 'me', points: 30 }],
          },
        ],
        trophies: { leader: { winners: ['me'] } },
      }),
    );
    expect(wrapped.text.split('\n')).toEqual([
      'Tier C League: Season 1, wrapped',
      'Maya: 1st of 1, 88 Season Points',
      'Record: 1–0–0',
      'Goals hit: 3 · Perfect days: 1',
      'Screen time: 2h under par',
      'Best week: Week 1, 30 points',
      'Longest streak: 1 day',
      'Trophies: Regular-Season Leader',
    ]);
  });
});
