/**
 * Reading the whole database, or one league of it, for the backup and the
 * restore. Proof photos are never read (`SKIPPED` in `lib/backup.ts`).
 */
import type { CollectionReference, DocumentReference, Firestore } from 'firebase-admin/firestore';
import { LEAVES, SKIPPED } from './lib/backup.ts';

export interface StoredDoc {
  path: string;
  data: Record<string, unknown>;
}

/** Every document in a collection, and in the collections under each unless it is a leaf. */
async function walk(db: Firestore, collection: CollectionReference, into: StoredDoc[]): Promise<void> {
  if (SKIPPED.includes(collection.id)) return;
  if (LEAVES.includes(collection.id)) {
    for (const doc of (await collection.get()).docs) into.push({ path: doc.ref.path, data: doc.data() });
    return;
  }
  // A document can hold collections without having fields of its own, so list them all.
  const refs = await collection.listDocuments();
  for (let start = 0; start < refs.length; start += 300) {
    const chunk = refs.slice(start, start + 300);
    const snapshots = chunk.length ? await db.getAll(...chunk) : [];
    for (const doc of snapshots) if (doc.exists) into.push({ path: doc.ref.path, data: doc.data()! });
    await Promise.all(chunk.map((ref) => inside(db, ref, into)));
  }
}

async function inside(db: Firestore, ref: DocumentReference, into: StoredDoc[]): Promise<void> {
  for (const collection of await ref.listCollections()) await walk(db, collection, into);
}

/** Every document, or only one league's and its code's, in order of path. */
export async function readEverything(db: Firestore, league?: string): Promise<StoredDoc[]> {
  const into: StoredDoc[] = [];
  if (league) {
    for (const code of (await db.collection('codes').where('league', '==', league).get()).docs) into.push({ path: code.ref.path, data: code.data() });
    const root = db.collection('leagues').doc(league);
    const snapshot = await root.get();
    if (snapshot.exists) into.push({ path: root.path, data: snapshot.data()! });
    await inside(db, root, into);
  } else {
    for (const collection of await db.listCollections()) await walk(db, collection, into);
  }
  return into.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** True if a path is one league's, or its code's. */
export function inLeague(doc: StoredDoc, league: string): boolean {
  return doc.path === `leagues/${league}` || doc.path.startsWith(`leagues/${league}/`) || (doc.path.startsWith('codes/') && doc.data.league === league);
}
