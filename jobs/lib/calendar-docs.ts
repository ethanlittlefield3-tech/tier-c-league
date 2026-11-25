/**
 * The season's calendar as database documents: one per day, named by its date.
 *
 * The security rules read every deadline from these documents, never from a
 * phone's clock, so they are the referee's watch. Each one is the engine's own
 * day, with its times turned into real timestamps.
 */
import { addDays, weekdayIndex, type DateStr } from '../../engine/src/calendar.ts';
import { regularCalendar, type SeasonPlan } from '../../engine/src/season.ts';

const TIMES = ['start', 'sixPm', 'end', 'lock', 'nextEnd', 'periodStart', 'sundayStart', 'restOpens'] as const;

export interface CalendarDoc {
  id: DateStr;
  data: Record<string, unknown>;
}

/** Every day of the regular season, as documents for `calendar/{date}`. */
export function calendarDocs(season: SeasonPlan): CalendarDoc[] {
  return regularCalendar(season).map((day) => {
    const data: Record<string, unknown> = { ...day };
    for (const field of TIMES) data[field] = new Date(day[field]);
    return { id: day.date, data };
  });
}

/** The Monday on or before a date. */
export function mondayOf(date: DateStr): DateStr {
  return addDays(date, -weekdayIndex(date));
}
