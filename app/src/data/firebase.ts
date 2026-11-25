/**
 * The connection to the database. This file and `identity.ts` are the only
 * ones that load the Firebase library, and the app loads them in the
 * background while the intro plays, so the first screen never waits on them.
 *
 * There are no accounts. Each device signs in namelessly and gets an ID of its
 * own. What makes that device a player is its claim in the league, which holds
 * the player's recovery key (see firebase/firestore.rules).
 */
import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, connectAuthEmulator, indexedDBLocalPersistence, initializeAuth, signInAnonymously } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { backend } from './backend.ts';

export interface Connection {
  db: Firestore;
  /** This device's own ID. */
  device: string;
}

/** Thrown when the league's database has not been set up yet. */
export class NoBackend extends Error {
  constructor() {
    super('The league database has not been set up yet.');
    this.name = 'NoBackend';
  }
}

let connection: Promise<Connection> | null = null;

async function open(): Promise<Connection> {
  const where = backend();
  if (!where) throw new NoBackend();

  const app = initializeApp(where.options);
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  // The phone keeps its own copy of what it has read and the saves it hasn't
  // sent yet, so the app works with no signal and catches up when it's back
  // (PHASE1.md, "Offline"). If the phone can't keep a copy, it simply works
  // online only.
  let db: Firestore;
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch {
    db = initializeFirestore(app, {});
  }
  if (where.emulators) {
    const host = window.location.hostname;
    connectAuthEmulator(auth, `http://${host}:${where.emulators.authPort}`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, where.emulators.firestorePort);
  }

  // A device that has been here before still has its ID. A new one gets one now.
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return { db, device: user.uid };
}

/** Connects once, and hands every caller the same connection. A failed try can be tried again. */
export function connect(): Promise<Connection> {
  connection ??= open().catch((error: unknown) => {
    connection = null;
    throw error;
  });
  return connection;
}
