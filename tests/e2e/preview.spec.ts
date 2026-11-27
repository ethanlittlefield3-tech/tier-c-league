import { expect, test, type Page } from '@playwright/test';
import { enterAsCommish } from './helpers.ts';
import { createLeague, listIds } from './league.ts';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function openPreview(page: Page) {
  await page.getByRole('button', { name: /^Your profile/ }).click();
  await button(page, 'Commish tools').click();
  await button(page, 'Open the preview').click();
  await expect(page.getByRole('heading', { name: 'Group play preview' })).toBeVisible();
}

test.describe('The group play preview', () => {
  test('From Commish tools, the commish can try all six group-play modes in a made-up league, on the real boards', async ({ page, request }) => {
    const league = await createLeague(request);
    await enterAsCommish(page, league);
    await openPreview(page);
    const modes = page.getByRole('group', { name: 'Mode' });
    await expect(modes.getByRole('button')).toHaveText(['Rumble', 'Team Week', '2v2', 'Bounty Week', 'Drop Shot', 'Alley']);
    await expect(page.getByRole('region', { name: 'Week 1: Team Week' })).toBeVisible();
    await expect(page.locator('.mode-banner')).toContainText('Maya');
    for (const [mode, title] of [
      ['2v2', 'Week 1: 2v2'],
      ['Bounty Week', 'Week 1: Bounty Week'],
      ['Alley', 'Week 1: Alley'],
      ['Drop Shot', 'Week 1: Drop Shot'],
      ['Rumble', 'Week 1: Rumble'],
    ]) {
      await modes.getByRole('button', { name: mode, exact: true }).click();
      await expect(page.getByRole('region', { name: title })).toBeVisible();
    }
    await expect(page.getByRole('list', { name: "Today's items" })).toContainText('Your item:');
    await modes.getByRole('button', { name: 'Drop Shot', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Drop Shot', exact: true })).toBeVisible();
  });

  test('Your own day can be logged in the preview and moves the board; Final settles the week the real way; none of it reaches the league', async ({ page, request }) => {
    const league = await createLeague(request);
    await enterAsCommish(page, league);
    await openPreview(page);
    await page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Alley', exact: true }).click();
    const board = page.getByRole('region', { name: 'Week 1: Alley' });
    const before = await board.getByRole('list', { name: 'The race' }).textContent();
    const goals = page.getByRole('group', { name: 'Your goals' });
    for (const name of ['Mind', 'Body', 'Wildcard']) {
      const goal = goals.getByRole('button', { name, exact: true });
      if ((await goal.getAttribute('aria-pressed')) === 'true') await goal.click();
    }
    await expect.poll(async () => board.getByRole('list', { name: 'The race' }).textContent()).not.toBe(before);

    await page.getByRole('group', { name: 'Day of the week' }).getByRole('button', { name: 'Final', exact: true }).click();
    const result = page.getByRole('region', { name: 'How the week settles' });
    await expect(result.getByRole('list', { name: 'Season Points' }).getByRole('listitem')).toHaveCount(6);
    await expect(result).toContainText(/\+[0-9] SP/);
    // The made-up week leaves the real league alone.
    expect(await listIds(request, `leagues/${league.id}/seasons`)).toEqual([]);
  });
});
