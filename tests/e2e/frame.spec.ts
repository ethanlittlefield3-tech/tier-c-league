import { expect, test, type Page } from '@playwright/test';
import { enter, expectInApp, joinAs, tapToEnter } from './helpers.ts';
import { createLeague, listIds, readDoc, type TestLeague } from './league.ts';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const tabs = (page: Page) => page.getByRole('navigation', { name: 'Main' });
const tab = (page: Page, name: string) => tabs(page).getByRole('button', { name, exact: true });
const profileButton = (page: Page, name: string) => button(page, `Your profile, ${name}`);

/** A new league, with Riley joined and past the key screen: the app itself is up. */
async function inTheApp(page: Page, request: Parameters<typeof createLeague>[0], name = 'Riley'): Promise<{ league: TestLeague; key: string }> {
  const league = await createLeague(request, { name: 'Sunday Squad' });
  const key = await joinAs(page, league, name);
  await button(page, "I've saved it").click();
  await expectInApp(page, name, 'Sunday Squad');
  return { league, key };
}

/** The player id a key belongs to. */
const playerOf = async (request: Parameters<typeof createLeague>[0], league: TestLeague, key: string) =>
  String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);

test.describe('The app frame', () => {
  test('Once in, the app opens on Today, with five tabs along the bottom', async ({ page, request }) => {
    await inTheApp(page, request);
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
    for (const name of ['Today', 'Match', 'Feed', 'League', 'Garage']) await expect(tab(page, name)).toBeVisible();
    await expect(tab(page, 'Today')).toHaveAttribute('aria-current', 'page');
  });

  test('Tapping a tab opens it, and marks it as the one you are on', async ({ page, request }) => {
    await inTheApp(page, request);
    await tab(page, 'Feed').click();
    await expect(page.getByRole('heading', { name: 'Feed', level: 1 })).toBeVisible();
    await expect(tab(page, 'Feed')).toHaveAttribute('aria-current', 'page');
    await expect(tab(page, 'Today')).not.toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'Talk trash' })).toBeVisible();
  });

  test('Every tab is built: none says it is coming soon', async ({ page, request }) => {
    await inTheApp(page, request);
    for (const name of ['Today', 'Match', 'Feed', 'League', 'Garage']) {
      await tab(page, name).click();
      await expect(page.getByText('Coming soon')).toHaveCount(0);
    }
  });

  test('The tabs sit along the bottom of the screen, inside its width', async ({ page, request }) => {
    await inTheApp(page, request);
    const bar = await tabs(page).boundingBox();
    const screen = page.viewportSize()!;
    expect(bar).not.toBeNull();
    expect(Math.round(bar!.y + bar!.height)).toBe(screen.height);
    expect(bar!.width).toBeLessThanOrEqual(screen.width);
    for (const name of ['Today', 'Match', 'Feed', 'League', 'Garage']) {
      const box = await tab(page, name).boundingBox();
      // Big enough to tap: Apple's guideline is 44 points.
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(screen.width);
  });

  test('Your car, top right, is your icon, and opens your Profile', async ({ page, request }) => {
    await inTheApp(page, request);
    const badge = profileButton(page, 'Riley');
    await expect(badge.locator('.frame-car svg')).toBeVisible();
    const box = await badge.boundingBox();
    expect(box!.x + box!.width).toBeGreaterThan(page.viewportSize()!.width - 80);
    expect(box!.y).toBeLessThan(120);
    await badge.click();
    await expect(page.getByRole('heading', { name: 'Riley', level: 1 })).toBeVisible();
  });
});

test.describe('Profile', () => {
  test('Profile shows your name and league, and your key only when you ask for it', async ({ page, request }) => {
    const { league, key } = await inTheApp(page, request);
    await profileButton(page, 'Riley').click();
    await expect(page.locator('.profile-league')).toHaveText('Sunday Squad');
    await expect(page.locator('.profile-key')).toHaveCount(0);
    await button(page, 'Show my key').click();
    await expect(page.locator('.profile-key')).toHaveText(key);
    // It is the key the league has on file for this player.
    const player = await playerOf(request, league, key);
    expect((await readDoc(request, `leagues/${league.id}/keys/${player}`))?.key).toBe(key);
    await button(page, 'Hide my key').click();
    await expect(page.locator('.profile-key')).toHaveCount(0);
  });

  test('The key can be copied with one tap', async ({ page, request, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const { key } = await inTheApp(page, request);
    await profileButton(page, 'Riley').click();
    await button(page, 'Show my key').click();
    await button(page, 'Copy the key').click();
    await expect(button(page, 'Copied')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(key);
  });

  test('You can change your name, and the league sees the new one', async ({ page, request }) => {
    const { league, key } = await inTheApp(page, request);
    await profileButton(page, 'Riley').click();
    await page.getByLabel('Display name').fill('  Big   Riles ');
    await button(page, 'Save name').click();
    await expect(page.getByRole('status')).toHaveText('Saved.');
    await expect(page.getByRole('heading', { name: 'Big Riles', level: 1 })).toBeVisible();
    const player = await playerOf(request, league, key);
    expect((await readDoc(request, `leagues/${league.id}/players/${player}`))?.displayName).toBe('Big Riles');

    await button(page, 'Back').click();
    await expectInApp(page, 'Big Riles', 'Sunday Squad');
    // And it is still the new name the next time the app opens.
    await page.reload();
    await tapToEnter(page);
    await expectInApp(page, 'Big Riles', 'Sunday Squad');
  });

  test('A new name follows the same rules as joining: 1 to 24 characters', async ({ page, request }) => {
    await inTheApp(page, request);
    await profileButton(page, 'Riley').click();
    await page.getByLabel('Display name').fill('   ');
    await button(page, 'Save name').click();
    await expect(page.getByRole('alert')).toHaveText('Type a name first.');
    await page.getByLabel('Display name').fill('x'.repeat(25));
    await button(page, 'Save name').click();
    await expect(page.getByRole('alert')).toHaveText('That is too long. A name can be up to 24 characters.');
    await page.getByLabel('Display name').fill('Riley');
    await button(page, 'Save name').click();
    await expect(page.getByRole('status')).toHaveText('That is already your name.');
  });

  test('Back returns to the tab you were on, with the focus on your badge', async ({ page, request }) => {
    await inTheApp(page, request);
    await tab(page, 'Feed').click();
    await profileButton(page, 'Riley').click();
    await button(page, 'Back').click();
    await expect(page.getByRole('heading', { name: 'Feed', level: 1 })).toBeVisible();
    await expect(profileButton(page, 'Riley')).toBeFocused();
  });

  test('Signing out of this phone asks first, then goes back to the way in', async ({ page, request }) => {
    const { league, key } = await inTheApp(page, request);
    const player = await playerOf(request, league, key);
    await profileButton(page, 'Riley').click();

    // Cancel changes nothing.
    await button(page, 'Sign out of this phone').click();
    await expect(page.getByText('Sign out of this phone?')).toBeVisible();
    await button(page, 'Cancel').click();
    await expect(button(page, 'Sign out of this phone')).toBeVisible();

    await button(page, 'Sign out of this phone').click();
    await button(page, 'Sign out').click();
    await expect(button(page, 'Join a league')).toBeVisible();
    // The phone's claim is gone from the league. The profile and the key are untouched.
    const claims = await listIds(request, `leagues/${league.id}/claims`);
    for (const id of claims) expect((await readDoc(request, `leagues/${league.id}/claims/${id}`))?.player).not.toBe(player);
    expect((await readDoc(request, `leagues/${league.id}/keys/${player}`))?.key).toBe(key);
    expect((await readDoc(request, `leagues/${league.id}/players/${player}`))?.displayName).toBe('Riley');

    // Opening the app again still finds no one signed in.
    await page.reload();
    await tapToEnter(page);
    await expect(button(page, 'Join a league')).toBeVisible();

    // The recovery key gets back in.
    await button(page, "I'm already in a league").click();
    await page.getByLabel('League code').fill(league.code);
    await page.getByLabel('Recovery key').fill(key);
    await button(page, 'Find my profile').click();
    await expect(page.getByRole('heading', { name: 'Welcome back, Riley' })).toBeVisible();
  });

  test('The credit is there: A Nunchucks Production', async ({ page, request }) => {
    await inTheApp(page, request);
    await profileButton(page, 'Riley').click();
    await expect(page.getByText('A Nunchucks Production')).toBeVisible();
  });
});

test.describe('The commish, after the setup job', () => {
  test('The commish gets in with the key the league was made with, and can rename themselves', async ({ page, request }) => {
    // The same recipe as the setup job. It names the commish Alex here, and "Commish" for real.
    const league = await createLeague(request, { name: 'Sunday Squad' });
    await enter(page);
    await button(page, "I'm already in a league").click();
    await page.getByLabel('League code').fill(league.code);
    await page.getByLabel('Recovery key').fill(league.commishKey);
    await button(page, 'Find my profile').click();
    await button(page, "I've saved it").click();
    await profileButton(page, 'Alex').click();
    await page.getByLabel('Display name').fill('Jordan');
    await button(page, 'Save name').click();
    await expect(page.getByRole('status')).toHaveText('Saved.');
    expect((await readDoc(request, `leagues/${league.id}/players/${league.commish}`))?.displayName).toBe('Jordan');
  });
});
