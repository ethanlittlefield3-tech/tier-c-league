import { describe, expect, it } from 'vitest';
import { storyText } from '../src/feed/stories.ts';

const name = (player: string) => ({ me: 'You', maya: 'Maya', alex: 'Alex' })[player] ?? player;

describe('Storylines in words', () => {
  it('Each headline reads naturally, about anyone or about you', () => {
    expect(storyText({ kind: 'snapped', player: 'alex', other: 'maya', count: 4 }, name)).toBe("Alex's 4-game win streak snapped by Maya");
    expect(storyText({ kind: 'snapped', player: 'me', other: 'maya', count: 3 }, name)).toBe('Your 3-game win streak snapped by Maya');
    expect(storyText({ kind: 'leader', player: 'maya', other: 'me', count: 0 }, name)).toBe('Maya took down the leader, you');
    expect(storyText({ kind: 'streak', player: 'me', other: 'maya', count: 3 }, name)).toBe('You have won 3 straight');
    expect(storyText({ kind: 'streak', player: 'maya', other: 'me', count: 5 }, name)).toBe('Maya has won 5 straight');
    expect(storyText({ kind: 'firstWin', player: 'me', other: 'alex', count: 2 }, name)).toBe('You get a first win of the season, after 2 losses');
    expect(storyText({ kind: 'blowout', player: 'alex', other: 'me', count: 22 }, name)).toBe('Alex crushed you by 22');
    expect(storyText({ kind: 'edged', player: 'maya', other: 'alex', count: 1 }, name)).toBe('Maya edged Alex by a single point');
  });
});
