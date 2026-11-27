import { expect, test, type Page } from '@playwright/test';
import { enterAsCommish } from './helpers.ts';
import { createLeague, patchDoc, quietPlayer, setTargets, startSeason, writeDoc } from './league.ts';

const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });
const dot = (page: Page, name: string) => tab(page, name).locator('.frame-dot');

/** A second after the phone's own time now: after its last look, whatever its clock says. */
const soon = async (page: Page) => new Date((await page.evaluate(() => Date.now())) + 1000);

test.describe('What is new', () => {
  test('A dot marks a tab with something new since you last opened it: a post by someone else on Feed, your opponent logging today on Game Day, a week going final on League; opening the tab clears it', async ({ page, request }) => {
    const league = await createLeague(request);
    const season = await startSeason(request, league);
    await quietPlayer(request, league, 'riley', 'Riley');
    await setTargets(request, season, { [league.commish]: ['riley'], riley: [league.commish] });
    await enterAsCommish(page, league);
    for (const name of ['Feed', 'League', 'Garage']) await expect(dot(page, name)).toHaveCount(0);

    await writeDoc(request, `leagues/${league.id}/wall/hello`, { by: 'riley', kind: 'brag', text: 'Gym at 6. Again.', to: null, at: await soon(page), deleted: false });
    await expect(tab(page, 'Feed')).toHaveAccessibleDescription('New posts since you last looked');
    await expect(dot(page, 'Feed')).toBeVisible();
    await tab(page, 'Feed').click();
    await expect(page.getByText('Gym at 6. Again.')).toBeVisible();
    await expect(dot(page, 'Feed')).toHaveCount(0);

    await writeDoc(request, `${season.path}/days/riley_${season.today}`, {
      player: 'riley',
      date: season.today,
      goals: { mind: true, body: false, wildcard: false },
      screenMinutes: null,
      beers: 0,
      firstAt: await soon(page),
      updatedAt: await soon(page),
    });
    await expect(tab(page, 'Game Day')).toHaveAccessibleDescription('Your opponent has logged since you last looked');
    await tab(page, 'Game Day').click();
    await expect(dot(page, 'Game Day')).toHaveCount(0);

    await patchDoc(request, `${season.path}/weeks/w01`, { period: 'w01', week: 1, finalAt: await soon(page) });
    await expect(tab(page, 'League')).toHaveAccessibleDescription('New results since you last looked');
    await tab(page, 'League').click();
    await expect(dot(page, 'League')).toHaveCount(0);

    // Looked at, each stays clear.
    await tab(page, 'Garage').click();
    for (const name of ['Feed', 'Game Day', 'League']) await expect(dot(page, name)).toHaveCount(0);
  });
});
