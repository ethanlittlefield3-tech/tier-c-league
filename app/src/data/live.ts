/**
 * Live documents: the screen updates the moment anything changes, on this
 * phone or anyone else's. A save made on this phone shows at once, marked as
 * pending until the server accepts it.
 */
import { Timestamp, collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { connect } from './firebase.ts';
import { trouble, type Trouble } from './identity.ts';

export interface Live {
  /** The document's fields, with timestamps as milliseconds, or `null` if there is no such document. */
  data: Record<string, unknown> | null;
  /** True while a save from this phone has not reached the server yet. */
  pending: boolean;
}

/** Timestamps become plain milliseconds, so screens never need the database library. */
function plain(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toMillis();
  if (Array.isArray(value)) return value.map(plain);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, plain(inner)]));
  }
  return value;
}

/** Calls `onChange` with the document now and after every change. Returns a function that stops watching. */
export function watchDoc(path: string, onChange: (live: Live) => void, onError: (why: Trouble) => void): () => void {
  let stop: (() => void) | null = null;
  let stopped = false;
  connect().then(
    ({ db }) => {
      if (stopped) return;
      stop = onSnapshot(
        doc(db, path),
        { includeMetadataChanges: true },
        (snapshot) => {
          const data = snapshot.exists() ? (plain(snapshot.data({ serverTimestamps: 'estimate' })) as Record<string, unknown>) : null;
          onChange({ data, pending: snapshot.metadata.hasPendingWrites });
        },
        (error) => onError(trouble(error).why),
      );
    },
    (error: unknown) => onError(trouble(error).why),
  );
  return () => {
    stopped = true;
    stop?.();
  };
}

/** Every document in a collection whose `field` equals `value`, now and after every change. */
export function watchWhere(
  path: string,
  field: string,
  value: string,
  onChange: (docs: { id: string; data: Record<string, unknown> }[]) => void,
  onError: (why: Trouble) => void,
): () => void {
  let stop: (() => void) | null = null;
  let stopped = false;
  connect().then(
    ({ db }) => {
      if (stopped) return;
      stop = onSnapshot(
        query(collection(db, path), where(field, '==', value)),
        (snapshot) => onChange(snapshot.docs.map((found) => ({ id: found.id, data: plain(found.data({ serverTimestamps: 'estimate' })) as Record<string, unknown> }))),
        (error) => onError(trouble(error).why),
      );
    },
    (error: unknown) => onError(trouble(error).why),
  );
  return () => {
    stopped = true;
    stop?.();
  };
}

/**
 * One look at a document that may not be readable yet, such as a Demolition
 * still sealed. `null` when there is no such document or it is still sealed:
 * the rules answer both the same way, on purpose.
 */
export async function peekDoc(path: string): Promise<Record<string, unknown> | null> {
  try {
    const { db } = await connect();
    const found = await getDoc(doc(db, path));
    return found.exists() ? (plain(found.data()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Every document in a collection, now and after every change. */
export function watchAll(path: string, onChange: (docs: { id: string; data: Record<string, unknown> }[]) => void, onError: (why: Trouble) => void): () => void {
  let stop: (() => void) | null = null;
  let stopped = false;
  connect().then(
    ({ db }) => {
      if (stopped) return;
      stop = onSnapshot(
        collection(db, path),
        (snapshot) => onChange(snapshot.docs.map((found) => ({ id: found.id, data: plain(found.data({ serverTimestamps: 'estimate' })) as Record<string, unknown> }))),
        (error) => onError(trouble(error).why),
      );
    },
    (error: unknown) => onError(trouble(error).why),
  );
  return () => {
    stopped = true;
    stop?.();
  };
}
