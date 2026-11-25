import { describe, expect, it } from 'vitest';
import { drawDuos } from '../lib/duos.ts';

const MONDAY = Date.UTC(2027, 0, 11, 5);
const rivals = [{ a: 'a', b: 'b' }, { a: 'c', b: 'd' }, { a: 'e', b: 'HOUSE' }];
const draw = (extra: Partial<Parameters<typeof drawDuos>[0]> = {}) =>
  drawDuos({ mode: 'twoVTwo', duos: undefined, pairing: undefined, rivals, order: ['d', 'e', 'a', 'b', 'c'], start: MONDAY, now: MONDAY, ...extra });

describe('The 2v2 draw', () => {
  it('Duos are drawn once the week starts on Monday: not before, and never again once drawn', () => {
    expect(draw({ now: MONDAY - 1 })).toBeNull();
    expect(draw()).not.toBeNull();
    expect(draw({ duos: [{ a: ['a', 'b'], b: ['c', 'd'] }] })).toBeNull();
    expect(draw({ mode: 'alley' })).toBeNull();
  });

  it('A random draw pairs players off in the drawn order, the last three a trio', () => {
    expect(draw()?.duos).toEqual([{ a: ['d', 'e'], b: ['a', 'b', 'c'] }]);
  });

  it('With frenemies, each duo is a pair of Week 1 rivals', () => {
    expect(draw({ pairing: 'frenemies' })?.duos).toEqual([{ a: ['c', 'd'], b: ['a', 'b', 'e'] }]);
  });

  it('Each player may demolish either opponent; a duo facing the House duo has only The House', () => {
    expect(draw()?.targets).toEqual({ d: ['a', 'b', 'c'], e: ['a', 'b', 'c'], a: ['d', 'e'], b: ['d', 'e'], c: ['d', 'e'] });
    const six = draw({ order: ['a', 'b', 'c', 'd', 'e', 'f'] });
    expect(six?.duos).toEqual([{ a: ['a', 'b'], b: ['HOUSE'] }, { a: ['c', 'd'], b: ['e', 'f'] }]);
    expect(six?.targets).toMatchObject({ a: ['HOUSE'], b: ['HOUSE'], c: ['e', 'f'] });
  });
});
