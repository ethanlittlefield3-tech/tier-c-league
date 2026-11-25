import type { Surroundings } from './state.ts';

/**
 * Looks at the browser the app is running in. `state.ts` decides what it means.
 *
 * "Standalone" is how a browser says the app was opened from its own icon.
 * iPhones also have an older way of saying it, `navigator.standalone`.
 */
export function surroundings(): Surroundings {
  const shownAs = (mode: string) => window.matchMedia(`(display-mode: ${mode})`).matches;
  const standalone = shownAs('standalone') || shownAs('fullscreen') || (navigator as { standalone?: boolean }).standalone === true;
  return {
    userAgent: navigator.userAgent,
    touchPoints: navigator.maxTouchPoints ?? 0,
    standalone,
  };
}
