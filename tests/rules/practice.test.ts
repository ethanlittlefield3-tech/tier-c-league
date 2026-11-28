import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { KICKOFF, asJob, assertFails, assertSucceeds, auditEntry, dev1, dev2, league, now, season, seedLeague, startEmulator, stopEmulator, stranger, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

const MIN = 60_000;
const request = `${league}/practice/request`;

/** The commish's practice week request, with its audit entry, in one save. */
function ask(db: Db, overrides: Record<string, unknown> = {}, options: { audit?: boolean; by?: string } = {}) {
  const id = `a-practice-${Math.random()}`;
  const batch = db.batch();
  batch.set(db.doc(request), { status: 'requested', dayMinutes: 4, startsAt: new Date(Date.now() + 15 * MIN), requestedAt: now(), audit: id, ...overrides });
  if (options.audit !== false) batch.set(db.doc(`${league}/audit/${id}`), { ...auditEntry('practice.schedule', 'practice/request'), by: options.by ?? 'p1' });
  return batch.commit();
}

/** The commish ends it early, or clears it, with an audit entry. */
function change(db: Db, status: string) {
  const id = `a-practice-${status}-${Math.random()}`;
  const batch = db.batch();
  batch.update(db.doc(request), { status, audit: id });
  batch.set(db.doc(`${league}/audit/${id}`), auditEntry(`practice.${status}`, 'practice/request'));
  return batch.commit();
}

/** The season back in setup, before the draft: practice can run. */
const inSetup = (draftAt: Date | null = null) => asJob((db) => db.doc(season).update({ status: 'setup', draftAt }));

describe('The practice week', () => {
  beforeEach(seedLeague);

  it('Before the season, the commish asks for a practice week: how long each day lasts and when it starts, with an audit entry', async () => {
    await inSetup();
    await assertSucceeds(ask(dev1()));
  });

  it('Only the commish, only with an audit entry', async () => {
    await inSetup();
    await assertFails(ask(dev2(), {}, { by: 'p2' }));
    await assertFails(ask(dev1(), {}, { audit: false }));
  });

  it('Each day lasts 2 to 30 whole minutes, and it starts ahead, within 2 hours', async () => {
    await inSetup();
    await assertFails(ask(dev1(), { dayMinutes: 1 }));
    await assertFails(ask(dev1(), { dayMinutes: 31 }));
    await assertFails(ask(dev1(), { dayMinutes: 4.5 }));
    await assertFails(ask(dev1(), { startsAt: new Date(Date.now() - MIN) }));
    await assertFails(ask(dev1(), { startsAt: new Date(Date.now() + 150 * MIN) }));
    await assertFails(ask(dev1(), { status: 'live' }));
    await assertFails(ask(dev1(), { extra: true }));
  });

  it("Not once the season has started, and not during the draft", async () => {
    // The tests' season is in its second week.
    await assertFails(ask(dev1()));
    await asJob((db) => db.doc(season).update({ status: 'draft' }));
    await assertFails(ask(dev1()));
  });

  it('After the draft, only if it is over before kickoff; before the draft, only if it is over before the draft', async () => {
    await asJob((db) => db.doc(`${season}/calendar/${KICKOFF}`).update({ start: new Date(Date.now() + 30 * MIN) }));
    await assertFails(ask(dev1()));
    await asJob((db) => db.doc(`${season}/calendar/${KICKOFF}`).update({ start: new Date(Date.now() + 180 * MIN) }));
    await assertSucceeds(ask(dev1()));
    await asJob((db) => db.doc(request).delete());
    await inSetup(new Date(Date.now() + 30 * MIN));
    await assertFails(ask(dev1()));
    await inSetup(new Date(Date.now() + 180 * MIN));
    await assertSucceeds(ask(dev1()));
  });

  it('With no season set up yet, it can run', async () => {
    await asJob((db) => db.doc(league).update({ season: null }));
    await assertSucceeds(ask(dev1()));
  });

  it('Not while another practice week is on', async () => {
    await inSetup();
    await asJob((db) => db.doc(league).update({ practice: { season: 'practice', status: 'live' } }));
    await assertFails(ask(dev1()));
  });

  it('The commish calls it off before it starts, ends it early while it runs, or clears it once its results are up, each with an audit entry', async () => {
    await inSetup();
    await assertSucceeds(ask(dev1()));
    await assertFails(dev2().doc(request).delete());
    await assertSucceeds(dev1().doc(request).delete());

    await asJob((db) => db.doc(request).set({ status: 'live', dayMinutes: 4, startsAt: new Date() }));
    await assertFails(change(dev1(), 'clearing'));
    await assertFails(dev1().doc(request).delete());
    await assertSucceeds(change(dev1(), 'ending'));

    await asJob((db) => db.doc(request).set({ status: 'done', dayMinutes: 4, startsAt: new Date() }));
    await assertFails(change(dev1(), 'ending'));
    await assertSucceeds(change(dev1(), 'clearing'));
  });

  it("A practice week that couldn't run can be dismissed", async () => {
    await asJob((db) => db.doc(request).set({ status: 'failed', reason: 'It would run into kickoff.', dayMinutes: 4, startsAt: new Date() }));
    await assertSucceeds(dev1().doc(request).delete());
  });

  it("Everyone in the league can see it; nobody else can", async () => {
    await inSetup();
    await assertSucceeds(ask(dev1()));
    await assertSucceeds(dev2().doc(request).get());
    await assertFails(stranger().doc(request).get());
  });

  it('No phone makes a season called "practice", or marks any season as practice or gives it a fast clock', async () => {
    await asJob((db) => db.doc(season).update({ status: 'finished' }));
    const settings = { name: 'Season 2', status: 'setup', regularWeeks: 6, playoffs: 'oneWeek', playoffSize: 4, par: 3, groupWeeks: [], timeZone: 'America/New_York', kickoff: '2027-06-07', draftAt: null, joinMidSeason: false, holidayEvents: true, updatedAt: now() };
    const create = (id: string) => {
      const audit = `a-season-${id}`;
      const db = dev1();
      const batch = db.batch();
      batch.set(db.doc(`${league}/seasons/${id}`), { ...settings, audit });
      batch.set(db.doc(`${league}/audit/${audit}`), auditEntry('season.settings', `seasons/${id}`));
      return batch.commit();
    };
    await assertFails(create('practice'));
    await assertSucceeds(create('s2'));
    const mark = (field: Record<string, unknown>) => {
      const audit = `a-mark-${Math.random()}`;
      const db = dev1();
      const batch = db.batch();
      batch.update(db.doc(`${league}/seasons/s2`), { ...field, audit });
      batch.set(db.doc(`${league}/audit/${audit}`), auditEntry('season.settings', 'seasons/s2'));
      return batch.commit();
    };
    await assertFails(mark({ practice: true }));
    await assertFails(mark({ fast: { startsAt: new Date(), dayMinutes: 4 } }));
  });

  it("During a practice week, trash talk is marked as practice, so it clears with it; a brag isn't, and nothing is marked practice when no practice week is on", async () => {
    const post = (id: string, kind: string, to: string | null) => dev2().doc(`${league}/wall/${id}`).set({ by: 'p2', kind, text: 'Calculated.', to, at: now(), deleted: false, practice: true });
    await assertFails(post('t0', 'taunt', 'p1'));
    await asJob((db) => db.doc(league).update({ practice: { season: 'practice', status: 'live' } }));
    await assertSucceeds(post('t1', 'taunt', 'p1'));
    await assertSucceeds(post('q1', 'quick', 'p1'));
    await assertFails(post('b1', 'brag', null));
  });
});
