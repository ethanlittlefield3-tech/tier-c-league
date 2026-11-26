import { expect, test, type Browser, type Page } from '@playwright/test';
import { enterAsCommish, joinAs, tapToEnter } from './helpers.ts';
import { createLeague, readDoc, startSeason, type TestLeague } from './league.ts';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

/** Opens Commish tools on the commish's phone. */
async function openTools(page: Page) {
  await button(page, 'Your profile, Alex').click();
  await button(page, 'Commish tools').click();
  await expect(page.getByRole('heading', { name: 'Commish tools' })).toBeVisible();
}

/** Riley joins on a second phone and saves the key. */
async function rileyJoins(browser: Browser, league: TestLeague) {
  const phone = await (await browser.newContext()).newPage();
  const key = await joinAs(phone, league, 'Riley');
  await button(phone, "I've saved it").click();
  await expect(phone.getByRole('navigation', { name: 'Main' })).toBeVisible();
  return { phone, key };
}

/** Opens Riley's row in Players and keys. */
async function openRiley(page: Page) {
  await page.locator('.person', { hasText: 'Riley' }).click();
}

test.describe('Commish tools', () => {
  test("The commish can see a player's key and reissue it, which signs out every phone they are on", async ({ page, request, browser }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const riley = await rileyJoins(browser, league);
    await enterAsCommish(page, league);
    await openTools(page);
    await openRiley(page);
    await button(page, 'Show key').click();
    await expect(page.locator('.commish-key')).toHaveText(riley.key);

    await button(page, 'Reissue key').click();
    await button(page, 'Reissue the key').click();
    await expect(page.getByRole('status')).toContainText('Riley has a new key');
    const newKey = (await page.locator('.commish-key').textContent()) ?? '';
    expect(newKey).not.toBe(riley.key);
    const player = String((await readDoc(request, `leagues/${league.id}/lookup/${newKey}`))?.player);
    expect((await readDoc(request, `leagues/${league.id}/keys/${player}`))?.key).toBe(newKey);

    // Riley's phone is out, and says why.
    await riley.phone.reload();
    await tapToEnter(riley.phone);
    await expect(riley.phone.getByText('This phone was signed out.')).toBeVisible();
    await riley.phone.context().close();
  });

  test('Closing the league stops new players joining', async ({ page, request, browser }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    await enterAsCommish(page, league);
    await openTools(page);
    await page.getByRole('group', { name: 'Joining' }).getByRole('button', { name: 'Closed' }).click();
    await expect.poll(async () => (await readDoc(request, `leagues/${league.id}`))?.joining).toBe('closed');

    const phone = await (await browser.newContext()).newPage();
    await joinAs(phone, league, 'Jordan').catch(() => undefined);
    await expect(phone.getByRole('alert')).toContainText('The league did not let you in.');
    await phone.context().close();
  });

  test('A co-commish gets the Commish tools too', async ({ page, request, browser }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const riley = await rileyJoins(browser, league);
    await enterAsCommish(page, league);
    await openTools(page);
    await openRiley(page);
    await button(page, 'Make co-commish').click();
    await expect(page.getByRole('status')).toContainText('Riley is co-commish.');

    await button(riley.phone, 'Your profile, Riley').click();
    await expect(button(riley.phone, 'Commish tools')).toBeVisible();
    await riley.phone.context().close();
  });

  test('Marking a player as left signs their phone out at once, and lists them under Former players', async ({ page, request, browser }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const riley = await rileyJoins(browser, league);
    await enterAsCommish(page, league);
    await openTools(page);
    await openRiley(page);
    await button(page, 'Mark as left').click();
    await button(page, 'Mark as left').click();
    await expect(page.getByRole('status')).toContainText('Riley is marked as left.');
    const after = await readDoc(request, `leagues/${league.id}`);
    expect(Object.keys((after?.members ?? {}) as object)).toEqual([league.commish]);
    expect(Object.keys((after?.former ?? {}) as object)).toHaveLength(1);
    await expect(page.getByRole('list', { name: 'Former players' })).toContainText('Riley');

    await riley.phone.reload();
    await tapToEnter(riley.phone);
    await expect(riley.phone.getByText('This phone was signed out.')).toBeVisible();
    // The old key can't get back in.
    await riley.phone.getByLabel('Recovery key').fill(riley.key);
    await button(riley.phone, 'Find my profile').click();
    await expect(riley.phone.getByRole('alert')).toContainText('That key does not match a player in this league.');
    await riley.phone.context().close();
  });

  test("A docked point shows on the player's Today, and its reason is in the league log for everyone", async ({ page, request, browser }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    await startSeason(request, league);
    const riley = await rileyJoins(browser, league);
    await enterAsCommish(page, league);
    await openTools(page);

    // A reason is required.
    await page.getByLabel('Player', { exact: true }).selectOption({ label: 'Riley' });
    await button(page, 'Save the fix').click();
    await expect(page.getByRole('alert')).toHaveText('A reason is required. The whole league sees it.');

    await page.getByLabel('Reason').fill('Fake proof on screen time');
    await button(page, 'Save the fix').click();
    await expect(page.getByText('Saved, and in the league log.')).toBeVisible();

    await expect(riley.phone.locator('.today-fix')).toHaveText('Commish: −1');
    await expect(riley.phone.locator('.today-points')).toContainText('−1');

    await button(riley.phone, 'Your profile, Riley').click();
    await button(riley.phone, 'Open the league log').click();
    await expect(riley.phone.locator('.log-entry').first()).toContainText('Alex changed a score');
    await expect(riley.phone.locator('.log-entry').first()).toContainText('Fake proof on screen time');
    await riley.phone.context().close();
  });
});
