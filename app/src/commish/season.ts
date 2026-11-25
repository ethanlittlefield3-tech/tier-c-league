/**
 * Season setup (SCOPE.md, "Season settings"): the defaults, and the checks
 * made before the commish saves. The security rules check the same limits
 * again on the server.
 */
import { addDays, isDate, isValidTimeZone, wallTimeToInstant, weekdayIndex, type DateStr } from '@tcl/engine';

export interface SeasonSettings {
  name: string;
  regularWeeks: number;
  playoffs: 'none' | 'oneWeek' | 'twoWeeks';
  playoffSize: 2 | 4;
  par: number;
  groupWeeks: number[];
  timeZone: string;
  kickoff: DateStr;
  /** The draft's start, in milliseconds, or `null` while it is not set. */
  draftAt: number | null;
  joinMidSeason: boolean;
  holidayEvents: boolean;
}

/** The first Monday at least 7 days after `today`. */
function firstMondayAWeekOut(today: DateStr): DateStr {
  let day = addDays(today, 7);
  while (weekdayIndex(day) !== 0) day = addDays(day, 1);
  return day;
}

/** 7 pm league time, the Sunday before kickoff. */
export function defaultDraftAt(kickoff: DateStr, timeZone: string): number {
  return wallTimeToInstant(addDays(kickoff, -1), 19, 0, timeZone);
}

export function defaultSettings(input: { today: DateStr; seasons: number }): SeasonSettings {
  const timeZone = 'America/New_York';
  const kickoff = firstMondayAWeekOut(input.today);
  return {
    name: `Season ${input.seasons + 1}`,
    regularWeeks: 6,
    playoffs: 'oneWeek',
    playoffSize: 4,
    par: 3,
    groupWeeks: [3, 5],
    timeZone,
    kickoff,
    draftAt: defaultDraftAt(kickoff, timeZone),
    joinMidSeason: false,
    holidayEvents: true,
  };
}

/** What is wrong with the settings, in plain words. Empty when they are fine. */
export function settingsProblems(settings: SeasonSettings, today: DateStr): string[] {
  const problems: string[] = [];
  const name = settings.name.trim();
  if (name.length === 0) problems.push('Give the season a name.');
  if (name.length > 40) problems.push('The name can be up to 40 characters.');
  if (!Number.isInteger(settings.regularWeeks) || settings.regularWeeks < 3 || settings.regularWeeks > 12) problems.push('The regular season is 3 to 12 weeks.');
  if (!Number.isInteger(settings.par) || settings.par < 1 || settings.par > 6) problems.push('Screen time par is 1 to 6 hours.');
  if (settings.groupWeeks.some((week) => week < 2 || week > settings.regularWeeks)) problems.push('Group-play weeks come after Week 1 and inside the regular season.');
  if (!isValidTimeZone(settings.timeZone)) problems.push('Pick a time zone.');
  if (!isDate(settings.kickoff)) {
    problems.push('Pick a kickoff date.');
  } else {
    if (weekdayIndex(settings.kickoff) !== 0) problems.push('Kickoff has to be a Monday.');
    if (settings.kickoff <= today) problems.push('Kickoff has to be in the future.');
    if (settings.draftAt !== null && isValidTimeZone(settings.timeZone) && settings.draftAt >= wallTimeToInstant(settings.kickoff, 0, 0, settings.timeZone)) {
      problems.push('The draft has to be before kickoff.');
    }
  }
  return problems;
}

const US_ZONES = [
  { id: 'America/New_York', name: 'Eastern' },
  { id: 'America/Chicago', name: 'Central' },
  { id: 'America/Denver', name: 'Mountain' },
  { id: 'America/Phoenix', name: 'Arizona' },
  { id: 'America/Los_Angeles', name: 'Pacific' },
  { id: 'America/Anchorage', name: 'Alaska' },
  { id: 'Pacific/Honolulu', name: 'Hawaii' },
];

/** The time zones the setup offers: the US ones, then the phone's own if it is somewhere else. */
export function timeZoneChoices(deviceZone: string): { id: string; name: string }[] {
  if (US_ZONES.some((zone) => zone.id === deviceZone) || !isValidTimeZone(deviceZone)) return US_ZONES;
  return [...US_ZONES, { id: deviceZone, name: deviceZone.replaceAll('_', ' ') }];
}
