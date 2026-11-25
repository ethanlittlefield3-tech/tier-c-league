/**
 * A phone waiting for the commish to let it in: which league, and the name it
 * asked with. It is kept on the phone, so closing the app doesn't lose it.
 */
import { forget, recall, remember } from '../storage.ts';

export interface Waiting {
  league: string;
  leagueName: string;
  code: string;
  displayName: string;
}

const KEY = 'tcl.waiting';

/** Reads a saved note, or `null` if there is none or it can't be read. */
export function readWaiting(text: string | null): Waiting | null {
  try {
    const note = JSON.parse(text ?? 'null') as Record<string, unknown> | null;
    if (note && typeof note.league === 'string' && typeof note.leagueName === 'string' && typeof note.code === 'string' && typeof note.displayName === 'string') {
      return { league: note.league, leagueName: note.leagueName, code: note.code, displayName: note.displayName };
    }
  } catch {
    // A note that can't be read is treated as no note.
  }
  return null;
}

export const savedWaiting = (): Waiting | null => readWaiting(recall(KEY));
export const saveWaiting = (waiting: Waiting): void => remember(KEY, JSON.stringify(waiting));
export const clearWaiting = (): void => forget(KEY);
