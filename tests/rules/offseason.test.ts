import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, auditEntry, dev1, dev2, dev3, league, now, season, seedLeague, startEmulator, stopEmulator, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

const DAY = 86_400_000;
const offseason = `${season}/config/offseason`;
const stay = (player: string) => `${season}/stays/${player}`;

/** The commish's deadline, with its audit entry, in one save. */
function setDeadline(db: Db, inDays: number, by = 'p1') {
  const id = `a-off-${inDays}-${by}`;
  const batch = db.batch();
  batch.set(db.doc(offseason), { deadline: new Date(Date.now() + inDays * DAY), at: now(), audit: id });
  batch.set(db.doc(`${league}/audit/${id}`), { ...auditEntry('offseason.deadline', 'config/offseason'), by });
  return batch.commit();
}

const answer = (db: Db, player: string, choice: string) => db.doc(stay(player)).set({ player, choice, at: now() });
const seasonOver = () => asJob((db) => db.doc(season).update({ status: 'finished' }));

describe('The offseason: Stay or Leave', () => {
  beforeEach(seedLeague);

  it('Once the season is over, the commish sets the deadline, with an audit entry, up to 30 days out', async () => {
    await assertFails(setDeadline(dev1(), 7));
    await seasonOver();
    await assertFails(setDeadline(dev2(), 7, 'p2'));
    await assertFails(setDeadline(dev1(), -1));
    await assertFails(setDeadline(dev1(), 31));
    // Without its audit entry, it is refused.
    await assertFails(dev1().doc(offseason).set({ deadline: new Date(Date.now() + 7 * DAY), at: now(), audit: 'a-missing' }));
    await assertSucceeds(setDeadline(dev1(), 7));
    // It can move while it is still ahead.
    await assertSucceeds(setDeadline(dev1(), 3));
  });

  it('Once the deadline has passed, it stays passed', async () => {
    await seasonOver();
    await asJob((db) => db.doc(offseason).set({ deadline: new Date(Date.now() - DAY), at: new Date(), audit: 'old' }));
    await assertFails(setDeadline(dev1(), 7));
  });

  it('Each player answers Stay or Leave for themselves, and can change it, until the deadline', async () => {
    // Not while the season is still on, even with a deadline on file.
    await asJob((db) => db.doc(offseason).set({ deadline: new Date(Date.now() + 7 * DAY), at: new Date(), audit: 'early' }));
    await assertFails(answer(dev2(), 'p2', 'stay'));
    await asJob((db) => db.doc(offseason).delete());
    await seasonOver();
    await assertFails(answer(dev2(), 'p2', 'leave'));
    await setDeadline(dev1(), 7);
    await assertSucceeds(answer(dev2(), 'p2', 'leave'));
    await assertSucceeds(answer(dev2(), 'p2', 'stay'));
    await assertFails(answer(dev2(), 'p3', 'leave'));
    await assertFails(answer(dev3(), 'p3', 'maybe'));
    await assertSucceeds(dev2().doc(stay('p3')).get());
    await asJob((db) => db.doc(offseason).update({ deadline: new Date(Date.now() - 1000) }));
    await assertFails(answer(dev3(), 'p3', 'stay'));
  });

  it('The commish runs the league, so can only stay', async () => {
    await seasonOver();
    await setDeadline(dev1(), 7);
    await assertFails(answer(dev1(), 'p1', 'leave'));
    await assertSucceeds(answer(dev1(), 'p1', 'stay'));
  });

  it('The commish can bring a former player back onto the roster, with an audit entry', async () => {
    await asJob(async (db) => {
      const members = ((await db.doc(league).get()).data()?.members ?? {}) as Record<string, boolean>;
      delete members.p3;
      await db.doc(league).update({ members, former: { p3: 's1' } });
    });
    const back = (db: Db, by = 'p1') => {
      const batch = db.batch();
      batch.update(db.doc(league), { 'members.p3': true, former: {}, audit: `a-back-${by}` });
      batch.set(db.doc(`${league}/audit/a-back-${by}`), { ...auditEntry('league.settings', 'league'), by });
      return batch.commit();
    };
    await assertFails(back(dev2(), 'p2'));
    await assertSucceeds(back(dev1()));
  });
});
