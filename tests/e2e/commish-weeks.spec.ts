import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { addDays } from '../../engine/src/calendar.ts';
import { enterAsCommish, joinAs } from './helpers.ts';
import { createLeague, patchDoc, readDoc, startSeason, thisWeek, writeDoc, type TestLeague, type TestSeason } from './league.ts';

const run = promisify(execFile);
const weeklyJob = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const H = 3_600_000;

async function runWeekly(league: TestLeague): Promise<string> {
  const { stdout } = await run(process.execPath, [weeklyJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
  return stdout;
}

/** Week 1, moved wholly into the past, so it is final whatever day the test runs. Returns its dates. */
async function finishWeekOne(request: APIRequestContext, season: TestSeason): Promise<string[]> {
  const monday = addDays(thisWeek(season).dates[0]!, -7);
  const dates = [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(monday, offset));
  for (const [index, date] of dates.entries()) {
    const start = Date.now() - (9 - index) * 24 * H;
    await patchDoc(request, `${season.path}/calendar/${date}`, { start: new Date(start), lock: new Date(start + 36 * H), nextEnd: new Date(start + 48 * H) });
  }
  return dates;
}

/** Opens Commish tools on the commish's phone, at the Weeks and dares panel. */
async function openModeration(page: Page) {
  await button(page, 'Your profile, Alex').click();
  await button(page, 'Commish tools').click();
  const panel = page.getByRole('region', { name: 'Weeks and dares' });
  await panel.scrollIntoViewIfNeeded();
  return panel;
}

test.describe('Commish tools: weeks and dares', () => {
  test('Unlocking a final week lets a late fix count: the weekly job counts it again, then it is final again', async ({ page, request, browser }) => {
    const league = await createLeague(request);
    const season = await startSeason(request, league);
    const phone = await (await browser.newContext()).newPage();
    const key = await joinAs(phone, league, 'Riley');
    const riley = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    const dates = await finishWeekOne(request, season);
    await writeDoc(request, `${season.path}/weeks/w01`, { week: 1, mode: 'regular', pairs: [{ a: league.commish, b: riley }] });
    await runWeekly(league);
    const points = async () => ((await readDoc(request, `${season.path}/weeks/w01`))?.results as Record<string, { points: number }>)[riley]?.points;
    expect((await readDoc(request, `${season.path}/weeks/w01`))?.status).toBe('final');
    const before = await points();

    // A dock after the week went final doesn't count while it stays final.
    await writeDoc(request, `${season.path}/adjustments/late1`, { player: riley, date: dates[2]!, amount: -1, void: null, reason: 'Late call', by: league.commish, at: new Date(), audit: 'x' });
    await runWeekly(league);
    expect(await points()).toBe(before);

    // The commish unlocks it, with a reason.
    await enterAsCommish(page, league);
    const panel = await openModeration(page);
    await panel.getByRole('button', { name: 'Unlock' }).click();
    await panel.getByLabel('Reason').fill('Count the late dock');
    await panel.getByRole('button', { name: 'Unlock Week 1' }).click();
    await expect(panel.getByRole('status')).toHaveText('Week 1 is unlocked. The weekly job counts it again within the hour.');
    await expect.poll(async () => (await readDoc(request, `${season.path}/weeks/w01`))?.status).toBe('provisional');
    const audit = String((await readDoc(request, `${season.path}/weeks/w01`))?.audit);
    expect(await readDoc(request, `leagues/${league.id}/audit/${audit}`)).toMatchObject({ action: 'week.unlock', target: 'weeks/w01', reason: 'Count the late dock' });

    // The job counts it again, dock and all, and it is final again.
    await runWeekly(league);
    expect((await readDoc(request, `${season.path}/weeks/w01`))?.status).toBe('final');
    expect(await points()).toBe((before ?? 0) - 1);
    await phone.context().close();
  });

  test('Taking a dare off the Wheel keeps it out of the next draw', async ({ page, request, browser }) => {
    const league = await createLeague(request);
    const season = await startSeason(request, league);
    const phone = await (await browser.newContext()).newPage();
    const key = await joinAs(phone, league, 'Riley');
    const riley = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await writeDoc(request, `${season.path}/dares/${riley}`, { text: 'Something unkind', version: 1 });

    await enterAsCommish(page, league);
    const panel = await openModeration(page);
    await panel.getByRole('button', { name: "Remove Riley's dare" }).click();
    await panel.getByLabel('Reason').fill('Not in the spirit of the game');
    await panel.getByRole('button', { name: 'Remove the dare' }).click();
    await expect(panel.getByRole('status')).toHaveText("Riley's dare is off the Wheel.");
    await expect.poll(async () => (await readDoc(request, `${season.path}/dares/${riley}`))?.removed).toBe(true);

    // Week 1 is final and Riley spins: the wheel holds the starters, not the removed dare.
    await writeDoc(request, `${season.path}/weeks/w01`, {
      week: 1,
      mode: 'regular',
      pairs: [{ a: league.commish, b: riley }],
      status: 'final',
      settledAt: new Date(),
      finalAt: new Date(),
      results: {},
      lines: [],
      awards: { mvp: [], bust: [], wheel: [riley] },
    });
    expect(await runWeekly(league)).toContain('1 Wheel draw sealed');
    const wheel = (await readDoc(request, `${season.path}/weeks/w01`))?.wheel as Record<string, { pool: string[] }>;
    expect(wheel[`w01_${riley}_1`]?.pool).toHaveLength(8);
    expect(wheel[`w01_${riley}_1`]?.pool).not.toContain('Something unkind');
    await phone.context().close();
  });
});
