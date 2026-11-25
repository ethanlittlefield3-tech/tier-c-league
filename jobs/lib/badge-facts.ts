/**
 * A season's finished weeks, turned into each player's badge history: every
 * day as the engine scored it, and every week's result. The weekly job reads
 * the season and passes it in; `badges.ts` in the engine decides what has
 * been earned. Pure.
 */
import { earnedBadges, groupFeats, type BadgeDay, type BadgeFacts, type BadgeWeek } from '../../engine/src/badges.ts';
import type { LeagueClock } from '../../engine/src/clock.ts';
import { playerWeek, rumbleWeek, type CalendarTimes, type KitPlay } from '../../engine/src/days.ts';
import type { RumbleItem } from '../../engine/src/rumble.ts';
import { againstPlayer } from '../../engine/src/schedule.ts';
import type { DayLog, Lane, Square } from '../../engine/src/scoring.ts';
import { streakMark } from '../../engine/src/streaks.ts';
import type { MatchResult } from '../../engine/src/week.ts';

const LANES = ['mind', 'body', 'wildcard'] as const;

export interface SeasonForBadges {
  season: string;
  par: number;
  clock: LeagueClock;
  /** The season's calendar. */
  calendar: (CalendarTimes & { dayIndex: number })[];
  /** Its final weeks, in order. */
  weeks: {
    period: string;
    results: Record<string, Pick<MatchResult, 'opponent' | 'points' | 'opponentPoints' | 'outcome' | 'seasonPoints' | 'mode' | 'floor' | 'race'>>;
    awards?: { mvp: string[]; bust: string[] };
    /** A group-play week's summary, for its badges. */
    group?: { mode: string; target?: { kind: string }; contributions?: Record<string, number> } | null;
    reveals?: { player: string; outcome: string }[];
  }[];
  /** Rumble's draws for the season: each item by `{date}_{player}`, and the Boots played. */
  rumble?: { items: Record<string, RumbleItem>; boots: { player: string; target: string; date: string; lane: Lane }[] };
  /** Each player's season: logs (with when each day was first logged), power-ups, fixes, and Demolitions aimed at them. */
  players: Record<
    string,
    {
      logs: Record<string, DayLog & { firstAt?: number }>;
      kit: KitPlay[];
      adjustments: { date: string; amount: number; void: Square | null }[];
      demolitionsOn: { date: string; lane: Lane }[];
    }
  >;
}

/** Each player's days and weeks in a season, for their badges. */
export function seasonBadgeData(input: SeasonForBadges): Record<string, { days: BadgeDay[]; weeks: BadgeWeek[] }> {
  const out: Record<string, { days: BadgeDay[]; weeks: BadgeWeek[] }> = {};
  const seasonPoints: Record<string, number> = {};
  for (const week of input.weeks) {
    const days = input.calendar.filter((day) => day.period === week.period).sort((a, b) => (a.date < b.date ? -1 : 1));
    const after = Math.max(...days.map((day) => day.lock)) + 1;
    // Everyone's days in this week, as the engine scored them once it was over.
    const cells: Record<string, ReturnType<typeof playerWeek>['cells']> = {};
    const weekInput = (player: string) => {
      const data = input.players[player] ?? { logs: {}, kit: [], adjustments: [], demolitionsOn: [] };
      return { par: input.par, days, logs: data.logs, kit: data.kit, demolitionsOn: data.demolitionsOn, adjustments: data.adjustments, now: after };
    };
    // A Rumble week's 1v1s are scored together, with the items played.
    const rumble = input.rumble;
    for (const [player, result] of Object.entries(week.results)) {
      if (cells[player] || result.mode !== 'rumble' || !rumble || !againstPlayer(result.opponent)) continue;
      const them = result.opponent;
      const dates = days.map((day) => day.date);
      const bootsOf = (by: string, on: string) => Object.fromEntries(rumble.boots.filter((boot) => boot.player === by && boot.target === on).map((boot) => [boot.date, boot.lane]));
      const both = rumbleWeek(weekInput(player), weekInput(them), {
        items: Object.fromEntries(dates.map((date) => [date, { a: rumble.items[`${date}_${player}`] ?? null, b: rumble.items[`${date}_${them}`] ?? null }])),
        boots: { a: bootsOf(player, them), b: bootsOf(them, player) },
      });
      cells[player] = both.a.cells;
      cells[them] = both.b.cells;
    }
    for (const player of Object.keys(week.results)) cells[player] ??= playerWeek(weekInput(player)).cells;
    // Group-play badges earned this week.
    const feats = groupFeats({ results: week.results, group: week.group ?? null });
    // The standings leaders going into this week: the most Season Points so far.
    const top = Math.max(0, ...Object.values(seasonPoints));
    const leaders = top > 0 ? Object.keys(seasonPoints).filter((player) => seasonPoints[player] === top) : [];

    for (const [player, result] of Object.entries(week.results)) {
      const mine = (out[player] ??= { days: [], weeks: [] });
      const logs = input.players[player]?.logs ?? {};
      for (const cell of cells[player] ?? []) {
        const score = cell.score;
        if (!score) continue;
        const firstAt = logs[cell.date]?.firstAt;
        mine.days.push({
          season: input.season,
          period: week.period,
          date: cell.date,
          dayIndex: cell.dayIndex,
          rest: cell.rest,
          logged: score.checkedIn,
          mark: streakMark(score),
          noShow: score.kind === 'noShow',
          ruleOne: score.kind === 'ruleOne',
          perfect: score.perfect,
          hit: Object.fromEntries(LANES.map((lane) => [lane, score.goals[lane] === 'hit'])) as BadgeDay['hit'],
          screenMinutes: score.screen.minutes,
          beers: score.beers,
          total: score.total,
          aerial: score.aerial === 'doubled',
          blocked: score.demolitions.filter((hit) => hit.outcome === 'blocked').length,
          early: typeof firstAt === 'number' && input.clock.dateOf(firstAt) === cell.date && input.clock.hourOf(firstAt) < 9,
        });
      }
      // A 1v1 against a player; not The House, and not group play with no single opponent.
      const opponent = againstPlayer(result.opponent) ? result.opponent : null;
      const thursday = (who: string) => (cells[who] ?? []).filter((cell) => cell.dayIndex <= 3).reduce((sum, cell) => sum + (cell.score?.total ?? 0), 0);
      mine.weeks.push({
        season: input.season,
        period: week.period,
        opponent,
        outcome: result.outcome,
        margin: result.points - result.opponentPoints,
        trailedThursday: opponent !== null && thursday(player) < thursday(opponent),
        beatLeader: opponent !== null && leaders.includes(opponent),
        mvp: week.awards?.mvp.includes(player) ?? false,
        bust: week.awards?.bust.includes(player) ?? false,
        demolitionsLanded: (week.reveals ?? []).filter((reveal) => reveal.player === player && reveal.outcome === 'landed').length,
        feats: feats[player] ?? [],
      });
    }
    for (const [player, result] of Object.entries(week.results)) seasonPoints[player] = (seasonPoints[player] ?? 0) + result.seasonPoints;
  }
  return out;
}

/** The badges a player has now: everything they had, and anything newly earned. A badge is never taken away. */
export function badgeUpdate(had: readonly string[], facts: BadgeFacts): { all: string[]; fresh: string[] } {
  const earned = earnedBadges(facts);
  const fresh = earned.filter((badge) => !had.includes(badge));
  return { all: [...new Set([...had, ...earned])].sort(), fresh };
}
