/**
 * Demolitions in the feed (SCOPE.md: a Demolition is hidden until its day
 * locks at noon the next day, "then the feed shows Landed, Missed or
 * Blocked"). The weekly job works these out each hour from the data it loads
 * for settlement anyway, and keeps them on the week, so the phones need no
 * extra reads. The outcome comes from the same engine as the score.
 */
import { playerWeek, type CalendarTimes, type DemolitionOutcome, type Lane } from '../../engine/src/index.ts';
import type { PlayerWeekData } from './settle.ts';

export interface Reveal {
  player: string;
  target: string;
  date: string;
  lane: Lane;
  outcome: DemolitionOutcome;
  /** When it was revealed: the day's lock, in milliseconds. */
  at: number;
}

/** Every Demolition of the week whose day has locked, with how it went, in day order. */
export function revealDemolitions(input: {
  par: number;
  timeZone: string;
  days: CalendarTimes[];
  players: Record<string, PlayerWeekData>;
  demolitions: { player: string; target: string; date: string; lane: Lane }[];
  now: number;
}): Reveal[] {
  const locked = (date: string) => input.days.some((day) => day.date === date && input.now >= day.lock);
  const reveals: Reveal[] = [];
  for (const demolition of input.demolitions) {
    const day = input.days.find((found) => found.date === demolition.date);
    if (!day || !locked(demolition.date)) continue;
    const target = input.players[demolition.target] ?? { logs: {}, kit: [], adjustments: [] };
    const week = playerWeek({
      par: input.par,
      days: input.days,
      logs: target.logs,
      kit: target.kit,
      demolitionsOn: input.demolitions.filter((other) => other.target === demolition.target && locked(other.date)).map(({ date, lane }) => ({ date, lane })),
      adjustments: target.adjustments,
      now: input.now,
      timeZone: input.timeZone,
    });
    const outcome = week.cells.find((cell) => cell.date === demolition.date)?.score?.demolitions.find((found) => found.lane === demolition.lane)?.outcome ?? 'missed';
    reveals.push({ player: demolition.player, target: demolition.target, date: demolition.date, lane: demolition.lane, outcome, at: day.lock });
  }
  return reveals.sort((a, b) => a.at - b.at || (a.player < b.player ? -1 : a.player > b.player ? 1 : 0));
}

/** True when the stored reveals already say the same, whatever order the database keeps their keys in. */
export function sameReveals(fresh: Reveal[], stored: unknown): boolean {
  const list = Array.isArray(stored) ? (stored as Partial<Reveal>[]) : [];
  const line = (reveal: Partial<Reveal>) => [reveal.player, reveal.target, reveal.date, reveal.lane, reveal.outcome, reveal.at].join('|');
  return fresh.length === list.length && fresh.every((reveal, index) => line(reveal) === line(list[index]!));
}
