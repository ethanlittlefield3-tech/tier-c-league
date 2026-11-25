import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { THU2, TUE2, WED2, assertFails, assertSucceeds, dev1, dev2, dev3, now, season, seedLeague, startEmulator, stopEmulator, stranger, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

// Week 2: p1 plays p2, and p3 plays The House. Today is Wednesday.
const path = (date: string, by: string) => `${season}/pokes/${date}_${by}`;
const poke = (db: Db, by: string, to: string, date = WED2) => db.doc(path(date, by)).set({ player: by, to, date, at: now() });

describe('Pokes', () => {
  it("A player pokes this week's opponent, once a day", async () => {
    await assertSucceeds(poke(dev1(), 'p1', 'p2'));
    await assertFails(poke(dev1(), 'p1', 'p2'));
    await assertSucceeds(poke(dev2(), 'p2', 'p1'));
  });

  it("Nobody pokes anyone but this week's opponent: not another player, and not The House", async () => {
    await assertFails(poke(dev1(), 'p1', 'p3'));
    await assertFails(poke(dev3(), 'p3', 'HOUSE'));
  });

  it('A poke is dated today, sent in your own name and filed under it, stamped with the real time, and says nothing else', async () => {
    await assertFails(poke(dev1(), 'p1', 'p2', TUE2));
    await assertFails(poke(dev1(), 'p1', 'p2', THU2));
    await assertFails(dev2().doc(path(WED2, 'p1')).set({ player: 'p1', to: 'p2', date: WED2, at: now() }));
    await assertFails(dev1().doc(path(WED2, 'p1x')).set({ player: 'p1', to: 'p2', date: WED2, at: now() }));
    await assertFails(dev1().doc(path(WED2, 'p1')).set({ player: 'p1', to: 'p2', date: WED2, at: new Date(2020, 0, 1) }));
    await assertFails(dev1().doc(path(WED2, 'p1')).set({ player: 'p1', to: 'p2', date: WED2, at: now(), text: 'Wake up' }));
  });

  it('Everyone in the league can read pokes; nobody changes or deletes one, and nobody outside the league reads them', async () => {
    await assertSucceeds(poke(dev1(), 'p1', 'p2'));
    await assertSucceeds(dev3().doc(path(WED2, 'p1')).get());
    await assertFails(dev1().doc(path(WED2, 'p1')).update({ to: 'p3' }));
    await assertFails(dev1().doc(path(WED2, 'p1')).delete());
    await assertFails(stranger().doc(path(WED2, 'p1')).get());
  });
});
