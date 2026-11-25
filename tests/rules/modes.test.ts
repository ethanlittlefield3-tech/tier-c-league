import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, dev2, dev3, now, season, seedLeague, startEmulator, stopEmulator, stranger, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

const SIX = ['rumble', 'teamWeek', 'twoVTwo', 'bounty', 'dropShot', 'alley'];
const atStep = (step: string) =>
  asJob(async (db) => {
    await db.doc(season).update({ status: 'draft' });
    await db.doc(`${season}/draft/state`).set({ step, order: ['p2', 'p3', 'p1'], picks: {}, turnStartedAt: null, startedAt: new Date(), votesCloseAt: new Date(Date.now() + 86_400_000) });
  });
const rank = (db: Db, voter: string, ranking: string[], extra: Record<string, unknown> = {}) => db.doc(`${season}/votes/${voter}_modes`).set({ voter, kind: 'modes', ranking, at: now(), ...extra });

describe('The group-play vote', () => {
  it('At the group-play vote, each player ranks the six modes in their own name, and can change it', async () => {
    await atStep('modes');
    await assertSucceeds(rank(dev2(), 'p2', SIX));
    await assertSucceeds(rank(dev2(), 'p2', [...SIX].reverse()));
    await assertFails(rank(dev3(), 'p2', SIX));
  });

  it('A ranking names each of the six modes exactly once, is stamped with the real time, and says nothing else', async () => {
    await atStep('modes');
    await assertFails(rank(dev2(), 'p2', SIX.slice(1)));
    await assertFails(rank(dev2(), 'p2', ['rumble', 'rumble', 'twoVTwo', 'bounty', 'dropShot', 'alley']));
    await assertFails(rank(dev2(), 'p2', [...SIX, 'alley']));
    await assertFails(rank(dev2(), 'p2', ['rumble', 'teamWeek', 'twoVTwo', 'bounty', 'dropShot', 'darts']));
    await assertFails(rank(dev2(), 'p2', SIX, { player: 'p3' }));
    await assertFails(rank(dev2(), 'p2', SIX, { at: new Date(2020, 0, 1) }));
    await assertFails(dev2().doc(`${season}/votes/p2_modez`).set({ voter: 'p2', kind: 'modes', ranking: SIX, at: now() }));
  });

  it('The vote is open only while the live draft is at its step', async () => {
    await atStep('goals');
    await assertFails(rank(dev2(), 'p2', SIX));
    await atStep('rivals');
    await assertFails(rank(dev2(), 'p2', SIX));
  });

  it("Everyone in the league can see the rankings; nobody outside it can", async () => {
    await atStep('modes');
    await assertSucceeds(rank(dev2(), 'p2', SIX));
    await assertSucceeds(dev3().doc(`${season}/votes/p2_modes`).get());
    await assertFails(stranger().doc(`${season}/votes/p2_modes`).get());
  });
});
