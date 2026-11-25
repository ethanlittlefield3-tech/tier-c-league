/**
 * Small notes the app keeps on this phone, like "the full intro played today".
 *
 * A private window can refuse to store anything. These never throw: a note
 * that could not be kept just reads back as missing, and the app carries on.
 * Nothing that affects a score is ever kept here.
 */
export function recall(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Nothing to do: see above.
  }
}

export function forget(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to do: see above.
  }
}
