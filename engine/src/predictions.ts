/**
 * Predictions (SCOPE.md, "Live rivalry and social"): before a week starts,
 * each player picks the winners of its 1v1 matchups. A pick is right when the
 * player picked won. The week's top picker gets a shoutout, and the season's
 * best record wins Prophet. Predictions never change a score.
 */
import { HOUSE } from './schedule.ts';

export interface PickRecord {
  /** Matchups picked. */
  made: number;
  /** Picks that came true. */
  right: number;
}

/** Who a player picked in one matchup: one of its two players, or nobody. The House's matchups aren't picked. */
export function pickFor(picks: readonly string[], pair: { a: string; b: string }): string | null {
  if (pair.a === HOUSE || pair.b === HOUSE) return null;
  const a = picks.includes(pair.a);
  const b = picks.includes(pair.b);
  return a === b ? null : a ? pair.a : pair.b;
}

/** How a player's picks for a week did. A draw makes every pick on it wrong. */
export function scorePicks(picks: readonly string[], pairs: readonly { a: string; b: string }[], results: Record<string, { outcome: string }>): PickRecord {
  let made = 0;
  let right = 0;
  for (const pair of pairs) {
    const pick = pickFor(picks, pair);
    if (pick === null) continue;
    made += 1;
    if (results[pick]?.outcome === 'win') right += 1;
  }
  return { made, right };
}

/**
 * The best records: the most right picks, at least one; a tie goes to the
 * fewer picks made, and players still level share it. The week's top picker
 * and the season's Prophet are both worked out this way.
 */
export function bestPickers(records: Record<string, PickRecord>): string[] {
  const entries = Object.entries(records).filter(([, record]) => record.right > 0);
  if (entries.length === 0) return [];
  const best = Math.max(...entries.map(([, record]) => record.right));
  const most = entries.filter(([, record]) => record.right === best);
  const fewest = Math.min(...most.map(([, record]) => record.made));
  return most
    .filter(([, record]) => record.made === fewest)
    .map(([player]) => player)
    .sort();
}

/** Adds up a player's records. */
export function addRecords(records: readonly PickRecord[]): PickRecord {
  return records.reduce((sum, record) => ({ made: sum.made + record.made, right: sum.right + record.right }), { made: 0, right: 0 });
}
