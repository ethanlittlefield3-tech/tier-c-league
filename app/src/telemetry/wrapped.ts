/**
 * Season Wrapped (the commish's request, 2026-11-28): at the end of a season,
 * your season on one card to share with the group chat: where you finished,
 * your record, the goals you hit, the screen time you kept under par, your
 * best week, your longest streak, the one who beat you most, and the
 * trophies you won. The regular season only, as the standings count it, and
 * never a practice week. Pure, so it is tested apart from the screen.
 */
import { HOUSE, LANES, TROPHIES, habitDays, nemesisOf, recordText, rivalRecords, weekDates, weekPeriod, type DayLog, type StoryResult, type TrophyId } from '@tcl/engine';
import { loggedStreak } from './model.ts';

export interface WrappedInput {
  me: string;
  league: string;
  season: {
    name: string;
    par: number;
    kickoff: string;
    regularWeeks: number;
    champion?: string | null;
  };
  logs: Readonly<Record<string, DayLog | undefined>>;
  kit: readonly { item?: string; period?: string; date?: string }[];
  /** The season's weeks: regular weeks are `w01` on, the playoffs aren't counted. */
  weeks: readonly {
    id: string;
    week?: number;
    results?: Readonly<Record<string, StoryResult>>;
    lines?: readonly { player: string; points: number }[];
  }[];
  /** The final standings. */
  rows: readonly { player: string; rank: number; seasonPoints: number }[];
  /** The season's trophy case. */
  trophies: Partial<Record<TrophyId, { winners: readonly string[] }>> | null;
  /** Real names: the card is for the group chat. */
  name: (player: string) => string;
}

export interface Wrapped {
  league: string;
  season: string;
  name: string;
  place: number | null;
  of: number;
  seasonPoints: number | null;
  champion: boolean;
  record: { win: number; draw: number; loss: number };
  goals: number;
  perfect: number;
  beers: number;
  /** Hours of screen time kept under par, summed over the days you logged it. */
  underPar: number | null;
  /** Your screen time a day, in minutes, on the days you logged it. */
  screenPerDay: number | null;
  bestWeek: { week: number; points: number } | null;
  /** Your longest run of days logged. */
  streak: number;
  /** Whoever beat you most this season, and your record against them. */
  nemesis: { name: string; record: string } | null;
  trophies: string[];
  /** The same card as words. */
  text: string;
}

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;
const signed = (value: number) => String(value).replace('-', '−');
export const wrappedHours = (value: number) => `${Math.round(value * 10) / 10}h`;

export function seasonWrapped(input: WrappedInput): Wrapped {
  const { par, kickoff, regularWeeks } = input.season;
  const calendar = Array.from({ length: regularWeeks }, (_, index) => index + 1).flatMap((week) =>
    weekDates(kickoff, week).map((date, dayIndex) => ({
      date,
      dayIndex,
      period: weekPeriod(week),
    })),
  );
  const restByPeriod = Object.fromEntries(input.kit.filter((play) => play.item === 'rest' && play.period && play.date).map((play) => [play.period!, play.date!]));
  const days = habitDays({
    par,
    days: calendar,
    logs: input.logs,
    restByPeriod,
  });

  const screen = days.filter((day) => day.screenMinutes !== null);
  const underPar = screen.length ? screen.reduce((sum, day) => sum + Math.max(0, par * 60 - day.screenMinutes!), 0) / 60 : null;
  const screenPerDay = screen.length ? screen.reduce((sum, day) => sum + day.screenMinutes!, 0) / screen.length : null;

  const regular = input.weeks.filter((week) => week.id.startsWith('w')).sort((a, b) => a.id.localeCompare(b.id));
  const record = { win: 0, draw: 0, loss: 0 };
  let bestWeek: Wrapped['bestWeek'] = null;
  for (const week of regular) {
    const result = week.results?.[input.me];
    if (result && result.outcome !== 'none') record[result.outcome] += 1;
    const points = week.lines?.find((line) => line.player === input.me)?.points ?? result?.points;
    const number = week.week ?? Number(week.id.slice(1));
    if (typeof points === 'number' && (bestWeek === null || points > bestWeek.points)) bestWeek = { week: number, points };
  }

  // The season's own rivalries: who beat you most this season. The House is never anyone's nemesis.
  const rivals = rivalRecords(
    regular
      .filter((week) => week.results)
      .map((week) => ({
        season: 'season',
        week: week.week ?? Number(week.id.slice(1)),
        results: week.results!,
      })),
  )[input.me];
  const nemesisId = nemesisOf(rivals);
  const nemesis = nemesisId && nemesisId !== HOUSE ? { name: input.name(nemesisId), record: recordText(rivals?.[nemesisId]) } : null;

  const row = input.rows.find((each) => each.player === input.me) ?? null;
  const trophies = TROPHIES.filter((trophy) => input.trophies?.[trophy.id]?.winners.includes(input.me)).map((trophy) => trophy.name);
  const goals = days.reduce((sum, day) => sum + LANES.filter((lane) => day.hits[lane]).length, 0);
  const wrapped: Omit<Wrapped, 'text'> = {
    league: input.league,
    season: input.season.name,
    name: input.name(input.me),
    place: row?.rank ?? null,
    of: input.rows.length,
    seasonPoints: row?.seasonPoints ?? null,
    champion: !!input.season.champion && input.season.champion === input.me,
    record,
    goals,
    perfect: days.filter((day) => day.perfect).length,
    beers: days.reduce((sum, day) => sum + day.beers, 0),
    underPar,
    screenPerDay,
    bestWeek,
    streak: loggedStreak(days).best,
    nemesis,
    trophies,
  };
  return { ...wrapped, text: wrappedText(wrapped) };
}

function wrappedText(card: Omit<Wrapped, 'text'>): string {
  return [
    `${card.league}: ${card.season}, wrapped`,
    card.place !== null ? `${card.name}: ${card.champion ? 'Champion, ' : ''}${ordinal(card.place)} of ${card.of}, ${signed(card.seasonPoints ?? 0)} Season Points` : `${card.name}${card.champion ? ': Champion' : ''}`,
    `Record: ${card.record.win}–${card.record.draw}–${card.record.loss}`,
    `Goals hit: ${card.goals} · Perfect days: ${card.perfect}`,
    ...(card.underPar !== null ? [`Screen time: ${wrappedHours(card.underPar)} under par`] : []),
    ...(card.bestWeek ? [`Best week: Week ${card.bestWeek.week}, ${signed(card.bestWeek.points)} points`] : []),
    `Longest streak: ${card.streak} ${card.streak === 1 ? 'day' : 'days'}`,
    ...(card.nemesis ? [`Nemesis: ${card.nemesis.name} (${card.nemesis.record})`] : []),
    ...(card.trophies.length ? [`Trophies: ${card.trophies.join(', ')}`] : []),
  ].join('\n');
}

export { ordinal as wrappedOrdinal };
