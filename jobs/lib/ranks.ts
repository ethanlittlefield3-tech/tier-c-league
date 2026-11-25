/**
 * Ranks after a final week (SCOPE.md, "Ranks and trophies"): each player's
 * rank history gains that week, measured against the most its season's par
 * allowed, and their rank is worked out again from the last 4 weeks. A week
 * counted again after the commish unlocks it replaces its old entry.
 */
import { maxWeekPoints, rankFromWeeks, type Rank } from '../../engine/src/ranks.ts';

export interface RankEntry {
  season: string;
  period: string;
  points: number;
  /** The most that week could score, at its season's par. */
  max: number;
  /** The rank once this week was final. */
  rank: Rank;
}

export function withWeek(history: readonly RankEntry[], week: { season: string; period: string; points: number; par: number }): { history: RankEntry[]; rank: Rank } {
  const max = maxWeekPoints(week.par);
  const at = history.findIndex((entry) => entry.season === week.season && entry.period === week.period);
  const weeks = at >= 0 ? history.map((entry, index) => (index === at ? { ...entry, points: week.points, max } : entry)) : [...history, { season: week.season, period: week.period, points: week.points, max, rank: 'bronze' as Rank }];
  // Each entry keeps the rank it led to, worked out from the weeks up to it.
  const next = weeks.map((entry, index) => ({ ...entry, rank: rankFromWeeks(weeks.slice(0, index + 1))!.rank }));
  return { history: next, rank: next.at(-1)!.rank };
}
