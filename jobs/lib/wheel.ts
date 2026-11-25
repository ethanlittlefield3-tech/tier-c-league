/**
 * The Wheel's draws (SCOPE.md, "Wheel of Shame"): "the server draws the
 * result when the week goes final, and the spin only reveals it". The weekly
 * job makes them, sealed, and a new one when a dare's proof is voted down.
 * Randomness is passed in, so this stays testable.
 */
import { dareDue, voteOutcome } from '../../engine/src/index.ts';

/** A draw as the week keeps it, for every phone to show. The result itself is sealed. */
export interface Draw {
  id: string;
  player: string;
  n: number;
  pool: string[];
  drawnAt: number;
  dueAt: number;
}

/**
 * The dares from the draft that stand: the current words of each, unless more
 * than half the league vetoed them or the commish took them off the Wheel.
 */
export function approvedDares(
  dares: { player: string; text: string; version: number; removed?: boolean }[],
  votes: { player: string; version: number; choice: string }[],
  eligible: number,
): string[] {
  return dares
    .filter((dare) => dare.removed !== true)
    .filter((dare) => {
      const these = votes.filter((vote) => vote.player === dare.player && vote.version === dare.version);
      const outcome = voteOutcome({
        eligible,
        approvals: these.filter((vote) => vote.choice === 'approve').length,
        vetoes: these.filter((vote) => vote.choice === 'veto').length,
        closed: true,
      });
      return outcome !== 'vetoed';
    })
    .map((dare) => dare.text);
}

/** The draws to make now: a first one for each spinner, and the next one after a dare voted down. */
export function drawsDue(input: {
  period: string;
  spinners: string[];
  existing: Record<string, Draw>;
  /** Draws whose proof was voted down. */
  redo: string[];
  pool: string[];
  now: number;
  timeZone: string;
  /** A random whole number, fresh on every call. */
  roll: () => number;
}): { draw: Draw; slice: number }[] {
  if (input.pool.length === 0) return [];
  const wanted: { player: string; n: number }[] = input.spinners.map((player) => ({ player, n: 1 }));
  for (const id of input.redo) {
    const done = input.existing[id];
    if (done) wanted.push({ player: done.player, n: done.n + 1 });
  }
  const due: { draw: Draw; slice: number }[] = [];
  for (const { player, n } of wanted) {
    const id = `${input.period}_${player}_${n}`;
    if (input.existing[id] || due.some((made) => made.draw.id === id)) continue;
    const draw: Draw = { id, player, n, pool: input.pool, drawnAt: input.now, dueAt: dareDue(input.now, input.timeZone) };
    due.push({ draw, slice: Math.abs(Math.trunc(input.roll())) % input.pool.length });
  }
  return due;
}
