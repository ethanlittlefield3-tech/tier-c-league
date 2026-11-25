/**
 * Keeps a season's calendar in step with its settings.
 *
 * The calendar documents are the referee's watch: the security rules read
 * every deadline from them. They are written from the season's settings by
 * the engine, so they always agree with the scores. While the season is in
 * setup the commish can still move kickoff, so days that are no longer in the
 * season are removed, and only days that changed are written.
 */
import { isValidTimeZone, weekStart, weekdayIndex, isDate } from '../../engine/src/calendar.ts';
import { ruleOneIssueWeeks } from '../../engine/src/kit.ts';
import { WEEK_MODES, type WeekMode } from '../../engine/src/schedule.ts';
import type { PlayoffSettings } from '../../engine/src/playoffs.ts';
import { calendarDocs, type CalendarDoc } from './calendar-docs.ts';

export interface SeasonSettingsForSync {
  status: string;
  kickoff: string;
  regularWeeks: number;
  timeZone: string;
  /** A demo league's fast test season keeps its own calendar (`fast.ts`). */
  fast?: boolean;
  /** Each group-play week's mode, once the draft has given them out. */
  modes?: Readonly<Record<number, string>>;
  /** The playoffs' length and size, for their days. */
  playoffs?: PlayoffSettings['playoffs'];
  playoffSize?: PlayoffSettings['playoffSize'];
}

export interface Sync {
  /** Why nothing is done, or `null`. */
  skip: 'finished' | 'bad settings' | 'fast test season' | null;
  write: CalendarDoc[];
  remove: string[];
  /** When each Rule One arrives, if that changed. */
  ruleOneIssue: Date[] | null;
}

const LIVE = ['setup', 'draft', 'active'];

/** A stored value and a written one are the same: dates compare by their time. */
function same(stored: unknown, written: unknown): boolean {
  if (written instanceof Date) return typeof stored === 'number' && stored === written.getTime();
  if (Array.isArray(written)) return Array.isArray(stored) && stored.length === written.length && written.every((value, index) => same(stored[index], value));
  return stored === written;
}

export function seasonSync(input: {
  settings: SeasonSettingsForSync;
  /** The calendar documents there now, with times in milliseconds. */
  existing: { id: string; data: Record<string, unknown> }[];
  /** The Rule One arrival times there now, in milliseconds. */
  ruleOneIssue: number[] | null;
}): Sync {
  const { settings } = input;
  const none: Sync = { skip: null, write: [], remove: [], ruleOneIssue: null };
  if (!LIVE.includes(settings.status)) return { ...none, skip: 'finished' };
  if (settings.fast === true) return { ...none, skip: 'fast test season' };
  const valid =
    isDate(settings.kickoff) &&
    weekdayIndex(settings.kickoff) === 0 &&
    Number.isInteger(settings.regularWeeks) &&
    settings.regularWeeks >= 3 &&
    settings.regularWeeks <= 12 &&
    isValidTimeZone(settings.timeZone);
  if (!valid) return { ...none, skip: 'bad settings' };

  const wanted = calendarDocs({ kickoff: settings.kickoff, regularWeeks: settings.regularWeeks, timeZone: settings.timeZone, modes: weekModes(settings.modes), playoffs: settings.playoffs, playoffSize: settings.playoffSize });
  const there = new Map(input.existing.map((doc) => [doc.id, doc.data]));
  // A holiday event the commish put on a day, with its audit entry, stays on it.
  const write = wanted.flatMap((doc) => {
    const stored = there.get(doc.id);
    const held = Object.fromEntries(HELD.flatMap((key) => (stored?.[key] !== undefined && stored[key] !== null ? [[key, stored[key]]] : [])));
    const data = { ...doc.data, ...held } as typeof doc.data;
    const changed = !stored || Object.keys(data).length !== Object.keys(stored).length || Object.entries(data).some(([key, value]) => !same(stored[key], value));
    return changed ? [{ ...doc, data }] : [];
  });
  const keep = new Set(wanted.map((doc) => doc.id));
  const remove = input.existing.map((doc) => doc.id).filter((id) => !keep.has(id)).sort();

  const issue = ruleOneIssueWeeks(settings.regularWeeks).map((week) => new Date(weekStart(settings.kickoff, week, settings.timeZone)));
  const issueChanged = !same(input.ruleOneIssue, issue);
  return { skip: null, write, remove, ruleOneIssue: issueChanged ? issue : null };
}

/** A calendar day's fields that the commish writes, not the calendar job: a holiday event and its audit entry. */
const HELD = ['event', 'audit'] as const;

/** The modes the season keeps, by week number, with anything unknown left out. */
export function weekModes(modes: Readonly<Record<number, string>> | null | undefined): Record<number, WeekMode> {
  const out: Record<number, WeekMode> = {};
  for (const [week, mode] of Object.entries(modes ?? {})) {
    if (Number.isInteger(Number(week)) && (WEEK_MODES as readonly string[]).includes(mode)) out[Number(week)] = mode as WeekMode;
  }
  return out;
}
