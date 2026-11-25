/**
 * The playoffs (SCOPE.md, "Playoffs"): the top 4 in Season Points play short
 * sprint rounds with a fresh kit each round, no Rule One and no rest days,
 * and sudden death if the final ties. Everyone else plays the Whiff Bowl on
 * the same days, for "not last".
 *
 * Each round is its own period, so its kit is fresh: `p1` the semifinals,
 * `p2` the final, `p3` sudden death. A reset day between the rounds belongs to
 * the final's period, so its power-ups can be set before it starts.
 */
import { addDays, dayEnd, dayLock, dayStart, wallTimeToInstant, type DateStr } from './calendar.ts';
import { LATE_REQUEST_HOUR } from './receipts.ts';
import type { CalendarDay, KitName, SeasonPlan } from './season.ts';

export interface PlayoffSettings {
  playoffs: 'none' | 'oneWeek' | 'twoWeeks';
  playoffSize: 2 | 4;
}

export const PLAYOFF_PERIODS = { semi: 'p1', final: 'p2', suddenDeath: 'p3' } as const;
export type PlayoffPeriod = (typeof PLAYOFF_PERIODS)[keyof typeof PLAYOFF_PERIODS];

const FULL_KIT: KitName[] = ['aerial', 'demolition', 'fullBoost'];

/** The rounds a season plays: semifinal and final with four, the final alone with two, none without playoffs. */
export function playoffRounds(settings: PlayoffSettings): PlayoffPeriod[] {
  if (settings.playoffs === 'none') return [];
  return settings.playoffSize === 4 ? ['p1', 'p2'] : ['p2'];
}

/**
 * Each playoff day, counted from the first playoff Monday: its round, and
 * whether it is a reset day. Top 2 is always the final alone, Monday to
 * Saturday, with sudden death on Sunday, whatever the length setting.
 */
function playoffLayout(settings: PlayoffSettings): { offset: number; period: PlayoffPeriod; kind: 'play' | 'reset' }[] {
  if (settings.playoffs === 'none') return [];
  const run = (from: number, count: number, period: PlayoffPeriod) => Array.from({ length: count }, (_, at) => ({ offset: from + at, period, kind: 'play' as const }));
  if (settings.playoffSize === 2) return [...run(0, 6, 'p2'), ...run(6, 1, 'p3')];
  if (settings.playoffs === 'oneWeek') return [...run(0, 3, 'p1'), { offset: 3, period: 'p2', kind: 'reset' }, ...run(4, 3, 'p2'), ...run(7, 1, 'p3')];
  return [...run(0, 6, 'p1'), { offset: 6, period: 'p2', kind: 'reset' }, ...run(7, 6, 'p2'), ...run(13, 1, 'p3')];
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
      kit: kind === 'play' && period !== 'p3' ? [...FULL_KIT] : [],
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
