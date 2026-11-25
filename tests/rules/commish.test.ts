import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  KEYS,
  NEW_KEY,
  WED2,
  asJob,
  assertFails,
  assertSucceeds,
  auditEntry,
  dev1,
  dev2,
  league,
  now,
  season,
  seedLeague,
  startEmulator,
  stopEmulator,
  type Db,
} from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

const NEXT = `${league}/seasons/s2`;

/** Season settings as the commish's setup screen saves them. */
function settings(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Season 2',
    status: 'setup',
    regularWeeks: 6,
    playoffs: 'oneWeek',
    playoffSize: 4,
    par: 3,
    groupWeeks: [3, 5],
    timeZone: 'America/New_York',
    kickoff: '2027-03-01',
    draftAt: null,
    joinMidSeason: false,
    holidayEvents: true,
    updatedAt: now(),
    ...overrides,
  };
}

/** Save a document together with its audit entry, the only way a commish change is accepted. */
function withAudit(db: Db, path: string, write: 'set' | 'update', data: Record<string, unknown>, auditId: string, action: string, target: string, by = 'p1') {
  const batch = db.batch();
  const ref = db.doc(path);
  if (write === 'set') batch.set(ref, { ...data, audit: auditId });
  else batch.update(ref, { ...data, audit: auditId });
  batch.set(db.doc(`${league}/audit/${auditId}`), { ...auditEntry(action, target), by });
  return batch.commit();
}

const createSeason = (db: Db, overrides: Record<string, unknown> = {}, auditId = 'a1') =>
  withAudit(db, NEXT, 'set', settings(overrides), auditId, 'season.settings', 'seasons/s2');

describe('Season settings', () => {
  it('The commish can set up a season, and it lands in the audit log', async () => {
    await assertSucceeds(createSeason(dev1()));
    const entry = await dev2().doc(`${league}/audit/a1`).get();
    expect(entry.data()).toMatchObject({ by: 'p1', action: 'season.settings', target: 'seasons/s2' });
  });

  it('A player who is not the commish cannot change settings', async () => {
    await assertFails(createSeason(dev2()));
    await assertFails(dev2().doc(NEXT).set(settings()));
    await asJob((db) => db.doc(NEXT).set({ ...settings(), updatedAt: new Date() }));
    await assertFails(withAudit(dev2(), NEXT, 'update', { par: 6, updatedAt: now() }, 'a2', 'season.settings', 'seasons/s2', 'p2'));
    await assertFails(dev2().doc(NEXT).update({ par: 6 }));
  });

  it('The commish cannot change settings without an audit entry in the same save', async () => {
    await assertFails(dev1().doc(NEXT).set(settings()));
    await assertFails(dev1().doc(NEXT).set({ ...settings(), audit: 'a-missing' }));
    await createSeason(dev1());
    await assertFails(dev1().doc(NEXT).update({ par: 4, updatedAt: now() }));
    // Pointing at an old audit entry is not enough: each change needs its own.
    await assertFails(dev1().doc(NEXT).update({ par: 4, audit: 'a1', updatedAt: now() }));
    await assertSucceeds(withAudit(dev1(), NEXT, 'update', { par: 4, updatedAt: now() }, 'a2', 'season.settings', 'seasons/s2'));
  });

  it('An audit entry must describe the change it travels with', async () => {
    const db = dev1();
    const batch = db.batch();
    batch.set(db.doc(NEXT), { ...settings(), audit: 'a1' });
    batch.set(db.doc(`${league}/audit/a1`), auditEntry('season.settings', 'seasons/some-other-season'));
    await assertFails(batch.commit());
  });

  it('Out-of-range settings are refused', async () => {
    const tries: [string, Record<string, unknown>][] = [
      ['regular season under 3 weeks', { regularWeeks: 2 }],
      ['regular season over 12 weeks', { regularWeeks: 13 }],
      ['par under 1', { par: 0 }],
      ['par over 6', { par: 7 }],
      ['par that is not a whole number', { par: 2.5 }],
      ['a playoff length that does not exist', { playoffs: 'threeWeeks' }],
      ['a playoff size other than 2 or 4', { playoffSize: 8 }],
      ['Week 1 as a group-play week', { groupWeeks: [1, 3] }],
      ['a group-play week past Week 12', { groupWeeks: [13] }],
      ['a kickoff that is not a date', { kickoff: 'next Monday' }],
      ['an empty time zone', { timeZone: '' }],
      ['an unknown status', { status: 'finished-early' }],
    ];
    for (const [what, overrides] of tries) {
      await assertFails(createSeason(dev1(), overrides, `a-${what.length}-${Math.random().toString(36).slice(2)}`)).catch((error: unknown) => {
        throw new Error(`Expected a refusal for: ${what}`, { cause: error });
      });
    }
    // The widest allowed values are fine.
    await assertSucceeds(createSeason(dev1(), { regularWeeks: 12, par: 6, playoffs: 'none', playoffSize: 2, groupWeeks: [2, 12] }));
  });

  it('The commish cannot write fields that belong to the jobs, like the schedule clock', async () => {
    await assertFails(createSeason(dev1(), { ruleOneIssue: [new Date(0), new Date(0), new Date(0)] }));
  });

  it('Once a season is under way its core settings are locked, even for the commish', async () => {
    for (const change of [{ par: 6 }, { timeZone: 'Pacific/Kiritimati' }, { kickoff: '2027-01-11' }, { regularWeeks: 12 }, { status: 'setup' }]) {
      await assertFails(withAudit(dev1(), season, 'update', { ...change, updatedAt: now() }, `a-${Object.keys(change)[0]}`, 'season.settings', 'seasons/s1'));
    }
  });

  it('Nobody can write the calendar or the week results from a phone, the commish included', async () => {
    await assertFails(dev1().doc(`${season}/calendar/${WED2}`).update({ lock: new Date(Date.now() + 999 * 3_600_000) }));
    await assertFails(dev1().doc(`${season}/calendar/2027-06-01`).set({ date: '2027-06-01' }));
    await assertFails(dev1().doc(`${season}/weeks/w02`).update({ results: { p1: { points: 99 } } }));
    await assertFails(dev2().doc(`${season}/weeks/w02`).update({ targets: { p2: ['p3'] } }));
  });
});

describe('Docks, voids and corrections', () => {
  const adjustment = (overrides: Record<string, unknown> = {}) => ({
    player: 'p2',
    date: WED2,
    amount: -1,
    void: null,
    reason: 'Fake gym photo',
    by: 'p1',
    at: now(),
    ...overrides,
  });
  const dock = (db: Db, id: string, overrides: Record<string, unknown> = {}, by = 'p1') =>
    withAudit(db, `${season}/adjustments/${id}`, 'set', adjustment({ by, ...overrides }), `audit-${id}`, 'score.adjust', `adjustments/${id}`, by);

  it('The commish can dock a point with a reason, and it lands in the audit log', async () => {
    await assertSucceeds(dock(dev1(), 'adj1'));
    const entry = await dev2().doc(`${league}/audit/audit-adj1`).get();
    expect(entry.exists).toBe(true);
  });

  it('The commish can void a square or enter a correction the same way', async () => {
    await assertSucceeds(dock(dev1(), 'adj2', { amount: -1, void: 'body' }));
    await assertSucceeds(dock(dev1(), 'adj3', { amount: 2, reason: 'App was down, restoring 2 points' }));
  });

  it('A reason is required', async () => {
    await assertFails(dock(dev1(), 'adj4', { reason: '' }));
  });

  it('It is refused without an audit entry in the same save', async () => {
    await assertFails(dev1().doc(`${season}/adjustments/adj5`).set(adjustment()));
    await assertFails(dev1().doc(`${season}/adjustments/adj5`).set({ ...adjustment(), audit: 'nope' }));
  });

  it('A player cannot dock anyone, with or without an audit entry', async () => {
    await assertFails(dock(dev2(), 'adj6', { player: 'p1' }, 'p2'));
    await assertFails(dev2().doc(`${season}/adjustments/adj6`).set(adjustment({ player: 'p1', by: 'p2' })));
  });

  it('A dock cannot be edited or deleted afterwards: undoing one means entering a correction', async () => {
    await dock(dev1(), 'adj7');
    await assertFails(dev1().doc(`${season}/adjustments/adj7`).update({ amount: -5 }));
    await assertFails(dev1().doc(`${season}/adjustments/adj7`).delete());
  });

  it('A single adjustment is limited to 20 points either way, and must void a real square', async () => {
    await assertFails(dock(dev1(), 'adj8', { amount: -21 }));
    await assertFails(dock(dev1(), 'adj9', { amount: 21 }));
    await assertFails(dock(dev1(), 'adj10', { void: 'beers' }));
  });
});

describe('The audit log', () => {
  it('Everyone in the league can read it', async () => {
    await withAudit(dev1(), NEXT, 'set', settings(), 'a1', 'season.settings', 'seasons/s2');
    await assertSucceeds(dev2().collection(`${league}/audit`).get());
  });

  it('Entries cannot be edited or deleted, even by the commish', async () => {
    await withAudit(dev1(), NEXT, 'set', settings(), 'a1', 'season.settings', 'seasons/s2');
    await assertFails(dev1().doc(`${league}/audit/a1`).update({ reason: 'Nothing to see here' }));
    await assertFails(dev1().doc(`${league}/audit/a1`).delete());
  });

  it('A player cannot write audit entries', async () => {
    await assertFails(dev2().doc(`${league}/audit/fake`).set({ ...auditEntry('season.settings', 'seasons/s1'), by: 'p2' }));
    await assertFails(dev2().doc(`${league}/audit/fake`).set(auditEntry('season.settings', 'seasons/s1')));
  });

  it('An entry is stamped with the commish who made it and the server time, and neither can be faked', async () => {
    await assertFails(dev1().doc(`${league}/audit/x1`).set({ ...auditEntry('note', 'league'), by: 'p2' }));
    await assertFails(dev1().doc(`${league}/audit/x2`).set({ ...auditEntry('note', 'league'), at: new Date(0) }));
  });
});

describe('Commish powers over players', () => {
  it('Reissuing a key lands in the audit log and signs that player out everywhere', async () => {
    await assertSucceeds(dev2().doc(league).get());
    await assertSucceeds(withAudit(dev1(), `${league}/keys/p2`, 'update', { key: NEW_KEY, prev: KEYS.p2, rotatedAt: now() }, 'a-key', 'key.reissue', 'keys/p2'));
    await assertFails(dev2().doc(league).get());
  });

  it('The commish cannot reissue a key without an audit entry', async () => {
    await assertFails(dev1().doc(`${league}/keys/p2`).update({ key: NEW_KEY, prev: KEYS.p2, rotatedAt: now() }));
  });

  it('Handing over the commish role lands in the audit log', async () => {
    await assertSucceeds(withAudit(dev1(), league, 'update', { commish: 'p2', coCommish: 'p1' }, 'a-role', 'league.settings', 'league'));
  });

  it('A player cannot make themselves commish', async () => {
    await assertFails(dev2().doc(league).update({ commish: 'p2' }));
    await assertFails(dev2().doc(league).update({ coCommish: 'p2' }));
    await assertFails(withAudit(dev2(), league, 'update', { commish: 'p2' }, 'a-coup', 'league.settings', 'league', 'p2'));
  });

  it('The commish can close the league to new players, and remove a player, with an audit entry each time', async () => {
    await assertSucceeds(withAudit(dev1(), league, 'update', { joining: 'closed' }, 'a-close', 'league.settings', 'league'));
    await assertFails(dev1().doc(league).update({ joining: 'open' }));
    await assertSucceeds(withAudit(dev1(), league, 'update', { members: { p1: true, p2: true } }, 'a-remove', 'league.settings', 'league'));
  });
});
