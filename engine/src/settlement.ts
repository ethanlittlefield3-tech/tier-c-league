/**
 * Settling a week (SCOPE.md, "The week"): once Sunday locks at noon on
 * Monday, results post as provisional; at midnight on Tuesday, when receipt
 * windows close, they are final. Every number comes from the engine, so it
 * matches what each phone showed live. The weekly job settles each week; if
 * it runs late, the commish's phone can post the same results.
 */
import { type Awards, weeklyAwards } from './awards.ts';
import { type CalendarTimes, type DayCell, type KitPlay, playerWeek } from './days.ts';
import {
  alleyBonus,
  alleyRace,
  bountyProgress,
  bountySpinners,
  defaultBounty,
  duoMatches,
  randomDuos,
  settleDropShot,
  settleSides,
  weekPlayers,
  type BountyTarget,
  type DuoMatch,
  type GroupSummary,
} from './group.ts';
import { GROUP, againstPlayer, type WeekMode } from './schedule.ts';
import { RULES, type DayLog, type Lane, type Square } from './scoring.ts';
import { type Game, type RankedRow, rankStandings } from './standings.ts';
import { type MatchResult, type Side, settleWeek } from './week.ts';

export interface PlayerWeekData {
  logs: Record<string, DayLog>;
  kit: KitPlay[];
  adjustments: { date: string; amount: number; void: Square | null }[];
}

export interface WeekLineStored {
  player: string;
  points: number;
  beers: number;
  perfectDays: number;
}

export interface Settled {
  status: 'provisional' | 'final';
  results: Record<string, MatchResult>;
  house: Side | null;
  awards: Awards;
  lines: WeekLineStored[];
  /** How a group-play week went, for the feed and League. `null` for a 1v1 week. */
  group: GroupSummary | null;
}

/** What a group-play week needs from its week document, beyond its pairs. */
export interface GroupWeekInput {
  /** The week's mode; a regular 1v1 when left out. */
  mode?: WeekMode;
  /** Team Week's squads, which hold for the season. */
  teams?: { blue: string[]; orange: string[] } | null;
  /** 2v2's matchups, drawn on the Monday. */
  duos?: DuoMatch[] | null;
  /** Bounty Week's target, if the commish set one. */
  bounty?: BountyTarget | null;
  /** Everyone in a week with no 1v1 pairs. */
  roster?: string[] | null;
}

/** The week settled as of `now`, or `null` while its Sunday hasn't locked. */
export function settleDue(input: GroupWeekInput & {
  week: number;
  period: string;
  par: number;
  timeZone: string;
  /** The week's seven calendar days, with `nextEnd`: midnight after the lock. */
  days: (CalendarTimes & { nextEnd: number })[];
  pairs: { a: string; b: string }[];
  players: Record<string, PlayerWeekData>;
  /** This period's Demolitions: who set it, at whom, which day and lane. */
  demolitions: { player: string; target: string; date: string; lane: Lane }[];
  /** Each player's points in their earlier finished weeks, oldest first, for the Bust. */
  earlier: Record<string, number[]>;
  now: number;
}): Settled | null {
  const last = [...input.days].sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1);
  if (!last || input.now < last.lock) return null;

  const mode = input.mode ?? 'regular';
  const players = weekPlayers({ ...input, mode });
  const totals: Record<string, Side> = {};
  const weeks: Record<string, DayCell[]> = {};
  const lines: WeekLineStored[] = [];
  for (const player of players) {
    const data = input.players[player] ?? { logs: {}, kit: [], adjustments: [] };
    const week = playerWeek({
      par: input.par,
      days: input.days,
      logs: data.logs,
      kit: data.kit,
      demolitionsOn: input.demolitions.filter((hit) => hit.target === player).map((hit) => ({ date: hit.date, lane: hit.lane })),
      adjustments: data.adjustments,
      now: input.now,
    });
    totals[player] = { points: week.totals.points, beers: week.totals.beers };
    weeks[player] = week.cells;
    lines.push({ player, points: week.totals.points, beers: week.totals.beers, perfectDays: week.totals.perfectDays });
  }

  const settled = settleMode(mode, input, players, totals, weeks);
  const awards = weeklyAwards(input.week, lines, input.earlier);
  if (settled.wheel) awards.wheel = settled.wheel;
  return { status: input.now >= last.nextEnd ? 'final' : 'provisional', results: settled.results, house: settled.house, awards, lines, group: settled.group };
}

/** The results of a week by its mode, and who spins when the mode says so. */
function settleMode(
  mode: WeekMode,
  input: GroupWeekInput & { pairs: { a: string; b: string }[] },
  players: string[],
  totals: Record<string, Side>,
  weeks: Record<string, DayCell[]>,
): { results: Record<string, MatchResult>; house: Side | null; group: GroupSummary | null; wheel: string[] | null } {
  const outside = (bonus: (player: string) => number, extra: (player: string) => Partial<MatchResult>) =>
    Object.fromEntries(
      players.map((player) => {
        const own = totals[player]!;
        const result: MatchResult = { player, opponent: GROUP, points: own.points, beers: own.beers, opponentPoints: 0, opponentBeers: 0, outcome: 'none', decidedBy: 'none', bonus: bonus(player), seasonPoints: own.points + bonus(player), mode, ...extra(player) };
        return [player, result];
      }),
    );

  if (mode === 'teamWeek') {
    const teams = input.teams ?? { blue: players.filter((_, at) => at % 2 === 0), orange: players.filter((_, at) => at % 2 === 1) };
    const sides = settleSides(mode, [{ a: { name: 'blue', players: teams.blue }, b: { name: 'orange', players: teams.orange } }], totals);
    return { results: sides.results, house: null, group: { mode, matches: sides.matches }, wheel: null };
  }
  if (mode === 'twoVTwo') {
    // The duos are drawn on the Monday; a week that somehow has none plays them in roster order.
    const matches = input.duos && input.duos.length > 0 ? input.duos : duoMatches(randomDuos(players));
    const sides = settleSides(mode, matches.map((match) => ({ a: { name: 'duo', players: match.a }, b: { name: 'duo', players: match.b } })), totals);
    return { results: sides.results, house: null, group: { mode, matches: sides.matches }, wheel: null };
  }
  if (mode === 'bounty') {
    const progress = bountyProgress(input.bounty ?? defaultBounty(players.length), weeks);
    const results = outside(
      () => (progress.hit ? RULES.bountyBonus : 0),
      (player) => ({ bounty: { counted: progress.contributions[player] ?? 0, broke: progress.broke.includes(player), hit: progress.hit } }),
    );
    return { results, house: null, group: { mode, ...progress }, wheel: bountySpinners(progress) };
  }
  if (mode === 'alley') {
    const race = alleyRace(weeks);
    const placeOf = (player: string) => race.find((row) => row.player === player)!;
    const results = outside(
      (player) => alleyBonus(placeOf(player).place),
      (player) => ({ race: { points: placeOf(player).race, walls: placeOf(player).walls, place: placeOf(player).place } }),
    );
    const last = Math.max(0, ...race.map((row) => row.place));
    return { results, house: null, group: { mode, race }, wheel: race.filter((row) => row.place === last).map((row) => row.player) };
  }
  if (mode === 'dropShot') {
    const settled = settleDropShot(input.pairs, weeks, totals);
    return { results: settled.results, house: settled.house, group: { mode, floors: settled.floors }, wheel: null };
  }
  // A regular 1v1, or Rumble: a 1v1 whose items have already changed the days.
  const { results, house } = settleWeek(
    input.pairs.map((pair) => [pair.a, pair.b] as const),
    totals,
  );
  if (mode === 'rumble') for (const result of Object.values(results)) result.mode = mode;
  return { results, house, group: null, wheel: null };
}

/** The standings from every settled week: Season Points, then the tiebreakers. */
export function standingsFrom(input: {
  members: string[];
  weeks: { results: Record<string, Pick<MatchResult, 'player' | 'opponent' | 'seasonPoints' | 'outcome' | 'beers'>>; lines: WeekLineStored[] }[];
  coins: Record<string, number>;
  /** Season Points taken off, such as 3 for each dodged Wheel dare. */
  penalties?: Record<string, number>;
}): RankedRow[] {
  const rows = input.members.map((player) => {
    let seasonPoints = 0;
    let beers = 0;
    let perfectDays = 0;
    for (const week of input.weeks) {
      const result = week.results[player];
      if (result) {
        seasonPoints += result.seasonPoints;
        beers += result.beers;
      }
      perfectDays += week.lines.find((line) => line.player === player)?.perfectDays ?? 0;
    }
    return { player, seasonPoints: seasonPoints + (input.penalties?.[player] ?? 0), beers, perfectDays, coin: input.coins[player] ?? 1 };
  });

  const games: Game[] = [];
  for (const week of input.weeks) {
    for (const result of Object.values(week.results)) {
      // Only a 1v1 between two real players is a head-to-head game: never The House, a squad, a duo, the Bounty or the Alley.
      if (!againstPlayer(result.opponent) || result.player >= result.opponent || result.outcome === 'none') continue;
      games.push({ a: result.player, b: result.opponent, result: result.outcome === 'win' ? 'a' : result.outcome === 'loss' ? 'b' : 'draw' });
    }
  }
  return rankStandings(rows, games);
}
