/**
 * The draft (SCOPE.md, "Draft day agenda"): the commish starts and advances
 * it; players set their goals and vote on each other's. Every commish change
 * goes in the league log.
 */
import { Timestamp, collection, doc, getDoc, serverTimestamp, setDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { DRAFT_VOTE_HOURS, type Lane } from '@tcl/engine';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';

async function attempt<T>(work: (db: Firestore) => Promise<T>): Promise<T> {
  try {
    const { db } = await connect();
    return await work(db);
  } catch (error) {
    throw trouble(error);
  }
}

const entry = (me: Me, action: string, target: string, reason: string) => ({ by: me.player, at: serverTimestamp(), action, target, reason });

/** A fair shuffle, with the phone's own secure randomness. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const [random] = crypto.getRandomValues(new Uint32Array(1));
    const j = (random ?? 0) % (i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * Starts the draft: draws the order at random, opens goals and votes for the
 * next 24 hours, and moves the season to draft, which fixes its settings.
 */
export const startDraft = (me: Me, season: string, members: string[]) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const order = shuffle(members);
    const draftAudit = doc(collection(league, 'audit')).id;
    const seasonAudit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    const votesCloseAt = Timestamp.fromMillis(Date.now() + DRAFT_VOTE_HOURS * 3_600_000);
    save.set(doc(league, 'seasons', season, 'draft', 'state'), { step: 'goals', order, turn: 0, picks: {}, turnEndsAt: null, startedAt: serverTimestamp(), votesCloseAt, audit: draftAudit });
    save.set(doc(league, 'audit', draftAudit), entry(me, 'draft.update', 'draft', 'Started the draft and drew the order'));
    save.update(doc(league, 'seasons', season), { status: 'draft', updatedAt: serverTimestamp(), audit: seasonAudit });
    save.set(doc(league, 'audit', seasonAudit), entry(me, 'season.settings', `seasons/${season}`, 'The season moved to the draft; its settings are now fixed'));
    await save.commit();
    return order;
  });

/** Moves the draft on a step. */
export const advanceDraft = (me: Me, season: string, step: 'goals' | 'rivals' | 'dares' | 'done', reason: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const state = doc(league, 'seasons', season, 'draft', 'state');
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(state, { step, audit });
    save.set(doc(league, 'audit', audit), entry(me, 'draft.update', 'draft', reason));
    await save.commit();
  });

/** Closes the draft's votes now (`at` of `'now'`), or moves when they close. */
export const setVotesClose = (me: Me, season: string, at: number | 'now', reason: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(doc(league, 'seasons', season, 'draft', 'state'), { votesCloseAt: at === 'now' ? serverTimestamp() : Timestamp.fromMillis(at), audit });
    save.set(doc(league, 'audit', audit), entry(me, 'draft.update', 'draft', reason));
    await save.commit();
  });

/** Saves your three goals. A goal whose words changed gets a new version, so its old votes stop counting. */
export const saveGoals = (me: Me, season: string, goals: Record<Lane, string>) =>
  attempt(async (db) => {
    const ref = doc(db, 'leagues', me.league, 'seasons', season, 'roster', me.player);
    const before = (await getDoc(ref)).data()?.goals as Record<Lane, { text: string; version: number }> | undefined;
    const lane = (name: Lane) => {
      const text = goals[name].trim().replace(/\s+/g, ' ');
      const old = before?.[name];
      return { text, version: !old ? 1 : old.text === text ? old.version : old.version + 1 };
    };
    await setDoc(ref, { goals: { mind: lane('mind'), body: lane('body'), wildcard: lane('wildcard') } });
  });

/** Approve or veto one version of someone else's goal. Voting again changes the vote. */
export const voteOnGoal = (me: Me, season: string, input: { player: string; lane: Lane; version: number; choice: 'approve' | 'veto' }) =>
  attempt(async (db) => {
    const id = `${me.player}_goal_${input.player}_${input.lane}_${input.version}`;
    await setDoc(doc(db, 'leagues', me.league, 'seasons', season, 'votes', id), { voter: me.player, kind: 'goal', ...input, at: serverTimestamp() });
  });
