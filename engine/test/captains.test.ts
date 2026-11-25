import { describe, expect, it } from 'vitest';
import { captainOnTurn, captainPick, chooseCaptains, missedCaptainPick, startCaptains } from '../src/captains.ts';

const order = ['maya', 'sam', 'alex', 'jordan', 'riley'];

describe("The captains' draft", () => {
  it("The captains are last season's top two who are still here, the leader blue", () => {
    expect(chooseCaptains(['jordan', 'maya', 'sam'], order, [0, 0])).toEqual(['jordan', 'maya']);
    // The leader has left: the next two.
    expect(chooseCaptains(['casey', 'maya', 'sam'], order, [0, 0])).toEqual(['maya', 'sam']);
  });

  it('In Season 1, two are drawn at random from the draft order, the first drawn blue', () => {
    expect(chooseCaptains([], order, [2, 0])).toEqual(['alex', 'maya']);
    expect(chooseCaptains([], order, [7, 3])).toEqual(['alex', 'riley']);
  });

  it('Each captain starts alone on their squad, and everyone else is in the pool', () => {
    expect(startCaptains(order, ['alex', 'maya'])).toEqual({ captains: { blue: 'alex', orange: 'maya' }, squads: { blue: ['alex'], orange: ['maya'] }, pool: ['sam', 'jordan', 'riley'] });
  });

  it('The picks snake: blue, orange, orange, blue, blue, …', () => {
    let draft = startCaptains(['a', 'b', 'c', 'd', 'e', 'f', 'g'], ['a', 'b']);
    const turns: string[] = [];
    for (const player of ['c', 'd', 'e', 'f', 'g']) {
      turns.push(captainOnTurn(draft));
      draft = captainPick(draft, player);
    }
    expect(turns).toEqual(['blue', 'orange', 'orange', 'blue', 'blue']);
    expect(draft.squads).toEqual({ blue: ['a', 'c', 'f', 'g'], orange: ['b', 'd', 'e'] });
    expect(draft.pool).toEqual([]);
  });

  it('Only players still in the pool can be picked, and a missed pick takes one of them at random', () => {
    const draft = startCaptains(order, ['alex', 'maya']);
    expect(() => captainPick(draft, 'maya')).toThrow();
    expect(missedCaptainPick(draft.pool, 4)).toBe('jordan');
  });
});
