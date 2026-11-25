/**
 * The nightly backup (PHASE1.md, Step 4): every document in the database as
 * JSON, one file per collection, written into BACKUP_DIR. The workflow then
 * commits the folder to the private backups repo, so its history holds every
 * night. Proof photos are left out: they are deleted after 14 days anyway.
 *
 *   On GitHub:  every night (Actions, "Back up the league"), and by hand
 *   Locally:    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 BACKUP_DIR=backup-out node jobs/backup.ts
 *
 * LEAGUE_ID limits it to one league and its code. The folder is replaced
 * whole, and only if it holds a backup already or nothing at all. Logs are
 * public, so it logs counts only.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { getFirestore } from 'firebase-admin/firestore';
import { connect } from './admin.ts';
import { readEverything } from './database.ts';
import { toFiles } from './lib/backup.ts';

const MARK = '.tier-c-backup';
const { app, emulator } = connect();
const db = getFirestore(app);
const out = process.env.BACKUP_DIR?.trim();
if (!out) throw new Error('Set BACKUP_DIR to the folder the backup goes in.');
const folder = resolve(out);
if (existsSync(folder) && readdirSync(folder).length > 0 && !existsSync(join(folder, MARK))) {
  throw new Error(`${out} holds files that aren't a backup. Point BACKUP_DIR at an empty folder.`);
}

const docs = await readEverything(db, process.env.LEAGUE_ID?.trim() || undefined);
const files = toFiles(docs);
rmSync(folder, { recursive: true, force: true });
mkdirSync(folder, { recursive: true });
writeFileSync(join(folder, MARK), 'Written by jobs/backup.ts. Each file is one collection, one document per line.\n');
for (const file of files) {
  mkdirSync(dirname(join(folder, file.name)), { recursive: true });
  writeFileSync(join(folder, file.name), file.text);
}
console.log(`Backed up ${docs.length} documents in ${files.length} collections${emulator ? ' from the local emulator' : ''}. Proof photos are left out.`);
