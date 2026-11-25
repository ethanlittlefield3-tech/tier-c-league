/**
 * Season storylines (SCOPE.md, "Live rivalry and social"): headlines worked
 * out from the season's results for a week's recap, like "Alex's 4-game win
 * streak snapped". Only 1v1 weeks make stories; The House doesn't.
 */
import { HOUSE } from './schedule.ts';

export interface StoryResult {
  opponent: string;
  outcome: 'win' | 'draw' | 'loss';
  points: number;
  opponentPoints: number;
  seasonPoints?: number;
}

export interface StoryWeek {
  week: number;
  results: Record<string, StoryResult>;
}

/** The most headlines a recap carries. */
export const MOST_HEADLINES = 3;

/**
 * One headline: what happened, to whom, against whom, and its number (the
 * streak, the losses before a first win, or the margin). The app words it.
 */
export interface Story {
  kind: 'snapped' | 'leader' | 'streak' | 'firstWin' | 'blowout' | 'edged';
  player: string;
  other: string;
  count: number;
}

/** A win streak this long makes news, when it grows and when it ends. */
const STREAK = 3;

/**
 * The headlines for one week, most newsworthy first: a long win streak
 * snapped, the leader beaten, a streak still going, a first win at last, a
 * blowout of 20 or more, and a win by a single point.
 */
export function storylines(weeks: readonly StoryWeek[], week: number): Story[] {
  const inOrder = [...weeks].filter((each) => each.week <= week).sort((a, b) => a.week - b.week);
  const now = inOrder.find((each) => each.week === week);
  if (!now) return [];
  const before = inOrder.filter((each) => each.week < week);
  const oneOnOne = (result: StoryResult | undefined) => result !== undefined && result.opponent !== HOUSE;

  /** A player's 1v1 outcomes before this week, oldest first. */
  const pastOf = (player: string) => before.map((each) => each.results[player]).filter(oneOnOne).map((result) => result!.outcome);
  const winsInARow = (outcomes: string[]) => {
    let count = 0;
    for (let at = outcomes.length - 1; at >= 0 && outcomes[at] === 'win'; at -= 1) count += 1;
    return count;
  };

  // The leader going into the week: the most Season Points so far, alone at the top.
  const totals: Record<string, number> = {};
  for (const each of before) for (const [player, result] of Object.entries(each.results)) totals[player] = (totals[player] ?? 0) + (result.seasonPoints ?? 0);
  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const leader = ranked.length > 0 && (ranked.length === 1 || ranked[0]![1] > ranked[1]![1]) ? ranked[0]![0] : null;

  const RANK: Record<Story['kind'], number> = { snapped: 0, leader: 1, streak: 2, firstWin: 3, blowout: 4, edged: 5 };
  const stories: Story[] = [];
  for (const [player, result] of Object.entries(now.results)) {
    if (player === HOUSE || !oneOnOne(result)) continue;
    const past = pastOf(player);
    const streak = winsInARow(past);
    const margin = result.points - result.opponentPoints;
    const other = result.opponent;
    if (result.outcome !== 'win') {
      if (streak >= STREAK) stories.push({ kind: 'snapped', player, other, count: streak });
      continue;
    }
    if (other === leader) stories.push({ kind: 'leader', player, other, count: 0 });
    if (streak + 1 >= STREAK) stories.push({ kind: 'streak', player, other, count: streak + 1 });
    if (past.length >= 2 && past.every((outcome) => outcome === 'loss')) stories.push({ kind: 'firstWin', player, other, count: past.length });
    if (margin >= 20) stories.push({ kind: 'blowout', player, other, count: margin });
    if (margin === 1) stories.push({ kind: 'edged', player, other, count: 1 });
  }
  return stories.sort((a, b) => RANK[a.kind] - RANK[b.kind]).slice(0, MOST_HEADLINES);
}
