import { useDoc } from '../data/hooks.ts';
import type { Me } from '../data/identity.ts';
import { leagueDates } from '../today/model.ts';

/**
 * Who you face this week, for the wall: just the opponent's id and name.
 * Before kickoff it is your Week 1 rival. `vsHouse` is true in a bye week.
 */
export function useOpponent(me: Me, now: number): { id: string | null; name: string; vsHouse: boolean } {
  const leaguePath = `leagues/${me.league}`;
  const league = useDoc<{ season?: string | null }>(leaguePath);
  const seasonId = league.data?.season ?? null;
  const seasonPath = seasonId ? `${leaguePath}/seasons/${seasonId}` : null;
  const season = useDoc<{ timeZone: string; kickoff: string }>(seasonPath);
  const dates = season.data ? leagueDates(now, season.data.timeZone) : null;
  const today = useDoc<{ period?: string }>(seasonPath && dates ? `${seasonPath}/calendar/${dates.today}` : null);
  const beforeKickoff = season.data !== null && dates !== null && dates.today < season.data.kickoff;
  const period = today.data?.period ?? (beforeKickoff ? 'w01' : null);
  const week = useDoc<{ targets?: Record<string, string[]> }>(seasonPath && period ? `${seasonPath}/weeks/${period}` : null);
  const targets = week.data?.targets?.[me.player] ?? [];
  const id = targets.find((target) => target !== 'HOUSE') ?? null;
  const profile = useDoc<{ displayName?: string }>(id ? `${leaguePath}/players/${id}` : null);
  return { id, name: profile.data?.displayName ?? 'your opponent', vsHouse: targets.includes('HOUSE') };
}
