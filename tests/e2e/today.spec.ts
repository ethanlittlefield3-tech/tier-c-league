import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { joinAs, tapToEnter } from './helpers.ts';
import { createLeague, patchDoc, readDoc, setGoals, setWindow, startSeason, writeDoc, type TestLeague, type TestSeason } from './league.ts';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const total = (page: Page) => page.locator('.today-points');
const goal = (page: Page, lane: string) => page.locator(`.check-goal[data-lane="${lane}"]`);
const screenCard = (page: Page) => page.getByRole('button', { name: /^Screen time:/ });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Unproductive screen time' });
const yesterdayPill = (page: Page) => page.getByRole('button', { name: /^Yesterday/ });

/** Opens the screen-time sheet, taps a step button a number of times, and saves. */
async function logScreen(page: Page, stepName: string, times: number) {
  await screenCard(page).click();
  for (let step = 0; step < times; step += 1) await sheet(page).getByRole('button', { name: stepName, exact: true }).click();
  await sheet(page).getByRole('button', { name: 'Save screen time' }).click();
  await expect(sheet(page)).toHaveCount(0);
}
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
    await expect(page.getByRole('button', { name: /^Today ·/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('Tapping a goal marks it hit, adds 1, and saves it; the breakdown and "Saved" share one quiet line', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    await goal(page, 'mind').click();
    await expect(goal(page, 'mind')).toHaveAttribute('aria-pressed', 'true');
    await expect(total(page)).toContainText('+1');
    await saved(page);
    await expect(page.locator('.today-line')).toHaveText(/^Goals \+1.*Saved$/);
    const day = await dayDoc(request, season, player, season.today);
    expect(day).toMatchObject({ player, date: season.today, goals: { mind: true, body: false, wildcard: false }, screenMinutes: null, beers: 0 });

    // Tapping it again takes it back.
    await goal(page, 'mind').click();
    await expect(goal(page, 'mind')).toHaveAttribute('aria-pressed', 'false');
    await expect(total(page)).toContainText('0');
  });

  test('Filling the dial, all three goals in and screen time logged, plays your goal explosion; less than that, or taking one back, plays nothing', async ({ page, request }) => {
    const { league, player } = await onToday(page, request);
    await patchDoc(request, `leagues/${league.id}/players/${player}`, { car: { explosion: 'confetti' } });
    const burst = page.locator('.today-burst .boom');
    await goal(page, 'mind').click();
    await goal(page, 'body').click();
    await goal(page, 'wildcard').click();
    await expect(goal(page, 'wildcard')).toHaveAttribute('aria-pressed', 'true');
    // Three goals, but no screen time yet: nothing.
    await expect(burst).toHaveCount(0);
    await logScreen(page, '15 minutes more', 2);
    await expect(burst).toHaveCount(1);
    await expect(burst).toHaveAttribute('data-kind', 'confetti');
    await expect(page.locator('.today-burst')).toHaveAttribute('aria-hidden', 'true');
    // Taking a goal back plays nothing; getting it in again fills the dial again.
    await goal(page, 'wildcard').click();
    await expect(goal(page, 'wildcard')).toHaveAttribute('aria-pressed', 'false');
    await goal(page, 'wildcard').click();
    await expect(goal(page, 'wildcard')).toHaveAttribute('aria-pressed', 'true');
    await expect(burst).toHaveCount(1);
    await saved(page);
  });

  test('Screen time moves in 15-minute steps and scores against par', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    await logScreen(page, '15 minutes more', 4);
    await expect(page.locator('.check-screen .square-value')).toHaveText('1 h');
    // At par 3, 1 hour scores +2.
    await expect(page.locator('.check-screen .square-chip')).toHaveText('+2 pts');
    await expect(total(page)).toContainText('+2');
    await saved(page);
    expect((await dayDoc(request, season, player, season.today))?.screenMinutes).toBe(60);

    await logScreen(page, '15 minutes less', 1);
    await expect(page.locator('.check-screen .square-value')).toHaveText('45m');
    await expect(total(page)).toContainText('+3');
  });

  test('Clear it takes screen time back to not logged', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    await logScreen(page, '15 minutes more', 1);
    await expect(page.locator('.check-screen .square-value')).toHaveText('15m');
    await screenCard(page).click();
    await sheet(page).getByRole('button', { name: 'Clear it' }).click();
    await expect(page.locator('.check-screen .square-value')).toHaveText('Not logged');
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

  test('Quick taps all land: a second tap never undoes the first', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    // Three goals and two beers, one right after another, before the screen can redraw.
    await page.evaluate(() => {
      const tap = (selector: string) => document.querySelector<HTMLButtonElement>(selector)!.click();
      tap('.check-goal[data-lane="mind"]');
      tap('.check-goal[data-lane="body"]');
      tap('.check-goal[data-lane="wildcard"]');
      tap('button[aria-label="One beer more"]');
      tap('button[aria-label="One beer more"]');
    });
    await saved(page);
    await expect.poll(async () => (await dayDoc(request, season, player, season.today))?.goals).toEqual({ mind: true, body: true, wildcard: true });
    expect((await dayDoc(request, season, player, season.today))?.beers).toBe(2);
  });

  test('A full day adds up the way the engine scores it', async ({ page, request }) => {
    await onToday(page, request);
    await goal(page, 'mind').click();
    await goal(page, 'body').click();
    await goal(page, 'wildcard').click();
    await logScreen(page, '15 minutes more', 6);
    await button(page, 'One beer more').click();
    // 3 goals, 1.5 hours at par 3 is +2, and 1 beer is -1.
    await expect(total(page)).toContainText('+4');
  });

  test('What you logged is still there the next time the app opens', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    await goal(page, 'body').click();
    await button(page, 'One beer more').click();
    await expect(page.locator('.beer-count')).toContainText('1');
    await saved(page);
    // The server has both before the app closes.
    await expect.poll(async () => (await dayDoc(request, season, player, season.today))?.beers).toBe(1);
    await page.reload();
    await tapToEnter(page);
    await expect(goal(page, 'body')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.beer-count')).toContainText('1');
  });

  test('Yesterday can be fixed until it locks at noon', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    // Whatever the time of day the test runs, make yesterday still open.
    await setWindow(request, season, season.yesterday, { start: new Date(Date.now() - 30 * HOUR), lock: new Date(Date.now() + 2 * HOUR) });
    await yesterdayPill(page).click();
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
    await expect(yesterdayPill(page)).toHaveCount(0);
  });

  test('A locked day shows its final score, and nothing on it can be changed', async ({ page, request }) => {
    const { season } = await onToday(page, request);
    await setWindow(request, season, season.today, { start: new Date(Date.now() - 30 * HOUR), lock: new Date(Date.now() - HOUR) });
    await expect(page.getByText('This day is locked.')).toBeVisible();
    // Nothing logged, and locked: the -5 no-show.
    await expect(total(page)).toContainText('−5');
    await expect(page.getByText('Final', { exact: true })).toBeVisible();
    await expect(goal(page, 'mind')).toBeDisabled();
    await expect(button(page, 'One beer more')).toBeDisabled();
    // The screen-time sheet still opens, to show the scale, but nothing in it can change.
    await screenCard(page).click();
    await expect(sheet(page)).toContainText('This day is locked, so its screen time is final.');
    await expect(sheet(page).getByRole('button', { name: '15 minutes more' })).toBeDisabled();
    await expect(sheet(page).getByRole('button', { name: 'Save screen time' })).toHaveCount(0);
  });

  test('On your rest day the goals take the day off, and screen time and beers still count', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    const today = await readDoc(request, `${season.path}/calendar/${season.today}`);
    await writeDoc(request, `${season.path}/kit/${String(today?.period)}_${player}_rest`, { player, item: 'rest', period: String(today?.period), date: season.today, at: new Date() });
    await expect(page.locator('.today-rest')).toHaveText('Rest day');
    await expect(goal(page, 'mind')).toBeDisabled();
    await expect(goal(page, 'mind')).toContainText('Rest');
    await logScreen(page, '15 minutes more', 1);
    // 15 minutes at par 3 is +3, the best rest day.
    await expect(total(page)).toContainText('+3');
  });

  test('A goal that is not set yet cannot be tapped', async ({ page, request }) => {
    await onToday(page, request, { goals: false });
    await expect(goal(page, 'mind')).toContainText('Set at the draft');
    await expect(goal(page, 'mind')).toBeDisabled();
  });

  for (const phone of [
    { name: 'an iPhone 13', width: 390, height: 797 },
    { name: 'a small iPhone SE', width: 375, height: 647 },
  ]) {
    test(`Your three goals and screen time are on screen without scrolling, on ${phone.name}`, async ({ page, request }) => {
      // The Home Screen app's own size: the screen less the status bar.
      await page.setViewportSize({ width: phone.width, height: phone.height });
      const { season } = await onToday(page, request);
      // The tightest case: before noon, yesterday can still be fixed, so both day pills show.
      await setWindow(request, season, season.yesterday, { start: new Date(Date.now() - 20 * HOUR), lock: new Date(Date.now() + 2 * HOUR) });
      await expect(yesterdayPill(page)).toBeVisible();
      const tabs = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
      for (const square of [screenCard(page), goal(page, 'mind'), goal(page, 'body'), goal(page, 'wildcard')]) {
        const box = await square.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y).toBeGreaterThan(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(tabs!.y);
        expect(box!.x + box!.width).toBeLessThanOrEqual(phone.width);
      }
      expect(await page.evaluate(() => document.getElementById('app')!.scrollTop)).toBe(0);
    });
  }

  test('Beers and the power-ups are below, a scroll away, with buttons big enough to tap', async ({ page, request }) => {
    await onToday(page, request);
    await page.locator('.power').scrollIntoViewIfNeeded();
    await expect(page.locator('.power')).toBeInViewport();
    for (const name of ['One beer less', 'One beer more']) {
      const box = await button(page, name).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test('Tapping screen time opens a card over the squares, all on screen: the time, its points and the slider, with no points table', async ({ page, request }) => {
    await onToday(page, request);
    // Scrolled down a little first: the card still opens on the screen, not further down the page.
    await page.locator('#app').evaluate((app) => app.scrollTo(0, 200));
    await screenCard(page).click();
    await expect(sheet(page)).toBeVisible();
    const box = (await sheet(page).boundingBox())!;
    const view = page.viewportSize()!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(view.height);
    await expect(sheet(page).locator('.sheet-value')).toContainText('0m');
    await expect(sheet(page).locator('.sheet-value')).toContainText('+3 pts');
    await expect(sheet(page).getByRole('slider', { name: 'Screen time' })).toBeVisible();
    await expect(sheet(page).locator('li')).toHaveCount(0);
    await sheet(page).getByRole('button', { name: '1 hour more' }).click();
    await sheet(page).getByRole('button', { name: '1 hour more' }).click();
    await sheet(page).getByRole('button', { name: '15 minutes more' }).click();
    await expect(sheet(page).locator('.sheet-value')).toContainText('2 h 15m');
    await expect(sheet(page).locator('.sheet-value')).toContainText('+1 pt');
  });

  test('Close leaves screen time as it was', async ({ page, request }) => {
    const { season, player } = await onToday(page, request);
    await screenCard(page).click();
    await sheet(page).getByRole('button', { name: '1 hour more' }).click();
    await sheet(page).getByRole('button', { name: 'Close' }).click();
    await expect(sheet(page)).toHaveCount(0);
    await expect(page.locator('.check-screen .square-value')).toHaveText('Not logged');
    expect(await dayDoc(request, season, player, season.today)).toBeNull();
    // The focus goes back to the card that opened it.
    await expect(screenCard(page)).toBeFocused();
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
