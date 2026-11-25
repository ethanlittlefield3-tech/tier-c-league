import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { joinAs, tapToEnter } from './helpers.ts';
import { createLeague, patchDoc, readDoc, setGoals, setWindow, startSeason, writeDoc, type TestLeague, type TestSeason } from './league.ts';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const total = (page: Page) => page.locator('.today-points');
const goal = (page: Page, lane: string) => page.locator(`.square-goal[data-lane="${lane}"]`);
const HOUR = 3_600_000;

const playerOf = async (request: APIRequestContext, league: TestLeague, key: string) =>
  String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);

/** A league in Week 2 of a season, with Riley joined, goals set, and on Today. */
async function onToday(page: Page, request: APIRequestContext, options: { goals?: boolean } = {}) {
  const league = await createLeague(request, { name: 'Sunday Squad' });
  const season = await startSeason(request, league);
  const key = await joinAs(page, league, 'Riley');
  const player = await playerOf(request, league, key);
  if (options.goals !== false) await setGoals(request, season, player, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
  await button(page, "I've saved it").click();
  await expect(total(page)).toBeVisible();
  return { league, season, player };
}

const dayDoc = (request: APIRequestContext, season: TestSeason, player: string, date: string) => readDoc(request, `${season.path}/days/${player}_${date}`);

/** Waits until the day's save has reached the database. */
async function saved(page: Page) {
  await expect(page.locator('.today-status')).toHaveText('Saved');
}

test.describe('Today', () => {
  test('Before the commish sets up a season, Today says so', async ({ page, request }) => {
    const league = await createLeague(request);
    await joinAs(page, league, 'Riley');
    await button(page, "I've saved it").click();
    await expect(page.getByRole('heading', { name: 'No season yet' })).toBeVisible();
  });

  test('It shows your three goals, and a day total of 0 with nothing logged yet', async ({ page, request }) => {
    await onToday(page, request);
    await expect(goal(page, 'mind')).toContainText('Read 20 pages');
    await expect(goal(page, 'body')).toContainText('10k steps');
    await expect(goal(page, 'wildcard')).toContainText('No vaping');
    await expect(total(page)).toContainText('0');
    await expect(page.getByText('Nothing logged yet')).toBeVisible();
    await expect(page.locator('.today-date')).toContainText('Week 2');
  });

  test('Tapping a goal marks it hit, adds 1, and saves it', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    await goal(page, 'mind').click();
    await expect(goal(page, 'mind')).toHaveAttribute('aria-pressed', 'true');
    await expect(total(page)).toContainText('+1');
    await saved(page);
    const day = await dayDoc(request, season, player, season.today);
    expect(day).toMatchObject({ player, date: season.today, goals: { mind: true, body: false, wildcard: false }, screenMinutes: null, beers: 0 });

    // Tapping it again takes it back.
    await goal(page, 'mind').click();
    await expect(goal(page, 'mind')).toHaveAttribute('aria-pressed', 'false');
    await expect(total(page)).toContainText('0');
  });

  test('Screen time moves in 15-minute steps and scores against par', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    for (let step = 0; step < 4; step += 1) await button(page, '15 minutes more').click();
    await expect(page.locator('.square-screen .square-value')).toHaveText('1 h');
    // At par 3, 1 hour scores +2.
    await expect(page.locator('.square-screen .square-points')).toHaveText('+2');
    await expect(total(page)).toContainText('+2');
    await saved(page);
    expect((await dayDoc(request, season, player, season.today))?.screenMinutes).toBe(60);

    await button(page, '15 minutes less').click();
    await expect(page.locator('.square-screen .square-value')).toHaveText('45 min');
    await expect(total(page)).toContainText('+3');
  });

  test('Clear takes screen time back to not logged', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    await button(page, '15 minutes more').click();
    await expect(page.locator('.square-screen .square-value')).toHaveText('15 min');
    await button(page, 'Clear').click();
    await expect(page.locator('.square-screen .square-value')).toHaveText('Not logged');
    await saved(page);
    expect((await dayDoc(request, season, player, season.today))?.screenMinutes).toBeNull();
  });

  test('Each beer takes a point off', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    await button(page, 'One beer more').click();
    await button(page, 'One beer more').click();
    await expect(page.locator('.beer-count')).toContainText('2');
    await expect(total(page)).toContainText('−2');
    await saved(page);
    expect((await dayDoc(request, season, player, season.today))?.beers).toBe(2);
    await button(page, 'One beer less').click();
    await expect(total(page)).toContainText('−1');
  });

  test('A full day adds up the way the engine scores it', async ({ page, request }) => {
    await onToday(page, request);
    await goal(page, 'mind').click();
    await goal(page, 'body').click();
    await goal(page, 'wildcard').click();
    for (let step = 0; step < 6; step += 1) await button(page, '15 minutes more').click();
    await button(page, 'One beer more').click();
    // 3 goals, 1.5 hours at par 3 is +2, and 1 beer is -1.
    await expect(total(page)).toContainText('+4');
  });

  test('What you logged is still there the next time the app opens', async ({ page, request }) => {
    await onToday(page, request);
    await goal(page, 'body').click();
    await button(page, 'One beer more').click();
    await saved(page);
    await page.reload();
    await tapToEnter(page);
    await expect(goal(page, 'body')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.beer-count')).toContainText('1');
  });

  test('Yesterday can be fixed until it locks at noon', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    // Whatever the time of day the test runs, make yesterday still open.
    await setWindow(request, season, season.yesterday, { start: new Date(Date.now() - 30 * HOUR), lock: new Date(Date.now() + 2 * HOUR) });
    await button(page, 'Yesterday Fix until 12:00 pm').click();
    await goal(page, 'wildcard').click();
    await expect(total(page)).toContainText('+1');
    await saved(page);
    expect((await dayDoc(request, season, player, season.yesterday))?.goals).toEqual({ mind: false, body: false, wildcard: true });
    expect(await dayDoc(request, season, player, season.today)).toBeNull();
  });

  test('Once yesterday has locked, there is no going back to it', async ({ page, request }) => {
    const { season } = await onToday(page, request);
    await setWindow(request, season, season.yesterday, { start: new Date(Date.now() - 40 * HOUR), lock: new Date(Date.now() - HOUR) });
    await page.reload();
    await tapToEnter(page);
    await expect(total(page)).toBeVisible();
    await expect(page.getByRole('group', { name: 'Which day' })).toHaveCount(0);
  });

  test('A locked day shows its final score, and nothing on it can be changed', async ({ page, request }) => {
    const { season } = await onToday(page, request);
    await setWindow(request, season, season.today, { start: new Date(Date.now() - 30 * HOUR), lock: new Date(Date.now() - HOUR) });
    await expect(page.getByText('This day is locked.')).toBeVisible();
    // Nothing logged, and locked: the -5 no-show.
    await expect(total(page)).toContainText('−5');
    await expect(page.getByText('Final', { exact: true })).toBeVisible();
    await expect(goal(page, 'mind')).toBeDisabled();
    await expect(button(page, '15 minutes more')).toBeDisabled();
    await expect(button(page, 'One beer more')).toBeDisabled();
  });

  test('On your rest day the goals take the day off, and screen time and beers still count', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    const today = await readDoc(request, `${season.path}/calendar/${season.today}`);
    await writeDoc(request, `${season.path}/kit/${String(today?.period)}_${player}_rest`, { player, item: 'rest', period: String(today?.period), date: season.today, at: new Date() });
    await expect(page.locator('.today-rest')).toHaveText('Rest day');
    await expect(goal(page, 'mind')).toBeDisabled();
    await expect(goal(page, 'mind')).toContainText('Rest');
    await button(page, '15 minutes more').click();
    // 15 minutes at par 3 is +3, the best rest day.
    await expect(total(page)).toContainText('+3');
  });

  test('A goal that is not set yet cannot be tapped', async ({ page, request }) => {
    await onToday(page, request, { goals: false });
    await expect(goal(page, 'mind')).toContainText('Set at the draft');
    await expect(goal(page, 'mind')).toBeDisabled();
  });

  test('The squares fit an iPhone screen, with buttons big enough to tap', async ({ page, request }) => {
    await onToday(page, request);
    const width = page.viewportSize()!.width;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const name of ['15 minutes less', '15 minutes more', 'One beer less', 'One beer more']) {
      const box = await button(page, name).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('A season change made elsewhere shows up live, without reopening the app', async ({ page, request }) => {
    const league = await createLeague(request);
    await joinAs(page, league, 'Riley');
    await button(page, "I've saved it").click();
    await expect(page.getByRole('heading', { name: 'No season yet' })).toBeVisible();
    await startSeason(request, league);
    await expect(total(page)).toBeVisible();
    await patchDoc(request, `leagues/${league.id}`, { season: null });
    await expect(page.getByRole('heading', { name: 'No season yet' })).toBeVisible();
  });
});
