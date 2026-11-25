/**
 * The wall (SCOPE.md, "Live rivalry and social"): taunts and quick chat aimed
 * at another player, brags with comments, and fire, skull and beer reactions.
 * Nobody edits a post. Its author takes it down, or the commish does, which
 * goes in the league log. Taking something down blanks its words.
 */
import { collection, doc, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from 'firebase/firestore';
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

export type PostKind = 'quick' | 'taunt' | 'brag';

export interface Reaction {
  fire: boolean;
  skull: boolean;
  beer: boolean;
}

/** Puts a post on the wall. A brag is aimed at nobody; a taunt or quick-chat line at one player. */
export const postToWall = (me: Me, input: { kind: PostKind; text: string; to: string | null }) =>
  attempt(async (db) => {
    const ref = doc(collection(db, 'leagues', me.league, 'wall'));
    await setDoc(ref, { by: me.player, kind: input.kind, text: input.text, to: input.to, at: serverTimestamp(), deleted: false });
    return ref.id;
  });

/**
 * A comment on a brag. The post is stamped in the same save, so the alerts
 * job can tell its author about new activity without reading every post.
 */
export const commentOn = (me: Me, post: string, text: string) =>
  attempt(async (db) => {
    const ref = doc(db, 'leagues', me.league, 'wall', post);
    const save = writeBatch(db);
    save.set(doc(collection(ref, 'comments')), { by: me.player, text, at: serverTimestamp(), deleted: false });
    save.update(ref, { activityAt: serverTimestamp() });
    await save.commit();
  });

/** Your fire, skull and beer on a post, each on or off. The post is stamped, as for a comment. */
export const react = (me: Me, post: string, reaction: Reaction) =>
  attempt((db) => updateDoc(doc(db, 'leagues', me.league, 'wall', post), { [`reactions.${me.player}`]: reaction, activityAt: serverTimestamp() }));

/**
 * Takes a post, or a comment on one, down. Your own goes quietly; the
 * commish taking down anyone else's goes in the league log.
 */
export const takeDown = (me: Me, input: { post: string; comment?: string; mine: boolean }) =>
  attempt(async (db) => {
    const parts = input.comment ? ['wall', input.post, 'comments', input.comment] : ['wall', input.post];
    const ref = doc(db, 'leagues', me.league, ...parts);
    if (input.mine) return updateDoc(ref, { deleted: true, text: '' });
    const league = doc(db, 'leagues', me.league);
    const audit = doc(collection(league, 'audit')).id;
    const save = writeBatch(db);
    save.update(ref, { deleted: true, text: '', audit });
    save.set(doc(league, 'audit', audit), { by: me.player, at: serverTimestamp(), action: 'wall.delete', target: parts.join('/'), reason: input.comment ? 'Took down a comment' : 'Took down a post' });
    await save.commit();
  });

/** Your saved custom taunts, kept on your profile. */
export const saveTaunts = (me: Me, taunts: string[]) => attempt((db) => updateDoc(doc(db, 'leagues', me.league, 'players', me.player), { taunts }));
