import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import firebase from 'firebase/compat/app';
import { asJob, assertFails, assertSucceeds, dev1, dev2, dev3, now, season, seedLeague, startEmulator, stopEmulator, stranger } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

const HOUR = 3_600_000;
const inHours = (hours: number) => firebase.firestore.Timestamp.fromMillis(Date.now() + hours * HOUR);
const DRAW = 'w01_p2_1';
const sealed = (id: string) => `${season}/sealed/${id}`;
const spin = (id: string) => `${season}/spins/${id}`;
const spinOf = (player: string, period = 'w01') => ({ player, period, at: now(), proofAt: null });

/** Week 1 is final, and Maya (p2) spins: her draw is sealed. */
async function drawn() {
  await seedLeague();
  await asJob(async (db) => {
    await db.doc(`${season}/weeks/w01`).set({
      week: 1,
      status: 'final',
      awards: { mvp: ['p1'], bust: ['p3'], wheel: ['p2'] },
      wheel: { [DRAW]: { id: DRAW, player: 'p2', n: 1, pool: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], drawnAt: inHours(-2), dueAt: inHours(100) } },
    });
    await db.doc(sealed(`wheel_${DRAW}`)).set({ kind: 'wheel', draw: DRAW, slice: 3, dare: 'd' });
    // A tiebreak coin, as the weekly job seals it.
    await db.doc(sealed('coin_p1')).set({ kind: 'coin', player: 'p1', value: 0.5, revealAt: new Date(Date.UTC(2100, 0, 1)) });
  });
}

describe('The Wheel of Shame', () => {
  beforeEach(drawn);

  it('A draw stays sealed until its spinner spins, even from the spinner and the commish', async () => {
    await assertFails(dev2().doc(sealed(`wheel_${DRAW}`)).get());
    await assertFails(dev1().doc(sealed(`wheel_${DRAW}`)).get());
  });

  it('The spinner taps Spin once, at the server time, and everyone in the league sees the result', async () => {
    await assertSucceeds(dev2().doc(spin(DRAW)).set(spinOf('p2')));
    await assertSucceeds(dev3().doc(sealed(`wheel_${DRAW}`)).get());
    await assertSucceeds(dev2().doc(sealed(`wheel_${DRAW}`)).get());
    await assertFails(stranger().doc(sealed(`wheel_${DRAW}`)).get());
    await assertFails(dev2().doc(spin(DRAW)).set(spinOf('p2')));
  });

  it('Nobody else can spin for them', async () => {
    await assertFails(dev3().doc(spin(DRAW)).set(spinOf('p2')));
    await assertFails(dev3().doc(spin(DRAW)).set(spinOf('p3')));
    await assertFails(dev1().doc(spin(DRAW)).set(spinOf('p2')));
  });

  it('A spin needs a draw, at the right week, and the server time, and carries nothing else', async () => {
    await assertFails(dev2().doc(spin('w01_p2_2')).set(spinOf('p2')));
    await assertFails(dev2().doc(spin(DRAW)).set(spinOf('p2', 'w02')));
    await assertFails(dev2().doc(spin(DRAW)).set({ ...spinOf('p2'), at: inHours(-1) }));
    await assertFails(dev2().doc(spin(DRAW)).set({ ...spinOf('p2'), proofAt: now() }));
    await assertFails(dev2().doc(spin(DRAW)).set({ ...spinOf('p2'), dare: 'an easy one' }));
  });

  it('Tiebreak coins stay sealed from everyone, their own player included', async () => {
    await assertFails(dev1().doc(sealed('coin_p1')).get());
    await assertFails(dev2().doc(sealed('coin_p1')).get());
  });

  it('Everyone in the league can see the spins; nobody outside can', async () => {
    await dev2().doc(spin(DRAW)).set(spinOf('p2'));
    await assertSucceeds(dev3().doc(spin(DRAW)).get());
    await assertFails(stranger().doc(spin(DRAW)).get());
  });
});

const proofPath = (id: string) => `${season}/dareProofs/${id}`;
const PHOTO = `data:image/jpeg;base64,${'A'.repeat(2000)}`;

/** Proving a dare as the app does: the photo, and the spin marked proven, in one save. */
function proveDare(db: ReturnType<typeof dev2>, photo = PHOTO) {
  const batch = db.batch();
  batch.set(db.doc(proofPath(DRAW)), { photo, at: now() });
  batch.update(db.doc(spin(DRAW)), { proofAt: now() });
  return batch.commit();
}

describe("Proving a Wheel dare", () => {
  beforeEach(async () => {
    await drawn();
    await dev2().doc(spin(DRAW)).set(spinOf('p2'));
  });

  it('The spinner posts a photo of up to 300 KB before the deadline', async () => {
    await assertFails(proveDare(dev3()));
    await assertFails(proveDare(dev2(), `data:image/jpeg;base64,${'A'.repeat(420_000)}`));
    await assertFails(proveDare(dev2(), 'not a photo'));
    await assertSucceeds(proveDare(dev2()));
  });

  it('A dare is proven once, and only with the photo in the same save', async () => {
    await assertFails(dev2().doc(spin(DRAW)).update({ proofAt: now() }));
    await proveDare(dev2());
    await assertFails(proveDare(dev2()));
  });

  it('Once proven, the proof time is fixed, so the vote window cannot be restarted', async () => {
    await proveDare(dev2());
    await assertFails(dev2().doc(spin(DRAW)).update({ proofAt: now() }));
  });

  it('Proving changes nothing else on the spin', async () => {
    const db = dev2();
    const batch = db.batch();
    batch.set(db.doc(proofPath(DRAW)), { photo: PHOTO, at: now() });
    batch.update(db.doc(spin(DRAW)), { proofAt: now(), period: 'w02' });
    await assertFails(batch.commit());
  });

  it('After the deadline no proof is taken: the dare is dodged', async () => {
    await asJob((db) => db.doc(`${season}/weeks/w01`).update({ [`wheel.${DRAW}.dueAt`]: inHours(-1) }));
    await assertFails(proveDare(dev2()));
  });

  it('Everyone in the league can see the proof; nobody outside can', async () => {
    await proveDare(dev2());
    await assertSucceeds(dev3().doc(proofPath(DRAW)).get());
    await assertFails(stranger().doc(proofPath(DRAW)).get());
  });
});

describe('Voting on Wheel dare proof', () => {
  const voteId = (voter: string) => `${season}/votes/${voter}_proof_${DRAW}`;
  const vote = (voter: string, choice: string) => ({ voter, kind: 'proof', player: 'p2', draw: DRAW, choice, at: now() });

  beforeEach(async () => {
    await drawn();
    await asJob(async (db) => {
      await db.doc(spin(DRAW)).set({ player: 'p2', period: 'w01', at: inHours(-3), proofAt: inHours(-1) });
      await db.doc(proofPath(DRAW)).set({ photo: PHOTO, at: inHours(-1) });
    });
  });

  it("Everyone else votes Counts or Doesn't count, and can change their vote", async () => {
    await assertSucceeds(dev3().doc(voteId('p3')).set(vote('p3', 'counts')));
    await assertSucceeds(dev3().doc(voteId('p3')).set(vote('p3', 'doesntCount')));
    await assertSucceeds(dev1().doc(voteId('p1')).set(vote('p1', 'counts')));
  });

  it('The spinner does not vote on their own dare', async () => {
    await assertFails(dev2().doc(voteId('p2')).set({ ...vote('p2', 'counts') }));
  });

  it('Votes stay open for 24 hours from the proof', async () => {
    await asJob((db) => db.doc(spin(DRAW)).update({ proofAt: inHours(-25) }));
    await assertFails(dev3().doc(voteId('p3')).set(vote('p3', 'counts')));
  });

  it("A vote is yours, filed under its own name, and only Counts or Doesn't count", async () => {
    await assertFails(dev3().doc(voteId('p1')).set(vote('p1', 'counts')));
    await assertFails(dev3().doc(`${season}/votes/p3_proof_other`).set(vote('p3', 'counts')));
    await assertFails(dev3().doc(voteId('p3')).set(vote('p3', 'maybe')));
    await assertFails(dev3().doc(voteId('p3')).set({ ...vote('p3', 'counts'), player: 'p1' }));
  });

  it('No proof, no vote', async () => {
    await asJob((db) => db.doc(spin(DRAW)).update({ proofAt: null }));
    await assertFails(dev3().doc(voteId('p3')).set(vote('p3', 'counts')));
  });
});
