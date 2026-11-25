/** Rematch challenges (SCOPE.md, "Rematch challenge"): a side race the week after a loss. */
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';

/** Challenges whoever beat you in `lost` to a side race in `period`, the week after. Filed under the lost week and you. */
export async function challenge(me: Me, season: string, input: { lost: string; period: string; date: string; to: string }): Promise<void> {
  try {
    const { db } = await connect();
    await setDoc(doc(db, 'leagues', me.league, 'seasons', season, 'rematches', `${input.lost}_${me.player}`), { from: me.player, to: input.to, lost: input.lost, period: input.period, date: input.date, at: serverTimestamp() });
  } catch (error) {
    throw trouble(error);
  }
}
