import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { FRI2, PLAYOFF_TOMORROW, WED2, asJob, assertFails, assertSucceeds, auditEntry, dev1, dev2, league, season, seedLeague, startEmulator, stopEmulator, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

/** A holiday event on a calendar day, with its audit entry, in one save. */
function schedule(db: Db, date: string, event: string | null, options: { extra?: Record<string, unknown>; by?: string; audit?: boolean } = {}) {
  const id = `a-${date}-${String(event)}`;
  const batch = db.batch();
  batch.update(db.doc(`${season}/calendar/${date}`), { event, audit: id, ...options.extra });
  if (options.audit !== false) batch.set(db.doc(`${league}/audit/${id}`), { ...auditEntry('event.set', `calendar/${date}`), by: options.by ?? 'p1' });
  return batch.commit();
}

describe('Holiday events', () => {
  beforeEach(seedLeague);

  it('The commish puts one on a regular-season day before it starts, changes it, or takes it off, each with an audit entry', async () => {
    await assertSucceeds(schedule(dev1(), FRI2, 'double'));
    await assertSucceeds(schedule(dev1(), FRI2, 'pass'));
    await assertSucceeds(schedule(dev1(), FRI2, null));
  });

  it('Only the three events: Double Points Day, Dry Day and Holiday Pass', async () => {
    await assertSucceeds(schedule(dev1(), FRI2, 'dry'));
    await assertFails(schedule(dev1(), FRI2, 'triple'));
  });

  it('Not on a day that has started, and not on a playoff day', async () => {
    await assertFails(schedule(dev1(), WED2, 'double'));
    await assertFails(schedule(dev1(), PLAYOFF_TOMORROW, 'double'));
  });

  it("Only the commish, only with an audit entry, and nothing else about the day changes", async () => {
    await assertFails(schedule(dev2(), FRI2, 'double', { by: 'p2' }));
    await assertFails(schedule(dev1(), FRI2, 'double', { audit: false }));
    await assertFails(schedule(dev1(), FRI2, 'double', { extra: { lock: new Date() } }));
  });

  it('Not in a season with holiday events turned off', async () => {
    await asJob((db) => db.doc(season).update({ holidayEvents: false }));
    await assertFails(schedule(dev1(), FRI2, 'double'));
  });
});
