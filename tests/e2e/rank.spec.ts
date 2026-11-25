import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type Page } from '@playwright/test';
import { enterAsCommish, tapToEnter } from './helpers.ts';
import { createLeague, finishWeekOne, patchDoc, quietPlayer, readDoc, startSeason, writeDoc, type TestLeague } from './league.ts';

const run = promisify(execFile);
const weeklyJob = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function runWeekly(league: TestLeague): Promise<void> {
  await run(process.execPath, [weeklyJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
}

async function openProfile(page: Page) {
  await button(page, 'Your profile, Alex').click();
  const panel = page.getByRole('region', { name: 'Rank' });
  await panel.scrollIntoViewIfNeeded();
  return panel;
}

test.describe('Ranks', () => {
  test('Once a week is final, your rank shows in Profile, with your recent weeks', async ({ page, request }) => {
    const league = await createLeague(request);
    const season = await startSeason(request, league);
    await quietPlayer(request, league, 'riley', 'Riley');
    const dates = await finishWeekOne(request, season);
    await writeDoc(request, `${season.path}/weeks/w01`, { week: 1, mode: 'regular', pairs: [{ a: league.commish, b: 'riley' }] });
    for (const date of dates.slice(0, 6)) {
      await writeDoc(request, `${season.path}/days/${league.commish}_${date}`, { player: league.commish, date, goals: { mind: true, body: true, wildcard: true }, screenMinutes: 0, beers: 0, firstAt: new Date(), updatedAt: new Date() });
    }
    await runWeekly(league);

    // Six perfect goal days and a blank Sunday: 36 − 3 = 33 of 39, Grand Champ.
    const profile = await readDoc(request, `leagues/${league.id}/players/${league.commish}`);
    expect(profile?.rank).toBe('grandChamp');
    const against = ((await readDoc(request, `${season.path}/weeks/w01`))?.results as Record<string, { opponentPoints: number }>)[league.commish]!.opponentPoints;
    expect(profile?.rankHistory).toEqual([{ season: 's1', period: 'w01', points: 33, max: 39, rank: 'grandChamp', outcome: 'win', against }]);
    expect((await readDoc(request, `leagues/${league.id}/players/riley`))?.rank).toBe('bronze');

    // A phone's first rank arrives quietly, in Profile.
    await enterAsCommish(page, league);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const panel = await openProfile(page);
    await expect(panel.locator('.rank-name')).toHaveText('Grand Champ');
    await expect(panel.getByRole('list', { name: 'Recent weeks' })).toContainText('Week 1: 33 of 39');
  });

  test('A rank change plays its scene the next time the app opens, once, with your car boosting through; a rank down gets its own', async ({ page, request }) => {
    const league = await createLeague(request);
    const profilePath = `leagues/${league.id}/players/${league.commish}`;
    await patchDoc(request, profilePath, { rank: 'gold', rankHistory: [{ season: 's1', period: 'w01', points: 10, max: 39, rank: 'gold' }] });
    await enterAsCommish(page, league);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    // The phone notes its first rank quietly, with no scene.
    const noted = () => page.evaluate((key) => localStorage.getItem(key), `tcl.rank.${league.id}.${league.commish}`);
    await expect.poll(noted).toBe('gold');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await patchDoc(request, profilePath, { rank: 'platinum' });
    await page.reload();
    await tapToEnter(page);
    const scene = page.getByRole('dialog', { name: 'Platinum' });
    await expect(scene).toBeVisible();
    await expect(scene).toContainText('Rank up');
    await expect(scene.locator('.rankup-car')).toHaveCount(1);
    await scene.click();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

    // Seen once: the next open goes straight in.
    await page.reload();
    await tapToEnter(page);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await patchDoc(request, profilePath, { rank: 'silver' });
    await page.reload();
    await tapToEnter(page);
    const down = page.getByRole('dialog', { name: 'Silver' });
    await expect(down).toContainText('Rank down');
    await expect(down.locator('.rankup-car')).toHaveCount(0);
  });

  test('Winning a week plays your goal explosion the next time the app opens, once, the first week included; a draw or a loss plays nothing', async ({ page, request }) => {
    const league = await createLeague(request);
    const profilePath = `leagues/${league.id}/players/${league.commish}`;
    const week = (period: string, outcome: string, points: number, against: number) => ({ season: 's1', period, points, max: 39, rank: 'gold', outcome, against });
    const car = { body: 'dart', paint: 'cobalt', decal: 'none', wheels: 'stock', boost: 'team', explosion: 'confetti', topper: 'none' };
    await patchDoc(request, profilePath, { car, badges: { fanFavorite: { at: new Date(), season: 's1' } } });
    await enterAsCommish(page, league);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    // No week is final yet, and the phone notes it.
    const noted = () => page.evaluate((key) => localStorage.getItem(key), `tcl.week.${league.id}.${league.commish}`);
    await expect.poll(noted).toBe('none');

    await patchDoc(request, profilePath, { rank: 'gold', rankHistory: [week('w01', 'win', 20, 14)] });
    await page.reload();
    await tapToEnter(page);
    const scene = page.getByRole('dialog', { name: 'You won' });
    await expect(scene).toContainText('Week 1');
    await expect(scene.locator('.win-score')).toHaveText('20–14');
    await expect(scene.locator('.boom[data-kind="confetti"]')).toHaveCount(1);
    await scene.click();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect.poll(noted).toBe('s1/w01');

    // Seen once: the next open goes straight in.
    await page.reload();
    await tapToEnter(page);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // A draw plays nothing, and is noted.
    await patchDoc(request, profilePath, { rankHistory: [week('w01', 'win', 20, 14), week('w02', 'draw', 15, 15)] });
    await page.reload();
    await tapToEnter(page);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect.poll(noted).toBe('s1/w02');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
