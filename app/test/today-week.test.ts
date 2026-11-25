import { describe, expect, it } from 'vitest';
import type { CalDay } from '../src/today/kit.ts';
import { playerWeek, type KitPlay } from '../src/today/week.ts';

const H = 3_600_000;
const NOW = Date.UTC(2027, 0, 13, 15); // Wednesday of Week 2, 10:00 am in New York

/** Week 2, Monday to Sunday, with each day's window placed around NOW. */
const WEEK: CalDay[] = [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
  const start = NOW - 10 * H + (dayIndex - 2) * 24 * H;
  return {
    date: `2027-01-${String(11 + dayIndex).padStart(2, '0')}`,
    period: 'w02',
    week: 2,
    dayIndex,
    phase: 'regular',
    kit: ['aerial', 'demolition', 'fullBoost'],
    start,
    lock: start + 36 * H,
    periodStart: WEEK_START(),
    sundayStart: NOW - 10 * H + 4 * 24 * H,
    restOpens: NOW - 200 * H,
  };
});
function WEEK_START() {
  return NOW - 10 * H - 2 * 24 * H;
}

const log = (mind: boolean, body: boolean, wildcard: boolean, screenMinutes: number | null, beers = 0) => ({ goals: { mind, body, wildcard }, screenMinutes, beers });
const base = { par: 3, days: WEEK, logs: {}, kit: [] as KitPlay[], demolitionsOn: [], adjustments: [], now: NOW };

describe("A player's week, day by day", () => {
  it('Days that have not started have no score yet; open days score live; locked days are final', () => {
    const week = playerWeek(base);
    expect(week.cells.map((cell) => cell.state)).toEqual(['locked', 'open', 'open', 'future', 'future', 'future', 'future']);
    // Monday locked with nothing logged: the -5. Tuesday and Wednesday are open: 0 so far.
    expect(week.cells.map((cell) => cell.score?.total ?? null)).toEqual([-5, 0, 0, null, null, null, null]);
    expect(week.totals.points).toBe(-5);
  });

  it('Each logged day scores as the engine scores it, and the week adds them up with the beers', () => {
    const week = playerWeek({
      ...base,
      logs: { '2027-01-11': log(true, true, true, 30, 0), '2027-01-12': log(true, false, false, 150, 2) },
    });
    // Monday: 3 goals and 30 minutes (+3) = 6. Tuesday: 1 goal, 2.5 hours (+1), 2 beers = 0.
    expect(week.cells[0]?.score?.total).toBe(6);
    expect(week.cells[1]?.score?.total).toBe(0);
    expect(week.totals).toMatchObject({ points: 6, beers: 2 });
  });

  it('Aerial, Full Boost, Rule One and a moved rest day count on their own days', () => {
    const week = playerWeek({
      ...base,
      logs: { '2027-01-11': log(true, false, false, 30, 0), '2027-01-12': log(true, true, true, 30, 0) },
      kit: [
        { item: 'aerial', period: 'w02', date: '2027-01-11' },
        { item: 'fullBoost', period: 'w02', date: '2027-01-11', lane: 'body' },
        { item: 'ruleOne', date: '2027-01-12', number: 1 },
        { item: 'rest', period: 'w02', date: '2027-01-15' },
      ],
    });
    // Monday: 2 goals (one boosted) and +3, doubled = 10.
    expect(week.cells[0]?.score?.total).toBe(10);
    // Tuesday: Rule One.
    expect(week.cells[1]?.score?.total).toBe(0);
    expect(week.cells[4]?.rest).toBe(true);
    expect(week.cells[6]?.rest).toBe(false);
  });

  it('A Demolition counts only once its day has locked', () => {
    const logs = { '2027-01-11': log(true, false, true, 30, 0), '2027-01-12': log(true, false, true, 30, 0) };
    const week = playerWeek({ ...base, logs, demolitionsOn: [{ date: '2027-01-11', lane: 'body' }, { date: '2027-01-12', lane: 'body' }] });
    // Monday is locked and Body was missed: 2 goals, +3, -2 = 3. Tuesday is still open: no -2 yet.
    expect(week.cells[0]?.score?.total).toBe(3);
    expect(week.cells[1]?.score?.total).toBe(5);
  });

  it('Commish docks and voids land on their day', () => {
    const week = playerWeek({
      ...base,
      logs: { '2027-01-11': log(true, true, false, 30, 0) },
      adjustments: [
        { date: '2027-01-11', amount: -1, void: 'mind' },
        { date: '2027-01-11', amount: 0, void: null },
      ],
    });
    // Mind voided (counts as missed), and the -1: 1 goal, +3, -1 = 3.
    expect(week.cells[0]?.score?.total).toBe(3);
  });

  it('Marks today', () => {
    const week = playerWeek(base);
    expect(week.cells.find((cell) => cell.today)?.date).toBe('2027-01-13');
  });
});

describe('Who leads this week', () => {
  it('Most points leads; level on points, fewer beers leads; level on both is all square', async () => {
    const { leadText } = await import('../src/screens/WeekStrip.tsx');
    expect(leadText({ points: 14, beers: 2 }, { points: 9, beers: 0 }, 'Maya')).toBe('You lead by 5');
    expect(leadText({ points: 9, beers: 0 }, { points: 11, beers: 0 }, 'Maya')).toBe('Maya leads by 2');
    expect(leadText({ points: 9, beers: 1 }, { points: 9, beers: 3 }, 'Maya')).toBe('Level on points: you lead on fewer beers');
    expect(leadText({ points: 9, beers: 3 }, { points: 9, beers: 1 }, 'Maya')).toBe('Level on points: Maya leads on fewer beers');
    expect(leadText({ points: 9, beers: 1 }, { points: 9, beers: 1 }, 'Maya')).toBe('All square');
  });
});
