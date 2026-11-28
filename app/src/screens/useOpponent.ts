import { useDoc } from '../data/hooks.ts';
import type { Me } from '../data/identity.ts';
import { seasonDates } from '../today/model.ts';
import { playSeasonOf } from '../practice/play.ts';

/**
 * Who you face this week, for the wall: just the opponent's id and name.
 * Before kickoff it is your Week 1 rival. `vsHouse` is true in a bye week.
 * Also the season's path and today's date, for the tab dots.
 */
export function useOpponent(me: Me, now: number): { id: string | null; name: string; vsHouse: boolean; seasonPath: string | null; today: string | null } {
  const leaguePath = `leagues/${me.league}`;
  const league = useDoc<{ season?: string | null }>(leaguePath);
  // The practice week while one is on (the commish's request, 2026-11-28).
  const seasonId = playSeasonOf(league.data);
  const seasonPath = seasonId ? `${leaguePath}/seasons/${seasonId}` : null;
  const season = useDoc<{ timeZone: string; kickoff: string }>(seasonPath);
  const dates = season.data ? seasonDates(now, season.data) : null;
  const today = useDoc<{ period?: string }>(seasonPath && dates ? `${seasonPath}/calendar/${dates.today}` : null);
  const beforeKickoff = season.data !== null && dates !== null && dates.today < season.data.kickoff;
  const period = today.data?.period ?? (beforeKickoff ? 'w01' : null);
  const week = useDoc<{ targets?: Record<string, string[]> }>(seasonPath && period ? `${seasonPath}/weeks/${period}` : null);
  const targets = week.data?.targets?.[me.player] ?? [];
  const id = targets.find((target) => target !== 'HOUSE') ?? null;
  const profile = useDoc<{ displayName?: string }>(id ? `${leaguePath}/players/${id}` : null);
  return { id, name: profile.data?.displayName ?? 'your opponent', vsHouse: targets.includes('HOUSE'), seasonPath, today: dates?.today ?? null };
}
