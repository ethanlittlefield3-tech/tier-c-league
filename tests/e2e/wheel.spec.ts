import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type Page } from '@playwright/test';
import { enterAsCommish, joinAs } from './helpers.ts';
import { createLeague, readDoc, startSeason, writeDoc, type TestLeague, type TestSeason } from './league.ts';

const run = promisify(execFile);
const weeklyJob = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });

async function runWeekly(league: TestLeague): Promise<string> {
  const { stdout } = await run(process.execPath, [weeklyJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
  return stdout;
}

/** A tiny photo to send as proof. The phone turns it into a JPEG. */
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/** Week 1 is final: Alex beat Riley, so Riley spins. */
async function weekOneFinal(request: Parameters<typeof writeDoc>[0], league: TestLeague, season: TestSeason, riley: string, extra: Record<string, unknown> = {}) {
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
    ...(extra as Record<string, never>),
  });
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

  test("The spinner posts proof, everyone else votes, and a majority of Doesn't count means a new sealed spin", async ({ page, request, browser }) => {
    const league = await createLeague(request);
    const season = await startSeason(request, league);
    const phone = await (await browser.newContext()).newPage();
    const key = await joinAs(phone, league, 'Riley');
    await button(phone, "I've saved it").click();
    const riley = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await weekOneFinal(request, league, season, riley);
    await runWeekly(league);

    // Riley spins and posts proof.
    await button(phone, 'Open the Wheel').click();
    await button(phone, 'Spin the Wheel').click();
    await expect(phone.locator('.wheel-dare')).toBeVisible();
    await phone.getByLabel('Upload proof').setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: Buffer.from(PNG, 'base64') });
    await expect(phone.getByRole('img', { name: 'Your dare proof' })).toBeVisible();
    await expect(phone.getByText('Everyone else votes for 24 hours from when you posted it.')).toBeVisible();

    // Alex sees the photo and votes. With two players, one vote decides.
    await enterAsCommish(page, league);
    await tab(page, 'Feed').click();
    await expect(page.locator('.feed-event[data-kind="wheel"]').first()).toContainText('Riley posted dare proof: vote now');
    await button(page, 'Open the Wheel').click();
    await expect(page.getByRole('img', { name: "Riley's dare proof" })).toBeVisible();
    await page.getByRole('group', { name: 'Your vote on the proof' }).getByRole('button', { name: "Doesn't count" }).click();
    await expect(page.locator('.wheel-card .draft-tally')).toHaveText("It doesn't count: Riley spins again.: 0 counts, 1 doesn't");
    await expect(phone.locator('.wheel-card .draft-tally')).toContainText("It doesn't count: you spin again.");

    // The job seals a second spin for Riley.
    expect(await runWeekly(league)).toContain('1 Wheel draw sealed');
    const wheel = (await readDoc(request, `${season.path}/weeks/w01`))?.wheel as Record<string, { n: number }>;
    expect(wheel[`w01_${riley}_2`]?.n).toBe(2);
    await expect(phone.getByRole('heading', { name: 'Your spin, again (2)' })).toBeVisible();
    await expect(button(phone, 'Spin the Wheel')).toBeVisible();
    await phone.context().close();
  });

  test('No proof by the deadline is a dodge: 3 Season Points off in the standings, and the feed says so', async ({ page, request, browser }) => {
    const league = await createLeague(request);
    const season = await startSeason(request, league);
    const phone = await (await browser.newContext()).newPage();
    const key = await joinAs(phone, league, 'Riley');
    await button(phone, "I've saved it").click();
    const riley = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    const drawId = `w01_${riley}_1`;
    // Drawn days ago, and the Sunday deadline has passed with no proof.
    await weekOneFinal(request, league, season, riley, {
      wheel: { [drawId]: { id: drawId, player: riley, n: 1, pool: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], drawnAt: new Date(Date.now() - 6 * 24 * 3_600_000), dueAt: new Date(Date.now() - 3_600_000) } },
    });
    await writeDoc(request, `${season.path}/sealed/wheel_${drawId}`, { kind: 'wheel', draw: drawId, slice: 2, dare: 'c' });

    await runWeekly(league);
    const rows = (await readDoc(request, `${season.path}/standings/current`))?.rows as { player: string; seasonPoints: number }[];
    expect(rows.find((row) => row.player === riley)?.seasonPoints).toBe(17);
    expect(rows.find((row) => row.player === league.commish)?.seasonPoints).toBe(35);

    await enterAsCommish(page, league);
    await tab(page, 'Feed').click();
    await expect(page.locator('.feed-event[data-kind="wheel"]')).toContainText(['Riley dodged the dare: −3 Season Points']);
    await phone.context().close();
  });
});
