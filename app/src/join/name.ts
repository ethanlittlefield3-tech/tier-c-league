/**
 * Display names: what a player types when joining, and what the app saves.
 * The security rules allow 1 to 24 characters, and count an emoji as two.
 * JavaScript's `length` counts the same way, so the two always agree.
 */
export const NAME_MAX = 24;

/** Spaces at the ends go, runs of spaces become one, and characters that never show are dropped. */
export function tidyName(typed: string): string {
  return typed
    .normalize('NFC')
    .replace(/[​-‍⁠﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** What is wrong with a name, or `null` if it is fine. */
export function nameProblem(typed: string): 'empty' | 'too-long' | null {
  const name = tidyName(typed);
  if (name.length === 0) return 'empty';
  if (name.length > NAME_MAX) return 'too-long';
  return null;
}
