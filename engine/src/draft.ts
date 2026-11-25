/**
 * Rival picks at the draft (SCOPE.md, "Draft day agenda", step 4): in draft
 * order, each unpicked player chooses a Week 1 opponent, on a 2-minute clock,
 * and a missed pick is made at random. With an odd count, the last player
 * faces The House.
 */
import { HOUSE, type Pair } from './schedule.ts';

/** Each pick's clock. */
export const PICK_SECONDS = 120;

export interface PickState {
  /** The players still unpicked, in draft order. */
  left: readonly string[];
  /** Who each picker chose. */
  picks: Readonly<Record<string, string>>;
}

/** Whose pick it is: the first unpicked player, or `null` once there is no pick left to make. */
export function picker(left: readonly string[]): string | null {
  return left.length >= 2 ? (left[0] as string) : null;
}

/** True once every pick is made: nobody, or only the player who faces The House, is left. */
export function picksDone(left: readonly string[]): boolean {
  return left.length <= 1;
}

/** The current picker chooses `rival`. Both leave the running, and the rest keep their order. */
export function applyPick(state: PickState, rival: string): { left: string[]; picks: Record<string, string> } {
  const who = picker(state.left);
  if (who === null) throw new RangeError('There is no pick left to make.');
  if (rival === who) throw new RangeError('A player cannot pick themselves.');
  if (!state.left.includes(rival)) throw new RangeError('That player has already been picked.');
  return { left: state.left.filter((player) => player !== who && player !== rival), picks: { ...state.picks, [who]: rival } };
}

/**
 * The rival for a missed pick: one of the other unpicked players, chosen by
 * `roll`, a random whole number the caller supplies (the engine has no
 * randomness of its own).
 */
export function missedPick(left: readonly string[], roll: number): string {
  const choices = left.slice(1);
  if (choices.length === 0) throw new RangeError('There is no pick left to make.');
  return choices[Math.abs(Math.trunc(roll)) % choices.length] as string;
}

/** When the current pick's clock runs out, from when it started (both in milliseconds). */
export function pickDeadline(turnStartedAt: number): number {
  return turnStartedAt + PICK_SECONDS * 1000;
}

/** Week 1's matchups: the picks in draft order, then the odd one out against The House. */
export function week1Pairs(draft: { order: readonly string[]; picks: Readonly<Record<string, string>>; left: readonly string[] }): Pair[] {
  const pairs: Pair[] = draft.order.filter((player) => Object.hasOwn(draft.picks, player)).map((player) => [player, draft.picks[player] as string]);
  if (draft.left.length === 1) pairs.push([draft.left[0] as string, HOUSE]);
  return pairs;
}
