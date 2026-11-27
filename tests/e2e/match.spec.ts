import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { joinAs, tapToEnter } from './helpers.ts';
import { addPlayer, createLeague, futureDays, patchDoc, readDoc, setGoals, setTargets, startSeason, thisWeek, writeDoc } from './league.ts';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });
const theirGoal = (page: Page, lane: string) => page.locator(`.match-check .check-goal[data-lane="${lane}"]`);
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayName = (date: string) => DAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7]!;

/** Riley against Maya in Week 2, on Game Day. Both rest days are moved off today. */
async function onMatch(page: Page, request: APIRequestContext, opponent: 'maya' | 'house' | 'none' = 'maya') {
  const league = await createLeague(request, { name: 'Sunday Squad' });
  const season = await startSeason(request, league);
  const key = await joinAs(page, league, 'Riley');
  const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
  await setGoals(request, season, me, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
  await addPlayer(request, league, season, 'maya', 'Maya');
  if (opponent === 'maya') await setTargets(request, season, { [me]: ['maya'], maya: [me] });
  if (opponent === 'house') await setTargets(request, season, { [me]: ['HOUSE'], maya: ['HOUSE'] });
  const [dayA, dayB] = await futureDays(request, season);
  const { period } = thisWeek(season);
  for (const player of [me, 'maya']) {
    await writeDoc(request, `${season.path}/kit/${period}_${player}_rest`, { player, item: 'rest', period, date: dayB, at: new Date() });
  }
  await button(page, "I've saved it").click();
  await expect(page.getByRole('heading', { name: 'Game Day', level: 1 })).toBeVisible();
  return { league, season, me, dayA, dayB, period };
}

/** Opens Maya's day from her car on the scoreboard. */
async function theirDay(page: Page) {
  await page.getByRole('button', { name: /^See Maya's day/ }).click();
  await expect(page.getByRole('dialog', { name: "Maya's day" })).toBeVisible();
}

const mayaLogs = (request: APIRequestContext, path: string, date: string, entry: { goals: Record<string, boolean>; screenMinutes: number | null; beers: number }) =>
  writeDoc(request, `${path}/days/maya_${date}`, { player: 'maya', date, ...entry, firstAt: new Date(), updatedAt: new Date() });

test.describe('Game Day: your matchup', () => {
  test('After a loss, you can challenge the winner to a rematch: a side race the next week, by its Wednesday', async ({ page, request }) => {
    const { season, me } = await onMatch(page, request);
    // Last week Maya beat you, and it is final. Today is this week's Tuesday.
    await writeDoc(request, `${season.path}/weeks/w01`, {
      week: 1,
      mode: 'regular',
      status: 'final',
      results: { [me]: { player: me, opponent: 'maya', outcome: 'loss', points: 18, opponentPoints: 22 }, maya: { player: 'maya', opponent: me, outcome: 'win', points: 22, opponentPoints: 18 } },
    });
    await patchDoc(request, `${season.path}/calendar/${season.today}`, { dayIndex: 1 });
    const panel = page.getByRole('region', { name: 'Rematch?' });
    await expect(panel).toContainText('Maya beat you 22–18 in Week 1.');
    await panel.getByRole('button', { name: 'Challenge Maya' }).click();
    await expect(page.getByRole('region', { name: 'Rematch on' })).toContainText('You challenged Maya after Week 1.');
    await expect.poll(async () => (await readDoc(request, `${season.path}/rematches/w01_${me}`))?.to).toBe('maya');
  });

  test('Game Day runs top to bottom: the scoreboard, your day, the power-ups, a slim Poke, then receipts from your opponent', async ({ page, request }) => {
    await onMatch(page, request);
    const top = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!.y;
    const order = [page.locator('.board'), page.getByRole('region', { name: 'Your day' }), page.locator('.power'), button(page, 'Poke Maya'), page.getByRole('region', { name: 'Receipts?' })];
    const ys = [];
    for (const part of order) ys.push(await top(part));
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    // The Poke is one slim bar.
    const poke = await button(page, 'Poke Maya').boundingBox();
    expect(poke!.height).toBeLessThanOrEqual(48);
    // On an iPhone, the scoreboard and all three goals are on screen without scrolling.
    const tabs = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
    for (const lane of ['mind', 'body', 'wildcard']) {
      const row = await page.locator(`.check-goal[data-lane="${lane}"]`).boundingBox();
      expect(row!.y + row!.height).toBeLessThanOrEqual(tabs!.y);
    }
  });

  test("Each car's dial fills a slice for every goal in today and one for screen time, yours and your opponent's, live", async ({ page, request }) => {
    const { season } = await onMatch(page, request);
    await expect(page.getByRole('img', { name: 'Your day: 0 of 3 goals in, screen time not logged' })).toBeVisible();
    await expect(page.getByRole('img', { name: "Maya's day: 0 of 3 goals in, screen time not logged" })).toBeVisible();
    await page.locator('.check-goal[data-lane="mind"]').click();
    await expect(page.getByRole('img', { name: 'Your day: 1 of 3 goals in, screen time not logged' })).toBeVisible();
    await mayaLogs(request, season.path, season.today, { goals: { mind: true, body: true, wildcard: false }, screenMinutes: 60, beers: 0 });
    await expect(page.getByRole('img', { name: "Maya's day: 2 of 3 goals in, screen time logged" })).toBeVisible();
    await expect(page.locator('.week-them .boost-slice[data-on="true"]')).toHaveCount(3);
    await expect(page.locator('.week-them .boost-value')).toHaveText('75');
  });

  test('You can poke your opponent once a day, and the league keeps it', async ({ page, request }) => {
    const { season, me } = await onMatch(page, request);
    await button(page, 'Poke Maya').click();
    await expect(button(page, 'Poked today')).toBeDisabled();
    await expect(page.locator('.match-poke').getByRole('status')).toHaveText('Sent. Maya gets a "you awake?" alert, if their alerts are on.');
    const poke = () => readDoc(request, `${season.path}/pokes/${season.today}_${me}`);
    await expect.poll(async () => (await poke())?.to).toBe('maya');
    expect(await poke()).toMatchObject({ player: me, to: 'maya', date: season.today });
    // Still poked after the app opens again.
    await page.reload();
    await tapToEnter(page);
    await expect(button(page, 'Poked today')).toBeDisabled();
  });

  test('Your all-time record against your opponent shows on the scoreboard; whoever has beaten you most is your nemesis, with a skull here and in League', async ({ page, request }) => {
    const { league, me } = await onMatch(page, request);
    await expect(page.locator('.board-record')).toHaveText('All-time against Maya: 0–0–0');
    await expect(page.locator('.match-nemesis')).toHaveCount(0);

    await patchDoc(request, `leagues/${league.id}/players/${me}`, { rivals: { maya: { win: 1, draw: 0, loss: 2, lastMet: { season: 's1', week: 1 } } } });
    await expect(page.locator('.board-record')).toHaveText('All-time against Maya: 1–0–2');
    await expect(page.locator('.board-side[data-team="orange"] .match-nemesis')).toHaveText('💀 Nemesis');

    await tab(page, 'League').click();
    const rivalries = page.getByRole('region', { name: 'Your rivalries' });
    await expect(rivalries.getByRole('listitem').first()).toContainText('Maya');
    await expect(rivalries.getByRole('img', { name: 'your nemesis' })).toHaveCount(1);
    await expect(rivalries.locator('.rivals-record')).toHaveText('1–0–2');
  });

  test("Your car faces your opponent's across the score, each in its own paint, theirs on team orange", async ({ page, request }) => {
    const { league } = await onMatch(page, request);
    const car = (team: string) => page.locator(`.board-side[data-team="${team}"] .board-car-art`);
    await expect(car('blue')).toHaveAttribute('data-car', 'dart cobalt');
    await expect(car('orange')).toHaveAttribute('data-car', 'dart cobalt');
    await patchDoc(request, `leagues/${league.id}/players/maya`, { car: { body: 'bruiser', paint: 'racingRed', decal: 'none', wheels: 'stock', boost: 'team', explosion: 'stock', topper: 'none' } });
    await expect(car('orange')).toHaveAttribute('data-car', 'bruiser racingRed');
  });

  test("A tap on your opponent's car opens their day, live, in team orange, as checklist rows like yours: their goals, screen time and beers; Close goes back", async ({ page, request }) => {
    const { season } = await onMatch(page, request);
    await theirDay(page);
    await expect(theirGoal(page, 'mind')).toContainText('Study 1 hour');

    await mayaLogs(request, season.path, season.today, { goals: { mind: true, body: true, wildcard: false }, screenMinutes: 60, beers: 1 });
    await expect(theirGoal(page, 'mind')).toHaveAttribute('data-state', 'hit');
    await expect(theirGoal(page, 'body')).toHaveAttribute('data-state', 'hit');
    await expect(page.locator('.match-check .check-screen .square-value')).toHaveText('1 h');
    await expect(page.locator('.match-check .check-screen .square-chip')).toHaveText('+2 pts');
    await expect(page.locator('.match-beers')).toContainText('1');
    // 2 goals, 1 hour at par 3 is +2, and 1 beer: +3.
    await expect(page.locator('.match-day-total')).toContainText('+3');
    await button(page, 'Close').click();
    await expect(page.getByRole('dialog', { name: "Maya's day" })).toHaveCount(0);
  });

  test('Their Aerial shows when it is on today, and doubles their day', async ({ page, request }) => {
    const { season, period } = await onMatch(page, request);
    await mayaLogs(request, season.path, season.today, { goals: { mind: true, body: false, wildcard: false }, screenMinutes: null, beers: 0 });
    await theirDay(page);
    await expect(page.locator('.match-day-total')).toContainText('+1');
    await writeDoc(request, `${season.path}/kit/${period}_maya_aerial`, { player: 'maya', item: 'aerial', period, date: season.today, at: new Date() });
    await expect(page.getByText('Aerial: counts double')).toBeVisible();
    await expect(page.locator('.match-day-total')).toContainText('+2');
  });

  test('The scoreboard has your week in blue, and their day card has their week in orange', async ({ page, request }) => {
    await onMatch(page, request);
    await expect(page.locator('.board-side[data-team="orange"] .board-name')).toHaveText('Maya');
    await expect(page.locator('.board .week-days li')).toHaveCount(7);
    await expect(page.locator('.board .week-lead')).toHaveText(/lead|Level|All square/);
    await theirDay(page);
    await expect(page.locator('.match-row[data-team="orange"] .match-cells li')).toHaveCount(7);
  });

  test('Your own Demolition on them shows here, to you alone', async ({ page, request }) => {
    const { season, me, dayA, period } = await onMatch(page, request);
    const day = await readDoc(request, `${season.path}/calendar/${dayA}`);
    await writeDoc(request, `${season.path}/sealed/${period}_${me}_demolition`, {
      kind: 'demolition',
      player: me,
      period,
      target: 'maya',
      date: dayA,
      lane: 'body',
      revealAt: new Date(String(day?.lock)),
      at: new Date(),
    });
    await expect(page.locator('.match-secret')).toHaveText(`Your Demolition: ${dayName(dayA)}, their Body goal. Only you can see it until noon the next day.`);
  });

  test("Against The House, Game Day shows the scoreboard, with The House scoring the league's average and no day to open", async ({ page, request }) => {
    await onMatch(page, request, 'house');
    const house = page.locator('.board-side[data-house="true"]');
    await expect(house.locator('.board-name')).toHaveText('The House');
    await expect(page.getByRole('img', { name: "The House scores the league's average" })).toBeVisible();
    await expect(page.locator('.board-record')).toHaveText("The House scores the league's average this week.");
    await expect(page.getByRole('button', { name: /^See .*'s day/ })).toHaveCount(0);
    await expect(page.locator('.board-side[data-team="blue"] .board-name')).toHaveText('You');
  });

  test("The House's score is everyone else's average so far: the players not facing The House", async ({ page, request }) => {
    const { league, season, me, dayB, period } = await onMatch(page, request, 'house');
    await addPlayer(request, league, season, 'sam', 'Sam');
    await writeDoc(request, `${season.path}/kit/${period}_sam_rest`, { player: 'sam', item: 'rest', period, date: dayB, at: new Date() });
    await writeDoc(request, `${season.path}/weeks/${period}`, { week: 2, mode: 'regular', pairs: [{ a: me, b: 'HOUSE' }, { a: 'maya', b: 'sam' }], targets: { [me]: ['HOUSE'], maya: ['sam'], sam: ['maya'] } });
    // Today Maya scores +4 (3 goals, 1 hour at par 3 is +2, 1 beer) and Sam 0 (1 goal, 4 hours is −1). The
    // days this week that have already locked are no-shows for all three of us, so The House, at their
    // average, is 2 ahead of you.
    await mayaLogs(request, season.path, season.today, { goals: { mind: true, body: true, wildcard: true }, screenMinutes: 60, beers: 1 });
    await writeDoc(request, `${season.path}/days/sam_${season.today}`, { player: 'sam', date: season.today, goals: { mind: true, body: false, wildcard: false }, screenMinutes: 240, beers: 0, firstAt: new Date(), updatedAt: new Date() });
    await expect(page.locator('.board .week-lead')).toHaveText('The House leads by 2');
    const points = async (side: string) => Number((await page.locator(`${side} .board-points`).textContent())!.replace('−', '-'));
    expect(await points('.board-side[data-house="true"]')).toBe((await points('.board-side[data-team="blue"]')) + 2);
  });

  test('Before the schedule is out, Game Day waits for an opponent', async ({ page, request }) => {
    await onMatch(page, request, 'none');
    await expect(page.locator('.week-lead')).toContainText('Your opponent shows here once the schedule is out.');
    await expect(page.getByRole('button', { name: /^Poke/ })).toHaveCount(0);
  });
});
