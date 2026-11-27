import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { joinAs } from './helpers.ts';
import { addPlayer, createLeague, finishWeekOne, futureDays, patchDoc, readDoc, setGoals, startSeason, thisWeek, writeDoc, type TestLeague } from './league.ts';

const run = promisify(execFile);
const weeklyJob = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));
const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });
const ITEMS = ['Tornado', 'Punch', 'Boot', 'Spike', 'Swap', 'Freeze', 'Magnet'];

async function runWeekly(league: TestLeague): Promise<string> {
  const { stdout } = await run(process.execPath, [weeklyJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
  return stdout;
}

type Goals = { mind: boolean; body: boolean; wildcard: boolean };
const ALL: Goals = { mind: true, body: true, wildcard: true };

/**
 * Riley against Maya in a Rumble week: this week, Week 2. Both rest days are
 * moved to a day in the future, so today is never a rest day.
 */
async function rumbleWeek(page: Page, request: APIRequestContext) {
  const league = await createLeague(request, { name: 'Sunday Squad' });
  const season = await startSeason(request, league);
  const key = await joinAs(page, league, 'Riley');
  const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
  await setGoals(request, season, me, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
  await addPlayer(request, league, season, 'maya', 'Maya');
  const [, restDay] = await futureDays(request, season);
  const { period } = thisWeek(season);
  for (const player of [me, 'maya']) await writeDoc(request, `${season.path}/kit/${period}_${player}_rest`, { player, item: 'rest', period, date: restDay, at: new Date() });
  await writeDoc(request, `${season.path}/weeks/${period}`, { week: 2, mode: 'rumble', pairs: [{ a: me, b: 'maya' }], targets: { [me]: ['maya'], maya: [me] } });
  const today = await readDoc(request, `${season.path}/calendar/${season.today}`);
  const item = (player: string, name: string) => writeDoc(request, `${season.path}/rumble/${season.today}_${player}`, { player, period, date: season.today, item: name, revealAt: new Date(String(today?.start)) });
  const log = (player: string, goals: Goals, beers = 0) =>
    writeDoc(request, `${season.path}/days/${player}_${season.today}`, { player, date: season.today, goals, screenMinutes: 30, beers, firstAt: new Date(), updatedAt: new Date() });
  return { league, season, me, period, item, log };
}

test.describe('Rumble', () => {
  test("The weekly job draws and seals the week's items; each day, Today shows your item and your opponent's", async ({ page, request }) => {
    const { league, season, me } = await rumbleWeek(page, request);
    expect(await runWeekly(league)).toContain('w02: 14 Rumble items drawn and sealed.');
    const mine = String((await readDoc(request, `${season.path}/rumble/${season.today}_${me}`))?.item);
    const theirs = String((await readDoc(request, `${season.path}/rumble/${season.today}_maya`))?.item);
    const name = (item: string) => ITEMS.find((each) => each.toLowerCase() === item)!;
    await button(page, "I've saved it").click();
    const panel = page.getByRole('region', { name: "Today's Rumble items" });
    await expect(panel).toContainText(`You: ${name(mine)}`);
    await expect(panel).toContainText(`Maya: ${name(theirs)}`);
    // Drawn once: the job leaves them alone after that.
    expect(await runWeekly(league)).not.toContain('Rumble items drawn');
  });

  test('Items count live: a Tornado moves 2 points, on Today and on Match', async ({ page, request }) => {
    const { me, item, log } = await rumbleWeek(page, request);
    await item(me, 'tornado');
    await item('maya', 'freeze');
    await log('maya', ALL);
    await button(page, "I've saved it").click();
    await page.locator('.check-goal[data-lane="mind"]').click();
    await expect(page.locator('.today-breakdown')).toContainText('Tornado +2');
    await page.getByRole('button', { name: /^See Maya's day/ }).click();
    // Maya: 3 goals and 30 minutes is 6, less the 2 your Tornado takes.
    await expect(page.locator('.match-note', { hasText: 'Item: Freeze' })).toBeVisible();
    await expect(page.locator('.match-day-total')).toContainText('4');
  });

  test("Holding Boot, you pick one of your opponent's goals by noon, and the league keeps it sealed", async ({ page, request }) => {
    const { season, me, item } = await rumbleWeek(page, request);
    await patchDoc(request, `${season.path}/calendar/${season.today}`, { noon: new Date(Date.now() + 2 * 3_600_000) });
    await item(me, 'boot');
    await item('maya', 'spike');
    await button(page, "I've saved it").click();
    const panel = page.getByRole('region', { name: "Today's Rumble items" });
    await panel.getByRole('group', { name: 'Which goal to Boot' }).getByRole('button', { name: /Gym/ }).click();
    await panel.getByRole('button', { name: 'Boot it' }).click();
    await expect(panel).toContainText("Your Boot is on Maya's Body goal.");
    await expect.poll(async () => (await readDoc(request, `${season.path}/sealed/boot_${season.today}_${me}`))?.lane).toBe('body');
  });

  test('The weekly job settles a Rumble week with its items played', async ({ request }) => {
    const league = await createLeague(request, { name: 'Brawl Club' });
    const season = await startSeason(request, league);
    for (const [id, name] of [['riley', 'Riley'], ['maya', 'Maya']] as const) await addPlayer(request, league, season, id, name);
    await writeDoc(request, `${season.path}/weeks/w01`, { week: 1, mode: 'rumble', pairs: [{ a: 'riley', b: 'maya' }], targets: { riley: ['maya'], maya: ['riley'] }, rumbleDrawnAt: new Date() });
    const dates = await finishWeekOne(request, season);
    for (const date of dates.slice(0, 6)) {
      for (const player of ['riley', 'maya']) await writeDoc(request, `${season.path}/days/${player}_${date}`, { player, date, goals: ALL, screenMinutes: 30, beers: 0, firstAt: new Date(), updatedAt: new Date() });
    }
    // Monday: Riley's Tornado. Tuesday: Maya's Boot on Riley's Body goal.
    await writeDoc(request, `${season.path}/rumble/${dates[0]}_riley`, { player: 'riley', period: 'w01', date: dates[0]!, item: 'tornado', revealAt: new Date(0) });
    await writeDoc(request, `${season.path}/rumble/${dates[1]}_maya`, { player: 'maya', period: 'w01', date: dates[1]!, item: 'boot', revealAt: new Date(0) });
    await writeDoc(request, `${season.path}/sealed/boot_${dates[1]}_maya`, { kind: 'boot', player: 'maya', period: 'w01', target: 'riley', date: dates[1]!, lane: 'body', revealAt: new Date(0), at: new Date() });

    expect(await runWeekly(league)).toContain('w01: final, 2 players.');
    const results = (await readDoc(request, `${season.path}/weeks/w01`))?.results as Record<string, { points: number; outcome: string; mode: string }>;
    // 6 a day for 6 days, and a blank Sunday rest day is -3: 33. Riley +2 -1 = 34; Maya -2 = 31.
    expect(results.riley).toMatchObject({ mode: 'rumble', points: 34, outcome: 'win' });
    expect(results.maya).toMatchObject({ points: 31, outcome: 'loss' });
  });
});
