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
    await db.doc(STATE).set({ step: 'goals', order: ['p2', 'p3', 'p1'], picks: {}, turnStartedAt: null, startedAt: new Date(), votesCloseAt: inHours(24) });
    await db.doc(roster('p2')).set(goals());
    await db.doc(roster('p3')).delete();
  });
}

/** The commish starting the draft: the draft order, and the season moving to draft. */
function startDraft(db: Db, by = 'p1') {
  const batch = db.batch();
  batch.set(db.doc(STATE), { step: 'goals', order: ['p2', 'p3', 'p1'], picks: {}, turnStartedAt: null, startedAt: now(), votesCloseAt: inHours(24), audit: 'a-draft' });
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

/**
 * The league at the rival picks. By default nobody has picked yet, and Maya
 * (p2) picks first. `left` is who is still unpicked, in draft order.
 */
async function inRivalPicks(left = ['p2', 'p3', 'p1'], picks: Record<string, string> = {}) {
  await seedLeague();
  await asJob(async (db) => {
    await db.doc(season).update({ status: 'draft' });
    await db.doc(STATE).set({ step: 'rivals', order: ['p2', 'p3', 'p1'], left, picks, turnStartedAt: new Date(), startedAt: new Date(), votesCloseAt: inHours(24) });
  });
}

/** A rival pick as a phone makes it: the pick, who is still unpicked, and the next pick's clock. */
const pick = (db: Db, picker: string, rival: string, left: string[], clock: unknown = now()) => db.doc(STATE).update({ [`picks.${picker}`]: rival, left, turnStartedAt: clock });

describe('Rival picks', () => {
  beforeEach(() => inRivalPicks());

  it('In draft order, the first unpicked player picks a Week 1 rival from the others still unpicked', async () => {
    await assertSucceeds(pick(dev2(), 'p2', 'p3', ['p1']));
  });

  it("It has to be your turn: nobody picks out of turn, or for someone else", async () => {
    await assertFails(pick(dev3(), 'p3', 'p1', ['p2']));
    await assertFails(pick(dev3(), 'p2', 'p1', ['p3']));
  });

  it('You pick someone still unpicked, never yourself', async () => {
    await assertFails(pick(dev2(), 'p2', 'p2', ['p3', 'p1']));
    await assertFails(pick(dev2(), 'p2', 'p9', ['p3', 'p1']));
  });

  it('Both players leave the running, and the rest keep their draft order', async () => {
    await inRivalPicks(['p2', 'p4', 'p3', 'p1']);
    await assertFails(pick(dev2(), 'p2', 'p4', ['p1', 'p3']));
    await assertFails(pick(dev2(), 'p2', 'p4', ['p3']));
    await assertSucceeds(pick(dev2(), 'p2', 'p4', ['p3', 'p1']));
  });

  it("Each pick starts the next pick's 2-minute clock", async () => {
    await assertFails(pick(dev2(), 'p2', 'p3', ['p1'], inHours(-1)));
  });

  it('A pick is final', async () => {
    await inRivalPicks(['p2', 'p3', 'p1', 'p4']);
    await pick(dev2(), 'p2', 'p3', ['p1', 'p4']);
    await assertFails(pick(dev2(), 'p2', 'p1', ['p4']));
    await assertFails(dev1().doc(STATE).update({ 'picks.p2': 'p4', left: ['p1'], turnStartedAt: now() }));
  });

  it('Someone who has already picked can never pick again, even if a slip puts them back at the front of the line', async () => {
    await inRivalPicks(['p2', 'p1'], { p2: 'p3' });
    await assertFails(pick(dev2(), 'p2', 'p1', []));
  });

  it("When it is the commish's turn, they pick like everyone else", async () => {
    await inRivalPicks(['p1', 'p2', 'p3']);
    await assertSucceeds(pick(dev1(), 'p1', 'p3', ['p2']));
  });

  it('With one player left there is no pick to make: they face The House', async () => {
    await inRivalPicks(['p1'], { p2: 'p3' });
    await assertFails(pick(dev1(), 'p1', 'p2', []));
  });

  it('Picks happen only during the rival-pick step', async () => {
    await asJob((db) => db.doc(STATE).update({ step: 'dares' }));
    await assertFails(pick(dev2(), 'p2', 'p3', ['p1']));
  });

  it('A pick changes nothing else in the draft', async () => {
    await assertFails(dev2().doc(STATE).update({ 'picks.p2': 'p3', left: ['p1'], turnStartedAt: now(), step: 'done' }));
    await assertFails(dev2().doc(STATE).update({ 'picks.p2': 'p3', 'picks.p1': 'p2', left: ['p1'], turnStartedAt: now() }));
  });

  it('The commish can make a missed pick for a player, and it goes in the audit log', async () => {
    const db = dev1();
    const batch = db.batch();
    batch.update(db.doc(STATE), { 'picks.p2': 'p3', left: ['p1'], turnStartedAt: now(), audit: 'a-missed' });
    batch.set(db.doc(`${league}/audit/a-missed`), { ...auditEntry('draft.update', 'draft'), by: 'p1' });
    await assertSucceeds(batch.commit());
    // Without the audit entry, the commish can't pick for anyone else.
    await inRivalPicks();
    await assertFails(pick(dev1(), 'p2', 'p3', ['p1']));
  });
});

const dares = (player: string) => `${season}/dares/${player}`;
const dare = (text: string, version = 1) => ({ text, version });
const dareVoteId = (voter: string, player: string, version: number) => `${voter}_dare_${player}_${version}`;
const dareVote = (voter: string, player: string, version: number, choice: 'approve' | 'veto') => ({ voter, kind: 'dare', player, version, choice, at: now() });

/** The draft at its dares step, with votes open and Maya's (p2's) dare in. */
async function inDaresStep() {
  await seedLeague();
  await asJob(async (db) => {
    await db.doc(season).update({ status: 'draft' });
    await db.doc(STATE).set({ step: 'dares', order: ['p2', 'p3', 'p1'], left: ['p1'], picks: { p2: 'p3' }, turnStartedAt: new Date(), startedAt: new Date(), votesCloseAt: inHours(24) });
    await db.doc(dares('p2')).set(dare('Wear a cape to the gym.'));
  });
}

describe('Dares at the draft', () => {
  beforeEach(inDaresStep);

  it('At the dares step, each player adds one dare for the Wheel', async () => {
    await assertSucceeds(dev3().doc(dares('p3')).set(dare('Post your worst selfie.')));
  });

  it('A dare is 1 to 80 characters', async () => {
    await assertFails(dev3().doc(dares('p3')).set(dare('')));
    await assertFails(dev3().doc(dares('p3')).set(dare('x'.repeat(81))));
    await assertSucceeds(dev3().doc(dares('p3')).set(dare('x'.repeat(80))));
  });

  it("Nobody adds a dare in someone else's name, the commish included", async () => {
    await assertFails(dev3().doc(dares('p2')).set(dare('Nap', 2)));
    await assertFails(dev1().doc(dares('p3')).set(dare('Nap')));
  });

  it("Changing a dare's words gives it a new version, so votes on the old words stop counting", async () => {
    await assertSucceeds(dev2().doc(dares('p2')).set(dare('Wear a cape to work.', 2)));
    await assertFails(dev2().doc(dares('p2')).set(dare('Wear a cape all day.', 2)));
  });

  it('Dares wait for the dares step, and close when the votes close', async () => {
    await asJob((db) => db.doc(STATE).update({ step: 'rivals' }));
    await assertFails(dev3().doc(dares('p3')).set(dare('Post your worst selfie.')));
    await asJob((db) => db.doc(STATE).update({ step: 'done', votesCloseAt: inHours(-1) }));
    await assertFails(dev3().doc(dares('p3')).set(dare('Post your worst selfie.')));
  });

  it('After the live draft ends, a late dare is still welcome until the votes close', async () => {
    await asJob((db) => db.doc(STATE).update({ step: 'done' }));
    await assertSucceeds(dev3().doc(dares('p3')).set(dare('Post your worst selfie.')));
  });

  it("Players vote approve or veto on each other's dares, never their own and never in someone else's name", async () => {
    await assertSucceeds(dev3().doc(`${season}/votes/${dareVoteId('p3', 'p2', 1)}`).set(dareVote('p3', 'p2', 1, 'veto')));
    await assertFails(dev2().doc(`${season}/votes/${dareVoteId('p2', 'p2', 1)}`).set(dareVote('p2', 'p2', 1, 'approve')));
    await assertFails(dev3().doc(`${season}/votes/${dareVoteId('p1', 'p2', 1)}`).set(dareVote('p1', 'p2', 1, 'veto')));
  });

  it("A vote is for the dare's current words", async () => {
    await dev2().doc(dares('p2')).set(dare('Wear a cape to work.', 2));
    await assertFails(dev3().doc(`${season}/votes/${dareVoteId('p3', 'p2', 1)}`).set(dareVote('p3', 'p2', 1, 'veto')));
    await assertSucceeds(dev3().doc(`${season}/votes/${dareVoteId('p3', 'p2', 2)}`).set(dareVote('p3', 'p2', 2, 'veto')));
  });

  it('Votes on dares wait for the dares step too', async () => {
    await asJob((db) => db.doc(STATE).update({ step: 'rivals' }));
    await assertFails(dev3().doc(`${season}/votes/${dareVoteId('p3', 'p2', 1)}`).set(dareVote('p3', 'p2', 1, 'veto')));
  });

  it('Votes on dares close when the votes close', async () => {
    await asJob((db) => db.doc(STATE).update({ votesCloseAt: inHours(-1) }));
    await assertFails(dev3().doc(`${season}/votes/${dareVoteId('p3', 'p2', 1)}`).set(dareVote('p3', 'p2', 1, 'veto')));
  });

  it('A dare vote has no lane, and is filed under its own name', async () => {
    await assertFails(dev3().doc(`${season}/votes/${dareVoteId('p3', 'p2', 1)}`).set({ ...dareVote('p3', 'p2', 1, 'veto'), lane: 'mind' }));
    await assertFails(dev3().doc(`${season}/votes/p3_goal_p2_mind_1`).set(dareVote('p3', 'p2', 1, 'veto')));
  });

  it('Everyone in the league can see the dares; nobody outside can', async () => {
    await assertSucceeds(dev3().doc(dares('p2')).get());
    await assertFails(stranger().doc(dares('p2')).get());
  });
});
