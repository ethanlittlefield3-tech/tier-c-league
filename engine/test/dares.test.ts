import { describe, expect, it } from 'vitest';
import { DARE_MAX, GOAL_MAX, STARTER_DARES } from '../src/dares.ts';

describe('Dares for the Wheel', () => {
  it("The league starts with SCOPE.md's 8 starter dares", () => {
    expect(STARTER_DARES).toHaveLength(8);
    expect(STARTER_DARES[0]).toBe('Group picks your profile pic for 24 hours.');
    expect(STARTER_DARES[7]).toBe('Sing happy birthday in a voice memo.');
  });

  it('A dare is up to 80 characters, and a goal up to 60', () => {
    expect(DARE_MAX).toBe(80);
    expect(GOAL_MAX).toBe(60);
    expect(STARTER_DARES.every((dare) => dare.length <= DARE_MAX)).toBe(true);
  });
});
