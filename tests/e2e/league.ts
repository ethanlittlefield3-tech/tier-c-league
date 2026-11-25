// Sets up leagues in the local database for the flow tests, and reads the
// database back, the way a job would: past the security rules. Each test makes
// a league of its own, so tests can run side by side without tripping over
// each other.
import type { APIRequestContext } from '@playwright/test';
import { leagueSeed, newLeague } from '../../jobs/lib/league-seed.ts';

const ROOT = 'http://127.0.0.1:8080/v1/projects/demo-tier-c/databases/(default)/documents';
// The emulator treats this as the project's owner, which the rules do not apply to.
const OWNER = { Authorization: 'Bearer owner' };

type Plain = string | number | boolean | null | Date | { [key: string]: Plain };
type Wire = Record<string, unknown>;

function encode(value: Plain): Wire {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, encode(inner)])) } };
}

function decode(value: Wire): unknown {
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) {
    const fields = (value.mapValue as { fields?: Record<string, Wire> }).fields ?? {};
    return Object.fromEntries(Object.entries(fields).map(([key, inner]) => [key, decode(inner)]));
  }
  return null;
}

export async function writeDoc(request: APIRequestContext, path: string, data: { [key: string]: Plain }): Promise<void> {
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encode(value)]));
  const response = await request.patch(`${ROOT}/${path}`, { headers: OWNER, data: { fields } });
  if (!response.ok()) throw new Error(`Could not write ${path}: ${response.status()} ${await response.text()}`);
}

/** A document's fields, or `null` if there is no such document. */
export async function readDoc(request: APIRequestContext, path: string): Promise<Record<string, unknown> | null> {
  const response = await request.get(`${ROOT}/${path}`, { headers: OWNER });
  if (response.status() === 404) return null;
  if (!response.ok()) throw new Error(`Could not read ${path}: ${response.status()} ${await response.text()}`);
  const body = (await response.json()) as { fields?: Record<string, Wire> };
  return Object.fromEntries(Object.entries(body.fields ?? {}).map(([key, value]) => [key, decode(value)]));
}

/** The ids of the documents in a collection, past the security rules. */
export async function listIds(request: APIRequestContext, path: string): Promise<string[]> {
  const response = await request.get(`${ROOT}/${path}?pageSize=300`, { headers: OWNER });
  if (!response.ok()) throw new Error(`Could not list ${path}: ${response.status()} ${await response.text()}`);
  const body = (await response.json()) as { documents?: { name: string }[] };
  return (body.documents ?? []).map((doc) => doc.name.split('/').pop() ?? '');
}

export interface TestLeague {
  id: string;
  /** The league code, without its dash. */
  code: string;
  name: string;
  /** The commish, who is in the league from the start, and their recovery key. */
  commish: string;
  commishKey: string;
}

const random = (bytes: number) => crypto.getRandomValues(new Uint8Array(bytes));

/**
 * A fresh league, made from the same recipe the real setup job uses, with one
 * player in it already: Alex, the commish. `players` fills it up to that many.
 */
export async function createLeague(
  request: APIRequestContext,
  options: { name?: string; joining?: 'open' | 'closed'; players?: number } = {},
): Promise<TestLeague> {
  const league = newLeague({ name: options.name ?? 'Sunday Squad', commishName: 'Alex', random });
  for (const doc of leagueSeed(league, new Date())) {
    const data = { ...doc.data } as { [key: string]: Plain };
    if (doc.path === `leagues/${league.id}`) {
      const members = data.members as { [player: string]: Plain };
      for (let n = 2; n <= (options.players ?? 1); n += 1) members[`filler${n}`] = true;
      data.joining = options.joining ?? 'open';
    }
    await writeDoc(request, doc.path, data);
  }
  return { id: league.id, code: league.code, name: league.name, commish: league.commish, commishKey: league.commishKey };
}
