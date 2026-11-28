// Each holiday event's name and what it does, in a line (SCOPE.md, "Holiday
// events"): on Game Day's banners and in the feed.
import type { HolidayEvent } from '@tcl/engine';

export const HOLIDAY_WORDS: Record<HolidayEvent, [title: string, detail: string]> = {
  double: ['Double Points Day', "The day's points count double, and an Aerial doubles them again."],
  dry: ['Dry Day', 'Log 0 beers for +2.'],
  pass: ['Holiday Pass', 'Logging nothing scores 0, not −5.'],
};

/**
 * Which event a commish's holiday log line set, from its words: "Dry Day on
 * Friday, Jan 15" sets one; "No holiday event on Friday, Jan 15" takes it off.
 * `undefined` for words that are neither.
 */
export function holidayFromWords(reason: string): HolidayEvent | null | undefined {
  if (reason.startsWith('No holiday event')) return null;
  const found = (Object.entries(HOLIDAY_WORDS) as [HolidayEvent, [string, string]][]).find(([, [title]]) => reason.startsWith(`${title} on `));
  return found ? found[0] : undefined;
}
