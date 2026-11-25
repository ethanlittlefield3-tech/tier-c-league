/**
 * Season standings.
 *
 * Players rank by Season Points. Tiebreakers, in order: head-to-head, fewer
 * beers, more perfect days, then a sealed coin flip.
 */

export interface StandingRow {
  player: string;
  seasonPoints: number;
  /** Beers logged across the regular season. */
  beers: number;
  perfectDays: number;
  /**
   * The sealed coin flip: a random number the jobs draw for each player and
   * keep sealed until a tie needs it. The lower number wins the flip.
   */
  coin: number;
}

/** One finished 1v1 between two real players. Games against The House are never listed. */
export interface Game {
  a: string;
  b: string;
  result: 'a' | 'b' | 'draw';
}

export type TieBreak = 'headToHead' | 'beers' | 'perfectDays' | 'coinFlip';

export interface RankedRow extends StandingRow {
  rank: number;
  /** The tiebreaker that set this player's place, or `null` when Season Points alone did. */
  tieBreak: TieBreak | null;
}

const TIE_BREAKS: readonly TieBreak[] = ['headToHead', 'beers', 'perfectDays', 'coinFlip'];

/** Split a group into buckets, best first, by a score where higher is better. */
function bucketsByScore<T>(group: readonly T[], score: (row: T) => number): T[][] {
  const sorted = [...group].sort((x, y) => score(y) - score(x));
  const buckets: T[][] = [];
  for (const row of sorted) {
    const last = buckets[buckets.length - 1];
    if (last && score(last[0] as T) === score(row)) last.push(row);
    else buckets.push([row]);
  }
  return buckets;
}

export function rankStandings(rows: readonly StandingRow[], games: readonly Game[]): RankedRow[] {
  const tieBreakOf = new Map<string, TieBreak | null>();

  // Results among the tied players only: 2 for a win, 1 each for a draw.
  const headToHead = (group: readonly StandingRow[]) => {
    const inGroup = new Set(group.map((row) => row.player));
    const score = new Map<string, number>();
    for (const game of games) {
      if (!inGroup.has(game.a) || !inGroup.has(game.b)) continue;
      if (game.result === 'a') score.set(game.a, (score.get(game.a) ?? 0) + 2);
      else if (game.result === 'b') score.set(game.b, (score.get(game.b) ?? 0) + 2);
      else {
        score.set(game.a, (score.get(game.a) ?? 0) + 1);
        score.set(game.b, (score.get(game.b) ?? 0) + 1);
      }
    }
    return (row: StandingRow) => score.get(row.player) ?? 0;
  };

  const scoreFor = (tieBreak: TieBreak, group: readonly StandingRow[]) => {
    if (tieBreak === 'headToHead') return headToHead(group);
    if (tieBreak === 'beers') return (row: StandingRow) => -row.beers;
    if (tieBreak === 'perfectDays') return (row: StandingRow) => row.perfectDays;
    return (row: StandingRow) => -row.coin;
  };

  // Work down the tiebreakers. Whenever one splits a group, every smaller
  // group that is still level starts again from head-to-head among itself.
  const order = (group: readonly StandingRow[], step: number): StandingRow[] => {
    if (group.length <= 1) return [...group];
    const tieBreak = TIE_BREAKS[step];
    if (!tieBreak) return [...group].sort((x, y) => (x.player < y.player ? -1 : 1));
    const buckets = bucketsByScore(group, scoreFor(tieBreak, group));
    if (buckets.length === 1) return order(group, step + 1);
    return buckets.flatMap((bucket) => {
      if (bucket.length === 1) tieBreakOf.set((bucket[0] as StandingRow).player, tieBreak);
      return order(bucket, 0);
    });
  };

  const ranked: RankedRow[] = [];
  for (const group of bucketsByScore(rows, (row) => row.seasonPoints)) {
    for (const row of order(group, 0)) {
      ranked.push({ ...row, rank: ranked.length + 1, tieBreak: tieBreakOf.get(row.player) ?? null });
    }
  }
  return ranked;
}
