import { expect, test, type Page } from '@playwright/test';

const NOON = new Date('2027-01-04T12:00:00');
const title = (page: Page) => page.locator('main.title');
const enterButton = (page: Page) => page.getByRole('button', { name: 'Tap to enter' });

/** Open the app with time frozen, so the intro only moves when the test says so. */
async function open(page: Page, options: { playedToday?: boolean; playedOn?: string } = {}) {
  await page.clock.install({ time: NOON });
  await page.clock.pauseAt(NOON);
  if (options.playedToday || options.playedOn) {
    await page.addInitScript((day) => {
      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, '0');
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      localStorage.setItem('tcl.intro.fullDay', day ?? today);
    }, options.playedOn ?? null);
  }
  await page.goto('/');
  await settle(page);
}

/**
 * Let the page finish what it had queued. With time frozen, the app's own
 * follow-up work (starting a timer, moving focus) waits for the clock to move.
 */
async function settle(page: Page) {
  await page.clock.runFor(50);
}

/** Wait for the animations that end to end. The button's breathing ring never does, so it is left out. */
async function animationsDone(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished),
    ),
  );
}

test.describe('Intro', () => {
  test('The first open of the day plays the Nunchucks card, then the boost scene, then the title', async ({ page }) => {
    await open(page);
    await expect(title(page)).toHaveAttribute('data-mode', 'full');
    await expect(title(page)).toHaveAttribute('data-phase', 'card');
    await expect(page.getByText('A NUNCHUCKS', { exact: true })).toBeVisible();
    await expect(page.getByText('PRODUCTION', { exact: true })).toBeVisible();

    // The card runs about 2 seconds: still up at 1.8 s, gone by 2.2 s.
    await page.clock.runFor(1750);
    await expect(title(page)).toHaveAttribute('data-phase', 'card');
    await page.clock.runFor(400);
    await expect(title(page)).toHaveAttribute('data-phase', 'boost');

    // The boost scene runs about 2.5 seconds: still going at 4.3 s, done by 4.7 s.
    await page.clock.runFor(2100);
    await expect(title(page)).toHaveAttribute('data-phase', 'boost');
    await page.clock.runFor(400);
    await expect(title(page)).toHaveAttribute('data-phase', 'title');
    await expect(enterButton(page)).toBeVisible();
    await expect(page.getByText('A Nunchucks Production')).toBeVisible();
  });

  test('A tap anywhere skips the intro and goes straight to the title', async ({ page }) => {
    await open(page);
    await expect(title(page)).toHaveAttribute('data-phase', 'card');
    await title(page).tap({ position: { x: 195, y: 300 } });
    await expect(title(page)).toHaveAttribute('data-phase', 'title');
    await expect(enterButton(page)).toBeVisible();
  });

  test('A tap during the boost scene skips it too', async ({ page }) => {
    await open(page);
    await page.clock.runFor(2600);
    await expect(title(page)).toHaveAttribute('data-phase', 'boost');
    await title(page).tap({ position: { x: 195, y: 300 } });
    await expect(title(page)).toHaveAttribute('data-phase', 'title');
  });

  test('The tap that skips the intro does not also enter the app', async ({ page }) => {
    await open(page);
    await title(page).tap({ position: { x: 195, y: 760 } });
    await title(page).tap({ position: { x: 195, y: 760 } });
    await expect(title(page)).toHaveAttribute('data-phase', 'title');
    // A moment later, a tap enters.
    await page.clock.runFor(400);
    await enterButton(page).tap();
    await expect(title(page)).toHaveCount(0);
  });

  test('Later the same day it is the 1-second title slam, with no Nunchucks card', async ({ page }) => {
    await open(page, { playedToday: true });
    await expect(title(page)).toHaveAttribute('data-mode', 'short');
    await expect(title(page)).toHaveAttribute('data-phase', 'title');
    await expect(page.locator('.card')).toHaveCount(0);
    await expect(enterButton(page)).toBeVisible();
  });

  test('The next day the full intro is back', async ({ page }) => {
    await open(page, { playedOn: '2000-01-01' });
    await expect(title(page)).toHaveAttribute('data-mode', 'full');
    await expect(title(page)).toHaveAttribute('data-phase', 'card');
  });

  test('Once the full intro has played, the phone remembers it for the day, skipped or not', async ({ page }) => {
    await open(page);
    expect(await page.evaluate(() => localStorage.getItem('tcl.intro.fullDay'))).toBeNull();
    await title(page).tap({ position: { x: 195, y: 300 } });
    await expect(title(page)).toHaveAttribute('data-phase', 'title');
    await settle(page);
    expect(await page.evaluate(() => localStorage.getItem('tcl.intro.fullDay'))).toBe('2027-01-04');
  });

  test('With Reduce Motion on it is a simple fade: no card, no boost scene', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await expect(title(page)).toHaveAttribute('data-mode', 'fade');
    await expect(title(page)).toHaveAttribute('data-phase', 'title');
    await expect(page.locator('.card')).toHaveCount(0);
    await expect(enterButton(page)).toBeVisible();
  });

  test('Sound never starts before Tap to enter, and starts with it', async ({ page }) => {
    await open(page, { playedToday: true });
    const soundOn = () => page.evaluate(() => document.documentElement.dataset.sound ?? 'off');
    expect(await soundOn()).toBe('off');
    await page.clock.runFor(1000);
    expect(await soundOn()).toBe('off');
    await enterButton(page).tap();
    expect(await soundOn()).toBe('on');
  });

  test('A key press skips the intro, the same as a tap', async ({ page }) => {
    await open(page);
    await page.keyboard.press('Escape');
    await expect(title(page)).toHaveAttribute('data-phase', 'title');
    await settle(page);
    await expect(enterButton(page)).toBeFocused();
  });

  test('On the title, the logo, the button and the credit all fit on an iPhone screen', async ({ page }) => {
    await open(page, { playedToday: true });
    await animationsDone(page);
    for (const piece of [page.locator('.title-lockup'), enterButton(page), page.locator('.title-credit')]) {
      const box = await piece.boundingBox();
      expect(box).not.toBeNull();
      if (!box) continue;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.y + box.height).toBeLessThanOrEqual(844);
    }
    // The button is big enough to tap comfortably.
    const button = await enterButton(page).boundingBox();
    expect(button?.height).toBeGreaterThanOrEqual(44);
  });
});
