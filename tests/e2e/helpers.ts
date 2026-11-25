import type { Page } from '@playwright/test';

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
