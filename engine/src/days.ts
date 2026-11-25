/**
 * A player's week, day by day, scored with everything on it: the log, the
 * power-ups, Demolitions once their day locks, and the commish's fixes. The
 * phone shows it live; the weekly job settles it. Both use this, so the live
 * score and the official one can't disagree.
 */
import { localDate, type DateStr, type Instant } from './calendar.ts';
import { rumbleDay, type RumbleItem } from './rumble.ts';
import { holidayOf, scoreDay, type DayInput, type DayLog, type DayScore, type Lane, type Square } from './scoring.ts';
import { totalWeek, type WeekTotals } from './week.ts';

/** What a day needs from its calendar entry. */
export interface CalendarTimes {
  date: DateStr;
  period: string;
  dayIndex: number;
  phase: string;
  start: Instant;
  lock: Instant;
  /** A holiday event the commish put on the day: double, dry or pass. */
  event?: string | null;
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

/** Everything a player's week is scored from. */
export interface WeekInput {
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
}

/** Each day of a week, with what it is scored from: `input` is `null` for a day that hasn't started. */
function weekDays(input: WeekInput): { cell: Omit<DayCell, 'score'>; input: DayInput | null }[] {
  const days = [...input.days].sort((a, b) => (a.date < b.date ? -1 : 1));
  const today = input.today ?? (input.timeZone ? localDate(input.now, input.timeZone) : undefined);
  return days.map((day) => {
    const state = input.now < day.start ? 'future' : input.now < day.lock ? 'open' : 'locked';
    const restPlay = input.kit.find((play) => play.item === 'rest' && play.period === day.period);
    const rest = isRestDay({ date: day.date, calendar: day, restDate: restPlay?.date ?? null });
    const isToday = today !== undefined ? day.date === today : input.now >= day.start && input.now < day.start + 24 * 3_600_000;
    const cell = { date: day.date, dayIndex: day.dayIndex, state, rest, today: isToday } as const;
    if (state === 'future') return { cell, input: null };
    const on = (item: string) => input.kit.find((play) => play.item === item && play.date === day.date && (item === 'ruleOne' || play.period === day.period));
    const fixes = input.adjustments.filter((change) => change.date === day.date);
    return {
      cell,
      input: {
        par: input.par,
        log: input.logs[day.date] ?? null,
        restDay: rest,
        aerial: on('aerial') !== undefined,
        // Full Boost, and the #1 seed's extra one in a playoff semifinal.
        fullBoost: input.kit.filter((play) => (play.item === 'fullBoost' || play.item === 'fullBoost2') && play.date === day.date && play.period === day.period && play.lane).map((play) => play.lane!),
        ruleOne: on('ruleOne') !== undefined,
        demolitions: state === 'locked' ? input.demolitionsOn.filter((hit) => hit.date === day.date).map((hit) => hit.lane) : [],
        voided: fixes.flatMap((change) => (change.void ? [change.void] : [])),
        adjustments: fixes.map((change) => change.amount).filter((amount) => amount !== 0),
        event: holidayOf(day.event),
      },
    };
  });
}

function weekOf(cells: DayCell[]): { cells: DayCell[]; totals: WeekTotals } {
  return { cells, totals: totalWeek(cells.flatMap((cell) => (cell.score ? [cell.score] : []))) };
}

/**
 * - A day that has not started has no score yet.
 * - An open day scores live: missing entries count 0 so far.
 * - A Demolition counts only once its day locks, when it is revealed.
 */
export function playerWeek(input: WeekInput): { cells: DayCell[]; totals: WeekTotals } {
  return weekOf(weekDays(input).map(({ cell, input: day }) => ({ ...cell, score: day ? scoreDay(day, { open: cell.state === 'open' }) : null })));
}

/** A Rumble week's draws: each day's items, by side, and each side's Boots, by date. */
export interface RumbleDraws {
  items: Readonly<Record<DateStr, { a?: RumbleItem | null; b?: RumbleItem | null }>>;
  boots: { a?: Readonly<Record<DateStr, Lane>>; b?: Readonly<Record<DateStr, Lane>> };
}

/**
 * Both players of a Rumble 1v1, day by day, with their items played against
 * each other. A Boot counts only once its day locks, like a Demolition.
 */
export function rumbleWeek(a: WeekInput, b: WeekInput, draws: RumbleDraws): { a: { cells: DayCell[]; totals: WeekTotals }; b: { cells: DayCell[]; totals: WeekTotals } } {
  const daysA = weekDays(a);
  const daysB = weekDays(b);
  const cellsA: DayCell[] = [];
  const cellsB: DayCell[] = [];
  daysA.forEach((dayA, at) => {
    const dayB = daysB[at]!;
    if (!dayA.input || !dayB.input) {
      cellsA.push({ ...dayA.cell, score: dayA.input ? scoreDay(dayA.input, { open: dayA.cell.state === 'open' }) : null });
      cellsB.push({ ...dayB.cell, score: dayB.input ? scoreDay(dayB.input, { open: dayB.cell.state === 'open' }) : null });
      return;
    }
    const date = dayA.cell.date;
    const locked = dayA.cell.state === 'locked';
    const scored = rumbleDay(
      dayA.input,
      dayB.input,
      {
        a: draws.items[date]?.a ?? null,
        b: draws.items[date]?.b ?? null,
        aBoot: locked ? (draws.boots.a?.[date] ?? null) : null,
        bBoot: locked ? (draws.boots.b?.[date] ?? null) : null,
      },
      { open: dayA.cell.state === 'open' },
    );
    cellsA.push({ ...dayA.cell, score: scored.a });
    cellsB.push({ ...dayB.cell, score: scored.b });
  });
  return { a: weekOf(cellsA), b: weekOf(cellsB) };
}
