import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type Page } from '@playwright/test';
import { joinAs, keepPicksCards, picksCard, tapToEnter } from './helpers.ts';
import { addPlayer, createLeague, finishWeekOne, patchDoc, readDoc, startSeason, writeDoc } from './league.ts';

const run = promisify(execFile);
const weeklyJob = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test.describe('Predictions', () => {
  test("On a week's Monday its picks pop up, once: you pick the winners, they are saved, and a second tap takes one back; closed, Today brings them back until 11:59 pm", async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await startSeason(request, league);
    const key = await joinAs(page, league, 'Riley');
    await keepPicksCards(page);
    const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await addPlayer(request, league, season, 'maya', 'Maya');
    await addPlayer(request, league, season, 'sam', 'Sam');
    // Today is this week's Monday: Maya plays Sam, and you play The House.
    const calendar = `${season.path}/calendar/${season.today}`;
    await patchDoc(request, calendar, { dayIndex: 0 });
    await writeDoc(request, `${season.path}/weeks/w02`, { week: 2, mode: 'regular', pairs: [{ a: 'maya', b: 'sam' }, { a: me, b: 'HOUSE' }] });
    await button(page, "I've saved it").click();

    const card = picksCard(page);
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Week 2 picks' })).toBeVisible();
    await expect(card).toContainText('Picks close tonight at 11:59 pm');
    // The House's matchup isn't picked.
    await expect(card.getByRole('group')).toHaveCount(1);
    const matchup = card.getByRole('group', { name: 'Maya against Sam' });
    await matchup.getByRole('button', { name: 'Sam' }).click();
    await expect(matchup.getByRole('button', { name: 'Sam' })).toHaveAttribute('aria-pressed', 'true');
    const saved = () => readDoc(request, `${season.path}/predictions/w02_${me}`);
    await expect.poll(async () => (await saved())?.picks).toEqual(['sam']);
    await matchup.getByRole('button', { name: 'Maya' }).click();
    await expect.poll(async () => (await saved())?.picks).toEqual(['maya']);
    await matchup.getByRole('button', { name: 'Maya' }).click();
    await expect.poll(async () => (await saved())?.picks).toEqual([]);
    const doc = await saved();
    expect(doc?.date).toBe(season.today);
    expect(doc?.lockAt).toEqual((await readDoc(request, calendar))?.end);

    // Closed, it doesn't pop up again this week; Today brings it back.
    await card.getByRole('button', { name: 'Later' }).click();
    await expect(card).toHaveCount(0);
    const banner = page.getByRole('region', { name: 'Week 2 picks' });
    await expect(banner).toContainText('0 of 1 picked · closes 11:59 pm');
    await page.reload();
    await tapToEnter(page);
    await expect(banner).toBeVisible();
    await expect(card).toHaveCount(0);
    await banner.getByRole('button', { name: 'Pick' }).click();
    await card.getByRole('group', { name: 'Maya against Sam' }).getByRole('button', { name: 'Maya' }).click();
    await expect(card.getByText('1 of 1 picked')).toBeVisible();
    await card.getByRole('button', { name: 'Done' }).click();
    await expect(banner).toHaveCount(0);
    await expect.poll(async () => (await saved())?.picks).toEqual(['maya']);

    // Picks are no longer in League.
    await tab(page, 'League').click();
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Your picks' })).toHaveCount(0);
  });

  test("Any other day, or once Monday's picks are all made, nothing pops up", async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await startSeason(request, league);
    const key = await joinAs(page, league, 'Riley');
    await keepPicksCards(page);
    const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await addPlayer(request, league, season, 'maya', 'Maya');
    await addPlayer(request, league, season, 'sam', 'Sam');
    const calendar = `${season.path}/calendar/${season.today}`;
    await patchDoc(request, calendar, { dayIndex: 3 });
    await writeDoc(request, `${season.path}/weeks/w02`, { week: 2, mode: 'regular', pairs: [{ a: 'maya', b: 'sam' }, { a: me, b: 'HOUSE' }] });
    await button(page, "I've saved it").click();
    await expect(page.locator('.today-points')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Week 2 picks' })).toHaveCount(0);
    await expect(picksCard(page)).toHaveCount(0);

    // Monday, with every matchup picked already on another phone.
    await writeDoc(request, `${season.path}/predictions/w02_${me}`, { player: me, period: 'w02', date: season.today, picks: ['sam'], lockAt: new Date(Date.now() + 3_600_000), at: new Date() });
    await patchDoc(request, calendar, { dayIndex: 0 });
    await page.reload();
    await tapToEnter(page);
    await expect(page.locator('.today-points')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Week 2 picks' })).toHaveCount(0);
    await expect(picksCard(page)).toHaveCount(0);
  });

  test('When the week is final, the weekly job scores the picks and posts a summary in the feed: the best record, the biggest upset and how many picked', async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await startSeason(request, league);
    const key = await joinAs(page, league, 'Riley');
    const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await addPlayer(request, league, season, 'maya', 'Maya');
    await addPlayer(request, league, season, 'sam', 'Sam');
    // Week 1 is over, and Riley beat Maya. Maya picked Riley; Sam picked Maya.
    await writeDoc(request, `${season.path}/weeks/w01`, { week: 1, mode: 'regular', pairs: [{ a: me, b: 'maya' }], targets: { [me]: ['maya'], maya: [me] } });
    const dates = await finishWeekOne(request, season);
    for (const date of dates.slice(0, 6)) {
      await writeDoc(request, `${season.path}/days/${me}_${date}`, { player: me, date, goals: { mind: true, body: true, wildcard: true }, screenMinutes: 0, beers: 0, firstAt: new Date(), updatedAt: new Date() });
    }
    const pickDoc = (player: string, picks: string[]) => ({ player, period: 'w01', date: dates[0]!, picks, lockAt: new Date(Date.now() - 10 * 86_400_000), at: new Date(Date.now() - 11 * 86_400_000) });
    await writeDoc(request, `${season.path}/predictions/w01_maya`, pickDoc('maya', [me]));
    await writeDoc(request, `${season.path}/predictions/w01_sam`, pickDoc('sam', ['maya']));
    await writeDoc(request, `${season.path}/predictions/w01_jo`, pickDoc('jo', ['maya']));

    await run(process.execPath, [weeklyJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
    expect(await readDoc(request, `${season.path}/predictions/w01_maya`)).toMatchObject({ made: 1, right: 1 });
    expect(await readDoc(request, `${season.path}/predictions/w01_sam`)).toMatchObject({ made: 1, right: 0 });
    await button(page, "I've saved it").click();
    await tab(page, 'Feed').click();
    const summary = page.locator('.feed-event[data-kind="picks"]');
    await expect(summary).toContainText('Week 1 picks: Maya called 1 of 1, best in the league');
    await expect(summary).toContainText('Upset of the week: You beat Maya, and only 1 of 3 saw it coming. 3 players picked.');
  });
});
