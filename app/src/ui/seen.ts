import type { Me } from '../data/identity.ts';
import { recall, remember } from '../storage.ts';

/** The places that mark what is new since you last looked: three tabs and the Garage. */
export type Spot = 'feed' | 'match' | 'league' | 'garage';

export const SPOTS: readonly Spot[] = ['feed', 'match', 'league', 'garage'];

const keyOf = (me: Pick<Me, 'league' | 'player'>, spot: Spot) => `tcl.seen.${me.league}.${me.player}.${spot}`;

/** When you last looked at `spot` on this phone, or `null` if this phone never kept it. */
export function lastSeen(me: Pick<Me, 'league' | 'player'>, spot: Spot): number | null {
  const kept = Number(recall(keyOf(me, spot)));
  return Number.isFinite(kept) && kept > 0 ? kept : null;
}

/** Notes that you looked at `spot` now. */
export function markSeen(me: Pick<Me, 'league' | 'player'>, spot: Spot, at = Date.now()): void {
  remember(keyOf(me, spot), String(at));
}

/**
 * The first time a phone opens the app in a league, every spot counts as seen
 * then, so only what happens after that is marked new.
 */
export function startSeen(me: Pick<Me, 'league' | 'player'>, at = Date.now()): void {
  for (const spot of SPOTS) {
    if (lastSeen(me, spot) === null) markSeen(me, spot, at);
  }
}

/** True when `latest` came after the last look. With no look kept, nothing is new. */
export function isNew(latest: number | null | undefined, seen: number | null): boolean {
  return typeof latest === 'number' && seen !== null && latest > seen;
}

/** The newest post by someone else that is still up: what puts a dot on Feed. Posts come newest first. */
export function newestFromOthers(posts: readonly { by?: string; at?: number; deleted?: boolean }[], me: string): number | null {
  return posts.find((post) => post.by !== me && !post.deleted)?.at ?? null;
}
