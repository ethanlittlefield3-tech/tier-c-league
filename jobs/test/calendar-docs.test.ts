import { describe, expect, it } from 'vitest';
import { regularCalendar } from '../../engine/src/season.ts';
import { calendarDocs, mondayOf } from '../lib/calendar-docs.ts';

const SEASON = { kickoff: '2027-01-04', regularWeeks: 6, timeZone: 'America/New_York' };

describe('Calendar documents', () => {
  const docs = calendarDocs(SEASON);

  it('Every day of the regular season gets one document, named by its date', () => {
    expect(docs).toHaveLength(42);
    expect(docs[0]?.id).toBe('2027-01-04');
    expect(docs[41]?.id).toBe('2027-02-14');
    expect(new Set(docs.map((doc) => doc.id)).size).toBe(42);
  });

  it("Each document holds the engine's own day, with its times as real timestamps", () => {
    const engine = regularCalendar(SEASON);
    for (const [index, doc] of docs.entries()) {
      const day = engine[index]!;
      expect(doc.data.date).toBe(day.date);
      expect(doc.data.period).toBe(day.period);
      expect(doc.data.dayIndex).toBe(day.dayIndex);
      for (const field of ['start', 'sixPm', 'end', 'lock', 'nextEnd', 'periodStart', 'sundayStart', 'restOpens'] as const) {
        expect(doc.data[field]).toBeInstanceOf(Date);
        expect((doc.data[field] as Date).getTime()).toBe(day[field]);
      }
    }
  });

  it('A day starts at midnight and locks at noon the next day, league time', () => {
    const tuesday = docs.find((doc) => doc.id === '2027-01-05')!.data;
    expect((tuesday.start as Date).toISOString()).toBe('2027-01-05T05:00:00.000Z');
    expect((tuesday.lock as Date).toISOString()).toBe('2027-01-06T17:00:00.000Z');
  });

  it('The Monday of any date is found in league time, so a season can start the week a test runs', () => {
    expect(mondayOf('2027-01-04')).toBe('2027-01-04');
    expect(mondayOf('2027-01-10')).toBe('2027-01-04');
    expect(mondayOf('2027-01-11')).toBe('2027-01-11');
  });
});
