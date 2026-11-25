import { describe, expect, it } from 'vitest';
import { readWaiting } from '../src/join/waiting.ts';

describe('A phone waiting to be let in', () => {
  it('Remembers the league and the name it asked with', () => {
    const note = { league: 'L1', leagueName: 'Sunday Squad', code: 'K7QMX2R9', displayName: 'Riley' };
    expect(readWaiting(JSON.stringify(note))).toEqual(note);
  });

  it("A missing or broken note means it isn't waiting", () => {
    expect(readWaiting(null)).toBeNull();
    expect(readWaiting('{not json')).toBeNull();
    expect(readWaiting(JSON.stringify({ league: 'L1' }))).toBeNull();
  });
});
