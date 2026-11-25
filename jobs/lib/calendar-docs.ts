/**
 * The season's calendar as database documents: one per day, named by its date.
 *
 * The security rules read every deadline from these documents, never from a
 * phone's clock, so they are the referee's watch. Each one is the engine's own
 * day, with its times turned into real timestamps.
 */
import { addDays, weekdayIndex, type DateStr } from '../../engine/src/calendar.ts';
import { playoffCalendar, type PlayoffSettings } from '../../engine/src/playoffs.ts';
import { regularCalendar, type CalendarDay, type SeasonPlan } from '../../engine/src/season.ts';

const TIMES = ['start', 'noon', 'sixPm', 'end', 'lock', 'nextEnd', 'periodStart', 'sundayStart', 'restOpens'] as const;

export interface CalendarDoc {
  id: DateStr;
  data: Record<string, unknown>;
}

/** Every day of the regular season, and the playoffs if it has them, as documents for `calendar/{date}`. */
export function calendarDocs(season: SeasonPlan & Partial<PlayoffSettings>): CalendarDoc[] {
  const playoffs = season.playoffs && season.playoffSize ? playoffCalendar({ ...season, playoffs: season.playoffs, playoffSize: season.playoffSize }) : [];
  return calendarDocsFrom([...regularCalendar(season), ...playoffs]);
}

/** Calendar days as documents, with their times as real timestamps. */
export function calendarDocsFrom(days: CalendarDay[]): CalendarDoc[] {
  return days.map((day) => {
    const data: Record<string, unknown> = { ...day };
    for (const field of TIMES) data[field] = new Date(day[field]);
    return { id: day.date, data };
  });
}

/** The Monday on or before a date. */
export function mondayOf(date: DateStr): DateStr {
  return addDays(date, -weekdayIndex(date));
}
