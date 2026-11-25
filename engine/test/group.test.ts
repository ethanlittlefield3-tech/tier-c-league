import { describe, expect, it } from 'vitest';
import {
  GROUP,
  HOUSE,
  alleyRace,
  bountyMax,
  bountyProgress,
  bountyText,
  decideDropShot,
  decideSides,
  defaultBounty,
  dropShotHits,
  duoMatches,
  frenemyDuos,
  playerWeek,
  randomDuos,
  settleDue,
  standingsFrom,
  tilesBroken,
  validBounty,
  weekPlayers,
  type DayLog,
  type PlayerWeekData,
} from '../src/index.ts';

const H = 3_600_000;
/** Monday noon in New York, after Week 2. */
const SUNDAY_LOCK = Date.UTC(2027, 0, 18, 17);
/** Week 2: Monday, January 11 to Sunday, January 17, 2027. */
const DAYS = [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
  const start = Date.UTC(2027, 0, 11 + dayIndex, 5);
  return { date: `2027-01-${11 + dayIndex}`, period: 'w02', dayIndex, phase: 'regular', start, lock: start + 36 * H, nextEnd: start + 48 * H };
});
const date = (dayIndex: number) => DAYS[dayIndex]!.date;

/** A day in shorthand: the goals hit ('MBW' is all three), unproductive minutes, beers. At par 3, 'MBW' with 30 minutes is 6. */
const day = (goals: string, minutes: number | null = 30, beers = 0): DayLog => ({
  goals: { mind: goals.includes('M'), body: goals.includes('B'), wildcard: goals.includes('W') },
  screenMinutes: minutes,
  beers,
});

/** The same day Monday to Saturday, and Sunday's rest day with 30 minutes (3 points). `null` logs nothing. */
const week = (log: DayLog, changes: Record<number, DayLog | null> = {}, kit: PlayerWeekData['kit'] = []): PlayerWeekData => ({
  logs: Object.fromEntries(
    DAYS.flatMap((each) => {
      const found = each.dayIndex in changes ? changes[each.dayIndex] : each.dayIndex === 6 ? day('') : log;
      return found ? [[each.date, found]] : [];
    }),
  ),
  kit,
  adjustments: [],
});

// Week totals at par 3: 'MBW' every day is 6 x 6 + 3 = 39, 'MB' is 33, 'M' is 27 and no goals is 21.
const ALL = week(day('MBW'));
const TWO = week(day('MB'));
const ONE = week(day('M'));
const NONE = week(day(''));

const base = { week: 2, period: 'w02', par: 3, timeZone: 'America/New_York', days: DAYS, demolitions: [], earlier: {}, pairs: [], now: SUNDAY_LOCK };

describe('Group play: Team Week', () => {
  it('The squads compare average points per player, so a bigger squad has no edge', () => {
    const due = settleDue({ ...base, mode: 'teamWeek', teams: { blue: ['a', 'b', 'c'], orange: ['d', 'e'] }, players: { a: ALL, b: TWO, c: TWO, d: ALL, e: TWO } })!;
    // Blue: 39 + 33 + 33 = 105, an average of 35. Orange: 39 + 33 = 72, an average of 36.
    expect(due.results.d).toMatchObject({ opponent: GROUP, mode: 'teamWeek', outcome: 'win', points: 39, bonus: 3, seasonPoints: 42 });
    expect(due.results.d?.side).toEqual({ name: 'orange', players: ['d', 'e'], points: 36, beers: 0 });
    expect(due.results.d?.against).toEqual({ name: 'blue', players: ['a', 'b', 'c'], points: 35, beers: 0 });
    expect(due.results.e).toMatchObject({ outcome: 'win', points: 33, seasonPoints: 36 });
  });

  it('Your own points always count: the losing squad keeps its points and gets no bonus', () => {
    const due = settleDue({ ...base, mode: 'teamWeek', teams: { blue: ['a', 'b', 'c'], orange: ['d', 'e'] }, players: { a: ALL, b: TWO, c: TWO, d: ALL, e: TWO } })!;
    expect(due.results.a).toMatchObject({ outcome: 'loss', points: 39, bonus: 0, seasonPoints: 39 });
    expect(due.group).toMatchObject({ mode: 'teamWeek', matches: [{ winner: 'b', decidedBy: 'points' }] });
  });

  it('Level on average points goes to the squad with fewer beers per player', () => {
    // a has a beer on Monday (5 that day) and c misses a goal on Monday: both squads average 38.5.
    const players = { a: week(day('MBW'), { 0: day('MBW', 30, 1) }), b: ALL, c: week(day('MBW'), { 0: day('MB') }), d: ALL };
    const due = settleDue({ ...base, mode: 'teamWeek', teams: { blue: ['a', 'b'], orange: ['c', 'd'] }, players })!;
    expect(due.results.c).toMatchObject({ outcome: 'win', decidedBy: 'beers', bonus: 3 });
    expect(due.results.a).toMatchObject({ outcome: 'loss', decidedBy: 'beers', bonus: 0 });
  });

  it('Still level is a draw, which adds no bonus (provisional, still open)', () => {
    const due = settleDue({ ...base, mode: 'teamWeek', teams: { blue: ['a', 'b'], orange: ['c', 'd'] }, players: { a: ALL, b: TWO, c: TWO, d: ALL } })!;
    for (const player of ['a', 'b', 'c', 'd']) expect(due.results[player]).toMatchObject({ outcome: 'draw', bonus: 0 });
  });

  it('Averages are compared exactly: 31 points across 3 players is level with 62 across 6', () => {
    expect(decideSides({ points: 31, beers: 0, size: 3 }, { points: 62, beers: 0, size: 6 })).toEqual({ a: 'draw', b: 'draw', decidedBy: 'none' });
    expect(decideSides({ points: 31, beers: 0, size: 3 }, { points: 61, beers: 0, size: 6 })).toMatchObject({ a: 'win', decidedBy: 'points' });
  });
});

describe('Group play: 2v2', () => {
  it('The random draw pairs players off in the drawn order, and with an odd count the last three are a trio', () => {
    expect(randomDuos(['a', 'b', 'c', 'd'])).toEqual([['a', 'b'], ['c', 'd']]);
    expect(randomDuos(['a', 'b', 'c', 'd', 'e'])).toEqual([['a', 'b'], ['c', 'd', 'e']]);
  });

  it('Duos are matched in order, and an odd duo out faces a House duo, never the trio', () => {
    expect(duoMatches([['a', 'b'], ['c', 'd']])).toEqual([{ a: ['a', 'b'], b: ['c', 'd'] }]);
    expect(duoMatches([['a', 'b', 'c'], ['d', 'e'], ['f', 'g']])).toEqual([
      { a: ['d', 'e'], b: [HOUSE] },
      { a: ['a', 'b', 'c'], b: ['f', 'g'] },
    ]);
  });

  it('Frenemies pairs each player with their Week 1 rival; whoever faced The House joins the last duo drawn as its third', () => {
    const rivals = [{ a: 'a', b: 'b' }, { a: 'c', b: 'd' }, { a: 'e', b: HOUSE }];
    // The drawn order puts d first, so c and d's duo is matched first.
    expect(frenemyDuos(rivals, ['d', 'e', 'a', 'b', 'c'])).toEqual([['c', 'd'], ['a', 'b', 'e']]);
  });

  it('Players whose rival has left pair up with each other, in the drawn order', () => {
    expect(frenemyDuos([{ a: 'a', b: 'b' }, { a: 'c', b: 'gone' }, { a: 'e', b: 'f' }, { a: 'g', b: 'also-gone' }], ['a', 'b', 'c', 'e', 'f', 'g'])).toEqual([
      ['a', 'b'],
      ['c', 'g'],
      ['e', 'f'],
    ]);
  });

  it('Duos compare average points: the winners get 3 each on top of their own points', () => {
    const due = settleDue({ ...base, mode: 'twoVTwo', duos: [{ a: ['a', 'b'], b: ['c', 'd'] }], players: { a: ALL, b: ONE, c: TWO, d: ONE } })!;
    // a and b average 33; c and d average 30.
    expect(due.results.a).toMatchObject({ opponent: GROUP, outcome: 'win', bonus: 3, seasonPoints: 42 });
    expect(due.results.b).toMatchObject({ outcome: 'win', bonus: 3, seasonPoints: 30 });
    expect(due.results.c).toMatchObject({ outcome: 'loss', bonus: 0, seasonPoints: 33 });
    expect(due.results.a?.against).toEqual({ name: 'duo', players: ['c', 'd'], points: 30, beers: 0 });
  });

  it('The House duo scores the average of everyone outside the odd duo', () => {
    const due = settleDue({
      ...base,
      mode: 'twoVTwo',
      duos: [{ a: ['a', 'b'], b: [HOUSE] }, { a: ['c', 'd'], b: ['e', 'f'] }],
      players: { a: ALL, b: ONE, c: ALL, d: TWO, e: ONE, f: NONE },
    })!;
    // The House duo: (39 + 33 + 27 + 21) / 4 = 30. a and b average 33.
    expect(due.results.a?.against).toEqual({ name: 'house', players: [HOUSE], points: 30, beers: 0 });
    expect(due.results.a).toMatchObject({ outcome: 'win', bonus: 3 });
    expect(due.results.c).toMatchObject({ outcome: 'win', bonus: 3 });
  });
});

describe('Group play: Bounty Week', () => {
  const kit = [{ item: 'fullBoost', period: 'w02', date: date(1), lane: 'body' as const }];

  it('A hits target counts every hit in its lane across the league, Full Boost included, and hitting it gives everyone 3', () => {
    // a hits Body 6 times; b hits only Mind, but Full Boosts Body on Tuesday: 7 in all.
    const due = settleDue({ ...base, mode: 'bounty', roster: ['a', 'b'], bounty: { kind: 'hits', lane: 'body', count: 7 }, players: { a: ALL, b: week(day('M'), {}, kit) } })!;
    expect(due.group).toMatchObject({ mode: 'bounty', total: 7, needed: 7, hit: true, contributions: { a: 6, b: 1 } });
    expect(due.results.a).toMatchObject({ opponent: GROUP, mode: 'bounty', outcome: 'none', bonus: 3, seasonPoints: 42 });
    expect(due.results.b).toMatchObject({ outcome: 'none', bonus: 3, seasonPoints: 31 });
  });

  it('When the target is hit, the Wheel is the usual one: the lowest points', () => {
    const due = settleDue({ ...base, mode: 'bounty', roster: ['a', 'b'], bounty: { kind: 'hits', lane: 'body', count: 7 }, players: { a: ALL, b: week(day('M'), {}, kit) } })!;
    expect(due.awards.wheel).toEqual(['b']);
  });

  it('Missed: nobody gets the bonus, and the lowest contributor spins instead of the lowest points, every tied one', () => {
    const players = { a: ALL, b: week(day('MW')), c: week(day('B')), d: week(day('MW')) };
    const due = settleDue({ ...base, mode: 'bounty', roster: ['a', 'b', 'c', 'd'], bounty: { kind: 'hits', lane: 'body', count: 24 }, players })!;
    // Body hits: a 6, c 6, b and d none. c has the fewest points (27) but contributed.
    expect(due.group).toMatchObject({ total: 12, hit: false });
    expect(due.results.a).toMatchObject({ bonus: 0, seasonPoints: 39 });
    expect(due.awards.wheel).toEqual(['b', 'd']);
  });

  it('A zero-beer day is broken by anyone who logs a beer that day, and whoever broke it spins', () => {
    const players = { a: week(day('MBW'), { 4: day('MBW', 30, 1) }), b: week(day('M'), { 3: day('M', 30, 2) }), c: ALL };
    const due = settleDue({ ...base, mode: 'bounty', roster: ['a', 'b', 'c'], bounty: { kind: 'dry', date: date(4) }, players })!;
    expect(due.group).toMatchObject({ hit: false, broke: ['a'], total: 2, needed: 3 });
    expect(due.awards.wheel).toEqual(['a']);
  });

  it('A screen-time day is broken by anyone at or over the limit, or who logs no screen time that day', () => {
    const players = { a: week(day('MBW'), { 5: day('MBW', 120) }), b: week(day('MBW'), { 5: day('MBW', null) }), c: week(day('MBW'), { 5: day('MBW', 105) }) };
    const due = settleDue({ ...base, mode: 'bounty', roster: ['a', 'b', 'c'], bounty: { kind: 'screen', date: date(5), minutes: 120 }, players })!;
    expect(due.group).toMatchObject({ hit: false, broke: ['a', 'b'] });
    expect(due.awards.wheel).toEqual(['a', 'b']);
  });

  it('Rule One changes points, not what was logged: a Rule One day can still break a Bounty', () => {
    const players = { a: week(day('MBW'), { 4: day('MBW', 30, 3) }, [{ item: 'ruleOne', number: 1, date: date(4) }]), b: ALL };
    const due = settleDue({ ...base, mode: 'bounty', roster: ['a', 'b'], bounty: { kind: 'dry', date: date(4) }, players })!;
    expect(due.group).toMatchObject({ hit: false, broke: ['a'] });
  });

  it('The bar fills live, from what is logged so far', () => {
    const wednesday = DAYS[2]!.start + 10 * H;
    const cells = (data: PlayerWeekData) => playerWeek({ par: 3, days: DAYS, logs: data.logs, kit: data.kit, demolitionsOn: [], adjustments: [], now: wednesday }).cells;
    const progress = bountyProgress({ kind: 'hits', lane: 'any', count: 30 }, { a: cells(ALL), b: cells(ONE) });
    // Monday to Wednesday: a 3 goals a day, b 1.
    expect(progress).toMatchObject({ total: 12, needed: 30, hit: false, contributions: { a: 9, b: 3 } });
  });

  it('Targets assume one rest day per player: 60 Body hits is the most 10 players can reach', () => {
    expect(bountyMax('body', 10)).toBe(60);
    expect(bountyMax('any', 10)).toBe(180);
  });

  it('With no target set by the start of the week, the Bounty is 2 goals a day each, any lane, with one rest day', () => {
    expect(defaultBounty(5)).toEqual({ kind: 'hits', lane: 'any', count: 60 });
    const due = settleDue({ ...base, mode: 'bounty', roster: ['a', 'b'], players: { a: ALL, b: TWO } })!;
    // 24 needed; a 18 and b 12 is 30.
    expect(due.group).toMatchObject({ target: { kind: 'hits', lane: 'any', count: 24 }, hit: true });
  });

  it('A target reads as plain words: what, how many, and which day', () => {
    expect(bountyText({ kind: 'hits', lane: 'body', count: 60 })).toBe('60 Body hits across the league');
    expect(bountyText({ kind: 'hits', lane: 'any', count: 48 })).toBe('48 goals hit across the league');
    expect(bountyText({ kind: 'dry', date: date(4) })).toBe('No beers league-wide on Friday');
    expect(bountyText({ kind: 'screen', date: date(5), minutes: 120 })).toBe('Everyone under 2 hours of screen time on Saturday');
    expect(bountyText({ kind: 'screen', date: date(5), minutes: 90 })).toBe('Everyone under 1 hour 30 minutes of screen time on Saturday');
    expect(bountyText({ kind: 'screen', date: date(5), minutes: 45 })).toBe('Everyone under 45 minutes of screen time on Saturday');
  });

  it('A target names a lane and a count, or a day of the week and, for screen time, a limit', () => {
    const dates = DAYS.map((each) => each.date);
    expect(validBounty({ kind: 'hits', lane: 'body', count: 60 }, dates)).toBe(true);
    expect(validBounty({ kind: 'hits', lane: 'any', count: 0 }, dates)).toBe(false);
    expect(validBounty({ kind: 'dry', date: date(4) }, dates)).toBe(true);
    expect(validBounty({ kind: 'dry', date: '2027-01-25' }, dates)).toBe(false);
    expect(validBounty({ kind: 'screen', date: date(5), minutes: 120 }, dates)).toBe(true);
    expect(validBounty({ kind: 'screen', date: date(5), minutes: 100 }, dates)).toBe(false);
  });
});

describe('Group play: Alley', () => {
  it('Race points are your daily points, and a day with no goals hits the wall for 2 more, except your rest day', () => {
    const due = settleDue({ ...base, mode: 'alley', roster: ['a', 'b'], players: { a: ALL, b: NONE } })!;
    // b: 21 points, and 6 walls (never Sunday, the rest day) is 21 - 12 = 9.
    expect(due.results.b?.race).toEqual({ points: 9, walls: 6, place: 2 });
    expect(due.results.a?.race).toEqual({ points: 39, walls: 0, place: 1 });
  });

  it('1st, 2nd and 3rd earn 5, 3 and 1, and Season Points still count real points, not race points', () => {
    const due = settleDue({ ...base, mode: 'alley', roster: ['a', 'b', 'c', 'd'], players: { a: ALL, b: NONE, c: TWO, d: ONE } })!;
    expect(due.results.a).toMatchObject({ opponent: GROUP, mode: 'alley', outcome: 'none', bonus: 5, seasonPoints: 44 });
    expect(due.results.c).toMatchObject({ bonus: 3, seasonPoints: 36 });
    expect(due.results.d).toMatchObject({ bonus: 1, seasonPoints: 28 });
    expect(due.results.b).toMatchObject({ bonus: 0, seasonPoints: 21 });
  });

  it('Last place in the race spins the Wheel, even when someone else has fewer points', () => {
    // e logs one goal and 2 beers a day: 2 a day, 15 in all, but never hits the wall.
    const due = settleDue({ ...base, mode: 'alley', roster: ['a', 'b', 'e'], players: { a: ALL, b: NONE, e: week(day('M', 30, 2)) } })!;
    expect(due.results.e?.race).toMatchObject({ points: 15, place: 2 });
    expect(due.awards.wheel).toEqual(['b']);
  });

  it('A tie in the race goes to fewer beers; still level shares the place and its bonus', () => {
    const race = alleyRace({
      a: cells(ALL),
      b: cells(ALL),
      c: cells(week(day('MBW'), { 0: day('MBW', 30, 1) })),
      d: cells(TWO),
    });
    expect(race.map((row) => [row.player, row.race, row.place])).toEqual([
      ['a', 39, 1],
      ['b', 39, 1],
      ['c', 38, 3],
      ['d', 33, 4],
    ]);
    const due = settleDue({ ...base, mode: 'alley', roster: ['a', 'b', 'd'], players: { a: ALL, b: ALL, d: TWO } })!;
    expect(due.results.a).toMatchObject({ bonus: 5 });
    expect(due.results.b).toMatchObject({ bonus: 5 });
    expect(due.results.d).toMatchObject({ bonus: 1 });
  });

  it('A Rule One day never hits the wall', () => {
    const due = settleDue({ ...base, mode: 'alley', roster: ['a', 'b'], players: { a: ALL, b: week(day(''), { 0: null }, [{ item: 'ruleOne', number: 1, date: date(0) }]) } })!;
    expect(due.results.b?.race).toMatchObject({ walls: 5 });
  });
});

describe('Group play: Drop Shot', () => {
  it('Each day the higher score lands hits on the other floor equal to the margin, up to 4', () => {
    expect(dropShotHits(10, 7)).toEqual({ a: 3, b: 0 });
    expect(dropShotHits(20, 7)).toEqual({ a: 4, b: 0 });
    expect(dropShotHits(3, 9)).toEqual({ a: 0, b: 4 });
    expect(dropShotHits(7, 7)).toEqual({ a: 0, b: 0 });
  });

  it('Each of the 20 tiles takes 2 hits: cracked, then broken', () => {
    expect([0, 1, 2, 3, 7, 40, 50].map(tilesBroken)).toEqual([0, 0, 1, 1, 3, 20, 20]);
  });

  it('Most tiles broken wins, then most hits landed, then fewer beers; still level is a draw', () => {
    expect(decideDropShot({ hits: 8, beers: 5 }, { hits: 6, beers: 0 })).toEqual({ a: 'win', b: 'loss', decidedBy: 'tiles' });
    expect(decideDropShot({ hits: 7, beers: 5 }, { hits: 6, beers: 0 })).toEqual({ a: 'win', b: 'loss', decidedBy: 'hits' });
    expect(decideDropShot({ hits: 6, beers: 2 }, { hits: 6, beers: 1 })).toEqual({ a: 'loss', b: 'win', decidedBy: 'beers' });
    expect(decideDropShot({ hits: 6, beers: 1 }, { hits: 6, beers: 1 })).toEqual({ a: 'draw', b: 'draw', decidedBy: 'none' });
  });

  it('Winning more days beats one blowout: the winner gets 5, and both keep their own points', () => {
    // a wins Monday 6 to -5 (4 hits); b wins Tuesday to Thursday 6 to 4 (2 hits each, 6 in all).
    const a = week(day('MBW'), { 1: day('M'), 2: day('M'), 3: day('M') });
    const b = week(day('MBW'), { 0: null });
    const due = settleDue({ ...base, mode: 'dropShot', pairs: [{ a: 'a', b: 'b' }], players: { a, b } })!;
    expect(due.results.a).toMatchObject({ mode: 'dropShot', points: 33, opponentPoints: 28, outcome: 'loss', decidedBy: 'tiles', bonus: 0, seasonPoints: 33 });
    expect(due.results.a?.floor).toEqual({ hits: 4, tiles: 2, opponentHits: 6, opponentTiles: 3 });
    expect(due.results.b).toMatchObject({ outcome: 'win', bonus: 5, seasonPoints: 33 });
  });

  it("Against The House, the House's day is everyone else's average, and a margin under a whole point lands nothing", () => {
    const due = settleDue({ ...base, mode: 'dropShot', pairs: [{ a: 'a', b: 'b' }, { a: 'c', b: HOUSE }], players: { a: ALL, b: TWO, c: ALL } })!;
    // The House's day is (6 + 5) / 2 = 5.5, so c wins each day by half a point: no hits either way.
    expect(due.results.c).toMatchObject({ opponent: HOUSE, outcome: 'draw', bonus: 2, seasonPoints: 41 });
    expect(due.results.c?.floor).toEqual({ hits: 0, tiles: 0, opponentHits: 0, opponentTiles: 0 });
    expect(due.results.a).toMatchObject({ outcome: 'win', bonus: 5 });
    expect(due.results.a?.floor).toMatchObject({ hits: 6, tiles: 3 });
  });
});

describe('Group play and the standings', () => {
  it("Team Week, 2v2, Bounty and Alley aren't head-to-head games: a tie in Season Points skips to the next tiebreak", () => {
    const rows = standingsFrom({
      members: ['a', 'b'],
      weeks: [{ results: { a: { player: 'a', opponent: GROUP, seasonPoints: 30, outcome: 'win', beers: 0 }, b: { player: 'b', opponent: GROUP, seasonPoints: 30, outcome: 'loss', beers: 0 } }, lines: [] }],
      coins: { a: 2, b: 1 },
    });
    expect(rows.map((row) => [row.player, row.tieBreak])).toEqual([
      ['b', 'coinFlip'],
      ['a', 'coinFlip'],
    ]);
  });

  it('Bounty and Alley weeks count toward nobody’s wins, draws or losses', () => {
    const bounty = settleDue({ ...base, mode: 'bounty', roster: ['a', 'b'], players: { a: ALL, b: TWO } })!;
    const alley = settleDue({ ...base, mode: 'alley', roster: ['a', 'b'], players: { a: ALL, b: TWO } })!;
    for (const due of [bounty, alley]) for (const result of Object.values(due.results)) expect(result.outcome).toBe('none');
  });

  it("Everyone in the week: the 1v1 pairs, the squads, the duos, or the whole roster", () => {
    expect(weekPlayers({ mode: 'regular', pairs: [{ a: 'b', b: 'a' }, { a: 'c', b: HOUSE }] })).toEqual(['a', 'b', 'c']);
    expect(weekPlayers({ mode: 'teamWeek', teams: { blue: ['b'], orange: ['a'] } })).toEqual(['a', 'b']);
    expect(weekPlayers({ mode: 'twoVTwo', duos: [{ a: ['c', 'd'], b: [HOUSE] }], roster: ['a', 'b', 'c', 'd'] })).toEqual(['c', 'd']);
    expect(weekPlayers({ mode: 'twoVTwo', roster: ['b', 'a'] })).toEqual(['a', 'b']);
    expect(weekPlayers({ mode: 'alley', roster: ['b', 'a'] })).toEqual(['a', 'b']);
  });
});

/** A player's settled week, day by day. */
function cells(data: PlayerWeekData) {
  return playerWeek({ par: 3, days: DAYS, logs: data.logs, kit: data.kit, demolitionsOn: [], adjustments: [], now: SUNDAY_LOCK }).cells;
}
