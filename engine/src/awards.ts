/**
 * Weekly awards for the recap: MVP, Bust and who spins the Wheel of Shame.
 */

export interface WeekLine {
  player: string;
  /** The player's own points that week, before any win bonus. */
  points: number;
  beers: number;
}

export interface Awards {
  /** More than one player only when points and beers are both level. */
  mvp: string[];
  /** Empty when nobody dropped below their own average. Shared only when the drop and beers are both level. */
  bust: string[];
  /** How far the Bust fell below their average. `null` in Weeks 1 and 2 and when there is no Bust. */
  bustDrop: number | null;
  /** Everyone tied for the lowest points spins. */
  wheel: string[];
}

/** How many earlier weeks the Bust average looks back over. */
export const BUST_LOOKBACK_WEEKS = 4;

/** A player's average over their last 4 finished weeks, using the weeks they have. */
export function recentAverage(earlierWeeks: readonly number[]): number | null {
  const recent = earlierWeeks.slice(-BUST_LOOKBACK_WEEKS);
  if (recent.length === 0) return null;
  let total = 0;
  for (const points of recent) total += points;
  return total / recent.length;
}

/**
 * @param week     The season week being settled, counted from 1.
 * @param lines    Every real player's line for this week.
 * @param earlier  Each player's points in earlier weeks, oldest first.
 */
export function weeklyAwards(
  week: number,
  lines: readonly WeekLine[],
  earlier: Readonly<Record<string, readonly number[]>> = {},
): Awards {
  if (lines.length === 0) return { mvp: [], bust: [], bustDrop: null, wheel: [] };

  // MVP: most points, and fewer beers breaks a tie.
  const top = Math.max(...lines.map((line) => line.points));
  const leaders = lines.filter((line) => line.points === top);
  const fewestBeers = Math.min(...leaders.map((line) => line.beers));
  const mvp = leaders.filter((line) => line.beers === fewestBeers).map((line) => line.player);

  // Wheel: the lowest points, and tied players all spin.
  const bottom = Math.min(...lines.map((line) => line.points));
  const wheel = lines.filter((line) => line.points === bottom).map((line) => line.player);

  // Bust: the lowest score in Weeks 1 and 2, then the biggest drop below your
  // own average. A tie goes to more beers; still level, it is shared.
  let candidates: WeekLine[] = [];
  let bustDrop: number | null = null;
  if (week <= 2) {
    candidates = lines.filter((line) => line.points === bottom);
  } else {
    // Each drop is kept as a whole-number fraction (average minus this week =
    // numerator / weeks), so two equal drops always compare as equal.
    let biggest: { numerator: number; weeks: number } | null = null;
    for (const line of lines) {
      const recent = (earlier[line.player] ?? []).slice(-BUST_LOOKBACK_WEEKS);
      if (recent.length === 0) continue;
      let total = 0;
      for (const points of recent) total += points;
      const drop = { numerator: total - line.points * recent.length, weeks: recent.length };
      if (drop.numerator <= 0) continue;
      const versus =
        biggest === null ? 1 : drop.numerator * biggest.weeks - biggest.numerator * drop.weeks;
      if (versus > 0) {
        biggest = drop;
        candidates = [line];
      } else if (versus === 0) {
        candidates.push(line);
      }
    }
    bustDrop = biggest === null ? null : biggest.numerator / biggest.weeks;
  }
  const mostBeers = Math.max(...candidates.map((line) => line.beers));
  const bust = candidates.filter((line) => line.beers === mostBeers).map((line) => line.player);

  return { mvp, bust, bustDrop, wheel };
}
