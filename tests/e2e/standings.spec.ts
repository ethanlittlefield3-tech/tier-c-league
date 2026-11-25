import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { addDays } from '../../engine/src/calendar.ts';
import { joinAs } from './helpers.ts';
import { addPlayer, createLeague, patchDoc, readDoc, setGoals, startSeason, thisWeek, writeDoc, type TestLeague, type TestSeason } from './league.ts';

const run = promisify(execFile);
const job = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });
const H = 3_600_000;

async function runWeekly(league: TestLeague): Promise<string> {
  const { stdout } = await run(process.execPath, [job], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
  return stdout;
}

/** Week 1, moved wholly into the past, so it is final whatever day the test runs. */
async function finishWeekOne(request: APIRequestContext, season: TestSeason): Promise<string[]> {
  const monday = addDays(thisWeek(season).dates[0]!, -7);
  const dates = [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(monday, offset));
  for (const [index, date] of dates.entries()) {
    const start = Date.now() - (9 - index) * 24 * H;
    await patchDoc(request, `${season.path}/calendar/${date}`, { start: new Date(start), lock: new Date(start + 36 * H), nextEnd: new Date(start + 48 * H) });
  }
  return dates;
}

/** A logged day: the goals listed, 30 minutes of screen time, no beers. */
const logged = (player: string, date: string, goals: { mind: boolean; body: boolean; wildcard: boolean }) => ({
  player,
  date,
  goals,
  screenMinutes: 30,
  beers: 0,
  firstAt: new Date(),
  updatedAt: new Date(),
});

test.describe('Settling a week, and the League tab', () => {
  test('After a week ends, the job settles it: results, Season Points and the standings show in League', async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await startSeason(request, league);
    const key = await joinAs(page, league, 'Riley');
    const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await setGoals(request, season, me, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
    await addPlayer(request, league, season, 'maya', 'Maya');
    await writeDoc(request, `${season.path}/weeks/w01`, { week: 1, mode: 'regular', pairs: [{ a: me, b: 'maya' }], targets: { [me]: ['maya'], maya: [me] } });
    const dates = await finishWeekOne(request, season);
    // Riley hits all three goals every day but Sunday; Maya hits one.
    for (const date of dates.slice(0, 6)) {
      await writeDoc(request, `${season.path}/days/${me}_${date}`, logged(me, date, { mind: true, body: true, wildcard: true }));
      await writeDoc(request, `${season.path}/days/maya_${date}`, logged('maya', date, { mind: true, body: false, wildcard: false }));
    }

    expect(await runWeekly(league)).toContain('w01: final, 2 players.');
    const week = await readDoc(request, `${season.path}/weeks/w01`);
    // Riley: 6 a day for 6 days, and Sunday is a rest day with nothing logged: -3. 33.
    expect((week?.results as Record<string, { points: number; outcome: string; seasonPoints: number }>)[me]).toMatchObject({ points: 33, outcome: 'win', seasonPoints: 38 });
    expect((week?.awards as { mvp: string[] }).mvp).toEqual([me]);

    await page.getByRole('button', { name: "I've saved it", exact: true }).click();
    await tab(page, 'League').click();
    const first = page.locator('.standings tbody tr').first();
    await expect(first).toContainText('You');
    await expect(first.locator('.standings-points')).toHaveText('38');
    await expect(first).toContainText('1–0–0');
    await expect(page.locator('.result-head').first()).toContainText('Week 1');
    await expect(page.locator('.result-head').first()).toContainText('Final');
    await expect(page.locator('.result-awards').first()).toContainText('MVP: You.');
    await expect(page.locator('.result-awards').first()).toContainText('Spins the Wheel: Maya.');

    // Running it again changes nothing.
    const before = (await readDoc(request, `${season.path}/standings/current`))?.rows;
    expect(await runWeekly(league)).toContain('Done: 0 weeks settled');
    expect((await readDoc(request, `${season.path}/standings/current`))?.rows).toEqual(before);
  });

  test('Before any week settles, League says when the standings start', async ({ page, request }) => {
    const league = await createLeague(request);
    await startSeason(request, league);
    await joinAs(page, league, 'Riley');
    await page.getByRole('button', { name: "I've saved it", exact: true }).click();
    await tab(page, 'League').click();
    await expect(page.getByText('The standings start once Week 1 settles')).toBeVisible();
  });
});
