import { describe, expect, it } from 'vitest';
import { settleDue, standingsFrom, type WeekLineStored } from '../lib/settle.ts';

const H = 3_600_000;
const SUNDAY_LOCK = Date.UTC(2027, 0, 18, 17); // Monday noon in New York, after Week 2
/** Week 2: Monday Jan 11 to Sunday Jan 17. Every day locked by SUNDAY_LOCK. */
const DAYS = [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
  const start = Date.UTC(2027, 0, 11 + dayIndex, 5);
  return { date: `2027-01-${11 + dayIndex}`, period: 'w02', dayIndex, phase: 'regular', start, lock: start + 36 * H, nextEnd: start + 48 * H };
});
const full = { goals: { mind: true, body: true, wildcard: true }, screenMinutes: 30, beers: 0 };
const blank = { goals: { mind: false, body: false, wildcard: false }, screenMinutes: 0, beers: 0 };
/** A player who logged `log` every day but Sunday, their rest day, where they logged 30 minutes. */
const everyDay = (log: typeof full) => ({
  logs: Object.fromEntries(DAYS.map((day) => [day.date, day.dayIndex === 6 ? { ...blank, screenMinutes: 30 } : log])),
  kit: [],
  adjustments: [],
});

const base = {
  week: 2,
  period: 'w02',
  par: 3,
  timeZone: 'America/New_York',
  days: DAYS,
  demolitions: [],
  earlier: {},
};

describe('Settling a week', () => {
  it('Nothing happens until Sunday locks at noon on Monday', () => {
    const due = settleDue({ ...base, pairs: [{ a: 'p1', b: 'p2' }], players: { p1: everyDay(full), p2: everyDay(full) }, now: SUNDAY_LOCK - 1 });
    expect(due).toBeNull();
  });

  it('After Sunday locks the week is provisional; at midnight on Tuesday it is final', () => {
    const input = { ...base, pairs: [{ a: 'p1', b: 'p2' }], players: { p1: everyDay(full), p2: everyDay(full) } };
    expect(settleDue({ ...input, now: SUNDAY_LOCK })?.status).toBe('provisional');
    expect(settleDue({ ...input, now: SUNDAY_LOCK + 12 * H })?.status).toBe('final');
  });

  it('Each 1v1 is decided by points, the winner gets 5 more Season Points, and a draw gets 2 each', () => {
    const worse = { ...full, goals: { mind: true, body: true, wildcard: false } };
    const due = settleDue({ ...base, pairs: [{ a: 'p1', b: 'p2' }, { a: 'p3', b: 'p4' }], players: { p1: everyDay(full), p2: everyDay(worse), p3: everyDay(full), p4: everyDay(full) }, now: SUNDAY_LOCK })!;
    // p1: 6 a day for 6 days plus a +3 rest day = 39. p2 loses a goal a day: 33.
    expect(due.results.p1).toMatchObject({ points: 39, outcome: 'win', bonus: 5, seasonPoints: 44 });
    expect(due.results.p2).toMatchObject({ points: 33, outcome: 'loss', bonus: 0, seasonPoints: 33 });
    expect(due.results.p3).toMatchObject({ outcome: 'draw', bonus: 2 });
    expect(due.results.p4).toMatchObject({ outcome: 'draw', bonus: 2 });
  });

  it('A bye week is played against The House, which scores the league average', () => {
    const worse = { ...full, goals: { mind: true, body: false, wildcard: false } };
    const due = settleDue({ ...base, pairs: [{ a: 'p1', b: 'p2' }, { a: 'p3', b: 'HOUSE' }], players: { p1: everyDay(full), p2: everyDay(worse), p3: everyDay(full) }, now: SUNDAY_LOCK })!;
    // The House is the average of p1 (39) and p2 (27): 33.
    expect(due.house).toEqual({ points: 33, beers: 0 });
    expect(due.results.p3).toMatchObject({ opponent: 'HOUSE', outcome: 'win' });
  });

  it('A Demolition on a missed goal costs 2, once the week is settled', () => {
    const missedBody = { ...full, goals: { mind: true, body: false, wildcard: true } };
    const due = settleDue({
      ...base,
      pairs: [{ a: 'p1', b: 'p2' }],
      players: { p1: everyDay(full), p2: everyDay(missedBody) },
      demolitions: [{ player: 'p1', target: 'p2', date: '2027-01-12', lane: 'body' }],
      now: SUNDAY_LOCK,
    })!;
    // p2: 5 a day for 6 days plus 3 = 33, and -2.
    expect(due.results.p2?.points).toBe(31);
  });

  it('The awards come with it: MVP, Bust and the Wheel', () => {
    const worse = { ...full, goals: { mind: true, body: false, wildcard: false } };
    const due = settleDue({ ...base, pairs: [{ a: 'p1', b: 'p2' }], players: { p1: everyDay(full), p2: everyDay(worse) }, now: SUNDAY_LOCK })!;
    expect(due.awards.mvp).toEqual(['p1']);
    expect(due.awards.wheel).toEqual(['p2']);
    expect(due.lines.find((line) => line.player === 'p1')).toMatchObject({ points: 39, perfectDays: 6 });
  });

  it('A player marked as left plays on as if they did nothing: every day is a no-show, their opponent wins, and they never take MVP, the Bust or the Wheel', () => {
    const worse = { ...full, goals: { mind: true, body: false, wildcard: false } };
    const due = settleDue({ ...base, pairs: [{ a: 'p1', b: 'gone' }, { a: 'p2', b: 'p3' }], players: { p1: everyDay(full), p2: everyDay(worse), p3: everyDay(full) }, away: ['gone'], now: SUNDAY_LOCK })!;
    // Six no-shows (-30) and a blank rest day (-3).
    expect(due.results.gone).toMatchObject({ points: -33, outcome: 'loss' });
    expect(due.results.p1).toMatchObject({ outcome: 'win' });
    // The lowest of the players still here spins: p2, not the player who left.
    expect(due.awards.wheel).toEqual(['p2']);
    expect(due.awards.bust).not.toContain('gone');
  });
});

describe('The standings', () => {
  const line = (player: string, points: number, beers = 0, perfectDays = 0): WeekLineStored => ({ player, points, beers, perfectDays });

  it('Season Points are every point scored plus the bonuses, and decide the order', () => {
    const rows = standingsFrom({
      members: ['p1', 'p2'],
      weeks: [
        {
          results: { p1: { player: 'p1', opponent: 'p2', seasonPoints: 44, outcome: 'win', beers: 0 }, p2: { player: 'p2', opponent: 'p1', seasonPoints: 33, outcome: 'loss', beers: 2 } },
          lines: [line('p1', 39, 0, 6), line('p2', 33, 2, 0)],
        },
      ],
      coins: { p1: 0.5, p2: 0.2 },
    });
    expect(rows.map((row) => [row.player, row.rank, row.seasonPoints])).toEqual([
      ['p1', 1, 44],
      ['p2', 2, 33],
    ]);
  });

  it('A dodged Wheel dare takes 3 Season Points off', () => {
    const rows = standingsFrom({
      members: ['p1', 'p2'],
      weeks: [
        {
          results: { p1: { player: 'p1', opponent: 'p2', seasonPoints: 44, outcome: 'win', beers: 0 }, p2: { player: 'p2', opponent: 'p1', seasonPoints: 33, outcome: 'loss', beers: 0 } },
          lines: [line('p1', 39), line('p2', 33)],
        },
      ],
      coins: { p1: 0.5, p2: 0.2 },
      penalties: { p2: -3 },
    });
    expect(rows.map((row) => [row.player, row.seasonPoints])).toEqual([
      ['p1', 44],
      ['p2', 30],
    ]);
  });

  it('A tie on Season Points goes to the head-to-head result first', () => {
    const rows = standingsFrom({
      members: ['p1', 'p2'],
      weeks: [
        {
          results: { p1: { player: 'p1', opponent: 'p2', seasonPoints: 20, outcome: 'loss', beers: 0 }, p2: { player: 'p2', opponent: 'p1', seasonPoints: 25, outcome: 'win', beers: 0 } },
          lines: [line('p1', 20), line('p2', 20)],
        },
        {
          results: { p1: { player: 'p1', opponent: 'HOUSE', seasonPoints: 25, outcome: 'win', beers: 0 }, p2: { player: 'p2', opponent: 'HOUSE', seasonPoints: 20, outcome: 'loss', beers: 0 } },
          lines: [line('p1', 20), line('p2', 20)],
        },
      ],
      coins: { p1: 0.1, p2: 0.9 },
    });
    // Both on 45: p2 beat p1 head to head.
    expect(rows.map((row) => row.player)).toEqual(['p2', 'p1']);
    expect(rows[0]?.tieBreak).toBe('headToHead');
  });

  it('A player with no settled weeks yet is in the table with 0', () => {
    const rows = standingsFrom({ members: ['p1', 'p9'], weeks: [], coins: { p1: 0.3, p9: 0.6 } });
    expect(rows.map((row) => row.seasonPoints)).toEqual([0, 0]);
  });
});
