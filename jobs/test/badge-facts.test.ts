import { describe, expect, it } from 'vitest';
import { zoneClock } from '../../engine/src/clock.ts';
import { badgeUpdate, seasonBadgeData, type SeasonForBadges } from '../lib/badge-facts.ts';

const H = 3_600_000;
const NY = 'America/New_York';
const clock = zoneClock(NY);
const dates = ['2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08', '2027-01-09', '2027-01-10'];
const calendar = dates.map((date, dayIndex) => ({ date, period: 'w01', dayIndex, phase: 'regular', start: clock.timeOf(date, 0), lock: clock.timeOf(date, 0) + 36 * H }));
const perfect = (date: string, hour: number) => ({ goals: { mind: true, body: true, wildcard: true }, screenMinutes: 20, beers: 0, firstAt: clock.timeOf(date, hour) });
const result = (opponent: string, points: number, opponentPoints: number, outcome: 'win' | 'loss' | 'draw') => ({ opponent, points, opponentPoints, outcome, seasonPoints: points });

function season(extra: Partial<SeasonForBadges> = {}): SeasonForBadges {
  return {
    season: 's1',
    par: 3,
    clock,
    calendar,
    weeks: [{ period: 'w01', results: { alex: result('maya', 30, 10, 'win'), maya: result('alex', 10, 30, 'loss') }, awards: { mvp: ['alex'], bust: [] }, reveals: [{ player: 'alex', outcome: 'landed' }] }],
    players: {
      alex: { logs: Object.fromEntries(dates.slice(0, 6).map((date) => [date, perfect(date, 8)])), kit: [], adjustments: [], demolitionsOn: [] },
      maya: { logs: {}, kit: [], adjustments: [], demolitionsOn: [] },
    },
    ...extra,
  };
}

describe("A season's badge history", () => {
  it('Every finished day is scored by the engine, with whether it was logged before 9 am', () => {
    const { alex } = seasonBadgeData(season());
    expect(alex!.days).toHaveLength(7);
    expect(alex!.days[0]).toMatchObject({ date: '2027-01-04', perfect: true, logged: true, mark: 'in', early: true, screenMinutes: 20, rest: false });
    // Sunday is the rest day, and nothing was logged on it.
    expect(alex!.days[6]).toMatchObject({ rest: true, logged: false, mark: 'skip' });
  });

  it("Each week's result, with who led on Thursday, the MVP and the Demolitions that landed", () => {
    const { alex, maya } = seasonBadgeData(season());
    expect(alex!.weeks[0]).toMatchObject({ opponent: 'maya', outcome: 'win', margin: 20, trailedThursday: false, mvp: true, demolitionsLanded: 1, beatLeader: false });
    expect(maya!.weeks[0]).toMatchObject({ opponent: 'alex', outcome: 'loss', trailedThursday: true });
  });

  it("A group-play week with no single opponent isn't a 1v1, and a Bounty or Alley week is neither won nor lost", () => {
    const group = season({ weeks: [{ period: 'w01', results: { alex: { ...result('GROUP', 30, 20, 'win'), outcome: 'none' }, maya: result('GROUP', 10, 0, 'loss') } }] });
    expect(seasonBadgeData(group).alex!.weeks[0]).toMatchObject({ opponent: null, outcome: 'none', trailedThursday: false, beatLeader: false });
    expect(seasonBadgeData(group).maya!.weeks[0]).toMatchObject({ opponent: null, outcome: 'loss' });
  });

  it("A group-play week carries each player's group-play feats, for the badges", () => {
    const alley = season({ weeks: [{ period: 'w01', results: { alex: { ...result('GROUP', 30, 0, 'win'), outcome: 'none', mode: 'alley', race: { points: 30, walls: 0, place: 1 } }, maya: { ...result('GROUP', 10, 0, 'loss'), outcome: 'none', mode: 'alley', race: { points: 6, walls: 2, place: 2 } } } }] });
    expect(seasonBadgeData(alley).alex!.weeks[0]).toMatchObject({ feats: ['alleyCat'] });
    expect(seasonBadgeData(alley).maya!.weeks[0]).toMatchObject({ feats: [] });
  });

  it('Beating the player who led the standings going into the week counts as beating the leader', () => {
    const two = season({
      calendar: [...calendar, ...calendar.map((day) => ({ ...day, period: 'w02', date: day.date.replace('-0', '-1'), start: day.start + 7 * 24 * H, lock: day.lock + 7 * 24 * H }))],
      weeks: [
        { period: 'w01', results: { alex: result('maya', 30, 10, 'win'), maya: result('alex', 10, 30, 'loss') } },
        { period: 'w02', results: { alex: result('maya', 5, 9, 'loss'), maya: result('alex', 9, 5, 'win') } },
      ],
    });
    expect(seasonBadgeData(two).maya!.weeks[1]).toMatchObject({ outcome: 'win', beatLeader: true });
  });

  it('Badges are only ever added: what a player had stays, and the newly earned are named', () => {
    const facts = { days: seasonBadgeData(season()).alex!.days, weeks: seasonBadgeData(season()).alex!.weeks, finishedSeasons: [], commishSeasons: 0, tauntsSent: 0, bragReactions: [], reactionsReceived: 0, daresCompleted: 0, reachedGrandChamp: false };
    const update = badgeUpdate(['century'], facts);
    expect(update.all).toEqual(expect.arrayContaining(['century', 'firstBlood', 'perfectWeek', 'touchGrass', 'blowout']));
    expect(update.fresh).not.toContain('century');
    expect(update.fresh).toEqual(expect.arrayContaining(['firstBlood', 'perfectWeek']));
  });
});
