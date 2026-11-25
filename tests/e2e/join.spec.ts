import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { formatLeagueCode, makeLeagueCode } from '../../engine/src/ids.ts';
import { enter, expectInApp, joinAs, tapToEnter } from './helpers.ts';
import { createLeague, readDoc, type TestLeague } from './league.ts';

const KEY_SHAPE = /^TCL-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const heading = (page: Page, name: string) => page.getByRole('heading', { name });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

/** A second phone: its own storage and its own sign-in. */
async function anotherPhone(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

const playerOf = async (request: APIRequestContext, league: TestLeague, key: string) =>
  (await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player as string | undefined;

test.describe('Joining a league', () => {
  test('A new player joins with the league code, picks a name, and is shown a recovery key to save', async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    await enter(page);
    await button(page, 'Join a league').click();

    // Typed in small letters with the dash: the app tidies it.
    await page.getByLabel('League code').fill(formatLeagueCode(league.code).toLowerCase());
    await button(page, 'Next').click();
    await expect(heading(page, 'Pick your name')).toBeVisible();
    await expect(page.getByText('You are joining Sunday Squad.')).toBeVisible();

    await page.getByLabel('Display name').fill('  Riley  ');
    await button(page, 'Join the league').click();
    await expect(heading(page, 'Save your recovery key')).toBeVisible();
    const key = (await page.locator('.join-key').textContent()) ?? '';
    expect(key).toMatch(KEY_SHAPE);

    // The database agrees: a second member, named Riley, holding that key.
    const player = await playerOf(request, league, key);
    expect(player).toBeTruthy();
    expect((await readDoc(request, `leagues/${league.id}/players/${player}`))?.displayName).toBe('Riley');
    expect((await readDoc(request, `leagues/${league.id}/keys/${player}`))?.key).toBe(key);
    expect(Object.keys((await readDoc(request, `leagues/${league.id}`))?.members as object).sort()).toEqual([player, league.commish].sort());

    await button(page, "I've saved it").click();
    await expectInApp(page, 'Riley', 'Sunday Squad');
  });

  test("The badge shows the first letter of the name as it is typed", async ({ page, request }) => {
    const league = await createLeague(request);
    await enter(page);
    await button(page, 'Join a league').click();
    await page.getByLabel('League code').fill(league.code);
    await button(page, 'Next').click();
    const badge = page.locator('.join-badge text');
    await expect(badge).toHaveText('?');
    await page.getByLabel('Display name').fill('maya');
    await expect(badge).toHaveText('M');
  });

  test('A code that is too short, or has a look-alike character, is caught before anything is sent', async ({ page }) => {
    await enter(page);
    await button(page, 'Join a league').click();
    await button(page, 'Next').click();
    await expect(page.getByRole('alert')).toHaveText('Type your league code first.');
    await page.getByLabel('League code').fill('K7QM');
    await button(page, 'Next').click();
    await expect(page.getByRole('alert')).toHaveText('A league code is 8 letters and numbers, like K7QM-X2R9.');
    await page.getByLabel('League code').fill('K7QM-X2R0');
    await button(page, 'Next').click();
    await expect(page.getByRole('alert')).toHaveText('League codes never use 0, O, 1 or I. Check for a look-alike.');
    await expect(heading(page, 'Enter your league code')).toBeVisible();
  });

  test('A code that no league has says so, and goes no further', async ({ page }) => {
    await enter(page);
    await button(page, 'Join a league').click();
    await page.getByLabel('League code').fill(makeLeagueCode(crypto.getRandomValues(new Uint8Array(8))));
    await button(page, 'Next').click();
    await expect(page.getByRole('alert')).toHaveText('No league has that code. Check it with your commish.');
    await expect(heading(page, 'Enter your league code')).toBeVisible();
  });

  test('A name is needed, and it can be 24 characters at most', async ({ page, request }) => {
    const league = await createLeague(request);
    await enter(page);
    await button(page, 'Join a league').click();
    await page.getByLabel('League code').fill(league.code);
    await button(page, 'Next').click();
    await button(page, 'Join the league').click();
    await expect(page.getByRole('alert')).toHaveText('Type a name first.');
    await page.getByLabel('Display name').fill('x'.repeat(25));
    await button(page, 'Join the league').click();
    await expect(page.getByRole('alert')).toHaveText('That is too long. A name can be up to 24 characters.');
    await page.getByLabel('Display name').fill('x'.repeat(24));
    await button(page, 'Join the league').click();
    await expect(heading(page, 'Save your recovery key')).toBeVisible();
  });

  test('A full league turns a 13th player away, and says why it might be', async ({ page, request }) => {
    const league = await createLeague(request, { players: 12 });
    await enter(page);
    await button(page, 'Join a league').click();
    await page.getByLabel('League code').fill(league.code);
    await button(page, 'Next').click();
    await page.getByLabel('Display name').fill('Jordan');
    await button(page, 'Join the league').click();
    await expect(page.getByRole('alert')).toHaveText('The league did not let you in. It may be full (12 players) or closed to new players. Ask your commish.');
    await expect(heading(page, 'Pick your name')).toBeVisible();
    expect(Object.keys((await readDoc(request, `leagues/${league.id}`))?.members as object)).toHaveLength(12);
  });

  test('So does a league the commish has closed to new players', async ({ page, request }) => {
    const league = await createLeague(request, { joining: 'closed' });
    await enter(page);
    await button(page, 'Join a league').click();
    await page.getByLabel('League code').fill(league.code);
    await button(page, 'Next').click();
    await page.getByLabel('Display name').fill('Jordan');
    await button(page, 'Join the league').click();
    await expect(page.getByRole('alert')).toContainText('The league did not let you in.');
  });

  test('The recovery key can be copied with one tap', async ({ page, request, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const key = await joinAs(page, await createLeague(request), 'Riley');
    await button(page, 'Copy the key').click();
    await expect(button(page, 'Copied')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(key);
  });

  test('The next time the app is opened, it goes straight in: no code, no key', async ({ page, request }) => {
    await joinAs(page, await createLeague(request, { name: 'Sunday Squad' }), 'Riley');
    await button(page, "I've saved it").click();
    await expectInApp(page, 'Riley', 'Sunday Squad');

    await page.reload();
    await tapToEnter(page);
    await expectInApp(page, 'Riley', 'Sunday Squad');
  });

  test('Back goes one step back, and keeps what was typed', async ({ page, request }) => {
    const league = await createLeague(request);
    await enter(page);
    await button(page, 'Join a league').click();
    await page.getByLabel('League code').fill(league.code);
    await button(page, 'Next').click();
    await expect(heading(page, 'Pick your name')).toBeVisible();
    await button(page, 'Back').click();
    await expect(page.getByLabel('League code')).toHaveValue(league.code);
    await button(page, 'Back').click();
    await expect(button(page, 'Join a league')).toBeVisible();
  });
});

test.describe('Getting back in with a recovery key', () => {
  test('On a new phone, the league code and the key bring the profile back, and the key changes', async ({ page, request, browser }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const firstKey = await joinAs(page, league, 'Riley');
    const player = await playerOf(request, league, firstKey);

    const newPhone = await anotherPhone(browser);
    await enter(newPhone);
    await button(newPhone, "I'm already in a league").click();
    await newPhone.getByLabel('League code').fill(league.code);
    // Typed in small letters with no dashes: the app tidies it.
    await newPhone.getByLabel('Recovery key').fill(firstKey.replaceAll('-', '').toLowerCase());
    await button(newPhone, 'Find my profile').click();

    await expect(heading(newPhone, 'Welcome back, Riley')).toBeVisible();
    await expect(newPhone.getByText('Your recovery key has changed, and every other device is signed out.')).toBeVisible();
    const newKey = (await newPhone.locator('.join-key').textContent()) ?? '';
    expect(newKey).toMatch(KEY_SHAPE);
    expect(newKey).not.toBe(firstKey);

    // The database agrees: same player, new key, and the old key finds nobody.
    expect(await playerOf(request, league, newKey)).toBe(player);
    expect(await playerOf(request, league, firstKey)).toBeUndefined();
    expect((await readDoc(request, `leagues/${league.id}/keys/${player}`))?.key).toBe(newKey);

    await button(newPhone, "I've saved it").click();
    await expectInApp(newPhone, 'Riley', 'Sunday Squad');
    await newPhone.context().close();
  });

  test('The old phone is signed out, says why, and gets back in with the new key', async ({ page, request, browser }) => {
    const league = await createLeague(request);
    const firstKey = await joinAs(page, league, 'Riley');
    await button(page, "I've saved it").click();

    const newPhone = await anotherPhone(browser);
    await enter(newPhone);
    await button(newPhone, "I'm already in a league").click();
    await newPhone.getByLabel('League code').fill(league.code);
    await newPhone.getByLabel('Recovery key').fill(firstKey);
    await button(newPhone, 'Find my profile').click();
    await expect(heading(newPhone, 'Welcome back, Riley')).toBeVisible();
    const secondKey = (await newPhone.locator('.join-key').textContent()) ?? '';
    await newPhone.context().close();

    // Back on the first phone: it is out, with the reason and the league code already filled in.
    await page.reload();
    await tapToEnter(page);
    await expect(heading(page, 'Get back into your league')).toBeVisible();
    await expect(page.getByText('This phone was signed out.')).toBeVisible();
    await expect(page.getByLabel('League code')).toHaveValue(formatLeagueCode(league.code));

    // The key it joined with is dead. The current one works.
    await page.getByLabel('Recovery key').fill(firstKey);
    await button(page, 'Find my profile').click();
    await expect(page.getByRole('alert')).toContainText('That key does not match a player in this league.');
    await page.getByLabel('Recovery key').fill(secondKey);
    await button(page, 'Find my profile').click();
    await expect(heading(page, 'Welcome back, Riley')).toBeVisible();
  });

  test('A key that matches nobody is refused, and a mistyped one is caught before anything is sent', async ({ page, request }) => {
    const league = await createLeague(request);
    await enter(page);
    await button(page, "I'm already in a league").click();
    await page.getByLabel('League code').fill(league.code);
    await button(page, 'Find my profile').click();
    await expect(page.getByRole('alert')).toHaveText('Type your recovery key first.');
    await page.getByLabel('Recovery key').fill('TCL-7Q4M');
    await button(page, 'Find my profile').click();
    await expect(page.getByRole('alert')).toHaveText('A recovery key looks like TCL-7Q4M-X2K9.');
    await page.getByLabel('Recovery key').fill('TCL-2222-2222');
    await button(page, 'Find my profile').click();
    await expect(page.getByRole('alert')).toHaveText('That key does not match a player in this league. Check it, or ask your commish to look it up.');
    await expect(heading(page, 'Get back into your league')).toBeVisible();
  });

  test('A player set up before the app existed, like the commish, gets in the same way', async ({ page, request }) => {
    const league = await createLeague(request);
    await enter(page);
    await button(page, "I'm already in a league").click();
    await page.getByLabel('League code').fill(league.code);
    await page.getByLabel('Recovery key').fill(league.commishKey);
    await button(page, 'Find my profile').click();
    await expect(heading(page, 'Welcome back, Alex')).toBeVisible();
    expect(await playerOf(request, league, league.commishKey)).toBeUndefined();
  });
});
