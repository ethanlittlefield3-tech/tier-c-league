import { describe, expect, it } from 'vitest';
import { approvedDares, drawsDue, type Draw } from '../lib/wheel.ts';

const NY = 'America/New_York';
const FINAL = Date.UTC(2027, 0, 19, 5); // Week 2 goes final: midnight on Tuesday Jan 19
const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const rolls = (...values: number[]) => () => values.shift() ?? 0;

describe("The Wheel's draws", () => {
  it('Only dares from the draft that stand go on the wheel: vetoed ones and old versions stay off', () => {
    const dares = [
      { player: 'maya', text: 'Cape to work', version: 2 },
      { player: 'sam', text: 'Eat a lemon', version: 1 },
      { player: 'jo', text: 'Sing in public', version: 1 },
    ];
    const votes = [
      // Maya's first words were vetoed; her second version stands.
      { player: 'maya', version: 1, choice: 'veto' },
      { player: 'maya', version: 1, choice: 'veto' },
      { player: 'maya', version: 2, choice: 'approve' },
      { player: 'sam', version: 1, choice: 'veto' },
      { player: 'sam', version: 1, choice: 'veto' },
    ];
    // Three can vote on each dare: two vetoes are a majority.
    expect(approvedDares(dares, votes, 3)).toEqual(['Cape to work', 'Sing in public']);
  });

  it('A dare the commish took off the Wheel stays off it', () => {
    const dares = [
      { player: 'maya', text: 'Cape to work', version: 1 },
      { player: 'sam', text: 'Something unkind', version: 1, removed: true },
    ];
    expect(approvedDares(dares, [], 3)).toEqual(['Cape to work']);
  });

  it('Once a week is final, each spinner gets one sealed draw, with proof due that Sunday', () => {
    const due = drawsDue({ period: 'w02', spinners: ['maya', 'sam'], existing: {}, redo: [], pool, now: FINAL, timeZone: NY, roll: rolls(3, 10) });
    expect(due.map(({ draw, slice }) => [draw.id, draw.n, slice])).toEqual([
      ['w02_maya_1', 1, 3],
      ['w02_sam_1', 1, 2],
    ]);
    expect(due[0]?.draw).toMatchObject({ player: 'maya', pool, drawnAt: FINAL, dueAt: Date.UTC(2027, 0, 25, 5) });
  });

  it('A draw is made once: running again changes nothing', () => {
    const first = drawsDue({ period: 'w02', spinners: ['maya'], existing: {}, redo: [], pool, now: FINAL, timeZone: NY, roll: rolls(1) });
    const existing: Record<string, Draw> = Object.fromEntries(first.map(({ draw }) => [draw.id, draw]));
    expect(drawsDue({ period: 'w02', spinners: ['maya'], existing, redo: [], pool, now: FINAL + 3_600_000, timeZone: NY, roll: rolls(5) })).toEqual([]);
  });

  it('Proof voted down means a new sealed draw for the same spinner, once', () => {
    const first = drawsDue({ period: 'w02', spinners: ['maya'], existing: {}, redo: [], pool, now: FINAL, timeZone: NY, roll: rolls(1) });
    const existing: Record<string, Draw> = Object.fromEntries(first.map(({ draw }) => [draw.id, draw]));
    const later = FINAL + 3 * 24 * 3_600_000;
    const again = drawsDue({ period: 'w02', spinners: ['maya'], existing, redo: ['w02_maya_1'], pool, now: later, timeZone: NY, roll: rolls(6) });
    expect(again.map(({ draw, slice }) => [draw.id, draw.n, slice])).toEqual([['w02_maya_2', 2, 6]]);
    const all = { ...existing, ...Object.fromEntries(again.map(({ draw }) => [draw.id, draw])) };
    expect(drawsDue({ period: 'w02', spinners: ['maya'], existing: all, redo: ['w02_maya_1'], pool, now: later, timeZone: NY, roll: rolls(2) })).toEqual([]);
  });
});
