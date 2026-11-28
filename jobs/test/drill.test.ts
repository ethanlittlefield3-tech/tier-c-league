import { Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';
import { drillReport } from '../lib/drill.ts';

const at = Timestamp.fromMillis(1_800_000_000_000);
const backup = [
  { path: 'leagues/L1', data: { name: 'Sunday Squad', members: { a: true, b: true }, at } },
  { path: 'leagues/L1/players/a', data: { displayName: 'Maya', car: { body: 'dart', paint: 'cobalt' } } },
];

describe('The restore drill', () => {
  it('Passes when every document comes back exactly, whatever order its fields are in', () => {
    const restored = [
      { path: 'leagues/L1', data: { members: { b: true, a: true }, at, name: 'Sunday Squad' } },
      { path: 'leagues/L1/players/a', data: { car: { paint: 'cobalt', body: 'dart' }, displayName: 'Maya' } },
    ];
    expect(drillReport(backup, restored)).toEqual({ backup: 2, restored: 2, missing: 0, different: 0, extra: 0, leagues: 1, ok: true });
  });

  it('Fails on a document missing, changed or extra, and on an empty backup', () => {
    expect(drillReport(backup, [backup[0]!])).toMatchObject({ missing: 1, ok: false });
    expect(drillReport(backup, [backup[0]!, { path: 'leagues/L1/players/a', data: { displayName: 'Sam', car: { body: 'dart', paint: 'cobalt' } } }])).toMatchObject({ different: 1, ok: false });
    expect(drillReport(backup, [...backup, { path: 'codes/X', data: {} }])).toMatchObject({ extra: 1, ok: false });
    expect(drillReport([], [])).toMatchObject({ ok: false });
  });
});
