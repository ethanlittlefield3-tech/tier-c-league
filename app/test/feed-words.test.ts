import { describe, expect, it } from 'vitest';
import { POST_MAX, QUICK_CHAT, TAUNT_MAX, fillName } from '../src/feed/words.ts';

describe('Quick chat and custom taunts', () => {
  it("Quick chat has SCOPE.md's 10 lines, in its order", () => {
    expect(QUICK_CHAT).toHaveLength(10);
    expect(QUICK_CHAT[0]).toBe('Your boost is running on empty.');
    expect(QUICK_CHAT[9]).toBe('GG, no rematch.');
  });

  it('{name} becomes whoever you face that week, everywhere it appears', () => {
    expect(fillName('Touch grass, {name}.', 'Maya')).toBe('Touch grass, Maya.');
    expect(fillName('{name}, {name}, {name}!', 'Jo')).toBe('Jo, Jo, Jo!');
    expect(fillName('Calculated.', 'Maya')).toBe('Calculated.');
  });

  it('A post is up to 280 characters, and a saved taunt up to 120', () => {
    expect(POST_MAX).toBe(280);
    expect(TAUNT_MAX).toBe(120);
  });
});
