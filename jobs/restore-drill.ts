/**
 * The restore drill (the commish's request, 2026-11-28): proves the newest
 * backup can really be restored. It restores it into a throwaway local
 * emulator, never the real database, then checks every document came back
 * exactly as the backup has it. Run by the "Restore drill" workflow once a
 * month, and by hand.
 *
 *   firebase emulators:exec --only firestore "BACKUP_DIR=backups/snapshot node jobs/restore-drill.ts"
 *
 * It refuses to run anywhere but an emulator. Logs are public: counts only.
 */
import { execFile } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { connect } from './admin.ts';
import { readEverything } from './database.ts';
import { fromFiles } from './lib/backup.ts';
import { drillReport } from './lib/drill.ts';

if (!process.env.FIRESTORE_EMULATOR_HOST?.trim() || process.env.FIREBASE_SERVICE_ACCOUNT?.trim()) {
  throw new Error('The restore drill only runs against a local emulator, never the real database.');
}
const out = process.env.BACKUP_DIR?.trim();
if (!out) throw new Error('Set BACKUP_DIR to the backup folder to drill with.');
const folder = resolve(out);

function filesIn(dir: string): { name: string; text: string }[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return filesIn(full);
    if (!entry.endsWith('.json')) return [];
    return [{ name: relative(folder, full).split(sep).join('/'), text: readFileSync(full, 'utf8') }];
  });
}

const backup = fromFiles(filesIn(folder), (seconds, nanoseconds) => new Timestamp(seconds, nanoseconds));
// The same restore a real one runs, into the emulator.
await promisify(execFile)(process.execPath, [fileURLToPath(new URL('./restore.ts', import.meta.url))], { env: { ...process.env, RESTORE_CONFIRM: 'restore', BACKUP_DIR: folder } });
const { app } = connect();
const report = drillReport(backup, await readEverything(getFirestore(app)));
console.log(`Restore drill: ${report.backup} documents in the backup across ${report.leagues} league${report.leagues === 1 ? '' : 's'}; ${report.restored} restored, ${report.missing} missing, ${report.different} different, ${report.extra} extra.`);
if (!report.ok) throw new Error('The restore drill failed: the backup did not come back exactly.');
console.log('Restore drill passed: the backup comes back exactly.');
