import { describe, expect, it } from 'vitest';
import {
  DAY,
  HOUR,
  addDays,
  dayLock,
  dayStart,
  daysBetween,
  finalAt,
  isDate,
  isValidTimeZone,
  localDate,
  provisionalAt,
  seasonDay,
  toLocal,
  wallTimeToInstant,
  weekDates,
  weekStart,
  weekdayIndex,
} from '../src/index.ts';
import { utc } from './helpers.ts';

const NY = 'America/New_York';
const KICKOFF = '2027-01-04';

describe('12. Calendar', () => {
  it('A day starts at 12:00 am league time', () => {
    // New York is 5 hours behind UTC in January.
    expect(dayStart('2027-01-04', NY)).toBe(utc('2027-01-04T05:00:00Z'));
  });

  it('A day locks at 12:00 pm the next day', () => {
    expect(dayLock('2027-01-04', NY)).toBe(utc('2027-01-05T17:00:00Z'));
  });

  it('An instant belongs to the league day it falls in, whatever the phone says', () => {
    expect(localDate(utc('2027-01-05T04:59:59Z'), NY)).toBe('2027-01-04');
    expect(localDate(utc('2027-01-05T05:00:00Z'), NY)).toBe('2027-01-05');
  });

  it('Weeks run Monday to Sunday, counted from the kickoff Monday', () => {
    expect(weekDates(KICKOFF, 1)).toEqual([
      '2027-01-04',
      '2027-01-05',
      '2027-01-06',
      '2027-01-07',
      '2027-01-08',
      '2027-01-09',
      '2027-01-10',
    ]);
    expect(weekdayIndex('2027-01-04')).toBe(0);
    expect(weekdayIndex('2027-01-10')).toBe(6);
    expect(seasonDay(KICKOFF, '2027-01-17')).toEqual({ week: 2, dayIndex: 6 });
    expect(seasonDay(KICKOFF, '2027-01-03').week).toBe(0);
  });

  it('A kickoff that is not a Monday is refused', () => {
    expect(() => weekDates('2027-01-05', 1)).toThrow(/Monday/);
  });

  it('The week starts and kits refill on Monday at 12:00 am', () => {
    expect(weekStart(KICKOFF, 1, NY)).toBe(utc('2027-01-04T05:00:00Z'));
    expect(weekStart(KICKOFF, 2, NY)).toBe(utc('2027-01-11T05:00:00Z'));
  });

  it('Results are provisional at 12:00 pm on the Monday after, when Sunday locks', () => {
    expect(provisionalAt(KICKOFF, 1, NY)).toBe(utc('2027-01-11T17:00:00Z'));
    expect(provisionalAt(KICKOFF, 1, NY)).toBe(dayLock('2027-01-10', NY));
  });

  it('Results are final at 12:00 am on the Tuesday after', () => {
    expect(finalAt(KICKOFF, 1, NY)).toBe(utc('2027-01-12T05:00:00Z'));
  });

  it('Spring forward: the day is 23 hours long, and it still starts at midnight and locks at noon', () => {
    // Clocks jump from 2:00 am to 3:00 am on Sunday, March 14, 2027.
    const start = dayStart('2027-03-14', NY);
    expect(start).toBe(utc('2027-03-14T05:00:00Z'));
    expect(dayStart('2027-03-15', NY) - start).toBe(23 * HOUR);
    expect(dayLock('2027-03-13', NY)).toBe(utc('2027-03-14T16:00:00Z'));
    expect(toLocal(dayLock('2027-03-13', NY), NY)).toMatchObject({ date: '2027-03-14', hour: 12, minute: 0 });
  });

  it('Fall back: the day is 25 hours long, and it still starts at midnight and locks at noon', () => {
    // Clocks go from 2:00 am back to 1:00 am on Sunday, November 7, 2027.
    const start = dayStart('2027-11-07', NY);
    expect(start).toBe(utc('2027-11-07T04:00:00Z'));
    expect(dayStart('2027-11-08', NY) - start).toBe(25 * HOUR);
    expect(dayLock('2027-11-06', NY)).toBe(utc('2027-11-07T17:00:00Z'));
    expect(toLocal(dayLock('2027-11-06', NY), NY)).toMatchObject({ date: '2027-11-07', hour: 12, minute: 0 });
  });

  it('A time the clocks skip lands just past the jump, and a time that happens twice means the first one', () => {
    // 2:30 am does not exist on March 14, 2027 in New York.
    expect(toLocal(wallTimeToInstant('2027-03-14', 2, 30, NY), NY)).toMatchObject({ hour: 3, minute: 30 });
    // 1:30 am happens twice on November 7, 2027. The first one is still on daylight time.
    expect(wallTimeToInstant('2027-11-07', 1, 30, NY)).toBe(utc('2027-11-07T05:30:00Z'));
  });

  it('The league time zone can be any zone, and each league keeps its own clock', () => {
    expect(dayStart('2027-01-04', 'America/Los_Angeles')).toBe(utc('2027-01-04T08:00:00Z'));
    expect(dayStart('2027-01-04', 'Europe/London')).toBe(utc('2027-01-04T00:00:00Z'));
    expect(dayStart('2027-01-04', 'Asia/Kolkata')).toBe(utc('2027-01-03T18:30:00Z'));
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
  });

  it('Every day of 2027 and 2028 starts on its own date, right after the previous one ends, in 12 very different zones', () => {
    const zones = [
      'America/New_York',
      'America/Los_Angeles',
      'America/Havana', // clocks change at midnight
      'America/St_Johns', // half-hour offset
      'Europe/London',
      'Asia/Beirut', // clocks change at midnight
      'Asia/Kolkata', // no daylight saving, half-hour offset
      'Asia/Kathmandu', // 45-minute offset
      'Australia/Lord_Howe', // half-hour daylight saving shift
      'Pacific/Auckland',
      'Pacific/Kiritimati', // 14 hours ahead of UTC
      'Pacific/Pago_Pago', // 11 hours behind UTC
    ];
    for (const zone of zones) {
      let date = '2027-01-01';
      let previousStart = dayStart(addDays(date, -1), zone);
      while (date <= '2028-12-31') {
        const start = dayStart(date, zone);
        const where = `${zone} ${date}`;
        expect(localDate(start, zone), `${where}: starts on its own date`).toBe(date);
        expect(localDate(start - 1, zone), `${where}: the moment before is the day before`).toBe(addDays(date, -1));
        const length = start - previousStart;
        expect(length >= 23 * HOUR && length <= 25 * HOUR, `${where}: previous day is 23 to 25 hours`).toBe(true);
        expect(toLocal(dayLock(date, zone), zone), `${where}: locks at noon the next day`).toMatchObject({
          date: addDays(date, 1),
          hour: 12,
          minute: 0,
        });
        previousStart = start;
        date = addDays(date, 1);
      }
    }
  });

  it('Date arithmetic crosses months, years and leap days correctly', () => {
    expect(addDays('2027-01-31', 1)).toBe('2027-02-01');
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(daysBetween('2027-01-04', '2027-02-15')).toBe(42);
    expect(daysBetween('2027-02-15', '2027-01-04')).toBe(-42);
    expect(isDate('2027-02-29')).toBe(false);
    expect(isDate('2028-02-29')).toBe(true);
    expect(isDate('27-1-4')).toBe(false);
  });

  it('A normal league day is exactly 24 hours from start to start', () => {
    expect(dayStart('2027-01-05', NY) - dayStart('2027-01-04', NY)).toBe(DAY);
  });
});
