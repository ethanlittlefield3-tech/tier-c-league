/**
 * Which season a phone plays (the commish's request, 2026-11-28): the
 * practice week while one is on, otherwise the league's season. Game Day,
 * Feed and League follow it; Commish tools, the draft and the Wheel stay on
 * the real season.
 */
import { PRACTICE_SEASON } from '@tcl/engine';

/** The league's practice mark, which only the practice job writes. */
export interface PracticeMark {
  season: string;
  status: 'live' | 'done';
  startsAt: number;
  dayMinutes: number;
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
  return { season: mark.season, status: mark.status, startsAt: mark.startsAt, finalAt: mark.finalAt, dayMinutes: mark.dayMinutes, clearAt: typeof mark.clearAt === 'number' ? mark.clearAt : null };
}

/** The season this phone plays: the practice week while one is on, else the league's own. */
export function playSeasonOf(league: LeagueSeason): string | null {
  return practiceOf(league)?.season ?? league?.season ?? null;
}
