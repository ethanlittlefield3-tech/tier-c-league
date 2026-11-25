import { useEffect, useRef } from 'preact/hooks';
import { pickDeadline, picker } from '@tcl/engine';
import type { Me } from '../data/identity.ts';
import { loadData } from '../data/load.ts';

export interface PickView {
  step?: string;
  order?: string[];
  left?: string[];
  picks?: Record<string, string>;
  /** When the current pick's clock started, in milliseconds. */
  turnStartedAt?: number | null;
}

/**
 * On the commish's phone: once a pick's 2-minute clock runs out, the pick is
 * made at random (SCOPE.md: "a missed pick is made at random"). It tries once
 * for each pick; Commish tools also has a button for it.
 */
export function useMissedPicks(me: Me, seasonId: string | null, state: PickView | null, isCommish: boolean, now: number): void {
  const tried = useRef<string | null>(null);
  const left = state?.left ?? [];
  const who = state?.step === 'rivals' ? picker(left) : null;
  const started = state?.turnStartedAt ?? null;
  const due = isCommish && seasonId !== null && who !== null && started !== null && now >= pickDeadline(started);
  useEffect(() => {
    if (!due || !seasonId) return;
    const turn = `${who}@${left.length}`;
    if (tried.current === turn) return;
    tried.current = turn;
    void loadData()
      .then((api) => api.pickForMissed(me, seasonId))
      .catch(() => undefined);
  }, [due, seasonId, who, left.length]);
}
