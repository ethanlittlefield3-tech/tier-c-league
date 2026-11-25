/**
 * Receipts on demand: who can ask, when proof is due, and what a result costs.
 */

import { addDays, dayEnd, dayLock, dayStart, toLocal, type DateStr, type Instant } from './calendar.ts';
import type { Verdict } from './kit.ts';
import { RULES, type Square } from './scoring.ts';

/** A request made at or after this hour gets until the end of the next day. */
export const LATE_REQUEST_HOUR = 18;

/**
 * When proof is due. "By 11:59 pm" means before the next day starts, so the
 * deadline is the first instant of the day after:
 * - requested before 6 pm: the end of that same day;
 * - requested at 6 pm or later: the end of the next day.
 */
export function proofDeadline(requestedAt: Instant, timeZone: string): Instant {
  const local = toLocal(requestedAt, timeZone);
  const dueDate = local.hour >= LATE_REQUEST_HOUR ? addDays(local.date, 1) : local.date;
  return dayEnd(dueDate, timeZone);
}

export interface ReceiptRequest {
  /** The day being challenged. */
  target: DateStr;
  square: Square;
  timeZone: string;
  now: Instant;
  /** The requester is asking about their own day. */
  ownDay: boolean;
  /** The target day is that player's rest day. */
  restDay: boolean;
  /** The square holds a claim: a goal marked hit, or logged screen time. */
  claimed: boolean;
  /** Someone already asked for receipts on this square. */
  alreadyRequested: boolean;
  /** Requests this requester has already made in the current week. */
  usedThisWeek: number;
  /** The target day's start and lock from its calendar, when known. A fast test league's days are only known this way. */
  window?: { start: Instant; lock: Instant };
}

/** Anyone can ask on any claimed square of anyone else's day, until that day locks. 3 a week each. */
export function canRequestReceipt(request: ReceiptRequest): Verdict {
  const no = (reason: string): Verdict => ({ ok: false, reason });
  if (request.ownDay) return no("You can't ask yourself for receipts.");
  const start = request.window?.start ?? dayStart(request.target, request.timeZone);
  const lock = request.window?.lock ?? dayLock(request.target, request.timeZone);
  if (request.now < start) return no("That day hasn't started yet.");
  if (request.now >= lock) return no('That day locked at 12:00 pm.');
  if (request.restDay && request.square !== 'screen') {
    return no('On a rest day, receipts cover screen time only.');
  }
  if (!request.claimed) return no('Nothing is logged on that square to prove.');
  if (request.alreadyRequested) return no('Receipts were already requested on that square.');
  if (request.usedThisWeek >= RULES.receiptsPerWeek) {
    return no(`You have used your ${RULES.receiptsPerWeek} requests this week.`);
  }
  return { ok: true };
}

/**
 * - `pending`: the deadline has not passed and nothing has happened yet.
 * - `proven`: proof was uploaded in time.
 * - `backedDown`: the player took the claim back in time. No penalty.
 * - `failed`: the deadline passed with the claim still standing and no proof.
 */
export type ReceiptStatus = 'pending' | 'proven' | 'backedDown' | 'failed';

export interface ReceiptState {
  deadline: Instant;
  now: Instant;
  /** When proof was uploaded, if it was. */
  proofAt: Instant | null;
  /** When the player backed down, if they did. */
  backedDownAt: Instant | null;
}

export function receiptStatus(state: ReceiptState): ReceiptStatus {
  if (state.proofAt !== null && state.proofAt < state.deadline) return 'proven';
  if (state.backedDownAt !== null && state.backedDownAt < state.deadline) return 'backedDown';
  if (state.now < state.deadline) return 'pending';
  return 'failed';
}

/**
 * What a receipt does to the day's score.
 * - Backing down is free: the square just stops counting.
 * - A failure voids the square and costs 1 more point.
 */
export function receiptEffect(status: ReceiptStatus): { voided: boolean; adjustment: number } {
  if (status === 'failed') return { voided: true, adjustment: RULES.receiptPenalty };
  if (status === 'backedDown') return { voided: true, adjustment: 0 };
  return { voided: false, adjustment: 0 };
}

/** A receipt as it is stored: the day and square asked about, and what happened. */
export interface StoredReceipt {
  date: DateStr;
  square: Square;
  deadline: Instant;
  proofAt: Instant | null;
  backedDownAt: Instant | null;
}

/**
 * What a player's receipts do to their days as of `now`, in the same shape as
 * the commish's fixes, so every score adds them the same way: a square backed
 * down from is voided for free, and a failed one is voided and costs 1 more.
 */
export function receiptFixes(receipts: readonly StoredReceipt[], now: Instant): { date: DateStr; amount: number; void: Square | null }[] {
  return receipts.flatMap((receipt) => {
    const effect = receiptEffect(receiptStatus({ deadline: receipt.deadline, now, proofAt: receipt.proofAt, backedDownAt: receipt.backedDownAt }));
    return effect.voided ? [{ date: receipt.date, amount: effect.adjustment, void: receipt.square }] : [];
  });
}

/**
 * When proof is due for a receipt asked for at `now` on a day. In the
 * playoffs it is 6 pm the day after, when the day has locked, so the reset
 * day closes every receipt before the next round; otherwise it is the end of
 * that day, or of the next day when asked at 6 pm or later. The rules check
 * the same numbers from the same calendar document.
 */
export function receiptDue(day: { phase?: string; sixPm: Instant; end: Instant; nextEnd: Instant; lock: Instant }, now: Instant): Instant {
  if (day.phase === 'playoff') return day.lock + 6 * 3_600_000;
  return now < day.sixPm ? day.end : day.nextEnd;
}
