import { describe, expect, it } from 'vitest';
import { DODGE_PENALTY, PROOF_VOTE_HOURS, WHEEL_MAX, dareDue, dareStatus, wheelPool } from '../src/wheel.ts';

const HOUR = 3_600_000;
const NY = 'America/New_York';
const starters = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];

describe('The Wheel of Shame', () => {
  it('The wheel holds every dare from the draft that stands, then starter dares, 16 slices at most', () => {
    expect(WHEEL_MAX).toBe(16);
    expect(wheelPool(['p1', 'p2'], starters, [0, 1, 2, 3, 4, 5, 6, 7])).toEqual(['p1', 'p2', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']);
    const twelve = Array.from({ length: 12 }, (_, n) => `p${n + 1}`);
    // With 12 players there is room for 4 starters, and the job picks which at random.
    expect(wheelPool(twelve, starters, [7, 2, 5, 0, 1, 3, 4, 6])).toEqual([...twelve, 's8', 's3', 's6', 's1']);
  });

  it("Starters the commish took off are left out of the order, so they never reach the wheel", () => {
    // The job leaves them out of the order it passes in.
    expect(wheelPool(['p1'], starters, [0, 2, 3])).toEqual(['p1', 's1', 's3', 's4']);
  });

  it('With no dares from the draft, the wheel is the 8 starters', () => {
    expect(wheelPool([], starters, [0, 1, 2, 3, 4, 5, 6, 7])).toHaveLength(8);
  });

  it('Proof is due by 11:59 pm on the Sunday after the draw, league time', () => {
    // Drawn at midnight on Tuesday Jan 19, 2027, when Week 2 goes final: due by the end of Sunday Jan 24.
    const drawn = Date.UTC(2027, 0, 19, 5);
    expect(dareDue(drawn, NY)).toBe(Date.UTC(2027, 0, 25, 5));
    // Drawn on a Sunday: due by the end of that same Sunday.
    expect(dareDue(Date.UTC(2027, 0, 24, 15), NY)).toBe(Date.UTC(2027, 0, 25, 5));
  });

  it('A dare is waiting to be spun, then spun, then proven, voted on for 24 hours, and either counts or is spun again', () => {
    expect(PROOF_VOTE_HOURS).toBe(24);
    const base = { dueAt: 1000 * HOUR, eligible: 4, counts: 0, doesntCount: 0 };
    expect(dareStatus({ ...base, spunAt: null, proofAt: null, now: 10 * HOUR })).toBe('unspun');
    expect(dareStatus({ ...base, spunAt: 5 * HOUR, proofAt: null, now: 10 * HOUR })).toBe('spun');
    expect(dareStatus({ ...base, spunAt: 5 * HOUR, proofAt: 20 * HOUR, now: 30 * HOUR })).toBe('voting');
    // When the 24 hours are up, it counts unless more than half the league said it doesn't.
    expect(dareStatus({ ...base, spunAt: 5 * HOUR, proofAt: 20 * HOUR, now: 44 * HOUR, doesntCount: 2 })).toBe('counted');
    expect(dareStatus({ ...base, spunAt: 5 * HOUR, proofAt: 20 * HOUR, now: 30 * HOUR, doesntCount: 3 })).toBe('redo');
  });

  it('No proof by the deadline is a dodge: 3 Season Points off, spun or not', () => {
    expect(DODGE_PENALTY).toBe(-3);
    expect(dareStatus({ dueAt: 100, spunAt: null, proofAt: null, now: 100, eligible: 4, counts: 0, doesntCount: 0 })).toBe('dodged');
    expect(dareStatus({ dueAt: 100, spunAt: 50, proofAt: null, now: 100, eligible: 4, counts: 0, doesntCount: 0 })).toBe('dodged');
  });
});
