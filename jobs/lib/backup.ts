/**
 * Backups (PHASE1.md, Step 4): every document in the database as JSON, one
 * file per collection, committed each night to the private backups repo. The
 * repo's history is the list of dates a restore can go back to.
 *
 * Pure: the jobs read and write the database and the files. Timestamps keep
 * every nanosecond, so a restored day compares equal with the original in the
 * security rules.
 */

/** A timestamp as the database library describes one. */
export interface Stamp {
  seconds: number;
  nanoseconds: number;
  [key: string]: unknown;
}

/** Proof photos are left out: they are deleted after 14 days anyway, and would make every backup large. */
export const SKIPPED = ['proofs', 'dareProofs'];

/**
 * Collections whose documents never have collections of their own, so the
 * backup doesn't ask each of their documents for any. Every other collection,
 * including any added later, is asked, so nothing new is missed.
 */
export const LEAVES = [
  'codes', 'players', 'keys', 'lookup', 'claims', 'audit', 'joinRequests', 'taunts', 'suggestions', 'feed', 'comments',
  'calendar', 'days', 'kit', 'sealed', 'adjustments', 'receipts', 'receiptSlots', 'weeks', 'roster', 'votes', 'dares', 'spins', 'standings', 'draft', 'config',
];

const TIME = '$time';

function isStamp(value: object): value is Stamp {
  const maybe = value as { seconds?: unknown; nanoseconds?: unknown; toMillis?: unknown; kind?: unknown };
  return typeof maybe.seconds === 'number' && typeof maybe.nanoseconds === 'number' && (typeof maybe.toMillis === 'function' || maybe.kind === 'time');
}

/** A field value as JSON. A key that starts with `$` gets one more, so it can't be mistaken for a timestamp. */
export function encodeValue(value: unknown): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`The number ${value} can't be backed up.`);
    return value;
  }
  if (Array.isArray(value)) return value.map(encodeValue);
  if (typeof value === 'object') {
    if (isStamp(value)) return { [TIME]: [value.seconds, value.nanoseconds] };
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key.startsWith('$') ? `$${key}` : key, encodeValue(inner)]));
    }
  }
  throw new Error(`A ${typeof value === 'object' ? (value as object).constructor?.name ?? 'value' : typeof value} can't be backed up.`);
}

/** A field value from JSON, with timestamps made by `toStamp`. */
export function decodeValue<T>(value: unknown, toStamp: (seconds: number, nanoseconds: number) => T): unknown {
  if (Array.isArray(value)) return value.map((inner) => decodeValue(inner, toStamp));
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 1 && entries[0]![0] === TIME) {
      const [seconds, nanoseconds] = entries[0]![1] as [number, number];
      return toStamp(seconds, nanoseconds);
    }
    return Object.fromEntries(entries.map(([key, inner]) => [key.startsWith('$$') ? key.slice(1) : key, decodeValue(inner, toStamp)]));
  }
  return value;
}

/** The collection a document is in, and its id. */
export function splitPath(path: string): { collection: string; id: string; name: string } {
  const at = path.lastIndexOf('/');
  const collection = path.slice(0, at);
  return { collection, id: path.slice(at + 1), name: collection.slice(collection.lastIndexOf('/') + 1) };
}

/**
 * The snapshot's files: one per collection, named by its path, with one
 * document per line in order of id. A day with few changes is then a small
 * change in the backups repo.
 */
export function toFiles(docs: { path: string; data: Record<string, unknown> }[]): { name: string; text: string }[] {
  const byCollection = new Map<string, [string, unknown][]>();
  for (const doc of docs) {
    const { collection, id, name } = splitPath(doc.path);
    if (SKIPPED.includes(name)) continue;
    const list = byCollection.get(collection) ?? [];
    list.push([id, encodeValue(doc.data)]);
    byCollection.set(collection, list);
  }
  return [...byCollection.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([collection, list]) => ({
      name: `${collection}.json`,
      text: `{\n${list
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([id, data]) => `${JSON.stringify(id)}: ${JSON.stringify(data)}`)
        .join(',\n')}\n}\n`,
    }));
}

/** Every document in a snapshot's files, in order of path. */
export function fromFiles<T>(files: { name: string; text: string }[], toStamp: (seconds: number, nanoseconds: number) => T): { path: string; data: Record<string, unknown> }[] {
  return files
    .flatMap((file) => {
      const collection = file.name.replace(/\.json$/, '');
      return Object.entries(JSON.parse(file.text) as Record<string, unknown>).map(([id, data]) => ({ path: `${collection}/${id}`, data: decodeValue(data, toStamp) as Record<string, unknown> }));
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
