/**
 * The playoffs' documents (SCOPE.md, "Playoffs"): the bracket the weekly job
 * keeps, and a week document for each round, so Today and Match show each
 * game as a 1v1 and the rules let each player demolish their opponent. A
 * round settles at 6 pm the day after its last day locks, once its receipts
 * are closed; the next round's matchups are set before it starts. Pure.
 */
import type { Bracket, BracketGame, PlayoffPeriod } from '../../engine/src/playoffs.ts';

const SIX_HOURS = 6 * 3_600_000;

export interface RoundDoc {
  week: number;
  period: PlayoffPeriod;
  phase: 'playoff';
  round: 'semi' | 'final' | 'suddenDeath';
  mode: 'regular';
  pairs: { a: string; b: string }[];
  /** Who each player may demolish: their opponent. Sudden death has no kit. */
  targets: Record<string, string[]>;
  /** Whiff Bowl racers on the final days, with no single opponent. */
  racers?: string[];
}

const played = (games: readonly BracketGame[]) => games.filter((game): game is BracketGame & { b: string } => game.b !== null);

/** A round's week document, from the bracket as it stands. */
export function roundDoc(bracket: Bracket, period: PlayoffPeriod, week: number): RoundDoc {
  const games = period === 'p1' ? [...played(bracket.semis), ...played(bracket.whiff?.pairs ?? [])] : bracket.final ? played([bracket.final]) : [];
  const targets: Record<string, string[]> = {};
  for (const game of games) {
    targets[game.a] = [game.b];
    targets[game.b] = [game.a];
  }
  const round = period === 'p1' ? 'semi' : period === 'p2' ? 'final' : 'suddenDeath';
  const racers = period === 'p2' && bracket.whiff && !bracket.whiff.loser && bracket.whiff.racers.length > 0 ? { racers: [...bracket.whiff.racers] } : {};
  return { week, period, phase: 'playoff', round, mode: 'regular', pairs: games.map(({ a, b }) => ({ a, b })), targets, ...racers };
}

/** Which playoff step is due: seed the bracket, or settle a round. `null` when nothing is. */
export function playoffDue(input: {
  bracket: Bracket | null;
  /** The last regular week has posted results, provisional or final. */
  regularDone: boolean;
  /** Each round's last day's lock. */
  locks: Partial<Record<PlayoffPeriod, number>>;
  now: number;
}): 'seed' | 'semis' | 'final' | 'suddenDeath' | null {
  const { bracket, locks, now } = input;
  const due = (period: PlayoffPeriod) => locks[period] !== undefined && now >= locks[period]! + SIX_HOURS;
  if (!bracket) return input.regularDone ? 'seed' : null;
  if (bracket.champion) return null;
  if (bracket.size === 4 && bracket.semis.some((game) => !game.winner)) return due('p1') ? 'semis' : null;
  if (bracket.final && !bracket.final.winner && !bracket.suddenDeath) return due('p2') ? 'final' : null;
  if (bracket.suddenDeath) return due('p3') ? 'suddenDeath' : null;
  return null;
}

/** A settled round's results, by player, the shape rivalry records and badges read. Playoff points never become Season Points. */
export function roundResults(games: readonly BracketGame[], totals: Record<string, { points: number; beers: number }>): Record<string, Record<string, unknown>> {
  const results: Record<string, Record<string, unknown>> = {};
  for (const game of games) {
    if (game.b === null || !game.winner) continue;
    for (const [player, opponent] of [[game.a, game.b], [game.b, game.a]] as const) {
      const mine = totals[player] ?? { points: 0, beers: 0 };
      const theirs = totals[opponent] ?? { points: 0, beers: 0 };
      results[player] = {
        player,
        opponent,
        points: mine.points,
        beers: mine.beers,
        opponentPoints: theirs.points,
        opponentBeers: theirs.beers,
        outcome: game.winner === player ? 'win' : 'loss',
        decidedBy: game.decidedBy ?? 'points',
        bonus: 0,
        seasonPoints: 0,
        mode: 'playoff',
      };
    }
  }
  return results;
}
