import { describe, expect, it } from 'vitest';
import { timeLeft } from '../src/ui/when.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('Time left, as the app says it', () => {
  it('Hours and minutes: 23 h 5 m', () => {
    expect(timeLeft(23 * HOUR + 5 * MINUTE + 30_000)).toBe('23 h 5 m');
  });

  it('Whole hours drop the minutes: 2 h', () => {
    expect(timeLeft(2 * HOUR)).toBe('2 h');
  });

  it('Under an hour is minutes only: 45 m', () => {
    expect(timeLeft(45 * MINUTE)).toBe('45 m');
  });

  it('The last minute says so, and a moment that has passed has no time left', () => {
    expect(timeLeft(20_000)).toBe('under a minute');
    expect(timeLeft(0)).toBe('no time');
    expect(timeLeft(-5 * MINUTE)).toBe('no time');
  });
});
