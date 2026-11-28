import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { practiceDocs } from '../../jobs/lib/practice.ts';
import { enterAsCommish } from './helpers.ts';
import { createLeague, listIds, patchDoc, quietPlayer, readDoc, seasonInSetup, startSeason, writeDoc, writeDocs, type TestLeague } from './league.ts';

const run = promisify(execFile);
const job = (name: string) => fileURLToPath(new URL(`../../jobs/${name}.ts`, import.meta.url));
const emulator = { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c' };
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const MIN = 60_000;

/** A practice week already set up, as the practice job would: the commish against Maya, each day 4 minutes. */
async function practiceWeek(request: APIRequestContext, league: TestLeague, startsAt: number, mode: 'regular' | 'teamWeek' = 'regular') {
  const plan = practiceDocs({ leagueId: league.id, order: [league.commish, 'maya'], real: { par: 3, timeZone: 'America/New_York' }, goals: {}, startsAt, dayMinutes: 4, mode, now: Date.now() });
  await writeDocs(request, plan.docs as Parameters<typeof writeDocs>[1]);
  await patchDoc(request, `leagues/${league.id}`, { practice: { ...plan.mark } });
  await writeDoc(request, `leagues/${league.id}/practice/request`, { status: 'live', dayMinutes: 4, startsAt: new Date(startsAt), requestedAt: new Date() });
  return plan;
}

/** A league before its season, with Maya in it. */
async function beforeTheSeason(request: APIRequestContext) {
  const league = await createLeague(request, { name: 'Sunday Squad' });
  await seasonInSetup(request, league);
  await quietPlayer(request, league, 'maya', 'Maya');
  return league;
}

test.describe('The practice week', () => {
  test('Before the season, the commish schedules one from Commish tools: its mode, how long each day lasts and when it starts; everyone sees it coming', async ({ page, request }) => {
    const league = await beforeTheSeason(request);
    await enterAsCommish(page, league);
    await button(page, 'Your profile, Alex').click();
    await button(page, 'Commish tools').click();
    const panel = page.getByRole('region', { name: 'Practice week' });
    await expect(panel).toContainText('Nothing counts');
    await expect(panel.getByRole('group', { name: 'The mode' }).getByRole('button')).toHaveText(['1v1', 'Rumble', 'Team Week', '2v2', 'Bounty Week', 'Drop Shot', 'Alley']);
    await panel.getByRole('button', { name: 'Team Week', exact: true }).click();
    await panel.getByLabel('Each day lasts').selectOption('2');
    await panel.getByRole('button', { name: '10 min', exact: true }).click();
    await expect(panel.locator('.practice-plan')).toContainText('Seven days of 2 minutes');
    await panel.getByRole('button', { name: 'Schedule the practice week' }).click();
    await expect(panel).toContainText('Asked for: Team Week, starting at');
    await expect.poll(() => readDoc(request, `leagues/${league.id}/practice/request`)).toMatchObject({ status: 'requested', dayMinutes: 2, mode: 'teamWeek' });
    // Back out in the app, everyone sees it coming.
    await button(page, 'Back').click();
    await button(page, 'Back').click();
    await expect(page.locator('.practice-strip')).toContainText('Team Week, starts at');
    await expect(page.locator('.practice-strip')).toContainText('with days of 2 minutes. Nothing counts.');

    // Called off before it starts.
    await button(page, 'Your profile, Alex').click();
    await button(page, 'Commish tools').click();
    await panel.getByRole('button', { name: 'Call it off' }).click();
    await expect.poll(() => readDoc(request, `leagues/${league.id}/practice/request`)).toBeNull();
  });

  test("Once the season has started, there's no practice week in Commish tools", async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    await startSeason(request, league);
    await enterAsCommish(page, league);
    await button(page, 'Your profile, Alex').click();
    await button(page, 'Commish tools').click();
    await expect(page.getByRole('heading', { name: 'Commish tools' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Practice week' })).toHaveCount(0);
  });

  test('The practice job sets the week up from the request: its own season on a fast clock, everyone paired off, stand-in goals', async ({ request }) => {
    const league = await beforeTheSeason(request);
    const startsAt = Date.now() + 10 * MIN;
    await writeDoc(request, `leagues/${league.id}/practice/request`, { status: 'requested', dayMinutes: 4, startsAt: new Date(startsAt), requestedAt: new Date() });
    await run(process.execPath, [job('practice'), 'setup'], { env: { ...emulator, LEAGUE_ID: league.id } });
    const season = await readDoc(request, `leagues/${league.id}/seasons/practice`);
    expect(season).toMatchObject({ practice: true, status: 'active', regularWeeks: 1 });
    expect(new Date(String((season?.fast as { startsAt: string }).startsAt)).getTime()).toBe(startsAt);
    expect((await listIds(request, `leagues/${league.id}/seasons/practice/calendar`)).length).toBe(7);
    expect((await listIds(request, `leagues/${league.id}/seasons/practice/roster`)).sort()).toEqual([league.commish, 'maya'].sort());
    expect((await readDoc(request, `leagues/${league.id}/seasons/practice/roster/maya`))?.goals).toMatchObject({ body: { text: '10 push-ups or squats' } });
    expect((await readDoc(request, `leagues/${league.id}`))?.practice).toMatchObject({ season: 'practice', status: 'live', dayMinutes: 4 });
    expect((await readDoc(request, `leagues/${league.id}/practice/request`))?.status).toBe('live');
    // The real season is untouched.
    expect((await readDoc(request, `leagues/${league.id}`))?.season).toBe('s1');
  });

  test("The practice job won't set one up once the season has started, and says why", async ({ request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    await startSeason(request, league);
    await writeDoc(request, `leagues/${league.id}/practice/request`, { status: 'requested', dayMinutes: 4, startsAt: new Date(Date.now() + 10 * MIN), requestedAt: new Date() });
    await run(process.execPath, [job('practice'), 'setup'], { env: { ...emulator, LEAGUE_ID: league.id } });
    expect(await readDoc(request, `leagues/${league.id}/practice/request`)).toMatchObject({ status: 'failed', reason: 'The season has started. Practice is only before kickoff.' });
    expect(await readDoc(request, `leagues/${league.id}/seasons/practice`)).toBeNull();
  });

  test('During it, Game Day plays the practice week, marked as practice: the scoreboard against your practice opponent, and your day saves into practice', async ({ page, request }) => {
    const league = await beforeTheSeason(request);
    await practiceWeek(request, league, Date.now() - MIN);
    await enterAsCommish(page, league);
    await expect(page.locator('.practice-strip')).toContainText('Practice week1v1. Nothing counts. Results at');
    await expect(page.locator('.board-side[data-team="orange"] .board-name')).toContainText('Maya');
    await page.locator('.check-goal[data-lane="mind"]').click();
    await expect(page.locator('.today-status')).toHaveText('Saved');
    await expect.poll(async () => (await listIds(request, `leagues/${league.id}/seasons/practice/days`)).filter((id) => id.startsWith(`${league.commish}_`)).length).toBe(1);
    // Nothing went into the real season.
    expect(await listIds(request, `leagues/${league.id}/seasons/s1/days`)).toEqual([]);

    // Trash talk during practice is marked as practice.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Feed', exact: true }).click();
    await page.getByRole('button', { name: /^Trash talk/ }).click();
    await page.getByRole('button', { name: 'Calculated.', exact: true }).click();
    await expect.poll(async () => {
      const ids = await listIds(request, `leagues/${league.id}/wall`);
      return ids.length ? (await readDoc(request, `leagues/${league.id}/wall/${ids[0]}`))?.practice : null;
    }).toBe(true);
  });

  test('In a group-play mode, Game Day plays that mode: Team Week shows its board, blue against orange', async ({ page, request }) => {
    const league = await beforeTheSeason(request);
    await practiceWeek(request, league, Date.now() - MIN, 'teamWeek');
    await enterAsCommish(page, league);
    await expect(page.locator('.practice-strip')).toContainText('Team Week. Nothing counts.');
    await expect(page.locator('.group-board')).toContainText('Team Week');
    await expect(page.locator('.group-you')).toContainText("You're on Blue");
  });

  test('Settled, it touches no profile, feed or trophy case; cleared, nothing is left of it but brags', async ({ request }) => {
    const league = await beforeTheSeason(request);
    // A week that started 40 minutes ago: its results are due.
    const plan = await practiceWeek(request, league, Date.now() - 40 * MIN);
    const dates = plan.docs.filter((doc) => doc.path.includes('/calendar/')).map((doc) => doc.path.split('/').at(-1)!);
    for (const date of dates.slice(0, 3)) {
      for (const player of [league.commish, 'maya']) {
        await writeDoc(request, `leagues/${league.id}/seasons/practice/days/${player}_${date}`, { player, date, goals: { mind: true, body: player === 'maya', wildcard: false }, screenMinutes: 60, beers: 0, firstAt: new Date(), updatedAt: new Date() });
      }
    }
    const { stdout } = await run(process.execPath, [job('weekly')], { env: { ...emulator, LEAGUE_ID: league.id, SEASON_ID: 'practice' } });
    expect(stdout).toContain('w01: final');
    expect((await readDoc(request, `leagues/${league.id}/seasons/practice/weeks/w01`))?.status).toBe('final');
    expect(await readDoc(request, `leagues/${league.id}/seasons/practice/standings/current`)).not.toBeNull();
    for (const player of [league.commish, 'maya']) {
      const profile = await readDoc(request, `leagues/${league.id}/players/${player}`);
      expect(profile?.rank).toBeUndefined();
      expect(profile?.rankHistory).toBeUndefined();
      expect(profile?.rivals).toBeUndefined();
      expect(profile?.badges).toBeUndefined();
      expect(profile?.stickers).toBeUndefined();
    }
    expect(await listIds(request, `leagues/${league.id}/feed`)).toEqual([]);
    expect(await listIds(request, `leagues/${league.id}/trophies`)).toEqual([]);
    expect((await readDoc(request, `leagues/${league.id}`))?.banner).toBeUndefined();

    await writeDoc(request, `leagues/${league.id}/wall/taunt1`, { by: 'maya', kind: 'taunt', text: 'Calculated.', to: league.commish, at: new Date(), deleted: false, practice: true });
    await writeDoc(request, `leagues/${league.id}/wall/brag1`, { by: 'maya', kind: 'brag', text: 'New bench PR.', to: null, at: new Date(), deleted: false });
    await run(process.execPath, [job('practice'), 'clear'], { env: { ...emulator, LEAGUE_ID: league.id } });
    expect(await readDoc(request, `leagues/${league.id}/seasons/practice`)).toBeNull();
    expect(await listIds(request, `leagues/${league.id}/seasons/practice/days`)).toEqual([]);
    expect(await listIds(request, `leagues/${league.id}/seasons/practice/weeks`)).toEqual([]);
    expect((await readDoc(request, `leagues/${league.id}`))?.practice).toBeUndefined();
    expect(await readDoc(request, `leagues/${league.id}/practice/request`)).toBeNull();
    expect(await listIds(request, `leagues/${league.id}/wall`)).toEqual(['brag1']);
    expect((await readDoc(request, `leagues/${league.id}`))?.season).toBe('s1');
  });
});
