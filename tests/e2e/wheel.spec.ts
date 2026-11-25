import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type Page } from '@playwright/test';
import { enterAsCommish, joinAs } from './helpers.ts';
import { createLeague, readDoc, startSeason, writeDoc, type TestLeague } from './league.ts';

const run = promisify(execFile);
const weeklyJob = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });

async function runWeekly(league: TestLeague): Promise<string> {
  const { stdout } = await run(process.execPath, [weeklyJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
  return stdout;
}

test.describe('The Wheel of Shame', () => {
  test("When a week is final, its lowest scorer spins the Wheel live, and everyone sees the sealed dare it lands on", async ({ page, request, browser }) => {
    const league = await createLeague(request);
    const season = await startSeason(request, league);
    const phone = await (await browser.newContext()).newPage();
    const key = await joinAs(phone, league, 'Riley');
    await button(phone, "I've saved it").click();
    const riley = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);

    // Week 1 is final, and Riley had the lowest score.
    await writeDoc(request, `${season.path}/weeks/w01`, {
      week: 1,
      mode: 'regular',
      pairs: [{ a: league.commish, b: riley }],
      status: 'final',
      settledAt: new Date(),
      finalAt: new Date(),
      results: {
        [league.commish]: { player: league.commish, opponent: riley, points: 30, opponentPoints: 20, outcome: 'win', seasonPoints: 35, beers: 0 },
        [riley]: { player: riley, opponent: league.commish, points: 20, opponentPoints: 30, outcome: 'loss', seasonPoints: 20, beers: 0 },
      },
      lines: [],
      awards: { mvp: [league.commish], bust: [], wheel: [riley] },
    });

    // The weekly job seals Riley's draw from the 8 starter dares.
    expect(await runWeekly(league)).toContain('1 Wheel draw sealed');
    const drawId = `w01_${riley}_1`;
    const wheel = (await readDoc(request, `${season.path}/weeks/w01`))?.wheel as Record<string, { pool: string[]; player: string }>;
    expect(wheel[drawId]?.player).toBe(riley);
    expect(wheel[drawId]?.pool).toHaveLength(8);
    const sealed = await readDoc(request, `${season.path}/sealed/wheel_${drawId}`);
    expect(wheel[drawId]?.pool).toContain(sealed?.dare);
    // Running it again draws nothing new.
    expect(await runWeekly(league)).not.toContain('Wheel draw');

    // Alex, the commish, watches from Feed.
    await enterAsCommish(page, league);
    await tab(page, 'Feed').click();
    await expect(page.locator('.wheel-banner')).toContainText('Week 1: Riley spins live.');
    await button(page, 'Open the Wheel').click();
    await expect(page.getByText('Waiting for Riley to spin.')).toBeVisible();

    // Riley's Today says it is their spin.
    await expect(phone.getByRole('heading', { name: 'You spin the Wheel of Shame' })).toBeVisible();
    await button(phone, 'Open the Wheel').click();
    await button(phone, 'Spin the Wheel').click();

    // Both phones land on the dare that was sealed when the week went final.
    await expect(phone.locator('.wheel-dare')).toHaveText(`Your dare: ${String(sealed?.dare)}`);
    await expect(page.locator('.wheel-dare')).toHaveText(`Riley's dare: ${String(sealed?.dare)}`);
    expect(await readDoc(request, `${season.path}/spins/${drawId}`)).toMatchObject({ player: riley, period: 'w01' });
    await phone.context().close();
  });
});
