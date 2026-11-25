import { expect, type Page } from '@playwright/test';

/**
 * Make the page believe it was opened from its Home Screen icon. This is the
 * same signal a real iPhone gives the app. Call it before `page.goto`.
 */
export async function fromHomeScreen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
  });
}

/** The size of a picture the app serves, in real pixels. */
export async function pictureSize(page: Page, url: string): Promise<{ width: number; height: number }> {
  return page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, url);
}

/**
 * Tap past the title. The title ignores taps for its first third of a second,
 * so this waits until the title is ready (it takes the focus then) and jumps
 * the clock past that moment instead of waiting it out. The page's clock must
 * already be installed.
 */
export async function tapToEnter(page: Page): Promise<void> {
  const enterButton = page.getByRole('button', { name: 'Tap to enter', exact: true });
  await expect(enterButton).toBeFocused();
  await page.clock.fastForward(1000);
  await enterButton.click();
}

/** Open the app from the Home Screen and tap past the title, to whatever comes after it. */
export async function enter(page: Page): Promise<void> {
  await fromHomeScreen(page);
  // With Reduce Motion on, the title is up at once: these tests are about what comes after it.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  await tapToEnter(page);
}
