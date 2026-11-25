import { expect, test } from '@playwright/test';
import { enter, expectInApp, joinAs } from './helpers.ts';
import { createLeague, startSeason } from './league.ts';

// What keeps the app from sitting too high, or moving, on an iPhone Home
// Screen. A test browser can't show the iPhone bug itself, so these check the
// things that prevent it.

test.describe('Holding the screen steady on an iPhone', () => {
  test('The status bar is solid and above the page, not laid over it', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'black');
  });

  test('The page itself never scrolls or bounces: only the app\'s own content scrolls', async ({ page, request }) => {
    const league = await createLeague(request);
    await startSeason(request, league);
    await joinAs(page, league, 'Riley');
    await page.getByRole('button', { name: "I've saved it", exact: true }).click();
    await expectInApp(page, 'Riley', league.name);
    await expect(page.locator('.today-points')).toBeVisible();
    // The lower half of Today, the tray, loads a moment later. Measure once it is there.
    await expect(page.locator('.power')).toBeVisible();

    const styles = await page.evaluate(() => {
      const of = (element: Element) => getComputedStyle(element);
      const app = document.getElementById('app')!;
      return {
        html: [of(document.documentElement).overflowY, of(document.documentElement).overscrollBehaviorY],
        body: [of(document.body).overflowY, of(document.body).overscrollBehaviorY],
        app: of(app).overflowY,
        appScrolls: app.scrollHeight > app.clientHeight,
        pageScrolls: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      };
    });
    expect(styles.html).toEqual(['hidden', 'none']);
    expect(styles.body).toEqual(['hidden', 'none']);
    expect(styles.app).toBe('auto');
    // Today is taller than the screen: it scrolls inside the app, and the page itself stays put.
    expect(styles.appScrolls).toBe(true);
    expect(styles.pageScrolls).toBe(false);
  });

  test('On the title, a tap enters and a drag does nothing', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true }));
    await page.goto('/');
    await expect(page.locator('main.title')).toHaveCSS('touch-action', 'none');
  });

  test('If the phone leaves the page shifted up after typing, it goes back when the keyboard closes', async ({ page }) => {
    await enter(page);
    await page.getByRole('button', { name: 'Join a league', exact: true }).click();
    // Do what iOS does: let the page scroll, and scroll it up while a field has the focus.
    await page.addStyleTag({ content: 'html, body { overflow: visible !important; height: auto !important; } body::after { content: ""; display: block; height: 2000px; }' });
    await page.getByLabel('League code').focus();
    await page.evaluate(() => window.scrollTo(0, 240));
    expect(await page.evaluate(() => window.scrollY)).toBe(240);
    // The keyboard closes: the field loses the focus.
    await page.getByLabel('League code').blur();
    await page.clock.fastForward(200);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('Moving from one field straight to the next leaves the page alone', async ({ page }) => {
    await enter(page);
    await page.getByRole('button', { name: "I'm already in a league", exact: true }).click();
    await page.addStyleTag({ content: 'html, body { overflow: visible !important; height: auto !important; } body::after { content: ""; display: block; height: 2000px; }' });
    await page.getByLabel('League code').focus();
    await page.evaluate(() => window.scrollTo(0, 240));
    await page.getByLabel('Recovery key').focus();
    await page.clock.fastForward(200);
    expect(await page.evaluate(() => window.scrollY)).toBe(240);
  });
});
