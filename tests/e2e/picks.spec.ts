import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type Page } from '@playwright/test';
import { addDays } from '../../engine/src/calendar.ts';
import { joinAs } from './helpers.ts';
import { addPlayer, createLeague, finishWeekOne, readDoc, startSeason, writeDoc } from './league.ts';

const run = promisify(execFile);
const weeklyJob = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });

test.describe('Predictions', () => {
  test("In League, you pick next week's winners before it starts; your picks are saved, and a second tap takes one back", async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await startSeason(request, league);
    const key = await joinAs(page, league, 'Riley');
    const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await addPlayer(request, league, season, 'maya', 'Maya');
    await addPlayer(request, league, season, 'sam', 'Sam');
    // Next week, Week 3: Maya plays Sam, and you play The House.
    await writeDoc(request, `${season.path}/weeks/w03`, { week: 3, mode: 'regular', pairs: [{ a: 'maya', b: 'sam' }, { a: me, b: 'HOUSE' }] });
    await page.getByRole('button', { name: "I've saved it", exact: true }).click();
    await tab(page, 'League').click();

    const panel = page.getByRole('region', { name: 'Your picks' });
    await expect(panel).toContainText("Pick Week 3's winners by Sunday at 11:59 pm.");
    // The House's matchup isn't picked.
    await expect(panel.getByRole('group')).toHaveCount(1);
    const matchup = panel.getByRole('group', { name: 'Maya against Sam' });
    await matchup.getByRole('button', { name: 'Sam' }).click();
    await expect(matchup.getByRole('button', { name: 'Sam' })).toHaveAttribute('aria-pressed', 'true');
    const saved = () => readDoc(request, `${season.path}/predictions/w03_${me}`);
    await expect.poll(async () => (await saved())?.picks).toEqual(['sam']);
    await matchup.getByRole('button', { name: 'Maya' }).click();
    await expect.poll(async () => (await saved())?.picks).toEqual(['maya']);
    await matchup.getByRole('button', { name: 'Maya' }).click();
    await expect.poll(async () => (await saved())?.picks).toEqual([]);
    expect((await saved())?.date).toBe(addDays(season.today, 7 - ((new Date(`${season.today}T12:00:00Z`).getUTCDay() + 6) % 7)));
  });

  test('When the week is final, the weekly job scores the picks, and the top picker gets a shoutout in the feed', async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await startSeason(request, league);
    const key = await joinAs(page, league, 'Riley');
    const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await addPlayer(request, league, season, 'maya', 'Maya');
    // Week 1 is over, and Riley beat Maya. Maya had picked Riley.
    await writeDoc(request, `${season.path}/weeks/w01`, { week: 1, mode: 'regular', pairs: [{ a: me, b: 'maya' }], targets: { [me]: ['maya'], maya: [me] } });
    const dates = await finishWeekOne(request, season);
    for (const date of dates.slice(0, 6)) {
      await writeDoc(request, `${season.path}/days/${me}_${date}`, { player: me, date, goals: { mind: true, body: true, wildcard: true }, screenMinutes: 0, beers: 0, firstAt: new Date(), updatedAt: new Date() });
    }
    await writeDoc(request, `${season.path}/predictions/w01_maya`, { player: 'maya', period: 'w01', date: dates[0]!, picks: [me], lockAt: new Date(Date.now() - 10 * 86_400_000), at: new Date(Date.now() - 11 * 86_400_000) });

    await run(process.execPath, [weeklyJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
    expect(await readDoc(request, `${season.path}/predictions/w01_maya`)).toMatchObject({ made: 1, right: 1 });
    await page.getByRole('button', { name: "I've saved it", exact: true }).click();
    await tab(page, 'Feed').click();
    await expect(page.locator('.feed-event[data-kind="picks"]')).toHaveText(/^Top picker in Week 1: Maya, 1 right of 1/);
  });
});
