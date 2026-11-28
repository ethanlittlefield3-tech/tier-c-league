import { describe, expect, it } from 'vitest';
import { checkInStreak, holidayOf, streakMark } from '../src/index.ts';
import { playerWeek, type CalendarTimes, type KitPlay } from '../src/days.ts';
import { log, points, score } from './helpers.ts';

describe('Holiday events: Double Points Day', () => {
  it("Doubles the day's base, negatives too", () => {
    // 2 goals and 1:30 at par 3 (+2) is 4, doubled is 8.
    expect(points(log('MB-', '1:30'), { event: 'double' })).toBe(8);
    expect(points(log('---', '6:00', 2), { event: 'double' })).toBe(-10);
    expect(points(null, { event: 'double' }), 'a no-show').toBe(-10);
  });

  it('Stacks with an Aerial: the base counts four times', () => {
    expect(points(log('MB-', '1:30'), { event: 'double', aerial: true })).toBe(16);
  });

  it('Demolitions and docks are never doubled', () => {
    // 1 goal (+1) and 3:00 (0), doubled is 2; a Demolition on Body takes 2 and a dock 1.
    expect(points(log('M--', '3:00'), { event: 'double', demolitions: ['body'], adjustments: [-1] })).toBe(-1);
  });

  it('Rule One still makes the day 0', () => {
    expect(points(log('MBW', '0:30'), { event: 'double', ruleOne: true })).toBe(0);
  });
});

describe('Holiday events: Dry Day', () => {
  it('A logged day with 0 beers gets +2', () => {
    expect(points(log('M--', '3:00'), { event: 'dry' })).toBe(3);
    expect(score(log('M--', '3:00'), { event: 'dry' }).event).toEqual({ kind: 'dry', points: 2 });
  });

  it('Any beer loses the +2, and a no-show never gets it', () => {
    expect(points(log('M--', '3:00', 1), { event: 'dry' })).toBe(0);
    expect(points(null, { event: 'dry' })).toBe(-5);
  });

  it('The +2 is part of the base, so an Aerial doubles it, and a logged rest day gets it too', () => {
    expect(points(log('M--', '3:00'), { event: 'dry', aerial: true })).toBe(6);
    // A rest day: goals take the day off; 3:00 is 0, plus 2.
    expect(points(log('---', '3:00'), { event: 'dry', restDay: true })).toBe(2);
  });
});

describe('Holiday events: Holiday Pass', () => {
  it('A no-show scores 0, not -5, and a blank rest day 0, not -3', () => {
    expect(points(null, { event: 'pass' })).toBe(0);
    expect(points(null, { event: 'pass', restDay: true })).toBe(0);
    expect(score(null, { event: 'pass' }).event).toEqual({ kind: 'pass', points: 5 });
  });

  it('A logged day scores as usual, but never below 0, what a blank day scores that day (ruling R34)', () => {
    expect(points(log('M--', '2:00', 0), { event: 'pass' })).toBe(2);
    expect(points(log('---', '6:00', 1), { event: 'pass' })).toBe(0);
  });

  it("Every goal still counts as missed on a no-show, so a Demolition lands, and docks still count", () => {
    expect(points(null, { event: 'pass', demolitions: ['body'], adjustments: [-1] })).toBe(-3);
  });

  it('A no-show on a Holiday Pass neither grows nor breaks a check-in streak', () => {
    const logged = score(log('M--', '3:00'));
    const passed = score(null, { event: 'pass' });
    expect(streakMark(passed)).toBe('skip');
    expect(checkInStreak([logged, logged, passed, logged].map(streakMark))).toEqual({ current: 3, best: 3 });
  });
});

describe('Holiday events: on the calendar', () => {
  it("Only the three events count: anything else on a calendar day is no event", () => {
    expect(holidayOf('double')).toBe('double');
    expect(holidayOf('dry')).toBe('dry');
    expect(holidayOf('pass')).toBe('pass');
    expect(holidayOf(null)).toBeNull();
    expect(holidayOf('triple')).toBeNull();
  });

  it("A player's week scores each day with its calendar day's event", () => {
    const H = 3_600_000;
    const now = Date.UTC(2027, 0, 20);
    const days: CalendarTimes[] = [0, 1].map((dayIndex) => {
      const start = Date.UTC(2027, 0, 11 + dayIndex, 5);
      return { date: `2027-01-1${1 + dayIndex}`, period: 'w02', dayIndex, phase: 'regular', start, lock: start + 31 * H, ...(dayIndex === 0 ? { event: 'pass' } : {}) };
    });
    const week = playerWeek({ par: 3, days, logs: {}, kit: [] as KitPlay[], demolitionsOn: [], adjustments: [], now });
    // Two no-shows: the Holiday Pass day scores 0, the other -5.
    expect(week.cells.map((cell) => cell.score?.total)).toEqual([0, -5]);
  });
});
