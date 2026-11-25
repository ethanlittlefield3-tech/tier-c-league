/**
 * The commish's tools. Every one of these saves carries a new audit entry the
 * whole league can read, and the security rules refuse any that doesn't
 * (firebase/firestore.rules, "audited").
 */
import { makeRecoveryKey, type Square } from '@tcl/engine';
import { collection, deleteField, doc, getDoc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';

const freshKey = () => makeRecoveryKey(crypto.getRandomValues(new Uint8Array(8)));

async function attempt<T>(work: (db: Firestore) => Promise<T>): Promise<T> {
  try {
    const { db } = await connect();
    return await work(db);
  } catch (error) {
    throw trouble(error);
  }
}

function auditEntry(me: Me, action: string, target: string, reason: string) {
  return { by: me.player, at: serverTimestamp(), action, target, reason: reason.trim().slice(0, 500) };
}

/** A player's current recovery key. Only the player and the commish can read it. */
export const keyOf = (me: Me, player: string) =>
  attempt(async (db) => String((await getDoc(doc(db, 'leagues', me.league, 'keys', player))).data()?.key ?? ''));

/**
 * Gives a player a new key. Every phone they are signed in on is signed out,
 * which is also how a lost phone is signed out. Resolves to the new key.
 */
export const reissueKey = (me: Me, player: string, reason: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const old = String((await getDoc(doc(league, 'keys', player))).data()?.key ?? '');
    const key = freshKey();
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(doc(league, 'keys', player), { key, prev: old, rotatedAt: serverTimestamp(), audit });
    if (old) save.delete(doc(league, 'lookup', old));
    save.set(doc(league, 'lookup', key), { player });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'key.reissue', `keys/${player}`, reason));
    await save.commit();
    return key;
  });

/** Changes the league document: who may join, the co-commish, or who is commish. */
export const editLeague = (me: Me, changes: { joining?: 'open' | 'approval' | 'closed'; coCommish?: string | null; commish?: string }, reason: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(league, { ...changes, audit });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'league.settings', 'league', reason));
    await save.commit();
  });

/** Takes a player off the league: off the member list, and their key blanked so no phone of theirs gets back in. */
export const removePlayer = (me: Me, player: string, reason: string) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const old = String((await getDoc(doc(league, 'keys', player))).data()?.key ?? '');
    const leagueAudit = doc(collection(league, 'audit')).id;
    const keyAudit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(league, { [`members.${player}`]: deleteField(), audit: leagueAudit });
    save.set(doc(league, 'audit', leagueAudit), auditEntry(me, 'league.settings', 'league', reason));
    save.update(doc(league, 'keys', player), { key: '', prev: old, rotatedAt: serverTimestamp(), audit: keyAudit });
    if (old) save.delete(doc(league, 'lookup', old));
    save.set(doc(league, 'audit', keyAudit), auditEntry(me, 'key.reissue', `keys/${player}`, reason));
    await save.commit();
  });

/** Docks points, voids a square, or enters a correction on a player's day. A reason is required. */
export const adjustScore = (me: Me, season: string, input: { player: string; date: string; amount: number; void: Square | null; reason: string }) =>
  attempt(async (db) => {
    const league = doc(db, 'leagues', me.league);
    const adjustment = doc(collection(league, 'seasons', season, 'adjustments'));
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.set(adjustment, {
      player: input.player,
      date: input.date,
      amount: input.amount,
      void: input.void,
      reason: input.reason.trim(),
      by: me.player,
      at: serverTimestamp(),
      audit,
    });
    save.set(doc(league, 'audit', audit), auditEntry(me, 'score.adjust', `adjustments/${adjustment.id}`, input.reason));
    await save.commit();
  });
