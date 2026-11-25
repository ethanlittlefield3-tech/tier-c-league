import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import firebase from 'firebase/compat/app';
import { MON2, TUE2, WED2, asJob, assertFails, assertSucceeds, dayLog, dayPath, dev1, dev2, dev3, kitPath, now, season, seedLeague, startEmulator, stopEmulator, stranger, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

// The tests run 6 hours into Wednesday of Week 2: Tuesday is still open
// until noon today, and Monday has locked.
const receipt = (id: string) => `${season}/receipts/${id}`;
const slot = (id: string) => `${season}/receiptSlots/${id}`;
const proof = (id: string) => `${season}/proofs/${id}`;
const idOf = (target: string, date: string, square: string) => `${target}_${date}_${square}`;
const HOUR = 3_600_000;
const inHours = (hours: number) => firebase.firestore.Timestamp.fromMillis(Date.now() + hours * HOUR);

/** Maya (p2) logged Monday, Tuesday and Wednesday: Mind and Wildcard hit, 150 minutes of screen time. */
async function seedDays() {
  await seedLeague();
  await asJob(async (db) => {
    for (const date of [MON2, TUE2, WED2]) await db.doc(dayPath('p2', date)).set({ ...dayLog('p2', date), firstAt: new Date(), updatedAt: new Date() });
  });
}

/**
 * Asking for receipts as the app does: the receipt and one of your 3 slots
 * for the week, in one save. The deadline comes from the day's calendar:
 * the end of that day, or the end of the next day after 6 pm.
 */
async function ask(db: Db, by: string, target: string, date: string, square: string, options: { n?: number; deadline?: unknown; id?: string; requestedAt?: unknown; noSlot?: boolean } = {}) {
  const calendar = await db.doc(`${season}/calendar/${date}`).get();
  const id = options.id ?? idOf(target, date, square);
  const slotId = `${calendar.get('period')}_${by}_${options.n ?? 1}`;
  const deadline = options.deadline ?? (Date.now() < calendar.get('sixPm').toMillis() ? calendar.get('end') : calendar.get('nextEnd'));
  const batch = db.batch();
  batch.set(db.doc(receipt(id)), { target, date, square, by, slot: slotId, requestedAt: options.requestedAt ?? now(), deadline, proofAt: null, backedDownAt: null });
  if (!options.noSlot) batch.set(db.doc(slot(slotId)), { receipt: id });
  return batch.commit();
}

/** A receipt already asked for, as a job would leave it. */
async function asked(target: string, date: string, square: string, deadline = inHours(10)) {
  await asJob((db) =>
    db.doc(receipt(idOf(target, date, square))).set({ target, date, square, by: 'p3', slot: `w02_p3_1`, requestedAt: inHours(-1), deadline, proofAt: null, backedDownAt: null }),
  );
}

const PHOTO = `data:image/jpeg;base64,${'A'.repeat(2000)}`;

/** Proving a receipt as the app does: the photo, and the receipt marked proven, in one save. */
function prove(db: Db, id: string, photo = PHOTO) {
  const batch = db.batch();
  batch.set(db.doc(proof(id)), { photo, at: now() });
  batch.update(db.doc(receipt(id)), { proofAt: now() });
  return batch.commit();
}

describe('Asking for receipts', () => {
  beforeEach(seedDays);

  it('Anyone in the league can ask for receipts on a square someone else claimed, until that day locks', async () => {
    await assertSucceeds(ask(dev3(), 'p3', 'p2', WED2, 'mind'));
    await assertSucceeds(ask(dev1(), 'p1', 'p2', TUE2, 'screen'));
    await assertFails(ask(dev1(), 'p1', 'p2', MON2, 'mind', { n: 2 }));
  });

  it("You can't ask yourself, or ask on a square with nothing claimed", async () => {
    await assertFails(ask(dev2(), 'p2', 'p2', WED2, 'mind'));
    await assertFails(ask(dev3(), 'p3', 'p2', WED2, 'body'));
    await asJob((db) => db.doc(dayPath('p2', WED2)).update({ screenMinutes: null }));
    await assertFails(ask(dev3(), 'p3', 'p2', WED2, 'screen'));
    await assertFails(ask(dev3(), 'p3', 'p1', WED2, 'mind'));
  });

  it('On a rest day, receipts cover screen time only', async () => {
    await asJob((db) => db.doc(kitPath(`w02_p2_rest`)).set({ player: 'p2', item: 'rest', period: 'w02', date: WED2, at: new Date() }));
    await assertFails(ask(dev3(), 'p3', 'p2', WED2, 'mind'));
    await assertSucceeds(ask(dev3(), 'p3', 'p2', WED2, 'screen'));
  });

  it('Proof is due by the end of that day, or by the end of the next day when asked after 6 pm', async () => {
    const wednesday = await dev3().doc(`${season}/calendar/${WED2}`).get();
    await assertFails(ask(dev3(), 'p3', 'p2', WED2, 'mind', { deadline: wednesday.get('nextEnd') }));
    const tuesday = await dev3().doc(`${season}/calendar/${TUE2}`).get();
    await assertFails(ask(dev3(), 'p3', 'p2', TUE2, 'mind', { deadline: tuesday.get('end') }));
  });

  it('A request always takes one of your slots, and nobody can take a slot of yours', async () => {
    await assertFails(ask(dev3(), 'p3', 'p2', WED2, 'mind', { noSlot: true }));
    await assertFails(dev3().doc(slot('w02_p1_1')).set({ receipt: 'anything' }));
    await assertFails(dev3().doc(slot('w02_p1_1')).set({ receipt: idOf('p2', WED2, 'mind') }));
  });

  it('Each player has 3 requests a week', async () => {
    await assertSucceeds(ask(dev3(), 'p3', 'p2', WED2, 'mind', { n: 1 }));
    await assertSucceeds(ask(dev3(), 'p3', 'p2', WED2, 'wildcard', { n: 2 }));
    await assertSucceeds(ask(dev3(), 'p3', 'p2', WED2, 'screen', { n: 3 }));
    await assertFails(ask(dev3(), 'p3', 'p2', TUE2, 'mind', { n: 4 }));
    await assertFails(ask(dev3(), 'p3', 'p2', TUE2, 'mind', { n: 1 }));
  });

  it('Each square takes one request', async () => {
    await ask(dev3(), 'p3', 'p2', WED2, 'mind');
    await assertFails(ask(dev1(), 'p1', 'p2', WED2, 'mind'));
  });

  it("A request is filed under the square's own name, in your name, at the server time", async () => {
    await assertFails(ask(dev3(), 'p3', 'p2', WED2, 'mind', { id: idOf('p2', WED2, 'wildcard') }));
    await assertFails(ask(dev3(), 'p1', 'p2', WED2, 'mind'));
    await assertFails(ask(dev3(), 'p3', 'p2', WED2, 'mind', { requestedAt: inHours(-2) }));
    await assertFails(stranger().doc(receipt(idOf('p2', WED2, 'mind'))).set({ target: 'p2', date: WED2, square: 'mind', by: 'p9', slot: 'w02_p9_1', requestedAt: now(), deadline: inHours(18), proofAt: null, backedDownAt: null }));
  });
});

describe('Answering a receipt', () => {
  beforeEach(async () => {
    await seedDays();
    await asked('p2', WED2, 'mind');
  });

  it('The player can back down before the deadline, for free', async () => {
    await assertFails(dev3().doc(receipt(idOf('p2', WED2, 'mind'))).update({ backedDownAt: now() }));
    await assertFails(dev2().doc(receipt(idOf('p2', WED2, 'mind'))).update({ backedDownAt: inHours(-2) }));
    await assertSucceeds(dev2().doc(receipt(idOf('p2', WED2, 'mind'))).update({ backedDownAt: now() }));
  });

  it('A receipt is proven only with the photo, in the same save', async () => {
    await assertFails(dev2().doc(receipt(idOf('p2', WED2, 'mind'))).update({ proofAt: now() }));
  });

  it('Or prove it with a photo of up to 300 KB before the deadline', async () => {
    await assertFails(prove(dev3(), idOf('p2', WED2, 'mind')));
    await assertFails(prove(dev2(), idOf('p2', WED2, 'mind'), `data:image/jpeg;base64,${'A'.repeat(420_000)}`));
    await assertFails(prove(dev2(), idOf('p2', WED2, 'mind'), 'not a photo'));
    await assertSucceeds(prove(dev2(), idOf('p2', WED2, 'mind')));
  });

  it('Once proven or backed down, it stays that way', async () => {
    await prove(dev2(), idOf('p2', WED2, 'mind'));
    await assertFails(dev2().doc(receipt(idOf('p2', WED2, 'mind'))).update({ backedDownAt: now() }));
    await assertFails(prove(dev2(), idOf('p2', WED2, 'mind')));
  });

  it('After the deadline, nothing changes: the square is voided and costs 1 more point', async () => {
    await asked('p2', WED2, 'wildcard', inHours(-1));
    await assertFails(dev2().doc(receipt(idOf('p2', WED2, 'wildcard'))).update({ backedDownAt: now() }));
    await assertFails(prove(dev2(), idOf('p2', WED2, 'wildcard')));
  });

  it("Nobody can change a request's facts, the commish included", async () => {
    await assertFails(dev1().doc(receipt(idOf('p2', WED2, 'mind'))).update({ deadline: inHours(48) }));
    await assertFails(dev2().doc(receipt(idOf('p2', WED2, 'mind'))).update({ square: 'body' }));
  });

  it('Everyone in the league can see receipts and proof; nobody outside can', async () => {
    await prove(dev2(), idOf('p2', WED2, 'mind'));
    await assertSucceeds(dev3().doc(receipt(idOf('p2', WED2, 'mind'))).get());
    await assertSucceeds(dev3().doc(proof(idOf('p2', WED2, 'mind'))).get());
    await assertFails(stranger().doc(proof(idOf('p2', WED2, 'mind'))).get());
  });
});

describe('Fixing screen time for a receipt (ruling R6)', () => {
  beforeEach(seedDays);

  it('While a screen-time receipt is open, the player can still fix the number, even after the day locks, and nothing else', async () => {
    await assertFails(dev2().doc(dayPath('p2', MON2)).update({ screenMinutes: 120, updatedAt: now() }));
    await asked('p2', MON2, 'screen');
    await assertSucceeds(dev2().doc(dayPath('p2', MON2)).update({ screenMinutes: 120, updatedAt: now() }));
    await assertFails(dev2().doc(dayPath('p2', MON2)).update({ 'goals.body': true, updatedAt: now() }));
  });

  it('Once the receipt is answered or its deadline passes, the number is fixed', async () => {
    await asked('p2', MON2, 'screen', inHours(-1));
    await assertFails(dev2().doc(dayPath('p2', MON2)).update({ screenMinutes: 120, updatedAt: now() }));
  });
});
