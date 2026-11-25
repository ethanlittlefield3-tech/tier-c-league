/**
 * Recovery keys, league codes and document IDs.
 *
 * Nothing here makes its own randomness: the caller passes random bytes in
 * (crypto.getRandomValues on a phone, node:crypto in a job), which keeps this
 * package pure and lets a test check the exact output.
 */

import type { DateStr } from './calendar.ts';
import type { Square } from './scoring.ts';

/**
 * 32 characters with the look-alikes left out: no 0 or O, no 1 or I.
 * Exactly 32 means each random byte maps to a character with equal odds.
 */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const CHARS = '[A-HJ-NP-Z2-9]';
const KEY_PATTERN = new RegExp(`^TCL-${CHARS}{4}-${CHARS}{4}$`);
const CODE_PATTERN = new RegExp(`^${CHARS}{8}$`);

function encode(bytes: Uint8Array, length: number): string {
  if (bytes.length < length) throw new RangeError(`This needs ${length} random bytes, and got ${bytes.length}.`);
  let out = '';
  for (let i = 0; i < length; i += 1) out += CODE_ALPHABET[(bytes[i] as number) & 31];
  return out;
}

/** A recovery key like TCL-7Q4M-X2K9: 40 bits, so guessing one is not practical. */
export function makeRecoveryKey(randomBytes: Uint8Array): string {
  const body = encode(randomBytes, 8);
  return `TCL-${body.slice(0, 4)}-${body.slice(4)}`;
}

export function isRecoveryKey(value: string): boolean {
  return KEY_PATTERN.test(value);
}

/** Tidy what a player typed. Returns the key, or `null` if it can't be one. */
export function normalizeRecoveryKey(typed: string): string | null {
  let body = typed.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (body.length === 11 && body.startsWith('TCL')) body = body.slice(3);
  const key = `TCL-${body.slice(0, 4)}-${body.slice(4)}`;
  return body.length === 8 && isRecoveryKey(key) ? key : null;
}

/** A league code: 8 characters, stored without a dash. */
export function makeLeagueCode(randomBytes: Uint8Array): string {
  return encode(randomBytes, 8);
}

export function isLeagueCode(value: string): boolean {
  return CODE_PATTERN.test(value);
}

/** How a code is shown and read out: XXXX-XXXX. */
export function formatLeagueCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normalizeLeagueCode(typed: string): string | null {
  const code = typed.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return isLeagueCode(code) ? code : null;
}

// ---------------------------------------------------------------------------
// Document IDs
//
// Fixed IDs are how the security rules allow "one of each per week": a second
// Aerial for the same week would have to be the same document.
// ---------------------------------------------------------------------------

export type KitItem = 'aerial' | 'fullBoost';

/**
 * A period is one stretch of play with its own kit. A regular-season week is
 * 'w01', 'w02' and so on; each playoff round gets its own tag when the
 * playoffs are built, because two rounds can share one calendar week.
 */
export function weekPeriod(week: number): string {
  if (!Number.isInteger(week) || week < 1 || week > 99) throw new RangeError(`Not a season week: ${week}`);
  return `w${String(week).padStart(2, '0')}`;
}

export function dayId(player: string, date: DateStr): string {
  return `${player}_${date}`;
}

export function kitId(period: string, player: string, item: KitItem): string {
  return `${period}_${player}_${item}`;
}

export function restId(period: string, player: string): string {
  return `${period}_${player}_rest`;
}

/** Demolitions live in the sealed collection, hidden until their day locks. */
export function sealedDemolitionId(period: string, player: string): string {
  return `${period}_${player}_demolition`;
}

export function ruleOneId(player: string, number: number): string {
  return `ruleOne_${player}_${number}`;
}

export function receiptId(player: string, date: DateStr, square: Square): string {
  return `${player}_${date}_${square}`;
}
