import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  MON2,
  THU2,
  TUE2,
  WED2,
  asJob,
  assertFails,
  assertSucceeds,
  dayLog,
  dayPath,
  dev1,
  dev2,
  now,
  seedLeague,
  startEmulator,
  stopEmulator,
  stranger,
} from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

describe('Logging a day', () => {
  it('A player can log their own day while it is open', async () => {
    await assertSucceeds(dev2().doc(dayPath('p2', WED2)).set(dayLog('p2', WED2)));
  });

  it('A player can change today as often as they like', async () => {
    const day = dev2().doc(dayPath('p2', WED2));
    await day.set(dayLog('p2', WED2));
    await assertSucceeds(day.update({ beers: 3, updatedAt: now() }));
    await assertSucceeds(day.update({ 'goals.body': true, screenMinutes: null, updatedAt: now() }));
  });

  it('A player can fix yesterday until it locks at noon', async () => {
    await assertSucceeds(dev2().doc(dayPath('p2', TUE2)).set(dayLog('p2', TUE2)));
  });

  it('Nobody can write a day after it locks', async () => {
    await assertFails(dev2().doc(dayPath('p2', MON2)).set(dayLog('p2', MON2)));
    // Not even to change one that was logged in time.
    await asJob((db) => db.doc(dayPath('p2', MON2)).set({ ...dayLog('p2', MON2), firstAt: new Date(), updatedAt: new Date() }));
    await assertFails(dev2().doc(dayPath('p2', MON2)).update({ beers: 0, updatedAt: now() }));
  });

  it('Nobody can write a day before it starts', async () => {
    await assertFails(dev2().doc(dayPath('p2', THU2)).set(dayLog('p2', THU2)));
  });

  it("Nobody can write another player's day", async () => {
    await assertFails(dev2().doc(dayPath('p3', WED2)).set(dayLog('p3', WED2)));
    await asJob((db) => db.doc(dayPath('p3', WED2)).set({ ...dayLog('p3', WED2), firstAt: new Date(), updatedAt: new Date() }));
    await assertFails(dev2().doc(dayPath('p3', WED2)).update({ beers: 9, updatedAt: now() }));
  });

  it("The commish cannot edit another player's day either", async () => {
    await assertFails(dev1().doc(dayPath('p2', WED2)).set(dayLog('p2', WED2)));
  });

  it('Someone outside the league cannot write a day', async () => {
    await assertFails(stranger().doc(dayPath('p2', WED2)).set(dayLog('p2', WED2)));
  });

  it('A day cannot be filed under the wrong name, or moved to another date', async () => {
    // Logged as today, but with a locked day's date inside.
    await assertFails(dev2().doc(dayPath('p2', WED2)).set(dayLog('p2', MON2)));
    await assertFails(dev2().doc(dayPath('p2', MON2)).set(dayLog('p2', WED2)));
    const day = dev2().doc(dayPath('p2', WED2));
    await day.set(dayLog('p2', WED2));
    await assertFails(day.update({ date: TUE2, updatedAt: now() }));
    await assertFails(day.update({ player: 'p3', updatedAt: now() }));
  });

  it('A day cannot be deleted', async () => {
    const day = dev2().doc(dayPath('p2', WED2));
    await day.set(dayLog('p2', WED2));
    await assertFails(day.delete());
  });

  it('The time a day was saved comes from the server, not the phone', async () => {
    const yesterday = new Date(Date.now() - 24 * 3_600_000);
    await assertFails(dev2().doc(dayPath('p2', WED2)).set(dayLog('p2', WED2, { updatedAt: yesterday })));
    await assertFails(dev2().doc(dayPath('p2', WED2)).set(dayLog('p2', WED2, { firstAt: yesterday })));
  });
});

describe('Out-of-range entries', () => {
  /** Save today's log with one entry changed: a fresh save the first time, a normal edit after that. */
  const save = async (overrides: Record<string, unknown>) => {
    const day = dev2().doc(dayPath('p2', WED2));
    const saved = await day.get();
    return saved.exists ? day.update({ ...overrides, updatedAt: now() }) : day.set(dayLog('p2', WED2, overrides));
  };

  it('Beers must be a whole number from 0 to 30', async () => {
    await assertSucceeds(save({ beers: 0 }));
    await assertSucceeds(save({ beers: 30 }));
    await assertFails(save({ beers: 31 }));
    await assertFails(save({ beers: -1 }));
    await assertFails(save({ beers: 2.5 }));
    await assertFails(save({ beers: '3' }));
  });

  it('Screen time must be 0 to 1,440 minutes in 15-minute steps, or not logged', async () => {
    await assertSucceeds(save({ screenMinutes: 0 }));
    await assertSucceeds(save({ screenMinutes: 1440 }));
    await assertSucceeds(save({ screenMinutes: null }));
    await assertFails(save({ screenMinutes: 1455 }));
    await assertFails(save({ screenMinutes: -15 }));
    await assertFails(save({ screenMinutes: 50 }));
    await assertFails(save({ screenMinutes: '45' }));
  });

  it('Goals must be exactly the three lanes, each a yes or a no', async () => {
    await assertFails(save({ goals: { mind: true, body: true } }));
    await assertFails(save({ goals: { mind: true, body: true, wildcard: true, bonus: true } }));
    await assertFails(save({ goals: { mind: 1, body: 0, wildcard: 1 } }));
  });

  it('A day cannot carry extra fields, like points', async () => {
    await assertFails(save({ points: 99 }));
    await assertFails(save({ voided: [] }));
  });
});
