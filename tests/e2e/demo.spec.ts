import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type Page } from '@playwright/test';
import { enterAsCommish } from './helpers.ts';
import { createLeague, readDoc, type TestLeague } from './league.ts';

const run = promisify(execFile);
const job = (name: string) => fileURLToPath(new URL(`../../jobs/${name}.ts`, import.meta.url));
const emulator = { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c' };
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });

test.describe('The demo league', () => {
  test('The demo job makes a league to try every screen: a receipt on Today, a matchup, the wall, the Wheel and the standings', async ({ page }) => {
    const { stdout } = await run(process.execPath, [job('demo-league')], { env: emulator });
    const id = /id ([a-z0-9]+),/.exec(stdout)?.[1] ?? '';
    expect(id).not.toBe('');
    expect(stdout).not.toMatch(/TCL-[A-Z0-9]{4}-[A-Z0-9]{4}/);
    // Settle its weeks, as the workflow does next.
    const weekly = await run(process.execPath, [job('weekly')], { env: { ...emulator, LEAGUE_ID: id } });
    expect(weekly.stdout).toContain('Wheel draw');

    // Get in as the demo's commish, with the code and key from the database.
    const league = await readDoc(page.request, `leagues/${id}`);
    const commish = String(league?.commish);
    const key = String((await readDoc(page.request, `leagues/${id}/keys/${commish}`))?.key);
    const demo: TestLeague = { id, code: String(league?.code), name: 'Demo League', commish, commishKey: key };
    await enterAsCommish(page, demo);

    // Today: Maya wants receipts, and there is an opponent this week.
    await expect(page.getByRole('group', { name: 'Receipts on your Body goal' })).toContainText('Maya wants proof of your Body goal');
    await expect(page.locator('.week-vs')).toContainText('vs');

    // Feed: the Wheel is waiting for you, and Maya's quick-chat line is aimed at you.
    await tab(page, 'Feed').click();
    await expect(page.locator('.wheel-banner')).toContainText('You spin live');
    await expect(page.getByRole('article', { name: 'Quick chat from Maya' })).toContainText('Warm up the Wheel of Shame, Commish.');

    // League: six players in the standings.
    await tab(page, 'League').click();
    await expect(page.locator('table.standings tbody tr')).toHaveCount(6);
  });

  test('The delete job removes a demo league, and refuses any league that is not a demo', async ({ request }) => {
    const real: TestLeague = await createLeague(request);
    const refused = await run(process.execPath, [job('delete-demo')], { env: { ...emulator, DEMO_LEAGUE_ID: real.id } }).catch((failure: { stderr: string }) => failure);
    expect((refused as { stderr: string }).stderr).toContain('is not a demo league, so it is left alone.');
    expect(await readDoc(request, `leagues/${real.id}`)).not.toBeNull();

    const { stdout } = await run(process.execPath, [job('demo-league')], { env: emulator });
    const id = /id ([a-z0-9]+),/.exec(stdout)?.[1] ?? '';
    const code = String((await readDoc(request, `leagues/${id}`))?.code);
    expect((await run(process.execPath, [job('delete-demo')], { env: { ...emulator, DEMO_LEAGUE_ID: id } })).stdout).toContain(`Demo league ${id} deleted.`);
    expect(await readDoc(request, `leagues/${id}`)).toBeNull();
    expect(await readDoc(request, `leagues/${id}/seasons/s1`)).toBeNull();
    expect(await readDoc(request, `codes/${code}`)).toBeNull();
  });
});
