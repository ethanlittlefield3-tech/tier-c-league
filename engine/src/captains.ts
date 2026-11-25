/**
 * Team captains (SCOPE.md, "Draft day agenda", step 6): only if Team Week
 * won a slot, two captains snake-draft the blue and orange squads, which
 * hold for the season.
 */

export type Squad = 'blue' | 'orange';

export interface CaptainsDraft {
  captains: Record<Squad, string>;
  /** Each squad, its captain first, in the order they were picked. */
  squads: Record<Squad, string[]>;
  /** Players still to be picked, in draft order. */
  pool: string[];
}

/**
 * The captains: last season's top two who are still here, the leader blue.
 * Without them (Season 1, or one has left), two drawn at random from the
 * draft order with `rolls`, whole numbers the caller supplies, the first
 * drawn blue.
 */
export function chooseCaptains(lastSeasonTop: readonly string[], order: readonly string[], rolls: readonly [number, number]): [string, string] {
  const kept = lastSeasonTop.filter((player) => order.includes(player));
  if (kept.length >= 2) return [kept[0]!, kept[1]!];
  if (order.length < 2) throw new RangeError('Team Week needs two captains.');
  const first = order[rolls[0] % order.length]!;
  const rest = order.filter((player) => player !== first);
  return [first, rest[rolls[1] % rest.length]!];
}

/** The draft as it starts: each captain alone on their squad, everyone else in the pool. */
export function startCaptains(order: readonly string[], captains: readonly [string, string]): CaptainsDraft {
  return {
    captains: { blue: captains[0], orange: captains[1] },
    squads: { blue: [captains[0]], orange: [captains[1]] },
    pool: order.filter((player) => player !== captains[0] && player !== captains[1]),
  };
}

/** Whose pick it is in the snake draft: blue, orange, orange, blue, blue, orange, … */
export function captainOnTurn(draft: Pick<CaptainsDraft, 'squads'>): Squad {
  const made = draft.squads.blue.length + draft.squads.orange.length - 2;
  return made % 4 === 0 || made % 4 === 3 ? 'blue' : 'orange';
}

/** The captain on turn takes `player` from the pool. */
export function captainPick(draft: CaptainsDraft, player: string): CaptainsDraft {
  if (!draft.pool.includes(player)) throw new RangeError('That player has been picked.');
  const squad = captainOnTurn(draft);
  return { ...draft, squads: { ...draft.squads, [squad]: [...draft.squads[squad], player] }, pool: draft.pool.filter((each) => each !== player) };
}

/** A missed pick: one of the pool, chosen by `roll`. */
export function missedCaptainPick(pool: readonly string[], roll: number): string {
  if (pool.length === 0) throw new RangeError('Nobody is left to pick.');
  return pool[roll % pool.length]!;
}
