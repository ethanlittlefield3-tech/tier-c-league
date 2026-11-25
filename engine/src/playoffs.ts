/**
 * The playoffs (SCOPE.md, "Playoffs"): the top 4 in Season Points play short
 * sprint rounds with a fresh kit each round, no Rule One and no rest days,
 * and sudden death if the final ties. Everyone else plays the Whiff Bowl on
 * the same days, for "not last".
 *
 * Each round is its own period, so its kit is fresh: `p01` the semifinals,
 * `p02` the final, `p03` sudden death. A reset day between the rounds belongs to
 * the final's period, so its power-ups can be set before it starts.
 */
import { addDays, dayEnd, dayLock, dayStart, wallTimeToInstant, type DateStr } from './calendar.ts';
import { LATE_REQUEST_HOUR } from './receipts.ts';
import type { CalendarDay, KitName, SeasonPlan } from './season.ts';

export interface PlayoffSettings {
  playoffs: 'none' | 'oneWeek' | 'twoWeeks';
  playoffSize: 2 | 4;
}

export const PLAYOFF_PERIODS = { semi: 'p01', final: 'p02', suddenDeath: 'p03' } as const;
export type PlayoffPeriod = (typeof PLAYOFF_PERIODS)[keyof typeof PLAYOFF_PERIODS];

const FULL_KIT: KitName[] = ['aerial', 'demolition', 'fullBoost'];

/** The rounds a season plays: semifinal and final with four, the final alone with two, none without playoffs. */
export function playoffRounds(settings: PlayoffSettings): PlayoffPeriod[] {
  if (settings.playoffs === 'none') return [];
  return settings.playoffSize === 4 ? ['p01', 'p02'] : ['p02'];
}

/**
 * Each playoff day, counted from the first playoff Monday: its round, and
 * whether it is a reset day. Top 2 is always the final alone, Monday to
 * Saturday, with sudden death on Sunday, whatever the length setting.
 */
function playoffLayout(settings: PlayoffSettings): { offset: number; period: PlayoffPeriod; kind: 'play' | 'reset' }[] {
  if (settings.playoffs === 'none') return [];
  const run = (from: number, count: number, period: PlayoffPeriod) => Array.from({ length: count }, (_, at) => ({ offset: from + at, period, kind: 'play' as const }));
  if (settings.playoffSize === 2) return [...run(0, 6, 'p02'), ...run(6, 1, 'p03')];
  if (settings.playoffs === 'oneWeek') return [...run(0, 3, 'p01'), { offset: 3, period: 'p02', kind: 'reset' }, ...run(4, 3, 'p02'), ...run(7, 1, 'p03')];
  return [...run(0, 6, 'p01'), { offset: 6, period: 'p02', kind: 'reset' }, ...run(7, 6, 'p02'), ...run(13, 1, 'p03')];
}

/** The first playoff Monday: the Monday after the last regular week. */
export function playoffMonday(season: SeasonPlan): DateStr {
  return addDays(season.kickoff, 7 * season.regularWeeks);
}

/**
 * The playoff days for the calendar the rules read. Every day still locks at
 * noon the next day. Sudden death and the reset day have no kit; a round's
 * kit opens when its first day, or the reset day before it, starts.
 */
export function playoffCalendar(season: SeasonPlan & PlayoffSettings): CalendarDay[] {
  const zone = season.timeZone;
  const monday = playoffMonday(season);
  const layout = playoffLayout(season);
  const periodStart = (period: PlayoffPeriod) => dayStart(addDays(monday, Math.min(...layout.filter((day) => day.period === period).map((day) => day.offset))), zone);
  return layout.map(({ offset, period, kind }) => {
    const date = addDays(monday, offset);
    const start = dayStart(date, zone);
    const opens = periodStart(period);
    return {
      date,
      period,
      week: season.regularWeeks + 1 + Math.floor(offset / 7),
      dayIndex: offset % 7,
      phase: 'playoff' as const,
      kind,
      mode: 'regular' as const,
      kit: kind === 'play' && period !== 'p03' ? [...FULL_KIT] : [],
      start,
      noon: wallTimeToInstant(date, 12, 0, zone),
      sixPm: wallTimeToInstant(date, LATE_REQUEST_HOUR, 0, zone),
      end: dayEnd(date, zone),
      lock: dayLock(date, zone),
      nextEnd: dayEnd(addDays(date, 1), zone),
      periodStart: opens,
      // No rest days in the playoffs: these only matter in the regular season.
      sundayStart: opens,
      restOpens: opens,
    };
  });
}

/** Two sides of a playoff game: their points and beers in the round, and their seed (1 is the top). */
export interface Contender {
  points: number;
  beers: number;
  seed: number;
}

/** The semifinals: 1 plays 4, and 2 plays 3. A missing seed is a bye: `b` is `null`. */
export function semifinalPairs(seeds: readonly string[]): { a: string; b: string | null }[] {
  return [
    { a: seeds[0]!, b: seeds[3] ?? null },
    { a: seeds[1]!, b: seeds[2] ?? null },
  ].filter((pair) => pair.a !== undefined);
}

/** A semifinal, or a Whiff Bowl game: more points, then fewer beers in the round, then the higher seed. */
export function decideRound(a: Contender, b: Contender): 'a' | 'b' {
  if (a.points !== b.points) return a.points > b.points ? 'a' : 'b';
  if (a.beers !== b.beers) return a.beers < b.beers ? 'a' : 'b';
  return a.seed < b.seed ? 'a' : 'b';
}

/** The final: more points wins; level points go to sudden death (`null`). */
export function decideFinal(a: { points: number }, b: { points: number }): 'a' | 'b' | null {
  if (a.points === b.points) return null;
  return a.points > b.points ? 'a' : 'b';
}

/**
 * Sudden death: the first to miss any goal loses. If both hit everything, or
 * both missed, the day's points decide, then fewer beers in the round, then
 * the higher seed.
 */
export function decideSuddenDeath(a: Contender & { missed: boolean }, b: Contender & { missed: boolean }): 'a' | 'b' {
  if (a.missed !== b.missed) return a.missed ? 'b' : 'a';
  return decideRound(a, b);
}

/**
 * The Whiff Bowl's first round: everyone outside the playoffs, seeded by
 * Season Points, best against worst. An odd one out, the best seed, is safe.
 */
export function whiffRoundOne(outside: readonly string[]): { pairs: { a: string; b: string }[]; safe: string[] } {
  const rest = [...outside];
  const safe = rest.length % 2 === 1 ? [rest.shift()!] : [];
  const pairs: { a: string; b: string }[] = [];
  while (rest.length >= 2) pairs.push({ a: rest.shift()!, b: rest.pop()! });
  return { pairs, safe };
}

/** The Whiff Bowl's last round, a race for "not last": the fewest points loses, then the most beers, then the lower seed. */
export function whiffLoser(racers: readonly (Contender & { player: string })[]): string {
  return [...racers].sort((x, y) => x.points - y.points || y.beers - x.beers || y.seed - x.seed)[0]!.player;
}

// ---- The bracket ----------------------------------------------------------

/** A playoff or Whiff Bowl game, and how it went once settled. */
export interface BracketGame {
  a: string;
  /** `null` is a bye: `a` goes through. */
  b: string | null;
  winner?: string;
  /** What settled it: points, fewer beers, the higher seed, a bye, or sudden death. */
  decidedBy?: 'points' | 'beers' | 'seed' | 'bye' | 'suddenDeath';
}

/** The season's playoffs, as the weekly job keeps them in `playoffs/bracket`. */
export interface Bracket {
  size: 2 | 4;
  /** The playoff seeds, best first. */
  seeds: string[];
  /** Everyone else, seeded the same way: the Whiff Bowl. */
  outside: string[];
  semis: BracketGame[];
  final: BracketGame | null;
  /** The final was level: sudden death decides it. */
  suddenDeath: boolean;
  whiff: {
    /** Round one, on the semifinal days, with a top 4. */
    pairs: BracketGame[];
    safe: string[];
    /** The last round's racers, for "not last". */
    racers: string[];
    loser: string | null;
  } | null;
  champion: string | null;
  finalist: string | null;
}

/** Each player's round so far: points, beers, and for sudden death whether any goal was missed. */
export type RoundTotals = Record<string, { points: number; beers: number; missed?: boolean }>;

const seedOf = (bracket: Bracket, player: string) => {
  const at = bracket.seeds.indexOf(player);
  return at >= 0 ? at + 1 : bracket.seeds.length + 1 + bracket.outside.indexOf(player);
};

/**
 * The bracket, from the standings once the last regular week posts: the top
 * 4 (or 2) by Season Points, and everyone else in the Whiff Bowl. With fewer
 * than two outside there is no Whiff Bowl.
 */
export function seedBracket(ranked: readonly string[], settings: PlayoffSettings): Bracket | null {
  if (settings.playoffs === 'none' || ranked.length < 2) return null;
  const size = settings.playoffSize;
  const seeds = ranked.slice(0, size);
  const outside = ranked.slice(size);
  const whiff = outside.length < 2 ? null : size === 4 ? { ...whiffRoundOne(outside), racers: [], loser: null } : { pairs: [], safe: [], racers: [...outside], loser: null };
  const bracket: Bracket = {
    size,
    seeds,
    outside,
    semis: size === 4 ? semifinalPairs(seeds) : [],
    final: size === 2 ? { a: seeds[0]!, b: seeds[1] ?? null } : null,
    suddenDeath: false,
    whiff: whiff ? { pairs: whiff.pairs, safe: whiff.safe, racers: whiff.racers, loser: null } : null,
    champion: null,
    finalist: null,
  };
  return bracket;
}

function play(bracket: Bracket, game: BracketGame, totals: RoundTotals): BracketGame {
  if (game.b === null) return { ...game, winner: game.a, decidedBy: 'bye' };
  const side = (player: string) => ({ points: totals[player]?.points ?? 0, beers: totals[player]?.beers ?? 0, seed: seedOf(bracket, player) });
  const a = side(game.a);
  const b = side(game.b);
  const winner = decideRound(a, b) === 'a' ? game.a : game.b;
  const decidedBy = a.points !== b.points ? 'points' : a.beers !== b.beers ? 'beers' : 'seed';
  return { ...game, winner, decidedBy };
}

/**
 * The semifinals settled: each winner goes to the final, 1's half first, and
 * the Whiff Bowl's round-one losers go on to race on the final days. A Whiff
 * Bowl round one with a single loser makes them its loser.
 */
export function settleSemis(bracket: Bracket, totals: RoundTotals): Bracket {
  const semis = bracket.semis.map((game) => play(bracket, game, totals));
  const finalists = semis.map((game) => game.winner!);
  let whiff = bracket.whiff;
  if (whiff) {
    const pairs = whiff.pairs.map((game) => play(bracket, game, totals));
    const losers = pairs.map((game) => (game.winner === game.a ? game.b! : game.a));
    whiff = { ...whiff, pairs, racers: losers, loser: losers.length === 1 ? losers[0]! : null };
  }
  return { ...bracket, semis, final: { a: finalists[0]!, b: finalists[1] ?? null }, whiff };
}

/**
 * The final settled: more points wins, or level points go to sudden death.
 * The Whiff Bowl's racers settle the same days: the fewest points is last.
 */
export function settleFinal(bracket: Bracket, totals: RoundTotals): Bracket {
  const final = bracket.final!;
  let whiff = bracket.whiff;
  if (whiff && !whiff.loser && whiff.racers.length > 0) {
    whiff = { ...whiff, loser: whiffLoser(whiff.racers.map((player) => ({ player, points: totals[player]?.points ?? 0, beers: totals[player]?.beers ?? 0, seed: seedOf(bracket, player) }))) };
  }
  if (final.b === null) return { ...bracket, final: { ...final, winner: final.a, decidedBy: 'bye' }, champion: final.a, finalist: null, whiff };
  const winner = decideFinal({ points: totals[final.a]?.points ?? 0 }, { points: totals[final.b]?.points ?? 0 });
  if (winner === null) return { ...bracket, suddenDeath: true, whiff };
  const champion = winner === 'a' ? final.a : final.b;
  return { ...bracket, final: { ...final, winner: champion, decidedBy: 'points' }, champion, finalist: champion === final.a ? final.b : final.a, whiff };
}

/**
 * Sudden death settled, from its day: `day` is each finalist's sudden-death
 * day (points, and whether a goal was missed), `round` their beers across the
 * final and sudden death.
 */
export function settleSuddenDeath(bracket: Bracket, day: RoundTotals, round: RoundTotals): Bracket {
  const final = bracket.final!;
  const side = (player: string) => ({ missed: day[player]?.missed ?? true, points: day[player]?.points ?? 0, beers: round[player]?.beers ?? 0, seed: seedOf(bracket, player) });
  const champion = decideSuddenDeath(side(final.a), side(final.b!)) === 'a' ? final.a : final.b!;
  return { ...bracket, final: { ...final, winner: champion, decidedBy: 'suddenDeath' }, champion, finalist: champion === final.a ? final.b : final.a };
}
