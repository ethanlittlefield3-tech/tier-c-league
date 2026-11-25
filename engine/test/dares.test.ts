import { describe, expect, it } from 'vitest';
import { DARE_MAX, GOAL_MAX, STARTER_DARES, isVideoDare } from '../src/dares.ts';

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

describe('Dares done on video', () => {
  it('A dare that says "video" is done on video: the video goes in the group chat, and a still from it is the proof the league votes on', () => {
    expect(STARTER_DARES.filter(isVideoDare)).toEqual(['50 push-ups, on video.', 'Cold shower, on video.']);
    expect(isVideoDare('Wear a cape to work. Video or it didn\'t happen')).toBe(true);
    expect(isVideoDare('Post a childhood photo.')).toBe(false);
  });
});
