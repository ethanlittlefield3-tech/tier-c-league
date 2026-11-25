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
  /** True while this is the phone's own copy, before the server has answered. */
  fromCache: boolean;
  error: Trouble | null;
}

/** A live document at `path`, or nothing while `path` is `null`. */
export function useDoc<T>(path: string | null): LiveDoc<T> {
  const [state, setState] = useState<LiveDoc<T>>({ loading: path !== null, data: null, pending: false, fromCache: path !== null, error: null });
  useEffect(() => {
    if (path === null) {
      setState({ loading: false, data: null, pending: false, fromCache: false, error: null });
      return undefined;
    }
    setState({ loading: true, data: null, pending: false, fromCache: true, error: null });
    let stop: (() => void) | null = null;
    let stopped = false;
    loadData().then(
      (api) => {
        if (stopped) return;
        stop = api.watchDoc(
          path,
          (live) => setState({ loading: false, data: live.data as T | null, pending: live.pending, fromCache: live.fromCache, error: null }),
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

/** Every document in a collection whose `field` equals `value`, live. Nothing while `path` is `null`. */
export function useWhere<T>(path: string | null, field: string, value: string | number | null): { loading: boolean; docs: { id: string; data: T }[]; error: Trouble | null } {
  const [state, setState] = useState<{ loading: boolean; docs: { id: string; data: T }[]; error: Trouble | null }>({ loading: path !== null, docs: [], error: null });
  useEffect(() => {
    if (path === null || value === null) {
      setState({ loading: false, docs: [], error: null });
      return undefined;
    }
    setState({ loading: true, docs: [], error: null });
    let stop: (() => void) | null = null;
    let stopped = false;
    loadData().then(
      (api) => {
        if (stopped) return;
        stop = api.watchWhere(
          path,
          field,
          value,
          (docs) => setState({ loading: false, docs: docs as { id: string; data: T }[], error: null }),
          (why) => setState((before) => ({ ...before, loading: false, error: why })),
        );
      },
      () => setState((before) => ({ ...before, loading: false, error: 'offline' })),
    );
    return () => {
      stopped = true;
      stop?.();
    };
  }, [path, field, value]);
  return state;
}

/** Live documents whose `field` is between `from` and `to`, both included: a week's days, by date. */
export function useBetween<T>(path: string | null, field: string, from: string | null, to: string | null): { loading: boolean; docs: { id: string; data: T }[]; error: Trouble | null } {
  const [state, setState] = useState<{ loading: boolean; docs: { id: string; data: T }[]; error: Trouble | null }>({ loading: path !== null, docs: [], error: null });
  useEffect(() => {
    if (path === null || from === null || to === null) {
      setState({ loading: false, docs: [], error: null });
      return undefined;
    }
    setState({ loading: true, docs: [], error: null });
    let stop: (() => void) | null = null;
    let stopped = false;
    loadData().then(
      (api) => {
        if (stopped) return;
        stop = api.watchBetween(
          path,
          field,
          from,
          to,
          (docs) => setState({ loading: false, docs: docs as { id: string; data: T }[], error: null }),
          (why) => setState((before) => ({ ...before, loading: false, error: why })),
        );
      },
      () => setState((before) => ({ ...before, loading: false, error: 'offline' })),
    );
    return () => {
      stopped = true;
      stop?.();
    };
  }, [path, field, from, to]);
  return state;
}

/**
 * One look at a document that may still be sealed, taken again whenever
 * `again` changes. Today passes the number of days locked so far, so it looks
 * once after each noon, when a Demolition can be revealed.
 */
export function usePeek<T>(path: string | null, again: number): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (path === null) {
      setData(null);
      return undefined;
    }
    let stopped = false;
    loadData()
      .then((api) => api.peekDoc(path))
      .then((found) => {
        if (!stopped) setData(found as T | null);
      })
      .catch(() => undefined);
    return () => {
      stopped = true;
    };
  }, [path, again]);
  return data;
}

/** Every document in a collection, live. Nothing while `path` is `null`. */
export function useAll<T>(path: string | null): { loading: boolean; docs: { id: string; data: T }[]; error: Trouble | null } {
  const [state, setState] = useState<{ loading: boolean; docs: { id: string; data: T }[]; error: Trouble | null }>({ loading: path !== null, docs: [], error: null });
  useEffect(() => {
    if (path === null) {
      setState({ loading: false, docs: [], error: null });
      return undefined;
    }
    setState({ loading: true, docs: [], error: null });
    let stop: (() => void) | null = null;
    let stopped = false;
    loadData().then(
      (api) => {
        if (stopped) return;
        stop = api.watchAll(
          path,
          (docs) => setState({ loading: false, docs: docs as { id: string; data: T }[], error: null }),
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
export function useNow(every = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(timer);
  }, [every]);
  return now;
}

/** The newest documents in a collection by one field, newest first, kept live. */
export function useLatest<T>(path: string | null, field: string, count: number): { loading: boolean; docs: { id: string; data: T }[]; error: Trouble | null } {
  const [state, setState] = useState<{ loading: boolean; docs: { id: string; data: T }[]; error: Trouble | null }>({ loading: path !== null, docs: [], error: null });
  useEffect(() => {
    if (path === null) {
      setState({ loading: false, docs: [], error: null });
      return undefined;
    }
    setState({ loading: true, docs: [], error: null });
    let stop: (() => void) | null = null;
    let stopped = false;
    loadData().then(
      (api) => {
        if (stopped) return;
        stop = api.watchLatest(
          path,
          field,
          count,
          (docs) => setState({ loading: false, docs: docs as { id: string; data: T }[], error: null }),
          (why) => setState((before) => ({ ...before, loading: false, error: why })),
        );
      },
      () => setState((before) => ({ ...before, loading: false, error: 'offline' })),
    );
    return () => {
      stopped = true;
      stop?.();
    };
  }, [path, field, count]);
  return state;
}
