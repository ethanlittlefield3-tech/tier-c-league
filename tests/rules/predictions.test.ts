import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { MON2, MON3, TUE3, asJob, assertFails, assertSucceeds, dev1, dev2, dev3, now, season, seedLeague, startEmulator, stopEmulator, stranger, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

// Today is Wednesday of Week 2: Week 3 starts next Monday.
const path = (player: string, period = 'w03') => `${season}/predictions/${period}_${player}`;
async function lockOf(date: string): Promise<unknown> {
  let start: unknown = null;
  await asJob(async (db) => {
    start = (await db.doc(`${season}/calendar/${date}`).get()).get('start');
  });
  return start;
}
const pick = async (db: Db, player: string, picks: string[], extra: Record<string, unknown> = {}) =>
  db.doc(path(player, String(extra.period ?? 'w03'))).set({ player, period: 'w03', date: MON3, picks, lockAt: await lockOf(MON3), at: now(), ...extra });

describe('Predictions', () => {
  it("Before a week starts, a player picks its winners in their own name, and can change them until it starts", async () => {
    await assertSucceeds(pick(dev2(), 'p2', ['p1']));
    await assertSucceeds(pick(dev2(), 'p2', ['p3']));
    await assertFails(pick(dev3(), 'p2', ['p1']));
  });

  it('Once the week has started, picks are closed', async () => {
    await assertFails(dev2().doc(path('p2', 'w02')).set({ player: 'p2', period: 'w02', date: MON2, picks: ['p1'], lockAt: await lockOf(MON2), at: now() }));
  });

  it("Picks are filed under their week and player, lock when the week starts, and name only players in the league, each once", async () => {
    await assertFails(dev2().doc(`${season}/predictions/w03_p2x`).set({ player: 'p2', period: 'w03', date: MON3, picks: ['p1'], lockAt: await lockOf(MON3), at: now() }));
    await assertFails(pick(dev2(), 'p2', ['p1'], { lockAt: new Date(2100, 0, 1) }));
    // Dated the week's Tuesday, it would lock a day late.
    await assertFails(pick(dev2(), 'p2', ['p1'], { date: TUE3, lockAt: await lockOf(TUE3) }));
    // Filed under another week than its Monday's.
    await assertFails(pick(dev2(), 'p2', ['p1'], { period: 'w04' }));
    await assertFails(pick(dev2(), 'p2', ['p9']));
    await assertFails(pick(dev2(), 'p2', ['p1', 'p1']));
    await assertFails(pick(dev2(), 'p2', ['p1'], { at: new Date(2020, 0, 1) }));
    await assertFails(pick(dev2(), 'p2', ['p1'], { right: 3 }));
  });

  it('Until the week starts, only the picker sees their picks; after, everyone in the league does', async () => {
    await assertSucceeds(pick(dev2(), 'p2', ['p1']));
    await assertSucceeds(dev2().doc(path('p2')).get());
    await assertFails(dev3().doc(path('p2')).get());
    await assertSucceeds(dev2().collection(`${season}/predictions`).where('player', '==', 'p2').get());
    await assertFails(dev3().collection(`${season}/predictions`).get());
    // A week that has started: its picks are open to all.
    await asJob(async (db) => db.doc(path('p3', 'w02')).set({ player: 'p3', period: 'w02', date: MON2, picks: ['p1'], lockAt: (await db.doc(`${season}/calendar/${MON2}`).get()).get('start'), at: new Date() }));
    await assertSucceeds(dev1().doc(path('p3', 'w02')).get());
    await assertFails(stranger().doc(path('p3', 'w02')).get());
  });
});
