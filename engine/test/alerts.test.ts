import { describe, expect, it } from 'vitest';
import { CATEGORIES, DEFAULT_ALERTS, isQuiet } from '../src/alerts.ts';

describe('Alert settings', () => {
  it('Every category is on to start with, and quiet hours run from 11 pm to 8 am', () => {
    expect(CATEGORIES).toEqual(['daily', 'matchup', 'powerups', 'social', 'receipts', 'progress', 'league']);
    expect(Object.values(DEFAULT_ALERTS.categories).every(Boolean)).toBe(true);
    expect(DEFAULT_ALERTS.quiet).toEqual({ start: 23, end: 8 });
  });

  it('Quiet hours can run past midnight: 11 pm to 8 am holds alerts from 11:00 pm until 8:00 am', () => {
    const night = { start: 23, end: 8 };
    expect([22, 23, 0, 7, 8].map((hour) => isQuiet(hour, night))).toEqual([false, true, true, true, false]);
  });

  it('Quiet hours inside one day work too, and the same start and end means none', () => {
    expect([12, 13, 14, 15].map((hour) => isQuiet(hour, { start: 13, end: 15 }))).toEqual([false, true, true, false]);
    expect(isQuiet(3, { start: 8, end: 8 })).toBe(false);
  });
});
