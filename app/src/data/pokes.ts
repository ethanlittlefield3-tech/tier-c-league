/** A poke (SCOPE.md, "Live rivalry and social"): one "you awake?" push to your opponent a day. */
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';

/** Pokes this week's opponent. It is filed under the day and you, so the league refuses a second one that day. */
export async function poke(me: Me, season: string, date: string, to: string): Promise<void> {
  try {
    const { db } = await connect();
    await setDoc(doc(db, 'leagues', me.league, 'seasons', season, 'pokes', `${date}_${me.player}`), { player: me.player, to, date, at: serverTimestamp() });
  } catch (error) {
    throw trouble(error);
  }
}
