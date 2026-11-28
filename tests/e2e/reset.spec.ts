import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { addDays, localDate } from '../../engine/src/calendar.ts';
import { mondayOf } from '../../jobs/lib/calendar-docs.ts';
import { enterAsCommish } from './helpers.ts';
import { createLeague, patchDoc, readDoc, writeDoc, type TestLeague } from './league.ts';

const run = promisify(execFile);
const resetJob = fileURLToPath(new URL('../../jobs/reset.ts', import.meta.url));
const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });

/** Runs the reset job for one league, or the alerts workflow's check for every league. */
async function reset(league: TestLeague, mode: 'check' | 'run'): Promise<string> {
  const { stdout } = await run(process.execPath, [resetJob, mode], {
    env: {
      ...process.env,
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      GCLOUD_PROJECT: 'demo-tier-c',
      LEAGUE_ID: league.id,
    },
  });
  return stdout;
}

const settings = (name: string, status: string, kickoff: string) => ({
  name,
  status,
  regularWeeks: 3,
  playoffs: 'none',
  playoffSize: 4,
  par: 3,
  groupWeeks: [],
  timeZone: 'America/New_York',
  kickoff,
  draftAt: null,
  joinMidSeason: false,
  holidayEvents: false,
});
const result = (opponent: string, outcome: string) => ({
  opponent,
  outcome,
  points: 20,
  opponentPoints: 10,
});

/** Season 1 over, with Alex the champion; Season 2 under way, with a week final, a badge, a trophy case and news. */
async function twoSeasons(request: APIRequestContext) {
  const league = await createLeague(request, { name: 'Sunday Squad' });
  const me = league.commish;
  const L = `leagues/${league.id}`;
  const monday = mondayOf(localDate(Date.now(), 'America/New_York'));
  await writeDoc(request, `${L}/players/maya`, {
    displayName: 'Maya',
    joinedAt: new Date(),
  });
  await writeDoc(request, `${L}/seasons/s1`, {
    ...settings('Season 1', 'finished', addDays(monday, -70)),
    champion: me,
  });
  await writeDoc(request, `${L}/seasons/s1/weeks/w01`, {
    week: 1,
    status: 'final',
    results: { [me]: result('maya', 'win'), maya: result(me, 'loss') },
  });
  await writeDoc(request, `${L}/seasons/s2`, settings('Season 2', 'active', addDays(monday, -7)));
  await writeDoc(request, `${L}/seasons/s2/weeks/w01`, {
    week: 1,
    status: 'final',
    results: { [me]: result('maya', 'loss'), maya: result(me, 'win') },
  });
  await writeDoc(request, `${L}/seasons/s2/days/${me}_${addDays(monday, -7)}`, {
    player: me,
    date: addDays(monday, -7),
    goals: { mind: true },
    screenMinutes: 60,
    beers: 0,
    firstAt: new Date(),
    updatedAt: new Date(),
  });
  await writeDoc(request, `${L}/trophies/s2`, {
    season: 's2',
    name: 'Season 2',
    trophies: { brewmaster: { winners: ['maya'], value: 4 } },
  });
  await writeDoc(request, `${L}/feed/rank_${me}_s2_w01`, {
    at: new Date(),
    kind: 'rank',
    player: me,
    data: { rank: 'bronze', from: 'diamond' },
  });
  await writeDoc(request, `${L}/feed/badge_${me}_gymRat`, {
    at: new Date(),
    kind: 'badge',
    player: me,
    data: { badge: 'gymRat' },
  });
  await writeDoc(request, `${L}/feed/champion_s1`, {
    at: new Date(),
    kind: 'champion',
    player: me,
    data: { season: 's1', finalist: 'maya', whiffLoser: null },
  });
  await patchDoc(request, `${L}/players/${me}`, {
    rank: 'gold',
    rankHistory: [
      { season: 's1', period: 'w01', points: 20, max: 39, rank: 'diamond' },
      { season: 's2', period: 'w01', points: 2, max: 39, rank: 'gold' },
    ],
    badges: {
      hatTrick: { season: 's1', at: new Date() },
      gymRat: { season: 's2', at: new Date() },
    },
    seasons: { s1: 2027 },
    car: { body: 'dart', paint: 'cobalt', decal: 'flame', wheels: 'muscle' },
    rivals: {
      maya: { win: 1, draw: 0, loss: 1, lastMet: { season: 's2', week: 1 } },
    },
  });
  await patchDoc(request, L, {
    season: 's2',
    banner: { player: 'maya', season: 's2' },
  });
  return { league, L, me };
}

test.describe('A season reset', () => {
  test('The commish types the season’s name to reset it, and can call it off before it starts; the request goes in the league log', async ({ page, request }) => {
    const { league, L } = await twoSeasons(request);
    await enterAsCommish(page, league);
    await button(page, 'Your profile, Alex').click();
    await button(page, 'Commish tools').click();

    const panel = page.getByRole('region', { name: 'Reset the season' });
    await expect(panel).toContainText('The league goes back to the end of Season 1');
    await expect(button(page, 'Reset Season 2')).toBeDisabled();
    await panel.getByLabel('Type Season 2 to confirm').fill('season 2');
    await button(page, 'Reset Season 2').click();
    await expect(panel).toContainText('Season 2 is being reset');
    // The screen shows the request at once; the league has it a moment later.
    await expect.poll(async () => (await readDoc(request, `${L}/reset/request`))?.status).toBe('requested');
    const asked = await readDoc(request, `${L}/reset/request`);
    expect(asked).toMatchObject({ season: 's2', status: 'requested' });
    expect(await readDoc(request, `${L}/audit/${String(asked?.audit)}`)).toMatchObject({ action: 'season.reset', target: 'seasons/s2' });

    await button(page, 'Call it off').click();
    await expect(button(page, 'Reset Season 2')).toBeVisible();
    await expect.poll(async () => readDoc(request, `${L}/reset/request`)).toBeNull();
  });

  test('The reset job takes the season back as if it had never been set up: the league goes back to Season 1, and the season’s ranks, badge, car part, rivalry record, trophies, banner and news come off', async ({ page, request }) => {
    const { league, L, me } = await twoSeasons(request);
    await enterAsCommish(page, league);
    await button(page, 'Your profile, Alex').click();
    await button(page, 'Commish tools').click();
    await page.getByLabel('Type Season 2 to confirm').fill('Season 2');
    await button(page, 'Reset Season 2').click();
    await expect(page.getByRole('region', { name: 'Reset the season' })).toContainText('Season 2 is being reset');
    await expect.poll(async () => (await readDoc(request, `${L}/reset/request`))?.status).toBe('requested');

    // The alerts workflow's check marks it started, once.
    await reset(league, 'check');
    expect((await readDoc(request, `${L}/reset/request`))?.dispatchedAt).toBeTruthy();
    expect(await reset(league, 'run')).toContain('season s2 reset, back to s1');

    expect(await readDoc(request, L)).toMatchObject({
      season: 's1',
      banner: { player: me, season: 's1' },
    });
    expect(await readDoc(request, `${L}/seasons/s2`)).toBeNull();
    expect(await readDoc(request, `${L}/seasons/s2/weeks/w01`)).toBeNull();
    expect(await readDoc(request, `${L}/trophies/s2`)).toBeNull();
    expect(await readDoc(request, `${L}/reset/request`)).toBeNull();
    const profile = await readDoc(request, `${L}/players/${me}`);
    expect(profile?.rankHistory).toEqual([{ season: 's1', period: 'w01', points: 20, max: 39, rank: 'diamond' }]);
    expect(profile?.rank).toBe('diamond');
    expect(Object.keys(profile?.badges as object)).toEqual(['hatTrick']);
    expect(profile?.car).toMatchObject({ decal: 'flame', wheels: 'stock' });
    expect(profile?.rivals).toMatchObject({
      maya: { win: 1, draw: 0, loss: 0 },
    });
    expect(await readDoc(request, `${L}/feed/rank_${me}_s2_w01`)).toBeNull();
    expect(await readDoc(request, `${L}/feed/badge_${me}_gymRat`)).toBeNull();
    expect(await readDoc(request, `${L}/feed/champion_s1`)).toBeTruthy();

    // Every phone follows at once: the league is back in Season 1's offseason.
    await button(page, 'Back').click();
    await button(page, 'Back').click();
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Game Day', exact: true }).click();
    await expect(page.locator('.offseason').getByRole('heading')).toHaveText('Season 1 is over');
  });
});
