/**
 * A phone waiting for the commish to let it in: which league, and the name it
 * asked with. It is kept on the phone, so closing the app doesn't lose it.
 */
import type { CarParts } from '../art/car/draw.ts';
import { forget, recall, remember } from '../storage.ts';

export interface Waiting {
  league: string;
  leagueName: string;
  code: string;
  displayName: string;
  /** The starter car picked while joining. */
  car?: CarParts;
}

const SLOTS = ['body', 'paint', 'decal', 'wheels', 'boost', 'explosion', 'topper'] as const;

/** A saved car, if every slot holds a name. The league checks the parts themselves. */
function readCar(value: unknown): CarParts | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const car = value as Record<string, unknown>;
  if (!SLOTS.every((slot) => typeof car[slot] === 'string')) return undefined;
  return Object.fromEntries(SLOTS.map((slot) => [slot, car[slot]])) as unknown as CarParts;
}

const KEY = 'tcl.waiting';

/** Reads a saved note, or `null` if there is none or it can't be read. */
export function readWaiting(text: string | null): Waiting | null {
  try {
    const note = JSON.parse(text ?? 'null') as Record<string, unknown> | null;
    if (note && typeof note.league === 'string' && typeof note.leagueName === 'string' && typeof note.code === 'string' && typeof note.displayName === 'string') {
      const car = readCar(note.car);
      return { league: note.league, leagueName: note.leagueName, code: note.code, displayName: note.displayName, ...(car ? { car } : {}) };
    }
  } catch {
    // A note that can't be read is treated as no note.
  }
  return null;
}

export const savedWaiting = (): Waiting | null => readWaiting(recall(KEY));
export const saveWaiting = (waiting: Waiting): void => remember(KEY, JSON.stringify(waiting));
export const clearWaiting = (): void => forget(KEY);
