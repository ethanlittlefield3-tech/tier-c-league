/**
 * Weekly matchups: totals, the 1v1 result, The House and Season Points.
 */

import { RULES, type DayScore } from './scoring.ts';
import { HOUSE, type Pair } from './schedule.ts';

/** What a matchup compares: points first, then beers. */
export interface Side {
  points: number;
  beers: number;
}

export interface WeekTotals extends Side {
  perfectDays: number;
  /** Goal days with nothing logged. A blank rest day is not a no-show. */
  noShows: number;
  checkIns: number;
}

/** A week's points are the sum of its days. */
export function totalWeek(days: readonly DayScore[]): WeekTotals {
  const totals: WeekTotals = { points: 0, beers: 0, perfectDays: 0, noShows: 0, checkIns: 0 };
  for (const day of days) {
    totals.points += day.total;
    totals.beers += day.beers;
    if (day.perfect) totals.perfectDays += 1;
    if (day.kind === 'noShow') totals.noShows += 1;
    if (day.checkedIn) totals.checkIns += 1;
  }
  return totals;
}

export type Outcome = 'win' | 'draw' | 'loss';

export interface Decision {
  a: Outcome;
  b: Outcome;
  /** What settled it: `points`, the fewer-`beers` tiebreak, or `none` for a draw. */
  decidedBy: 'points' | 'beers' | 'none';
}

/** Most points wins; a tie goes to fewer beers; still tied is a draw. */
export function decideMatchup(a: Side, b: Side): Decision {
  if (a.points !== b.points) {
    return a.points > b.points
      ? { a: 'win', b: 'loss', decidedBy: 'points' }
      : { a: 'loss', b: 'win', decidedBy: 'points' };
  }
  if (a.beers !== b.beers) {
    return a.beers < b.beers
      ? { a: 'win', b: 'loss', decidedBy: 'beers' }
      : { a: 'loss', b: 'win', decidedBy: 'beers' };
  }
  return { a: 'draw', b: 'draw', decidedBy: 'none' };
}

/** The Season Points bonus on top of a player's own points. */
export function matchupBonus(outcome: Outcome): number {
  if (outcome === 'win') return RULES.winBonus;
  if (outcome === 'draw') return RULES.drawBonus;
  return 0;
}

/**
 * The House scores that week's league average, without the bye player.
 * The average is never rounded, and its beers are the average beers.
 */
export function houseSide(others: readonly Side[]): Side {
  if (others.length === 0) return { points: 0, beers: 0 };
  let points = 0;
  let beers = 0;
  for (const side of others) {
    points += side.points;
    beers += side.beers;
  }
  return { points: points / others.length, beers: beers / others.length };
}

export interface MatchResult {
  player: string;
  /** A player id, or HOUSE for the bye. */
  opponent: string;
  points: number;
  beers: number;
  opponentPoints: number;
  opponentBeers: number;
  outcome: Outcome;
  decidedBy: Decision['decidedBy'];
  bonus: number;
  /** This week's Season Points: own points plus the bonus. */
  seasonPoints: number;
}

export interface WeekSettlement {
  results: Record<string, MatchResult>;
  /** The House's line for the week, or `null` when nobody had the bye. */
  house: Side | null;
}

/** Settle every 1v1 of a week. `totals` holds each real player's week. */
export function settleWeek(
  pairs: readonly Pair[],
  totals: Readonly<Record<string, Side>>,
): WeekSettlement {
  const sideOf = (player: string): Side => {
    const side = totals[player];
    if (!side) throw new Error(`No weekly totals for player ${player}`);
    return side;
  };

  const byePlayers = new Set<string>();
  const realPlayers: string[] = [];
  for (const [a, b] of pairs) {
    if (a !== HOUSE) realPlayers.push(a);
    if (b !== HOUSE) realPlayers.push(b);
    if (a === HOUSE) byePlayers.add(b);
    if (b === HOUSE) byePlayers.add(a);
  }
  const house =
    byePlayers.size > 0
      ? houseSide(realPlayers.filter((p) => !byePlayers.has(p)).map(sideOf))
      : null;

  const results: Record<string, MatchResult> = {};
  const record = (player: string, opponent: string, mine: Side, theirs: Side, outcome: Outcome, decidedBy: Decision['decidedBy']) => {
    const bonus = matchupBonus(outcome);
    results[player] = {
      player,
      opponent,
      points: mine.points,
      beers: mine.beers,
      opponentPoints: theirs.points,
      opponentBeers: theirs.beers,
      outcome,
      decidedBy,
      bonus,
      seasonPoints: mine.points + bonus,
    };
  };

  for (const [a, b] of pairs) {
    const sideA = a === HOUSE ? (house as Side) : sideOf(a);
    const sideB = b === HOUSE ? (house as Side) : sideOf(b);
    const decision = decideMatchup(sideA, sideB);
    if (a !== HOUSE) record(a, b, sideA, sideB, decision.a, decision.decidedBy);
    if (b !== HOUSE) record(b, a, sideB, sideA, decision.b, decision.decidedBy);
  }
  return { results, house };
}
