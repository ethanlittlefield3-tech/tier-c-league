/**
 * The restore drill (the commish's request, 2026-11-28): after restoring a
 * backup into a throwaway emulator, the database should hold exactly the
 * backup. This sets the two side by side.
 */
import { encodeValue } from './backup.ts';

/** A value as stable text, fields in order, timestamps as the backup writes them. */
function stable(value: unknown): string {
  const encoded = encodeValue(value);
  const sort = (inner: unknown): unknown => {
    if (Array.isArray(inner)) return inner.map(sort);
    if (inner !== null && typeof inner === 'object') return Object.fromEntries(Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, item]) => [key, sort(item)]));
    return inner;
  };
  return JSON.stringify(sort(encoded));
}

export interface DrillReport {
  backup: number;
  restored: number;
  /** Documents in the backup that didn't come back. */
  missing: number;
  /** Documents that came back different. */
  different: number;
  /** Documents in the database the backup doesn't have. */
  extra: number;
  leagues: number;
  ok: boolean;
}

/** The backup against what the restore put back. Counts only, since the drill's log is public. */
export function drillReport(backup: readonly { path: string; data: unknown }[], restored: readonly { path: string; data: unknown }[]): DrillReport {
  const back = new Map(restored.map((doc) => [doc.path, stable(doc.data)]));
  const wanted = new Set(backup.map((doc) => doc.path));
  let missing = 0;
  let different = 0;
  for (const doc of backup) {
    const found = back.get(doc.path);
    if (found === undefined) missing += 1;
    else if (found !== stable(doc.data)) different += 1;
  }
  const extra = restored.filter((doc) => !wanted.has(doc.path)).length;
  const leagues = backup.filter((doc) => /^leagues\/[^/]+$/.test(doc.path)).length;
  return { backup: backup.length, restored: restored.length, missing, different, extra, leagues, ok: backup.length > 0 && missing === 0 && different === 0 && extra === 0 };
}
