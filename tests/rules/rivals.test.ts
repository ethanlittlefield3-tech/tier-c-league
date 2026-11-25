import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, dev2, dev3, league, seedLeague, startEmulator, stopEmulator, stranger } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

const profile = `${league}/players/p2`;
const record = { p3: { win: 0, draw: 0, loss: 2, lastMet: { season: 's1', week: 2 } } };

describe('Rivalry records', () => {
  it("Everyone in the league can read a player's rivalry record; nobody outside it can", async () => {
    await asJob((db) => db.doc(profile).update({ rivals: record }));
    await assertSucceeds(dev3().doc(profile).get());
    await assertFails(stranger().doc(profile).get());
  });

  it('Only the weekly job writes them: nobody can change their own record, or anyone else\'s', async () => {
    await asJob((db) => db.doc(profile).update({ rivals: record }));
    await assertFails(dev2().doc(profile).update({ rivals: {} }));
    await assertFails(dev2().doc(profile).update({ 'rivals.p3.loss': 0 }));
    await assertFails(dev3().doc(profile).update({ rivals: {} }));
  });
});
