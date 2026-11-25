/**
 * Settling a week (SCOPE.md, "The week"): once Sunday locks at noon on
 * Monday, results post as provisional; at midnight on Tuesday, when receipt
 * windows close, they are final. Every number comes from the engine, so it
 * matches what each phone showed live.
 */
import {
  HOUSE,
  playerWeek,
  rankStandings,
  settleWeek,
  weeklyAwards,
  type Awards,
  type CalendarTimes,
  type DayLog,
  type Game,
  type KitPlay,
  type Lane,
  type MatchResult,
  type RankedRow,
  type Side,
  type Square,
} from '../../engine/src/index.ts';

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
}

/** The week settled as of `now`, or `null` while its Sunday hasn't locked. */
export function settleDue(input: {
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

  const players = new Set(input.pairs.flatMap((pair) => [pair.a, pair.b]).filter((player) => player !== HOUSE));
  const totals: Record<string, Side> = {};
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
    lines.push({ player, points: week.totals.points, beers: week.totals.beers, perfectDays: week.totals.perfectDays });
  }

  const { results, house } = settleWeek(
    input.pairs.map((pair) => [pair.a, pair.b] as const),
    totals,
  );
  const awards = weeklyAwards(input.week, lines, input.earlier);
  return { status: input.now >= last.nextEnd ? 'final' : 'provisional', results, house, awards, lines };
}

/** The standings from every settled week: Season Points, then the tiebreakers. */
export function standingsFrom(input: {
  members: string[];
  weeks: { results: Record<string, Pick<MatchResult, 'player' | 'opponent' | 'seasonPoints' | 'outcome' | 'beers'>>; lines: WeekLineStored[] }[];
  coins: Record<string, number>;
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
    return { player, seasonPoints, beers, perfectDays, coin: input.coins[player] ?? 1 };
  });

  const games: Game[] = [];
  for (const week of input.weeks) {
    for (const result of Object.values(week.results)) {
      if (result.opponent === HOUSE || result.player >= result.opponent) continue;
      games.push({ a: result.player, b: result.opponent, result: result.outcome === 'win' ? 'a' : result.outcome === 'loss' ? 'b' : 'draw' });
    }
  }
  return rankStandings(rows, games);
}
