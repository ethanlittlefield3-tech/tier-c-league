/**
 * Rematch challenges (SCOPE.md, "Live rivalry and social"): after a loss, the
 * loser challenges the winner to a side race the next week. Most points that
 * week wins: the winner earns the Payback badge, and the loser's car wears an
 * "L" for a week. It never changes a score.
 */
import { HOUSE } from './schedule.ts';

/** The last day of the race week a challenge can be made on: its Wednesday (day 2, counting Monday as 0). */
export const REMATCH_LAST_DAY = 2;

/** How a side race ended: the winner and the loser, or neither when the points are level. */
export function rematchResult(from: string, to: string, fromPoints: number, toPoints: number): { winner: string | null; loser: string | null } {
  if (fromPoints > toPoints) return { winner: from, loser: to };
  if (toPoints > fromPoints) return { winner: to, loser: from };
  return { winner: null, loser: null };
}

/** Who a player can challenge after a week: whoever beat them in it, once it is final. Never The House. */
export function rematchFor(
  player: string,
  week: { status?: string; results?: Record<string, { opponent: string; outcome: string; points?: number; opponentPoints?: number }> } | null | undefined,
): { to: string; points: number; against: number } | null {
  const result = week?.status === 'final' ? week.results?.[player] : undefined;
  if (!result || result.outcome !== 'loss' || result.opponent === HOUSE) return null;
  return { to: result.opponent, points: result.points ?? 0, against: result.opponentPoints ?? 0 };
}
