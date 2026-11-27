/**
 * Ranks (SCOPE.md, "Ranks and trophies"): your form over the last 4 weeks.
 * Rank compares your rolling average of weekly points, before bonuses, with
 * the most you could score: at par 3 that is 39 a week, 6 goal days of +6
 * and a rest day of +3.
 *
 * - Ranks update when a week's results go final.
 * - Until 4 weeks exist, the average uses the weeks you have.
 * - A new player is unranked until their first week is final.
 * - Rank history carries across seasons.
 */
import { scoreDay } from './scoring.ts';

export const RANKS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion', 'grandChamp'] as const;
export type Rank = (typeof RANKS)[number];

export const RANK_NAMES: Record<Rank, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  champion: 'Champion',
  grandChamp: 'Grand Champ',
};

/** The weeks the average looks back over. */
export const RANK_WEEKS = 4;

/** Each rank's floor, as a share of the most a week can score. Bronze is anything below 0. */
export const RANK_FLOORS: readonly [Rank, number][] = [
  ['grandChamp', 0.8],
  ['champion', 0.65],
  ['diamond', 0.5],
  ['platinum', 0.35],
  ['gold', 0.2],
  ['silver', 0],
];

/** The most a week can score at a par: six perfect goal days and a perfect rest day, by the scoring rules themselves. */
export function maxWeekPoints(par: number): number {
  const best = { goals: { mind: true, body: true, wildcard: true }, screenMinutes: 0, beers: 0 };
  const goalDay = scoreDay({ par, log: best }).total;
  const restDay = scoreDay({ par, restDay: true, log: best }).total;
  return 6 * goalDay + restDay;
}

/** The rank for a share of the most a week can score. */
function rankOfShare(share: number): Rank {
  // A floor is "or more": 31.2 of 39 is exactly 80%, which division alone puts a hair under.
  return RANK_FLOORS.find(([, floor]) => share + 1e-9 >= floor)?.[0] ?? 'bronze';
}

/** A rank from weekly points, oldest first, before bonuses, at one par. `null` with no final week yet. */
export function rankFor(weeklyPoints: readonly number[], par: number): { rank: Rank; average: number; share: number } | null {
  const recent = weeklyPoints.slice(-RANK_WEEKS);
  if (recent.length === 0) return null;
  const average = recent.reduce((sum, points) => sum + points, 0) / recent.length;
  const share = average / maxWeekPoints(par);
  return { rank: rankOfShare(share), average, share };
}

/**
 * A rank from finished weeks across seasons, oldest first. Each week is
 * measured against the most its own season's par allowed, so a season with a
 * different par still counts fairly. `null` with no final week yet.
 */
export function rankFromWeeks(weeks: readonly { points: number; max: number }[]): { rank: Rank; share: number } | null {
  const recent = weeks.slice(-RANK_WEEKS);
  if (recent.length === 0) return null;
  const share = recent.reduce((sum, week) => sum + week.points / week.max, 0) / recent.length;
  return { rank: rankOfShare(share), share };
}

/** Whether a new rank is up or down from the last one, for the rank-up scene. */
export function rankMove(before: Rank | null, after: Rank): 'up' | 'down' | 'same' {
  if (before === null) return 'up';
  const change = RANKS.indexOf(after) - RANKS.indexOf(before);
  return change > 0 ? 'up' : change < 0 ? 'down' : 'same';
}
