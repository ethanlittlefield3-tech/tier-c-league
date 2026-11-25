import { describe, expect, it } from 'vitest';
import { BADGES, STARTER_PARTS, unlockedParts } from '../src/achievements.ts';
import { earnedBadges, groupFeats, type BadgeDay, type BadgeFacts, type BadgeWeek } from '../src/badges.ts';

/** A logged goal day: every goal hit, 30 minutes of screen time, no beers. */
function day(index: number, extra: Partial<BadgeDay> = {}): BadgeDay {
  const week = Math.floor(index / 7) + 1;
  const dayIndex = index % 7;
  return {
    season: 's1',
    period: `w${String(week).padStart(2, '0')}`,
    date: `d${index}`,
    dayIndex,
    rest: dayIndex === 6,
    logged: true,
    mark: 'in',
    noShow: false,
    ruleOne: false,
    perfect: dayIndex !== 6,
    hit: dayIndex === 6 ? { mind: false, body: false, wildcard: false } : { mind: true, body: true, wildcard: true },
    screenMinutes: 30,
    beers: 0,
    total: 6,
    aerial: false,
    blocked: 0,
    early: false,
    ...extra,
  };
}
const days = (count: number, extra: (index: number) => Partial<BadgeDay> = () => ({})) => Array.from({ length: count }, (_, index) => day(index, extra(index)));
const week = (n: number, extra: Partial<BadgeWeek> = {}): BadgeWeek => ({ season: 's1', period: `w${String(n).padStart(2, '0')}`, opponent: 'maya', outcome: 'win', margin: 5, trailedThursday: false, beatLeader: false, mvp: false, bust: false, demolitionsLanded: 0, ...extra });
const facts = (extra: Partial<BadgeFacts> = {}): BadgeFacts => ({ days: [], weeks: [], finishedSeasons: [], commishSeasons: 0, tauntsSent: 0, bragReactions: [], reactionsReceived: 0, daresCompleted: 0, reachedGrandChamp: false, ...extra });
const has = (input: Partial<BadgeFacts>, badge: string) => earnedBadges(facts(input)).includes(badge);

describe('The badge catalog', () => {
  it('There are 51 badges, each unlocking a part, and the starter kit has 3 bodies and 15 paints', () => {
    expect(BADGES).toHaveLength(51);
    expect(new Set(BADGES.map((badge) => badge.id)).size).toBe(51);
    expect(BADGES.every((badge) => badge.unlocks.length > 0)).toBe(true);
    expect(STARTER_PARTS.filter((part) => part.slot === 'body')).toHaveLength(3);
    expect(STARTER_PARTS.filter((part) => part.slot === 'paint')).toHaveLength(15);
  });

  it('A badge adds its parts to the ones a player can use; Champion unlocks two', () => {
    const parts = unlockedParts(['champion', 'hatTrick']).map((part) => part.name);
    expect(parts).toEqual(expect.arrayContaining(['Trophy topper', 'Golden goal explosion', 'Flame decal', 'Brick']));
  });
});

describe('Badges: streaks', () => {
  it('Hat Trick: 3 perfect days in a row, with a rest day in between skipped', () => {
    // Friday, Saturday, (Sunday's rest), Monday.
    const run = days(10, (index) => (index < 4 ? { perfect: false } : {}));
    expect(has({ days: run }, 'hatTrick')).toBe(true);
    expect(has({ days: days(10, (index) => (index % 3 === 2 ? { perfect: false } : {})) }, 'hatTrick')).toBe(false);
  });

  it('Perfect Week: a perfect day on all 6 goal days of a week', () => {
    expect(has({ days: days(7) }, 'perfectWeek')).toBe(true);
    expect(has({ days: days(7, (index) => (index === 2 ? { perfect: false } : {})) }, 'perfectWeek')).toBe(false);
  });

  it('Iron Streak and Century: 30 and 100 days of check-ins, with skipped days neither growing nor breaking it', () => {
    expect(has({ days: days(30) }, 'ironStreak')).toBe(true);
    expect(has({ days: days(31, (index) => (index === 15 ? { mark: 'out' } : {})) }, 'ironStreak')).toBe(false);
    expect(has({ days: days(31, (index) => (index === 15 ? { mark: 'skip' } : {})) }, 'ironStreak')).toBe(true);
    expect(has({ days: days(100) }, 'century')).toBe(true);
    expect(has({ days: days(99) }, 'century')).toBe(false);
  });

  it('Early Bird: logged before 9 am, 7 days straight', () => {
    expect(has({ days: days(7, () => ({ early: true })) }, 'earlyBird')).toBe(true);
    expect(has({ days: days(8, (index) => ({ early: index !== 3 })) }, 'earlyBird')).toBe(false);
  });

  it('Clean Sheet: a week with no no-shows, and screen time logged every day', () => {
    expect(has({ days: days(7) }, 'cleanSheet')).toBe(true);
    expect(has({ days: days(7, (index) => (index === 3 ? { screenMinutes: null } : {})) }, 'cleanSheet')).toBe(false);
    expect(has({ days: days(7, (index) => (index === 3 ? { noShow: true } : {})) }, 'cleanSheet')).toBe(false);
  });
});

describe('Badges: lanes and screen time', () => {
  it('Scholar, Gym Rat and Wild One: that lane hit on all 6 goal days of a week', () => {
    const noWildcard = days(7, (index) => (index === 6 ? {} : { hit: { mind: true, body: true, wildcard: index !== 2 } }));
    expect(earnedBadges(facts({ days: noWildcard })).filter((badge) => ['scholar', 'gymRat', 'wildOne'].includes(badge))).toEqual(['gymRat', 'scholar']);
  });

  it('Triple Threat: every lane hit on at least 5 days, 3 weeks running', () => {
    expect(has({ days: days(21) }, 'tripleThreat')).toBe(true);
    expect(has({ days: days(21, (index) => (index >= 7 && index < 11 ? { hit: { mind: false, body: true, wildcard: true } } : {})) }, 'tripleThreat')).toBe(false);
  });

  it('Ghost: under an hour for 7 straight days; Touch Grass: under 30 minutes in a day; Monk Mode: 0 minutes', () => {
    expect(has({ days: days(7, () => ({ screenMinutes: 45 })) }, 'ghost')).toBe(true);
    expect(has({ days: days(7, (index) => ({ screenMinutes: index === 3 ? 60 : 45 })) }, 'ghost')).toBe(false);
    expect(has({ days: [day(0, { screenMinutes: 15 })] }, 'touchGrass')).toBe(true);
    expect(has({ days: [day(0, { screenMinutes: 30 })] }, 'touchGrass')).toBe(false);
    expect(has({ days: [day(0, { screenMinutes: 0 })] }, 'monkMode')).toBe(true);
  });

  it('Recovering Addict: the weekly average down 3 weeks in a row', () => {
    const falling = days(28, (index) => ({ screenMinutes: 200 - 30 * Math.floor(index / 7) }));
    expect(has({ days: falling }, 'recoveringAddict')).toBe(true);
    const flat = days(28, (index) => ({ screenMinutes: index < 14 ? 200 : 150 }));
    expect(has({ days: flat }, 'recoveringAddict')).toBe(false);
  });
});

describe('Badges: beers', () => {
  it('Dry Week: 0 beers in a week, with every day logged; Dry Month: 4 such weeks running', () => {
    expect(has({ days: days(7) }, 'dryWeek')).toBe(true);
    expect(has({ days: days(7, (index) => (index === 4 ? { logged: false } : {})) }, 'dryWeek')).toBe(false);
    expect(has({ days: days(28) }, 'dryMonth')).toBe(true);
    expect(has({ days: days(28, (index) => (index === 20 ? { beers: 1 } : {})) }, 'dryMonth')).toBe(false);
  });

  it('Designated Driver: 0 beers on the Friday and Saturday of one weekend', () => {
    expect(has({ days: days(7, (index) => (index < 4 ? { beers: 3 } : {})) }, 'designatedDriver')).toBe(true);
    expect(has({ days: days(7, (index) => (index === 5 ? { beers: 1 } : {})) }, 'designatedDriver')).toBe(false);
  });

  it('Happy Hour (shame): 10 or more beers in one week; Brewmaster (shame): most beers in a finished season', () => {
    expect(has({ days: days(7, (index) => (index === 5 ? { beers: 10 } : {})) }, 'happyHour')).toBe(true);
    expect(has({ days: days(7, (index) => (index === 5 ? { beers: 9 } : {})) }, 'happyHour')).toBe(false);
    expect(has({ finishedSeasons: [{ id: 's1', mostBeers: true }] }, 'brewmaster')).toBe(true);
  });
});

describe('Badges: matchups', () => {
  it('First Blood: the first 1v1 win; a win over The House is not a 1v1', () => {
    expect(has({ weeks: [week(1)] }, 'firstBlood')).toBe(true);
    expect(has({ weeks: [week(1, { opponent: null })] }, 'firstBlood')).toBe(false);
  });

  it('Win Streak: 4 1v1 wins in a row; a week against The House neither counts nor breaks it', () => {
    expect(has({ weeks: [week(1), week(2), week(3, { opponent: null, outcome: 'loss' }), week(4), week(5)] }, 'winStreak')).toBe(true);
    expect(has({ weeks: [week(1), week(2), week(3, { outcome: 'draw' }), week(4), week(5)] }, 'winStreak')).toBe(false);
  });

  it('Sweep: every 1v1 week of a finished season won', () => {
    const season = [week(1), week(2), week(3)];
    expect(has({ weeks: season, finishedSeasons: [{ id: 's1', mostBeers: false }] }, 'sweep')).toBe(true);
    expect(has({ weeks: season, finishedSeasons: [] }, 'sweep')).toBe(false);
    expect(has({ weeks: [...season, week(4, { outcome: 'loss' })], finishedSeasons: [{ id: 's1', mostBeers: false }] }, 'sweep')).toBe(false);
  });

  it('Comeback, Blowout, Photo Finish and Giant Killer go with a win', () => {
    expect(earnedBadges(facts({ weeks: [week(1, { trailedThursday: true, margin: 20, beatLeader: true })] }))).toEqual(expect.arrayContaining(['comeback', 'blowout', 'giantKiller']));
    expect(has({ weeks: [week(1, { margin: 1 })] }, 'photoFinish')).toBe(true);
    expect(has({ weeks: [week(1, { outcome: 'loss', margin: -1, trailedThursday: true })] }, 'comeback')).toBe(false);
  });

  it('Rivalry King: 5 all-time wins over the same player', () => {
    expect(has({ weeks: [1, 2, 3, 4, 5].map((n) => week(n)) }, 'rivalryKing')).toBe(true);
    expect(has({ weeks: [1, 2, 3, 4, 5].map((n) => week(n, { opponent: n === 5 ? 'sam' : 'maya' })) }, 'rivalryKing')).toBe(false);
  });
});

describe('Badges: group play', () => {
  const result = (outcome: string, points: number, extra: Record<string, unknown> = {}) => ({ outcome, points, ...extra });

  it("Rumble Royale: the most points in the league in a Rumble week, every tied player", () => {
    const feats = groupFeats({ results: { a: result('win', 30, { mode: 'rumble' }), b: result('loss', 30, { mode: 'rumble' }), c: result('win', 12, { mode: 'rumble' }) } });
    expect(feats).toEqual({ a: ['rumbleRoyale'], b: ['rumbleRoyale'] });
  });

  it('Team Player and Dynamic Duo: on the winning side of a Team Week or a 2v2', () => {
    expect(groupFeats({ results: { a: result('win', 20, { mode: 'teamWeek' }), b: result('loss', 25, { mode: 'teamWeek' }) } })).toEqual({ a: ['teamPlayer'] });
    expect(groupFeats({ results: { a: result('win', 20, { mode: 'twoVTwo' }), b: result('draw', 25, { mode: 'twoVTwo' }) } })).toEqual({ a: ['dynamicDuo'] });
  });

  it('Bounty Hunter: the top contributor to a count target, hit or missed; a day target has no top contributor', () => {
    const results = { a: result('none', 20, { mode: 'bounty' }), b: result('none', 25, { mode: 'bounty' }) };
    expect(groupFeats({ results, group: { mode: 'bounty', target: { kind: 'hits' }, contributions: { a: 6, b: 4 } } })).toEqual({ a: ['bountyHunter'] });
    expect(groupFeats({ results, group: { mode: 'bounty', target: { kind: 'dry' }, contributions: { a: 1, b: 1 } } })).toEqual({});
  });

  it('Floor Breaker: the most tiles broken in a Drop Shot week, at least one; Alley Cat: 1st in the Alley', () => {
    const floor = (tiles: number) => ({ hits: tiles * 2, tiles, opponentHits: 0, opponentTiles: 0 });
    expect(groupFeats({ results: { a: result('win', 20, { mode: 'dropShot', floor: floor(4) }), b: result('loss', 25, { mode: 'dropShot', floor: floor(2) }), c: result('win', 9, { mode: 'dropShot', floor: floor(4) }) } })).toEqual({ a: ['floorBreaker'], c: ['floorBreaker'] });
    expect(groupFeats({ results: { a: result('none', 20, { mode: 'dropShot', floor: floor(0) }) } })).toEqual({});
    expect(groupFeats({ results: { a: result('none', 20, { mode: 'alley', race: { points: 20, walls: 0, place: 1 } }), b: result('none', 22, { mode: 'alley', race: { points: 18, walls: 2, place: 2 } }) } })).toEqual({ a: ['alleyCat'] });
  });

  it("A week's group-play feats earn their badges", () => {
    for (const badge of ['rumbleRoyale', 'teamPlayer', 'dynamicDuo', 'bountyHunter', 'floorBreaker', 'alleyCat']) {
      expect(has({ weeks: [week(1, { opponent: null, outcome: 'none', feats: [badge] })] }, badge)).toBe(true);
    }
    expect(has({ weeks: [week(1)] }, 'teamPlayer')).toBe(false);
  });
});

describe('Badges: power-ups, social and career', () => {
  it('Demolisher: 3 landed; Untouchable: one blocked with Full Boost; Air Mail: an Aerial day of +10', () => {
    expect(has({ weeks: [week(1, { demolitionsLanded: 2 }), week(2, { demolitionsLanded: 1 })] }, 'demolisher')).toBe(true);
    expect(has({ days: [day(0, { blocked: 1 })] }, 'untouchable')).toBe(true);
    expect(has({ days: [day(0, { aerial: true, total: 12 })] }, 'airMail')).toBe(true);
    expect(has({ days: [day(0, { aerial: true, total: 9 })] }, 'airMail')).toBe(false);
  });

  it('Clutch: won a week in which you used Rule One', () => {
    expect(has({ weeks: [week(1)], days: days(7, (index) => (index === 2 ? { ruleOne: true } : {})) }, 'clutch')).toBe(true);
    expect(has({ weeks: [week(1, { outcome: 'loss' })], days: days(7, (index) => (index === 2 ? { ruleOne: true } : {})) }, 'clutch')).toBe(false);
  });

  it('Trash Talker: 50 taunts; Show-Off: 10 brags with 3 reactions each; Fan Favorite: 100 reactions', () => {
    expect(has({ tauntsSent: 50 }, 'trashTalker')).toBe(true);
    expect(has({ bragReactions: Array.from({ length: 10 }, () => 3) }, 'showOff')).toBe(true);
    expect(has({ bragReactions: [...Array.from({ length: 9 }, () => 3), 2] }, 'showOff')).toBe(false);
    expect(has({ reactionsReceived: 100 }, 'fanFavorite')).toBe(true);
  });

  it('Founding Member, Veteran, MVP Magnet, Bust Collector, Wheel Survivor, Grand Champ and Commish', () => {
    const three = ['s1', 's2', 's3'].map((season) => week(1, { season }));
    expect(earnedBadges(facts({ weeks: three }))).toEqual(expect.arrayContaining(['foundingMember', 'veteran']));
    expect(has({ weeks: [week(1, { season: 's2' })] }, 'foundingMember')).toBe(false);
    expect(has({ weeks: [1, 2, 3].map((n) => week(n, { mvp: true })) }, 'mvpMagnet')).toBe(true);
    expect(has({ weeks: [week(1, { mvp: true }), week(2, { mvp: true }), week(1, { season: 's2', mvp: true })] }, 'mvpMagnet')).toBe(false);
    expect(has({ weeks: [1, 2, 3].map((n) => week(n, { bust: true })) }, 'bustCollector')).toBe(true);
    expect(has({ daresCompleted: 3 }, 'wheelSurvivor')).toBe(true);
    expect(has({ reachedGrandChamp: true }, 'grandChamp')).toBe(true);
    expect(has({ commishSeasons: 1 }, 'commish')).toBe(true);
    expect(has({ rematchesWon: 1 }, 'payback')).toBe(true);
    expect(has({ rematchesWon: 0 }, 'payback')).toBe(false);
    expect(has({ bestPicker: true }, 'prophet')).toBe(true);
  });

  it('Badges from features still to come are never earned yet', () => {
    const everything = facts({ days: days(140), weeks: [1, 2, 3, 4, 5].map((n) => week(n, { mvp: true, bust: true, demolitionsLanded: 3 })), tauntsSent: 999, reactionsReceived: 999, daresCompleted: 9, reachedGrandChamp: true, commishSeasons: 1 });
    const later = BADGES.filter((badge) => badge.later).map((badge) => badge.id);
    expect(earnedBadges(everything).filter((badge) => later.includes(badge))).toEqual([]);
  });
});
