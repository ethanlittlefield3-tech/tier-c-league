import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { addDays, localDate } from '../../engine/src/calendar.ts';
import { mondayOf } from '../../jobs/lib/calendar-docs.ts';
import { enterAsCommish, joinAs } from './helpers.ts';
import { addPlayer, createLeague, patchDoc, readDoc, writeDoc, type TestLeague } from './league.ts';

const run = promisify(execFile);
const tickJob = fileURLToPath(new URL('../../jobs/tick.ts', import.meta.url));
const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });
const DAY = 86_400_000;

/** Runs the alerts job for one league, and returns the pushes it would have sent. */
async function tick(league: TestLeague): Promise<{ device: string; title: string; body: string }[]> {
  const { stdout } = await run(process.execPath, [tickJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
  return stdout
    .split('\n')
    .filter((line) => line.startsWith('push '))
    .map((line) => JSON.parse(line.slice(5)) as { device: string; title: string; body: string });
}

/** A season that is over: one week, no playoffs, Maya the champion, and no days left to log. */
async function seasonOver(request: APIRequestContext) {
  const league = await createLeague(request, { name: 'Sunday Squad' });
  const timeZone = 'America/New_York';
  const kickoff = addDays(mondayOf(localDate(Date.now(), timeZone)), -21);
  const path = `leagues/${league.id}/seasons/s1`;
  const season = { path, timeZone, par: 3, kickoff, today: '', yesterday: '' };
  await writeDoc(request, path, { name: 'Season 1', status: 'finished', champion: 'maya', regularWeeks: 3, playoffs: 'none', playoffSize: 4, par: 3, groupWeeks: [], timeZone, kickoff, draftAt: null, joinMidSeason: false, holidayEvents: false });
  await patchDoc(request, `leagues/${league.id}`, { season: 's1' });
  for (const [id, name] of [['maya', 'Maya'], ['sam', 'Sam']] as const) await addPlayer(request, league, season, id, name);
  return { league, path };
}

test.describe('The offseason', () => {
  test('Once the season is over, Today shows the champion and asks you to stay or leave by the deadline', async ({ page, request }) => {
    const { league, path } = await seasonOver(request);
    const key = await joinAs(page, league, 'Riley');
    const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await button(page, "I've saved it").click();

    const card = page.locator('.offseason');
    await expect(card.getByRole('heading')).toHaveText('Season 1 is over');
    await expect(card).toContainText('Champion: Maya');
    await expect(card).toContainText("Your commish will ask everyone whether they're staying");

    await writeDoc(request, `${path}/config/offseason`, { deadline: new Date(Date.now() + 3 * DAY), at: new Date(), audit: 'a1' });
    await expect(card).toContainText('Staying for the next season? Tap by');
    await button(page, 'Leave').click();
    await expect(button(page, 'Leave')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await readDoc(request, `${path}/stays/${me}`))?.choice).toBe('leave');
    await expect(card).toContainText('Leaving keeps your car, badges and history');
  });

  test('Once the season is over, your season, wrapped, is on Game Day and leads Telemetry: where you finished, your numbers, your nemesis and trophies, and a picture to share', async ({ page, request }) => {
    const { league, path } = await seasonOver(request);
    const me = league.commish;
    const kickoff = String((await readDoc(request, path))?.kickoff);
    // Two logged days: one perfect at an hour of screen time, one with two goals at par.
    await writeDoc(request, `${path}/days/${me}_${kickoff}`, { player: me, date: kickoff, goals: { mind: true, body: true, wildcard: true }, screenMinutes: 60, beers: 0, firstAt: new Date(), updatedAt: new Date() });
    const tuesday = addDays(kickoff, 1);
    await writeDoc(request, `${path}/days/${me}_${tuesday}`, { player: me, date: tuesday, goals: { mind: true, body: true }, screenMinutes: 180, beers: 0, firstAt: new Date(), updatedAt: new Date() });
    await writeDoc(request, `${path}/weeks/w01`, { week: 1, results: { [me]: { opponent: 'maya', outcome: 'loss', points: 18, opponentPoints: 30 } }, lines: [{ player: me, points: 18 }] });
    await writeDoc(request, `${path}/weeks/w02`, { week: 2, results: { [me]: { opponent: 'sam', outcome: 'win', points: 26, opponentPoints: 12 } }, lines: [{ player: me, points: 26 }] });
    await writeDoc(request, `${path}/standings/current`, { rows: [{ player: 'maya', rank: 1, seasonPoints: 60 }, { player: me, rank: 2, seasonPoints: 44 }, { player: 'sam', rank: 3, seasonPoints: 20 }] });
    await writeDoc(request, `leagues/${league.id}/trophies/s1`, { season: 's1', name: 'Season 1', trophies: { brewmaster: { winners: [me], value: 0 }, leader: { winners: ['maya'], value: 60 } } });
    await enterAsCommish(page, league);

    const card = page.getByRole('region', { name: 'Season 1, wrapped' });
    await expect(card).toContainText('2nd of 3 · 44 Season Points');
    await expect(card.locator('.wrapped-tiles p')).toHaveCount(6);
    await expect(card).toContainText('1–0–1Record');
    await expect(card).toContainText('5Goals hit');
    await expect(card).toContainText('2hScreen time under par');
    await expect(card).toContainText('26Best week · Week 2');
    await expect(card).toContainText('Nemesis: Maya, 0–0–1');
    await expect(card).toContainText('Trophies: Brewmaster');

    await card.getByRole('button', { name: 'Share your season' }).click();
    const share = page.getByRole('dialog');
    await expect(share.locator('img')).toBeVisible();
    await share.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Telemetry', exact: true }).click();
    await expect(page.locator('.telemetry > :first-child')).toHaveAttribute('aria-labelledby', 'wrapped-title');
  });

  test('The commish sets the deadline; at the deadline the leavers come off the roster, the next season can start once the last dares are done, and a former player can come back', async ({ page, request }) => {
    const { league, path } = await seasonOver(request);
    await enterAsCommish(page, league);
    await button(page, 'Your profile, Alex').click();
    await button(page, 'Commish tools').click();
    const panel = page.getByRole('region', { name: 'The offseason' });
    await expect(panel).toContainText('Season 1 is over. Set a deadline');
    // No next season yet.
    await expect(page.getByRole('heading', { name: 'Start a season' })).toHaveCount(0);

    await button(page, 'Set the deadline').click();
    await expect(panel).toContainText('Everyone taps Stay or Leave by');
    // The screen shows the save at once; the league has it a moment later.
    await expect.poll(async () => (await readDoc(request, `${path}/config/offseason`))?.audit).toBeTruthy();
    const offseason = await readDoc(request, `${path}/config/offseason`);
    expect(await readDoc(request, `leagues/${league.id}/audit/${String(offseason?.audit)}`)).toMatchObject({ action: 'offseason.deadline', target: 'config/offseason' });

    // Everyone is asked: the commish's phone gets the alert.
    const device = `off-${league.id}`;
    // Signing in on this phone gave the commish a new key, so the alerts phone claims that one.
    const key = String((await readDoc(request, `leagues/${league.id}/keys/${league.commish}`))?.key);
    await writeDoc(request, `leagues/${league.id}/claims/${device}`, { player: league.commish, key, at: new Date() });
    await writeDoc(request, `devices/${device}`, { token: `emulator-${device}`, platform: 'ios', league: league.id, player: league.commish, settings: { daily: true, matchup: true, powerups: true, social: true, receipts: true, progress: true, league: true }, quiet: { start: 0, end: 0 }, updatedAt: new Date() });
    expect((await tick(league)).map((push) => push.title)).toContain('Season 1 is over');

    // Maya leaves; Sam says nothing, so stays. The deadline passes.
    await writeDoc(request, `${path}/stays/maya`, { player: 'maya', choice: 'leave', at: new Date() });
    await expect(panel).toContainText('Leaving: Maya');
    await patchDoc(request, `${path}/config/offseason`, { deadline: new Date(Date.now() - 60_000) });
    await tick(league);
    const after = await readDoc(request, `leagues/${league.id}`);
    expect(Object.keys(after?.members as Record<string, boolean>)).not.toContain('maya');
    expect(after?.former).toEqual({ maya: 's1' });
    expect(await readDoc(request, `leagues/${league.id}/feed/left_s1_maya`)).toMatchObject({ kind: 'left', player: 'maya' });
    await expect(panel).toContainText('Maya left the league.');
    await expect(page.getByRole('heading', { name: 'Start a season' })).toBeVisible();

    // A dare from the season still open holds the next season back until it is done.
    await writeDoc(request, `${path}/weeks/w03`, { week: 3, status: 'final', awards: { wheel: ['sam'] }, wheel: { w03_sam_1: { id: 'w03_sam_1', player: 'sam', n: 1, pool: ['Post a childhood photo.'], drawnAt: new Date(), dueAt: new Date(Date.now() + DAY) } } });
    await expect(panel).toContainText('One dare from Season 1 is still open');
    await expect(page.getByRole('heading', { name: 'Start a season' })).toHaveCount(0);
    await patchDoc(request, `${path}/weeks/w03`, { wheel: { w03_sam_1: { id: 'w03_sam_1', player: 'sam', n: 1, pool: ['Post a childhood photo.'], drawnAt: new Date(Date.now() - 2 * DAY), dueAt: new Date(Date.now() - 60_000) } } });
    await expect(page.getByRole('heading', { name: 'Start a season' })).toBeVisible();

    // Maya comes back, with a new key for her phone.
    await page.getByRole('list', { name: 'Former players' }).getByRole('button', { name: 'Bring back' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Maya is back in the league' })).toBeVisible();
    const back = await readDoc(request, `leagues/${league.id}`);
    expect(Object.keys(back?.members as Record<string, boolean>)).toContain('maya');
    expect(String((await readDoc(request, `leagues/${league.id}/keys/maya`))?.key)).toMatch(/^TCL-/);
  });
});
