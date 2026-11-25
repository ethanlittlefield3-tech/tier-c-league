import { describe, expect, it } from 'vitest';
import { checkInStreak, perfectStreak, streakMark } from '../src/index.ts';
import { log, score } from './helpers.ts';

const logged = score(log('M--', '2:00'));
const noShow = score(null);
const blankRestDay = score(null, { restDay: true });
const loggedRestDay = score(log('---', '1:00'), { restDay: true });
const ruleOneNoShow = score(null, { ruleOne: true });
const perfect = score(log('MBW', '0:45'));

describe('11. Check-in streaks', () => {
  it('A check-in streak counts days in a row with something logged', () => {
    const marks = [logged, logged, perfect, logged].map(streakMark);
    expect(checkInStreak(marks)).toEqual({ current: 4, best: 4 });
  });

  it('A no-show breaks the streak', () => {
    const marks = [logged, logged, logged, noShow, logged].map(streakMark);
    expect(checkInStreak(marks)).toEqual({ current: 1, best: 3 });
  });

  it('A rest day never breaks a streak: left blank, it is simply skipped', () => {
    expect(streakMark(blankRestDay)).toBe('skip');
    const marks = [logged, logged, blankRestDay, logged].map(streakMark);
    expect(checkInStreak(marks)).toEqual({ current: 3, best: 3 });
  });

  it('Logging on a rest day adds to the streak', () => {
    const marks = [logged, loggedRestDay, logged].map(streakMark);
    expect(checkInStreak(marks)).toEqual({ current: 3, best: 3 });
  });

  it('A no-show covered by Rule One does not break the streak', () => {
    expect(streakMark(ruleOneNoShow)).toBe('skip');
    const marks = [logged, logged, ruleOneNoShow, logged].map(streakMark);
    expect(checkInStreak(marks)).toEqual({ current: 3, best: 3 });
  });

  it('A streak carries over from earlier weeks', () => {
    const marks = [logged, logged].map(streakMark);
    expect(checkInStreak(marks, 28)).toEqual({ current: 30, best: 30 });
    expect(checkInStreak([streakMark(noShow)], 28)).toEqual({ current: 0, best: 28 });
  });
});

describe('11. Perfect-day streaks', () => {
  it('Perfect days in a row count up, and rest days are skipped', () => {
    expect(perfectStreak([perfect, perfect, loggedRestDay, perfect])).toEqual({ current: 3, best: 3 });
  });

  it('Any other day that is not perfect ends the run', () => {
    expect(perfectStreak([perfect, perfect, logged, perfect])).toEqual({ current: 1, best: 2 });
    expect(perfectStreak([perfect, ruleOneNoShow])).toEqual({ current: 0, best: 1 });
  });
});
