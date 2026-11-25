import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { joinAs, tapToEnter } from './helpers.ts';
import { createLeague, listIds, readDoc, type TestLeague } from './league.ts';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

/** This league's device documents: one per phone that turned alerts on. */
async function devicesOf(request: APIRequestContext, league: TestLeague) {
  const all = await Promise.all((await listIds(request, 'devices')).map((id) => readDoc(request, `devices/${id}`)));
  return all.filter((device) => device?.league === league.id);
}

async function openAlerts(page: Page, league: TestLeague) {
  await joinAs(page, league, 'Riley');
  await button(page, "I've saved it").click();
  await button(page, 'Your profile, Riley').click();
  const panel = page.getByRole('region', { name: 'Alerts' });
  await panel.scrollIntoViewIfNeeded();
  return panel;
}

test.describe('Alerts', () => {
  test('Alerts turn on with a tap; each kind can be switched off, quiet hours set, and alerts turned off again', async ({ page, request, context }) => {
    await context.grantPermissions(['notifications']);
    const league = await createLeague(request);
    const panel = await openAlerts(page, league);
    await panel.getByRole('button', { name: 'Turn on alerts' }).click();

    // On: every kind of alert, and quiet from 11 pm to 8 am, filed under this player.
    const social = panel.getByRole('switch', { name: /^Social/ });
    await expect(social).toHaveAttribute('aria-checked', 'true');
    await expect.poll(async () => (await devicesOf(request, league)).length).toBe(1);
    const [saved] = await devicesOf(request, league);
    expect(saved).toMatchObject({ platform: 'ios', quiet: { start: 23, end: 8 }, settings: { social: true, daily: true } });
    expect(String(saved?.token)).toMatch(/^emulator-/);

    await social.click();
    await expect(social).toHaveAttribute('aria-checked', 'false');
    await expect.poll(async () => ((await devicesOf(request, league))[0]?.settings as Record<string, boolean>)?.social).toBe(false);

    await panel.getByLabel('From').selectOption('22');
    await expect.poll(async () => ((await devicesOf(request, league))[0]?.quiet as { start: number })?.start).toBe(22);

    await panel.getByRole('button', { name: 'Turn off alerts' }).click();
    await expect(panel.getByRole('status')).toHaveText('Alerts are off on this phone.');
    await expect.poll(async () => (await devicesOf(request, league)).length).toBe(0);
    await expect(panel.getByRole('button', { name: 'Turn on alerts' })).toBeVisible();
  });

  test('If the phone blocks alerts, the app says where to turn them back on', async ({ page, request }) => {
    // The phone answers "Don't Allow".
    await page.addInitScript(() => {
      Notification.requestPermission = () => Promise.resolve('denied');
    });
    const panel = await openAlerts(page, await createLeague(request));
    await panel.getByRole('button', { name: 'Turn on alerts' }).click();
    await expect(panel.getByText(/Alerts are blocked for Tier C/).first()).toBeVisible();
  });

  test('If the question is waved away, alerts stay off and can be turned on later', async ({ page, request }) => {
    await page.addInitScript(() => {
      Notification.requestPermission = () => Promise.resolve('default');
    });
    const panel = await openAlerts(page, await createLeague(request));
    await panel.getByRole('button', { name: 'Turn on alerts' }).click();
    await expect(panel.getByRole('status')).toHaveText('Alerts are still off. Turn them on whenever you like.');
    await expect(panel.getByRole('button', { name: 'Turn on alerts' })).toBeVisible();
  });

  test('A new player can turn alerts on right after saving their key', async ({ page, request, context }) => {
    await context.grantPermissions(['notifications']);
    const league = await createLeague(request);
    await joinAs(page, league, 'Riley');
    await button(page, 'Turn on alerts').click();
    await expect(page.getByText('Alerts are on. Pick which ones in your Profile.')).toBeVisible();
    await expect.poll(async () => (await devicesOf(request, league)).length).toBe(1);
    await button(page, "I've saved it").click();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  });

  test("An alert's link opens the app at its screen", async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    await joinAs(page, league, 'Riley');
    await button(page, "I've saved it").click();
    // An alert opens the app fresh, at its link.
    await page.goto('about:blank');
    await page.goto('/#league');
    await tapToEnter(page);
    await expect(page.getByRole('heading', { name: 'League', level: 1 })).toBeVisible();
    // The link is used once: the address goes back to the app's own.
    await expect.poll(() => new URL(page.url()).hash).toBe('');
  });
});
