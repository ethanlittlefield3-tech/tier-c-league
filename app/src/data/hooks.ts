/**
 * Hooks that give a screen a live document. They load the database code in
 * the background the first time, so a screen that uses them never makes the
 * first screen wait.
 */
import { useEffect, useState } from 'preact/hooks';
import type { Trouble } from './identity.ts';
import { loadData } from './load.ts';

export interface LiveDoc<T> {
  /** True until the first answer arrives. */
  loading: boolean;
  /** The document, or `null` if there is none (or no path). */
  data: T | null;
  /** True while a save from this phone has not reached the server yet. */
  pending: boolean;
  error: Trouble | null;
}

/** A live document at `path`, or nothing while `path` is `null`. */
export function useDoc<T>(path: string | null): LiveDoc<T> {
  const [state, setState] = useState<LiveDoc<T>>({ loading: path !== null, data: null, pending: false, error: null });
  useEffect(() => {
    if (path === null) {
      setState({ loading: false, data: null, pending: false, error: null });
      return undefined;
    }
    setState({ loading: true, data: null, pending: false, error: null });
    let stop: (() => void) | null = null;
    let stopped = false;
    loadData().then(
      (api) => {
        if (stopped) return;
        stop = api.watchDoc(
          path,
          (live) => setState({ loading: false, data: live.data as T | null, pending: live.pending, error: null }),
          (why) => setState((before) => ({ ...before, loading: false, error: why })),
        );
      },
      () => setState((before) => ({ ...before, loading: false, error: 'offline' })),
    );
    return () => {
      stopped = true;
      stop?.();
    };
  }, [path]);
  return state;
}

/** The time now, updated twice a minute, so a day rolls over and locks on screen. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
