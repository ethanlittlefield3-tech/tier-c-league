import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { WED2, asJob, assertFails, assertSucceeds, auditEntry, dayLog, dayPath, dev1, dev2, kitPath, league, now, season, seedLeague, startEmulator, stopEmulator, stranger, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

const bracket = `${season}/playoffs/bracket`;
/** A semifinal day and a reset day, both open right now, like Wednesday of Week 2. */
const SEMI = '2027-03-08';
const RESET = '2027-03-11';
const FINAL = '2027-03-12';

/** The playoffs under way: p1 (seed 1) plays p2 in the semifinal, with days open now. */
async function playoffsUnderway() {
  await seedLeague();
  await asJob(async (db) => {
    const open = (await db.doc(`${season}/calendar/${WED2}`).get()).data()!;
    await db.doc(`${season}/calendar/${SEMI}`).set({ ...open, date: SEMI, period: 'p01', phase: 'playoff', kind: 'play' });
    await db.doc(`${season}/calendar/${RESET}`).set({ ...open, date: RESET, period: 'p02', phase: 'playoff', kind: 'reset', kit: [] });
    await db.doc(`${season}/calendar/${FINAL}`).set({ ...open, date: FINAL, period: 'p02', phase: 'playoff', kind: 'play' });
    await db.doc(`${season}/weeks/p01`).set({ week: 9, period: 'p01', phase: 'playoff', round: 'semi', mode: 'regular', pairs: [{ a: 'p1', b: 'p2' }], targets: { p1: ['p2'], p2: ['p1'] } });
    await db.doc(bracket).set({ size: 4, seeds: ['p1', 'p2', 'p3'], outside: [], semis: [{ a: 'p1', b: null }, { a: 'p2', b: 'p3' }], final: null, suddenDeath: false, whiff: null, champion: null, finalist: null });
    await db.doc(dayPath('p2', SEMI)).set({ ...dayLog('p2', SEMI), firstAt: new Date(), updatedAt: new Date() });
  });
}

describe('The playoff bracket', () => {
  beforeEach(playoffsUnderway);

  it('Everyone in the league reads it, and nobody outside it', async () => {
    await assertSucceeds(dev2().doc(bracket).get());
    await assertFails(stranger().doc(bracket).get());
  });

  it('Only the weekly job writes it: no phone, not even the commish', async () => {
    await assertFails(dev1().doc(bracket).update({ champion: 'p1' }));
    await assertFails(dev2().doc(bracket).set({ champion: 'p2' }));
  });
});

describe('Playing the playoffs', () => {
  beforeEach(playoffsUnderway);

  it('Nobody logs on the reset day between the rounds, though it is open', async () => {
    await assertSucceeds(dev1().doc(dayPath('p1', SEMI)).set(dayLog('p1', SEMI)));
    await assertFails(dev1().doc(dayPath('p1', RESET)).set(dayLog('p1', RESET)));
  });

  it('Receipts on a playoff day are asked for before it locks, and proof is due by 6 pm the day after', async () => {
    const ask = async (db: Db, deadline: (calendar: Record<string, any>) => unknown) => {
      const calendar = (await db.doc(`${season}/calendar/${SEMI}`).get()).data()!;
      const batch = db.batch();
      batch.set(db.doc(`${season}/receipts/p2_${SEMI}_mind`), { target: 'p2', date: SEMI, square: 'mind', by: 'p1', slot: 'p01_p1_1', requestedAt: now(), deadline: deadline(calendar), proofAt: null, backedDownAt: null });
      batch.set(db.doc(`${season}/receiptSlots/p01_p1_1`), { receipt: `p2_${SEMI}_mind` });
      return batch.commit();
    };
    await assertFails(ask(dev1(), (calendar) => calendar.end));
    await assertSucceeds(ask(dev1(), (calendar) => new Date(calendar.lock.toMillis() + 6 * 3_600_000)));
  });

  it('The #1 seed gets a second Full Boost in the semifinal; nobody else does, and not in the final', async () => {
    const boost = (player: string, period: string, date: string) => ({ player, item: 'fullBoost2', period, date, lane: 'body', at: now() });
    await assertSucceeds(dev1().doc(kitPath('p01_p1_fullBoost2')).set(boost('p1', 'p01', SEMI)));
    await assertFails(dev2().doc(kitPath('p01_p2_fullBoost2')).set(boost('p2', 'p01', SEMI)));
    await assertFails(dev1().doc(kitPath('p02_p1_fullBoost2')).set(boost('p1', 'p02', FINAL)));
    // It can be taken back until its day locks, like the first.
    await assertSucceeds(dev1().doc(kitPath('p01_p1_fullBoost2')).delete());
  });
});

describe('The Season Dare', () => {
  const dare = `${season}/config/seasonDare`;
  /** The commish's pick, with its audit entry, in one save. */
  const pick = (db: Db, text: string, by = 'p1') => {
    const batch = db.batch();
    batch.set(db.doc(dare), { text, audit: 'a-dare' });
    batch.set(db.doc(`${league}/audit/a-dare`), { ...auditEntry('season.dare', 'config/seasonDare'), by });
    return batch.commit();
  };

  beforeEach(seedLeague);

  it("Before the playoffs, the commish picks the Season Dare that the Whiff Bowl's loser does, with an audit entry", async () => {
    await assertSucceeds(pick(dev1(), 'Cold shower, on video.'));
    await assertSucceeds(dev2().doc(dare).get());
  });

  it('Nobody else picks it, it needs words and an audit entry, and it is fixed once the playoffs are seeded', async () => {
    await assertFails(pick(dev2(), 'Cold shower, on video.', 'p2'));
    await assertFails(pick(dev1(), ''));
    // Not without its audit entry.
    await assertFails(dev1().doc(dare).set({ text: 'Cold shower, on video.', audit: 'a-missing' }));
    await asJob((db) => db.doc(bracket).set({ size: 4, seeds: [], outside: [] }));
    await assertFails(pick(dev1(), 'Cold shower, on video.'));
  });
});
