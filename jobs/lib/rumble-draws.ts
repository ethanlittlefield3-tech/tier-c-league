/**
 * Rumble's draws (SCOPE.md, "Rumble"): every player gets one random item a
 * day, drawn by the server in advance and sealed. The weekly job draws a
 * Rumble week's items a week before it starts; each one is readable from the
 * moment its day starts, by the calendar. Pure: the job passes in `pick`,
 * which draws one of the seven items with equal odds.
 */
import type { RumbleItem } from '../../engine/src/rumble.ts';
import { HOUSE } from '../../engine/src/schedule.ts';

const WEEK = 7 * 24 * 3_600_000;

export interface RumbleDraw {
  id: string;
  data: { player: string; period: string; date: string; item: RumbleItem; revealAt: number };
}

/** The week's sealed items, or `null` when none are due: not Rumble, drawn already, or more than a week away. */
export function rumbleDraws(input: {
  mode: unknown;
  /** When this week's items were drawn, if they were. */
  drawnAt: unknown;
  period: string;
  pairs: { a: string; b: string }[];
  days: { date: string; start: number }[];
  now: number;
  pick: (player: string, date: string) => RumbleItem;
}): RumbleDraw[] | null {
  const first = Math.min(...input.days.map((day) => day.start));
  if (input.mode !== 'rumble' || input.drawnAt || input.days.length === 0 || input.now < first - WEEK) return null;
  // The House plays no items, so neither does whoever faces it.
  const players = input.pairs.filter((pair) => pair.a !== HOUSE && pair.b !== HOUSE).flatMap((pair) => [pair.a, pair.b]);
  return [...input.days]
    .sort((a, b) => a.start - b.start)
    .flatMap((day) => players.map((player) => ({ id: `${day.date}_${player}`, data: { player, period: input.period, date: day.date, item: input.pick(player, day.date), revealAt: day.start } })));
}
