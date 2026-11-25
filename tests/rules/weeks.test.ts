import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, auditEntry, dev1, dev2, league, season, seedLeague, startEmulator, stopEmulator, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

const week = `${season}/weeks/w01`;
const dare = (player: string) => `${season}/dares/${player}`;

/** The commish's change, with its audit entry, in one save. */
function audited(db: Db, path: string, change: Record<string, unknown>, action: string, target: string, by = 'p1') {
  const batch = db.batch();
  batch.update(db.doc(path), { ...change, audit: `a-${action}` });
  batch.set(db.doc(`${league}/audit/a-${action}`), { ...auditEntry(action, target), by });
  return batch.commit();
}

describe('Unlocking a final week', () => {
  beforeEach(async () => {
    await seedLeague();
    await asJob((db) => db.doc(week).set({ week: 1, status: 'final', results: {}, awards: { mvp: [], bust: [], wheel: [] } }));
  });

  it('The commish can unlock a final week, so the weekly job counts it again, and it goes in the audit log', async () => {
    await assertSucceeds(audited(dev1(), week, { status: 'provisional' }, 'week.unlock', 'weeks/w01'));
  });

  it('Nobody else can, and not without the audit entry', async () => {
    await assertFails(audited(dev2(), week, { status: 'provisional' }, 'week.unlock', 'weeks/w01', 'p2'));
    await assertFails(dev1().doc(week).update({ status: 'provisional' }));
  });

  it('Unlocking changes nothing else: no results, and only a final week', async () => {
    await assertFails(audited(dev1(), week, { status: 'provisional', results: { p1: 'win' } }, 'week.unlock', 'weeks/w01'));
    await assertFails(audited(dev1(), week, { status: 'final' }, 'week.unlock', 'weeks/w01'));
    await asJob((db) => db.doc(week).update({ status: 'provisional' }));
    await assertFails(audited(dev1(), week, { status: 'provisional' }, 'week.unlock', 'weeks/w01'));
  });
});

describe('Removing a dare', () => {
  beforeEach(async () => {
    await seedLeague();
    await asJob((db) => db.doc(dare('p2')).set({ text: 'Something unkind', version: 1 }));
  });

  it('The commish can take a dare off the Wheel, and it goes in the audit log', async () => {
    await assertSucceeds(audited(dev1(), dare('p2'), { removed: true }, 'dare.remove', 'dares/p2'));
  });

  it('Nobody else can, and not without the audit entry, and nothing else about the dare changes', async () => {
    await assertFails(audited(dev2(), dare('p2'), { removed: true }, 'dare.remove', 'dares/p2', 'p2'));
    await assertFails(dev1().doc(dare('p2')).update({ removed: true }));
    await assertFails(audited(dev1(), dare('p2'), { removed: true, text: 'Kinder words' }, 'dare.remove', 'dares/p2'));
  });
});

describe('Taking starter dares off the Wheel', () => {
  const config = `${season}/config/wheel`;
  const setStarters = (db: Db, removedStarters: unknown, by = 'p1') => {
    const batch = db.batch();
    batch.set(db.doc(config), { removedStarters, audit: `a-starters-${by}` });
    batch.set(db.doc(`${league}/audit/a-starters-${by}`), { ...auditEntry('wheel.starters', 'config/wheel'), by });
    return batch.commit();
  };

  beforeEach(seedLeague);

  it('The commish can take starter dares off the Wheel or put them back, and it goes in the audit log', async () => {
    await assertSucceeds(setStarters(dev1(), [2, 5]));
    await assertSucceeds(dev2().doc(config).get());
  });

  it('Only the 8 starters, by their place in the list, and only by the commish with the audit entry', async () => {
    await assertFails(setStarters(dev1(), [8]));
    await assertFails(setStarters(dev1(), ['Cold shower']));
    await assertFails(setStarters(dev2(), [1], 'p2'));
    await assertFails(dev1().doc(config).set({ removedStarters: [1] }));
  });
});
