import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { BADGES, STARTER_PARTS } from '../../engine/src/index.ts';
import { asJob, assertFails, assertSucceeds, dev2, dev3, league, seedLeague, startEmulator, stopEmulator } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

const profile = `${league}/players/p2`;
const starter = { body: 'dart', paint: 'cobalt', decal: 'none', wheels: 'stock', boost: 'team', explosion: 'stock', topper: 'none' };
const setCar = (car: Record<string, unknown>) => dev2().doc(profile).update({ car });
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

  it("Nobody changes someone else's car", async () => {
    await assertFails(dev3().doc(profile).update({ car: starter }));
  });
});
