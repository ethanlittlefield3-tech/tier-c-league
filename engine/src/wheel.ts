/**
 * The Wheel of Shame (SCOPE.md, "Wheel of Shame"). Each week's lowest scorer
 * spins a sealed wheel live, then proves the dare or spins again. The server
 * draws the result when the week goes final; the spin only reveals it.
 */
import { addDays, dayEnd, localDate, weekdayIndex, type Instant } from './calendar.ts';
import { voteOutcome } from './votes.ts';

/** The most slices on the wheel. */
export const WHEEL_MAX = 16;

/** No proof by the deadline costs this many Season Points. */
export const DODGE_PENALTY = -3;

/** Everyone else votes on a dare's proof for this long. */
export const PROOF_VOTE_HOURS = 24;

/**
 * The wheel's slices: every dare from the draft that stands, then starter
 * dares to fill it, 16 at most. `starterOrder` is the starters' indexes in a
 * random order the caller supplies (the engine has no randomness).
 * PROVISIONAL: SCOPE.md's pool can reach 20 (8 starters and 12 players), but
 * the wheel holds 16, so starters give way. Waiting on the commish.
 */
export function wheelPool(playerDares: readonly string[], starters: readonly string[], starterOrder: readonly number[]): string[] {
  const dares = playerDares.slice(0, WHEEL_MAX);
  const room = WHEEL_MAX - dares.length;
  const picked = starterOrder.filter((index) => index >= 0 && index < starters.length).slice(0, room);
  return [...dares, ...picked.map((index) => starters[index] as string)];
}

/**
 * When proof is due: 11:59 pm on the Sunday after the draw, in league time
 * ("by 11:59 pm on the Sunday after the spin"). It runs from the draw, so a
 * spinner who never taps Spin is still on the clock. PROVISIONAL.
 */
export function dareDue(drawnAt: Instant, timeZone: string): Instant {
  const date = localDate(drawnAt, timeZone);
  return dayEnd(addDays(date, 6 - weekdayIndex(date)), timeZone);
}

/**
 * - `unspun`: drawn and sealed, waiting for the spinner.
 * - `spun`: revealed; waiting for proof.
 * - `voting`: proof is up and everyone else is voting.
 * - `counted`: the dare is done.
 * - `redo`: more than half the league said it doesn't count: a new sealed spin.
 * - `dodged`: no proof by the deadline.
 */
export type DareStatus = 'unspun' | 'spun' | 'voting' | 'counted' | 'redo' | 'dodged';

export function dareStatus(input: {
  spunAt: Instant | null;
  proofAt: Instant | null;
  dueAt: Instant;
  now: Instant;
  /** Players who can vote on the proof: everyone but the spinner. */
  eligible: number;
  counts: number;
  doesntCount: number;
}): DareStatus {
  if (input.proofAt !== null) {
    const closed = input.now >= input.proofAt + PROOF_VOTE_HOURS * 3_600_000;
    const outcome = voteOutcome({ eligible: input.eligible, approvals: input.counts, vetoes: input.doesntCount, closed });
    return outcome === 'vetoed' ? 'redo' : outcome === 'approved' ? 'counted' : 'voting';
  }
  if (input.now >= input.dueAt) return 'dodged';
  return input.spunAt === null ? 'unspun' : 'spun';
}
