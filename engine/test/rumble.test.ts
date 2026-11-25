import { describe, expect, it } from 'vitest';
import { RUMBLE_ITEMS, rumbleDay, rumbleWeek, settleDue, type DayLog, type PlayerWeekData, type RumbleItem } from '../src/index.ts';
import { day, log } from './helpers.ts';

/** One Rumble day at par 3: A's and B's points, each holding an item, or none. */
function rumble(a: DayLog | null, b: DayLog | null, items: { a?: RumbleItem; b?: RumbleItem; aBoot?: 'mind' | 'body' | 'wildcard'; bBoot?: 'mind' | 'body' | 'wildcard' }, extras: { a?: object; b?: object } = {}) {
  const scored = rumbleDay(day(a, extras.a), day(b, extras.b), { a: items.a ?? null, b: items.b ?? null, aBoot: items.aBoot ?? null, bBoot: items.bBoot ?? null });
  return { a: scored.a.total, b: scored.b.total, scored };
}

// At par 3 with 30 minutes of screen time: 'MBW' is 6, 'MB-' is 5, 'M--' is 4.
const SIX = log('MBW', '0:30');
const FIVE = log('MB-', '0:30');
const FOUR = log('M--', '0:30');

describe('Rumble items', () => {
  it('There are seven items, one drawn for each player each day', () => {
    expect(RUMBLE_ITEMS).toEqual(['tornado', 'punch', 'boot', 'spike', 'swap', 'freeze', 'magnet']);
  });

  it('Tornado: take 2 points from your opponent and add them to yours; two Tornadoes cancel out', () => {
    expect(rumble(SIX, SIX, { a: 'tornado' })).toMatchObject({ a: 8, b: 4 });
    expect(rumble(SIX, SIX, { a: 'tornado', b: 'tornado' })).toMatchObject({ a: 6, b: 6 });
  });

  it('Punch: if your day beats theirs, they lose 3; a tie or a loss does nothing', () => {
    expect(rumble(SIX, FIVE, { a: 'punch' })).toMatchObject({ a: 6, b: 2 });
    expect(rumble(FIVE, SIX, { a: 'punch' })).toMatchObject({ a: 5, b: 6 });
    expect(rumble(SIX, SIX, { a: 'punch' })).toMatchObject({ a: 6, b: 6 });
  });

  it('Boot: the goal picked scores 0 that day, and their day is no longer perfect', () => {
    const booted = rumble(SIX, SIX, { a: 'boot', aBoot: 'body' });
    expect(booted).toMatchObject({ a: 6, b: 5 });
    expect(booted.scored.b.goals.body).toBe('booted');
    expect(booted.scored.b.perfect).toBe(false);
  });

  it('Spike: on your perfect day, they lose 1', () => {
    expect(rumble(SIX, SIX, { a: 'spike' })).toMatchObject({ a: 6, b: 5 });
    expect(rumble(FIVE, SIX, { a: 'spike' })).toMatchObject({ a: 5, b: 6 });
  });

  it('Swap: if you missed a goal and they hit one, your first miss becomes a hit and their first hit a miss', () => {
    const swapped = rumble(FOUR, SIX, { a: 'swap' });
    expect(swapped).toMatchObject({ a: 5, b: 5 });
    expect(swapped.scored.a.goals.body).toBe('swappedIn');
    expect(swapped.scored.b.goals.mind).toBe('swappedOut');
    // Nothing to swap: you hit them all, or they hit none.
    expect(rumble(SIX, SIX, { a: 'swap' })).toMatchObject({ a: 6, b: 6 });
    expect(rumble(FOUR, log('---', '0:30'), { a: 'swap' })).toMatchObject({ a: 4, b: 3 });
  });

  it('Freeze: their screen time points count double, good or bad', () => {
    expect(rumble(SIX, SIX, { a: 'freeze' })).toMatchObject({ a: 6, b: 9 });
    expect(rumble(SIX, log('MBW', '4:15'), { a: 'freeze' })).toMatchObject({ b: 1 });
    expect(rumble(SIX, log('MBW', null), { a: 'freeze' })).toMatchObject({ b: -3 });
  });

  it('Magnet: your beers count against them instead of you; your beers still count for tiebreaks', () => {
    const pulled = rumble(log('MBW', '0:30', 2), SIX, { a: 'magnet' });
    expect(pulled).toMatchObject({ a: 6, b: 4 });
    expect(pulled.scored.a.beers).toBe(2);
  });

  it('Boot, Spike and Swap do nothing on a day the player they touch is resting', () => {
    const resting = { b: { restDay: true } };
    expect(rumble(SIX, log('---', '0:30'), { a: 'boot', aBoot: 'body' }, resting)).toMatchObject({ b: 3 });
    expect(rumble(SIX, log('---', '0:30'), { a: 'spike' }, resting)).toMatchObject({ b: 3 });
    expect(rumble(FOUR, log('---', '0:30'), { a: 'swap' }, resting)).toMatchObject({ a: 4, b: 3 });
    // The rest of the items still work on a rest day.
    expect(rumble(SIX, log('---', '0:30'), { a: 'tornado' }, resting)).toMatchObject({ a: 8, b: 1 });
  });

  it('Rule One by either player cancels both items that day', () => {
    expect(rumble(SIX, SIX, { a: 'tornado' }, { b: { ruleOne: true } })).toMatchObject({ a: 6, b: 0 });
    expect(rumble(SIX, SIX, { a: 'tornado', b: 'punch' }, { a: { ruleOne: true } })).toMatchObject({ a: 0, b: 6 });
  });

  it('A no-show stays a flat −5: goal and screen items cannot change it, but points can still be taken', () => {
    expect(rumble(null, SIX, { a: 'swap' })).toMatchObject({ a: -5, b: 5 });
    expect(rumble(SIX, null, { a: 'freeze' })).toMatchObject({ b: -5 });
    expect(rumble(SIX, null, { a: 'tornado' })).toMatchObject({ a: 8, b: -7 });
  });

  it('Items go in order: goals first, then screen time and beers, then points, so Punch sees what Magnet did', () => {
    // B's Magnet moves 3 beers onto A: A 3, B 6. Then A's Punch doesn't beat B.
    expect(rumble(SIX, log('MBW', '0:30', 3), { a: 'punch', b: 'magnet' })).toMatchObject({ a: 3, b: 6 });
    // A's Boot takes B's Body goal first, so B's Punch no longer beats A: 5 each.
    expect(rumble(FIVE, SIX, { a: 'boot', aBoot: 'body', b: 'punch' })).toMatchObject({ a: 5, b: 5 });
  });

  it('Docks still come last, and never count toward whose day beats whose', () => {
    expect(rumble(SIX, FIVE, { a: 'punch' }, { a: { adjustments: [-2] } })).toMatchObject({ a: 4, b: 2 });
  });
});

describe('A Rumble week', () => {
  const H = 3_600_000;
  const DAYS = [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
    const start = Date.UTC(2027, 0, 11 + dayIndex, 5);
    return { date: `2027-01-${11 + dayIndex}`, period: 'w02', dayIndex, phase: 'regular', start, lock: start + 36 * H, nextEnd: start + 48 * H };
  });
  const AFTER = Date.UTC(2027, 0, 18, 17);
  const week = (dayLog: DayLog): PlayerWeekData => ({ logs: Object.fromEntries(DAYS.map((each) => [each.date, dayLog])), kit: [], adjustments: [] });
  const input = (data: PlayerWeekData, now = AFTER) => ({ par: 3, days: DAYS, logs: data.logs, kit: data.kit, demolitionsOn: [], adjustments: data.adjustments, now });

  it("Each day plays both players' items against each other", () => {
    const items = { '2027-01-11': { a: 'tornado' as const }, '2027-01-12': { b: 'punch' as const } };
    const both = rumbleWeek(input(week(SIX)), input(week(FIVE)), { items, boots: {} });
    // Monday: A 8, B 3. Tuesday: B's 5 doesn't beat A's 6. Sunday is the rest day: 3 each.
    expect(both.a.cells[0]?.score?.total).toBe(8);
    expect(both.b.cells[0]?.score?.total).toBe(3);
    expect(both.a.cells[1]?.score?.total).toBe(6);
    expect(both.a.totals.points).toBe(6 * 6 + 3 + 2);
  });

  it("A Boot counts once its day locks: until then nobody's score shows it", () => {
    const boots = { a: { '2027-01-13': 'body' as const } };
    const items = { '2027-01-13': { a: 'boot' as const } };
    const wednesday = DAYS[2]!.start + 10 * H;
    expect(rumbleWeek(input(week(SIX), wednesday), input(week(SIX), wednesday), { items, boots }).b.cells[2]?.score?.total).toBe(6);
    expect(rumbleWeek(input(week(SIX)), input(week(SIX)), { items, boots }).b.cells[2]?.score?.total).toBe(5);
  });

  it('The week settles as a 1v1 with the items played, and the player facing The House plays no items', () => {
    const rumbleData = {
      items: { '2027-01-11_a': 'tornado' as const, '2027-01-11_c': 'tornado' as const },
      boots: [],
    };
    const due = settleDue({
      week: 2,
      period: 'w02',
      par: 3,
      timeZone: 'America/New_York',
      days: DAYS,
      demolitions: [],
      earlier: {},
      now: AFTER,
      mode: 'rumble',
      pairs: [{ a: 'a', b: 'b' }, { a: 'c', b: 'HOUSE' }],
      players: { a: week(SIX), b: week(SIX), c: week(SIX) },
      rumble: rumbleData,
    })!;
    expect(due.results.a).toMatchObject({ mode: 'rumble', points: 41, opponentPoints: 37, outcome: 'win', seasonPoints: 46 });
    // c's Tornado against The House does nothing: 39, against the average of a and b.
    expect(due.results.c).toMatchObject({ points: 39, opponent: 'HOUSE' });
    expect(due.lines.find((line) => line.player === 'b')?.points).toBe(37);
  });
});
