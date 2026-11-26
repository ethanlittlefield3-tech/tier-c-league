import { openDares } from '@tcl/engine';
import { useAll, useDoc, useNow, useWhere } from '../data/hooks.ts';

/** "Friday, Mar 12, 11:59 pm", in league time. */
export function deadlineWords(at: number, timeZone: string): string {
  return new Date(at).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone }).replace(' AM', ' am').replace(' PM', ' pm').replace(' at ', ', ');
}

/**
 * The offseason as it stands (SCOPE.md, "Seasons"): the Stay-or-Leave
 * deadline, the answers, who left, and the season's dares still open. The
 * next season starts once the deadline has passed, the leavers are off the
 * roster, and every dare is done.
 */
export function useOffseason(leaguePath: string, seasonPath: string | null, finished: boolean) {
  const now = useNow();
  const path = (sub: string) => (finished && seasonPath ? `${seasonPath}/${sub}` : null);
  const league = useDoc<{ members?: Record<string, boolean> }>(leaguePath);
  const config = useDoc<{ deadline?: number; closedAt?: number | null; left?: string[] }>(path('config/offseason'));
  const stays = useAll<{ player: string; choice: string }>(path('stays'));
  const weeks = useAll<{ wheel?: Record<string, { id: string; dueAt: number }> }>(path('weeks'));
  const spins = useAll<{ at: number | null; proofAt: number | null }>(path('spins'));
  const votes = useWhere<{ draw: string; choice: string }>(path('votes'), 'kind', 'proof');
  const deadline = config.data?.deadline ?? null;
  const open = openDares({
    draws: weeks.docs.flatMap((found) => Object.values(found.data.wheel ?? {})),
    spins: Object.fromEntries(spins.docs.map((found) => [found.id, found.data])),
    votes: votes.docs.map((found) => found.data),
    eligible: Math.max(0, Object.keys(league.data?.members ?? {}).length - 1),
    now,
  });
  const closed = config.data?.closedAt !== undefined && config.data.closedAt !== null;
  return {
    loading: league.loading || config.loading || stays.loading || weeks.loading || spins.loading || votes.loading,
    deadline,
    passed: deadline !== null && now >= deadline,
    closed,
    left: config.data?.left ?? [],
    answers: Object.fromEntries(stays.docs.map((found) => [found.id, found.data.choice])) as Record<string, string>,
    openDares: open,
    ready: closed && open.length === 0,
  };
}
