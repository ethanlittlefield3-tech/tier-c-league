import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { CODE, NEW_KEY, asJob, assertFails, assertSucceeds, auditEntry, dev1, dev2, device, league, now, seedLeague, startEmulator, stopEmulator, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

// dev9 is a new phone, signed in but not in the league.
const newcomer = () => device('dev9');
const request = (uid: string) => `${league}/joinRequests/${uid}`;
const ask = (db: Db, uid = 'dev9', code = CODE) => db.doc(request(uid)).set({ displayName: 'Riley', code, at: now(), approved: false });

/** Everything a new player's phone writes when it joins, as one batch. */
function join(db: Db, uid = 'dev9', player = 'p9') {
  const batch = db.batch();
  batch.update(db.doc(league), { [`members.${player}`]: true });
  batch.set(db.doc(`${league}/players/${player}`), { displayName: 'Riley', joinedAt: now() });
  batch.set(db.doc(`${league}/keys/${player}`), { key: NEW_KEY, rotatedAt: now() });
  batch.set(db.doc(`${league}/lookup/${NEW_KEY}`), { player });
  batch.set(db.doc(`${league}/claims/${uid}`), { player, key: NEW_KEY, code: CODE, at: now() });
  return batch.commit();
}

/** The commish lets someone in, or turns them away, with the audit entry in the same save. */
function decide(db: Db, uid: string, change: Record<string, unknown>, action: string, by = 'p1') {
  const batch = db.batch();
  batch.update(db.doc(request(uid)), { ...change, audit: `a-${action}-${by}` });
  batch.set(db.doc(`${league}/audit/a-${action}-${by}`), { ...auditEntry(action, `joinRequests/${uid}`), by });
  return batch.commit();
}

describe("Joining with the commish's approval", () => {
  beforeEach(async () => {
    await seedLeague();
    await asJob((db) => db.doc(league).update({ joining: 'approval' }));
  });

  it("A new player can't just join: they ask first, with the league code, under their own sign-in", async () => {
    await assertFails(join(newcomer()));
    await assertSucceeds(ask(newcomer()));
    await assertFails(ask(newcomer(), 'dev8'));
    await assertFails(ask(device('dev8'), 'dev8', 'WRONGCDE'));
  });

  it('A request starts unanswered, and carries the server time and a name of 1 to 24 characters, and nothing else', async () => {
    await assertFails(newcomer().doc(request('dev9')).set({ displayName: 'Riley', code: CODE, at: now(), approved: true }));
    await assertFails(newcomer().doc(request('dev9')).set({ displayName: '', code: CODE, at: now(), approved: false }));
    await assertFails(newcomer().doc(request('dev9')).set({ displayName: 'R'.repeat(25), code: CODE, at: now(), approved: false }));
    await assertFails(newcomer().doc(request('dev9')).set({ displayName: 'Riley', code: CODE, at: new Date(0), approved: false }));
    await assertFails(newcomer().doc(request('dev9')).set({ displayName: 'Riley', code: CODE, at: now(), approved: false, note: 'let me in' }));
    await assertSucceeds(newcomer().doc(request('dev9')).set({ displayName: 'R'.repeat(24), code: CODE, at: now(), approved: false }));
  });

  it('Only the commish lets someone in, with an audit entry; then their phone joins as usual', async () => {
    await ask(newcomer());
    await assertFails(newcomer().doc(request('dev9')).update({ approved: true }));
    await assertFails(decide(dev2(), 'dev9', { approved: true }, 'join.approve', 'p2'));
    await assertFails(dev1().doc(request('dev9')).update({ approved: true }));
    // Letting someone in changes nothing else about the request, such as the name.
    await assertFails(decide(dev1(), 'dev9', { approved: true, displayName: 'Sam' }, 'join.approve'));
    await assertSucceeds(decide(dev1(), 'dev9', { approved: true }, 'join.approve'));
    await assertSucceeds(join(newcomer()));
  });

  it('The commish can turn someone away, with an audit entry, and then they cannot join', async () => {
    await ask(newcomer());
    await assertFails(dev1().doc(request('dev9')).update({ declined: true }));
    await assertSucceeds(decide(dev1(), 'dev9', { declined: true }, 'join.decline'));
    await assertFails(join(newcomer()));
  });

  it('The player and the commish can see the request; nobody else can', async () => {
    await ask(newcomer());
    await assertSucceeds(newcomer().doc(request('dev9')).get());
    await assertSucceeds(dev1().doc(request('dev9')).get());
    await assertSucceeds(dev1().collection(`${league}/joinRequests`).get());
    await assertFails(dev2().doc(request('dev9')).get());
    await assertFails(device('dev8').doc(request('dev9')).get());
    // Only the commish sees the whole list.
    await assertFails(dev2().collection(`${league}/joinRequests`).get());
    await assertFails(newcomer().collection(`${league}/joinRequests`).get());
  });

  it('The player can take their request back; nobody else can', async () => {
    await ask(newcomer());
    await assertFails(dev2().doc(request('dev9')).delete());
    await assertFails(device('dev8').doc(request('dev9')).delete());
    await assertSucceeds(newcomer().doc(request('dev9')).delete());
  });
});

describe('Asking to join in other leagues', () => {
  beforeEach(seedLeague);

  it('An open league takes no requests: you just join', async () => {
    await assertFails(ask(newcomer()));
    await assertSucceeds(join(newcomer()));
  });

  it('A closed league takes no requests either', async () => {
    await asJob((db) => db.doc(league).update({ joining: 'closed' }));
    await assertFails(ask(newcomer()));
  });
});
