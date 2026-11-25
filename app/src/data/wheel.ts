/**
 * The Wheel of Shame (SCOPE.md): the spinner taps Spin, once, which reveals
 * the sealed draw to everyone at once.
 */
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
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
