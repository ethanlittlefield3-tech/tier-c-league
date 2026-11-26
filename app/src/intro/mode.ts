/**
 * Which intro to play (SCOPE.md, "Intro animation"; ruling R19).
 * - The full version plays every time the app opens.
 * - With Reduce Motion on, it becomes a simple fade.
 */
export type IntroMode = 'full' | 'fade';

/** How long each part runs, in milliseconds. */
export const INTRO_TIMING = {
  /** The Nunchucks card. */
  card: 2000,
  /** The boost scene: lights, the car, the ball into the camera. */
  boost: 2500,
  /** How long the title ignores taps, so the tap that skips the intro does not also enter. */
  tapGuard: 350,
} as const;

export function introMode(input: { reducedMotion: boolean }): IntroMode {
  return input.reducedMotion ? 'fade' : 'full';
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
