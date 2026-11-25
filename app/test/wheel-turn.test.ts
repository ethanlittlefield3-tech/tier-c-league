import { describe, expect, it } from 'vitest';
import { TURNS, landingTurn, rimPoint, sliceLabel, sliceMiddle } from '../src/wheel/turn.ts';

describe('The wheel on screen', () => {
  it('Each slice has its middle at an even step around the wheel', () => {
    expect(sliceMiddle(0, 8)).toBe(22.5);
    expect(sliceMiddle(7, 8)).toBe(337.5);
  });

  it('The wheel turns 5 whole times, then on until the drawn slice sits under the pointer', () => {
    expect(TURNS).toBe(5);
    expect(landingTurn(0, 8)).toBe(1800 - 22.5);
    // Turning by that much leaves the slice's middle at the top: a multiple of 360.
    for (const index of [0, 3, 7]) expect((sliceMiddle(index, 8) + landingTurn(index, 8)) % 360).toBe(0);
  });

  it('The rim is measured clockwise from the top', () => {
    const top = rimPoint(0, 100);
    expect(top.x).toBeCloseTo(0);
    expect(top.y).toBeCloseTo(-100);
    const right = rimPoint(90, 100);
    expect(right.x).toBeCloseTo(100);
    expect(right.y).toBeCloseTo(0);
  });

  it('Long dares are cut short on the wheel, with an ellipsis', () => {
    expect(sliceLabel('Cold shower, on video.')).toBe('Cold shower, on video');
    expect(sliceLabel('Only voice memos in the group chat for a day.')).toBe('Only voice memos in…');
  });
});
