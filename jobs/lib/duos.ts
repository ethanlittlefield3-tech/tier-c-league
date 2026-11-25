/**
 * The 2v2 draw (SCOPE.md, "2v2"): duos are drawn at random on the Monday the
 * week starts, or, if the commish switched the week to "frenemies", each
 * player is paired with their Week 1 rival. The weekly job draws once the
 * week has started; the engine decides who plays whom from the order drawn.
 * Pure: the job passes the order in, shuffled.
 */
import { duoMatches, frenemyDuos, randomDuos, type DuoMatch } from '../../engine/src/group.ts';
import { HOUSE } from '../../engine/src/schedule.ts';

export interface DuoDraw {
  duos: DuoMatch[];
  /** Who each player may demolish: either opponent, or The House for a House duo. */
  targets: Record<string, string[]>;
}

/** The week's duos, or `null` when there is nothing to draw: not 2v2, already drawn, or before Monday. */
export function drawDuos(input: {
  mode: unknown;
  /** The duos already drawn, if any. */
  duos: unknown;
  /** `frenemies` if the commish switched the week to it; anything else is a random draw. */
  pairing: unknown;
  /** Week 1's matchups: the draft's rival picks. */
  rivals: { a: string; b: string }[];
  /** Everyone in the week, in a random order. */
  order: string[];
  /** Monday 12:00 am, when the week starts. */
  start: number;
  now: number;
}): DuoDraw | null {
  if (input.mode !== 'twoVTwo' || (Array.isArray(input.duos) && input.duos.length > 0) || input.now < input.start || input.order.length < 2) return null;
  const teams = input.pairing === 'frenemies' ? frenemyDuos(input.rivals, input.order) : randomDuos(input.order);
  const duos = duoMatches(teams);
  const targets: Record<string, string[]> = {};
  for (const match of duos) {
    for (const player of match.a) targets[player] = [...match.b];
    if (!match.b.includes(HOUSE)) for (const player of match.b) targets[player] = [...match.a];
  }
  return { duos, targets };
}
