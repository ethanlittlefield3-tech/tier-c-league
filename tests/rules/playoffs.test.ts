import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, dev1, dev2, season, seedLeague, startEmulator, stopEmulator, stranger } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

const bracket = `${season}/playoffs/bracket`;

beforeEach(async () => {
  await seedLeague();
  await asJob((db) => db.doc(bracket).set({ size: 4, seeds: ['p1', 'p2', 'p3'], outside: [], semis: [], final: null, suddenDeath: false, whiff: null, champion: null, finalist: null }));
});

describe('The playoff bracket', () => {
  it('Everyone in the league reads it, and nobody outside it', async () => {
    await assertSucceeds(dev2().doc(bracket).get());
    await assertFails(stranger().doc(bracket).get());
  });

  it('Only the weekly job writes it: no phone, not even the commish', async () => {
    await assertFails(dev1().doc(bracket).update({ champion: 'p1' }));
    await assertFails(dev2().doc(bracket).set({ champion: 'p2' }));
  });
});
