/**
 * The win meter (SCOPE.md, "Live rivalry and social"): a live bar of who's
 * favored in a 1v1 week, from points so far and each player's recent daily
 * average. It is a forecast, never a score: no point depends on it.
 */

/** How far one player's day can swing either way, in points: a no-show is −5 and a perfect day about +6. */
export const DAY_SWING = 3;

/** One side of the week, for the meter. */
export interface MeterSide {
  /** Points so far this week. */
  points: number;
  /** Points a day lately, or null with nothing to go on. */
  dailyAverage: number | null;
}

/** Days still to score: each day to come counts as a whole day, the open day as half of one. */
export function daysLeft(cells: readonly { state: 'future' | 'open' | 'locked' }[]): number {
  return cells.reduce((sum, cell) => sum + (cell.state === 'future' ? 1 : cell.state === 'open' ? 0.5 : 0), 0);
}

/** A recent daily average: the last 4 final weeks' points, over 7 days each. `null` before any week is final. */
export function recentDailyAverage(history: readonly { points: number }[] | null | undefined): number | null {
  const recent = (history ?? []).slice(-4);
  if (recent.length === 0) return null;
  return recent.reduce((sum, week) => sum + week.points, 0) / recent.length / 7;
}

/** This week's pace: the average of the days that have locked. `null` before any has. */
export function paceSoFar(cells: readonly { state: 'future' | 'open' | 'locked'; score: { total: number } | null }[]): number | null {
  const locked = cells.filter((cell) => cell.state === 'locked' && cell.score);
  if (locked.length === 0) return null;
  return locked.reduce((sum, cell) => sum + cell.score!.total, 0) / locked.length;
}

/**
 * Your share of the bar, from 0 to 1. Each side's finish is projected as its
 * points so far plus its daily average for each day left. The bar splits on
 * the gap between the projections, against how far the days left can swing
 * it. While any day is left it stays between 3% and 97%, never a sure thing;
 * once none is, the leader has it all, and a tie on points splits it.
 */
export function winMeter(me: MeterSide, them: MeterSide, left: number): number {
  const finish = (side: MeterSide) => side.points + (side.dailyAverage ?? 0) * left;
  const gap = finish(me) - finish(them);
  if (left <= 0) return gap > 0 ? 1 : gap < 0 ? 0 : 0.5;
  // Both players' days can swing, so the spread grows with the square root of twice the days left.
  const spread = DAY_SWING * Math.sqrt(2 * left);
  const share = 1 / (1 + Math.exp((-1.702 * gap) / spread));
  return Math.min(0.97, Math.max(0.03, share));
}
