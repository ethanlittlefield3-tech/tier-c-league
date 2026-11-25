/**
 * A player's week, day by day, scored with everything on it: the log, the
 * power-ups, Demolitions once their day locks, and the commish's fixes. The
 * phone shows it live; the weekly job settles it. Both use this, so the live
 * score and the official one can't disagree.
 */
import { localDate, type DateStr, type Instant } from './calendar.ts';
import { scoreDay, type DayLog, type DayScore, type Lane, type Square } from './scoring.ts';
import { totalWeek, type WeekTotals } from './week.ts';

/** What a day needs from its calendar entry. */
export interface CalendarTimes {
  date: DateStr;
  period: string;
  dayIndex: number;
  phase: string;
  start: Instant;
  lock: Instant;
}

/** A kit play: Aerial, Full Boost, a moved rest day, or a Rule One. */
export interface KitPlay {
  item: string;
  period?: string;
  date: DateStr;
  lane?: Lane;
  number?: number;
}

export interface DayCell {
  date: DateStr;
  dayIndex: number;
  state: 'future' | 'open' | 'locked';
  rest: boolean;
  today: boolean;
  score: DayScore | null;
}

/** A player's rest day is the day they moved it to, or else Sunday in the regular season. */
export function isRestDay(input: { date: DateStr; calendar: { phase: string; dayIndex: number }; restDate: DateStr | null }): boolean {
  if (input.restDate) return input.restDate === input.date;
  return input.calendar.phase === 'regular' && input.calendar.dayIndex === 6;
}

/**
 * - A day that has not started has no score yet.
 * - An open day scores live: missing entries count 0 so far.
 * - A Demolition counts only once its day locks, when it is revealed.
 */
export function playerWeek(input: {
  par: number;
  days: readonly CalendarTimes[];
  logs: Readonly<Record<DateStr, DayLog>>;
  kit: readonly KitPlay[];
  /** Demolitions aimed at the player. */
  demolitionsOn: readonly { date: DateStr; lane: Lane }[];
  adjustments: readonly { date: DateStr; amount: number; void: Square | null }[];
  now: Instant;
  timeZone?: string;
  /** Today's date, when the caller knows it better than the time zone does: a fast test league. */
  today?: DateStr;
}): { cells: DayCell[]; totals: WeekTotals } {
  const days = [...input.days].sort((a, b) => (a.date < b.date ? -1 : 1));
  const today = input.today ?? (input.timeZone ? localDate(input.now, input.timeZone) : undefined);

  const cells = days.map((day): DayCell => {
    const state = input.now < day.start ? 'future' : input.now < day.lock ? 'open' : 'locked';
    const restPlay = input.kit.find((play) => play.item === 'rest' && play.period === day.period);
    const rest = isRestDay({ date: day.date, calendar: day, restDate: restPlay?.date ?? null });
    const isToday = today !== undefined ? day.date === today : input.now >= day.start && input.now < day.start + 24 * 3_600_000;
    if (state === 'future') return { date: day.date, dayIndex: day.dayIndex, state, rest, today: isToday, score: null };

    const on = (item: string) => input.kit.find((play) => play.item === item && play.date === day.date && (item === 'ruleOne' || play.period === day.period));
    const fixes = input.adjustments.filter((change) => change.date === day.date);
    const score = scoreDay(
      {
        par: input.par,
        log: input.logs[day.date] ?? null,
        restDay: rest,
        aerial: on('aerial') !== undefined,
        fullBoost: on('fullBoost')?.lane ?? null,
        ruleOne: on('ruleOne') !== undefined,
        demolitions: state === 'locked' ? input.demolitionsOn.filter((hit) => hit.date === day.date).map((hit) => hit.lane) : [],
        voided: fixes.flatMap((change) => (change.void ? [change.void] : [])),
        adjustments: fixes.map((change) => change.amount).filter((amount) => amount !== 0),
      },
      { open: state === 'open' },
    );
    return { date: day.date, dayIndex: day.dayIndex, state, rest, today: isToday, score };
  });

  return { cells, totals: totalWeek(cells.flatMap((cell) => (cell.score ? [cell.score] : []))) };
}
