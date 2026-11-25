import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { addDays } from '../../engine/src/calendar.ts';
import { weekPeriod } from '../../engine/src/ids.ts';
import { joinAs } from './helpers.ts';
import { addPlayer, createLeague, futureDays, patchDoc, readDoc, setGoals, setTargets, startSeason, thisWeek, writeDoc } from './league.ts';

const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });
const tile = (page: Page, item: string) => page.locator(`.power-tile[data-item="${item}"]`);
const total = (page: Page) => page.locator('.today-points');
const goal = (page: Page, lane: string) => page.locator(`.square-goal[data-lane="${lane}"]`);
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayName = (date: string) => DAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7]!;
const short = (date: string) => dayName(date).slice(0, 3);

/**
 * Riley joins a league in Week 2 against Maya. Two days of this week are
 * moved into the future, and Riley's rest day is on the second of them, so
 * today is never a rest day, whatever day the test runs.
 */
async function inWeek(page: Page, request: APIRequestContext, options: { opponent?: 'maya' | 'house' | 'none' } = {}) {
  const league = await createLeague(request, { name: 'Sunday Squad' });
  const season = await startSeason(request, league);
  const key = await joinAs(page, league, 'Riley');
  const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
  await setGoals(request, season, me, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
  await addPlayer(request, league, season, 'maya', 'Maya');
  const opponent = options.opponent ?? 'maya';
  if (opponent === 'maya') await setTargets(request, season, { [me]: ['maya'], maya: [me] });
  if (opponent === 'house') await setTargets(request, season, { [me]: ['HOUSE'], maya: ['HOUSE'] });
  const [dayA, dayB] = await futureDays(request, season);
  const { period } = thisWeek(season);
  await writeDoc(request, `${season.path}/kit/${period}_${me}_rest`, { player: me, item: 'rest', period, date: dayB, at: new Date() });
  await button(page, "I've saved it").click();
  await expect(page.locator('.power')).toBeVisible();
  return { league, season, me, dayA, dayB, period, kit: (id: string) => readDoc(request, `${season.path}/kit/${id}`) };
}

test.describe('Aerial', () => {
  test('Can be set on a day that has not started, moved, and cancelled until then', async ({ page, request }) => {
    const { me, dayA, dayB, period, kit } = await inWeek(page, request);
    await expect(tile(page, 'aerial')).toContainText('Ready');
    await tile(page, 'aerial').click();
    await button(page, `Aerial on ${dayName(dayA)}`).click();
    await expect(tile(page, 'aerial')).toContainText(`Set: ${short(dayA)}`);
    await expect.poll(async () => (await kit(`${period}_${me}_aerial`))?.date).toBe(dayA);

    await button(page, `Aerial on ${dayName(dayB)}`).click();
    await expect(tile(page, 'aerial')).toContainText(`Set: ${short(dayB)}`);
    await expect.poll(async () => (await kit(`${period}_${me}_aerial`))?.date).toBe(dayB);

    await button(page, 'Cancel Aerial').click();
    await expect(tile(page, 'aerial')).toContainText('Ready');
    await expect.poll(() => kit(`${period}_${me}_aerial`)).toBeNull();
  });

  test('Today and yesterday are not offered: their days have started', async ({ page, request }) => {
    const { season } = await inWeek(page, request);
    await tile(page, 'aerial').click();
    await expect(button(page, `Aerial on ${dayName(season.today)}`)).toHaveCount(0);
  });

  test('With Aerial on the day, the day counts double', async ({ page, request }) => {
    const { season, me, period } = await inWeek(page, request);
    await writeDoc(request, `${season.path}/kit/${period}_${me}_aerial`, { player: me, item: 'aerial', period, date: season.today, at: new Date() });
    await expect(page.getByText('Aerial: this day counts double')).toBeVisible();
    await goal(page, 'mind').click();
    // 1 goal, doubled.
    await expect(total(page)).toContainText('+2');
  });
});

test.describe('Full Boost', () => {
  test('Counts a missed goal as hit, and can be taken back until the day locks', async ({ page, request }) => {
    const { season, me, period, kit } = await inWeek(page, request);
    await tile(page, 'fullBoost').click();
    const todayGroup = page.locator('.power-boost-day').filter({ hasText: dayName(season.today) });
    await todayGroup.getByRole('button', { name: /Count Body/ }).click();
    await expect(goal(page, 'body')).toHaveAttribute('data-state', 'boosted');
    await expect(total(page)).toContainText('+1');
    await expect.poll(async () => (await kit(`${period}_${me}_fullBoost`))?.lane).toBe('body');

    await button(page, 'Take back Full Boost').click();
    await expect(goal(page, 'body')).not.toHaveAttribute('data-state', 'boosted');
    await expect(total(page)).toContainText('0');
    await expect.poll(() => kit(`${period}_${me}_fullBoost`)).toBeNull();
  });

  test('Only offers the goals you missed', async ({ page, request }) => {
    const { season } = await inWeek(page, request);
    await goal(page, 'mind').click();
    await expect(goal(page, 'mind')).toHaveAttribute('aria-pressed', 'true');
    await tile(page, 'fullBoost').click();
    const todayGroup = page.locator('.power-boost-day').filter({ hasText: dayName(season.today) });
    await expect(todayGroup.getByRole('button', { name: /Count Mind/ })).toHaveCount(0);
    await expect(todayGroup.getByRole('button', { name: /Count Body/ })).toHaveCount(1);
  });
});

test.describe('A power-up belongs to the week of its day', () => {
  test("On a Monday morning, yesterday's Full Boost comes from last week's kit", async ({ page, request }) => {
    const { season, me, period, kit } = await inWeek(page, request);
    const H = 3_600_000;
    // Make yesterday last week's Saturday, still open: what Monday morning looks like, on any day.
    await patchDoc(request, `${season.path}/calendar/${season.yesterday}`, { period: 'w01', week: 1, dayIndex: 5, start: new Date(Date.now() - 30 * H), lock: new Date(Date.now() + 2 * H) });
    // This week's Full Boost is already used, today.
    await writeDoc(request, `${season.path}/kit/${period}_${me}_fullBoost`, { player: me, item: 'fullBoost', period, date: season.today, lane: 'wildcard', at: new Date() });
    await expect(goal(page, 'wildcard')).toHaveAttribute('data-state', 'boosted');

    await tile(page, 'fullBoost').click();
    const yesterday = page.locator('.power-boost-day').filter({ hasText: dayName(season.yesterday) });
    await yesterday.getByRole('button', { name: /Count Body/ }).click();
    await expect.poll(async () => (await kit(`w01_${me}_fullBoost`))?.date).toBe(season.yesterday);
    // This week's is untouched.
    expect((await kit(`${period}_${me}_fullBoost`))?.lane).toBe('wildcard');

    await page.getByRole('button', { name: /^Yesterday/ }).click();
    await expect(goal(page, 'body')).toHaveAttribute('data-state', 'boosted');
  });
});

test.describe('Rule One', () => {
  test('Makes the day 0, uses one of the grace days, and can be taken back until the day locks', async ({ page, request }) => {
    const { season, me, kit } = await inWeek(page, request);
    await goal(page, 'mind').click();
    await expect(total(page)).toContainText('+1');
    await expect(tile(page, 'ruleOne')).toContainText('1 left');
    await tile(page, 'ruleOne').click();
    await button(page, `Use Rule One on ${dayName(season.today)}`).click();
    await expect(page.getByText('Rule One: this day scores 0')).toBeVisible();
    await expect(total(page)).toContainText('0');
    await expect(tile(page, 'ruleOne')).toContainText('0 left');
    await expect.poll(async () => (await kit(`ruleOne_${me}_1`))?.date).toBe(season.today);

    await button(page, `Take back Rule One on ${dayName(season.today)}`).click();
    await expect(total(page)).toContainText('+1');
    await expect(tile(page, 'ruleOne')).toContainText('1 left');
  });
});

test.describe('Demolition', () => {
  test("Pick a day and one of your opponent's goals: it is final, and sealed", async ({ page, request }) => {
    const { season, me, dayA, period } = await inWeek(page, request);
    await expect(tile(page, 'demolition')).toContainText('Ready');
    await tile(page, 'demolition').click();
    await expect(page.locator('#power-demolition')).toContainText("Pick one of Maya's goals");
    await button(page, `Demolition on ${dayName(dayA)}`).click();
    await page.locator('#power-demolition').getByRole('button', { name: /Gym/ }).click();
    await button(page, 'Set Demolition').click();
    await expect(page.getByText('This is final.')).toBeVisible();
    await button(page, 'Demolish').click();
    await expect(tile(page, 'demolition')).toContainText(`Set: ${short(dayA)}`);
    await expect(page.locator('#power-demolition')).toContainText('Only you can see it until noon the next day.');

    // The tile changes as soon as the phone has it. Wait until the server does too.
    const path = `${season.path}/sealed/${period}_${me}_demolition`;
    await expect.poll(() => readDoc(request, path)).not.toBeNull();
    const sealed = await readDoc(request, path);
    expect(sealed).toMatchObject({ kind: 'demolition', player: me, target: 'maya', date: dayA, lane: 'body' });
    // It unseals exactly when its day locks.
    const day = await readDoc(request, `${season.path}/calendar/${dayA}`);
    expect(sealed?.revealAt).toBe(day?.lock);
  });

  test("Never on the opponent's rest day", async ({ page, request }) => {
    const { season, dayA, period } = await inWeek(page, request);
    await writeDoc(request, `${season.path}/kit/${period}_maya_rest`, { player: 'maya', item: 'rest', period, date: dayA, at: new Date() });
    await tile(page, 'demolition').click();
    await expect(button(page, `Demolition on ${dayName(dayA)}`)).toHaveCount(0);
  });

  test('Against The House there is nobody to demolish', async ({ page, request }) => {
    await inWeek(page, request, { opponent: 'house' });
    await expect(tile(page, 'demolition')).toContainText('Bye week');
  });

  test('Before the schedule is out, Demolition waits for an opponent', async ({ page, request }) => {
    await inWeek(page, request, { opponent: 'none' });
    await expect(tile(page, 'demolition')).toContainText('No opponent yet');
  });
});

test.describe('The rest day', () => {
  test('Moves to another day that has not started, and the goals take that day off', async ({ page, request }) => {
    const { me, dayA, dayB, period, kit } = await inWeek(page, request);
    await expect(page.locator('.power-rest-row')).toContainText(dayName(dayB));
    await page.locator('.power-rest-row').click();
    await button(page, `Rest on ${dayName(dayA)}`).click();
    await expect(page.locator('.power-rest-row')).toContainText(dayName(dayA));
    await expect.poll(async () => (await kit(`${period}_${me}_rest`))?.date).toBe(dayA);
  });

  test("Next week's rest day can be set early", async ({ page, request }) => {
    const { season, me, kit } = await inWeek(page, request);
    const next = weekPeriod(3);
    await page.locator('.power-rest-row').click();
    await button(page, 'Next week').click();
    // Tuesday of next week.
    const date = addDays(thisWeek(season).dates[1]!, 7);
    await button(page, `Rest on ${dayName(date)}`).click();
    await expect.poll(async () => (await kit(`${next}_${me}_rest`))?.date).toBe(date);
  });
});
