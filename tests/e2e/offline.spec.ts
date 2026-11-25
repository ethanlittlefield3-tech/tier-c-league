import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { joinAs } from './helpers.ts';
import { createLeague, readDoc, setGoals, setWindow, startSeason } from './league.ts';

const goal = (page: Page, lane: string) => page.locator(`.square-goal[data-lane="${lane}"]`);

async function onToday(page: Page, request: APIRequestContext, options: { lockSoon?: boolean } = {}) {
  const league = await createLeague(request, { name: 'Sunday Squad' });
  const season = await startSeason(request, league);
  // Set before the app opens, so the phone already knows when today locks.
  if (options.lockSoon) await setWindow(request, season, season.today, { start: new Date(Date.now() - 30 * 3_600_000), lock: new Date(Date.now() + 3_600_000) });
  const key = await joinAs(page, league, 'Riley');
  const player = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
  await setGoals(request, season, player, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
  await page.getByRole('button', { name: "I've saved it", exact: true }).click();
  await expect(goal(page, 'mind')).toContainText('Read 20 pages');
  return { season, player };
}

test.describe('With no signal', () => {
  test('A banner says so, logging still works, and it goes through when the signal is back', async ({ page, request, context }) => {
    const { season, player } = await onToday(page, request);
    await context.setOffline(true);
    await expect(page.locator('.offline')).toBeVisible();

    await goal(page, 'mind').click();
    await expect(goal(page, 'mind')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.today-status')).toHaveText('Saved on this phone. It goes through when you are back online.');
    // Nothing has reached the league yet.
    expect(await readDoc(request, `${season.path}/days/${player}_${season.today}`)).toBeNull();

    await context.setOffline(false);
    await expect(page.locator('.offline')).toHaveCount(0);
    await expect.poll(async () => (await readDoc(request, `${season.path}/days/${player}_${season.today}`))?.goals, { timeout: 30_000 }).toEqual({ mind: true, body: false, wildcard: false });
    await expect(page.locator('.today-status')).toHaveText('Saved');
  });

  test('An unsent save close to the noon lock gets a warning', async ({ page, request, context }) => {
    // Today locks in an hour.
    await onToday(page, request, { lockSoon: true });
    await context.setOffline(true);
    await goal(page, 'body').click();
    await expect(page.getByRole('alert')).toContainText('This day locks at 12:00 pm.');
    await context.setOffline(false);
    await expect(page.getByRole('alert')).toHaveCount(0, { timeout: 30_000 });
  });
});
