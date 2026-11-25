import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, dev1, dev2, dev3, season, seedLeague, startEmulator, stopEmulator, stranger, visitor } from './harness.ts';

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

  it('Before the draft opens, nobody can set or change goals from a phone, the commish included', async () => {
    // Goals a player could set during the draft, so the only thing missing is the draft.
    await asJob((db) => db.doc(roster('p3')).delete());
    const goals = { mind: { text: 'Nap', version: 1 }, body: { text: 'Nap', version: 1 }, wildcard: { text: 'Nap', version: 1 } };
    await assertFails(dev3().doc(roster('p3')).set({ goals }));
    await assertFails(dev1().doc(roster('p3')).set({ goals }));
    await assertFails(dev2().doc(roster('p9')).set({ goals }));
    await assertFails(dev2().doc(roster('p2')).delete());
  });
});
