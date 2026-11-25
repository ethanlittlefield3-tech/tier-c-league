/**
 * Both sides of this week's matchup, live: the season, today's calendar day,
 * the week, your opponent, and both players' weeks scored by the engine.
 * Match uses it; Today gathers the same things for itself.
 */
import { type Lane, type Square } from '@tcl/engine';
import { useDoc, usePeek, useWhere } from '../data/hooks.ts';
import type { Me } from '../data/identity.ts';
import type { CalDay } from '../today/kit.ts';
import { leagueDates, type DayEntry } from '../today/model.ts';
import { playerWeek, type KitPlay } from '../today/week.ts';

interface SeasonDoc {
  par: number;
  timeZone: string;
  kickoff: string;
}

type Change = { date: string; amount: number; void: Square | null };
type Logged = DayEntry & { date: string };

export function useMatchup(me: Me, now: number) {
  const leaguePath = `leagues/${me.league}`;
  const league = useDoc<{ season?: string | null }>(leaguePath);
  const seasonId = league.data?.season ?? null;
  const seasonPath = seasonId ? `${leaguePath}/seasons/${seasonId}` : null;
  const season = useDoc<SeasonDoc>(seasonPath);
  const dates = season.data ? leagueDates(now, season.data.timeZone) : null;
  const todayCal = useDoc<CalDay>(seasonPath && dates ? `${seasonPath}/calendar/${dates.today}` : null);
  const period = todayCal.data?.period ?? null;
  const week = useWhere<CalDay>(seasonPath ? `${seasonPath}/calendar` : null, 'period', period);
  const weekDoc = useDoc<{ targets?: Record<string, string[]> }>(seasonPath && period ? `${seasonPath}/weeks/${period}` : null);
  const targets = weekDoc.data?.targets?.[me.player] ?? [];
  const opponentId = targets.find((target) => target !== 'HOUSE') ?? null;
  const profile = useDoc<{ displayName?: string }>(opponentId ? `${leaguePath}/players/${opponentId}` : null);
  const roster = useDoc<{ goals?: Partial<Record<Lane, { text?: string }>> }>(seasonPath && opponentId ? `${seasonPath}/roster/${opponentId}` : null);

  const myDays = useWhere<Logged>(seasonPath ? `${seasonPath}/days` : null, 'player', me.player);
  const myKit = useWhere<KitPlay>(seasonPath ? `${seasonPath}/kit` : null, 'player', me.player);
  const myChanges = useWhere<Change>(seasonPath ? `${seasonPath}/adjustments` : null, 'player', me.player);
  const theirDays = useWhere<Logged>(seasonPath ? `${seasonPath}/days` : null, 'player', opponentId);
  const theirKit = useWhere<KitPlay>(seasonPath ? `${seasonPath}/kit` : null, 'player', opponentId);
  const theirChanges = useWhere<Change>(seasonPath ? `${seasonPath}/adjustments` : null, 'player', opponentId);
  const mySealed = useWhere<{ period: string; target: string; date: string; lane: Lane }>(seasonPath ? `${seasonPath}/sealed` : null, 'player', me.player);
  const lockedSoFar = week.docs.filter((found) => now >= found.data.lock).length;
  const onMe = usePeek<{ target: string; date: string; lane: Lane }>(
    seasonPath && period && opponentId ? `${seasonPath}/sealed/${period}_${opponentId}_demolition` : null,
    lockedSoFar,
  );

  const loading = league.loading || season.loading || (seasonPath !== null && todayCal.loading) || week.loading || weekDoc.loading;
  const days = week.docs.map((found) => found.data);
  const logsOf = (docs: { data: Logged }[]) => Object.fromEntries(docs.map((found) => [found.data.date, found.data]));
  const mine = mySealed.docs.map((found) => found.data).find((play) => play.period === period && play.target === opponentId) ?? null;

  const myWeek =
    season.data && days.length > 0
      ? playerWeek({
          par: season.data.par,
          days,
          logs: logsOf(myDays.docs),
          kit: myKit.docs.map((found) => found.data),
          demolitionsOn: onMe && onMe.target === me.player ? [{ date: onMe.date, lane: onMe.lane }] : [],
          adjustments: myChanges.docs.map((found) => found.data),
          now,
          timeZone: season.data.timeZone,
        })
      : null;
  const theirWeek =
    season.data && days.length > 0 && opponentId
      ? playerWeek({
          par: season.data.par,
          days,
          logs: logsOf(theirDays.docs),
          kit: theirKit.docs.map((found) => found.data),
          demolitionsOn: mine ? [{ date: mine.date, lane: mine.lane }] : [],
          adjustments: theirChanges.docs.map((found) => found.data),
          now,
          timeZone: season.data.timeZone,
        })
      : null;

  return {
    loading,
    seasonId,
    season: season.data,
    dates,
    today: todayCal.data,
    opponent: opponentId
      ? {
          id: opponentId,
          name: profile.data?.displayName ?? 'Your opponent',
          goals: roster.data?.goals ?? {},
          kit: theirKit.docs.map((found) => found.data),
          log: dates ? (theirDays.docs.find((found) => found.data.date === dates.today)?.data ?? null) : null,
        }
      : null,
    vsHouse: targets.includes('HOUSE'),
    myWeek,
    theirWeek,
    /** Your own sealed Demolition on them this week, which only you can see. */
    myDemolition: mine,
  };
}
