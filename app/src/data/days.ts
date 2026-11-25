/**
 * Saving a day's log. The security rules decide whether it is accepted: only
 * your own day, only while it is open, and only sensible values.
 *
 * The save shows on screen at once. With no signal it waits and is sent when
 * the phone is back online, and a save that arrives after the day locks is
 * refused (SCOPE.md, "Logging window").
 */
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import type { DayEntry } from '../today/model.ts';
import { connect } from './firebase.ts';
import { trouble } from './identity.ts';

export async function saveDay(input: { league: string; season: string; player: string; date: string; entry: DayEntry; isNew: boolean }): Promise<void> {
  try {
    const { db } = await connect();
    const day = doc(db, 'leagues', input.league, 'seasons', input.season, 'days', `${input.player}_${input.date}`);
    const fields = {
      goals: { mind: input.entry.goals.mind, body: input.entry.goals.body, wildcard: input.entry.goals.wildcard },
      screenMinutes: input.entry.screenMinutes,
      beers: input.entry.beers,
      updatedAt: serverTimestamp(),
    };
    if (input.isNew) await setDoc(day, { player: input.player, date: input.date, ...fields, firstAt: serverTimestamp() });
    else await updateDoc(day, fields);
  } catch (error) {
    throw trouble(error);
  }
}
