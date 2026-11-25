/**
 * Votes on goals and dares (SCOPE.md, "Draft day agenda").
 *
 * PROVISIONAL, waiting on the commish (PROGRESS.md, "Questions"): a veto
 * needs more than half of the players who can vote on it, not more than half
 * of the votes cast. Votes stay open 24 hours, so counting only the votes
 * cast would let one early veto decide. If the commish rules the other way,
 * this file is the one place to change.
 */
export type VoteOutcome = 'open' | 'approved' | 'vetoed';

/** How many vetoes it takes: more than half of the players who can vote. */
export function vetoMajority(eligible: number): number {
  return Math.floor(eligible / 2) + 1;
}

export function voteOutcome(input: { eligible: number; approvals: number; vetoes: number; closed: boolean }): VoteOutcome {
  if (input.eligible <= 0) return 'approved';
  const needed = vetoMajority(input.eligible);
  if (input.vetoes >= needed) return 'vetoed';
  const stillToVote = input.eligible - input.approvals - input.vetoes;
  if (input.vetoes + stillToVote < needed) return 'approved';
  return input.closed ? 'approved' : 'open';
}

/** Draft votes stay open this long from the start of the draft, for anyone who missed it live (SCOPE.md, "Draft day agenda"). */
export const DRAFT_VOTE_HOURS = 24;

/** A vetoed goal is re-voted within this long (SCOPE.md). The commish's "more time" button gives this much. */
export const REVOTE_HOURS = 12;
