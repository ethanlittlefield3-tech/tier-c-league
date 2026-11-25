import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

/** Everything a new player's phone writes when it joins, as one batch. `skip` leaves one piece out. */
function join(db: Db, uid: string, player: string, key: string, code = CODE, skip: 'nothing' | 'lookup' = 'nothing') {
  const batch = db.batch();
  batch.update(db.doc(league), { [`members.${player}`]: true });
  batch.set(db.doc(`${league}/players/${player}`), { displayName: 'Riley', joinedAt: now() });
  batch.set(db.doc(`${league}/keys/${player}`), { key, rotatedAt: now() });
  if (skip !== 'lookup') batch.set(db.doc(`${league}/lookup/${key}`), { player });
  batch.set(db.doc(`${league}/claims/${uid}`), { player, key, code, at: now() });
  return batch.commit();
}

/**
 * A new phone taking over a profile: it proves the old key, sets a new one, and
 * files the new key in place of the old. `skip` leaves one piece out.
 */
function recover(db: Db, uid: string, player: string, oldKey: string, newKey: string, skip: 'nothing' | 'unfile' | 'file' = 'nothing') {
  const batch = db.batch();
  batch.update(db.doc(`${league}/keys/${player}`), { key: newKey, prev: oldKey, rotatedAt: now() });
  if (skip !== 'unfile') batch.delete(db.doc(`${league}/lookup/${oldKey}`));
  if (skip !== 'file') batch.set(db.doc(`${league}/lookup/${newKey}`), { player });
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
    batch.set(db.doc(`${league}/lookup/${NEW_KEY}`), { player: 'p9' });
    batch.set(db.doc(`${league}/claims/dev9`), { player: 'p9', key: NEW_KEY, code: CODE, at: now() });
    await assertFails(batch.commit());
  });

  it('Nobody can mint themselves a key and a claim without joining through the league code', async () => {
    const db = stranger();
    const batch = db.batch();
    batch.set(db.doc(`${league}/keys/p9`), { key: NEW_KEY, rotatedAt: now() });
    batch.set(db.doc(`${league}/lookup/${NEW_KEY}`), { player: 'p9' });
    batch.set(db.doc(`${league}/claims/dev9`), { player: 'p9', key: NEW_KEY, at: now() });
    await assertFails(batch.commit());
    await assertFails(db.doc(league).get());
  });

  it('Leagues cannot be created or deleted from a phone', async () => {
    await assertFails(stranger().doc('leagues/L2').set({ name: 'Mine', commish: 'p9', members: {} }));
    await assertFails(dev1().doc(league).delete());
  });
});

describe('Finding a profile from its recovery key', () => {
  const lookup = (key: string) => `${league}/lookup/${key}`;

  it('A new phone that knows a recovery key can find which player it belongs to', async () => {
    const found = await assertSucceeds(stranger().doc(lookup(KEYS.p2)).get());
    expect(found.data()).toEqual({ player: 'p2' });
  });

  it('A key nobody holds finds nothing', async () => {
    const found = await assertSucceeds(stranger().doc(lookup(NEW_KEY)).get());
    expect(found.exists).toBe(false);
  });

  it('A visitor who is not signed in cannot look a key up', async () => {
    await assertFails(visitor().doc(lookup(KEYS.p2)).get());
  });

  it('Nobody can list the keys on file, not even the commish, so a key cannot be found by browsing', async () => {
    await assertFails(stranger().collection(`${league}/lookup`).get());
    await assertFails(dev2().collection(`${league}/lookup`).get());
    await assertFails(dev1().collection(`${league}/lookup`).get());
  });

  it('Joining has to file the new key, so the player can always recover later', async () => {
    await assertFails(join(stranger(), 'dev9', 'p9', NEW_KEY, CODE, 'lookup'));
  });

  it('An entry holds the player and nothing else', async () => {
    const db = stranger();
    const batch = db.batch();
    batch.update(db.doc(league), { 'members.p9': true });
    batch.set(db.doc(`${league}/players/p9`), { displayName: 'Riley', joinedAt: now() });
    batch.set(db.doc(`${league}/keys/p9`), { key: NEW_KEY, rotatedAt: now() });
    batch.set(db.doc(lookup(NEW_KEY)), { player: 'p9', note: 'anything else' });
    batch.set(db.doc(`${league}/claims/dev9`), { player: 'p9', key: NEW_KEY, code: CODE, at: now() });
    await assertFails(batch.commit());
  });

  it('A key cannot be filed under a different player', async () => {
    // Not while joining...
    const db = stranger();
    const batch = db.batch();
    batch.update(db.doc(league), { 'members.p9': true });
    batch.set(db.doc(`${league}/players/p9`), { displayName: 'Riley', joinedAt: now() });
    batch.set(db.doc(`${league}/keys/p9`), { key: NEW_KEY, rotatedAt: now() });
    batch.set(db.doc(lookup(NEW_KEY)), { player: 'p2' });
    batch.set(db.doc(`${league}/claims/dev9`), { player: 'p9', key: NEW_KEY, code: CODE, at: now() });
    await assertFails(batch.commit());
    // ...and not on its own, for a made-up key or for a real one.
    await assertFails(stranger().doc(lookup(NEW_KEY)).set({ player: 'p2' }));
    await assertFails(dev3().doc(lookup(KEYS.p2)).set({ player: 'p3' }));
    await assertFails(dev3().doc(lookup(KEYS.p2)).update({ player: 'p3' }));
  });

  it('Recovery files the new key and takes the old one off file', async () => {
    await recover(device('newPhone'), 'newPhone', 'p2', KEYS.p2, NEW_KEY);
    expect((await stranger().doc(lookup(NEW_KEY)).get()).data()).toEqual({ player: 'p2' });
    expect((await stranger().doc(lookup(KEYS.p2)).get()).exists).toBe(false);
  });

  it('A recovery that leaves the old key on file is refused', async () => {
    await assertFails(recover(device('newPhone'), 'newPhone', 'p2', KEYS.p2, NEW_KEY, 'unfile'));
  });

  it('A recovery that does not file the new key is refused', async () => {
    await assertFails(recover(device('newPhone'), 'newPhone', 'p2', KEYS.p2, NEW_KEY, 'file'));
  });

  it('Nobody can take a current key off file, which would stop that player ever recovering', async () => {
    await assertFails(dev3().doc(lookup(KEYS.p2)).delete());
    await assertFails(stranger().doc(lookup(KEYS.p2)).delete());
    await assertFails(dev2().doc(lookup(KEYS.p2)).delete());
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
    await assertFails(recover(dev3(), 'dev3', 'p2', KEYS.p3, NEW_KEY));
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
    await assertSucceeds(dev2().doc(`${league}/players/p2`).update({ displayName: 'x'.repeat(24) }));
  });

  it('An accented letter counts as one character and an emoji as two', async () => {
    await assertSucceeds(dev2().doc(`${league}/players/p2`).update({ displayName: '\u00e9'.repeat(24) }));
    await assertFails(dev2().doc(`${league}/players/p2`).update({ displayName: '\u00e9'.repeat(25) }));
    await assertSucceeds(dev2().doc(`${league}/players/p2`).update({ displayName: '\u{1F525}'.repeat(12) }));
    await assertFails(dev2().doc(`${league}/players/p2`).update({ displayName: '\u{1F525}'.repeat(13) }));
  });

  it("A device's push settings can be read and written by that device only", async () => {
    await assertSucceeds(dev2().doc('devices/dev2').set(alerts('p2')));
    await assertSucceeds(dev2().doc('devices/dev2').get());
    await assertFails(dev3().doc('devices/dev2').get());
    await assertFails(dev1().doc('devices/dev2').get());
    await assertFails(dev3().doc('devices/dev2').set({ ...alerts('p3'), token: 'stolen' }));
    // Nobody lists everyone's devices.
    await assertFails(dev2().collection('devices').get());
  });

  it("A device signs up for alerts only as the player its claim holds, so alerts can't follow someone else", async () => {
    await assertFails(dev2().doc('devices/dev2').set(alerts('p3')));
    await assertFails(dev2().doc('devices/dev2').set({ ...alerts('p2'), league: 'L2' }));
    await assertFails(stranger().doc('devices/dev9').set(alerts('p2')));
  });

  it('Alert settings hold a token, the platform, the 7 categories on or off, and quiet hours from 0 to 23, saved at the server time', async () => {
    await assertFails(dev2().doc('devices/dev2').set({ ...alerts('p2'), token: '' }));
    await assertFails(dev2().doc('devices/dev2').set({ ...alerts('p2'), platform: 'fridge' }));
    await assertFails(dev2().doc('devices/dev2').set({ ...alerts('p2'), settings: { ...alerts('p2').settings, everything: true } }));
    await assertFails(dev2().doc('devices/dev2').set({ ...alerts('p2'), settings: { ...alerts('p2').settings, daily: 'yes' } }));
    await assertFails(dev2().doc('devices/dev2').set({ ...alerts('p2'), quiet: { start: 24, end: 8 } }));
    await assertFails(dev2().doc('devices/dev2').set({ ...alerts('p2'), quiet: { start: 23, end: 8.5 } }));
    await assertFails(dev2().doc('devices/dev2').set({ ...alerts('p2'), quiet: { start: 23, end: 8, weekends: true } }));
    await assertFails(dev2().doc('devices/dev2').set({ ...alerts('p2'), updatedAt: new Date(0) }));
    await assertFails(dev2().doc('devices/dev2').set({ ...alerts('p2'), note: 'extra' }));
    const { quiet: _quiet, ...noQuiet } = alerts('p2');
    await assertFails(dev2().doc('devices/dev2').set(noQuiet));
  });

  it('A device can turn its alerts off by deleting its settings; nobody else can', async () => {
    await dev2().doc('devices/dev2').set(alerts('p2'));
    await assertFails(dev3().doc('devices/dev2').delete());
    await assertSucceeds(dev2().doc('devices/dev2').delete());
  });

  it('A phone that was signed out can no longer save alerts for that player', async () => {
    await asJob((db) => db.doc(`${league}/keys/p2`).update({ key: 'TCL-EEEE-EEEE' }));
    await assertFails(dev2().doc('devices/dev2').set(alerts('p2')));
  });
});

/** A device's alert settings as the app saves them. */
function alerts(player: string) {
  return {
    token: 'push-token-1',
    platform: 'ios',
    league: 'L1',
    player,
    settings: { daily: true, matchup: true, powerups: false, social: true, receipts: true, progress: true, league: true },
    quiet: { start: 23, end: 8 },
    updatedAt: now(),
  };
}
