import { describe, expect, it } from 'vitest';
import { NAME_MAX, nameProblem, tidyName } from '../src/join/name.ts';

describe('Display names', () => {
  it('A name is tidied: spaces at the ends go, and a run of spaces becomes one', () => {
    expect(tidyName('  Riley  ')).toBe('Riley');
    expect(tidyName('Big   Mac\tAttack')).toBe('Big Mac Attack');
    expect(tidyName('Sam\nthe\nMan')).toBe('Sam the Man');
  });

  it('A name needs at least one character that shows', () => {
    expect(nameProblem('')).toBe('empty');
    expect(nameProblem('   ')).toBe('empty');
    expect(nameProblem('​​')).toBe('empty');
    expect(nameProblem('R')).toBeNull();
  });

  it('A name can be up to 24 characters, the same limit the security rules enforce', () => {
    expect(NAME_MAX).toBe(24);
    expect(nameProblem('x'.repeat(24))).toBeNull();
    expect(nameProblem('x'.repeat(25))).toBe('too-long');
  });

  it('Spaces that get tidied away do not count toward the limit', () => {
    expect(nameProblem(`  ${'x'.repeat(24)}  `)).toBeNull();
  });

  it('An accented letter counts as one character and an emoji as two, the way the rules count them', () => {
    expect(nameProblem('é'.repeat(24))).toBeNull();
    expect(nameProblem('é'.repeat(25))).toBe('too-long');
    expect(nameProblem('\u{1F525}'.repeat(12))).toBeNull();
    expect(nameProblem('\u{1F525}'.repeat(13))).toBe('too-long');
  });
});
