/** The wall's words (SCOPE.md, "Live rivalry and social"). */

/** Quick-chat presets, in SCOPE.md's order. */
export const QUICK_CHAT: readonly string[] = [
  'Your boost is running on empty.',
  'I can see your screen time from here.',
  'Warm up the Wheel of Shame, {name}.',
  'Those beers are carrying me.',
  'Calculated.',
  'Kickoff was Monday. Where are you?',
  'Demolished. Again.',
  'Touch grass, {name}.',
  'See you in the replay.',
  'GG, no rematch.',
];

/** The longest post or comment. The security rules hold the same number. */
export const POST_MAX = 280;

/** The longest saved custom taunt. */
export const TAUNT_MAX = 120;

/** The most custom taunts a player can save. The security rules hold the same number. */
export const SAVED_TAUNTS_MAX = 10;

/** `{name}` becomes whoever the taunt is aimed at. */
export function fillName(text: string, name: string): string {
  return text.replaceAll('{name}', name);
}
