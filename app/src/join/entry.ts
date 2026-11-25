/**
 * Reading what a player typed as a league code or a recovery key.
 *
 * Both are made from 32 characters with the look-alikes left out: no 0 or O,
 * no 1 or I. So a typed code can be checked on the phone before anything is
 * sent, and a look-alike gets a hint instead of a plain "wrong".
 */
import { normalizeLeagueCode, normalizeRecoveryKey } from '@tcl/engine';

export type EntryProblem = 'empty' | 'shape' | 'lookalike';

const lettersAndNumbers = (typed: string) => typed.toUpperCase().replace(/[^A-Z0-9]/g, '');
const hasLookalike = (body: string) => /[01OI]/.test(body);

function problemWith(body: string): EntryProblem {
  if (body.length === 0) return 'empty';
  if (body.length !== 8) return 'shape';
  return hasLookalike(body) ? 'lookalike' : 'shape';
}

/** A league code as typed: the tidy code, or what is wrong with it. */
export function readCode(typed: string): { code: string } | { problem: EntryProblem } {
  const code = normalizeLeagueCode(typed);
  return code ? { code } : { problem: problemWith(lettersAndNumbers(typed)) };
}

/** A recovery key as typed: the tidy key, or what is wrong with it. */
export function readKey(typed: string): { key: string } | { problem: EntryProblem } {
  const key = normalizeRecoveryKey(typed);
  if (key) return { key };
  // The "TCL" at the front is not part of the 8 characters. It has no look-alikes of its own.
  const all = lettersAndNumbers(typed);
  return { problem: problemWith(all.startsWith('TCL') ? all.slice(3) : all) };
}
