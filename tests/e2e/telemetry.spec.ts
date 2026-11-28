import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type Page } from '@playwright/test';
import { enterAsCommish } from './helpers.ts';
import { createLeague, readDoc, seasonInSetup, type TestLeague } from './league.ts';

const run = promisify(execFile);
const job = (name: string) => fileURLToPath(new URL(`../../jobs/${name}.ts`, import.meta.url));
const emulator = { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c' };
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });

test.describe('Telemetry', () => {
  test('The fifth tab: your form as one number on a gauge, then where your points go, your lanes, screen time, your week, how steady you are, and you against the league', async ({ page }) => {
    const { stdout } = await run(process.execPath, [job('demo-league')], { env: emulator });
    const id = /id ([a-z0-9]+),/.exec(stdout)?.[1] ?? '';
    // Settle its weeks, as the workflow does: ranks, and each player's habits on the week.
    await run(process.execPath, [job('weekly')], { env: { ...emulator, LEAGUE_ID: id } });
    expect(Object.keys(((await readDoc(page.request, `leagues/${id}/seasons/s1/weeks/w01`))?.stats ?? {}) as object)).toHaveLength(6);
    const league = await readDoc(page.request, `leagues/${id}`);
    const commish = String(league?.commish);
    const key = String((await readDoc(page.request, `leagues/${id}/keys/${commish}`))?.key);
    await enterAsCommish(page, { id, code: String(league?.code), name: 'Demo League', commish, commishKey: key } as TestLeague);

    await tab(page, 'Telemetry').click();
    const hero = page.getByRole('region', { name: 'Your form' });
    await expect(hero.locator('.tm-readout-label')).toHaveText('Form');
    await expect(hero.locator('.tm-number')).toHaveText(/^\d{1,3}$/);
    await expect(hero.locator('.tm-rank')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Where your points go' }).locator('.tm-bars li')).toHaveCount(4);
    await expect(page.getByRole('region', { name: 'Where your points go' }).locator('.tm-tip')).not.toBeEmpty();
    await expect(page.getByRole('region', { name: 'Goals by lane' }).locator('li')).toHaveCount(3);
    await expect(page.getByRole('region', { name: 'Your week' }).locator('li')).toHaveCount(7);
    await expect(page.getByRole('region', { name: 'Consistency' })).toContainText('Days logged');
    const league6 = page.getByRole('region', { name: 'You against the league' });
    await expect(league6).toContainText('Points a week');
    await expect(league6.locator('.tm-place').first()).toHaveText(/of 6$/);
  });

  test('Before the season, it says when it starts', async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    await seasonInSetup(request, league);
    await enterAsCommish(page, league);
    await tab(page, 'Telemetry').click();
    await expect(page.getByRole('region', { name: 'Your form' })).toContainText('Your telemetry starts on kickoff day.');
    await expect(page.getByRole('region', { name: 'You against the league' })).toContainText('The league comes in once the first week is settled.');
  });
});
