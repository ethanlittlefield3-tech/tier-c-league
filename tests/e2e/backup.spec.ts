import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import { readDoc, writeDoc } from './league.ts';

const run = promisify(execFile);
const job = (name: string) => fileURLToPath(new URL(`../../jobs/${name}`, import.meta.url));

async function runJob(name: string, env: Record<string, string> = {}): Promise<string> {
  const { stdout } = await run(process.execPath, [job(name)], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', ...env } });
  return stdout;
}

/** Every file in a folder, by its path inside it, with its contents. */
function tree(dir: string, root = dir): Record<string, string> {
  return Object.fromEntries(
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? Object.entries(tree(full, root)) : [[relative(root, full), readFileSync(full, 'utf8')]];
    }),
  );
}

test.describe('Backups', () => {
  test('A backup and a restore bring a league back exactly as it was', async ({ request }) => {
    // A demo league, settled, with nearly every kind of document in it.
    const id = /id (\S+),/.exec(await runJob('demo-league.ts'))?.[1] ?? '';
    await runJob('weekly.ts', { LEAGUE_ID: id });
    const first = mkdtempSync(join(tmpdir(), 'tcl-backup-'));
    expect(await runJob('backup.ts', { LEAGUE_ID: id, BACKUP_DIR: first })).toMatch(/Backed up \d+ documents/);
    const files = tree(first);
    expect(Object.keys(files)).toEqual(expect.arrayContaining([`leagues/${id}/seasons/s1/days.json`, `leagues/${id}/seasons/s1/weeks.json`, `leagues/${id}/wall.json`, 'codes.json']));
    // No names in a public log: the job only counts.
    expect(files['codes.json']).toContain(id);

    // The league is lost.
    await runJob('delete-demo.ts', { DEMO_LEAGUE_ID: id });
    expect(await readDoc(request, `leagues/${id}`)).toBeNull();

    // Restored from the backup, a new backup matches the first one file for file.
    expect(await runJob('restore.ts', { LEAGUE_ID: id, BACKUP_DIR: first, RESTORE_CONFIRM: 'restore' })).toMatch(/Restored \d+ documents/);
    const second = mkdtempSync(join(tmpdir(), 'tcl-backup-'));
    await runJob('backup.ts', { LEAGUE_ID: id, BACKUP_DIR: second });
    expect(tree(second)).toEqual(files);

    // A restore also takes away what the backup didn't have.
    await writeDoc(request, `leagues/${id}/wall/late`, { by: 'x', kind: 'brag', text: 'Posted after the backup', to: null, at: new Date(), deleted: false });
    expect(await runJob('restore.ts', { LEAGUE_ID: id, BACKUP_DIR: first, RESTORE_CONFIRM: 'restore' })).toMatch(/deleted 1 /);
    expect(await readDoc(request, `leagues/${id}/wall/late`)).toBeNull();
  });

  test("A restore needs the word \"restore\", and a backup won't overwrite a folder that isn't a backup", async () => {
    const folder = mkdtempSync(join(tmpdir(), 'tcl-backup-'));
    await expect(runJob('restore.ts', { BACKUP_DIR: folder })).rejects.toThrow(/RESTORE_CONFIRM/);
    writeFileSync(join(folder, 'notes.txt'), 'Something else');
    await expect(runJob('backup.ts', { LEAGUE_ID: 'none', BACKUP_DIR: folder })).rejects.toThrow(/isn't a backup|aren't a backup/);
    expect(readFileSync(join(folder, 'notes.txt'), 'utf8')).toBe('Something else');
  });
});
