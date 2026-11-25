/**
 * Each matchup's live score, as every phone shows it, for two alerts: "your
 * opponent passed you" and "close finish" (SCOPE.md, "Notifications"). The
 * engine counts each player's week so far, with a Demolition counted only
 * once its day has locked, the same as Today and Match.
 */
import { playerWeek, type CalendarTimes } from '../../engine/src/days.ts';
import { HOUSE } from '../../engine/src/schedule.ts';
import type { Lane } from '../../engine/src/scoring.ts';
import type { PlayerWeekData } from '../../engine/src/settlement.ts';
import type { Alert } from './alerts.ts';

export type Lead = 'ahead' | 'behind' | 'level';

/** A player's points so far this week. */
export function liveTotal(input: {
  par: number;
  days: CalendarTimes[];
  data: PlayerWeekData;
  /** Demolitions aimed at this player, with their day's lock. */
  demolitionsOn: { date: string; lane: Lane; lock: number }[];
  now: number;
}): number {
  return playerWeek({
    par: input.par,
    days: input.days,
    logs: input.data.logs,
    kit: input.data.kit,
    demolitionsOn: input.demolitionsOn.filter((hit) => input.now >= hit.lock).map(({ date, lane }) => ({ date, lane })),
    adjustments: input.data.adjustments,
    now: input.now,
  }).totals.points;
}

/** Who leads each matchup, from each player's side. The House's matchups are left out. */
export function leadsOf(pairs: { a: string; b: string }[], totals: Record<string, number>): Record<string, Lead> {
  const leads: Record<string, Lead> = {};
  for (const { a, b } of pairs) {
    if (a === HOUSE || b === HOUSE || totals[a] === undefined || totals[b] === undefined) continue;
    const gap = totals[a]! - totals[b]!;
    leads[a] = gap > 0 ? 'ahead' : gap < 0 ? 'behind' : 'level';
    leads[b] = gap > 0 ? 'behind' : gap < 0 ? 'ahead' : 'level';
  }
  return leads;
}

const score = (mine: number, theirs: number) => `${mine}–${theirs}`;

/** "Your opponent passed you": only an overtake, from ahead to behind, so the week's first log doesn't count. */
export function passedAlerts(input: {
  period: string;
  pairs: { a: string; b: string }[];
  before: Record<string, Lead>;
  totals: Record<string, number>;
  names: Record<string, string>;
  now: number;
  /** When the alert stops being news: the week's end. */
  expires: number;
}): Alert[] {
  const after = leadsOf(input.pairs, input.totals);
  const alerts: Alert[] = [];
  for (const { a, b } of input.pairs) {
    for (const [player, opponent] of [
      [a, b],
      [b, a],
    ] as const) {
      if (input.before[player] !== 'ahead' || after[player] !== 'behind') continue;
      alerts.push({
        player,
        category: 'matchup',
        key: `passed-${input.period}`,
        title: `${input.names[opponent] ?? 'Your opponent'} passed you`,
        body: `${score(input.totals[player]!, input.totals[opponent]!)} this week. Still time to answer.`,
        screen: 'match',
        expires: input.expires,
      });
    }
  }
  return alerts;
}

/** "Close finish": both players, when a matchup is within 3 points at the weekend. */
export function closeAlerts(input: { period: string; pairs: { a: string; b: string }[]; totals: Record<string, number>; names: Record<string, string>; expires: number }): Alert[] {
  const alerts: Alert[] = [];
  for (const { a, b } of input.pairs) {
    if (a === HOUSE || b === HOUSE || input.totals[a] === undefined || input.totals[b] === undefined) continue;
    if (Math.abs(input.totals[a]! - input.totals[b]!) > 3) continue;
    for (const [player, opponent] of [
      [a, b],
      [b, a],
    ] as const) {
      const mine = input.totals[player]!;
      const theirs = input.totals[opponent]!;
      const them = input.names[opponent] ?? 'your opponent';
      const where = mine > theirs ? `You lead ${them} ${score(mine, theirs)}` : mine < theirs ? `${them} leads you ${score(theirs, mine)}` : `Level with ${them} at ${mine}`;
      alerts.push({ player, category: 'matchup', key: `close-${input.period}`, title: 'Close finish', body: `${where}. Every square counts now.`, screen: 'match', expires: input.expires });
    }
  }
  return alerts;
}
