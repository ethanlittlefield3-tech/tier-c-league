import { describe, expect, it } from 'vitest';
import { PROOF_BYTES, bytesOf, sizesToTry } from '../src/receipts/photo.ts';

describe('Shrinking a proof photo', () => {
  it('A proof photo can be up to 300 KB', () => {
    expect(PROOF_BYTES).toBe(300_000);
  });

  it("A photo's size is counted from its text form, padding and all", () => {
    expect(bytesOf('data:image/jpeg;base64,QUJD')).toBe(3);
    expect(bytesOf('data:image/jpeg;base64,QUI=')).toBe(2);
    expect(bytesOf('data:image/jpeg;base64,QQ==')).toBe(1);
  });

  it('A big photo is first brought down to 1600 pixels on its long side, then tried smaller and smaller', () => {
    const sizes = sizesToTry(4032, 3024);
    expect(sizes[0]).toEqual({ width: 1600, height: 1200 });
    expect(sizes[1]).toEqual({ width: 1200, height: 900 });
    expect(sizes).toHaveLength(6);
  });

  it('A small photo keeps its size to start with', () => {
    expect(sizesToTry(800, 600)[0]).toEqual({ width: 800, height: 600 });
  });
});
