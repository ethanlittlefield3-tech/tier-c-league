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
  /** How the week's matchup ended, and the other side's points: the phone plays the win scene from these. */
  outcome?: 'win' | 'draw' | 'loss';
  against?: number;
  /** Team Week and 2v2: your side's average, which is what faced `against`. */
  ours?: number;
}

/**
 * A week's matchup, for the win scene: how it ended and the other side's
 * points. In Team Week and 2v2 both sides are averages. A Bounty or Alley
 * week has no matchup, so it has none.
 */
export function matchupOf(
  result: { outcome: string; opponentPoints: number; side?: { points: number }; against?: { points: number } } | undefined,
): { outcome?: 'win' | 'draw' | 'loss'; against?: number; ours?: number } {
  if (!result || (result.outcome !== 'win' && result.outcome !== 'draw' && result.outcome !== 'loss')) return {};
  if (result.side && result.against) return { outcome: result.outcome, against: result.against.points, ours: result.side.points };
  return { outcome: result.outcome, against: result.opponentPoints };
}

export function withWeek(
  history: readonly RankEntry[],
  week: { season: string; period: string; points: number; par: number; outcome?: 'win' | 'draw' | 'loss'; against?: number; ours?: number },
): { history: RankEntry[]; rank: Rank } {
  const max = maxWeekPoints(week.par);
  const result = week.outcome ? { outcome: week.outcome, against: week.against ?? 0, ...(week.ours !== undefined ? { ours: week.ours } : {}) } : {};
  const at = history.findIndex((entry) => entry.season === week.season && entry.period === week.period);
  const weeks =
    at >= 0
      ? history.map((entry, index) => (index === at ? { ...entry, points: week.points, max, ...result } : entry))
      : [...history, { season: week.season, period: week.period, points: week.points, max, rank: 'bronze' as Rank, ...result }];
  // Each entry keeps the rank it led to, worked out from the weeks up to it.
  const next = weeks.map((entry, index) => ({ ...entry, rank: rankFromWeeks(weeks.slice(0, index + 1))!.rank }));
  return { history: next, rank: next.at(-1)!.rank };
}
