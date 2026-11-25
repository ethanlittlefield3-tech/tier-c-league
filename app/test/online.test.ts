import { describe, expect, it } from 'vitest';
import { LATE_SYNC_WARNING, lateSyncRisk } from '../src/ui/online.ts';

const H = 3_600_000;
const NOW = Date.UTC(2027, 0, 13, 15);

describe('Warning about a late sync', () => {
  it('Warns when offline, with an unsent save, and the day locks within 3 hours', () => {
    expect(LATE_SYNC_WARNING).toBe(3 * H);
    expect(lateSyncRisk({ online: false, pending: true, lock: NOW + 2 * H, now: NOW })).toBe(true);
    expect(lateSyncRisk({ online: false, pending: true, lock: NOW + 3 * H, now: NOW })).toBe(true);
  });

  it('Stays quiet when online, when nothing is waiting, or while the lock is far off', () => {
    expect(lateSyncRisk({ online: true, pending: true, lock: NOW + H, now: NOW })).toBe(false);
    expect(lateSyncRisk({ online: false, pending: false, lock: NOW + H, now: NOW })).toBe(false);
    expect(lateSyncRisk({ online: false, pending: true, lock: NOW + 4 * H, now: NOW })).toBe(false);
  });

  it('Stays quiet once the lock has passed: the save will be refused, and the day shows as locked', () => {
    expect(lateSyncRisk({ online: false, pending: true, lock: NOW - H, now: NOW })).toBe(false);
  });
});
