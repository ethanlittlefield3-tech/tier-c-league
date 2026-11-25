import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, dev1, dev2, season, seedLeague, startEmulator, stopEmulator, stranger } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(async () => {
  await seedLeague();
  await asJob((db) => db.doc(`${season}/standings/current`).set({ rows: [{ player: 'p1', rank: 1, seasonPoints: 12 }], asOf: new Date() }));
});

describe('The standings', () => {
  it('Everyone in the league can read the standings', async () => {
    await assertSucceeds(dev2().doc(`${season}/standings/current`).get());
  });

  it('Nobody outside the league can', async () => {
    await assertFails(stranger().doc(`${season}/standings/current`).get());
  });

  it('Only the weekly job writes them: no phone can, the commish included', async () => {
    await assertFails(dev2().doc(`${season}/standings/current`).set({ rows: [], asOf: new Date() }));
    await assertFails(dev1().doc(`${season}/standings/current`).update({ asOf: new Date() }));
    await assertFails(dev1().doc(`${season}/standings/current`).delete());
  });

  it("A week's results can be read by everyone in the league and written by no phone", async () => {
    await assertSucceeds(dev2().doc(`${season}/weeks/w02`).get());
    await assertFails(dev1().doc(`${season}/weeks/w02`).update({ status: 'final' }));
  });
});
