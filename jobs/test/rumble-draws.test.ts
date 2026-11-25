import { describe, expect, it } from 'vitest';
import { rumbleDraws } from '../lib/rumble-draws.ts';

const H = 3_600_000;
const MONDAY = Date.UTC(2027, 0, 11, 5);
const days = [0, 1, 2, 3, 4, 5, 6].map((index) => ({ date: `2027-01-${11 + index}`, start: MONDAY + index * 24 * H }));
const pairs = [{ a: 'alex', b: 'maya' }, { a: 'sam', b: 'HOUSE' }];
const draw = (extra: Partial<Parameters<typeof rumbleDraws>[0]> = {}) => rumbleDraws({ mode: 'rumble', drawnAt: undefined, period: 'w02', pairs, days, now: MONDAY - 3 * 24 * H, pick: () => 'tornado', ...extra });

describe("A Rumble week's items", () => {
  it('Are drawn a week ahead: one a day for each player, each sealed until its day starts', () => {
    const docs = draw()!;
    expect(docs).toHaveLength(14);
    expect(docs[0]).toEqual({ id: '2027-01-11_alex', data: { player: 'alex', period: 'w02', date: '2027-01-11', item: 'tornado', revealAt: MONDAY } });
    expect(docs.at(-1)?.data).toMatchObject({ player: 'maya', date: '2027-01-17', revealAt: MONDAY + 6 * 24 * H });
  });

  it('Nobody facing The House gets an item, since The House plays none', () => {
    expect(draw()!.some((doc) => doc.data.player === 'sam')).toBe(false);
  });

  it('Not earlier than a week ahead, not twice, and only for a Rumble week', () => {
    expect(draw({ now: MONDAY - 8 * 24 * H })).toBeNull();
    expect(draw({ drawnAt: MONDAY - 4 * 24 * H })).toBeNull();
    expect(draw({ mode: 'dropShot' })).toBeNull();
    // A week already under way still gets its items, if they were somehow missed.
    expect(draw({ now: MONDAY + 30 * H })).toHaveLength(14);
  });

  it('Each item is drawn with the same odds: the job picks one of the seven for each player and day', () => {
    const asked: string[] = [];
    draw({ pick: (player, date) => (asked.push(`${player} ${date}`), 'swap') });
    expect(asked).toHaveLength(14);
    expect(new Set(asked).size).toBe(14);
  });
});
