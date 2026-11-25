/**
 * Getting into a league: joining with the league code, and getting back in on
 * a new phone with a recovery key (SCOPE.md, "League, seasons and players").
 *
 * Each of these is one save that the security rules accept or refuse as a
 * whole, so a player can never be left half joined.
 */
import { makeRecoveryKey } from '@tcl/engine';
import { collection, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { recall, remember } from '../storage.ts';
import { NoBackend, connect } from './firebase.ts';

/** Who this phone is, once it is in a league. */
export interface Me {
  league: string;
  leagueName: string;
  code: string;
  player: string;
  displayName: string;
}

/**
 * Why something could not be done.
 * - `not-open`: the league's database has not been set up yet.
 * - `offline`: no answer from the database.
 * - `refused`: the security rules said no.
 */
export type Trouble = 'not-open' | 'offline' | 'refused';

export class Failed extends Error {
  readonly why: Trouble;
  constructor(why: Trouble) {
    super(why);
    this.name = 'Failed';
    this.why = why;
  }
}

/** A note on this phone of which league and player it is, so the next open knows where to look. */
const ME_KEY = 'tcl.me';
/** How long to wait for the database before calling it offline. */
const PATIENCE = 15_000;

function freshKey(): string {
  return makeRecoveryKey(crypto.getRandomValues(new Uint8Array(8)));
}

/** Turns anything that went wrong into one of the three kinds of trouble. */
function trouble(error: unknown): Failed {
  if (error instanceof Failed) return error;
  if (error instanceof NoBackend) return new Failed('not-open');
  // The database's errors carry a code. This one means the security rules said no.
  if ((error as { code?: unknown } | null)?.code === 'permission-denied') return new Failed('refused');
  return new Failed('offline');
}

/** A save waits forever with no signal, so give up after a while and say so. */
function patiently<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Failed('offline')), PATIENCE);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(trouble(error));
      },
    );
  });
}

function saveMe(me: Me): void {
  remember(ME_KEY, JSON.stringify({ league: me.league, code: me.code, player: me.player }));
}

function savedMe(): { league: string; code: string; player: string } | null {
  try {
    const note = JSON.parse(recall(ME_KEY) ?? 'null') as Record<string, unknown> | null;
    if (note && typeof note.league === 'string' && typeof note.code === 'string' && typeof note.player === 'string') {
      return { league: note.league, code: note.code, player: note.player };
    }
  } catch {
    // A note that can't be read is treated as no note.
  }
  return null;
}

/** Looks a league up by its code. `null` means no league has that code. */
export async function findLeague(code: string): Promise<{ league: string; name: string } | null> {
  return patiently(
    (async () => {
      const { db } = await connect();
      const found = await getDoc(doc(db, 'codes', code));
      const data = found.data();
      return data ? { league: String(data.league), name: String(data.name) } : null;
    })(),
  );
}

/**
 * Joins a league as a new player. Resolves to the player and their new
 * recovery key, which the app must show before going on.
 */
export async function join(input: { league: string; leagueName: string; code: string; displayName: string }): Promise<{ me: Me; key: string }> {
  return patiently(
    (async () => {
      const { db, device } = await connect();
      const league = doc(db, 'leagues', input.league);
      const player = doc(collection(league, 'players')).id;
      const key = freshKey();

      const save = writeBatch(db);
      save.update(league, { [`members.${player}`]: true });
      save.set(doc(league, 'players', player), { displayName: input.displayName, joinedAt: serverTimestamp() });
      save.set(doc(league, 'keys', player), { key, rotatedAt: serverTimestamp() });
      save.set(doc(league, 'lookup', key), { player });
      save.set(doc(league, 'claims', device), { player, key, code: input.code, at: serverTimestamp() });
      await save.commit();

      const me: Me = { league: input.league, leagueName: input.leagueName, code: input.code, player, displayName: input.displayName };
      saveMe(me);
      return { me, key };
    })(),
  );
}

/**
 * Gets back into a profile with its recovery key. The key is replaced in the
 * same save, which signs every other device out. Resolves to `null` if the key
 * belongs to nobody in this league.
 */
export async function recover(input: { league: string; leagueName: string; code: string; key: string }): Promise<{ me: Me; key: string } | null> {
  return patiently(
    (async () => {
      const { db, device } = await connect();
      const league = doc(db, 'leagues', input.league);
      const holder = (await getDoc(doc(league, 'lookup', input.key))).data();
      if (!holder) return null;
      const player = String(holder.player);
      const key = freshKey();

      const save = writeBatch(db);
      save.update(doc(league, 'keys', player), { key, prev: input.key, rotatedAt: serverTimestamp() });
      save.delete(doc(league, 'lookup', input.key));
      save.set(doc(league, 'lookup', key), { player });
      save.set(doc(league, 'claims', device), { player, key, at: serverTimestamp() });
      await save.commit();

      const profile = (await getDoc(doc(league, 'players', player))).data();
      const me: Me = { league: input.league, leagueName: input.leagueName, code: input.code, player, displayName: String(profile?.displayName ?? '') };
      saveMe(me);
      return { me, key };
    })(),
  );
}

/**
 * Who this phone is, checked with the database.
 * - `null`: this phone has never joined a league.
 * - `signed-out`: it had joined, but its key no longer matches. The profile
 *   was opened on another phone, or the commish reset the key.
 */
export async function whoAmI(): Promise<Me | { signedOut: true; code: string } | null> {
  const note = savedMe();
  if (!note) return null;
  try {
    return await patiently(
      (async () => {
        const { db } = await connect();
        const league = doc(db, 'leagues', note.league);
        const [leagueDoc, profile] = await Promise.all([getDoc(league), getDoc(doc(league, 'players', note.player))]);
        return {
          league: note.league,
          leagueName: String(leagueDoc.data()?.name ?? ''),
          code: note.code,
          player: note.player,
          displayName: String(profile.data()?.displayName ?? ''),
        };
      })(),
    );
  } catch (error) {
    if (error instanceof Failed && error.why === 'refused') return { signedOut: true, code: note.code };
    throw error;
  }
}
