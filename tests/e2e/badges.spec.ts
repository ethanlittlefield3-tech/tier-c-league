import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type Page } from '@playwright/test';
import { enterAsCommish } from './helpers.ts';
import { createLeague, finishWeekOne, listIds, quietPlayer, readDoc, startSeason, writeDoc, type TestLeague } from './league.ts';

const run = promisify(execFile);
const weeklyJob = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });

async function runWeekly(league: TestLeague): Promise<string> {
  const { stdout } = await run(process.execPath, [weeklyJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
  return stdout;
}

test.describe('Badges', () => {
  test('When a week goes final, badges are earned for good, announced in the feed, and listed in Profile', async ({ page, request }) => {
    const league = await createLeague(request);
    const season = await startSeason(request, league);
    await quietPlayer(request, league, 'riley', 'Riley');
    const dates = await finishWeekOne(request, season);
    await writeDoc(request, `${season.path}/weeks/w01`, { week: 1, mode: 'regular', pairs: [{ a: league.commish, b: 'riley' }] });
    // Six perfect goal days with no screen time at all.
    for (const date of dates.slice(0, 6)) {
      await writeDoc(request, `${season.path}/days/${league.commish}_${date}`, { player: league.commish, date, goals: { mind: true, body: true, wildcard: true }, screenMinutes: 0, beers: 0, firstAt: new Date(), updatedAt: new Date() });
    }
    expect(await runWeekly(league)).toMatch(/badges? earned/);

    const badges = Object.keys(((await readDoc(request, `leagues/${league.id}/players/${league.commish}`))?.badges ?? {}) as Record<string, unknown>);
    expect(badges).toEqual(expect.arrayContaining(['firstBlood', 'perfectWeek', 'scholar', 'gymRat', 'wildOne', 'hatTrick', 'monkMode', 'touchGrass', 'blowout', 'foundingMember', 'commish']));
    // Riley logged nothing, so earned nothing but the season they played.
    expect(Object.keys(((await readDoc(request, `leagues/${league.id}/players/riley`))?.badges ?? {}) as Record<string, unknown>)).toEqual(['foundingMember']);
    expect(await listIds(request, `leagues/${league.id}/feed`)).toEqual(expect.arrayContaining([`badge_${league.commish}_firstBlood`, `rank_${league.commish}_s1_w01`]));

    // Running again earns nothing new.
    expect(await runWeekly(league)).not.toMatch(/badges? earned/);

    await enterAsCommish(page, league);
    await tab(page, 'Feed').click();
    // Badges earned together share one line in the feed.
    const news = page.locator('.feed-event[data-kind="badge"]', { hasText: 'First Blood' });
    await expect(news).toContainText(badges.length > 1 ? `You earned ${badges.length} badges` : 'You earned First Blood');
    // Your badges are on League's Badges tab, by the standings.
    await tab(page, 'League').click();
    await page.getByRole('tab', { name: 'Badges', exact: true }).click();
    const panel = page.getByRole('tabpanel', { name: 'Badges' });
    await expect(panel.getByRole('list', { name: 'Earned' })).toContainText('First Blood');
    await expect(panel).toContainText(`${badges.length} of 51 earned`);
  });
});
