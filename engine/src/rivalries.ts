/**
 * Rivalry records and the nemesis tag (SCOPE.md, "Live rivalry and social"):
 * every player's all-time head-to-head against each player they have met in
 * a 1v1 week, across seasons. Weeks against The House don't count.
 */
import { HOUSE, againstPlayer } from './schedule.ts';

/** One player's all-time record against another, from their own side. */
export interface Rival {
  win: number;
  draw: number;
  loss: number;
  /** The last week they met, for breaking a tie for nemesis. */
  lastMet: { season: string; week: number };
}

/** A final week's 1v1 results, by player. */
export interface RivalWeek {
  season: string;
  week: number;
  results: Record<string, { opponent: string; outcome: 'win' | 'draw' | 'loss' | 'none' }>;
}

/** "s3" is season 3. */
const seasonNumber = (season: string) => Number(season.replace(/\D/g, '')) || 0;

/** Which of two meetings came later: positive when `a` did. */
const later = (a: Rival['lastMet'], b: Rival['lastMet']) => seasonNumber(a.season) - seasonNumber(b.season) || a.week - b.week;

/** Each player's record against every player they have met, worked out from every final week. */
export function rivalRecords(weeks: readonly RivalWeek[]): Record<string, Record<string, Rival>> {
  const records: Record<string, Record<string, Rival>> = {};
  const inOrder = [...weeks].sort((a, b) => later({ season: a.season, week: a.week }, { season: b.season, week: b.week }));
  for (const week of inOrder) {
    for (const [player, result] of Object.entries(week.results)) {
      // Only 1v1 weeks against a player: not The House, and not a group-play week with no single opponent.
      if (player === HOUSE || typeof result.opponent !== 'string' || !againstPlayer(result.opponent) || result.outcome === 'none') continue;
      const mine = (records[player] ??= {});
      const rival = (mine[result.opponent] ??= { win: 0, draw: 0, loss: 0, lastMet: { season: week.season, week: week.week } });
      rival[result.outcome] += 1;
      rival.lastMet = { season: week.season, week: week.week };
    }
  }
  return records;
}

/**
 * Your nemesis: whoever has beaten you most. A tie goes to whoever you have
 * the worse record against, then to the one you met last. Nobody, until
 * someone has beaten you.
 */
export function nemesisOf(rivals: Record<string, Rival> | null | undefined): string | null {
  let best: [string, Rival] | null = null;
  for (const [player, rival] of Object.entries(rivals ?? {})) {
    if (rival.loss < 1) continue;
    if (best === null) {
      best = [player, rival];
      continue;
    }
    const [, top] = best;
    const order = rival.loss - top.loss || rival.loss - rival.win - (top.loss - top.win) || later(rival.lastMet, top.lastMet);
    if (order > 0) best = [player, rival];
  }
  return best?.[0] ?? null;
}

/** "3–1–2": wins, draws and losses. */
export const recordText = (rival: Pick<Rival, 'win' | 'draw' | 'loss'> | null | undefined) => `${rival?.win ?? 0}–${rival?.draw ?? 0}–${rival?.loss ?? 0}`;
