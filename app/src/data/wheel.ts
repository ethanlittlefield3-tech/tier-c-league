/**
 * The Wheel of Shame (SCOPE.md): the spinner taps Spin, once, which reveals
 * the sealed draw to everyone at once.
 */
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';

export const spinTheWheel = async (me: Me, season: string, draw: { id: string; period: string }) => {
  try {
    const { db } = await connect();
    await setDoc(doc(db, 'leagues', me.league, 'seasons', season, 'spins', draw.id), { player: me.player, period: draw.period, at: serverTimestamp(), proofAt: null });
  } catch (error) {
    throw trouble(error);
  }
};

/** Proves a Wheel dare with a photo, already shrunk to 300 KB or less. */
export const proveDare = async (me: Me, season: string, drawId: string, photo: string) => {
  try {
    const { db } = await connect();
    const seasonRef = doc(db, 'leagues', me.league, 'seasons', season);
    const save = writeBatch(db);
    save.set(doc(seasonRef, 'dareProofs', drawId), { photo, at: serverTimestamp() });
    save.update(doc(seasonRef, 'spins', drawId), { proofAt: serverTimestamp() });
    await save.commit();
  } catch (error) {
    throw trouble(error);
  }
};

/** Counts or Doesn't count on someone's dare proof. Voting again changes the vote. */
export const voteOnProof = async (me: Me, season: string, input: { player: string; draw: string; choice: 'counts' | 'doesntCount' }) => {
  try {
    const { db } = await connect();
    await setDoc(doc(db, 'leagues', me.league, 'seasons', season, 'votes', `${me.player}_proof_${input.draw}`), { voter: me.player, kind: 'proof', ...input, at: serverTimestamp() });
  } catch (error) {
    throw trouble(error);
  }
};
