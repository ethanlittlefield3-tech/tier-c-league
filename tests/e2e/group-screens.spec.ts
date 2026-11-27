import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { enterAsCommish, joinAs } from './helpers.ts';
import { addDays } from '../../engine/src/calendar.ts';
import { addPlayer, createLeague, futureDays, listIds, patchDoc, readDoc, setGoals, startSeason, thisWeek, writeDoc } from './league.ts';

const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayName = (date: string) => DAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7]!;

type Goals = { mind: boolean; body: boolean; wildcard: boolean };
const ALL: Goals = { mind: true, body: true, wildcard: true };
const ONE: Goals = { mind: true, body: false, wildcard: false };
const NONE: Goals = { mind: false, body: false, wildcard: false };

/**
 * Riley, Maya, Sam and Jo in a league whose Week 2, this week, is a group-play
 * week. Two days are moved into the future, and everyone's rest day is on the
 * second, so today is never a rest day, whatever day the test runs.
 */
async function groupWeek(page: Page, request: APIRequestContext, week: (me: string, today: string) => Record<string, unknown>) {
  const league = await createLeague(request, { name: 'Sunday Squad' });
  const season = await startSeason(request, league);
  const key = await joinAs(page, league, 'Riley');
  const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
  await setGoals(request, season, me, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
  for (const [id, name] of [['maya', 'Maya'], ['sam', 'Sam'], ['jo', 'Jo']] as const) await addPlayer(request, league, season, id, name);
  const [dayA, dayB] = await futureDays(request, season);
  const { period } = thisWeek(season);
  for (const player of [me, 'maya', 'sam', 'jo']) await writeDoc(request, `${season.path}/kit/${period}_${player}_rest`, { player, item: 'rest', period, date: dayB, at: new Date() });
  await writeDoc(request, `${season.path}/weeks/${period}`, { week: 2, pairs: [], targets: {}, ...week(me, season.today) });
  const log = (player: string, date: string, goals: Goals, screenMinutes: number | null = 30, beers = 0) =>
    writeDoc(request, `${season.path}/days/${player}_${date}`, { player, date, goals, screenMinutes, beers, firstAt: new Date(), updatedAt: new Date() });
  return { league, season, me, dayA, dayB, period, log };
}

test.describe('Group play on the phone', () => {
  test("Team Week: Game Day says which squad you're on, shows both squads' averages live, and Demolition can aim at anyone on the other squad", async ({ page, request }) => {
    const { season, me, dayA, period, log } = await groupWeek(page, request, (me) => ({
      mode: 'teamWeek',
      teams: { blue: [me, 'maya'], orange: ['sam', 'jo'] },
      targets: { [me]: ['sam', 'jo'], maya: ['sam', 'jo'], sam: [me, 'maya'], jo: [me, 'maya'] },
    }));
    // Blue is ahead today: three goals each and a short screen; Orange logs 4 hours each.
    for (const player of [me, 'maya']) await log(player, season.today, ALL);
    for (const player of ['sam', 'jo']) await log(player, season.today, NONE, 240);
    await button(page, "I've saved it").click();

    await expect(page.getByRole('region', { name: 'Week 2: Team Week' })).toBeVisible();
    await expect(page.locator('.group-you')).toContainText("You're on Blue with Maya.");

    // Demolition: pick who on the other squad, then the day and the goal.
    await page.locator('.power-tile[data-item="demolition"]').click();
    const who = page.getByRole('group', { name: 'Who to demolish' });
    await expect(who.getByRole('button')).toHaveText(['Sam', 'Jo']);
    await who.getByRole('button', { name: 'Sam' }).click();
    await expect(page.locator('#power-demolition')).toContainText("Pick one of Sam's goals");
    await button(page, `Demolition on ${dayName(dayA)}`).click();
    await page.locator('#power-demolition').getByRole('button', { name: /Gym/ }).click();
    await button(page, 'Set Demolition').click();
    await button(page, 'Demolish').click();
    await expect.poll(async () => (await readDoc(request, `${season.path}/sealed/${period}_${me}_demolition`))?.target).toBe('sam');

    await tab(page, 'Game Day').click();
    const board = page.getByRole('region', { name: 'Week 2: Team Week' });
    await expect(board.getByRole('list', { name: 'Blue' }).getByRole('listitem')).toHaveCount(2);
    await expect(board.getByRole('list', { name: 'Orange' })).toContainText('Sam');
    await expect(board.locator('.group-lead')).toHaveText('Your side leads on average.');
  });

  test('2v2: Game Day names your duo and your opponents, and puts your matchup first', async ({ page, request }) => {
    const { season, me, log } = await groupWeek(page, request, (me) => ({
      mode: 'twoVTwo',
      roster: [me, 'maya', 'sam', 'jo'],
      duos: [{ a: [me, 'maya'], b: ['sam', 'jo'] }],
      targets: { [me]: ['sam', 'jo'], maya: ['sam', 'jo'], sam: [me, 'maya'], jo: [me, 'maya'] },
    }));
    await log(me, season.today, ONE);
    await log('sam', season.today, ALL);
    await button(page, "I've saved it").click();
    await expect(page.locator('.group-you')).toContainText('You and Maya, against Sam and Jo.');
    await tab(page, 'Game Day').click();
    const board = page.getByRole('region', { name: 'Week 2: 2v2' });
    await expect(board.locator('.group-side').first()).toContainText('Your duo');
    await expect(board.getByRole('list', { name: 'Your duo' })).toContainText('Maya');
  });

  test("Bounty Week: Game Day shows the target and a live bar, and who broke a day's target", async ({ page, request }) => {
    const { season, log } = await groupWeek(page, request, (me, today) => ({ mode: 'bounty', roster: [me, 'maya', 'sam', 'jo'], bounty: { kind: 'dry', date: today } }));
    await log('maya', season.today, ALL, 30, 2);
    await button(page, "I've saved it").click();
    await expect(page.locator('.group-target')).toHaveText(`No beers league-wide on ${dayName(season.today)}`);
    await tab(page, 'Game Day').click();
    const board = page.getByRole('region', { name: 'Week 2: Bounty Week' });
    await expect(board.locator('.group-target')).toHaveText(`No beers league-wide on ${dayName(season.today)}`);
    await expect(board.getByRole('progressbar', { name: 'The Bounty' })).toHaveAttribute('aria-valuetext', '3 of 4');
    await expect(board.locator('.group-lead')).toHaveText('Broken by Maya.');
  });

  test('The Alley: Game Day shows everyone single file in one long lane, and the places', async ({ page, request }) => {
    const { season, me, log } = await groupWeek(page, request, (me) => ({ mode: 'alley', roster: [me, 'maya', 'sam', 'jo'] }));
    await log(me, season.today, ALL);
    await log('maya', season.today, ONE);
    await log('sam', season.today, NONE, 240);
    await button(page, "I've saved it").click();
    // The week's power-ups, as icons: none lit in the Alley but Rule One.
    await expect(page.getByRole('list', { name: 'Power-ups this week' }).locator('li[data-on="true"]')).toHaveText(['Rule One']);
    await tab(page, 'Game Day').click();
    const board = page.getByRole('region', { name: 'Week 2: Alley' });
    await expect(board.locator('.alley-car')).toHaveCount(4);
    // The leader is nearest the finish, the last car at the start.
    await expect(board.locator('.alley-car[data-me="true"]')).toHaveAttribute('style', /left: 84%/);
    // Jo has logged nothing today, so 0 so far; Sam's 4 hours put Sam last.
    await expect(board.getByRole('list', { name: 'The race' }).getByRole('listitem').locator('span').first()).toHaveText(/^1st You/);
    await expect(board.getByRole('list', { name: 'The race' }).getByRole('listitem').last()).toContainText('4th Sam');
  });

  test("Drop Shot: under the 1v1, both floors, with the tiles each side's hits have broken", async ({ page, request }) => {
    const { season, me, dayA, dayB, log } = await groupWeek(page, request, (me) => ({ mode: 'dropShot', pairs: [{ a: me, b: 'maya' }], targets: { [me]: ['maya'], maya: [me] } }));
    // One day of this week, not today and not a rest day, already over: you win it 6 to 4, landing 2 hits.
    const { dates } = thisWeek(season);
    const done = dates.find((date, index) => index !== 6 && date !== season.today && date !== dayA && date !== dayB)!;
    await patchDoc(request, `${season.path}/calendar/${done}`, { start: new Date(Date.now() - 40 * 3_600_000), lock: new Date(Date.now() - 4 * 3_600_000) });
    await log(me, done, ALL);
    await log('maya', done, ONE);
    await button(page, "I've saved it").click();
    await tab(page, 'Game Day').click();
    const floors = page.getByRole('region', { name: 'Drop Shot', exact: true });
    await expect(floors.getByRole('img', { name: "Maya's floor: 1 of 20 tiles broken" })).toBeVisible();
    await expect(floors.getByRole('img', { name: 'Your floor: 0 of 20 tiles broken' })).toBeVisible();
    await expect(floors.locator('.group-lead')).toContainText("You've landed 2 hits; Maya has landed 0.");
  });

  test("Before a group-play week starts, the commish sets a Bounty Week's target and switches a 2v2 week to frenemies, and each goes in the audit log", async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await startSeason(request, league);
    for (const [id, name] of [['maya', 'Maya'], ['sam', 'Sam']] as const) await addPlayer(request, league, season, id, name);
    const monday3 = addDays(thisWeek(season).dates[0]!, 7);
    const monday4 = addDays(monday3, 7);
    await writeDoc(request, `${season.path}/weeks/w03`, { week: 3, mode: 'bounty', monday: monday3, pairs: [], roster: [league.commish, 'maya', 'sam'], targets: {} });
    await writeDoc(request, `${season.path}/weeks/w04`, { week: 4, mode: 'twoVTwo', monday: monday4, pairs: [], roster: [league.commish, 'maya', 'sam'], targets: {} });
    await enterAsCommish(page, league);
    await button(page, 'Your profile, Alex').click();
    await button(page, 'Commish tools').click();

    const bounty = page.getByRole('form', { name: 'Week 3: Bounty Week' });
    await expect(bounty).toContainText('No target set yet, so it is: 36 goals hit across the league.');
    await bounty.getByLabel('Goal').selectOption('body');
    await expect(bounty).toContainText('The most the league can reach, with one rest day each: 18.');
    await bounty.getByLabel('How many').fill('15');
    await bounty.getByRole('button', { name: 'Set the target' }).click();
    await expect.poll(async () => (await readDoc(request, `${season.path}/weeks/w03`))?.bounty).toEqual({ kind: 'hits', lane: 'body', count: 15 });
    await expect(bounty).toContainText('The target: 15 Body hits across the league.');

    const duos = page.getByRole('group', { name: 'Week 4: 2v2' });
    await duos.getByRole('button', { name: 'Frenemies: your Week 1 rival' }).click();
    await expect.poll(async () => (await readDoc(request, `${season.path}/weeks/w04`))?.pairing).toBe('frenemies');
    await expect(duos.getByRole('button', { name: 'Frenemies: your Week 1 rival' })).toHaveAttribute('aria-pressed', 'true');

    const audit = await Promise.all((await listIds(request, `leagues/${league.id}/audit`)).map((id) => readDoc(request, `leagues/${league.id}/audit/${id}`)));
    expect(audit.filter((entry) => entry?.action === 'week.groupPlay').map((entry) => entry?.reason).sort()).toEqual(['2v2 duos: frenemies', 'Bounty target: 15 Body hits across the league']);
  });

  test("League lists a settled group-play week by its mode's own lines, and the schedule names each group-play week's mode", async ({ page, request }) => {
    const { season, me } = await groupWeek(page, request, (me) => ({ mode: 'alley', roster: [me, 'maya', 'sam', 'jo'] }));
    const result = (player: string, points: number, bonus: number, place: number) => ({ player, opponent: 'GROUP', points, opponentPoints: 0, beers: 0, outcome: 'none', bonus, seasonPoints: points + bonus, mode: 'alley', race: { points, walls: 0, place } });
    await writeDoc(request, `${season.path}/weeks/w01`, {
      week: 1,
      mode: 'alley',
      status: 'final',
      settledAt: new Date(),
      results: { [me]: result(me, 33, 5, 1), maya: result('maya', 21, 3, 2) },
      awards: { mvp: [me], bust: [], wheel: ['maya'] },
      group: { mode: 'alley', race: [{ player: me, race: 33, walls: 0, place: 1 }, { player: 'maya', race: 21, walls: 0, place: 2 }] },
    });
    await writeDoc(request, `${season.path}/weeks/w03`, { week: 3, mode: 'teamWeek', pairs: [], teams: { blue: [me, 'maya'], orange: ['sam', 'jo'] }, targets: {} });
    await button(page, "I've saved it").click();
    await tab(page, 'League').click();
    // The schedule opens on this week; back one is last week's results, and on two is a week to come.
    const schedule = page.getByRole('region', { name: 'Schedule' });
    await expect(schedule.locator('.result-head')).toContainText('Week 2 · Alley');
    await expect(schedule.locator('.schedule-status')).toContainText('This week');
    await schedule.getByRole('button', { name: 'Earlier week' }).click();
    await expect(schedule.locator('.result-head')).toContainText('Week 1 · Alley');
    await expect(schedule.getByRole('listitem').first()).toHaveText('1st in the Alley: You, 33 race points, +5');
    await schedule.getByRole('button', { name: 'Later week' }).click();
    await schedule.getByRole('button', { name: 'Later week' }).click();
    await expect(schedule.locator('.result-head')).toContainText('Week 3 · Team Week');
    await expect(schedule).toContainText('Blue: You, Maya');
  });
});
