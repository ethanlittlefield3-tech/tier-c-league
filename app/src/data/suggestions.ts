/**
 * The suggestion box (SCOPE.md, "Suggestion box"): anyone posts an idea, the
 * others upvote it, and the commish tags it Planned, Maybe or No. Its author
 * takes it down, or the commish does, which goes in the league log.
 */
import { collection, deleteField, doc, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { connect } from './firebase.ts';
import { trouble, type Me } from './identity.ts';

export type IdeaTag = 'planned' | 'maybe' | 'no';

async function attempt<T>(work: (db: Firestore) => Promise<T>): Promise<T> {
  try {
    const { db } = await connect();
    return await work(db);
  } catch (error) {
    throw trouble(error);
  }
}

/** Posts an idea in your name. */
export const postIdea = (me: Me, text: string) =>
  attempt((db) => setDoc(doc(collection(db, 'leagues', me.league, 'suggestions')), { by: me.player, text, at: serverTimestamp(), tag: null, votes: {}, deleted: false }));

/** Your upvote on someone else's idea, on or taken back. */
export const upvoteIdea = (me: Me, idea: string, on: boolean) =>
  attempt((db) => updateDoc(doc(db, 'leagues', me.league, 'suggestions', idea), { [`votes.${me.player}`]: on ? true : deleteField() }));

/** The commish's tag on an idea, or none. */
export const tagIdea = (me: Me, idea: string, tag: IdeaTag | null) => attempt((db) => updateDoc(doc(db, 'leagues', me.league, 'suggestions', idea), { tag }));

/** Takes an idea down. Your own goes quietly; the commish taking down someone else's goes in the league log. */
export const takeDownIdea = (me: Me, idea: string, mine: boolean) =>
  attempt(async (db) => {
    const ref = doc(db, 'leagues', me.league, 'suggestions', idea);
    if (mine) return updateDoc(ref, { deleted: true, text: '' });
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(ref, { deleted: true, text: '', audit });
    save.set(doc(league, 'audit', audit), { by: me.player, at: serverTimestamp(), action: 'idea.delete', target: `suggestions/${idea}`, reason: 'Took down an idea' });
    await save.commit();
  });
