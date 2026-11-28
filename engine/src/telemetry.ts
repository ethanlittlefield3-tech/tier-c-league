/**
 * Telemetry (the commish's request, 2026-11-28): your own numbers, to see
 * where your points go and what to work on, and how you stand against the
 * league. Pure functions over what the phone and the weekly job already
 * have: each day's log, and the weeks already settled.
 *
 * A day here is scored as you played it, before any power-up, holiday event
 * or receipt: Telemetry is about your habits, not the scoreboard.
 */
import { rankFromWeeks, maxWeekPoints } from './ranks.ts';
import { LANES, RULES, scoreDay, type DayLog, type Lane } from './scoring.ts';

/** One finished day, as habits: what was logged, and what it scored before power-ups. */
export interface HabitDay {
  date: string;
  /** 0 is Monday. */
  dayIndex: number;
  rest: boolean;
  logged: boolean;
  hits: Record<Lane, boolean>;
  screenMinutes: number | null;
  beers: number;
  /** Before any power-up. */
  points: number;
  /** The best this day could have scored at the par. */
  best: number;
  /** Its screen time points, or what not logging it cost. */
  screenPoints: number;
  perfect: boolean;
}

/** A finished day, as habits. */
export function habitDay(input: { date: string; dayIndex: number; par: number; log: DayLog | null; rest: boolean }): HabitDay {
  const score = scoreDay({ par: input.par, log: input.log, restDay: input.rest });
  const best = scoreDay({ par: input.par, restDay: input.rest, log: { goals: { mind: true, body: true, wildcard: true }, screenMinutes: 0, beers: 0 } }).total;
  const logged = score.kind === 'played';
  const hits = { mind: false, body: false, wildcard: false };
  for (const lane of LANES) hits[lane] = !input.rest && input.log?.goals?.[lane] === true;
  return {
    date: input.date,
    dayIndex: input.dayIndex,
    rest: input.rest,
    logged,
    hits,
    screenMinutes: input.log?.screenMinutes ?? null,
    beers: input.log?.beers ?? 0,
    points: score.total,
    best,
    screenPoints: score.screen.points,
    perfect: logged && !input.rest && LANES.every((lane) => hits[lane]) && score.screen.points >= 0 && (input.log?.beers ?? 0) === 0,
  };
}

/** A stretch of days, summed up. */
export interface HabitStats {
  /** Finished days counted. */
  days: number;
  /** Days that weren't rest days. */
  goalDays: number;
  /** Days with anything logged. */
  logged: number;
  /** Goal days with nothing logged. */
  noShows: number;
  hits: Record<Lane, number>;
  /** Days screen time was logged, and its minutes over those days. */
  screenDays: number;
  screenMinutes: number;
  beers: number;
  perfect: number;
  /** Before power-ups. */
  points: number;
  /** Points given away against each day's best: missed goals, screen time short of its best, beers, and days with nothing logged. */
  leaks: { goals: number; screen: number; beers: number; noShows: number };
}

/** Days, summed up, with where their points went. */
export function habitStats(days: readonly HabitDay[], par: number): HabitStats {
  const stats: HabitStats = { days: 0, goalDays: 0, logged: 0, noShows: 0, hits: { mind: 0, body: 0, wildcard: 0 }, screenDays: 0, screenMinutes: 0, beers: 0, perfect: 0, points: 0, leaks: { goals: 0, screen: 0, beers: 0, noShows: 0 } };
  const bestScreen = scoreDay({ par, log: { goals: { mind: false, body: false, wildcard: false }, screenMinutes: 0, beers: 0 } }).screen.points;
  for (const day of days) {
    stats.days += 1;
    if (!day.rest) stats.goalDays += 1;
    stats.points += day.points;
    if (!day.logged) {
      // A day with nothing logged gives away the whole of its best.
      if (!day.rest) stats.noShows += 1;
      stats.leaks.noShows += day.best - day.points;
      continue;
    }
    stats.logged += 1;
    if (day.perfect) stats.perfect += 1;
    for (const lane of LANES) {
      if (day.hits[lane]) stats.hits[lane] += 1;
      else if (!day.rest) stats.leaks.goals += 1;
    }
    if (day.screenMinutes !== null) {
      stats.screenDays += 1;
      stats.screenMinutes += day.screenMinutes;
    }
    stats.leaks.screen += bestScreen - day.screenPoints;
    stats.beers += day.beers;
    stats.leaks.beers += day.beers * -RULES.beerPoints;
  }
  return stats;
}

const tenth = (value: number) => Math.round(value * 10) / 10;

/** The one leak most worth fixing, as points a week, and the weakest lane when it is missed goals. `null` with nothing given away. */
export function biggestLeak(stats: HabitStats): { kind: keyof HabitStats['leaks']; perWeek: number; lane?: Lane } | null {
  if (stats.days === 0) return null;
  const [kind, points] = (Object.entries(stats.leaks) as [keyof HabitStats['leaks'], number][]).sort((a, b) => b[1] - a[1])[0]!;
  if (points <= 0) return null;
  const perWeek = tenth((points / stats.days) * 7);
  if (kind !== 'goals') return { kind, perWeek };
  const lane = [...LANES].sort((a, b) => stats.hits[a] - stats.hits[b])[0]!;
  return { kind, perWeek, lane };
}

/** Your average day on each weekday, Monday first. */
export function weekdayShape(days: readonly HabitDay[]): { dayIndex: number; average: number | null; days: number }[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
    const on = days.filter((day) => day.dayIndex === dayIndex);
    return { dayIndex, average: on.length ? tenth(on.reduce((sum, day) => sum + day.points, 0) / on.length) : null, days: on.length };
  });
}

/** Your form, out of 100: the rank measure, your last 4 final weeks against the most each could score. `null` before your first final week. */
export function formScore(history: readonly { points: number; max: number }[]): number | null {
  const ranked = rankFromWeeks(history);
  if (!ranked) return null;
  return Math.max(0, Math.min(100, Math.round(ranked.share * 100)));
}

/** This week's pace, out of 100: your points so far as a whole week at that rate, against the most a week can score. */
export function paceScore(points: number, days: number, par: number): number | null {
  if (days <= 0) return null;
  return Math.max(0, Math.min(100, Math.round(((points / days) * 7 * 100) / maxWeekPoints(par))));
}

/** A player's settled weeks, summed: their habits and their weekly points. */
export type LeagueLine = HabitStats & { weeks: number; weekPoints: number };

export interface CompareRow {
  key: 'points' | 'goals' | 'screen' | 'beers' | 'logged';
  you: number;
  league: number;
  /** 1 is best. Fewer beers and less screen time are better. */
  place: number;
  of: number;
}

/** Each of your numbers against the league's average, with your place in it. */
export function leagueCompare(lines: Record<string, LeagueLine>, me: string): CompareRow[] {
  const players = Object.keys(lines).filter((player) => lines[player]!.days > 0);
  if (!players.includes(me)) return [];
  const measures: { key: CompareRow['key']; of: (line: LeagueLine) => number | null; lowerIsBetter: boolean }[] = [
    { key: 'points', of: (line) => (line.weeks > 0 ? line.weekPoints / line.weeks : null), lowerIsBetter: false },
    { key: 'goals', of: (line) => (line.goalDays > 0 ? (line.hits.mind + line.hits.body + line.hits.wildcard) / (3 * line.goalDays) : null), lowerIsBetter: false },
    { key: 'screen', of: (line) => (line.screenDays > 0 ? line.screenMinutes / line.screenDays : null), lowerIsBetter: true },
    { key: 'beers', of: (line) => (line.weeks > 0 ? line.beers / line.weeks : null), lowerIsBetter: true },
    { key: 'logged', of: (line) => (line.days > 0 ? line.logged / line.days : null), lowerIsBetter: false },
  ];
  const rows: CompareRow[] = [];
  for (const measure of measures) {
    const values = players.map((player) => ({ player, value: measure.of(lines[player]!) })).filter((each): each is { player: string; value: number } => each.value !== null);
    const mine = values.find((each) => each.player === me);
    if (!mine) continue;
    const better = values.filter((each) => (measure.lowerIsBetter ? each.value < mine.value : each.value > mine.value)).length;
    rows.push({ key: measure.key, you: mine.value, league: values.reduce((sum, each) => sum + each.value, 0) / values.length, place: better + 1, of: values.length });
  }
  return rows;
}

/**
 * Finished days as habits: each with its log, a rest day where the player put
 * theirs that week (Sunday unless they moved it).
 */
export function habitDays(input: {
  par: number;
  days: readonly { date: string; dayIndex: number; period: string }[];
  logs: Readonly<Record<string, DayLog | undefined>>;
  /** Where each week's rest day was moved to, by period. */
  restByPeriod: Readonly<Record<string, string | null | undefined>>;
}): HabitDay[] {
  return input.days.map((day) => {
    const moved = input.restByPeriod[day.period];
    const rest = moved ? moved === day.date : day.dayIndex === 6;
    return habitDay({ date: day.date, dayIndex: day.dayIndex, par: input.par, log: input.logs[day.date] ?? null, rest });
  });
}
