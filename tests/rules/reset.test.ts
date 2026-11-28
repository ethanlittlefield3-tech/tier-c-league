import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { SEASON, asJob, assertFails, assertSucceeds, auditEntry, dev1, dev2, league, now, seedLeague, startEmulator, stopEmulator, stranger, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

const request = `${league}/reset/request`;

/** The commish asks for the season to be reset, with its audit entry, in one save. */
function ask(db: Db, overrides: Record<string, unknown> = {}, options: { audit?: boolean; by?: string; target?: string } = {}) {
  const id = `a-reset-${Math.random()}`;
  const batch = db.batch();
  batch.set(db.doc(request), { season: SEASON, status: 'requested', requestedAt: now(), audit: id, ...overrides });
  if (options.audit !== false) batch.set(db.doc(`${league}/audit/${id}`), { ...auditEntry('season.reset', options.target ?? `seasons/${SEASON}`), by: options.by ?? 'p1' });
  return batch.commit();
}

describe('A season reset', () => {
  beforeEach(seedLeague);

  it('The commish asks for the current season to be reset, with an audit entry, at any point in it', async () => {
    await assertSucceeds(ask(dev1()));
  });

  it('Only the commish, only with an audit entry naming the season', async () => {
    await assertFails(ask(dev2(), {}, { by: 'p2' }));
    await assertFails(ask(dev1(), {}, { audit: false }));
    await assertFails(ask(dev1(), {}, { target: 'seasons/s9' }));
  });

  it("Only the league's current season, never the practice week, and nothing else in the request", async () => {
    await assertFails(ask(dev1(), { season: 's9' }, { target: 'seasons/s9' }));
    await assertFails(ask(dev1(), { season: 'practice' }, { target: 'seasons/practice' }));
    await assertFails(ask(dev1(), { status: 'running' }));
    await assertFails(ask(dev1(), { extra: true }));
  });

  it('With no season, there is nothing to reset', async () => {
    await asJob((db) => db.doc(league).update({ season: null }));
    await assertFails(ask(dev1()));
  });

  it("The commish calls it off before it starts, or clears one that failed; not once it's running, and nobody else", async () => {
    await assertSucceeds(ask(dev1()));
    await assertFails(dev2().doc(request).delete());
    await assertSucceeds(dev1().doc(request).delete());
    await assertSucceeds(ask(dev1()));
    await asJob((db) => db.doc(request).update({ status: 'running' }));
    await assertFails(dev1().doc(request).delete());
    await asJob((db) => db.doc(request).update({ status: 'failed' }));
    await assertSucceeds(dev1().doc(request).delete());
  });

  it("Nobody's phone changes a request: only the reset job moves it on", async () => {
    await assertSucceeds(ask(dev1()));
    await assertFails(dev1().doc(request).update({ status: 'running' }));
  });

  it('Everyone in the league can see it; nobody else can', async () => {
    await assertSucceeds(ask(dev1()));
    await assertSucceeds(dev2().doc(request).get());
    await assertFails(stranger().doc(request).get());
  });
});
