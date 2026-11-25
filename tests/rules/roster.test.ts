import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, dev1, dev2, dev3, season, seedLeague, startEmulator, stopEmulator, stranger, visitor } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

const roster = (player: string) => `${season}/roster/${player}`;

describe('Goals for the season', () => {
  it("Everyone in the league can see every player's goals", async () => {
    const mine = await assertSucceeds(dev2().doc(roster('p2')).get());
    expect(mine.data()?.goals?.mind?.text).toBe('Read 20 pages');
    await assertSucceeds(dev2().doc(roster('p1')).get());
    await assertSucceeds(dev3().collection(`${season}/roster`).get());
  });

  it('Someone outside the league cannot see anyone\'s goals', async () => {
    await assertFails(stranger().doc(roster('p2')).get());
    await assertFails(stranger().collection(`${season}/roster`).get());
    await assertFails(visitor().doc(roster('p2')).get());
  });

  it('Nobody can change goals from a phone yet, the commish included: they are settled at the draft', async () => {
    const goals = { mind: { text: 'Nap', status: 'approved' }, body: { text: 'Nap', status: 'approved' }, wildcard: { text: 'Nap', status: 'approved' } };
    await assertFails(dev2().doc(roster('p2')).update({ goals }));
    await assertFails(dev2().doc(roster('p9')).set({ goals }));
    await assertFails(dev1().doc(roster('p2')).update({ goals }));
    await assertFails(dev2().doc(roster('p2')).delete());
  });
});
