import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  FRI2,
  MON2,
  SUN2,
  THU2,
  TUE2,
  TUE3,
  WED2,
  asJob,
  assertFails,
  assertSucceeds,
  demolition,
  dev1,
  dev2,
  dev3,
  restDay,
  kitPath,
  sealedPath,
  season,
  seedLeague,
  startEmulator,
  stopEmulator,
} from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

/** p2 sets a Demolition on p1 (the commish) for tomorrow. */
async function p2DemolishesP1() {
  const db = dev2();
  await db.doc(sealedPath('w02_p2_demolition')).set(await demolition(db, 'p2', 2, 'p1', THU2));
}

describe('Setting a Demolition', () => {
  it('Can be set on your opponent before the target day starts', async () => {
    const db = dev1();
    await assertSucceeds(db.doc(sealedPath('w02_p1_demolition')).set(await demolition(db, 'p1', 2, 'p2', THU2)));
  });

  it('Cannot be set once the target day has started', async () => {
    const db = dev1();
    await assertFails(db.doc(sealedPath('w02_p1_demolition')).set(await demolition(db, 'p1', 2, 'p2', WED2)));
    await assertFails(db.doc(sealedPath('w02_p1_demolition')).set(await demolition(db, 'p1', 2, 'p2', TUE2)));
    await assertFails(db.doc(sealedPath('w02_p1_demolition')).set(await demolition(db, 'p1', 2, 'p2', MON2)));
  });

  it("Cannot be aimed at the opponent's rest day: Sunday by default", async () => {
    const db = dev1();
    await assertFails(db.doc(sealedPath('w02_p1_demolition')).set(await demolition(db, 'p1', 2, 'p2', SUN2)));
  });

  it("Cannot be aimed at a rest day the opponent has moved, and their old Sunday becomes fair game", async () => {
    await asJob((admin) => admin.doc(kitPath('w02_p2_rest')).set({ ...restDay('p2', 2, FRI2), at: new Date() }));
    const db = dev1();
    await assertFails(db.doc(sealedPath('w02_p1_demolition')).set(await demolition(db, 'p1', 2, 'p2', FRI2)));
    await assertSucceeds(db.doc(sealedPath('w02_p1_demolition')).set(await demolition(db, 'p1', 2, 'p2', SUN2)));
  });

  it('Targets a goal lane only, never screen time or beers', async () => {
    const db = dev1();
    await assertFails(db.doc(sealedPath('w02_p1_demolition')).set(await demolition(db, 'p1', 2, 'p2', THU2, 'screen')));
    await assertFails(db.doc(sealedPath('w02_p1_demolition')).set(await demolition(db, 'p1', 2, 'p2', THU2, 'beers')));
  });

  it("Can only hit this week's opponent", async () => {
    const db = dev1();
    await assertFails(db.doc(sealedPath('w02_p1_demolition')).set(await demolition(db, 'p1', 2, 'p3', THU2)));
    await assertFails(db.doc(sealedPath('w02_p1_demolition')).set(await demolition(db, 'p1', 2, 'p1', THU2)));
  });

  it('Has nothing to aim at in a bye week against The House', async () => {
    const db = dev3();
    await assertFails(db.doc(sealedPath('w02_p3_demolition')).set(await demolition(db, 'p3', 2, 'HOUSE', THU2)));
    await assertFails(db.doc(sealedPath('w02_p3_demolition')).set(await demolition(db, 'p3', 2, 'p1', THU2)));
  });

  it('One a week: it cannot be changed or deleted once set, and there is no second slot', async () => {
    const db = dev1();
    const doc = db.doc(sealedPath('w02_p1_demolition'));
    await doc.set(await demolition(db, 'p1', 2, 'p2', THU2));
    await assertFails(doc.set(await demolition(db, 'p1', 2, 'p2', FRI2)));
    await assertFails(doc.update({ lane: 'body' }));
    await assertFails(doc.delete());
    await assertFails(db.doc(sealedPath('w02_p1_demolition2')).set(await demolition(db, 'p1', 2, 'p2', FRI2)));
  });

  it("Monday is safe: next week's Demolition cannot be set before the kit refills", async () => {
    const db = dev1();
    await assertFails(db.doc(sealedPath('w03_p1_demolition')).set(await demolition(db, 'p1', 3, 'p3', TUE3)));
  });

  it('Nobody can set a Demolition in another player\'s name', async () => {
    const db = dev3();
    await assertFails(db.doc(sealedPath('w02_p1_demolition')).set(await demolition(db, 'p1', 2, 'p2', THU2)));
  });

  it('The reveal time is the day\'s lock, and cannot be set to anything else', async () => {
    const db = dev1();
    const honest = await demolition(db, 'p1', 2, 'p2', THU2);
    await assertFails(db.doc(sealedPath('w02_p1_demolition')).set({ ...honest, revealAt: new Date(Date.now() + 999 * 24 * 3_600_000) }));
    await assertFails(db.doc(sealedPath('w02_p1_demolition')).set({ ...honest, revealAt: new Date(0) }));
  });
});

describe('Sealed until the day locks', () => {
  it('The player who set a Demolition can read it back', async () => {
    await p2DemolishesP1();
    await assertSucceeds(dev2().doc(sealedPath('w02_p2_demolition')).get());
    await assertSucceeds(dev2().collection(`${season}/sealed`).where('player', '==', 'p2').get());
  });

  it('The player it is aimed at cannot read it before the day locks', async () => {
    await p2DemolishesP1();
    await assertFails(dev1().doc(sealedPath('w02_p2_demolition')).get());
  });

  it('The commish cannot read it before the day locks', async () => {
    await p2DemolishesP1();
    // dev1 is the commish.
    await assertFails(dev1().doc(sealedPath('w02_p2_demolition')).get());
    await assertFails(dev1().collection(`${season}/sealed`).get());
    await assertFails(dev1().collection(`${season}/sealed`).where('target', '==', 'p1').get());
  });

  it('No other player can read it or find it by listing', async () => {
    await p2DemolishesP1();
    await assertFails(dev3().doc(sealedPath('w02_p2_demolition')).get());
    await assertFails(dev3().collection(`${season}/sealed`).get());
    await assertFails(dev3().collection(`${season}/sealed`).where('player', '==', 'p2').get());
  });

  it('Checking for a Demolition that was never set looks the same as one that was: both are refused', async () => {
    await p2DemolishesP1();
    await assertFails(dev1().doc(sealedPath('w02_p2_demolition')).get());
    await assertFails(dev1().doc(sealedPath('w02_p3_demolition')).get());
  });

  it('Once the day has locked, anyone in the league can read it', async () => {
    await asJob(async (admin) => {
      const calendar = await admin.doc(`${season}/calendar/${MON2}`).get();
      await admin.doc(sealedPath('w02_p2_demolition')).set({
        kind: 'demolition',
        player: 'p2',
        period: 'w02',
        target: 'p1',
        date: MON2,
        lane: 'mind',
        revealAt: calendar.get('lock'),
        at: new Date(Date.now() - 80 * 3_600_000),
      });
    });
    await assertSucceeds(dev1().doc(sealedPath('w02_p2_demolition')).get());
    await assertSucceeds(dev3().doc(sealedPath('w02_p2_demolition')).get());
  });
});
