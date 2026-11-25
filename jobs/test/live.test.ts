import { describe, expect, it } from 'vitest';
import { closeAlerts, leadsOf, liveTotal, passedAlerts } from '../lib/live.ts';

const H = 3_600_000;
const T = Date.UTC(2027, 0, 11, 5); // Monday 12:00 am in New York
const days = [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => ({ date: `2027-01-${11 + dayIndex}`, period: 'w02', dayIndex, phase: 'regular', start: T + dayIndex * 24 * H, lock: T + dayIndex * 24 * H + 36 * H }));
const full = { goals: { mind: true, body: true, wildcard: true }, screenMinutes: 30, beers: 0 };
const pairs = [{ a: 'alex', b: 'maya' }, { a: 'sam', b: 'HOUSE' }];
const names = { alex: 'Alex', maya: 'Maya', sam: 'Sam' };

describe('Live matchup scores, for alerts', () => {
  it('A live total counts the week so far, and a Demolition only once its day has locked', () => {
    // Tuesday's Body goal missed: a Demolition on it lands, for −2.
    const data = { logs: { '2027-01-11': full, '2027-01-12': { ...full, goals: { mind: true, body: false, wildcard: true } } }, kit: [], adjustments: [] };
    const tuesdayNoon = T + 1.6 * 24 * H;
    const plain = liveTotal({ par: 3, days, data, demolitionsOn: [], now: tuesdayNoon });
    const hit = { date: '2027-01-12', lane: 'body' as const, lock: T + 2.5 * 24 * H };
    // Before Tuesday locks, the Demolition on Tuesday is hidden; after, it counts.
    expect(liveTotal({ par: 3, days, data, demolitionsOn: [hit], now: tuesdayNoon })).toBe(plain);
    expect(liveTotal({ par: 3, days, data, demolitionsOn: [hit], now: T + 2.6 * 24 * H })).toBe(plain - 2);
  });

  it("Who leads each matchup, from each side; The House's matchups are left out", () => {
    expect(leadsOf(pairs, { alex: 10, maya: 7, sam: 3 })).toEqual({ alex: 'ahead', maya: 'behind' });
    expect(leadsOf(pairs, { alex: 5, maya: 5 })).toEqual({ alex: 'level', maya: 'level' });
  });

  it('"Your opponent passed you" goes only to a player who was ahead and now trails', () => {
    const passed = passedAlerts({ period: 'w02', pairs, before: { alex: 'ahead', maya: 'behind' }, totals: { alex: 10, maya: 12 }, names, now: T, expires: T + 9 * 24 * H });
    expect(passed.map((alert) => [alert.player, alert.title, alert.body])).toEqual([['alex', 'Maya passed you', '10–12 this week. Still time to answer.']]);
    // Level to behind is not a pass: the first log of the week would set it off.
    expect(passedAlerts({ period: 'w02', pairs, before: { alex: 'level', maya: 'level' }, totals: { alex: 0, maya: 3 }, names, now: T, expires: T + H })).toEqual([]);
    // Still ahead: nothing.
    expect(passedAlerts({ period: 'w02', pairs, before: { alex: 'ahead' }, totals: { alex: 12, maya: 10 }, names, now: T, expires: T + H })).toEqual([]);
  });

  it('"Close finish" goes to both players when they are within 3 points', () => {
    const close = closeAlerts({ period: 'w02', pairs, totals: { alex: 14, maya: 12, sam: 1 }, names, expires: T + H });
    expect(close.map((alert) => [alert.player, alert.body])).toEqual([
      ['alex', 'You lead Maya 14–12. Every square counts now.'],
      ['maya', 'Alex leads you 14–12. Every square counts now.'],
    ]);
    expect(closeAlerts({ period: 'w02', pairs, totals: { alex: 20, maya: 12 }, names, expires: T + H })).toEqual([]);
    expect(closeAlerts({ period: 'w02', pairs, totals: { alex: 9, maya: 9 }, names, expires: T + H }).map((alert) => alert.body)).toEqual(['Level with Maya at 9. Every square counts now.', 'Level with Alex at 9. Every square counts now.']);
  });
});
