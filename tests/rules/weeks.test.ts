import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { SAT1, SUN1, SUN2, asJob, assertFails, assertSucceeds, auditEntry, dev1, dev2, league, now, season, seedLeague, startEmulator, stopEmulator, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

const week = `${season}/weeks/w01`;
const dare = (player: string) => `${season}/dares/${player}`;

/** The commish's change, with its audit entry, in one save. */
function audited(db: Db, path: string, change: Record<string, unknown>, action: string, target: string, by = 'p1') {
  const batch = db.batch();
  batch.update(db.doc(path), { ...change, audit: `a-${action}` });
  batch.set(db.doc(`${league}/audit/a-${action}`), { ...auditEntry(action, target), by });
  return batch.commit();
}

describe('Unlocking a final week', () => {
  beforeEach(async () => {
    await seedLeague();
    await asJob((db) => db.doc(week).set({ week: 1, status: 'final', results: {}, awards: { mvp: [], bust: [], wheel: [] } }));
  });

  it('The commish can unlock a final week, so the weekly job counts it again, and it goes in the audit log', async () => {
    await assertSucceeds(audited(dev1(), week, { status: 'provisional' }, 'week.unlock', 'weeks/w01'));
  });

  it('Nobody else can, and not without the audit entry', async () => {
    await assertFails(audited(dev2(), week, { status: 'provisional' }, 'week.unlock', 'weeks/w01', 'p2'));
    await assertFails(dev1().doc(week).update({ status: 'provisional' }));
  });

  it('Unlocking changes nothing else: no results, and only a final week', async () => {
    await assertFails(audited(dev1(), week, { status: 'provisional', results: { p1: 'win' } }, 'week.unlock', 'weeks/w01'));
    await assertFails(audited(dev1(), week, { status: 'final' }, 'week.unlock', 'weeks/w01'));
    await asJob((db) => db.doc(week).update({ status: 'provisional' }));
    await assertFails(audited(dev1(), week, { status: 'provisional' }, 'week.unlock', 'weeks/w01'));
  });
});

describe('Settling a week from the app', () => {
  const week1 = `${season}/weeks/w01`;
  const week2 = `${season}/weeks/w02`;
  const settle = (db: Db, path: string, change: Record<string, unknown>, by = 'p1') => audited(db, path, change, 'week.settle', path.slice(path.indexOf('weeks/')), by);
  /** What the commish's phone posts: the engine's count of the week, and which Sunday ended it. */
  const results = (sunday: string, extra: Record<string, unknown> = {}) => ({
    status: 'provisional',
    results: {
      p1: { player: 'p1', opponent: 'p2', points: 9, beers: 1, seasonPoints: 3, outcome: 'win' },
      p2: { player: 'p2', opponent: 'p1', points: 4, beers: 2, seasonPoints: 0, outcome: 'loss' },
    },
    house: null,
    awards: { mvp: ['p1'], bust: [], wheel: ['p2'] },
    lines: [
      { player: 'p1', points: 9, beers: 1, perfectDays: 1 },
      { player: 'p2', points: 4, beers: 2, perfectDays: 0 },
    ],
    // A 1v1 week has no group-play summary.
    group: null,
    settledAt: now(),
    sunday,
    ...extra,
  });

  beforeEach(async () => {
    await seedLeague();
    await asJob((db) => db.doc(week1).set({ week: 1, mode: 'regular', pairs: [{ a: 'p1', b: 'p2' }], targets: { p1: ['p2'], p2: ['p1'] } }));
  });

  it("If the weekly job runs late, the commish can post a finished week's results from the app, with an audit entry", async () => {
    await assertSucceeds(settle(dev1(), week1, results(SUN1)));
  });

  it("Not before the week's Sunday locks, and the Sunday named has to be that week's", async () => {
    await assertFails(settle(dev1(), week2, results(SUN2)));
    await assertFails(settle(dev1(), week1, results(SUN2)));
    await assertFails(settle(dev1(), week1, results(SAT1)));
    // Week 1's Sunday has locked, but it doesn't end Week 2.
    await assertFails(settle(dev1(), week2, results(SUN1)));
  });

  it('The results stay provisional: only the weekly job makes a week final, and the commish never posts over a final week', async () => {
    await assertFails(settle(dev1(), week1, results(SUN1, { status: 'final' })));
    await asJob((db) => db.doc(week1).update({ status: 'final' }));
    await assertFails(settle(dev1(), week1, results(SUN1)));
  });

  it('Only the commish, only with the audit entry, and nothing but the results change', async () => {
    await assertFails(settle(dev2(), week1, results(SUN1), 'p2'));
    await assertFails(dev1().doc(week1).update(results(SUN1)));
    await assertFails(settle(dev1(), week1, results(SUN1, { pairs: [{ a: 'p1', b: 'p3' }] })));
    await assertFails(settle(dev1(), week1, results(SUN1, { results: 'p1 wins' })));
    await assertFails(settle(dev1(), week1, results(SUN1, { lines: {} })));
    await assertFails(settle(dev1(), week1, results(SUN1, { awards: 'MVP: p1' })));
    await assertFails(settle(dev1(), week1, results(SUN1, { house: 'p1' })));
  });

  it("A group-play week's results come with its summary: the sides, the Bounty, the race or the floors", async () => {
    await assertFails(settle(dev1(), week1, results(SUN1, { group: 'alley' })));
    await assertSucceeds(settle(dev1(), week1, results(SUN1, { group: { mode: 'alley', race: [] } })));
  });

  it('Results the job already posted can be posted again; they keep the time they were first posted', async () => {
    const first = new Date(Date.now() - 3_600_000);
    await asJob((db) => db.doc(week1).update({ status: 'provisional', results: {}, house: null, awards: {}, lines: [], settledAt: first }));
    await assertFails(settle(dev1(), week1, results(SUN1)));
    const { settledAt: _settledAt, ...again } = results(SUN1);
    await assertSucceeds(settle(dev1(), week1, again));
  });
});

describe('Removing a dare', () => {
  beforeEach(async () => {
    await seedLeague();
    await asJob((db) => db.doc(dare('p2')).set({ text: 'Something unkind', version: 1 }));
  });

  it('The commish can take a dare off the Wheel, and it goes in the audit log', async () => {
    await assertSucceeds(audited(dev1(), dare('p2'), { removed: true }, 'dare.remove', 'dares/p2'));
  });

  it('Nobody else can, and not without the audit entry, and nothing else about the dare changes', async () => {
    await assertFails(audited(dev2(), dare('p2'), { removed: true }, 'dare.remove', 'dares/p2', 'p2'));
    await assertFails(dev1().doc(dare('p2')).update({ removed: true }));
    await assertFails(audited(dev1(), dare('p2'), { removed: true, text: 'Kinder words' }, 'dare.remove', 'dares/p2'));
  });
});

describe('Taking starter dares off the Wheel', () => {
  const config = `${season}/config/wheel`;
  const setStarters = (db: Db, removedStarters: unknown, by = 'p1') => {
    const batch = db.batch();
    batch.set(db.doc(config), { removedStarters, audit: `a-starters-${by}` });
    batch.set(db.doc(`${league}/audit/a-starters-${by}`), { ...auditEntry('wheel.starters', 'config/wheel'), by });
    return batch.commit();
  };

  beforeEach(seedLeague);

  it('The commish can take starter dares off the Wheel or put them back, and it goes in the audit log', async () => {
    await assertSucceeds(setStarters(dev1(), [2, 5]));
    await assertSucceeds(dev2().doc(config).get());
  });

  it('Only the 8 starters, by their place in the list, and only by the commish with the audit entry', async () => {
    await assertFails(setStarters(dev1(), [8]));
    await assertFails(setStarters(dev1(), ['Cold shower']));
    await assertFails(setStarters(dev2(), [1], 'p2'));
    await assertFails(dev1().doc(config).set({ removedStarters: [1] }));
  });
});
