import { describe, expect, it } from 'vitest';
import { INSTALL_REMINDER_DAYS, installState, shouldSuggestInstall, type Surroundings } from '../src/install/state.ts';

// What real browsers say about themselves.
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const SAFARI_IPHONE = `${IPHONE} Version/17.5 Mobile/15E148 Safari/604.1`;
const SAFARI_IPHONE_26 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SAFARI_IPAD_OLD = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const SAFARI_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const CHROME_IPHONE = `${IPHONE} CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1`;
const FIREFOX_IPHONE = `${IPHONE} FxiOS/127.0 Mobile/15E148 Safari/605.1.15`;
const EDGE_IPHONE = `${IPHONE} Version/17.0 EdgiOS/126.0.2592.56 Mobile/15E148 Safari/605.1.15`;
const GOOGLE_APP_IPHONE = `${IPHONE} GSA/322.0.640623635 Mobile/15E148 Safari/604.1`;
const INSTAGRAM_IPHONE = `${IPHONE} Mobile/15E148 Instagram 337.0.3.24.90 (iPhone14,5; iOS 17_5; en_US; en; scale=3.00; 1170x2532; 610543811)`;
const MESSENGER_IPHONE = `${IPHONE} Mobile/15E148 [FBAN/MessengerLiteForiOS;FBAV/470.0.0.34.107;FBDV/iPhone14,5;FBSV/17.5]`;
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const CHROME_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const inBrowser = (userAgent: string, touchPoints = 5): Surroundings => ({ userAgent, touchPoints, standalone: false });
const fromHomeScreen = (userAgent: string, touchPoints = 5): Surroundings => ({ userAgent, touchPoints, standalone: true });

describe('Opening the app on an iPhone or iPad', () => {
  it('In Safari, the app shows how to add it to the Home Screen instead of opening', () => {
    expect(installState(inBrowser(SAFARI_IPHONE))).toMatchObject({ device: 'iphone', installed: false, guide: 'add-to-home-screen' });
    expect(installState(inBrowser(SAFARI_IPHONE_26)).guide).toBe('add-to-home-screen');
  });

  it('Opened from the Home Screen icon, it goes straight in', () => {
    expect(installState(fromHomeScreen(SAFARI_IPHONE))).toMatchObject({ device: 'iphone', installed: true, guide: 'none' });
  });

  it('An iPad counts as an iPad even though it tells websites it is a Mac', () => {
    expect(installState(inBrowser(SAFARI_MAC, 5))).toMatchObject({ device: 'ipad', guide: 'add-to-home-screen' });
    expect(installState(inBrowser(SAFARI_IPAD_OLD))).toMatchObject({ device: 'ipad', guide: 'add-to-home-screen' });
    expect(installState(fromHomeScreen(SAFARI_MAC, 5))).toMatchObject({ device: 'ipad', guide: 'none' });
  });

  it('In Chrome, Firefox, Edge or the Google app, it asks to be opened in Safari first', () => {
    for (const browser of [CHROME_IPHONE, FIREFOX_IPHONE, EDGE_IPHONE, GOOGLE_APP_IPHONE]) {
      expect(installState(inBrowser(browser)).guide).toBe('open-in-safari');
    }
  });

  it('Inside another app, like Instagram or Messenger, it asks to be opened in Safari first', () => {
    for (const browser of [INSTAGRAM_IPHONE, MESSENGER_IPHONE]) {
      expect(installState(inBrowser(browser))).toMatchObject({ device: 'iphone', guide: 'open-in-safari' });
    }
  });
});

describe('iPhone browsers the app has never heard of', () => {
  it('A page opened inside an unknown app is still sent to Safari', () => {
    expect(installState(inBrowser(`${IPHONE} Mobile/15E148`)).guide).toBe('open-in-safari');
  });

  it('So is an unknown browser: only real Safari says both "Version" and "Safari" about itself', () => {
    expect(installState(inBrowser(`${IPHONE} SomeBrowser/3.2 Mobile/15E148 Safari/604.1`)).guide).toBe('open-in-safari');
    expect(installState(inBrowser(`${IPHONE} Version/17.5 Mobile/15E148`)).guide).toBe('open-in-safari');
  });
});

describe('Opening the app on Android or a computer', () => {
  it('An Android phone in its browser is shown how to install the app', () => {
    expect(installState(inBrowser(CHROME_ANDROID))).toMatchObject({ device: 'android', installed: false, guide: 'install' });
  });

  it('The installed Android app goes straight in', () => {
    expect(installState(fromHomeScreen(CHROME_ANDROID))).toMatchObject({ device: 'android', installed: true, guide: 'none' });
  });

  it('A computer browser goes straight in, with nothing to install', () => {
    expect(installState(inBrowser(CHROME_WINDOWS, 0))).toMatchObject({ device: 'computer', guide: 'none' });
    expect(installState(inBrowser(SAFARI_MAC, 0))).toMatchObject({ device: 'computer', guide: 'none' });
  });
});

describe('Where the notifications button may appear', () => {
  it('On an iPhone or iPad, only inside the Home Screen app', () => {
    expect(installState(inBrowser(SAFARI_IPHONE)).canOfferNotifications).toBe(false);
    expect(installState(fromHomeScreen(SAFARI_IPHONE)).canOfferNotifications).toBe(true);
    expect(installState(inBrowser(SAFARI_MAC, 5)).canOfferNotifications).toBe(false);
    expect(installState(fromHomeScreen(SAFARI_MAC, 5)).canOfferNotifications).toBe(true);
  });

  it('On Android and on computers, in the browser as well', () => {
    expect(installState(inBrowser(CHROME_ANDROID)).canOfferNotifications).toBe(true);
    expect(installState(inBrowser(CHROME_WINDOWS, 0)).canOfferNotifications).toBe(true);
  });
});

describe('Suggesting the install again on Android', () => {
  it('Someone who has never tapped "Not now" sees the install steps', () => {
    expect(shouldSuggestInstall({ skippedOn: null, today: '2027-01-04' })).toBe(true);
  });

  it('After "Not now", the steps stay away for a week', () => {
    expect(INSTALL_REMINDER_DAYS).toBe(7);
    expect(shouldSuggestInstall({ skippedOn: '2027-01-04', today: '2027-01-04' })).toBe(false);
    expect(shouldSuggestInstall({ skippedOn: '2027-01-04', today: '2027-01-10' })).toBe(false);
  });

  it('A week later they are shown once more', () => {
    expect(shouldSuggestInstall({ skippedOn: '2027-01-04', today: '2027-01-11' })).toBe(true);
    expect(shouldSuggestInstall({ skippedOn: '2026-12-28', today: '2027-01-04' })).toBe(true);
  });

  it('A saved date that makes no sense is ignored, and so is one from the future', () => {
    expect(shouldSuggestInstall({ skippedOn: 'yesterday', today: '2027-01-04' })).toBe(true);
    expect(shouldSuggestInstall({ skippedOn: '2027-13-45', today: '2027-01-04' })).toBe(true);
    expect(shouldSuggestInstall({ skippedOn: '2027-02-01', today: '2027-01-04' })).toBe(true);
  });
});
