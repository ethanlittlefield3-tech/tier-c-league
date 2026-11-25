import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { enterAsCommish, joinAs } from './helpers.ts';
import { createLeague, listIds, readDoc, setTargets, startSeason, type TestLeague, type TestSeason } from './league.ts';

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
  test("A quick-chat line lands on both phones, with the opponent's name filled in", async ({ page, request, browser }) => {
    const { league, riley } = await rivals(page, request, browser);
    await expect(riley.phone.getByRole('heading', { name: 'Talk to Alex' })).toBeVisible();
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

  test('Brags take comments and fire, skull and beer reactions from everyone, live', async ({ page, request, browser }) => {
    const { riley } = await rivals(page, request, browser);
    await riley.phone.getByLabel('Your brag').fill('Passed my cert exam');
    await button(riley.phone, 'Post it').click();
    await expect(riley.phone.getByText('Posted.')).toBeVisible();

    const onAlex = page.getByRole('article', { name: 'Brag from Riley' });
    await expect(onAlex.locator('.feed-text')).toHaveText('Passed my cert exam');
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
    await page.getByLabel('Your brag').fill('Commish brag');
    await button(page, 'Post it').click();
    await expect(riley.phone.getByRole('article', { name: 'Brag from Alex' }).getByRole('button', { name: 'Take down' })).toHaveCount(0);
    await riley.phone.context().close();
  });

  test('Before there is an opponent, the Feed says taunts open after the draft', async ({ page, request }) => {
    const league = await createLeague(request);
    await enterAsCommish(page, league);
    await tab(page, 'Feed').click();
    await expect(page.getByRole('heading', { name: 'Talk trash' })).toBeVisible();
    await expect(page.getByText('Taunts open once you have an opponent, after the draft.')).toBeVisible();
    await expect(page.getByText('Nothing on the wall yet. Start something.')).toBeVisible();
  });
});
