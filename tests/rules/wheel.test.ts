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
    await db.doc(sealed('coin_p1')).set({ value: 0.5 });
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

  it('Coin flips stay sealed from everyone', async () => {
    await assertFails(dev1().doc(sealed('coin_p1')).get());
  });

  it('Everyone in the league can see the spins; nobody outside can', async () => {
    await dev2().doc(spin(DRAW)).set(spinOf('p2'));
    await assertSucceeds(dev3().doc(spin(DRAW)).get());
    await assertFails(stranger().doc(spin(DRAW)).get());
  });
});
