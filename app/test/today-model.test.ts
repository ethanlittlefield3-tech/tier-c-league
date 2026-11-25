import { describe, expect, it } from 'vitest';
import { formatPoints, formatScreen, isRestDay, leagueDates, liveDayScore, stepScreen, windowOf } from '../src/today/model.ts';

const NY = 'America/New_York';
const at = (iso: string) => new Date(iso).getTime();
const empty = { goals: { mind: false, body: false, wildcard: false }, screenMinutes: null, beers: 0 };

describe("Which day is today", () => {
  it('Today is the date in the league time zone, not the phone\'s', () => {
    // 3:30 am in London is still the evening before in New York.
    expect(leagueDates(at('2027-01-06T03:30:00Z'), NY)).toEqual({ today: '2027-01-05', yesterday: '2027-01-04' });
    expect(leagueDates(at('2027-01-06T05:00:00Z'), NY)).toEqual({ today: '2027-01-06', yesterday: '2027-01-05' });
  });
});

describe('The logging window', () => {
  const day = { start: at('2027-01-05T05:00:00Z'), lock: at('2027-01-06T17:00:00Z') };

  it('A day opens at midnight and can be fixed until noon the next day, then it locks', () => {
    expect(windowOf(day, at('2027-01-05T04:59:59Z'))).toBe('before');
    expect(windowOf(day, at('2027-01-05T05:00:00Z'))).toBe('open');
    expect(windowOf(day, at('2027-01-06T16:59:59Z'))).toBe('open');
    expect(windowOf(day, at('2027-01-06T17:00:00Z'))).toBe('locked');
  });

  it('A date with no calendar entry has no logging at all', () => {
    expect(windowOf(null, at('2027-01-05T12:00:00Z'))).toBe('none');
  });
});

describe('The live score', () => {
  it('While the day is open, nothing logged yet shows 0 so far, not the -5', () => {
    const score = liveDayScore({ par: 3, entry: null, restDay: false, locked: false });
    expect(score.total).toBe(0);
    expect(score.kind).toBe('open');
  });

  it('Once the day locks, nothing logged is the -5 no-show, or -3 on a rest day', () => {
    expect(liveDayScore({ par: 3, entry: null, restDay: false, locked: true }).total).toBe(-5);
    expect(liveDayScore({ par: 3, entry: null, restDay: true, locked: true }).total).toBe(-3);
  });

  it('It is the engine\'s own score: goals, screen time against par, minus beers', () => {
    const entry = { goals: { mind: true, body: true, wildcard: false }, screenMinutes: 150, beers: 1 };
    // 2 goals, 2.5 hours at par 3 is +1, 1 beer is -1.
    expect(liveDayScore({ par: 3, entry, restDay: false, locked: false }).total).toBe(2);
  });

  it('Screen time not logged yet counts 0 so far, and the -3 lands when the day locks', () => {
    const entry = { ...empty, goals: { mind: true, body: false, wildcard: false } };
    expect(liveDayScore({ par: 3, entry, restDay: false, locked: false }).total).toBe(1);
    expect(liveDayScore({ par: 3, entry, restDay: false, locked: true }).total).toBe(-2);
  });

  it('On a rest day the goals take the day off', () => {
    const entry = { goals: { mind: true, body: true, wildcard: true }, screenMinutes: 30, beers: 0 };
    expect(liveDayScore({ par: 3, entry, restDay: true, locked: false }).total).toBe(3);
  });
});

describe('The rest day', () => {
  const sunday = { phase: 'regular', dayIndex: 6 };
  const tuesday = { phase: 'regular', dayIndex: 1 };

  it('With no rest day set, it is Sunday', () => {
    expect(isRestDay({ date: '2027-01-10', calendar: sunday, restDate: null })).toBe(true);
    expect(isRestDay({ date: '2027-01-05', calendar: tuesday, restDate: null })).toBe(false);
  });

  it('A rest day moved to another day replaces Sunday', () => {
    expect(isRestDay({ date: '2027-01-05', calendar: tuesday, restDate: '2027-01-05' })).toBe(true);
    expect(isRestDay({ date: '2027-01-10', calendar: sunday, restDate: '2027-01-05' })).toBe(false);
  });

  it('A playoff day is never a default rest day', () => {
    expect(isRestDay({ date: '2027-03-07', calendar: { phase: 'playoff', dayIndex: 6 }, restDate: null })).toBe(false);
  });
});

describe('Screen time and points, as the app writes them', () => {
  it('Screen time reads in hours and minutes', () => {
    expect(formatScreen(null)).toBe('Not logged');
    expect(formatScreen(0)).toBe('0 min');
    expect(formatScreen(45)).toBe('45 min');
    expect(formatScreen(120)).toBe('2 h');
    expect(formatScreen(135)).toBe('2 h 15 min');
  });

  it('Screen time moves in 15-minute steps, from 0 to 24 hours', () => {
    expect(stepScreen(null, 15)).toBe(15);
    expect(stepScreen(null, -15)).toBe(0);
    expect(stepScreen(60, -15)).toBe(45);
    expect(stepScreen(0, -15)).toBe(0);
    expect(stepScreen(1440, 15)).toBe(1440);
    expect(stepScreen(37, 0)).toBe(30);
  });

  it('Points carry a sign, and a true minus sign', () => {
    expect(formatPoints(3)).toBe('+3');
    expect(formatPoints(0)).toBe('0');
    expect(formatPoints(-2)).toBe('−2');
  });
});
