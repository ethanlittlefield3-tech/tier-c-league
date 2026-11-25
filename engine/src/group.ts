/**
 * Group play (SCOPE.md, "Group play"): the modes that replace a week's 1v1.
 * Your own points always count; the mode only decides the bonus on top, and,
 * for the Bounty and the Alley, who spins the Wheel.
 *
 * - Team Week and 2v2: sides compare average points per player.
 * - Bounty Week: the whole league chases one target.
 * - Alley: everyone races single file on race points.
 * - Drop Shot: a 1v1 scored by floor tiles broken, day by day.
 * - Rumble is a 1v1 whose items change the days themselves (`rumble.ts`).
 */
import { WEEKDAYS, weekdayIndex, type DateStr } from './calendar.ts';
import type { DayCell } from './days.ts';
import { LANES, RULES, type Lane } from './scoring.ts';
import { GROUP, HOUSE, type WeekMode } from './schedule.ts';
import { houseSide, matchupBonus, type Decision, type MatchResult, type Outcome, type Side, type SideLine } from './week.ts';

type DecidedBy = Decision['decidedBy'];

/** Everyone in a week: the 1v1 pairs, the squads, the duos, or else the whole roster. Sorted. */
export function weekPlayers(week: {
  mode?: WeekMode | string;
  pairs?: readonly { a: string; b: string }[];
  teams?: { blue: readonly string[]; orange: readonly string[] } | null;
  duos?: readonly { a: readonly string[]; b: readonly string[] }[] | null;
  roster?: readonly string[] | null;
}): string[] {
  let players: readonly string[];
  if (week.mode === 'teamWeek' && week.teams) players = [...week.teams.blue, ...week.teams.orange];
  else if (week.mode === 'twoVTwo' && week.duos && week.duos.length > 0) players = week.duos.flatMap((match) => [...match.a, ...match.b]);
  else if (week.pairs && week.pairs.length > 0) players = week.pairs.flatMap((pair) => [pair.a, pair.b]);
  else players = week.roster ?? [];
  return [...new Set(players)].filter((player) => player !== HOUSE).sort();
}

// ---- Team Week and 2v2 --------------------------------------------------

/** A side's totals: points and beers summed over `size` players. */
export interface SideTotals {
  points: number;
  beers: number;
  size: number;
}

/**
 * Most average points wins; a tie goes to fewer average beers; still level
 * is a draw. Averages are compared as fractions, so equal ones are equal.
 */
export function decideSides(a: SideTotals, b: SideTotals): Decision {
  const points = a.points * b.size - b.points * a.size;
  if (points !== 0) return points > 0 ? { a: 'win', b: 'loss', decidedBy: 'points' } : { a: 'loss', b: 'win', decidedBy: 'points' };
  const beers = a.beers * b.size - b.beers * a.size;
  if (beers !== 0) return beers < 0 ? { a: 'win', b: 'loss', decidedBy: 'beers' } : { a: 'loss', b: 'win', decidedBy: 'beers' };
  return { a: 'draw', b: 'draw', decidedBy: 'none' };
}

/** The winning side gets 3 each. A draw adds nothing (provisional: DECISIONS.md, "Still open"). */
export function sideBonus(outcome: Outcome): number {
  return outcome === 'win' ? RULES.sideBonus : 0;
}

/** A 2v2 matchup: two duos, or a duo and `[HOUSE]`, the House duo. */
export interface DuoMatch {
  a: string[];
  b: string[];
}

/** The random 2v2 draw: players pair off in the drawn order, and with an odd count the last three are a trio. */
export function randomDuos(order: readonly string[]): string[][] {
  const teams: string[][] = [];
  for (let at = 0; at + 1 < order.length; at += 2) teams.push([order[at]!, order[at + 1]!]);
  if (order.length % 2 === 1 && order.length > 0) {
    const last = teams.at(-1);
    if (last) last.push(order.at(-1)!);
    else teams.push([order[0]!]);
  }
  return teams;
}

/**
 * "Frenemies": each player's duo partner is their Week 1 rival. Players whose
 * rival is The House or has left pair up with each other in the drawn order,
 * and one left over joins the duo drawn last as its third. The duos are then
 * put in the drawn order: a duo is as early as its earliest player.
 */
export function frenemyDuos(rivals: readonly { a: string; b: string }[], order: readonly string[]): string[][] {
  const here = new Set(order);
  const position = (player: string) => order.indexOf(player);
  const teams: string[][] = [];
  const paired = new Set<string>();
  for (const { a, b } of rivals) {
    if (here.has(a) && here.has(b) && !paired.has(a) && !paired.has(b)) {
      teams.push([a, b]);
      paired.add(a);
      paired.add(b);
    }
  }
  const left = order.filter((player) => !paired.has(player));
  for (let at = 0; at + 1 < left.length; at += 2) teams.push([left[at]!, left[at + 1]!]);
  const earliest = (team: readonly string[]) => Math.min(...team.map(position));
  teams.sort((x, y) => earliest(x) - earliest(y));
  if (left.length % 2 === 1) {
    const last = teams.at(-1);
    if (last) last.push(left.at(-1)!);
    else teams.push([left.at(-1)!]);
  }
  return teams;
}

/**
 * Duos face duos in order. With an odd number of them, the first duo of two
 * (never the trio) faces a House duo, and is listed first.
 */
export function duoMatches(teams: readonly (readonly string[])[]): DuoMatch[] {
  const rest = teams.map((team) => [...team]);
  const matches: DuoMatch[] = [];
  if (rest.length % 2 === 1) {
    const odd = Math.max(0, rest.findIndex((team) => team.length === 2));
    matches.push({ a: rest.splice(odd, 1)[0]!, b: [HOUSE] });
  }
  for (let at = 0; at + 1 < rest.length; at += 2) matches.push({ a: rest[at]!, b: rest[at + 1]! });
  return matches;
}

/** A side's totals from each player's week. */
function totalsOf(players: readonly string[], totals: Readonly<Record<string, Side>>): SideTotals {
  let points = 0;
  let beers = 0;
  for (const player of players) {
    points += totals[player]?.points ?? 0;
    beers += totals[player]?.beers ?? 0;
  }
  return { points, beers, size: Math.max(1, players.length) };
}

function line(name: string, players: readonly string[], sums: SideTotals): SideLine {
  return { name, players: [...players], points: sums.points / sums.size, beers: sums.beers / sums.size };
}

export interface SideMatchResult {
  a: SideLine;
  b: SideLine;
  winner: 'a' | 'b' | null;
  decidedBy: DecidedBy;
}

/**
 * Team Week (one match, blue against orange) or 2v2 (every duo match). A
 * House duo scores the average of everyone outside the duo it faces.
 */
export function settleSides(
  mode: 'teamWeek' | 'twoVTwo',
  matches: readonly { a: { name: string; players: readonly string[] }; b: { name: string; players: readonly string[] } }[],
  totals: Readonly<Record<string, Side>>,
): { results: Record<string, MatchResult>; matches: SideMatchResult[] } {
  const facingHouse = new Set(matches.filter((match) => match.b.players.includes(HOUSE)).flatMap((match) => match.a.players));
  const house = totalsOf(Object.keys(totals).filter((player) => !facingHouse.has(player)), totals);

  const results: Record<string, MatchResult> = {};
  const settled: SideMatchResult[] = [];
  for (const match of matches) {
    const sumA = totalsOf(match.a.players, totals);
    const isHouse = match.b.players.includes(HOUSE);
    const sumB = isHouse ? house : totalsOf(match.b.players, totals);
    const lineA = line(match.a.name, match.a.players, sumA);
    const lineB = line(isHouse ? 'house' : match.b.name, isHouse ? [HOUSE] : match.b.players, sumB);
    const decision = decideSides(sumA, sumB);
    settled.push({ a: lineA, b: lineB, winner: decision.a === 'win' ? 'a' : decision.b === 'win' ? 'b' : null, decidedBy: decision.decidedBy });
    const record = (player: string, outcome: Outcome, mine: SideLine, theirs: SideLine) => {
      const own = totals[player] ?? { points: 0, beers: 0 };
      const bonus = sideBonus(outcome);
      results[player] = {
        player,
        opponent: GROUP,
        points: own.points,
        beers: own.beers,
        opponentPoints: theirs.points,
        opponentBeers: theirs.beers,
        outcome,
        decidedBy: decision.decidedBy,
        bonus,
        seasonPoints: own.points + bonus,
        mode,
        side: mine,
        against: theirs,
      };
    };
    for (const player of match.a.players) record(player, decision.a, lineA, lineB);
    if (!isHouse) for (const player of match.b.players) record(player, decision.b, lineB, lineA);
  }
  return { results, matches: settled };
}

// ---- Bounty Week ---------------------------------------------------------

/**
 * The league's one shared target (SCOPE.md, "Bounty Week"):
 * - `hits`: goals hit in a lane (or any lane) across the league, like "60 Body hits".
 * - `dry`: nobody logs a beer on a day, like "zero beers league-wide on Friday".
 * - `screen`: everyone logs under a limit on a day, like "everyone under 2 hours on Saturday".
 */
export type BountyTarget =
  | { kind: 'hits'; lane: Lane | 'any'; count: number }
  | { kind: 'dry'; date: DateStr }
  | { kind: 'screen'; date: DateStr; minutes: number };

const LANE_WORDS: Record<Lane, string> = { mind: 'Mind', body: 'Body', wildcard: 'Wildcard' };

/** A screen-time limit in words: "2 hours", "1 hour 30 minutes", "45 minutes". */
function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts = [hours > 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : '', rest > 0 ? `${rest} minutes` : ''].filter(Boolean);
  return parts.join(' ');
}

/** A target in plain words, for the Bounty bar, the commish and the feed. */
export function bountyText(target: BountyTarget): string {
  if (target.kind === 'hits') return `${target.count} ${target.lane === 'any' ? 'goals hit' : `${LANE_WORDS[target.lane]} hits`} across the league`;
  const day = WEEKDAYS[weekdayIndex(target.date)];
  if (target.kind === 'dry') return `No beers league-wide on ${day}`;
  return `Everyone under ${duration(target.minutes)} of screen time on ${day}`;
}

/** Targets assume one rest day per player: the most a hits target can reach is 6 days each. */
export function bountyMax(lane: Lane | 'any', players: number): number {
  return players * 6 * (lane === 'any' ? LANES.length : 1);
}

/** With no target set by the start of the week: 2 goals a day each, any lane, with one rest day. */
export function defaultBounty(players: number): BountyTarget {
  return { kind: 'hits', lane: 'any', count: players * 6 * 2 };
}

/** A target the commish can set: a lane and a count, or one of the week's days and, for screen time, a limit. */
export function validBounty(target: unknown, dates: readonly DateStr[]): target is BountyTarget {
  if (typeof target !== 'object' || target === null) return false;
  const value = target as Record<string, unknown>;
  if (value.kind === 'hits') {
    return Object.keys(value).length === 3 && (value.lane === 'any' || LANES.includes(value.lane as Lane)) && Number.isInteger(value.count) && (value.count as number) >= 1 && (value.count as number) <= bountyMax('any', 12);
  }
  if (value.kind === 'dry') return Object.keys(value).length === 2 && dates.includes(value.date as DateStr);
  if (value.kind === 'screen') {
    const minutes = value.minutes as number;
    return Object.keys(value).length === 3 && dates.includes(value.date as DateStr) && Number.isInteger(minutes) && minutes >= 15 && minutes <= 1440 && minutes % RULES.screenStepMinutes === 0;
  }
  return false;
}

export interface BountyProgress {
  target: BountyTarget;
  /** Hits so far, or how many players have kept the day so far. */
  total: number;
  /** The count, or everyone. */
  needed: number;
  /** Each player's part: their hits, or 1 for keeping the day and 0 for breaking it. */
  contributions: Record<string, number>;
  /** Who broke a day target. */
  broke: string[];
  /** Hit as things stand. A day target is only safe once its day locks. */
  hit: boolean;
}

/**
 * How the Bounty stands, from each player's week so far. Rule One changes
 * points, not what was logged: a Rule One day's goals still count, and its
 * beers or screen time can still break a day target. Full Boost counts as a
 * hit, as it does everywhere.
 */
export function bountyProgress(target: BountyTarget, weeks: Readonly<Record<string, readonly DayCell[]>>): BountyProgress {
  const contributions: Record<string, number> = {};
  const broke: string[] = [];
  const players = Object.keys(weeks).sort();
  for (const player of players) {
    const cells = weeks[player] ?? [];
    if (target.kind === 'hits') {
      let hits = 0;
      for (const cell of cells) {
        if (!cell.score) continue;
        for (const lane of LANES) {
          if (target.lane !== 'any' && lane !== target.lane) continue;
          const state = cell.score.goals[lane];
          if (state === 'hit' || state === 'boosted') hits += 1;
        }
      }
      contributions[player] = hits;
      continue;
    }
    const score = cells.find((cell) => cell.date === target.date)?.score ?? null;
    let broken = false;
    if (score && target.kind === 'dry') broken = score.beers > 0;
    if (score && target.kind === 'screen') {
      broken = score.screen.state === 'logged' ? (score.screen.minutes ?? 0) >= target.minutes : score.screen.state !== 'pending';
    }
    contributions[player] = broken ? 0 : 1;
    if (broken) broke.push(player);
  }
  const total = Object.values(contributions).reduce((sum, value) => sum + value, 0);
  const needed = target.kind === 'hits' ? target.count : players.length;
  return { target, total, needed, contributions, broke, hit: target.kind === 'hits' ? total >= needed : broke.length === 0 };
}

/**
 * Who spins when the Bounty is missed: the lowest contributor, every tied
 * one, or whoever broke a day target. `null` when it was hit, so the Wheel
 * goes to the lowest points as usual.
 */
export function bountySpinners(progress: BountyProgress): string[] | null {
  if (progress.hit) return null;
  if (progress.target.kind !== 'hits') return [...progress.broke];
  const values = Object.values(progress.contributions);
  if (values.length === 0) return [];
  const lowest = Math.min(...values);
  return Object.keys(progress.contributions)
    .filter((player) => progress.contributions[player] === lowest)
    .sort();
}

// ---- Alley ---------------------------------------------------------------

export interface AlleyRow {
  player: string;
  /** Race points: the week's points, plus 2 off for each wall. */
  race: number;
  walls: number;
  /** Real points, which are what count toward Season Points. */
  points: number;
  beers: number;
  /** 1 for the front; players level on race points and beers share a place. */
  place: number;
}

/** A locked goal day with no goals hit hits the wall. A rest day or a Rule One day never does. */
export function hitsWall(cell: DayCell): boolean {
  const score = cell.score;
  if (!score || cell.state !== 'locked' || score.restDay || score.kind === 'ruleOne') return false;
  return score.goalPoints === 0;
}

/** The race as it stands: most race points first, then fewer beers; level shares the place. */
export function alleyRace(weeks: Readonly<Record<string, readonly DayCell[]>>): AlleyRow[] {
  const rows = Object.entries(weeks).map(([player, cells]) => {
    let points = 0;
    let beers = 0;
    let walls = 0;
    for (const cell of cells) {
      if (!cell.score) continue;
      points += cell.score.total;
      beers += cell.score.beers;
      if (hitsWall(cell)) walls += 1;
    }
    return { player, race: points + walls * RULES.alleyWall, walls, points, beers, place: 0 };
  });
  rows.sort((x, y) => y.race - x.race || x.beers - y.beers || (x.player < y.player ? -1 : 1));
  rows.forEach((row, at) => {
    const before = rows[at - 1];
    row.place = before && before.race === row.race && before.beers === row.beers ? before.place : at + 1;
  });
  return rows;
}

/** 1st, 2nd and 3rd earn 5, 3 and 1. */
export function alleyBonus(place: number): number {
  return RULES.alleyBonus[place - 1] ?? 0;
}

// ---- Drop Shot -----------------------------------------------------------

/**
 * One day: the higher score lands hits on the other floor equal to the
 * margin, up to 4. Against The House a margin under a whole point lands
 * nothing.
 */
export function dropShotHits(a: number, b: number): { a: number; b: number } {
  const hits = Math.min(RULES.dropShotDailyHits, Math.floor(Math.abs(a - b)));
  return a > b ? { a: hits, b: 0 } : { a: 0, b: hits };
}

/** Each tile takes 2 hits, cracked and then broken, so the floor breaks tile by tile. */
export function tilesBroken(hits: number): number {
  return Math.min(RULES.dropShotTiles, Math.floor(hits / RULES.dropShotHitsPerTile));
}

/** Most tiles broken wins, then most hits landed, then fewer beers; still level is a draw. */
export function decideDropShot(a: { hits: number; beers: number }, b: { hits: number; beers: number }): Decision {
  const steps: [number, number, DecidedBy][] = [
    [tilesBroken(a.hits), tilesBroken(b.hits), 'tiles'],
    [a.hits, b.hits, 'hits'],
    [-a.beers, -b.beers, 'beers'],
  ];
  for (const [x, y, by] of steps) {
    if (x !== y) return x > y ? { a: 'win', b: 'loss', decidedBy: by } : { a: 'loss', b: 'win', decidedBy: by };
  }
  return { a: 'draw', b: 'draw', decidedBy: 'none' };
}

/** Hits each side has landed, from both sides' day totals in order. `null` is a day with no score yet. */
export function dropShotFloors(a: readonly (number | null)[], b: readonly (number | null)[]): { a: number[]; b: number[] } {
  const daily = { a: [] as number[], b: [] as number[] };
  a.forEach((mine, at) => {
    const theirs = b[at] ?? null;
    const hits = mine === null || theirs === null ? { a: 0, b: 0 } : dropShotHits(mine, theirs);
    daily.a.push(hits.a);
    daily.b.push(hits.b);
  });
  return daily;
}

export interface FloorResult {
  a: string;
  b: string;
  /** Hits each side landed on the other's floor, day by day. */
  aDaily: number[];
  bDaily: number[];
  winner: 'a' | 'b' | null;
  decidedBy: DecidedBy;
}

/**
 * Every Drop Shot 1v1 of a week. The House's day is the average of everyone
 * not facing it that day; its beers are the week's average beers.
 */
export function settleDropShot(
  pairs: readonly { a: string; b: string }[],
  weeks: Readonly<Record<string, readonly DayCell[]>>,
  totals: Readonly<Record<string, Side>>,
): { results: Record<string, MatchResult>; house: Side | null; floors: FloorResult[] } {
  const dates = [...new Set(Object.values(weeks).flatMap((cells) => cells.map((cell) => cell.date)))].sort();
  const dayOf = (player: string) => dates.map((date) => weeks[player]?.find((cell) => cell.date === date)?.score?.total ?? null);
  const bye = new Set(pairs.flatMap((pair) => (pair.a === HOUSE ? [pair.b] : pair.b === HOUSE ? [pair.a] : [])));
  const others = Object.keys(totals).filter((player) => !bye.has(player));
  const house = bye.size > 0 ? houseSide(others.map((player) => totals[player]!)) : null;
  const houseDays = dates.map((_, at) => {
    const scores = others.map((player) => dayOf(player)[at]).filter((score): score is number => score !== null);
    return scores.length === 0 ? null : scores.reduce((sum, score) => sum + score, 0) / scores.length;
  });
  const sideOf = (player: string): Side => (player === HOUSE ? (house ?? { points: 0, beers: 0 }) : (totals[player] ?? { points: 0, beers: 0 }));
  const daysOf = (player: string) => (player === HOUSE ? houseDays : dayOf(player));

  const results: Record<string, MatchResult> = {};
  const floors: FloorResult[] = [];
  for (const { a, b } of pairs) {
    const daily = dropShotFloors(daysOf(a), daysOf(b));
    const hitsA = daily.a.reduce((sum, hits) => sum + hits, 0);
    const hitsB = daily.b.reduce((sum, hits) => sum + hits, 0);
    const sideA = sideOf(a);
    const sideB = sideOf(b);
    const decision = decideDropShot({ hits: hitsA, beers: sideA.beers }, { hits: hitsB, beers: sideB.beers });
    floors.push({ a, b, aDaily: daily.a, bDaily: daily.b, winner: decision.a === 'win' ? 'a' : decision.b === 'win' ? 'b' : null, decidedBy: decision.decidedBy });
    const record = (player: string, opponent: string, mine: Side, theirs: Side, outcome: Outcome, hits: number, against: number) => {
      const bonus = matchupBonus(outcome);
      results[player] = {
        player,
        opponent,
        points: mine.points,
        beers: mine.beers,
        opponentPoints: theirs.points,
        opponentBeers: theirs.beers,
        outcome,
        decidedBy: decision.decidedBy,
        bonus,
        seasonPoints: mine.points + bonus,
        mode: 'dropShot',
        floor: { hits, tiles: tilesBroken(hits), opponentHits: against, opponentTiles: tilesBroken(against) },
      };
    };
    if (a !== HOUSE) record(a, b, sideA, sideB, decision.a, hitsA, hitsB);
    if (b !== HOUSE) record(b, a, sideB, sideA, decision.b, hitsB, hitsA);
  }
  return { results, house, floors };
}

// ---- A week's group-play summary, kept on the week for the feed and League ----

export type GroupSummary =
  | { mode: 'teamWeek' | 'twoVTwo'; matches: SideMatchResult[] }
  | ({ mode: 'bounty' } & BountyProgress)
  | { mode: 'alley'; race: AlleyRow[] }
  | { mode: 'dropShot'; floors: FloorResult[] };
