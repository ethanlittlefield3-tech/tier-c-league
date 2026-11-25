import { describe, expect, it } from 'vitest';
import { PROOF_DAYS, staleProofs } from '../lib/proofs.ts';

const DAY = 24 * 3_600_000;

describe('Cleaning up proof photos', () => {
  it('Proof photos delete themselves after 14 days (SCOPE.md)', () => {
    expect(PROOF_DAYS).toBe(14);
    const now = 100 * DAY;
    const proofs = [
      { id: 'old', at: now - 14 * DAY },
      { id: 'older', at: now - 30 * DAY },
      { id: 'recent', at: now - 13 * DAY },
    ];
    expect(staleProofs(proofs, now)).toEqual(['old', 'older']);
  });

  it('A proof with no time on it is left alone', () => {
    expect(staleProofs([{ id: 'odd', at: Number.NaN }], 100 * DAY)).toEqual([]);
  });
});
