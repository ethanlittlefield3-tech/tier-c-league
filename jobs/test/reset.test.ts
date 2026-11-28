import { describe, expect, it } from 'vitest';
import { bannerAfter, feedToClear, previousSeason, profileReset, resetStep, type ResetProfile } from '../lib/reset.ts';

const MIN = 60_000;
const NOW = Date.UTC(2027, 2, 1, 15, 0);

const entry = (season: string, period: string, points: number) => ({
  season,
  period,
  points,
  max: 39,
  rank: 'bronze' as const,
});

const profile = (overrides: Partial<ResetProfile> = {}): ResetProfile => ({
  rank: 'gold',
  rankHistory: [entry('s1', 'w01', 20), entry('s1', 'w02', 20), entry('s2', 'w01', 2)],
  badges: { hatTrick: { season: 's1' }, gymRat: { season: 's2' } },
  seasons: { s1: 2027, s2: 2027 },
  car: {
    body: 'dart',
    paint: 'cobalt',
    decal: 'flame',
    wheels: 'muscle',
    topper: 'none',
    accents: ['lower'],
  },
  stickers: { dodger: { until: NOW + MIN } },
  ...overrides,
});

describe('A season reset: where the league goes back to', () => {
  it('Goes back to the season before it, by number; the first season goes back to no season at all', () => {
    expect(previousSeason(['s1', 's2', 's3'], 's3')).toBe('s2');
    expect(previousSeason(['s1', 'practice', 's2'], 's2')).toBe('s1');
    expect(previousSeason(['s1'], 's1')).toBeNull();
    expect(previousSeason(['practice', 's1'], 's1')).toBeNull();
  });

  it("The champion's banner goes back to the season before's champion, if it was the reset season's", () => {
    expect(
      bannerAfter({
        banner: { player: 'maya', season: 's2' },
        season: 's2',
        previous: { id: 's1', champion: 'riley' },
      }),
    ).toEqual({ player: 'riley', season: 's1' });
    expect(
      bannerAfter({
        banner: { player: 'maya', season: 's2' },
        season: 's2',
        previous: { id: 's1', champion: null },
      }),
    ).toBeNull();
    expect(
      bannerAfter({
        banner: { player: 'maya', season: 's2' },
        season: 's2',
        previous: null,
      }),
    ).toBeNull();
    // A banner from an earlier season stays.
    expect(
      bannerAfter({
        banner: { player: 'riley', season: 's1' },
        season: 's2',
        previous: { id: 's1', champion: 'riley' },
      }),
    ).toEqual({ player: 'riley', season: 's1' });
  });
});

describe('A season reset: what it takes off each profile', () => {
  it("Takes the season's weeks out of the rank history and works the rank out again from what is left", () => {
    const { update } = profileReset(profile(), 's2');
    expect(update.rankHistory).toEqual([
      { ...entry('s1', 'w01', 20), rank: 'diamond' },
      { ...entry('s1', 'w02', 20), rank: 'diamond' },
    ]);
    expect(update.rank).toBe('diamond');
  });

  it('With no weeks left, the player has no rank', () => {
    const { update } = profileReset(profile({ rankHistory: [entry('s1', 'w01', 20)] }), 's1');
    expect(update).toMatchObject({ rankHistory: [], rank: null });
  });

  it('Takes away the badges earned in the season, and the season from the seasons finished', () => {
    const { update, removedBadges } = profileReset(profile(), 's2');
    expect(update.badges).toEqual({ hatTrick: { season: 's1' } });
    expect(removedBadges).toEqual(['gymRat']);
    expect(update.seasons).toEqual({ s1: 2027 });
  });

  it('A car part from a badge that is gone goes back to the starter part for its slot; parts still earned stay', () => {
    // Muscle wheels came from Gym Rat (Season 2); the Flame decal from Hat Trick (Season 1).
    expect(profileReset(profile(), 's2').update.car).toEqual({
      body: 'dart',
      paint: 'cobalt',
      decal: 'flame',
      wheels: 'stock',
      topper: 'none',
      accents: ['lower'],
    });
    expect(profileReset(profile(), 's1').update.car).toMatchObject({
      decal: 'none',
      wheels: 'muscle',
    });
  });

  it("The season's decal and the rank emblem come off a car when the season or the rank goes", () => {
    expect(profileReset(profile({ car: { decal: 'season-s2-2027' } }), 's2').update.car).toEqual({ decal: 'none' });
    // An earlier season's decal, and the emblem of a rank still held, stay: the car isn't touched.
    expect(profileReset(profile({ car: { decal: 'season-s1-2027' } }), 's2').update.car).toBeUndefined();
    expect(profileReset(profile({ car: { decal: 'rank' } }), 's2').update.car).toBeUndefined();
    expect(
      profileReset(
        profile({
          car: { decal: 'rank' },
          rankHistory: [entry('s1', 'w01', 4)],
        }),
        's1',
      ).update.car,
    ).toEqual({ decal: 'none' });
  });

  it("Takes the stickers off: they only ever come from the season's weeks", () => {
    expect(profileReset(profile(), 's2').update.stickers).toBeNull();
  });

  it('Changes nothing on a profile the season never touched', () => {
    const untouched = profile({
      rankHistory: [entry('s1', 'w01', 20)],
      badges: { hatTrick: { season: 's1' } },
      seasons: { s1: 2027 },
      car: { body: 'dart', decal: 'flame' },
      stickers: undefined,
      rank: 'diamond',
    });
    const { update } = profileReset(
      {
        ...untouched,
        rankHistory: [{ ...entry('s1', 'w01', 20), rank: 'diamond' }],
      },
      's2',
    );
    expect(update).toEqual({});
  });
});

describe("A season reset: the league feed's news from the season", () => {
  it("Clears the season's ranks, picks, champion and offseason departures, and the news of each badge taken away; leaves everything else", () => {
    const ids = ['rank_maya_s2_w01', 'rank_maya_s1_w03', 'picks_s2_w01', 'picks_s1_w01', 'champion_s2', 'champion_s1', 'left_s2_sam', 'badge_maya_gymRat', 'badge_maya_hatTrick'];
    expect(feedToClear(ids, 's2', { maya: ['gymRat'] })).toEqual(['rank_maya_s2_w01', 'picks_s2_w01', 'champion_s2', 'left_s2_sam', 'badge_maya_gymRat']);
  });

  it("Doesn't mistake season 12's news for season 1's", () => {
    expect(feedToClear(['rank_maya_s12_w01', 'picks_s12_w01', 'champion_s12'], 's1', {})).toEqual([]);
  });
});

describe('When the alerts job starts a season reset', () => {
  it("Starts the reset job for a request, once, and again if it hasn't finished within half an hour", () => {
    expect(resetStep({ request: { status: 'requested' }, now: NOW })).toBe('start');
    expect(
      resetStep({
        request: { status: 'requested', dispatchedAt: NOW - 5 * MIN },
        now: NOW,
      }),
    ).toBeNull();
    expect(
      resetStep({
        request: {
          status: 'running',
          dispatchedAt: NOW - 10 * MIN,
          runAt: NOW - 5 * MIN,
        },
        now: NOW,
      }),
    ).toBeNull();
    expect(
      resetStep({
        request: {
          status: 'running',
          dispatchedAt: NOW - 40 * MIN,
          runAt: NOW - 35 * MIN,
        },
        now: NOW,
      }),
    ).toBe('start');
    expect(
      resetStep({
        request: { status: 'requested', dispatchedAt: NOW - 31 * MIN },
        now: NOW,
      }),
    ).toBe('start');
  });

  it("Leaves one that couldn't run for the commish to see, and does nothing with no request", () => {
    expect(resetStep({ request: { status: 'failed' }, now: NOW })).toBeNull();
    expect(resetStep({ request: null, now: NOW })).toBeNull();
  });
});
