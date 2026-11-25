import { devices, expect, test, type Page } from '@playwright/test';
import { fromHomeScreen, pictureSize } from './helpers.ts';

// How each browser describes itself.
const SAFARI_IPHONE = devices['iPhone 13'].userAgent;
const CHROME_IPHONE = SAFARI_IPHONE.replace(/Version\/[\d.]+/, 'CriOS/126.0.6478.54');
const SAFARI_IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const CHROME_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const guide = (page: Page) => page.locator('main.install');
const titleScreen = (page: Page) => page.locator('main.title');
const steps = (page: Page) => page.locator('.install-step');

test.describe('Installing on an iPhone, from Safari', () => {
  // Safari's own bars leave the page about this much of an iPhone 13 screen.
  test.use({ viewport: { width: 390, height: 664 } });

  test('Opened in Safari, the app shows the three taps that add it to the Home Screen, and nothing else', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Add Tier C to your Home Screen' })).toBeVisible();
    await expect(steps(page)).toHaveCount(3);
    await expect(steps(page).nth(0)).toContainText('Tap Share');
    await expect(steps(page).nth(1)).toContainText('Tap Add to Home Screen');
    await expect(steps(page).nth(2)).toContainText('Tap Add, then open Tier C');
    await expect(titleScreen(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tap to enter' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Not now' })).toHaveCount(0);
  });

  test('The guide covers newer iPhones, where Share sits behind the three dots', async ({ page }) => {
    await page.goto('/');
    await expect(steps(page).nth(0)).toContainText("It is in Safari's toolbar. If you only see the three dots there, tap that first.");
    await expect(steps(page).nth(2)).toContainText('"Open as Web App", leave it on');
  });

  test('It shows the icon to look for, and says what to do when another app opened the page', async ({ page }) => {
    await page.goto('/');
    const icon = steps(page).nth(2).locator('img');
    await expect(icon).toBeVisible();
    expect(await icon.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)).toBe(192);
    await expect(page.getByText('Open it in Safari and try again.')).toBeVisible();
  });

  test('The first two steps are on screen without scrolling, and nothing runs off the side', async ({ page }) => {
    // With Reduce Motion on, the guide is in place at once, so there is nothing to wait for.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    for (const index of [0, 1]) {
      const box = await steps(page).nth(index).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      expect(box!.y + box!.height).toBeLessThanOrEqual(664);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('It fits a small iPhone too: the page scrolls down, never sideways', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 553 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await steps(page).nth(2).scrollIntoViewIfNeeded();
    // Whole, give or take the hairline a browser rounds off at the edge.
    await expect(steps(page).nth(2)).toBeInViewport({ ratio: 0.95 });
  });
});

test.describe('Opened from the Home Screen', () => {
  test('From the Home Screen icon there is no guide: the intro plays', async ({ page }) => {
    await fromHomeScreen(page);
    await page.goto('/');
    await expect(titleScreen(page)).toBeVisible();
    await expect(guide(page)).toHaveCount(0);
  });
});

test.describe('Installing on an iPad', () => {
  test.use({ userAgent: SAFARI_IPAD, viewport: { width: 820, height: 1106 } });

  test('An iPad gets the same steps, with Share at the top of the screen', async ({ page }) => {
    // A real iPad says it is a Mac. Its touch screen gives it away.
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 }));
    await page.goto('/');
    await expect(guide(page)).toHaveAttribute('data-device', 'ipad');
    await expect(page.getByRole('heading', { name: 'Add Tier C to your Home Screen' })).toBeVisible();
    await expect(steps(page).nth(0)).toContainText('It is at the top of the screen.');
  });
});

test.describe('An iPhone browser that is not Safari', () => {
  test.use({ userAgent: CHROME_IPHONE, viewport: { width: 390, height: 664 } });

  test('It asks to be opened in Safari, and copies the link with one tap', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Open this page in Safari' })).toBeVisible();
    await expect(steps(page)).toHaveCount(0);
    await expect(page.locator('.install-link')).toHaveText(/^127\.0\.0\.1:4173\/$/);
    await page.getByRole('button', { name: 'Copy the link' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
    await expect(page.getByText('Then open Safari and paste it into the address bar.')).toBeVisible();
  });

  test('If the phone will not let the app copy, it says to press and hold the address instead', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) } });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Copy the link' }).click();
    await expect(page.getByText('Press and hold the address above to copy it.')).toBeVisible();
  });
});

test.describe('Installing on Android', () => {
  test.use({ userAgent: CHROME_ANDROID, viewport: { width: 412, height: 780 } });

  test('Android is shown how to install from the browser menu', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Install Tier C' })).toBeVisible();
    await expect(steps(page)).toHaveCount(3);
    await expect(steps(page).nth(0)).toContainText('Tap the menu');
    await expect(steps(page).nth(1)).toContainText('Tap Add to Home screen');
    await expect(steps(page).nth(2)).toContainText('Open Tier C');
    // The one-tap button only appears once the phone offers it.
    await expect(page.getByRole('button', { name: 'Install', exact: true })).toHaveCount(0);
  });

  test('"Not now" carries on in the browser, and the guide stays away for a week', async ({ page }) => {
    await page.clock.install({ time: new Date('2027-01-04T12:00:00') });
    await page.goto('/');
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(titleScreen(page)).toBeVisible();

    await page.reload();
    await expect(titleScreen(page)).toBeVisible();
    await expect(guide(page)).toHaveCount(0);

    // Six days later it still stays away. On the seventh it is back.
    await page.clock.setFixedTime(new Date('2027-01-10T12:00:00'));
    await page.reload();
    await expect(titleScreen(page)).toBeVisible();
    await page.clock.setFixedTime(new Date('2027-01-11T12:00:00'));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Install Tier C' })).toBeVisible();
  });

  test("When the phone offers a one-tap install, the Install button opens the phone's own prompt", async ({ page }) => {
    await page.goto('/');
    await expect(guide(page)).toBeVisible();
    // Stand in for Chrome's offer, which a test browser never makes.
    await page.evaluate(() => {
      const offer = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: () => {
          document.documentElement.dataset.prompted = 'yes';
          return Promise.resolve();
        },
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      window.dispatchEvent(offer);
    });
    await page.getByRole('button', { name: 'Install', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-prompted', 'yes');
    await expect(page.getByRole('heading', { name: 'Tier C is installed' })).toBeVisible();
    await expect(page.getByText('Open it from your Home screen.')).toBeVisible();
  });
});

test.describe('On a computer', () => {
  test.use({ userAgent: CHROME_WINDOWS, viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('A computer has nothing to install: the app opens in the browser', async ({ page }) => {
    await page.goto('/');
    await expect(titleScreen(page)).toBeVisible();
    await expect(guide(page)).toHaveCount(0);
  });
});

test.describe('What the app tells the phone about itself', () => {
  test('Its name is Tier C League, its Home Screen label is "Tier C", and it opens as an app', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const response = await page.request.get(new URL(href ?? '', page.url()).href);
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest.name).toBe('Tier C League');
    expect(manifest.short_name).toBe('Tier C');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Tier C');
  });

  test('Every icon it lists is there, at the size it claims', async ({ page }) => {
    await page.goto('/');
    const manifestUrl = new URL((await page.locator('link[rel="manifest"]').getAttribute('href')) ?? '', page.url());
    const manifest = await (await page.request.get(manifestUrl.href)).json();
    expect(manifest.icons.map((icon: { purpose: string }) => icon.purpose).sort()).toEqual(['any', 'any', 'maskable']);
    for (const icon of manifest.icons as { src: string; sizes: string }[]) {
      const size = await pictureSize(page, new URL(icon.src, manifestUrl).href);
      expect(`${size.width}x${size.height}`, icon.src).toBe(icon.sizes);
    }
  });

  test("The iPhone's icon is a full 180-pixel square with no see-through corners", async ({ page }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    const url = new URL(href ?? '', page.url()).href;
    expect(await pictureSize(page, url)).toEqual({ width: 180, height: 180 });
    const cornerOpacity = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const pen = canvas.getContext('2d')!;
      pen.drawImage(image, 0, 0);
      return [pen.getImageData(0, 0, 1, 1).data[3], pen.getImageData(179, 179, 1, 1).data[3]];
    }, url);
    expect(cornerOpacity).toEqual([255, 255]);
  });

  test('Exactly one launch picture matches this iPhone, and it is the size of the screen in real pixels', async ({ page }) => {
    await page.goto('/');
    const matching = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-startup-image"]')]
        .filter((link) => window.matchMedia(link.media).matches)
        .map((link) => link.href),
    );
    expect(matching).toHaveLength(1);
    // An iPhone 13: 390 by 844 points, 3 pixels to the point.
    expect(await pictureSize(page, matching[0]!)).toEqual({ width: 1170, height: 2532 });
  });

  test('Every launch picture it lists is really there', async ({ page }) => {
    await page.goto('/');
    const all = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-startup-image"]')].map((link) => link.href),
    );
    expect(all.length).toBeGreaterThanOrEqual(30);
    for (const url of all) {
      const response = await page.request.head(url);
      expect(response.status(), url).toBe(200);
    }
  });

  test('Everything loads from the app itself: no fonts or files from another website', async ({ page }) => {
    const elsewhere: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith('http://127.0.0.1:4173/') && !url.startsWith('data:')) elsewhere.push(url);
    });
    await fromHomeScreen(page);
    await page.goto('/');
    await expect(titleScreen(page)).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check("italic 900 20px 'Exo 2'"))).toBe(true);
    expect(elsewhere).toEqual([]);
  });
});
