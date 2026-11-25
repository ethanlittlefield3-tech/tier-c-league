/**
 * Stickers a car wears for a while (SCOPE.md): "Dare Dodger" for a week after
 * dodging a dare, and an "L" for a week after losing a rematch. A sticker is
 * kept with the time it comes off, so a phone works out what shows from the
 * time alone.
 */

/** How long a sticker stays on. */
export const STICKER_DAYS = 7;

export type StickerId = 'dodger' | 'L';

export const STICKER_NAMES: Record<StickerId, string> = { dodger: 'Dare Dodger', L: 'L' };

/** The stickers on a car right now, in the order they are drawn. */
export function activeStickers(stickers: Partial<Record<string, { until?: unknown }>> | null | undefined, now: number): StickerId[] {
  return (['dodger', 'L'] as const).filter((id) => {
    const until = stickers?.[id]?.until;
    return typeof until === 'number' && now < until;
  });
}
