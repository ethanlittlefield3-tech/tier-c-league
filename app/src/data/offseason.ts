/**
 * The offseason (SCOPE.md, "Seasons"): once a season is over, everyone taps
 * Stay or Leave by the commish's deadline.
 */
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';

/** Your answer, which you can change until the deadline. */
export async function answerStay(me: Me, season: string, choice: 'stay' | 'leave'): Promise<void> {
  try {
    const { db } = await connect();
    await setDoc(doc(db, 'leagues', me.league, 'seasons', season, 'stays', me.player), { player: me.player, choice, at: serverTimestamp() });
  } catch (error) {
    throw trouble(error);
  }
}
