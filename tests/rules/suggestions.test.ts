import firebase from 'firebase/compat/app';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, auditEntry, dev1, dev2, dev3, league, now, seedLeague, startEmulator, stopEmulator, stranger, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

// p1 is the commish. The idea is p2's.
const idea = `${league}/suggestions/i1`;
const post = (db: Db, by: string, extra: Record<string, unknown> = {}) => db.doc(idea).set({ by, text: 'A bowling week', at: now(), tag: null, votes: {}, deleted: false, ...extra });
const withIdea = () => asJob((db) => db.doc(idea).set({ by: 'p2', text: 'A bowling week', at: new Date(), tag: null, votes: {}, deleted: false }));

describe('The suggestion box', () => {
  it('Anyone in the league posts an idea in their own name, up to 280 characters, with no tag or votes yet', async () => {
    await assertFails(post(dev2(), 'p3'));
    await assertFails(post(dev2(), 'p2', { text: 'x'.repeat(281) }));
    await assertFails(post(dev2(), 'p2', { tag: 'planned' }));
    await assertFails(post(dev2(), 'p2', { votes: { p2: true } }));
    await assertFails(post(stranger(), 'p9'));
    await assertSucceeds(post(dev2(), 'p2'));
  });

  it('Everyone else upvotes an idea with their own vote, and can take it back; nobody votes for their own idea, or for anyone else', async () => {
    await withIdea();
    await assertSucceeds(dev3().doc(idea).update({ 'votes.p3': true }));
    await assertSucceeds(dev3().doc(idea).update({ 'votes.p3': firebase.firestore.FieldValue.delete() }));
    await assertFails(dev3().doc(idea).update({ 'votes.p3': false }));
    await assertFails(dev3().doc(idea).update({ 'votes.p1': true }));
    await assertFails(dev2().doc(idea).update({ 'votes.p2': true }));
  });

  it('Only the commish tags an idea, Planned, Maybe or No, and can clear the tag', async () => {
    await withIdea();
    await assertFails(dev2().doc(idea).update({ tag: 'planned' }));
    await assertFails(dev1().doc(idea).update({ tag: 'someday' }));
    await assertFails(dev1().doc(idea).update({ tag: 'planned', text: 'A bowling month' }));
    await assertSucceeds(dev1().doc(idea).update({ tag: 'planned' }));
    await assertSucceeds(dev1().doc(idea).update({ tag: 'no' }));
    await assertSucceeds(dev1().doc(idea).update({ tag: null }));
  });

  it("Its author takes an idea down, which blanks its words; the commish can too, with an entry in the league log; nobody edits an idea's words", async () => {
    await withIdea();
    await assertFails(dev2().doc(idea).update({ text: 'A bowling month' }));
    await assertFails(dev3().doc(idea).update({ deleted: true, text: '' }));
    await assertFails(dev1().doc(idea).update({ deleted: true, text: '' }));
    const db = dev1();
    const batch = db.batch();
    batch.update(db.doc(idea), { deleted: true, text: '', audit: 'a-idea' });
    batch.set(db.doc(`${league}/audit/a-idea`), auditEntry('idea.delete', 'suggestions/i1'));
    await assertSucceeds(batch.commit());
    await withIdea();
    await assertSucceeds(dev2().doc(idea).update({ deleted: true, text: '' }));
  });

  it('Everyone in the league reads the ideas; nobody outside it does', async () => {
    await withIdea();
    await assertSucceeds(dev3().doc(idea).get());
    await assertSucceeds(dev3().collection(`${league}/suggestions`).get());
    await assertFails(stranger().doc(idea).get());
  });
});
