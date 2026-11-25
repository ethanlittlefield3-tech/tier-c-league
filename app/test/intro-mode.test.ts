import { describe, expect, it } from 'vitest';
import { INTRO_TIMING, deviceDay, introMode } from '../src/intro/mode.ts';

describe('Which intro plays', () => {
  it('The full intro plays on the first open each day', () => {
    expect(introMode({ lastFullDay: null, today: '2027-01-04', reducedMotion: false })).toBe('full');
  });

  it('After that it is the 1-second title slam for the rest of the day', () => {
    expect(introMode({ lastFullDay: '2027-01-04', today: '2027-01-04', reducedMotion: false })).toBe('short');
  });

  it('A new day brings the full intro back', () => {
    expect(introMode({ lastFullDay: '2027-01-04', today: '2027-01-05', reducedMotion: false })).toBe('full');
  });

  it('With Reduce Motion on it is always a simple fade', () => {
    expect(introMode({ lastFullDay: null, today: '2027-01-04', reducedMotion: true })).toBe('fade');
    expect(introMode({ lastFullDay: '2027-01-04', today: '2027-01-04', reducedMotion: true })).toBe('fade');
  });

  it('The Nunchucks card runs about 2 seconds, the boost scene about 2.5, and the short version 1', () => {
    expect(INTRO_TIMING.card).toBe(2000);
    expect(INTRO_TIMING.boost).toBe(2500);
    expect(INTRO_TIMING.short).toBe(1000);
  });

  it("The day is the phone's own calendar day", () => {
    expect(deviceDay(new Date(2027, 0, 4, 23, 59))).toBe('2027-01-04');
    expect(deviceDay(new Date(2027, 0, 5, 0, 0))).toBe('2027-01-05');
  });
});
