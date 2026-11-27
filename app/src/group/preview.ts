/**
 * The group play preview (the commish's request, 2026-11-27): a made-up
 * league of six, one week, and every group-play mode, scored and settled by
 * the same engine as the real league. It lives only on the phone showing it:
 * nothing here is read from or saved to the league.
 */
import {
  HOUSE,
  RUMBLE_ITEMS,
  defaultBounty,
  playerWeek,
  regularCalendar,
  rumbleWeek,
  settleDue,
  weekPlayers,
  type DayCell,
  type DayLog,
  type GroupMode,
  type RumbleItem,
  type Settled,
} from '@tcl/engine';
import type { CarParts } from '../art/car/draw.ts';
import type { BoardWeekDoc } from '../screens/useWeekBoard.ts';

export const PREVIEW_PAR = 3;
export const PREVIEW_ZONE = 'America/New_York';
const KICKOFF = '2027-01-04';

export interface PreviewPlayer {
  id: string;
  name: string;
  car: Partial<CarParts>;
}

/** You, and five made-up players with cars of their own. */
export const PREVIEW_PLAYERS: readonly PreviewPlayer[] = [
  { id: 'you', name: 'You', car: { body: 'dart', paint: 'cobalt' } },
  { id: 'maya', name: 'Maya', car: { body: 'bruiser', paint: 'racingRed' } },
  { id: 'sam', name: 'Sam', car: { body: 'brick', paint: 'blazeOrange' } },
  { id: 'jo', name: 'Jo', car: { body: 'dart', paint: 'lime' } },
  { id: 'kim', name: 'Kim', car: { body: 'bruiser', paint: 'royalPurple' } },
  { id: 'lee', name: 'Lee', car: { body: 'brick', paint: 'arcticWhite' } },
];
const IDS = PREVIEW_PLAYERS.map((player) => player.id);

/** One week's seven days, from the engine's own calendar. */
export const PREVIEW_DAYS = regularCalendar({ kickoff: KICKOFF, regularWeeks: 1, timeZone: PREVIEW_ZONE });

/** The time to show: 1 pm on a day of the week (yesterday has locked), or `final` after the week is settled. */
export function nowOn(day: number | 'final'): number {
  if (day === 'final') return PREVIEW_DAYS.at(-1)!.nextEnd + 3_600_000;
  return PREVIEW_DAYS[day]!.start + 13 * 3_600_000;
}

export type PreviewLogs = Record<string, Record<string, DayLog>>;

/** A small fixed-seed random generator, so a seed always makes the same week. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Everyone's days for the week: mostly decent, some great, the odd no-show. */
export function sampleLogs(seed: number): PreviewLogs {
  const next = seeded(seed);
  return Object.fromEntries(
    IDS.map((id) => [
      id,
      Object.fromEntries(
        PREVIEW_DAYS.map((day) => {
          const effort = next();
          const log: DayLog =
            effort < 0.08
              ? { goals: {}, screenMinutes: null, beers: 0 }
              : {
                  goals: { mind: next() < effort + 0.2, body: next() < effort + 0.15, wildcard: next() < effort },
                  screenMinutes: Math.round((60 + next() * 300) / 15) * 15,
                  beers: next() < 0.6 ? 0 : Math.floor(next() * 4),
                };
          return [day.date, log];
        }),
      ),
    ]),
  );
}

/** Rumble's item for each player each day, from a fixed seed. */
function rumbleItems(): Record<string, RumbleItem> {
  const next = seeded(99);
  const items: Record<string, RumbleItem> = {};
  for (const day of PREVIEW_DAYS) for (const id of IDS) items[`${day.date}_${id}`] = RUMBLE_ITEMS[Math.floor(next() * RUMBLE_ITEMS.length)]!;
  return items;
}
const ITEMS = rumbleItems();

const PAIRS = [
  { a: 'you', b: 'maya' },
  { a: 'sam', b: 'jo' },
  { a: 'kim', b: 'lee' },
];

export type PreviewWeek = BoardWeekDoc & {
  week: number;
  mode: GroupMode;
  pairs: { a: string; b: string }[];
  rumble?: { items: Record<string, RumbleItem>; boots: [] };
};

/** A mode's week for the made-up league, as the real jobs would set it up. */
export function previewWeek(mode: GroupMode): PreviewWeek {
  const base = { week: 1, mode, pairs: [] as { a: string; b: string }[] };
  if (mode === 'teamWeek') return { ...base, teams: { blue: ['you', 'maya', 'sam'], orange: ['jo', 'kim', 'lee'] } };
  if (mode === 'twoVTwo')
    return {
      ...base,
      duos: [
        { a: ['you', 'maya'], b: ['sam', 'jo'] },
        { a: ['kim', 'lee'], b: [HOUSE] },
      ],
    };
  if (mode === 'bounty') return { ...base, roster: [...IDS], bounty: defaultBounty(IDS.length) };
  if (mode === 'alley') return { ...base, roster: [...IDS] };
  if (mode === 'rumble') return { ...base, pairs: PAIRS, rumble: { items: ITEMS, boots: [] } };
  return { ...base, pairs: PAIRS };
}

const days = (mode: GroupMode) => regularCalendar({ kickoff: KICKOFF, regularWeeks: 1, timeZone: PREVIEW_ZONE, modes: { 1: mode } });

/** Everyone's week as it stands at `now`, for the mode's board. */
export function previewBoard(mode: GroupMode, logs: PreviewLogs, now: number): { ids: string[]; weeks: Record<string, DayCell[]>; totals: Record<string, { points: number; beers: number }> } {
  const week = previewWeek(mode);
  const calendar = days(mode);
  const input = (id: string) => ({ par: PREVIEW_PAR, days: calendar, logs: logs[id] ?? {}, kit: [], demolitionsOn: [], adjustments: [], now, timeZone: PREVIEW_ZONE });
  const ids = weekPlayers(week);
  const weeks: Record<string, DayCell[]> = {};
  const totals: Record<string, { points: number; beers: number }> = {};
  if (mode === 'rumble') {
    for (const pair of week.pairs) {
      const draws = {
        items: Object.fromEntries(calendar.map((day) => [day.date, { a: ITEMS[`${day.date}_${pair.a}`] ?? null, b: ITEMS[`${day.date}_${pair.b}`] ?? null }])),
        boots: {},
      };
      const both = rumbleWeek(input(pair.a), input(pair.b), draws);
      weeks[pair.a] = both.a.cells;
      weeks[pair.b] = both.b.cells;
      totals[pair.a] = { points: both.a.totals.points, beers: both.a.totals.beers };
      totals[pair.b] = { points: both.b.totals.points, beers: both.b.totals.beers };
    }
  } else {
    for (const id of ids) {
      const result = playerWeek(input(id));
      weeks[id] = result.cells;
      totals[id] = { points: result.totals.points, beers: result.totals.beers };
    }
  }
  return { ids, weeks, totals };
}

/** Today's Rumble item for a player on a day of the week. */
export const itemOn = (day: number, player: string): RumbleItem | null => ITEMS[`${PREVIEW_DAYS[day]?.date}_${player}`] ?? null;

/** The week settled by the same engine as the weekly job, once it is over. */
export function previewSettle(mode: GroupMode, logs: PreviewLogs): Settled {
  const week = previewWeek(mode);
  const settled = settleDue({
    ...week,
    period: 'w01',
    par: PREVIEW_PAR,
    timeZone: PREVIEW_ZONE,
    days: days(mode),
    players: Object.fromEntries(IDS.map((id) => [id, { logs: logs[id] ?? {}, kit: [], adjustments: [] }])),
    demolitions: [],
    earlier: {},
    now: nowOn('final'),
  });
  if (!settled) throw new Error('The preview week should be over.');
  return settled;
}
