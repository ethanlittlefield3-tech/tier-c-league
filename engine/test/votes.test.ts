import { describe, expect, it } from 'vitest';
import { voteOutcome, vetoMajority } from '../src/votes.ts';

describe('Votes on goals and dares (provisional: waiting on the commish)', () => {
  it('A veto needs more than half of the players who can vote, not just of the votes cast', () => {
    // 6 players vote on someone else's goal: 4 vetoes are needed.
    expect(vetoMajority(6)).toBe(4);
    expect(vetoMajority(5)).toBe(3);
    expect(vetoMajority(1)).toBe(1);
  });

  it('Enough vetoes vetoes it at once, however many have still to vote', () => {
    expect(voteOutcome({ eligible: 6, approvals: 0, vetoes: 4, closed: false })).toBe('vetoed');
  });

  it('It is approved as soon as enough have approved that a veto can no longer win', () => {
    // 6 can vote: 3 approvals leave only 3 possible vetoes, short of 4.
    expect(voteOutcome({ eligible: 6, approvals: 3, vetoes: 0, closed: false })).toBe('approved');
    expect(voteOutcome({ eligible: 6, approvals: 2, vetoes: 1, closed: false })).toBe('open');
  });

  it('When voting closes without enough vetoes, it is approved', () => {
    expect(voteOutcome({ eligible: 6, approvals: 0, vetoes: 3, closed: true })).toBe('approved');
    expect(voteOutcome({ eligible: 6, approvals: 0, vetoes: 0, closed: true })).toBe('approved');
  });

  it('With nobody else to vote, it is approved', () => {
    expect(voteOutcome({ eligible: 0, approvals: 0, vetoes: 0, closed: false })).toBe('approved');
  });
});
