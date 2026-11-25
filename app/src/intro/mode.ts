/**
 * Which intro to play (SCOPE.md, "Intro animation").
 * - The full version plays on the first open each day.
 * - After that, a 1-second title slam.
 * - With Reduce Motion on, it becomes a simple fade.
 */
export type IntroMode = 'full' | 'short' | 'fade';

/** How long each part runs, in milliseconds. */
export const INTRO_TIMING = {
  /** The Nunchucks card. */
  card: 2000,
  /** The boost scene: lights, the car, the ball into the camera. */
  boost: 2500,
  /** The short version: just the title slam. */
  short: 1000,
  /** How long the title ignores taps, so the tap that skips the intro does not also enter. */
  tapGuard: 350,
} as const;

export function introMode(input: { lastFullDay: string | null; today: string; reducedMotion: boolean }): IntroMode {
  if (input.reducedMotion) return 'fade';
  return input.lastFullDay === input.today ? 'short' : 'full';
}

/**
 * The phone's own calendar day, as YYYY-MM-DD.
 * The intro is decoration, so the phone's clock is fine here. Nothing that
 * affects a score ever reads it.
 */
export function deviceDay(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
