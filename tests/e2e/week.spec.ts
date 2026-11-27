import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { joinAs } from './helpers.ts';
import { addPlayer, createLeague, futureDays, readDoc, setGoals, setTargets, startSeason, thisWeek, writeDoc } from './league.ts';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const goal = (page: Page, lane: string) => page.locator(`.check-goal[data-lane="${lane}"]`);
const myPoints = (page: Page) => page.locator('.week-me strong');
const theirPoints = (page: Page) => page.locator('.week-them strong');
/** "+6", "0" or "−5" as a number. */
const value = async (locator: ReturnType<Page['locator']>) => Number(((await locator.textContent()) ?? '0').replace('−', '-').replace('+', ''));

/** Riley against Maya in Week 2. Two days are moved into the future, and both rest days onto the second of them. */
async function inWeek(page: Page, request: APIRequestContext, opponent: 'maya' | 'house' = 'maya') {
  const league = await createLeague(request, { name: 'Sunday Squad' });
  const season = await startSeason(request, league);
  const key = await joinAs(page, league, 'Riley');
  const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
  await setGoals(request, season, me, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
  await addPlayer(request, league, season, 'maya', 'Maya');
  await setTargets(request, season, opponent === 'maya' ? { [me]: ['maya'], maya: [me] } : { [me]: ['HOUSE'], maya: ['HOUSE'] });
  const [dayA, dayB] = await futureDays(request, season);
  const { period } = thisWeek(season);
  for (const player of [me, 'maya']) {
    await writeDoc(request, `${season.path}/kit/${period}_${player}_rest`, { player, item: 'rest', period, date: dayB, at: new Date() });
  }
  await button(page, "I've saved it").click();
  await expect(page.locator('.week')).toBeVisible();
  return { league, season, me, dayA, dayB, period };
}

test.describe('This week', () => {
  test('Seven days: today live and underlined, days not started dashed', async ({ page, request }) => {
    const { season, dayA, dayB } = await inWeek(page, request);
    await expect(page.locator('.week-days li')).toHaveCount(7);
    const { dates } = thisWeek(season);
    const today = page.locator('.week-days li').nth(dates.indexOf(season.today));
    await expect(today).toHaveAttribute('data-today', 'true');
    await expect(today).toHaveAttribute('data-state', 'open');
    for (const date of [dayA, dayB]) await expect(page.locator('.week-days li').nth(dates.indexOf(date))).toHaveAttribute('data-state', 'future');

    await goal(page, 'mind').click();
    await expect(today.locator('.week-cell')).toHaveText('+1');
  });

  test('The scoreboard shows you against your opponent, and moves live as either of you logs', async ({ page, request }) => {
    const { season } = await inWeek(page, request);
    await expect(page.locator('.week-them')).toContainText('Maya');
    const mineBefore = await value(myPoints(page));
    const theirsBefore = await value(theirPoints(page));

    await goal(page, 'body').click();
    await expect.poll(() => value(myPoints(page))).toBe(mineBefore + 1);

    // Maya logs a full day on her phone: 3 goals and 30 minutes at par 3 is +6.
    await writeDoc(request, `${season.path}/days/maya_${season.today}`, {
      player: 'maya',
      date: season.today,
      goals: { mind: true, body: true, wildcard: true },
      screenMinutes: 30,
      beers: 0,
      firstAt: new Date(),
      updatedAt: new Date(),
    });
    await expect.poll(() => value(theirPoints(page))).toBe(theirsBefore + 6);
    await expect(page.locator('.week-lead')).toHaveText(/leads by|lead by|Level on points|All square/);
  });

  test("The win meter shows who's favored, from points so far and each side's recent pace, and moves as either of you logs", async ({ page, request }) => {
    const { season } = await inWeek(page, request);
    const meter = page.getByRole('meter', { name: 'Win meter' });
    await expect(meter).toHaveAttribute('aria-valuetext', 'Too close to call');
    const before = Number(await meter.getAttribute('aria-valuenow'));

    // Maya logs a full day: +6, and nothing from you yet.
    await writeDoc(request, `${season.path}/days/maya_${season.today}`, {
      player: 'maya',
      date: season.today,
      goals: { mind: true, body: true, wildcard: true },
      screenMinutes: 30,
      beers: 0,
      firstAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(meter).toHaveAttribute('aria-valuetext', /^Maya is favored, \d+%$/);
    expect(Number(await meter.getAttribute('aria-valuenow'))).toBeLessThan(before);
    await expect(page.locator('.meter-text')).toHaveText(/^Maya is favored/);
  });

  test('Beers this week add up across the week', async ({ page, request }) => {
    await inWeek(page, request);
    await expect(page.locator('.beer-words')).toContainText('0 this week');
    await button(page, 'One beer more').click();
    await button(page, 'One beer more').click();
    await expect(page.locator('.beer-words')).toContainText('2 this week');
  });

  test('Against The House, the scoreboard says so', async ({ page, request }) => {
    await inWeek(page, request, 'house');
    await expect(page.locator('.board-side[data-house="true"] .board-name')).toHaveText('The House');
    await expect(page.locator('.board-record')).toHaveText("The House scores the league's average this week.");
  });
});
