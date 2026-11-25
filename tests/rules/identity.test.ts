import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  CODE,
  KEYS,
  NEW_KEY,
  asJob,
  assertFails,
  assertSucceeds,
  dev1,
  dev2,
  dev3,
  device,
  league,
  now,
  season,
  seedLeague,
  startEmulator,
  stopEmulator,
  stranger,
  visitor,
  type Db,
} from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

/** Everything a new player's phone writes when it joins, as one batch. */
function join(db: Db, uid: string, player: string, key: string, code = CODE) {
  const batch = db.batch();
  batch.update(db.doc(league), { [`members.${player}`]: true });
  batch.set(db.doc(`${league}/players/${player}`), { displayName: 'Riley', joinedAt: now() });
  batch.set(db.doc(`${league}/keys/${player}`), { key, rotatedAt: now() });
  batch.set(db.doc(`${league}/claims/${uid}`), { player, key, code, at: now() });
  return batch.commit();
}

/** A new phone taking over a profile: it proves the old key and sets a new one. */
function recover(db: Db, uid: string, player: string, oldKey: string, newKey: string) {
  const batch = db.batch();
  batch.update(db.doc(`${league}/keys/${player}`), { key: newKey, prev: oldKey, rotatedAt: now() });
  batch.set(db.doc(`${league}/claims/${uid}`), { player, key: newKey, at: now() });
  return batch.commit();
}

describe('Who can read the league', () => {
  it('A member can read the league, its players, the season, the calendar and the logs', async () => {
    const db = dev2();
    await assertSucceeds(db.doc(league).get());
    await assertSucceeds(db.collection(`${league}/players`).get());
    await assertSucceeds(db.doc(season).get());
    await assertSucceeds(db.collection(`${season}/calendar`).get());
    await assertSucceeds(db.collection(`${season}/days`).get());
    await assertSucceeds(db.collection(`${season}/kit`).get());
    await assertSucceeds(db.collection(`${league}/audit`).get());
  });

  it('A signed-in stranger with no claim can read nothing in the league', async () => {
    const db = stranger();
    await assertFails(db.doc(league).get());
    await assertFails(db.collection(`${league}/players`).get());
    await assertFails(db.doc(season).get());
    await assertFails(db.collection(`${season}/days`).get());
  });

  it('A visitor who is not signed in can read nothing at all', async () => {
    const db = visitor();
    await assertFails(db.doc(league).get());
    await assertFails(db.doc(`codes/${CODE}`).get());
  });

  it('Nobody can list leagues or league codes, so a code cannot be found by browsing', async () => {
    await assertFails(dev1().collection('leagues').get());
    await assertFails(dev1().collection('codes').get());
    await assertFails(stranger().collection('codes').get());
  });

  it('Anyone signed in who knows the code can look it up', async () => {
    await assertSucceeds(stranger().doc(`codes/${CODE}`).get());
  });
});

describe('Joining', () => {
  it('Joining with the league code creates the player, their key and the device claim together', async () => {
    await assertSucceeds(join(stranger(), 'dev9', 'p9', NEW_KEY));
    // The new device is a member straight away.
    await assertSucceeds(stranger().doc(league).get());
  });

  it('Joining needs the right league code', async () => {
    await assertFails(join(stranger(), 'dev9', 'p9', NEW_KEY, 'WRNGCDE2'));
  });

  it('A recovery key in the wrong shape is refused', async () => {
    await assertFails(join(stranger(), 'dev9', 'p9', 'TCL-0000-1111'));
    await assertFails(join(stranger(), 'dev9', 'p9', 'password'));
  });

  it('Joining is refused while the commish has the league closed', async () => {
    await asJob((db) => db.doc(league).update({ joining: 'closed' }));
    await assertFails(join(stranger(), 'dev9', 'p9', NEW_KEY));
  });

  it('A 13th player cannot join', async () => {
    const twelve = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`p${i + 1}`, true]));
    await asJob((db) => db.doc(league).update({ members: twelve }));
    await assertFails(join(stranger(), 'dev9', 'p13', NEW_KEY));
  });

  it('A new player cannot take over a profile that already exists', async () => {
    await assertFails(join(stranger(), 'dev9', 'p2', NEW_KEY));
  });

  it('Joining cannot slip in any other change to the league, like making yourself commish', async () => {
    const db = stranger();
    const batch = db.batch();
    batch.update(db.doc(league), { 'members.p9': true, commish: 'p9' });
    batch.set(db.doc(`${league}/players/p9`), { displayName: 'Riley', joinedAt: now() });
    batch.set(db.doc(`${league}/keys/p9`), { key: NEW_KEY, rotatedAt: now() });
    batch.set(db.doc(`${league}/claims/dev9`), { player: 'p9', key: NEW_KEY, code: CODE, at: now() });
    await assertFails(batch.commit());
  });

  it('Nobody can mint themselves a key and a claim without joining through the league code', async () => {
    const db = stranger();
    const batch = db.batch();
    batch.set(db.doc(`${league}/keys/p9`), { key: NEW_KEY, rotatedAt: now() });
    batch.set(db.doc(`${league}/claims/dev9`), { player: 'p9', key: NEW_KEY, at: now() });
    await assertFails(batch.commit());
    await assertFails(db.doc(league).get());
  });

  it('Leagues cannot be created or deleted from a phone', async () => {
    await assertFails(stranger().doc('leagues/L2').set({ name: 'Mine', commish: 'p9', members: {} }));
    await assertFails(dev1().doc(league).delete());
  });
});

describe('Recovery keys', () => {
  it('A player can read their own key', async () => {
    await assertSucceeds(dev2().doc(`${league}/keys/p2`).get());
  });

  it("A player cannot read another player's key", async () => {
    await assertFails(dev2().doc(`${league}/keys/p3`).get());
    await assertFails(dev2().collection(`${league}/keys`).get());
  });

  it('The commish can read every key', async () => {
    await assertSucceeds(dev1().doc(`${league}/keys/p2`).get());
    await assertSucceeds(dev1().collection(`${league}/keys`).get());
  });

  it("A device cannot claim to be a player without that player's current key", async () => {
    const db = stranger();
    await assertFails(db.doc(`${league}/claims/dev9`).set({ player: 'p2', key: NEW_KEY, at: now() }));
    await assertFails(db.doc(`${league}/claims/dev9`).set({ player: 'p2', key: KEYS.p3, at: now() }));
  });

  it('A device cannot write a claim for some other device', async () => {
    await assertFails(dev2().doc(`${league}/claims/dev3`).set({ player: 'p2', key: KEYS.p2, at: now() }));
  });

  it('Recovering on a new phone works with the current key', async () => {
    await assertSucceeds(recover(device('newPhone'), 'newPhone', 'p2', KEYS.p2, NEW_KEY));
    await assertSucceeds(device('newPhone').doc(league).get());
  });

  it('After a recovery the key has changed, and every other device is signed out at once', async () => {
    await assertSucceeds(dev2().doc(league).get());
    await recover(device('newPhone'), 'newPhone', 'p2', KEYS.p2, NEW_KEY);
    await assertFails(dev2().doc(league).get());
    await assertFails(dev2().doc(`${league}/keys/p2`).get());
    // The old key is dead: it cannot be used to get back in.
    await assertFails(recover(dev2(), 'dev2', 'p2', KEYS.p2, 'TCL-EEEE-EEEE'));
  });

  it('A wrong guess at the old key changes nothing', async () => {
    await assertFails(recover(device('newPhone'), 'newPhone', 'p2', 'TCL-ZZZZ-ZZZZ', NEW_KEY));
    await assertSucceeds(dev2().doc(league).get());
  });

  it('A key cannot be rotated to something that is not a key', async () => {
    await assertFails(recover(device('newPhone'), 'newPhone', 'p2', KEYS.p2, 'hunter2'));
  });

  it("One player cannot rotate another player's key", async () => {
    await assertFails(dev3().doc(`${league}/keys/p2`).update({ key: NEW_KEY, prev: KEYS.p3, rotatedAt: now() }));
  });

  it("A device's claim can be read by that device and by the commish, and by no other player", async () => {
    await assertSucceeds(dev2().doc(`${league}/claims/dev2`).get());
    await assertSucceeds(dev1().doc(`${league}/claims/dev2`).get());
    await assertFails(dev3().doc(`${league}/claims/dev2`).get());
  });

  it('A device can sign itself out', async () => {
    await assertSucceeds(dev2().doc(`${league}/claims/dev2`).delete());
    await assertFails(dev2().doc(league).get());
  });
});

describe('Profiles and devices', () => {
  it('A player can change their own display name', async () => {
    await assertSucceeds(dev2().doc(`${league}/players/p2`).update({ displayName: 'Maya B' }));
  });

  it("A player cannot change someone else's profile", async () => {
    await assertFails(dev2().doc(`${league}/players/p3`).update({ displayName: 'Loser' }));
  });

  it('A player cannot give themselves badges, ranks or unlocked parts: those come from the jobs', async () => {
    await assertFails(dev2().doc(`${league}/players/p2`).update({ badges: { champion: true } }));
    await assertFails(dev2().doc(`${league}/players/p2`).update({ unlocked: { paint: ['galaxy'] } }));
  });

  it('A display name must be 1 to 24 characters', async () => {
    await assertFails(dev2().doc(`${league}/players/p2`).update({ displayName: '' }));
    await assertFails(dev2().doc(`${league}/players/p2`).update({ displayName: 'x'.repeat(25) }));
  });

  it("A device's push settings can be read and written by that device only", async () => {
    await assertSucceeds(dev2().doc('devices/dev2').set({ token: 'abc', league: 'L1', player: 'p2', updatedAt: now() }));
    await assertSucceeds(dev2().doc('devices/dev2').get());
    await assertFails(dev3().doc('devices/dev2').get());
    await assertFails(dev1().doc('devices/dev2').get());
    await assertFails(dev3().doc('devices/dev2').set({ token: 'stolen' }));
  });
});
