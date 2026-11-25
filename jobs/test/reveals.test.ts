import { describe, expect, it } from 'vitest';
import { revealDemolitions, sameReveals } from '../lib/reveals.ts';

const H = 3_600_000;
/** Week 2: Monday Jan 11 to Sunday Jan 17, 2027, in New York. Each day locks at noon the next day. */
const DAYS = [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
  const start = Date.UTC(2027, 0, 11 + dayIndex, 5);
  return { date: `2027-01-${11 + dayIndex}`, period: 'w02', dayIndex, phase: 'regular', start, lock: start + 36 * H };
});
const TUESDAY = DAYS[1]!;
const log = (goals: { mind: boolean; body: boolean; wildcard: boolean }) => ({ goals, screenMinutes: 30, beers: 0 });
const missedBody = { logs: { [TUESDAY.date]: log({ mind: true, body: false, wildcard: true }) }, kit: [], adjustments: [] };
const hitBody = { logs: { [TUESDAY.date]: log({ mind: true, body: true, wildcard: true }) }, kit: [], adjustments: [] };
const onTuesday = { player: 'maya', target: 'jordan', date: TUESDAY.date, lane: 'body' as const };
const base = { par: 3, timeZone: 'America/New_York', days: DAYS, demolitions: [onTuesday] };

describe('Revealing Demolitions in the feed', () => {
  it('A Demolition stays sealed until its day locks; then the week shows how it went', () => {
    expect(revealDemolitions({ ...base, players: { jordan: missedBody }, now: TUESDAY.lock - 1 })).toEqual([]);
    expect(revealDemolitions({ ...base, players: { jordan: missedBody }, now: TUESDAY.lock })).toEqual([{ ...onTuesday, outcome: 'landed', at: TUESDAY.lock }]);
  });

  it('On a goal the target hit, it misses', () => {
    expect(revealDemolitions({ ...base, players: { jordan: hitBody }, now: TUESDAY.lock })[0]?.outcome).toBe('missed');
  });

  it('Full Boost on that goal blocks it, and so do a rest day and Rule One', () => {
    const boosted = { ...missedBody, kit: [{ item: 'fullBoost', period: 'w02', date: TUESDAY.date, lane: 'body' as const }] };
    expect(revealDemolitions({ ...base, players: { jordan: boosted }, now: TUESDAY.lock })[0]?.outcome).toBe('blocked');
    const rested = { ...missedBody, kit: [{ item: 'rest', period: 'w02', date: TUESDAY.date }] };
    expect(revealDemolitions({ ...base, players: { jordan: rested }, now: TUESDAY.lock })[0]?.outcome).toBe('fizzled');
    const graced = { ...missedBody, kit: [{ item: 'ruleOne', date: TUESDAY.date, number: 1 }] };
    expect(revealDemolitions({ ...base, players: { jordan: graced }, now: TUESDAY.lock })[0]?.outcome).toBe('ruleOne');
  });

  it('A target who logged nothing that day takes it', () => {
    expect(revealDemolitions({ ...base, players: { jordan: { logs: {}, kit: [], adjustments: [] } }, now: TUESDAY.lock })[0]?.outcome).toBe('landed');
  });

  it('Reveals come in day order, and saving them again is only needed when something changed', () => {
    const friday = { player: 'jordan', target: 'maya', date: DAYS[4]!.date, lane: 'mind' as const };
    const both = revealDemolitions({ ...base, demolitions: [friday, onTuesday], players: { jordan: missedBody, maya: { logs: {}, kit: [], adjustments: [] } }, now: DAYS[6]!.lock });
    expect(both.map((reveal) => reveal.date)).toEqual([TUESDAY.date, friday.date]);
    // The database hands maps back with their keys in another order.
    const stored = both.map((reveal) => Object.fromEntries(Object.entries(reveal).reverse()));
    expect(sameReveals(both, stored)).toBe(true);
    expect(sameReveals(both, [both[0]])).toBe(false);
    expect(sameReveals([], undefined)).toBe(true);
  });
});
