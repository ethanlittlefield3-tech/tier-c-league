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
  const captains = state as (PickView & { pool?: string[]; squads?: Record<string, string[]> }) | null;
  // A rival pick, or a captain's pick in the captains' draft.
  const who = state?.step === 'rivals' ? picker(left) : state?.step === 'captains' && (captains?.pool ?? []).length > 0 ? `captain@${(captains?.pool ?? []).length}` : null;
  const started = state?.turnStartedAt ?? null;
  const due = isCommish && seasonId !== null && who !== null && started !== null && now >= pickDeadline(started);
  useEffect(() => {
    if (!due || !seasonId) return;
    const turn = `${who}@${left.length}@${(captains?.pool ?? []).length}`;
    if (tried.current === turn) return;
    tried.current = turn;
    void loadData()
      .then((api) => api.pickForMissed(me, seasonId))
      .catch(() => undefined);
  }, [due, seasonId, who, left.length, (captains?.pool ?? []).length]);
}
