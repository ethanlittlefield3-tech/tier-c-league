/**
 * A season reset (the commish's request, 2026-11-28): the commish takes the
 * current season back as if it had never been set up. The league goes back to
 * the season before it (or to no season, for the first), the season and
 * everything in it is deleted, and everything it gave out comes off each
 * profile: its weeks from the rank history, its badges (and any car part
 * they unlocked), its season decal, the stickers, its trophies, the banner
 * and its news in the feed. The rivalry records are worked out again from the
 * seasons left. Members stay, and so does the chat on the wall.
 *
 * Nothing here reads a clock or the database: jobs/reset.ts does, and passes
 * what it read in.
 */
import { RANK_DECAL, STARTER_PARTS, rankFromWeeks, seasonDecals, unlockedParts, type Rank } from '../../engine/src/index.ts';
import type { RankEntry } from './ranks.ts';

const MIN = 60_000;

/** A season's number: `s3` is 3. Anything else, like the practice week, has none. */
const numberOf = (id: string) => (/^s([0-9]+)$/.test(id) ? Number(id.slice(1)) : null);

/** The season the league goes back to: the highest-numbered one before it, or none. */
export function previousSeason(ids: readonly string[], season: string): string | null {
  const own = numberOf(season) ?? Infinity;
  const before = ids.map((id) => ({ id, number: numberOf(id) })).filter((each): each is { id: string; number: number } => each.number !== null && each.number < own);
  return before.sort((a, b) => b.number - a.number)[0]?.id ?? null;
}

/** The champion's banner once the season is gone: the season before's champion, if the banner was the reset season's. */
export function bannerAfter(input: { banner: { player: string; season: string } | null | undefined; season: string; previous: { id: string; champion: string | null } | null }): { player: string; season: string } | null {
  if (input.banner && input.banner.season !== input.season) return input.banner;
  return input.previous?.champion ? { player: input.previous.champion, season: input.previous.id } : null;
}

/** What the reset reads from a profile. */
export interface ResetProfile {
  rank?: string | null;
  rankHistory?: RankEntry[];
  badges?: Record<string, { season?: string } & Record<string, unknown>>;
  seasons?: Record<string, number>;
  car?: Record<string, unknown>;
  stickers?: Record<string, unknown>;
}

/**
 * What comes off a profile: only the fields that change, so a profile the
 * season never touched is left as it is. `rank: null` and `stickers: null`
 * mean the field goes.
 */
export function profileReset(profile: ResetProfile, season: string): { update: Record<string, unknown>; removedBadges: string[] } {
  const update: Record<string, unknown> = {};

  const history = profile.rankHistory ?? [];
  const kept = history.filter((entry) => entry.season !== season);
  // Each week keeps the rank it led to, worked out again from the weeks up to it.
  const ranked = kept.map((entry, index) => ({
    ...entry,
    rank: rankFromWeeks(kept.slice(0, index + 1))!.rank,
  }));
  const rank: Rank | null = ranked.at(-1)?.rank ?? null;
  if (JSON.stringify(ranked) !== JSON.stringify(history)) update.rankHistory = ranked;
  if ((profile.rank ?? null) !== rank) update.rank = rank;

  const badges = profile.badges ?? {};
  const removedBadges = Object.keys(badges).filter((badge) => badges[badge]?.season === season);
  if (removedBadges.length) update.badges = Object.fromEntries(Object.entries(badges).filter(([badge]) => !removedBadges.includes(badge)));

  const seasons = profile.seasons ?? {};
  const keptSeasons = Object.fromEntries(Object.entries(seasons).filter(([id]) => id !== season));
  if (season in seasons) update.seasons = keptSeasons;

  // A part the player no longer has goes back to the starter part for its slot.
  if (profile.car) {
    const owned = [...unlockedParts(Object.keys(badges).filter((badge) => !removedBadges.includes(badge))), ...seasonDecals(keptSeasons), ...(rank ? [RANK_DECAL] : [])];
    const car = { ...profile.car };
    let changed = false;
    for (const [slot, id] of Object.entries(profile.car)) {
      if (typeof id !== 'string') continue;
      const ofSlot = STARTER_PARTS.filter((part) => part.slot === slot);
      // Not a part slot (the accent zones), or one the catalog doesn't know.
      if (ofSlot.length === 0) continue;
      if (owned.some((part) => part.slot === slot && part.id === id)) continue;
      car[slot] = (ofSlot.find((part) => part.id === 'none') ?? ofSlot[0]!).id;
      changed = true;
    }
    if (changed) update.car = car;
  }

  // Dodger and L only ever come from the current season's weeks.
  if (profile.stickers && Object.keys(profile.stickers).length) update.stickers = null;
  return { update, removedBadges };
}

/** The feed's news from the season: its ranks, picks, champion and offseason departures, and each badge taken away. */
export function feedToClear(ids: readonly string[], season: string, removedBadges: Readonly<Record<string, readonly string[]>>): string[] {
  const badgeNews = new Set(Object.entries(removedBadges).flatMap(([player, badges]) => badges.map((badge) => `badge_${player}_${badge}`)));
  const ofSeason = new RegExp(`^(rank_.+_${season}_[a-z0-9]+|picks_${season}_[a-z0-9]+|champion_${season}|left_${season}_.+)$`);
  return ids.filter((id) => ofSeason.test(id) || badgeNews.has(id));
}

/** The commish's request, as the jobs read it, with its times in milliseconds. */
export interface ResetRequest {
  status: 'requested' | 'running' | 'failed';
  dispatchedAt?: number | null;
  runAt?: number | null;
}

/**
 * What the alerts job does about a reset on each run: start the reset job,
 * once, and again if it hasn't finished half an hour later. A reset that
 * failed stays for the commish to see.
 */
export function resetStep(input: { request: ResetRequest | null; now: number }): 'start' | null {
  const { request, now } = input;
  if (!request || request.status === 'failed') return null;
  const last = Math.max(request.dispatchedAt ?? 0, request.runAt ?? 0);
  return now - last >= 30 * MIN ? 'start' : null;
}
