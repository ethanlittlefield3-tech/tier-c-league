/**
 * Dares for the Wheel of Shame (SCOPE.md, "Wheel of Shame"). The pool is the
 * starter dares plus one approved dare per player from the draft.
 */

/** SCOPE.md's starter dares, in its order. */
export const STARTER_DARES: readonly string[] = [
  'Group picks your profile pic for 24 hours.',
  'Post your worst camera-roll photo.',
  '50 push-ups, on video.',
  'Only voice memos in the group chat for a day.',
  'Group picks your lock screen for a week.',
  'Cold shower, on video.',
  'Post a childhood photo.',
  'Sing happy birthday in a voice memo.',
];

/** The longest dare, in characters. The security rules hold the same number. */
export const DARE_MAX = 80;

/** The longest goal, in characters. The security rules hold the same number. */
export const GOAL_MAX = 60;

/**
 * A dare done on video. The app keeps photos only, to stay on the free plan
 * (DECISIONS.md, the video decision): the video goes in the group chat, and a
 * still from it is the proof the league votes on in the app.
 */
export function isVideoDare(dare: string): boolean {
  return /\bvideos?\b/i.test(dare);
}
