/**
 * Telemetry's numbers (the commish's request, 2026-11-28), from what the
 * phone already has: your own logs this season, your rank history, and the
 * settled weeks, which keep each player's habits. Pure, so it is tested
 * apart from the screen.
 */
import {
  LANES,
  biggestLeak,
  formScore,
  habitDays,
  habitStats,
  leagueCompare,
  paceScore,
  rankFromWeeks,
  weekDates,
  weekPeriod,
  weekdayShape,
  type CompareRow,
  type DayLog,
  type HabitDay,
  type HabitStats,
  type Lane,
  type LeagueLine,
  type Rank,
} from '@tcl/engine';

/** The window Telemetry looks back over, and the one before it for trends. */
export const WINDOW_DAYS = 28;

export interface TelemetryInput {
  me: string;
  season: { par: number; kickoff: string; regularWeeks: number } | null;
  /** Today, in the league's time zone. Days before it are finished. */
  today: string;
  logs: Record<string, DayLog | undefined>;
  kit: readonly { item?: string; period?: string; date?: string }[];
  /** Your rank history, every season: each final week's points and the most it could score. */
  history: readonly { points: number; max: number }[];
  /** The season's settled weeks: each player's habits, and their points. */
  weeks: readonly { id: string; stats?: Record<string, HabitStats>; lines?: readonly { player: string; points: number }[] }[];
  /** Everyone's rank history, for the league's form. */
  players: readonly { id: string; history: readonly { points: number; max: number }[] }[];
}

export interface TelemetryModel {
  started: boolean;
  form: number | null;
  /** Your form before your latest final week, for how it moved. */
  formBefore: number | null;
  rank: Rank | null;
  /** This week's pace, from its finished days. */
  pace: number | null;
  stats: HabitStats;
  /** Each leak as points a week, over the window. */
  leaks: HabitStats['leaks'];
  leak: ReturnType<typeof biggestLeak>;
  lanes: { lane: Lane; rate: number | null; before: number | null }[];
  /** Your screen time a day, on average, over the window, and each season week's. */
  screen: { perDay: number | null; weeks: { week: number; perDay: number | null }[] };
  shape: ReturnType<typeof weekdayShape>;
  streak: { current: number; best: number };
  league: { form: number | null; formPlace: number | null; formOf: number; rows: CompareRow[] };
}

/** Your streak of days logged, now and at its longest: a rest day with nothing logged neither adds to it nor breaks it. */
export function loggedStreak(days: readonly HabitDay[]): { current: number; best: number } {
  let current = 0;
  let best = 0;
  for (const day of days) {
    if (day.logged) current += 1;
    else if (!day.rest) current = 0;
    best = Math.max(best, current);
  }
  return { current, best };
}

const rate = (hits: number, days: number) => (days > 0 ? hits / days : null);
const perWeek = (value: number, days: number) => (days > 0 ? Math.round((value / days) * 70) / 10 : 0);

export function telemetryModel(input: TelemetryInput): TelemetryModel {
  const par = input.season?.par ?? 3;
  const calendar = input.season
    ? Array.from({ length: input.season.regularWeeks }, (_, index) => index + 1).flatMap((week) =>
        weekDates(input.season!.kickoff, week).map((date, dayIndex) => ({ date, dayIndex, period: weekPeriod(week), week })),
      )
    : [];
  const finished = calendar.filter((day) => day.date < input.today);
  const restByPeriod = Object.fromEntries(input.kit.filter((play) => play.item === 'rest' && play.period && play.date).map((play) => [play.period!, play.date!]));
  const days: (HabitDay & { week: number })[] = habitDays({ par, days: finished, logs: input.logs, restByPeriod }).map((day, index) => ({ ...day, week: finished[index]!.week }));
  const recent = days.slice(-WINDOW_DAYS);
  const before = days.slice(-2 * WINDOW_DAYS, -WINDOW_DAYS);
  const stats = habitStats(recent, par);
  const previous = habitStats(before, par);

  // This week: the week today is in, from its finished days.
  const thisWeek = calendar.find((day) => day.date === input.today)?.week ?? null;
  const thisWeekDays = thisWeek === null ? [] : days.filter((day) => day.week === thisWeek);
  const pace = paceScore(
    thisWeekDays.reduce((sum, day) => sum + day.points, 0),
    thisWeekDays.length,
    par,
  );

  const form = formScore(input.history);
  const formBefore = input.history.length > 1 ? formScore(input.history.slice(0, -1)) : null;


  const weekNumbers = [...new Set(calendar.map((day) => day.week))];
  const screenWeeks = weekNumbers
    .filter((week) => days.some((day) => day.week === week))
    .map((week) => {
      const logged = days.filter((day) => day.week === week && day.screenMinutes !== null);
      return { week, perDay: logged.length ? logged.reduce((sum, day) => sum + day.screenMinutes!, 0) / logged.length : null };
    });

  // The league: everyone's settled regular weeks, summed.
  const lines: Record<string, LeagueLine> = {};
  for (const week of input.weeks) {
    if (!week.id.startsWith('w') || !week.stats) continue;
    for (const [player, each] of Object.entries(week.stats)) {
      const line = (lines[player] ??= { ...habitStats([], par), weeks: 0, weekPoints: 0 });
      line.weeks += 1;
      line.weekPoints += week.lines?.find((found) => found.player === player)?.points ?? each.points;
      for (const key of ['days', 'goalDays', 'logged', 'noShows', 'screenDays', 'screenMinutes', 'beers', 'perfect', 'points'] as const) line[key] += each[key] ?? 0;
      for (const lane of LANES) line.hits[lane] += each.hits?.[lane] ?? 0;
    }
  }
  const forms = input.players.map((player) => ({ id: player.id, form: formScore(player.history) })).filter((each): each is { id: string; form: number } => each.form !== null);
  const mine = forms.find((each) => each.id === input.me);

  return {
    started: days.length > 0,
    form,
    formBefore,
    // The same rank the league shows, from the measure before it is held to 0 to 100.
    rank: rankFromWeeks(input.history)?.rank ?? null,
    pace,
    stats,
    leaks: {
      goals: perWeek(stats.leaks.goals, stats.days),
      screen: perWeek(stats.leaks.screen, stats.days),
      beers: perWeek(stats.leaks.beers, stats.days),
      noShows: perWeek(stats.leaks.noShows, stats.days),
    },
    leak: biggestLeak(stats),
    lanes: LANES.map((lane) => ({ lane, rate: rate(stats.hits[lane], stats.goalDays - stats.noShows), before: rate(previous.hits[lane], previous.goalDays - previous.noShows) })),
    screen: { perDay: stats.screenDays ? stats.screenMinutes / stats.screenDays : null, weeks: screenWeeks },
    shape: weekdayShape(recent),
    streak: loggedStreak(days),
    league: {
      form: forms.length ? Math.round(forms.reduce((sum, each) => sum + each.form, 0) / forms.length) : null,
      formPlace: mine ? forms.filter((each) => each.form > mine.form).length + 1 : null,
      formOf: forms.length,
      rows: leagueCompare(lines, input.me),
    },
  };
}
