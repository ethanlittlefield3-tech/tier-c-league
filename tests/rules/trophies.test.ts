import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, dev1, dev3, league, seedLeague, startEmulator, stopEmulator, stranger } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

const trophies = `${league}/trophies/s1`;

describe('The trophy case', () => {
  it('Everyone in the league reads the trophy case; nobody outside it does', async () => {
    await asJob((db) => db.doc(trophies).set({ season: 's1', name: 'Season 1', trophies: { leader: { winners: ['p2'], value: 200 } } }));
    await assertSucceeds(dev3().doc(trophies).get());
    await assertSucceeds(dev3().collection(`${league}/trophies`).get());
    await assertFails(stranger().doc(trophies).get());
  });

  it('Only the weekly job awards trophies: not a player, and not the commish', async () => {
    await assertFails(dev3().doc(trophies).set({ season: 's1', name: 'Season 1', trophies: { leader: { winners: ['p3'], value: 999 } } }));
    await asJob((db) => db.doc(trophies).set({ season: 's1', name: 'Season 1', trophies: {} }));
    await assertFails(dev1().doc(trophies).update({ trophies: { leader: { winners: ['p1'], value: 999 } } }));
    await assertFails(dev1().doc(trophies).delete());
  });
});
