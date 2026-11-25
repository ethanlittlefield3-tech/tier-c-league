import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { enterAsCommish, joinAs } from './helpers.ts';
import { createLeague, draftUnderway, membersOf, quietPlayer, readDoc, rivalPicksUnderway, seasonInSetup, writeDoc, type TestLeague } from './league.ts';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });
const HOUR = 3_600_000;
const run = promisify(execFile);
const scheduleJob = fileURLToPath(new URL('../../jobs/schedule.ts', import.meta.url));

/** Runs the real schedule job against the local database, for one league. */
async function runSchedule(league: TestLeague): Promise<string> {
  const { stdout } = await run(process.execPath, [scheduleJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
  return stdout;
}

/** Opens Commish tools on the commish's phone. */
async function openTools(page: Page) {
  await button(page, 'Your profile, Alex').click();
  await button(page, 'Commish tools').click();
  await expect(page.getByRole('heading', { name: 'Commish tools' })).toBeVisible();
}

/** A player joins on a phone of their own and saves the key. Returns the phone and their id. */
async function joins(browser: Browser, request: Parameters<typeof readDoc>[0], league: TestLeague, name: string) {
  const phone = await (await browser.newContext()).newPage();
  const key = await joinAs(phone, league, name);
  await button(phone, "I've saved it").click();
  await expect(phone.getByRole('navigation', { name: 'Main' })).toBeVisible();
  const player = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
  return { phone, player };
}

test.describe('The draft', () => {
  test("The commish starts the draft: the order is drawn from everyone in the league, goals and votes open for 24 hours, and the season's settings are fixed", async ({ page, request, browser }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await seasonInSetup(request, league);
    const riley = await joins(browser, request, league, 'Riley');
    await enterAsCommish(page, league);
    await openTools(page);

    const panel = page.getByRole('region', { name: 'The draft' });
    await panel.getByRole('button', { name: 'Start the draft', exact: true }).click();
    await expect(panel.getByText('Start the draft?')).toBeVisible();
    await panel.getByRole('button', { name: 'Start the draft', exact: true }).click();
    await expect(panel.getByRole('status')).toHaveText('The draft is on. Everyone can set their goals.');

    const state = await readDoc(request, `${season.path}/draft/state`);
    expect(state?.step).toBe('goals');
    expect([...(state?.order as string[])].sort()).toEqual((await membersOf(request, league)).sort());
    // The phone's clock is a second ahead here (the title skip moves it), so allow a few seconds.
    const opensFor = Date.parse(String(state?.votesCloseAt)) - Date.now();
    expect(opensFor).toBeGreaterThan(23.5 * HOUR);
    expect(opensFor).toBeLessThanOrEqual(24 * HOUR + 5_000);
    expect((await readDoc(request, season.path))?.status).toBe('draft');
    expect(await readDoc(request, `leagues/${league.id}/audit/${String(state?.audit)}`)).toMatchObject({ action: 'draft.update', target: 'draft' });

    // Everyone sees it on Today, live.
    await expect(riley.phone.getByRole('heading', { name: 'The draft is on' })).toBeVisible();
    await riley.phone.context().close();
  });

  test("Players set their goals and vote on everyone else's; a vetoed goal gets new words and a fresh vote", async ({ page, request, browser }) => {
    const league = await createLeague(request);
    const season = await seasonInSetup(request, league);
    const riley = await joins(browser, request, league, 'Riley');
    await draftUnderway(request, season, await membersOf(request, league));

    // Riley sets three goals.
    await button(riley.phone, 'Open the draft').click();
    await expect(riley.phone.locator('.draft-clock')).toContainText(/close in 2[34] h/);
    await riley.phone.getByLabel('Mind', { exact: true }).fill('Read 20 pages');
    await riley.phone.getByLabel('Body', { exact: true }).fill('10k steps');
    await riley.phone.getByLabel('Wildcard', { exact: true }).fill('No vaping');
    await button(riley.phone, 'Save my goals').click();
    await expect(riley.phone.getByText('Saved. Everyone else can vote on them now.')).toBeVisible();
    await expect
      .poll(async () => (await readDoc(request, `${season.path}/roster/${riley.player}`))?.goals)
      .toEqual({ mind: { text: 'Read 20 pages', version: 1 }, body: { text: '10k steps', version: 1 }, wildcard: { text: 'No vaping', version: 1 } });

    // Alex, the commish, approves Mind and vetoes Body. With two players, one vote decides.
    await enterAsCommish(page, league);
    await button(page, 'Open the draft').click();
    await button(page, "Approve Riley's Mind goal").click();
    await button(page, "Veto Riley's Body goal").click();
    await expect(button(page, "Approve Riley's Mind goal")).toHaveAttribute('aria-pressed', 'true');
    await expect(button(page, "Veto Riley's Body goal")).toHaveAttribute('aria-pressed', 'true');

    // Riley sees how it went, live.
    await expect(riley.phone.getByTestId('my-tally-mind')).toHaveText('Approved: 1 approve, 0 veto');
    await expect(riley.phone.getByTestId('my-tally-body')).toHaveText('Vetoed: 0 approve, 1 veto. Change the words and save.');
    await expect(riley.phone.getByTestId('my-tally-wildcard')).toHaveText('Voting: 0 approve, 0 veto');

    // New words for Body start a fresh vote. The approved Mind goal keeps its vote.
    await riley.phone.getByLabel('Body', { exact: true }).fill('12k steps');
    await button(riley.phone, 'Save my goals').click();
    await expect(riley.phone.getByTestId('my-tally-body')).toHaveText('Voting: 0 approve, 0 veto');
    await expect(riley.phone.getByTestId('my-tally-mind')).toHaveText('Approved: 1 approve, 0 veto');
    await expect.poll(async () => ((await readDoc(request, `${season.path}/roster/${riley.player}`))?.goals as { body: unknown }).body).toEqual({ text: '12k steps', version: 2 });

    // Alex sees the new words, with no vote on them yet.
    await expect(page.locator('.draft-vote[data-lane="body"]')).toContainText('12k steps');
    await expect(button(page, "Veto Riley's Body goal")).toHaveAttribute('aria-pressed', 'false');
    await riley.phone.context().close();
  });

  test('The live draft moves on while goals and votes stay open; the commish can give more time or close them, and then everyone sees the results', async ({ page, request, browser }) => {
    const league = await createLeague(request);
    const season = await seasonInSetup(request, league);
    const riley = await joins(browser, request, league, 'Riley');
    await draftUnderway(request, season, await membersOf(request, league));
    await writeDoc(request, `${season.path}/roster/${riley.player}`, {
      goals: { mind: { text: 'Read 20 pages', version: 1 }, body: { text: '10k steps', version: 1 }, wildcard: { text: 'No vaping', version: 1 } },
    });

    await enterAsCommish(page, league);
    await openTools(page);
    const panel = page.getByRole('region', { name: 'The draft' });
    await panel.getByRole('button', { name: 'Move on to rival picks' }).click();
    await expect.poll(async () => (await readDoc(request, `${season.path}/draft/state`))?.step).toBe('rivals');

    // Riley can still change goals and vote: the votes are open for 24 hours.
    await button(riley.phone, 'Open the draft').click();
    await expect(riley.phone.getByText('The live draft has moved on to rival picks.')).toBeVisible();
    await expect(button(riley.phone, 'Save my goals')).toBeVisible();

    // More time: 12 hours on top of the 24.
    await panel.getByRole('button', { name: 'Give 12 more hours' }).click();
    await expect(panel.locator('.draft-votes-line')).toContainText(/close in 3[56] h/);
    await expect
      .poll(async () => Date.parse(String((await readDoc(request, `${season.path}/draft/state`))?.votesCloseAt)) - Date.now())
      .toBeGreaterThan(35.5 * HOUR);

    // Then the commish closes them.
    await panel.getByRole('button', { name: 'Close goals and votes now' }).click();
    await panel.getByRole('button', { name: 'Close them now' }).click();
    await expect(panel.locator('.draft-votes-line')).toHaveText('Goals and votes are closed.');

    // Riley's screen catches up at its next tick: the results, and no more form.
    await riley.phone.clock.fastForward(31_000);
    await expect(riley.phone.getByRole('heading', { name: "The season's goals" })).toBeVisible();
    await expect(button(riley.phone, 'Save my goals')).toHaveCount(0);
    // Nobody vetoed, so Riley's goals stand.
    await expect(riley.phone.locator('.draft-vote[data-player] .draft-tally').first()).toHaveText('Approved: 0 approve, 0 veto');
    await riley.phone.context().close();
  });

  test('In draft order, each player picks a Week 1 rival on a 2-minute clock; the odd one out faces The House, and the schedule follows', async ({ page, request, browser }) => {
    const league = await createLeague(request);
    const season = await seasonInSetup(request, league);
    const riley = await joins(browser, request, league, 'Riley');
    await quietPlayer(request, league, 'sam', 'Sam');
    await rivalPicksUnderway(request, season, [riley.player, league.commish, 'sam']);

    // Riley picks first. Alex, the commish, watches: no choices on Alex's phone.
    await enterAsCommish(page, league);
    await button(page, 'Open the draft').click();
    await expect(page.locator('.draft-rivals .draft-clock')).toContainText('Riley is picking.');
    await expect(page.getByRole('group', { name: 'Your Week 1 rival' })).toHaveCount(0);

    await button(riley.phone, 'Open the draft').click();
    await expect(riley.phone.locator('.draft-your-pick')).toContainText('Your pick.');
    await expect(riley.phone.locator('.draft-countdown')).toHaveText(/^[12]:[0-5][0-9]$/);
    await riley.phone.getByRole('group', { name: 'Your Week 1 rival' }).getByRole('button', { name: 'Sam', exact: true }).click();

    // Both leave the running. Alex is the odd one out, so Alex faces The House.
    await expect.poll(async () => (await readDoc(request, `${season.path}/draft/state`))?.picks).toEqual({ [riley.player]: 'sam' });
    expect((await readDoc(request, `${season.path}/draft/state`))?.left).toEqual([league.commish]);
    await expect(riley.phone.locator('.draft-pairs li')).toHaveText(['You vs Sam', 'Alex vs The House']);
    await expect(page.locator('.draft-pairs li')).toHaveText(['Riley vs Sam', 'You vs The House']);

    // The commish finishes the draft.
    await button(page, 'Back').click();
    await openTools(page);
    const panel = page.getByRole('region', { name: 'The draft' });
    await panel.getByRole('button', { name: 'Move on to dares' }).click();
    await expect.poll(async () => (await readDoc(request, `${season.path}/draft/state`))?.step).toBe('dares');
    await panel.getByRole('button', { name: 'Finish the draft' }).click();
    await expect.poll(async () => (await readDoc(request, `${season.path}/draft/state`))?.step).toBe('done');

    // The schedule job builds every week from the picks, and the season goes active. Running it again changes nothing.
    expect(await runSchedule(league)).toContain('6 weeks scheduled, season active');
    expect((await readDoc(request, season.path))?.status).toBe('active');
    expect((await readDoc(request, `${season.path}/weeks/w01`))?.pairs).toEqual([
      { a: riley.player, b: 'sam' },
      { a: league.commish, b: 'HOUSE' },
    ]);
    expect(await runSchedule(league)).toContain('left alone (not-in-draft)');

    // Everyone sees the schedule in League.
    await button(riley.phone, 'Back').click();
    await tab(riley.phone, 'League').click();
    await expect(riley.phone.locator('.result-week').first()).toContainText('Week 1');
    await expect(riley.phone.locator('.result-week').first().locator('li')).toHaveText(['You vs Sam', 'Alex vs The House']);
    await expect(riley.phone.locator('.result-week')).toHaveCount(6);
    await riley.phone.context().close();
  });

  test("When a player's 2-minute clock runs out, the commish's phone makes the pick at random, and logs it", async ({ page, request }) => {
    const league = await createLeague(request);
    const season = await seasonInSetup(request, league);
    await quietPlayer(request, league, 'sam', 'Sam');
    await quietPlayer(request, league, 'jo', 'Jo');
    await rivalPicksUnderway(request, season, ['sam', league.commish, 'jo']);

    await enterAsCommish(page, league);
    await button(page, 'Open the draft').click();
    await expect(page.locator('.draft-rivals .draft-clock')).toContainText('Sam is picking.');

    // Two minutes pass, and Sam never picks.
    await page.clock.fastForward(125_000);
    await expect.poll(async () => (await readDoc(request, `${season.path}/draft/state`))?.left, { timeout: 15_000 }).toHaveLength(1);
    const state = await readDoc(request, `${season.path}/draft/state`);
    expect([league.commish, 'jo']).toContain((state?.picks as Record<string, string>).sam);
    expect(await readDoc(request, `leagues/${league.id}/audit/${String(state?.audit)}`)).toMatchObject({ action: 'draft.update', by: league.commish, reason: 'A missed pick, made at random' });
    await expect(page.locator('.draft-pairs li')).toHaveCount(2);
  });
});
