import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { addDays } from '../../engine/src/calendar.ts';
import { joinAs } from './helpers.ts';
import { addPlayer, createLeague, patchDoc, readDoc, setGoals, startSeason, thisWeek, writeDoc, type TestLeague, type TestSeason } from './league.ts';

const run = promisify(execFile);
const job = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });
const H = 3_600_000;

async function runWeekly(league: TestLeague): Promise<string> {
  const { stdout } = await run(process.execPath, [job], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
  return stdout;
}

/** Week 1, moved wholly into the past, so it is final whatever day the test runs. */
async function finishWeekOne(request: APIRequestContext, season: TestSeason): Promise<string[]> {
  const monday = addDays(thisWeek(season).dates[0]!, -7);
  const dates = [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(monday, offset));
  for (const [index, date] of dates.entries()) {
    const start = Date.now() - (9 - index) * 24 * H;
    await patchDoc(request, `${season.path}/calendar/${date}`, { start: new Date(start), lock: new Date(start + 36 * H), nextEnd: new Date(start + 48 * H) });
  }
  return dates;
}

/** A logged day: the goals listed, 30 minutes of screen time, no beers. */
const logged = (player: string, date: string, goals: { mind: boolean; body: boolean; wildcard: boolean }) => ({
  player,
  date,
  goals,
  screenMinutes: 30,
  beers: 0,
  firstAt: new Date(),
  updatedAt: new Date(),
});

test.describe('Settling a week, and the League tab', () => {
  test("After a week ends, the job settles it: results, Season Points, the standings by each player's car, and each player's all-time rivalry record show in League", async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await startSeason(request, league);
    const key = await joinAs(page, league, 'Riley');
    const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await setGoals(request, season, me, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
    await addPlayer(request, league, season, 'maya', 'Maya');
    await writeDoc(request, `${season.path}/weeks/w01`, { week: 1, mode: 'regular', pairs: [{ a: me, b: 'maya' }], targets: { [me]: ['maya'], maya: [me] } });
    const dates = await finishWeekOne(request, season);
    // Riley hits all three goals every day but Sunday; Maya hits one.
    for (const date of dates.slice(0, 6)) {
      await writeDoc(request, `${season.path}/days/${me}_${date}`, logged(me, date, { mind: true, body: true, wildcard: true }));
      await writeDoc(request, `${season.path}/days/maya_${date}`, logged('maya', date, { mind: true, body: false, wildcard: false }));
    }

    expect(await runWeekly(league)).toContain('w01: final, 2 players.');
    const week = await readDoc(request, `${season.path}/weeks/w01`);
    // Riley: 6 a day for 6 days, and Sunday is a rest day with nothing logged: -3. 33.
    expect((week?.results as Record<string, { points: number; outcome: string; seasonPoints: number }>)[me]).toMatchObject({ points: 33, outcome: 'win', seasonPoints: 38 });
    expect((week?.awards as { mvp: string[] }).mvp).toEqual([me]);
    // Each side's all-time record against the other.
    expect((await readDoc(request, `leagues/${league.id}/players/${me}`))?.rivals).toEqual({ maya: { win: 1, draw: 0, loss: 0, lastMet: { season: 's1', week: 1 } } });
    expect(((await readDoc(request, `leagues/${league.id}/players/maya`))?.rivals as Record<string, { loss: number }>)[me]?.loss).toBe(1);

    await page.getByRole('button', { name: "I've saved it", exact: true }).click();
    await tab(page, 'League').click();
    const first = page.locator('.standings tbody tr').first();
    await expect(first).toContainText('You');
    await expect(first.locator('.standings-points')).toHaveText('38');
    // One car a row: the commish, Riley and Maya.
    await expect(page.locator('.standings tbody .standings-car')).toHaveCount(3);
    await expect(first.locator('.standings-car')).toHaveAttribute('data-car', 'dart cobalt');
    await expect(first).toContainText('1–0–0');
    // The schedule opens on the latest results: Week 1, with its MVP and who spins.
    const schedule = page.getByRole('region', { name: 'Schedule' });
    await expect(schedule.locator('.result-head')).toContainText('Week 1');
    await expect(schedule.locator('.schedule-status')).toContainText('Final');
    await expect(schedule.locator('.result-awards')).toContainText('MVP: You.');
    await expect(schedule.locator('.result-awards')).toContainText('Spins the Wheel: Maya.');
    // Everyone's rank emblem is in the standings, and a name opens their card.
    await expect(page.locator('.standings tbody svg.standings-rank-badge')).toHaveCount(2);
    await page.locator('.standings tbody').getByRole('button', { name: /^Maya, / }).click();
    const card = page.getByRole('dialog', { name: 'Maya' });
    await expect(card.locator('.player-card-rank')).not.toHaveText('Unranked');
    // The showroom: Maya's car on the backdrop she picked.
    await patchDoc(request, `leagues/${league.id}/players/maya`, { car: { body: 'bruiser', paint: 'racingRed', decal: 'none', wheels: 'stock', boost: 'team', explosion: 'stock', topper: 'none', backdrop: 'stadium' } });
    await expect(card.getByRole('img', { name: "Maya's car" })).toHaveAttribute('data-backdrop', 'stadium');
    await expect(card.locator('.player-card-showroom-car')).toHaveAttribute('data-car', 'bruiser racingRed');
    await expect(card).toContainText('W–D–L');
    await expect(card.locator('.player-card-rival')).toHaveText('You against Maya, all time: 1–0–0');
    await card.getByRole('button', { name: "See Maya's day" }).click();
    await expect(page.getByRole('heading', { name: "Maya's day" })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    const rivalries = page.getByRole('region', { name: 'Your rivalries' });
    await expect(rivalries.getByRole('listitem')).toHaveCount(1);
    await expect(rivalries.getByRole('listitem').first()).toContainText('Maya');
    await expect(rivalries.locator('.rivals-record')).toHaveText('1–0–0');

    // Running it again changes nothing.
    const before = (await readDoc(request, `${season.path}/standings/current`))?.rows;
    expect(await runWeekly(league)).toContain('Done: 0 weeks settled');
    expect((await readDoc(request, `${season.path}/standings/current`))?.rows).toEqual(before);
  });

  test('The weekly job settles a rematch with its week: most points wins Payback, the loser wears an L for a week, and the feed says so', async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await startSeason(request, league);
    const key = await joinAs(page, league, 'Riley');
    const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await setGoals(request, season, me, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
    await addPlayer(request, league, season, 'maya', 'Maya');
    await writeDoc(request, `${season.path}/weeks/w01`, { week: 1, mode: 'regular', pairs: [{ a: me, b: 'maya' }], targets: { [me]: ['maya'], maya: [me] } });
    const dates = await finishWeekOne(request, season);
    for (const date of dates.slice(0, 6)) {
      await writeDoc(request, `${season.path}/days/${me}_${date}`, logged(me, date, { mind: true, body: true, wildcard: true }));
      await writeDoc(request, `${season.path}/days/maya_${date}`, logged('maya', date, { mind: true, body: false, wildcard: false }));
    }
    // Maya challenged Riley to a side race in Week 1.
    await writeDoc(request, `${season.path}/rematches/w00_maya`, { from: 'maya', to: me, lost: 'w00', period: 'w01', date: dates[0]!, at: new Date() });

    await runWeekly(league);
    const race = await readDoc(request, `${season.path}/rematches/w00_maya`);
    expect(race?.winner).toBe(me);
    expect((race?.points as Record<string, number>)[me]).toBe(33);
    expect(Object.keys(((await readDoc(request, `leagues/${league.id}/players/${me}`))?.badges ?? {}) as object)).toContain('payback');
    expect(((await readDoc(request, `leagues/${league.id}/players/maya`))?.stickers as { L?: unknown } | undefined)?.L).toBeTruthy();

    await page.getByRole('button', { name: "I've saved it", exact: true }).click();
    await tab(page, 'Feed').click();
    await expect(page.locator('.feed-event[data-kind="rematch"]').first()).toContainText(/^You won the rematch against Maya, 33–/);
  });

  test("Once a season's last regular week is final, the weekly job fills the trophy case, and League shows it", async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await startSeason(request, league);
    // A season of one regular week, so that week ends it.
    await patchDoc(request, season.path, { regularWeeks: 1 });
    const key = await joinAs(page, league, 'Riley');
    const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await setGoals(request, season, me, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
    await addPlayer(request, league, season, 'maya', 'Maya');
    await writeDoc(request, `${season.path}/weeks/w01`, { week: 1, mode: 'regular', pairs: [{ a: me, b: 'maya' }], targets: { [me]: ['maya'], maya: [me] } });
    const dates = await finishWeekOne(request, season);
    for (const date of dates.slice(0, 6)) {
      await writeDoc(request, `${season.path}/days/${me}_${date}`, logged(me, date, { mind: true, body: true, wildcard: true }));
      await writeDoc(request, `${season.path}/days/maya_${date}`, { ...logged('maya', date, { mind: true, body: false, wildcard: false }), beers: 2 });
    }

    expect(await runWeekly(league)).toContain('trophies awarded');
    const trophies = (await readDoc(request, `leagues/${league.id}/trophies/s1`))?.trophies as Record<string, { winners: string[]; value: number }>;
    expect(trophies.leader).toEqual({ winners: [me], value: 38 });
    expect(trophies.mvp).toEqual({ winners: [me], value: 1 });
    expect(trophies.brewmaster).toEqual({ winners: ['maya'], value: 12 });
    expect(trophies.screenTimeKing?.winners.sort()).toEqual([me, 'maya'].sort());

    await page.getByRole('button', { name: "I've saved it", exact: true }).click();
    await tab(page, 'League').click();
    const list = page.getByRole('list', { name: 'Season 1 trophies' });
    await expect(list.getByRole('listitem').filter({ hasText: 'Regular-Season Leader' })).toContainText('You, 38 Season Points');
    await expect(list.getByRole('listitem').filter({ hasText: 'Brewmaster' })).toContainText('Maya, 12 beers');
    // This season has a one-week playoff still to come.
    await expect(list.getByRole('listitem').filter({ hasText: 'Champion' })).toContainText('Decided in the playoffs');
  });

  test('Before any week settles, League says when the standings start', async ({ page, request }) => {
    const league = await createLeague(request);
    await startSeason(request, league);
    await joinAs(page, league, 'Riley');
    await page.getByRole('button', { name: "I've saved it", exact: true }).click();
    await tab(page, 'League').click();
    await expect(page.getByText('The standings start once Week 1 settles')).toBeVisible();
  });
});
