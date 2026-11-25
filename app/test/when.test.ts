import { describe, expect, it } from 'vitest';
import { ago, countdown, timeLeft } from '../src/ui/when.ts';

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

describe("The draft pick's countdown", () => {
  it('Minutes and seconds, rounded up, so it reads 2:00 at the start of a pick', () => {
    expect(countdown(120_000)).toBe('2:00');
    expect(countdown(65_000)).toBe('1:05');
    expect(countdown(8_200)).toBe('0:09');
  });

  it('Stops at 0:00 once the time is up', () => {
    expect(countdown(0)).toBe('0:00');
    expect(countdown(-3_000)).toBe('0:00');
  });
});

describe('How long ago, in the feed', () => {
  it('Under a minute is "now", then minutes, hours and days', () => {
    expect(ago(30_000)).toBe('now');
    expect(ago(5 * MINUTE)).toBe('5 m');
    expect(ago(2 * HOUR + 10 * MINUTE)).toBe('2 h');
    expect(ago(3 * 24 * HOUR)).toBe('3 d');
  });

  it('A clock a little behind the server still reads "now", never a negative time', () => {
    expect(ago(-4_000)).toBe('now');
  });
});
