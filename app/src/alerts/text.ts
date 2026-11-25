/** The words for each alert category, and for an hour of the day. */
import type { Category } from '@tcl/engine';

export const CATEGORY_TEXT: Record<Category, { name: string; help: string }> = {
  daily: { name: 'Daily', help: 'Log your day, last call before noon, and Full Boost or Rule One still unused.' },
  matchup: { name: 'Matchup', help: 'Your opponent passes you, a close finish, and the result.' },
  powerups: { name: 'Power-ups', help: 'A Demolition lands on you or from you, and the last chance for Aerial.' },
  social: { name: 'Social', help: 'Taunts at you, and reactions and comments on your posts, bundled.' },
  receipts: { name: 'Receipts', help: 'Receipts asked of you, an hour before they are due, and docks.' },
  progress: { name: 'Progress', help: 'Badges, car parts and rank, when they come.' },
  league: { name: 'League', help: 'Draft day, the Wheel spin, and a dare proof to vote on.' },
};

/** "11 pm" for 23. */
export function hourText(hour: number): string {
  if (hour === 0) return '12 am';
  if (hour === 12) return '12 pm';
  return hour < 12 ? `${hour} am` : `${hour - 12} pm`;
}
