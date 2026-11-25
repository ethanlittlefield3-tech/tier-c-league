/**
 * Alert categories and quiet hours (SCOPE.md, "Notifications"): each category
 * can be turned off, and quiet hours default to 11 pm to 8 am, with held
 * alerts arriving in the morning. The app saves these, and the tick job reads
 * them before it sends anything.
 */
export const CATEGORIES = ['daily', 'matchup', 'powerups', 'social', 'receipts', 'progress', 'league'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface AlertSettings {
  categories: Record<Category, boolean>;
  /** Hours of the day, 0 to 23, in league time. No alerts from `start` until `end`. */
  quiet: { start: number; end: number };
}

export const DEFAULT_ALERTS: AlertSettings = {
  categories: { daily: true, matchup: true, powerups: true, social: true, receipts: true, progress: true, league: true },
  quiet: { start: 23, end: 8 },
};

/** True if an hour of the day is inside quiet hours, which can run past midnight. Equal hours mean none. */
export function isQuiet(hour: number, quiet: { start: number; end: number }): boolean {
  if (quiet.start === quiet.end) return false;
  return quiet.start < quiet.end ? hour >= quiet.start && hour < quiet.end : hour >= quiet.start || hour < quiet.end;
}
