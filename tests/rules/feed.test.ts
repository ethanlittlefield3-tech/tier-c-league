import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, dev1, dev2, league, now, seedLeague, startEmulator, stopEmulator, stranger } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

const event = `${league}/feed/e1`;

describe('The league feed', () => {
  beforeEach(async () => {
    await asJob((db) => db.doc(event).set({ at: new Date(), kind: 'badge', player: 'p2', data: { badge: 'hatTrick' } }));
  });

  it('Everyone in the league reads the jobs\' news of badges and rank changes; nobody outside can', async () => {
    await assertSucceeds(dev2().doc(event).get());
    await assertSucceeds(dev1().collection(`${league}/feed`).get());
    await assertFails(stranger().doc(event).get());
  });

  it('Only the jobs write it: nobody in the league can add, change or remove news, the commish included', async () => {
    await assertFails(dev2().doc(`${league}/feed/e2`).set({ at: now(), kind: 'badge', player: 'p2', data: { badge: 'century' } }));
    await assertFails(dev1().doc(event).update({ data: { badge: 'century' } }));
    await assertFails(dev1().doc(event).delete());
  });
});
