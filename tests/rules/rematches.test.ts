import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { TUE2, WED2, asJob, assertFails, assertSucceeds, dev1, dev2, dev3, now, season, seedLeague, startEmulator, stopEmulator, stranger, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);
beforeEach(seedLeague);

// Week 1 is final: p2 beat p1, and p3 lost to The House. Today is Wednesday of Week 2, the race week.
const result = (opponent: string, outcome: string) => ({ opponent, outcome, points: 10, opponentPoints: 14 });
const weekOne = (status: string) =>
  asJob((db) => db.doc(`${season}/weeks/w01`).set({ week: 1, mode: 'regular', status, results: { p1: result('p2', 'loss'), p2: result('p1', 'win'), p3: result('HOUSE', 'loss') } }));
const path = (from: string) => `${season}/rematches/w01_${from}`;
const challenge = (db: Db, from: string, to: string, extra: Record<string, unknown> = {}) => db.doc(path(from)).set({ from, to, lost: 'w01', period: 'w02', date: WED2, at: now(), ...extra });

describe('Rematch challenges', () => {
  it('After a final week, the loser challenges the player who beat them to a side race the next week, once', async () => {
    await weekOne('final');
    await assertSucceeds(challenge(dev1(), 'p1', 'p2'));
    await assertFails(challenge(dev1(), 'p1', 'p2'));
  });

  it('The winner cannot challenge, nobody challenges a player who did not beat them, and never The House', async () => {
    await weekOne('final');
    await assertFails(challenge(dev2(), 'p2', 'p1'));
    await assertFails(challenge(dev1(), 'p1', 'p3'));
    await assertFails(challenge(dev3(), 'p3', 'HOUSE'));
  });

  it('Only once the lost week is final, for the week right after it, which is this week, dated today and by its Wednesday', async () => {
    await weekOne('provisional');
    await assertFails(challenge(dev1(), 'p1', 'p2'));
    await weekOne('final');
    await assertFails(challenge(dev1(), 'p1', 'p2', { period: 'w03' }));
    await assertFails(challenge(dev1(), 'p1', 'p2', { date: TUE2 }));
    // A loss in Week 8 is final too, but its race week is Week 9, not this one.
    await asJob((db) => db.doc(`${season}/weeks/w08`).set({ week: 8, mode: 'regular', status: 'final', results: { p1: result('p2', 'loss'), p2: result('p1', 'win') } }));
    await assertFails(dev1().doc(`${season}/rematches/w08_p1`).set({ from: 'p1', to: 'p2', lost: 'w08', period: 'w09', date: WED2, at: now() }));
    await assertFails(dev1().doc(`${season}/rematches/w08_p1`).set({ from: 'p1', to: 'p2', lost: 'w08', period: 'w02', date: WED2, at: now() }));
    await asJob((db) => db.doc(`${season}/calendar/${WED2}`).update({ dayIndex: 3 }));
    await assertFails(challenge(dev1(), 'p1', 'p2'));
  });

  it('A challenge is in your own name, filed under the lost week and you, dated today with the real time, and says nothing else', async () => {
    await weekOne('final');
    await assertFails(dev2().doc(path('p1')).set({ from: 'p1', to: 'p2', lost: 'w01', period: 'w02', date: WED2, at: now() }));
    await assertFails(dev1().doc(`${season}/rematches/w01_p1x`).set({ from: 'p1', to: 'p2', lost: 'w01', period: 'w02', date: WED2, at: now() }));
    await assertFails(challenge(dev1(), 'p1', 'p2', { at: new Date(2020, 0, 1) }));
    await assertFails(challenge(dev1(), 'p1', 'p2', { stakes: 'loser buys' }));
  });

  it('Everyone in the league can read challenges; nobody changes or deletes one, and nobody outside the league reads them', async () => {
    await weekOne('final');
    await assertSucceeds(challenge(dev1(), 'p1', 'p2'));
    await assertSucceeds(dev3().doc(path('p1')).get());
    await assertFails(dev1().doc(path('p1')).update({ to: 'p3' }));
    await assertFails(dev2().doc(path('p1')).update({ winner: 'p2' }));
    await assertFails(dev1().doc(path('p1')).delete());
    await assertFails(stranger().doc(path('p1')).get());
  });
});
