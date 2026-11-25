import { describe, expect, it } from 'vitest';
import { PICK_SECONDS, applyPick, missedPick, pickDeadline, picker, picksDone, week1Pairs } from '../src/draft.ts';
import { HOUSE, buildSchedule, checkRivalPicks } from '../src/schedule.ts';

describe('Rival picks at the draft', () => {
  it('The first player still unpicked, in draft order, picks next', () => {
    expect(picker(['maya', 'jordan', 'sam'])).toBe('maya');
  });

  it('A pick takes both players out of the running, and the rest keep their draft order', () => {
    expect(applyPick({ left: ['maya', 'jordan', 'sam', 'riley'], picks: {} }, 'sam')).toEqual({ left: ['jordan', 'riley'], picks: { maya: 'sam' } });
  });

  it('You pick someone still unpicked, never yourself', () => {
    expect(() => applyPick({ left: ['maya', 'jordan', 'sam'], picks: {} }, 'maya')).toThrow();
    expect(() => applyPick({ left: ['jordan', 'sam'], picks: { maya: 'riley' } }, 'riley')).toThrow();
  });

  it('With one player left there is no pick to make: they face The House', () => {
    expect(picker(['sam'])).toBeNull();
    expect(() => applyPick({ left: ['sam'], picks: { maya: 'jordan' } }, 'maya')).toThrow();
    expect(picksDone(['sam'])).toBe(true);
    expect(picksDone([])).toBe(true);
    expect(picksDone(['maya', 'sam'])).toBe(false);
  });

  it('Each pick has a 2-minute clock', () => {
    expect(PICK_SECONDS).toBe(120);
    expect(pickDeadline(1_000_000)).toBe(1_120_000);
  });

  it('A missed pick is made at random from the players still unpicked, with a random number the caller supplies', () => {
    const left = ['maya', 'jordan', 'sam', 'riley'];
    expect(missedPick(left, 0)).toBe('jordan');
    expect(missedPick(left, 2)).toBe('riley');
    expect(missedPick(left, 4)).toBe('sam');
    // Every unpicked player can come up, and the picker never does.
    const drawn = new Set([0, 1, 2, 3, 4, 5].map((roll) => missedPick(left, roll)));
    expect([...drawn].sort()).toEqual(['jordan', 'riley', 'sam']);
  });

  it('Week 1 is the picks in draft order, with The House for the odd one out', () => {
    expect(week1Pairs({ order: ['maya', 'jordan', 'sam'], picks: { maya: 'jordan' }, left: ['sam'] })).toEqual([
      ['maya', 'jordan'],
      ['sam', HOUSE],
    ]);
    expect(week1Pairs({ order: ['jordan', 'maya', 'sam', 'riley'], picks: { jordan: 'riley', maya: 'sam' }, left: [] })).toEqual([
      ['jordan', 'riley'],
      ['maya', 'sam'],
    ]);
  });

  it("A finished draft's picks make a schedule whose Week 1 is exactly those picks", () => {
    const order = ['maya', 'jordan', 'sam', 'riley', 'alex'];
    let state = { left: order, picks: {} as Record<string, string> };
    state = applyPick(state, 'riley'); // maya picks riley
    state = applyPick(state, 'alex'); // jordan picks alex; sam faces The House
    const pairs = week1Pairs({ order, ...state });
    expect(checkRivalPicks(order, pairs)).toBeNull();
    expect(buildSchedule({ picks: pairs, weeks: 6 })[0]?.pairs).toEqual([
      ['maya', 'riley'],
      ['jordan', 'alex'],
      ['sam', HOUSE],
    ]);
  });
});
