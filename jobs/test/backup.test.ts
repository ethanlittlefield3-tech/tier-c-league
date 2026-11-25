import { describe, expect, it } from 'vitest';
import { SKIPPED, decodeValue, encodeValue, fromFiles, toFiles, type Stamp } from '../lib/backup.ts';

/** A timestamp as the database library gives it: seconds and nanoseconds. */
const stamp = (seconds: number, nanoseconds: number): Stamp => ({ seconds, nanoseconds, kind: 'time' });
const toStamp = (seconds: number, nanoseconds: number) => stamp(seconds, nanoseconds);

const docs = [
  { path: 'codes/JKLMNPQR', data: { league: 'L1', name: 'Test League' } },
  { path: 'leagues/L1', data: { name: 'Test League', members: { p1: true, p2: true }, season: 's1', coCommish: null } },
  { path: 'leagues/L1/players/p1', data: { displayName: 'Alex', joinedAt: stamp(1_790_000_000, 123_456_789) } },
  { path: 'leagues/L1/seasons/s1/days/p1_2027-01-04', data: { goals: { mind: true, body: false, wildcard: true }, screenMinutes: 45, beers: 0, ruleOneIssue: [stamp(1, 0), stamp(2, 500)] } },
  { path: 'leagues/L1/seasons/s1/days/p1_2027-01-05', data: { goals: { mind: false, body: false, wildcard: false }, screenMinutes: null, beers: 2 } },
];

describe('Backups', () => {
  it('A timestamp keeps every nanosecond, and everything else is kept as it is', () => {
    const value = { at: stamp(1_790_000_000, 123_456_789), list: [1, 'two', null, true, { deep: stamp(5, 6) }] };
    const encoded = encodeValue(value);
    expect(JSON.parse(JSON.stringify(encoded))).toEqual(encoded);
    expect(decodeValue(encoded, toStamp)).toEqual(value);
  });

  it('A field that happens to look like a timestamp is still kept as written', () => {
    const value = { $time: 'not one', note: { $time: [1, 2, 3] } };
    expect(decodeValue(JSON.parse(JSON.stringify(encodeValue(value))), toStamp)).toEqual(value);
  });

  it('Each collection is one file, one document per line, in a fixed order, so a day with few changes is a small change', () => {
    const files = toFiles(docs);
    expect(files.map((file) => file.name)).toEqual(['codes.json', 'leagues.json', 'leagues/L1/players.json', 'leagues/L1/seasons/s1/days.json']);
    const days = files.find((file) => file.name === 'leagues/L1/seasons/s1/days.json')!.text;
    expect(days.split('\n').filter((line) => line.startsWith('"'))).toHaveLength(2);
    expect(toFiles([...docs].reverse())).toEqual(files);
  });

  it('A snapshot read back gives every document exactly as it was', () => {
    expect(fromFiles(toFiles(docs), toStamp)).toEqual(docs);
  });

  it('Proof photos are left out: they are deleted after 14 days anyway, and would make every backup large', () => {
    expect(SKIPPED).toEqual(['proofs', 'dareProofs']);
    const files = toFiles([...docs, { path: 'leagues/L1/seasons/s1/proofs/p1_2027-01-04_body', data: { photo: 'data:image/jpeg;base64,AAAA', at: stamp(1, 0) } }]);
    expect(files.map((file) => file.name)).not.toContain('leagues/L1/seasons/s1/proofs.json');
  });

  it('Anything the app never stores, like a document reference, stops the backup rather than being lost', () => {
    expect(() => encodeValue({ ref: new Map() })).toThrow(/can't be backed up/);
  });
});
