/**
 * A player's week, day by day, scored by the engine the way the official
 * result will be. The phone shows it live; the weekly job settles it.
 *
 * - A day that has not started has no score yet.
 * - An open day scores live: missing entries count 0 so far (call 6).
 * - A Demolition counts only once its day locks, when it is revealed.
 */
import { localDate, scoreDay, totalWeek, type DayScore, type Lane, type Square, type WeekTotals } from '@tcl/engine';
import type { CalDay } from './kit.ts';
import { isRestDay, type DayEntry } from './model.ts';

/** A kit document: Aerial, Full Boost, a moved rest day or a Rule One. */
export interface KitPlay {
  item: string;
  period?: string;
  date: string;
  lane?: Lane;
  number?: number;
}

export interface DayCell {
  date: string;
  dayIndex: number;
  state: 'future' | 'open' | 'locked';
  rest: boolean;
  today: boolean;
  score: DayScore | null;
}

export function playerWeek(input: {
  par: number;
  /** The week's calendar days. */
  days: CalDay[];
  /** The player's logs, by date. */
  logs: Record<string, DayEntry>;
  kit: KitPlay[];
  /** Revealed Demolitions aimed at the player. */
  demolitionsOn: { date: string; lane: Lane }[];
  /** Commish docks, corrections and voids for the player. */
  adjustments: { date: string; amount: number; void: Square | null }[];
  now: number;
  timeZone?: string;
}): { cells: DayCell[]; totals: WeekTotals } {
  const days = [...input.days].sort((a, b) => (a.date < b.date ? -1 : 1));
  const today = input.timeZone ? localDate(input.now, input.timeZone) : days.find((day) => input.now >= day.start && input.now < day.start + 24 * 3_600_000)?.date;

  const cells = days.map((day): DayCell => {
    const state = input.now < day.start ? 'future' : input.now < day.lock ? 'open' : 'locked';
    const restPlay = input.kit.find((play) => play.item === 'rest' && play.period === day.period);
    const rest = isRestDay({ date: day.date, calendar: day, restDate: restPlay?.date ?? null });
    if (state === 'future') return { date: day.date, dayIndex: day.dayIndex, state, rest, today: day.date === today, score: null };

    const on = (item: string) => input.kit.find((play) => play.item === item && play.date === day.date && (item === 'ruleOne' || play.period === day.period));
    const adjustments = input.adjustments.filter((change) => change.date === day.date);
    const score = scoreDay(
      {
        par: input.par,
        log: input.logs[day.date] ?? null,
        restDay: rest,
        aerial: on('aerial') !== undefined,
        fullBoost: on('fullBoost')?.lane ?? null,
        ruleOne: on('ruleOne') !== undefined,
        demolitions: state === 'locked' ? input.demolitionsOn.filter((hit) => hit.date === day.date).map((hit) => hit.lane) : [],
        voided: adjustments.flatMap((change) => (change.void ? [change.void] : [])),
        adjustments: adjustments.map((change) => change.amount).filter((amount) => amount !== 0),
      },
      { open: state === 'open' },
    );
    return { date: day.date, dayIndex: day.dayIndex, state, rest, today: day.date === today, score };
  });

  return { cells, totals: totalWeek(cells.flatMap((cell) => (cell.score ? [cell.score] : []))) };
}
