import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { MON2, MON3, TUE3, asJob, assertFails, assertSucceeds, dev1, dev2, dev3, now, season, seedLeague, startEmulator, stopEmulator, stranger, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

// Today is Wednesday of Week 2: Week 3 starts next Monday. Picks for a week
// close as its Monday ends, at 11:59 pm (ruling R25).
const path = (player: string, period = 'w03') => `${season}/predictions/${period}_${player}`;
async function timeOf(date: string, field: 'start' | 'end'): Promise<unknown> {
  let time: unknown = null;
  await asJob(async (db) => {
    time = (await db.doc(`${season}/calendar/${date}`).get()).get(field);
  });
  return time;
}
const lockOf = (date: string) => timeOf(date, 'end');
const pick = async (db: Db, player: string, picks: string[], extra: Record<string, unknown> = {}) =>
  db.doc(path(player, String(extra.period ?? 'w03'))).set({ player, period: 'w03', date: MON3, picks, lockAt: await lockOf(MON3), at: now(), ...extra });

describe('Predictions', () => {
  it('A player picks a week\'s winners in their own name, and can change them until its Monday ends at 11:59 pm', async () => {
    await assertSucceeds(pick(dev2(), 'p2', ['p1']));
    await assertSucceeds(pick(dev2(), 'p2', ['p3']));
    await assertFails(pick(dev3(), 'p2', ['p1']));
  });

  it("On a week's Monday, after the week has started, its picks are still open", async () => {
    // Week 2's Monday, as if it were still going: it started, and ends in an hour.
    await asJob(async (db) => db.doc(`${season}/calendar/${MON2}`).update({ end: new Date(Date.now() + 3_600_000) }));
    await assertSucceeds(dev2().doc(path('p2', 'w02')).set({ player: 'p2', period: 'w02', date: MON2, picks: ['p1'], lockAt: await lockOf(MON2), at: now() }));
  });

  it("Once the week's Monday is over, picks are closed", async () => {
    await assertFails(dev2().doc(path('p2', 'w02')).set({ player: 'p2', period: 'w02', date: MON2, picks: ['p1'], lockAt: await lockOf(MON2), at: now() }));
  });

  it("Picks are filed under their week and player, lock as the week's Monday ends, and name only players in the league, each once", async () => {
    await assertFails(dev2().doc(`${season}/predictions/w03_p2x`).set({ player: 'p2', period: 'w03', date: MON3, picks: ['p1'], lockAt: await lockOf(MON3), at: now() }));
    await assertFails(pick(dev2(), 'p2', ['p1'], { lockAt: new Date(2100, 0, 1) }));
    // Locking as the week starts, a day early, is no longer the rule.
    await assertFails(pick(dev2(), 'p2', ['p1'], { lockAt: await timeOf(MON3, 'start') }));
    // Dated the week's Tuesday, it would lock a day late.
    await assertFails(pick(dev2(), 'p2', ['p1'], { date: TUE3, lockAt: await lockOf(TUE3) }));
    // Filed under another week than its Monday's.
    await assertFails(pick(dev2(), 'p2', ['p1'], { period: 'w04' }));
    await assertFails(pick(dev2(), 'p2', ['p9']));
    await assertFails(pick(dev2(), 'p2', ['p1', 'p1']));
    await assertFails(pick(dev2(), 'p2', ['p1'], { at: new Date(2020, 0, 1) }));
    await assertFails(pick(dev2(), 'p2', ['p1'], { right: 3 }));
  });

  it("Until the week's Monday ends, only the picker sees their picks; after, everyone in the league does", async () => {
    await assertSucceeds(pick(dev2(), 'p2', ['p1']));
    await assertSucceeds(dev2().doc(path('p2')).get());
    await assertFails(dev3().doc(path('p2')).get());
    await assertSucceeds(dev2().collection(`${season}/predictions`).where('player', '==', 'p2').get());
    await assertFails(dev3().collection(`${season}/predictions`).get());
    // A week whose Monday is over: its picks are open to all.
    await asJob(async (db) => db.doc(path('p3', 'w02')).set({ player: 'p3', period: 'w02', date: MON2, picks: ['p1'], lockAt: (await db.doc(`${season}/calendar/${MON2}`).get()).get('end'), at: new Date() }));
    await assertSucceeds(dev1().doc(path('p3', 'w02')).get());
    await assertFails(stranger().doc(path('p3', 'w02')).get());
  });
});
