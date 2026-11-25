import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, auditEntry, dev1, dev2, dev3, league, now, season, seedLeague, startEmulator, stopEmulator, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

const STATE = `${season}/draft/state`;
// p1 (the commish) captains blue, p2 orange. The pool is p3 and two more.
const atCaptains = (squads = { blue: ['p1'], orange: ['p2'] }, pool = ['p3', 'p4', 'p5']) =>
  asJob(async (db) => {
    await db.doc(season).update({ status: 'draft' });
    await db.doc(STATE).set({ step: 'captains', order: ['p1', 'p2', 'p3', 'p4', 'p5'], picks: {}, left: [], turnStartedAt: new Date(), startedAt: new Date(), votesCloseAt: new Date(Date.now() + 86_400_000), captains: { blue: 'p1', orange: 'p2' }, squads, pool });
  });
const take = (db: Db, squads: Record<string, string[]>, pool: string[]) => db.doc(STATE).update({ squads, pool, turnStartedAt: now() });

describe("The captains' draft", () => {
  it('The captain on turn takes one player from the pool for their squad; the picks snake, blue, orange, orange', async () => {
    await atCaptains();
    await assertSucceeds(take(dev1(), { blue: ['p1', 'p3'], orange: ['p2'] }, ['p4', 'p5']));
    await assertSucceeds(take(dev2(), { blue: ['p1', 'p3'], orange: ['p2', 'p4'] }, ['p5']));
    await assertSucceeds(take(dev2(), { blue: ['p1', 'p3'], orange: ['p2', 'p4', 'p5'] }, []));
  });

  it('Nobody picks out of turn, and only a captain picks', async () => {
    await atCaptains();
    await assertFails(take(dev2(), { blue: ['p1'], orange: ['p2', 'p3'] }, ['p4', 'p5']));
    await assertFails(take(dev3(), { blue: ['p1', 'p3'], orange: ['p2'] }, ['p4', 'p5']));
    await atCaptains({ blue: ['p1', 'p3'], orange: ['p2'] }, ['p4', 'p5']);
    await assertFails(take(dev1(), { blue: ['p1', 'p3', 'p4'], orange: ['p2'] }, ['p5']));
  });

  it("A pick takes exactly one player who is still in the pool, and leaves the other squad alone", async () => {
    await atCaptains();
    await assertFails(take(dev1(), { blue: ['p1', 'p9'], orange: ['p2'] }, ['p3', 'p4', 'p5']));
    await assertFails(take(dev1(), { blue: ['p1', 'p3', 'p4'], orange: ['p2'] }, ['p5']));
    await assertFails(take(dev1(), { blue: ['p1', 'p3'], orange: [] }, ['p4', 'p5']));
    await assertFails(take(dev1(), { blue: ['p1', 'p3'], orange: ['p2'] }, ['p3', 'p4', 'p5']));
    await assertFails(dev1().doc(STATE).update({ squads: { blue: ['p1', 'p3'], orange: ['p2'] }, pool: ['p4', 'p5'], turnStartedAt: new Date(2020, 0, 1) }));
    // Nor reshuffles their own squad, nor changes anything else with the pick.
    await assertFails(take(dev1(), { blue: ['p3', 'p3'], orange: ['p2'] }, ['p4', 'p5']));
    await assertFails(dev1().doc(STATE).update({ squads: { blue: ['p1', 'p3'], orange: ['p2'] }, pool: ['p4', 'p5'], turnStartedAt: now(), step: 'done' }));
  });

  it('The commish moves the draft on to team captains, with an entry in the league log', async () => {
    await asJob(async (db) => {
      await db.doc(season).update({ status: 'draft' });
      await db.doc(STATE).set({ step: 'dares', order: ['p1', 'p2', 'p3'], picks: {}, left: [], turnStartedAt: null, startedAt: new Date(), votesCloseAt: new Date(Date.now() + 86_400_000) });
    });
    const db = dev1();
    const batch = db.batch();
    batch.update(db.doc(STATE), { step: 'captains', captains: { blue: 'p1', orange: 'p2' }, squads: { blue: ['p1'], orange: ['p2'] }, pool: ['p3'], turnStartedAt: now(), audit: 'a-captains' });
    batch.set(db.doc(`${league}/audit/a-captains`), auditEntry('draft.update', 'draft'));
    await assertSucceeds(batch.commit());
  });
});
