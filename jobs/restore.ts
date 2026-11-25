/**
 * Restore (PHASE1.md, Step 4): puts the database back as a backup found it.
 * Every document in the backup is written back as it was, and every document
 * the backup doesn't have is deleted. Proof photos aren't in backups, so they
 * are left as they are.
 *
 *   On GitHub:  Actions, "Restore from a backup", with the date, by hand only
 *   Locally:    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 BACKUP_DIR=backup-out RESTORE_CONFIRM=restore node jobs/restore.ts
 *
 * RESTORE_CONFIRM must be "restore", because this replaces what is there now.
 * LEAGUE_ID limits it to one league and its code. Logs are public, so it logs
 * counts only.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { Timestamp, getFirestore, type WriteBatch } from 'firebase-admin/firestore';
import { connect } from './admin.ts';
import { inLeague, readEverything } from './database.ts';
import { fromFiles } from './lib/backup.ts';

if (process.env.RESTORE_CONFIRM?.trim() !== 'restore') throw new Error('Set RESTORE_CONFIRM to "restore": a restore replaces what is in the database now.');
const out = process.env.BACKUP_DIR?.trim();
if (!out) throw new Error('Set BACKUP_DIR to the backup folder to restore from.');
const folder = resolve(out);
const league = process.env.LEAGUE_ID?.trim() || undefined;

const { app, emulator } = connect();
const db = getFirestore(app);

/** Every file in the folder, by its path inside it. */
function filesIn(dir: string): { name: string; text: string }[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return filesIn(full);
    if (!entry.endsWith('.json')) return [];
    return [{ name: relative(folder, full).split(sep).join('/'), text: readFileSync(full, 'utf8') }];
  });
}

const wanted = fromFiles(filesIn(folder), (seconds, nanoseconds) => new Timestamp(seconds, nanoseconds)).filter((doc) => !league || inLeague(doc, league));
if (wanted.length === 0) throw new Error(`The backup in ${out} has no documents${league ? ` for league ${league}` : ''}. Nothing was changed.`);
const keep = new Set(wanted.map((doc) => doc.path));
const extra = (await readEverything(db, league)).filter((doc) => !keep.has(doc.path));

// At most 500 changes go in one save.
const changes: ((batch: WriteBatch) => void)[] = [
  ...wanted.map((doc) => (batch: WriteBatch) => batch.set(db.doc(doc.path), doc.data)),
  ...extra.map((doc) => (batch: WriteBatch) => batch.delete(db.doc(doc.path))),
];
for (let start = 0; start < changes.length; start += 400) {
  const batch = db.batch();
  for (const change of changes.slice(start, start + 400)) change(batch);
  await batch.commit();
}
console.log(`Restored ${wanted.length} documents${emulator ? ' in the local emulator' : ''}, and deleted ${extra.length} the backup didn't have.`);
