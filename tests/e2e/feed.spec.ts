import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { weekday } from '../../app/src/feed/events.ts';
import { enterAsCommish, joinAs } from './helpers.ts';
import { createLeague, listIds, readDoc, setGoals, setTargets, setWindow, startSeason, thisWeek, writeDoc, type TestLeague, type TestSeason } from './league.ts';

const run = promisify(execFile);
const weeklyJob = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });

/** A player joins on a phone of their own and saves the key. Returns the phone and their id. */
async function joins(browser: Browser, request: APIRequestContext, league: TestLeague, name: string) {
  const phone = await (await browser.newContext()).newPage();
  const key = await joinAs(phone, league, name);
  await button(phone, "I've saved it").click();
  await expect(phone.getByRole('navigation', { name: 'Main' })).toBeVisible();
  const player = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
  return { phone, player };
}

/** Alex (the commish) and Riley face each other this week. Alex's phone opens on Feed. */
async function rivals(page: Page, request: APIRequestContext, browser: Browser): Promise<{ league: TestLeague; season: TestSeason; riley: { phone: Page; player: string } }> {
  const league = await createLeague(request);
  const season = await startSeason(request, league);
  const riley = await joins(browser, request, league, 'Riley');
  await setTargets(request, season, { [league.commish]: [riley.player], [riley.player]: [league.commish] });
  await enterAsCommish(page, league);
  await tab(page, 'Feed').click();
  await tab(riley.phone, 'Feed').click();
  return { league, season, riley };
}

/** Every post on the league's wall, past the security rules. */
const wallPosts = async (request: APIRequestContext, league: TestLeague): Promise<({ id: string } & Record<string, unknown>)[]> =>
  Promise.all((await listIds(request, `leagues/${league.id}/wall`)).map(async (id) => ({ id, ...((await readDoc(request, `leagues/${league.id}/wall/${id}`)) ?? {}) })));

test.describe('Feed and the wall', () => {
  test('The feed fits the phone: the quick-chat lines swipe sideways inside their panel', async ({ page, request, browser }) => {
    const { riley } = await rivals(page, request, browser);
    await button(page, 'Trash talk Riley').click();
    const chips = page.getByRole('group', { name: 'Quick chat' });
    await expect(chips.getByRole('button')).toHaveCount(10);
    const fit = await page.locator('.feed').evaluate((feed) => ({ feed: feed.getBoundingClientRect().width, page: window.innerWidth, chips: feed.querySelector('.feed-chips')!.scrollWidth, shown: feed.querySelector('.feed-chips')!.clientWidth }));
    expect(fit.feed).toBeLessThanOrEqual(fit.page - 40);
    // The row holds more than it shows, and swipes.
    expect(fit.chips).toBeGreaterThan(fit.shown);
    await riley.phone.context().close();
  });

  test("A quick-chat line lands on both phones, with the opponent's name filled in", async ({ page, request, browser }) => {
    const { league, riley } = await rivals(page, request, browser);
    // The post box starts folded: just its two buttons.
    await expect(riley.phone.getByRole('group', { name: 'Quick chat' })).toHaveCount(0);
    await button(riley.phone, 'Trash talk Alex').click();
    await expect(button(riley.phone, 'Trash talk Alex')).toHaveAttribute('aria-pressed', 'true');
    await riley.phone.getByRole('group', { name: 'Quick chat' }).getByRole('button', { name: 'Touch grass, Alex.' }).click();
    await expect(riley.phone.getByText('Sent to Alex.')).toBeVisible();

    const mine = riley.phone.getByRole('article', { name: 'Quick chat from You' });
    await expect(mine.locator('.feed-text')).toHaveText('Touch grass, Alex.');
    await expect(mine.locator('.feed-who')).toHaveText('You to Alex');
    const theirs = page.getByRole('article', { name: 'Quick chat from Riley' });
    await expect(theirs.locator('.feed-text')).toHaveText('Touch grass, Alex.');
    await expect(theirs.locator('.feed-who')).toHaveText('Riley to You');

    // The wall keeps {name}, so a renamed player still reads right.
    await expect.poll(async () => (await wallPosts(request, league)).map((post) => [post.kind, post.text, post.to])).toEqual([['quick', 'Touch grass, {name}.', league.commish]]);
    await riley.phone.context().close();
  });

  test('Your own taunt can use {name}, and can be saved for later', async ({ page, request, browser }) => {
    const { league, riley } = await rivals(page, request, browser);
    await button(riley.phone, 'Trash talk Alex').click();
    await riley.phone.getByLabel('Your own taunt').fill('Is that all, {name}?');
    await button(riley.phone, 'Save it for later').click();
    await button(riley.phone, 'Send').click();
    await expect(riley.phone.getByRole('article', { name: 'Taunt from You' }).locator('.feed-text')).toHaveText('Is that all, Alex?');
    await expect(page.getByRole('article', { name: 'Taunt from Riley' }).locator('.feed-text')).toHaveText('Is that all, Alex?');

    // Saved: one tap sends it again.
    const saved = riley.phone.getByRole('group', { name: 'Your saved taunts' });
    await expect(saved.getByRole('button', { name: 'Is that all, Alex?' })).toBeVisible();
    await expect.poll(async () => (await readDoc(request, `leagues/${league.id}/players/${riley.player}`))?.taunts).toEqual(['Is that all, {name}?']);
    await saved.getByRole('button', { name: 'Is that all, Alex?' }).click();
    await expect(riley.phone.getByRole('article', { name: 'Taunt from You' })).toHaveCount(2);

    // And it can be forgotten.
    await saved.getByRole('button', { name: 'Forget "Is that all, {name}?"' }).click();
    await expect(riley.phone.getByRole('group', { name: 'Your saved taunts' })).toHaveCount(0);
    await riley.phone.context().close();
  });

  test("Brags show their author's car, and take comments and fire, skull and beer reactions from everyone, live", async ({ page, request, browser }) => {
    const { riley } = await rivals(page, request, browser);
    // One place to post: the switch swaps talking to Alex for a brag.
    await expect(riley.phone.getByLabel('Your brag')).toHaveCount(0);
    await button(riley.phone, 'Brag').click();
    await expect(riley.phone.getByRole('group', { name: 'Quick chat' })).toHaveCount(0);
    await riley.phone.getByLabel('Your brag').fill('Passed my cert exam');
    await button(riley.phone, 'Post it').click();
    await expect(riley.phone.getByText('Posted.')).toBeVisible();

    const onAlex = page.getByRole('article', { name: 'Brag from Riley' });
    await expect(onAlex.locator('.feed-text')).toHaveText('Passed my cert exam');
    await expect(onAlex.locator('.feed-car')).toHaveAttribute('data-car', 'dart cobalt');
    await onAlex.getByRole('button', { name: 'Fire, 0' }).click();
    await expect(onAlex.getByRole('button', { name: 'Fire, 1' })).toHaveAttribute('aria-pressed', 'true');

    const onRiley = riley.phone.getByRole('article', { name: 'Brag from You' });
    await expect(onRiley.getByRole('button', { name: 'Fire, 1' })).toHaveAttribute('aria-pressed', 'false');
    await onRiley.getByRole('button', { name: 'Beer, 0' }).click();
    await expect(onAlex.getByRole('button', { name: 'Beer, 1' })).toBeVisible();

    // Alex taps fire again to take it back.
    await onAlex.getByRole('button', { name: 'Fire, 1' }).click();
    await expect(onRiley.getByRole('button', { name: 'Fire, 0' })).toBeVisible();

    // Comments.
    await onAlex.getByRole('button', { name: 'Comments' }).click();
    await onAlex.getByLabel('Add a comment').fill('Huge. Congrats!');
    await onAlex.getByRole('button', { name: 'Comment', exact: true }).click();
    await onRiley.getByRole('button', { name: 'Comments' }).click();
    await expect(onRiley.locator('.feed-comment')).toContainText('Alex Huge. Congrats!');
    await riley.phone.context().close();
  });

  test("The author can take a post down, and the commish can take down anyone's, which goes in the league log", async ({ page, request, browser }) => {
    const { league, riley } = await rivals(page, request, browser);
    await button(riley.phone, 'Brag').click();
    await riley.phone.getByLabel('Your brag').fill('Ran 10k');
    await button(riley.phone, 'Post it').click();
    const onRiley = riley.phone.getByRole('article', { name: 'Brag from You' });
    await onRiley.getByRole('button', { name: 'Take down' }).click();
    await onRiley.getByRole('button', { name: 'Take it down' }).click();
    await expect(page.getByRole('article', { name: 'Brag from Riley' })).toHaveCount(0);
    await expect.poll(async () => (await wallPosts(request, league)).map((post) => [post.deleted, post.text])).toEqual([[true, '']]);

    // Now the commish takes down Riley's next post.
    await riley.phone.getByLabel('Your brag').fill('Ran 12k');
    await button(riley.phone, 'Post it').click();
    const onAlex = page.getByRole('article', { name: 'Brag from Riley' });
    await onAlex.getByRole('button', { name: 'Take down' }).click();
    await expect(onAlex.getByText('It goes in the league log.')).toBeVisible();
    await onAlex.getByRole('button', { name: 'Take it down' }).click();
    await expect(riley.phone.getByRole('article', { name: 'Brag from You' })).toHaveCount(0);
    await expect.poll(async () => (await wallPosts(request, league)).filter((post) => post.audit).length).toBe(1);
    const logged = (await wallPosts(request, league)).find((post) => post.audit);
    expect(await readDoc(request, `leagues/${league.id}/audit/${String(logged?.audit)}`)).toMatchObject({ action: 'wall.delete', target: `wall/${logged?.id}`, by: league.commish });

    // Nobody else gets a take-down button on Alex's post.
    await button(page, 'Brag').click();
    await page.getByLabel('Your brag').fill('Commish brag');
    await button(page, 'Post it').click();
    await expect(riley.phone.getByRole('article', { name: 'Brag from Alex' }).getByRole('button', { name: 'Take down' })).toHaveCount(0);
    await riley.phone.context().close();
  });

  test("A week's highlight reel is a picture of its best moments, shared to the group chat with one tap", async ({ page, request, browser }) => {
    const { league, season, riley } = await rivals(page, request, browser);
    await writeDoc(request, `${season.path}/weeks/w01`, {
      week: 1,
      mode: 'regular',
      status: 'final',
      settledAt: new Date(),
      results: {
        [league.commish]: { player: league.commish, opponent: riley.player, points: 30, opponentPoints: 24, outcome: 'win', seasonPoints: 35 },
        [riley.player]: { player: riley.player, opponent: league.commish, points: 24, opponentPoints: 30, outcome: 'loss', seasonPoints: 24 },
      },
      awards: { mvp: [league.commish], bust: [riley.player], wheel: [riley.player] },
    });
    // A phone that can share pictures: the share sheet is stood in for, to see what it is handed.
    await page.evaluate(() => {
      const holder = window as unknown as { shared: unknown };
      holder.shared = null;
      Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
      Object.defineProperty(navigator, 'share', {
        value: async (data: ShareData) => {
          holder.shared = { title: data.title, files: (data.files ?? []).map((file) => ({ name: file.name, type: file.type, size: file.size })) };
        },
        configurable: true,
      });
    });

    await page.locator('.feed-event[data-kind="results"]').getByRole('button', { name: 'Highlight reel' }).click();
    const reel = page.getByRole('dialog', { name: 'Week 1 highlights' });
    const picture = reel.getByRole('img');
    await expect(picture).toHaveAttribute('alt', /MVP: Alex, 30 points/);
    await expect(picture).toHaveAttribute('alt', /Alex 30–24 Riley/);
    await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1080);
    await reel.getByRole('button', { name: 'Share' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { shared: unknown }).shared)).toMatchObject({ title: 'Week 1 highlights', files: [{ name: 'tier-c-week-1.png', type: 'image/png' }] });
    await reel.getByRole('button', { name: 'Close' }).click();
    await expect(reel).toHaveCount(0);
    await riley.phone.context().close();
  });

  test('Before there is an opponent, the Feed says taunts open after the draft', async ({ page, request }) => {
    const league = await createLeague(request);
    await enterAsCommish(page, league);
    await tab(page, 'Feed').click();
    await button(page, 'Trash talk').click();
    await expect(page.getByText('Taunts open once you have an opponent, after the draft.')).toBeVisible();
    await expect(page.getByText('Nothing on the wall yet. Start something.')).toBeVisible();
  });

  test("Check-ins, power-ups, docks, revealed Demolitions and results show in the feed as they happen, with the week's MVP and Bust spotlighted with their cars", async ({ page, request, browser }) => {
    const league = await createLeague(request);
    const season = await startSeason(request, league);
    const riley = await joins(browser, request, league, 'Riley');
    await setGoals(request, season, riley.player, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
    const { period, dates } = thisWeek(season);
    await writeDoc(request, `${season.path}/weeks/${period}`, {
      week: 2,
      mode: 'regular',
      pairs: [{ a: league.commish, b: riley.player }],
      targets: { [league.commish]: [riley.player], [riley.player]: [league.commish] },
    });
    await enterAsCommish(page, league);
    await tab(page, 'Feed').click();
    const feed = page.getByRole('region', { name: 'The feed' });

    // Riley logs today, on Riley's own phone: a check-in, live on Alex's.
    await riley.phone.locator('.square-goal[data-lane="body"]').click();
    await expect(feed.locator('.feed-event[data-kind="checkIn"]')).toContainText(`Riley logged ${weekday(season.today)}`);

    // An Aerial, and a dock with its reason.
    const aerialDay = dates.find((date) => date > season.today) ?? dates[6]!;
    await writeDoc(request, `${season.path}/kit/${period}_${riley.player}_aerial`, { player: riley.player, item: 'aerial', period, date: aerialDay, at: new Date() });
    await expect(feed.locator('.feed-event[data-kind="power"]')).toContainText(`Riley set an Aerial for ${weekday(aerialDay)}`);
    await writeDoc(request, `${season.path}/adjustments/fix1`, { player: riley.player, date: season.today, amount: -1, void: null, reason: 'Logged after the lock', by: league.commish, at: new Date(), audit: 'a1' });
    await expect(feed.locator('.feed-event[data-kind="dock"]')).toContainText('The commish docked Riley 1 point');
    await expect(feed.locator('.feed-event[data-kind="dock"] .feed-event-detail')).toHaveText('Logged after the lock');

    // Alex's Demolition on a day of this week that has locked, with nothing logged on it: the weekly job reveals it.
    const lockedDay = dates.find((date) => date !== season.today && date !== season.yesterday) ?? dates[0]!;
    await setWindow(request, season, lockedDay, { start: new Date(Date.now() - 40 * 3_600_000), lock: new Date(Date.now() - 4 * 3_600_000) });
    await writeDoc(request, `${season.path}/sealed/${period}_${league.commish}_demolition`, {
      kind: 'demolition',
      player: league.commish,
      period,
      target: riley.player,
      date: lockedDay,
      lane: 'body',
      revealAt: new Date(Date.now() - 4 * 3_600_000),
      at: new Date(Date.now() - 50 * 3_600_000),
    });
    const { stdout } = await run(process.execPath, [weeklyJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
    expect(stdout).toContain('1 Demolition revealed');
    await expect(feed.locator('.feed-event[data-kind="reveal"]')).toHaveText(new RegExp(`^Your Demolition on Riley's Body goal, ${weekday(lockedDay)}: Landed`));
    await expect(riley.phone.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await tab(riley.phone, 'Feed').click();
    await expect(riley.phone.locator('.feed-event[data-kind="reveal"]')).toContainText("Alex's Demolition on your Body goal");

    // Last week's results.
    await writeDoc(request, `${season.path}/weeks/w01`, {
      week: 1,
      mode: 'regular',
      pairs: [{ a: league.commish, b: riley.player }],
      status: 'provisional',
      settledAt: new Date(),
      results: {
        [league.commish]: { opponent: riley.player, points: 30, opponentPoints: 24, outcome: 'win', seasonPoints: 35 },
        [riley.player]: { opponent: league.commish, points: 24, opponentPoints: 30, outcome: 'loss', seasonPoints: 24 },
      },
      awards: { mvp: [league.commish], bust: [riley.player], wheel: [riley.player] },
    });
    const results = feed.locator('.feed-event[data-kind="results"]');
    await expect(results.locator('.feed-event-text')).toContainText('Week 1 results are in');
    await expect(results.locator('.feed-event-detail')).toHaveText(/You beat Riley 30–24\nMVP: You · Bust: Riley · Spins the Wheel: Riley/);
    // Too close for a blowout, too far for a photo finish, and only Week 1: no storyline yet.
    await expect(results.getByRole('list', { name: 'Storylines' })).toHaveCount(0);
    const spotlight = results.getByRole('list', { name: 'Spotlight' }).getByRole('listitem');
    await expect(spotlight).toHaveText(['MVPYou', 'BustRiley']);
    await expect(spotlight.first().locator('.feed-spotlight-car')).toHaveAttribute('data-car', 'dart cobalt');
    await riley.phone.context().close();
  });
});
