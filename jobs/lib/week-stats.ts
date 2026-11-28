/**
 * Each player's habits in a week, kept on its week document when the week
 * settles (the commish's request, 2026-11-28), so Telemetry can set yours
 * against the league's by reading one document a week, not everyone's days.
 */
import { habitDays, habitStats, type HabitStats } from '../../engine/src/telemetry.ts';
import type { DayLog } from '../../engine/src/scoring.ts';

/** A week's habits for each player, from their logs and where they put their rest day. */
export function weekStats(input: {
  par: number;
  days: readonly { date: string; dayIndex: number; period: string; phase?: string; kind?: string }[];
  players: Readonly<Record<string, { logs: Readonly<Record<string, DayLog | undefined>>; kit: readonly { item?: string; period?: string; date?: string }[] }>>;
}): Record<string, HabitStats> {
  // The regular season's play days only: a playoff round never counts here.
  const days = input.days.filter((day) => (day.phase ?? 'regular') === 'regular' && (day.kind ?? 'play') === 'play');
  return Object.fromEntries(
    Object.entries(input.players).map(([player, data]) => {
      const restByPeriod = Object.fromEntries(data.kit.filter((play) => play.item === 'rest' && play.period && play.date).map((play) => [play.period!, play.date!]));
      return [player, habitStats(habitDays({ par: input.par, days, logs: data.logs, restByPeriod }), input.par)];
    }),
  );
}
