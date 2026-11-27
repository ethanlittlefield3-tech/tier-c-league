import { HOUSE, isPairedMode, pickFor, type WeekMode } from '@tcl/engine';
import { useDoc } from '../data/hooks.ts';
import type { Me } from '../data/identity.ts';
import { seasonDates, type SeasonClockDoc } from '../today/model.ts';

export interface PicksDue {
  seasonId: string;
  period: string;
  week: number;
  /** The week's Monday: today. */
  monday: string;
  /** When picks close: the end of Monday, 11:59 pm (ruling R25). */
  lockAt: number;
  /** The week's 1v1s; matchups with The House aren't picked. */
  pairs: { a: string; b: string }[];
  /** Your picks so far. */
  picks: string[];
  /** Matchups you have picked. */
  picked: number;
}

/**
 * This week's picks while they are open (ruling R25): on the week's Monday,
 * until 11:59 pm, in a regular-season week with 1v1s to pick. `null` any
 * other time, and while anything it needs is still loading, so nothing pops
 * up on a guess.
 */
export function usePicksDue(me: Me, now: number): PicksDue | null {
  const leaguePath = `leagues/${me.league}`;
  const league = useDoc<{ season?: string | null }>(leaguePath);
  const seasonId = league.data?.season ?? null;
  const seasonPath = seasonId ? `${leaguePath}/seasons/${seasonId}` : null;
  const season = useDoc<SeasonClockDoc>(seasonPath);
  const dates = season.data ? seasonDates(now, season.data) : null;
  const today = useDoc<{ date: string; period: string; week: number; dayIndex: number; phase?: string; start: number; end: number }>(seasonPath && dates ? `${seasonPath}/calendar/${dates.today}` : null);
  const monday = today.data && today.data.dayIndex === 0 && today.data.phase !== 'playoff' ? today.data : null;
  const week = useDoc<{ week: number; mode?: string; pairs?: { a: string; b: string }[] }>(seasonPath && monday ? `${seasonPath}/weeks/${monday.period}` : null);
  const mine = useDoc<{ picks?: string[] }>(seasonPath && monday ? `${seasonPath}/predictions/${monday.period}_${me.player}` : null);

  if (!seasonId || !monday || week.loading || mine.loading || !week.data) return null;
  if (now < monday.start || now >= monday.end) return null;
  if (!isPairedMode((week.data.mode ?? 'regular') as WeekMode)) return null;
  const pairs = (week.data.pairs ?? []).filter((pair) => pair.a !== HOUSE && pair.b !== HOUSE);
  if (pairs.length === 0) return null;
  const picks = mine.data?.picks ?? [];
  return {
    seasonId,
    period: monday.period,
    week: week.data.week,
    monday: monday.date,
    lockAt: monday.end,
    pairs,
    picks,
    picked: pairs.filter((pair) => pickFor(picks, pair) !== null).length,
  };
}
