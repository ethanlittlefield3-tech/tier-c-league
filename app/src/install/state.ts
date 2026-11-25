/**
 * Where the app is running, and what that means for installing it
 * (PHASE1.md, "iPhone install").
 *
 * - On an iPhone or iPad the app lives on the Home Screen. Opened in Safari
 *   instead, it shows an Add to Home Screen guide and nothing else, because a
 *   Home Screen app keeps its own storage: a profile made in Safari would not
 *   be there when the app is opened from its icon.
 * - On Android the browser and the installed app share their storage, so the
 *   install guide can be skipped.
 * - On a computer there is nothing to install.
 *
 * This file only decides. `surroundings.ts` does the looking.
 */
import { daysBetween, isDate } from '@tcl/engine';

/** What the app can tell about where it is running. */
export interface Surroundings {
  /** How the browser describes itself (`navigator.userAgent`). */
  userAgent: string;
  /** How many fingers the screen can follow. An iPad tells websites it is a Mac, but a Mac has no touch screen. */
  touchPoints: number;
  /** True when the app was opened from its own icon instead of in a browser tab. */
  standalone: boolean;
}

export type Device = 'iphone' | 'ipad' | 'android' | 'computer';

/**
 * What to show before the app itself.
 * - `add-to-home-screen`: the steps for Safari on an iPhone or iPad. There is no way past it.
 * - `open-in-safari`: another iPhone browser, or a page opened inside another app.
 * - `install`: the steps for Android, with a way to carry on in the browser.
 * - `none`: go straight in.
 */
export type Guide = 'none' | 'add-to-home-screen' | 'open-in-safari' | 'install';

export interface InstallState {
  device: Device;
  /** Opened from the Home Screen icon. */
  installed: boolean;
  guide: Guide;
  /** Whether a "Turn on notifications" button may be shown here. iPhone only allows asking inside the Home Screen app. */
  canOfferNotifications: boolean;
}

// Other iPhone browsers, and apps that open links inside themselves. Real
// Safari names none of these, and always says both "Version/" and "Safari/".
const NOT_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|DuckDuckGo|YaBrowser|Instagram|FBAN|FBAV|FB_IAB|Line\/|MicroMessenger|Snapchat|TikTok|musical_ly|Pinterest|LinkedInApp|Twitter/;

function deviceOf(around: Surroundings): Device {
  const ua = around.userAgent;
  if (/iPhone|iPod/.test(ua)) return 'iphone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && around.touchPoints > 1)) return 'ipad';
  if (/Android/.test(ua)) return 'android';
  return 'computer';
}

function isSafari(userAgent: string): boolean {
  return /Version\//.test(userAgent) && /Safari\//.test(userAgent) && !NOT_SAFARI.test(userAgent);
}

export function installState(around: Surroundings): InstallState {
  const device = deviceOf(around);
  const installed = around.standalone;
  const apple = device === 'iphone' || device === 'ipad';

  let guide: Guide = 'none';
  if (!installed && apple) guide = isSafari(around.userAgent) ? 'add-to-home-screen' : 'open-in-safari';
  if (!installed && device === 'android') guide = 'install';

  return { device, installed, guide, canOfferNotifications: apple ? installed : true };
}

/** After "Not now" on Android, the install steps stay away for this many days. */
export const INSTALL_REMINDER_DAYS = 7;

/**
 * Whether to show Android's install steps: yes, unless "Not now" was tapped in
 * the last week. `skippedOn` and `today` are the phone's own calendar days.
 */
export function shouldSuggestInstall(input: { skippedOn: string | null; today: string }): boolean {
  if (!isDate(input.skippedOn) || !isDate(input.today)) return true;
  const days = daysBetween(input.skippedOn, input.today);
  return days < 0 || days >= INSTALL_REMINDER_DAYS;
}
