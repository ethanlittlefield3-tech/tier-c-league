import { describe, expect, it } from 'vitest';
import { INTRO_TIMING, deviceDay, introMode } from '../src/intro/mode.ts';

describe('Which intro plays', () => {
  it('The full intro plays every time the app opens, the same day or not (ruling R19)', () => {
    expect(introMode({ reducedMotion: false })).toBe('full');
  });

  it('With Reduce Motion on it is always a simple fade', () => {
    expect(introMode({ reducedMotion: true })).toBe('fade');
  });

  it('The Nunchucks card runs about 2 seconds, and the boost scene about 2.5', () => {
    expect(INTRO_TIMING.card).toBe(2000);
    expect(INTRO_TIMING.boost).toBe(2500);
  });

  it("The day is the phone's own calendar day", () => {
    expect(deviceDay(new Date(2027, 0, 4, 23, 59))).toBe('2027-01-04');
    expect(deviceDay(new Date(2027, 0, 5, 0, 0))).toBe('2027-01-05');
  });
});
