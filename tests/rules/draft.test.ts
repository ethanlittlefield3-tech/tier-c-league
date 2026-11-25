import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asJob, assertFails, assertSucceeds, auditEntry, dev1, dev2, dev3, league, now, season, seedLeague, startEmulator, stopEmulator, stranger, type Db } from './harness.ts';

beforeAll(startEmulator);
afterAll(stopEmulator);

const STATE = `${season}/draft/state`;
const roster = (player: string) => `${season}/roster/${player}`;
const goal = (text: string, version = 1) => ({ text, version });
const goals = (mind = 'Read 20 pages', body = '10k steps', wildcard = 'No vaping') => ({ goals: { mind: goal(mind), body: goal(body), wildcard: goal(wildcard) } });
const voteId = (voter: string, player: string, lane: string, version: number) => `${voter}_goal_${player}_${lane}_${version}`;
const vote = (voter: string, player: string, lane: string, version: number, choice: 'approve' | 'veto') => ({ voter, kind: 'goal', player, lane, version, choice, at: now() });

const HOUR = 3_600_000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR);

/** The league in the goals step of the draft, with Maya's (p2's) goals set. */
async function inGoalsStep() {
  await seedLeague();
  await asJob(async (db) => {
    await db.doc(season).update({ status: 'draft' });
    await db.doc(STATE).set({ step: 'goals', order: ['p2', 'p3', 'p1'], turn: 0, picks: {}, turnEndsAt: null, startedAt: new Date(), votesCloseAt: inHours(24) });
    await db.doc(roster('p2')).set(goals());
    await db.doc(roster('p3')).delete();
  });
}

/** The commish starting the draft: the draft order, and the season moving to draft. */
function startDraft(db: Db, by = 'p1') {
  const batch = db.batch();
  batch.set(db.doc(STATE), { step: 'goals', order: ['p2', 'p3', 'p1'], turn: 0, picks: {}, turnEndsAt: null, startedAt: now(), votesCloseAt: inHours(24), audit: 'a-draft' });
  batch.set(db.doc(`${league}/audit/a-draft`), { ...auditEntry('draft.update', 'draft'), by });
  batch.update(db.doc(season), { status: 'draft', updatedAt: now(), audit: 'a-season' });
  batch.set(db.doc(`${league}/audit/a-season`), { ...auditEntry('season.settings', 'seasons/s1'), by });
  return batch.commit();
}

describe('Starting the draft', () => {
  beforeEach(async () => {
    await seedLeague();
    await asJob((db) => db.doc(season).update({ status: 'setup' }));
  });

  it('The commish starts the draft: the order is set, the season moves to draft, and both are in the audit log', async () => {
    await assertSucceeds(startDraft(dev1()));
  });

  it('Nobody else can start it', async () => {
    await assertFails(startDraft(dev2(), 'p2'));
  });

  it('Once the draft has started, the season settings are fixed', async () => {
    await startDraft(dev1());
    const db = dev1();
    const batch = db.batch();
    batch.update(db.doc(season), { par: 4, updatedAt: now(), audit: 'a-late' });
    batch.set(db.doc(`${league}/audit/a-late`), { ...auditEntry('season.settings', 'seasons/s1'), by: 'p1' });
    await assertFails(batch.commit());
  });
});

describe('Goals at the draft', () => {
  beforeEach(inGoalsStep);

  it("While the draft's votes are open, a player sets their three goals", async () => {
    await assertSucceeds(dev3().doc(roster('p3')).set(goals('A course lesson', 'A run', 'Call family')));
  });

  it('A goal is 1 to 60 characters', async () => {
    await assertFails(dev3().doc(roster('p3')).set(goals('', 'A run', 'Call family')));
    await assertFails(dev3().doc(roster('p3')).set(goals('x'.repeat(61), 'A run', 'Call family')));
    await assertSucceeds(dev3().doc(roster('p3')).set(goals('x'.repeat(60), 'A run', 'Call family')));
  });

  it("Changing a goal's words gives it a new version, so votes on the old words stop counting", async () => {
    await assertSucceeds(dev2().doc(roster('p2')).update({ 'goals.body': goal('12k steps', 2) }));
    // New words with the old version, or a new version with the old words, are refused.
    await assertFails(dev2().doc(roster('p2')).update({ 'goals.mind': goal('Read 30 pages', 1) }));
    await assertFails(dev2().doc(roster('p2')).update({ 'goals.wildcard': goal('No vaping', 2) }));
  });

  it("Nobody can set someone else's goals, the commish included", async () => {
    await assertFails(dev3().doc(roster('p2')).update({ 'goals.mind': goal('Nap', 2) }));
    await assertFails(dev1().doc(roster('p2')).update({ 'goals.mind': goal('Nap', 2) }));
    await assertFails(stranger().doc(roster('p9')).set(goals()));
  });

  it('Goals are fixed once the draft\'s votes close', async () => {
    await asJob((db) => db.doc(STATE).update({ votesCloseAt: inHours(-1) }));
    await assertFails(dev2().doc(roster('p2')).update({ 'goals.mind': goal('Nap', 2) }));
    await assertFails(dev3().doc(roster('p3')).set(goals()));
  });

  it('Goals can still be set and voted on after the live draft moves on, until the votes close, for anyone who missed it', async () => {
    await asJob((db) => db.doc(STATE).update({ step: 'rivals' }));
    await assertSucceeds(dev3().doc(roster('p3')).set(goals('A course lesson', 'A run', 'Call family')));
    await assertSucceeds(dev3().doc(`${season}/votes/${voteId('p3', 'p2', 'body', 1)}`).set(vote('p3', 'p2', 'body', 1, 'veto')));
  });

  it("Players vote approve or veto on each other's goals, and can change their vote", async () => {
    const id = `${season}/votes/${voteId('p3', 'p2', 'body', 1)}`;
    await assertSucceeds(dev3().doc(id).set(vote('p3', 'p2', 'body', 1, 'veto')));
    await assertSucceeds(dev3().doc(id).set(vote('p3', 'p2', 'body', 1, 'approve')));
    await assertSucceeds(dev2().doc(id).get());
  });

  it('Nobody votes on their own goal, or in someone else\'s name', async () => {
    await assertFails(dev2().doc(`${season}/votes/${voteId('p2', 'p2', 'body', 1)}`).set(vote('p2', 'p2', 'body', 1, 'approve')));
    await assertFails(dev3().doc(`${season}/votes/${voteId('p1', 'p2', 'body', 1)}`).set(vote('p1', 'p2', 'body', 1, 'veto')));
  });

  it("A vote is for the goal's current words: a vote on an old version is refused", async () => {
    await dev2().doc(roster('p2')).update({ 'goals.body': goal('12k steps', 2) });
    await assertFails(dev3().doc(`${season}/votes/${voteId('p3', 'p2', 'body', 1)}`).set(vote('p3', 'p2', 'body', 1, 'veto')));
    await assertSucceeds(dev3().doc(`${season}/votes/${voteId('p3', 'p2', 'body', 2)}`).set(vote('p3', 'p2', 'body', 2, 'veto')));
  });

  it('A vote has to be approve or veto', async () => {
    await assertFails(dev3().doc(`${season}/votes/${voteId('p3', 'p2', 'body', 1)}`).set({ ...vote('p3', 'p2', 'body', 1, 'approve'), choice: 'maybe' }));
  });

  it("Votes on goals close when the draft's votes close", async () => {
    await asJob((db) => db.doc(STATE).update({ votesCloseAt: inHours(-1) }));
    await assertFails(dev3().doc(`${season}/votes/${voteId('p3', 'p2', 'body', 1)}`).set(vote('p3', 'p2', 'body', 1, 'veto')));
  });

  it('The commish can close the votes sooner or give more time, and it goes in the audit log', async () => {
    const change = (db: Db, by: string, closeAt: Date) => {
      const batch = db.batch();
      batch.update(db.doc(STATE), { votesCloseAt: closeAt, audit: `a-close-${by}` });
      batch.set(db.doc(`${league}/audit/a-close-${by}`), { ...auditEntry('draft.update', 'draft'), by });
      return batch.commit();
    };
    await assertSucceeds(change(dev1(), 'p1', inHours(36)));
    await assertFails(change(dev2(), 'p2', inHours(48)));
    // Without an audit entry, even the commish is refused.
    await assertFails(dev1().doc(STATE).update({ votesCloseAt: inHours(12) }));
  });

  it('The draft always says when its votes close', async () => {
    const db = dev1();
    const batch = db.batch();
    batch.update(db.doc(STATE), { votesCloseAt: null, audit: 'a-none' });
    batch.set(db.doc(`${league}/audit/a-none`), { ...auditEntry('draft.update', 'draft'), by: 'p1' });
    await assertFails(batch.commit());
  });

  it('Everyone in the league can see the draft and the votes; nobody outside can', async () => {
    await assertSucceeds(dev3().doc(STATE).get());
    await assertFails(stranger().doc(STATE).get());
  });
});
