import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { BADGES, STARTER_PARTS } from '../../engine/src/index.ts';
import { CODE, NEW_KEY, asJob, assertFails, assertSucceeds, dev2, dev3, league, now, seedLeague, startEmulator, stopEmulator, stranger } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

const profile = `${league}/players/p2`;
const starter = { body: 'dart', paint: 'cobalt', decal: 'none', wheels: 'stock', boost: 'team', explosion: 'stock', topper: 'none' };
const setCar = (car: Record<string, unknown>) => dev2().doc(profile).update({ car });
/** A new player joins in this car, the way the join screen saves it. */
function joinIn(car: Record<string, unknown>) {
  const db = stranger();
  const batch = db.batch();
  batch.update(db.doc(league), { 'members.p9': true });
  batch.set(db.doc(`${league}/players/p9`), { displayName: 'Riley', car, joinedAt: now() });
  batch.set(db.doc(`${league}/keys/p9`), { key: NEW_KEY, rotatedAt: now() });
  batch.set(db.doc(`${league}/lookup/${NEW_KEY}`), { player: 'p9' });
  batch.set(db.doc(`${league}/claims/dev9`), { player: 'p9', key: NEW_KEY, code: CODE, at: now() });
  return batch.commit();
}
const giveBadges = (badges: string[]) => asJob((db) => db.doc(profile).update({ badges: Object.fromEntries(badges.map((badge) => [badge, { at: new Date(), season: 's1' }])) }));

describe('The Garage', () => {
  it('A player puts any starter part on their car: 3 bodies, 15 paints, and the rest of the starter kit', async () => {
    for (const part of STARTER_PARTS) await assertSucceeds(setCar({ ...starter, [part.slot]: part.id }));
  });

  it('A part a badge unlocks goes on only once that badge is earned, for every part in the catalog', async () => {
    for (const badge of BADGES) {
      for (const part of badge.unlocks) await assertFails(setCar({ ...starter, [part.slot]: part.id }));
    }
    await giveBadges(BADGES.map((badge) => badge.id));
    for (const badge of BADGES) {
      for (const part of badge.unlocks) await assertSucceeds(setCar({ ...starter, [part.slot]: part.id }));
    }
  });

  it("A part from another slot, a made-up part or a missing slot is refused", async () => {
    await assertFails(setCar({ ...starter, paint: 'dart' }));
    await assertFails(setCar({ ...starter, wheels: 'rocket' }));
    const { topper: _topper, ...noTopper } = starter;
    await assertFails(setCar(noTopper));
    await assertFails(setCar({ ...starter, horn: 'loud' }));
  });

  it('A new player joins in a starter car they picked, but not in a part a badge unlocks', async () => {
    await assertFails(joinIn({ ...starter, paint: 'chrome' }));
    await assertFails(joinIn({ ...starter, topper: 'trophy' }));
    await assertSucceeds(joinIn({ ...starter, body: 'bruiser', paint: 'racingRed' }));
  });

  it('The accent, finish, trail style and backdrop are optional, for a car saved before they existed', async () => {
    await assertSucceeds(setCar(starter));
    await assertSucceeds(setCar({ ...starter, paint2: 'racingRed', finish: 'pearl', trail: 'rings', backdrop: 'tunnel' }));
    await assertFails(setCar({ ...starter, paint2: 'galaxy' }));
    await assertFails(setCar({ ...starter, backdrop: 'moon' }));
  });

  it('The rank decal goes on once a player has a rank', async () => {
    await assertFails(setCar({ ...starter, decal: 'rank' }));
    await asJob((db) => db.doc(profile).update({ rank: 'gold' }));
    await assertSucceeds(setCar({ ...starter, decal: 'rank' }));
  });

  it("A season decal goes on only for a season the player finished, with the year it ended", async () => {
    await assertFails(setCar({ ...starter, decal: 'season-s1-2027' }));
    await asJob((db) => db.doc(profile).update({ seasons: { s1: 2027 } }));
    await assertSucceeds(setCar({ ...starter, decal: 'season-s1-2027' }));
    await assertFails(setCar({ ...starter, decal: 'season-s1-2028' }));
    await assertFails(setCar({ ...starter, decal: 'season-s2-2027' }));
  });

  it("A player can't give themselves a rank or a season", async () => {
    await assertFails(dev2().doc(profile).update({ rank: 'grandChamp' }));
    await assertFails(dev2().doc(profile).update({ seasons: { s1: 2027 } }));
  });

  it("Nobody changes someone else's car", async () => {
    await assertFails(dev3().doc(profile).update({ car: starter }));
  });
});
