import { describe, expect, it } from 'vitest';
import { STICKER_DAYS, activeStickers } from '../src/stickers.ts';

const DAY = 86_400_000;

describe('Stickers', () => {
  it('A sticker shows until the time it comes off, a week after it went on', () => {
    expect(STICKER_DAYS).toBe(7);
    const on = { dodger: { until: 10 * DAY } };
    expect(activeStickers(on, 10 * DAY - 1)).toEqual(['dodger']);
    expect(activeStickers(on, 10 * DAY)).toEqual([]);
  });

  it('Both can show at once, and anything else is ignored', () => {
    expect(activeStickers({ L: { until: 5 * DAY }, dodger: { until: 5 * DAY }, gold: { until: 5 * DAY } }, DAY)).toEqual(['dodger', 'L']);
    expect(activeStickers({ L: { until: 'soon' } }, DAY)).toEqual([]);
    expect(activeStickers(undefined, DAY)).toEqual([]);
  });
});
