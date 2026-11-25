import { useEffect, useState } from 'preact/hooks';

/** Whether the phone says it has a connection, kept up to date. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

/** How long before a lock an unsent save gets a warning. */
export const LATE_SYNC_WARNING = 3 * 3_600_000;

/** Whether an unsent save could miss the day's lock: offline, something waiting, and the lock within 3 hours. */
export function lateSyncRisk(input: { online: boolean; pending: boolean; lock: number | null; now: number }): boolean {
  if (input.online || !input.pending || input.lock === null) return false;
  const left = input.lock - input.now;
  return left > 0 && left <= LATE_SYNC_WARNING;
}
