import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import { enter } from './helpers.ts';
import { readDoc } from './league.ts';

const run = promisify(execFile);
const job = fileURLToPath(new URL('../../jobs/create-league.ts', import.meta.url));

/** Runs the real setup job against the local database, the way GitHub runs it against the real one. */
async function createLeagueWithTheJob(name: string) {
  const { stdout } = await run(process.execPath, [job], {
    env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_NAME: name },
  });
  const id = /id ([a-z0-9]+),/.exec(stdout)?.[1] ?? '';
  return { id, log: stdout };
}

test.describe('Setting up a league', () => {
  test('The setup job makes a league, and its commish gets in with the code and key from the database', async ({ page, request }) => {
    const { id, log } = await createLeagueWithTheJob('Thursday Night League');
    expect(id).not.toBe('');

    // The commish reads these two in the Firebase console. Here the test reads them the same way.
    const league = await readDoc(request, `leagues/${id}`);
    const code = String(league?.code);
    const commish = String(league?.commish);
    const key = String((await readDoc(request, `leagues/${id}/keys/${commish}`))?.key);

    await enter(page);
    await page.getByRole('button', { name: "I'm already in a league" }).click();
    await page.getByLabel('League code').fill(code);
    await page.getByLabel('Recovery key').fill(key);
    await page.getByRole('button', { name: 'Find my profile' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back, Commish' })).toBeVisible();
    await page.getByRole('button', { name: "I've saved it" }).click();
    await expect(page.getByRole('heading', { name: "You're in, Commish." })).toBeVisible();
    await expect(page.getByText('Thursday Night League')).toBeVisible();

    // The job's log is public, so it must not give away the code or the key.
    expect(log).not.toContain(code);
    expect(log).not.toContain(key);
    expect(log).not.toContain(key.replaceAll('-', ''));
  });

  test('A league made by the job is open, so a new player can join it with the code', async ({ page, request }) => {
    const { id } = await createLeagueWithTheJob('Thursday Night League');
    const code = String((await readDoc(request, `leagues/${id}`))?.code);

    await enter(page);
    await page.getByRole('button', { name: 'Join a league' }).click();
    await page.getByLabel('League code').fill(code);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('Display name').fill('Maya');
    await page.getByRole('button', { name: 'Join the league' }).click();
    await expect(page.getByRole('heading', { name: 'Save your recovery key' })).toBeVisible();
    expect(Object.keys((await readDoc(request, `leagues/${id}`))?.members as object)).toHaveLength(2);
  });

  test('Running the job twice makes two separate leagues, never one on top of the other', async ({ request }) => {
    const first = await createLeagueWithTheJob('Thursday Night League');
    const second = await createLeagueWithTheJob('Thursday Night League');
    expect(second.id).not.toBe(first.id);
    const [a, b] = await Promise.all([readDoc(request, `leagues/${first.id}`), readDoc(request, `leagues/${second.id}`)]);
    expect(a?.code).not.toBe(b?.code);
    expect(a?.commish).not.toBe(b?.commish);
  });
});
