/**
 * The offseason (SCOPE.md, "Seasons"): once a season is over, the commish sets
 * a deadline, and everyone taps Stay or Leave by it. The tick job asks
 * everyone when the deadline is set, reminds anyone who hasn't answered a day
 * before it, and at the deadline takes the players who chose Leave off the
 * roster. Their profile and history stay. Pure.
 */
import { WEEKDAYS, weekdayIndex } from '../../engine/src/calendar.ts';
import type { LeagueClock } from '../../engine/src/clock.ts';
import type { Alert } from './alerts.ts';

const H = 3_600_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface OffseasonInput {
  season: string;
  seasonName: string;
  deadline: number;
  /** When the commish set (or last moved) the deadline. */
  openedAt: number;
  clock: LeagueClock;
  members: readonly string[];
  commish: string;
  /** Each answer so far: stay or leave. */
  answers: Readonly<Record<string, string>>;
}

/** "Friday, Mar 12, 11:59 pm", in league time. */
export function deadlineWords(deadline: number, clock: LeagueClock): string {
  const date = clock.dateOf(deadline);
  const [, month, day] = date.split('-').map(Number) as [number, number, number];
  const minutes = Math.round((deadline - clock.timeOf(date, 0)) / 60_000);
  const hour = Math.floor(minutes / 60);
  const time = `${hour % 12 === 0 ? 12 : hour % 12}:${String(minutes % 60).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
  return `${WEEKDAYS[weekdayIndex(date)]}, ${MONTHS[month - 1]} ${day}, ${time}`;
}

/** The offseason's alerts due in this run, from `since` to `now`. */
export function offseasonAlerts(input: OffseasonInput & { since: number; now: number }): Alert[] {
  const within = (at: number) => input.since < at && at <= input.now;
  const by = deadlineWords(input.deadline, input.clock);
  const alert = (player: string, title: string, body: string): Alert => ({ player, category: 'league', key: `offseason-${input.season}`, title, body, screen: 'today', expires: input.deadline });
  if (input.now >= input.deadline) return [];
  if (within(input.openedAt)) return input.members.map((player) => alert(player, `${input.seasonName} is over`, `Tap Stay or Leave by ${by}.`));
  if (within(input.deadline - 24 * H)) {
    return input.members.filter((player) => !input.answers[player]).map((player) => alert(player, 'One day left: stay or leave', `Tap Stay or Leave by ${by}. No answer counts as staying.`));
  }
  return [];
}

/**
 * The players to take off the roster, once the deadline has passed: everyone
 * who chose Leave. No answer counts as staying, and the commish, who runs the
 * league, always stays. `null` while there is nothing to do.
 */
export function offseasonLeavers(input: OffseasonInput & { now: number; done: boolean }): string[] | null {
  if (input.done || input.now < input.deadline) return null;
  return input.members.filter((player) => player !== input.commish && input.answers[player] === 'leave');
}
