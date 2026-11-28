/**
 * Which season a phone plays (the commish's request, 2026-11-28): the
 * practice week while one is on, otherwise the league's season. Game Day,
 * Feed and League follow it; Commish tools, the draft and the Wheel stay on
 * the real season.
 */
import { MODE_NAMES, PRACTICE_SEASON, type GroupMode } from '@tcl/engine';

/** The league's practice mark, which only the practice job writes. */
export interface PracticeMark {
  season: string;
  status: 'live' | 'done';
  startsAt: number;
  dayMinutes: number;
  /** A regular 1v1 week, or one of the six group-play modes. */
  mode: string;
  /** When its results go final. */
  finalAt: number;
  /** Once its results are up: when it clears itself. */
  clearAt: number | null;
}

type LeagueSeason = { season?: string | null; practice?: Partial<PracticeMark> | null } | null | undefined;

/** The practice week on in this league, if there is one. */
export function practiceOf(league: LeagueSeason): PracticeMark | null {
  const mark = league?.practice;
  if (!mark || mark.season !== PRACTICE_SEASON || (mark.status !== 'live' && mark.status !== 'done')) return null;
  if (typeof mark.startsAt !== 'number' || typeof mark.finalAt !== 'number' || typeof mark.dayMinutes !== 'number') return null;
  return { season: mark.season, status: mark.status, startsAt: mark.startsAt, finalAt: mark.finalAt, dayMinutes: mark.dayMinutes, mode: typeof mark.mode === 'string' ? mark.mode : 'regular', clearAt: typeof mark.clearAt === 'number' ? mark.clearAt : null };
}

/** A practice week's mode, by name: "a regular 1v1 week", or the group-play mode's name. */
export function practiceModeName(mode: string | undefined): string {
  return mode && mode in MODE_NAMES ? MODE_NAMES[mode as GroupMode] : '1v1';
}

/** The season this phone plays: the practice week while one is on, else the league's own. */
export function playSeasonOf(league: LeagueSeason): string | null {
  return practiceOf(league)?.season ?? league?.season ?? null;
}
