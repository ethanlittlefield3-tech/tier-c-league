/** Predictions (SCOPE.md, "Predictions"; ruling R25): a week's winners, picked on its Monday. */
import { Timestamp, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';

/** Saves your picks for a week: the players you think will win. They lock as its Monday ends, at 11:59 pm. */
export async function savePicks(me: Me, season: string, input: { period: string; monday: string; lockAt: number; picks: string[] }): Promise<void> {
  try {
    const { db } = await connect();
    await setDoc(doc(db, 'leagues', me.league, 'seasons', season, 'predictions', `${input.period}_${me.player}`), {
      player: me.player,
      period: input.period,
      date: input.monday,
      picks: input.picks,
      lockAt: Timestamp.fromMillis(input.lockAt),
      at: serverTimestamp(),
    });
  } catch (error) {
    throw trouble(error);
  }
}
