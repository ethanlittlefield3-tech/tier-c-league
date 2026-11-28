import { describe, expect, it } from 'vitest';
import { rumbleDay } from '@tcl/engine';
import { breakdown, formatPoints, formatScreen, formatScreenShort, isRestDay, leagueDates, liveDayScore, seasonDates, pointsChip, windowOf } from '../src/today/model.ts';

const NY = 'America/New_York';
const at = (iso: string) => new Date(iso).getTime();
const empty = { goals: { mind: false, body: false, wildcard: false }, screenMinutes: null, beers: 0 };

describe("Which day is today", () => {
  it('Today is the date in the league time zone, not the phone\'s', () => {
    // 3:30 am in London is still the evening before in New York.
    expect(leagueDates(at('2027-01-06T03:30:00Z'), NY)).toEqual({ today: '2027-01-05', yesterday: '2027-01-04' });
    expect(leagueDates(at('2027-01-06T05:00:00Z'), NY)).toEqual({ today: '2027-01-06', yesterday: '2027-01-05' });
  });

  it('In the fast test league, today follows its own clock: here, 8-minute days from kickoff', () => {
    const startsAt = at('2027-01-06T15:00:00Z');
    const season = { timeZone: NY, kickoff: '2027-01-04', fast: { startsAt, dayMinutes: 8 } };
    expect(seasonDates(startsAt + 60_000, season)).toEqual({ today: '2027-01-04', yesterday: '2027-01-03' });
    expect(seasonDates(startsAt + 17 * 60_000, season)).toEqual({ today: '2027-01-06', yesterday: '2027-01-05' });
    // Any other season goes by its time zone.
    expect(seasonDates(at('2027-01-06T03:30:00Z'), { timeZone: NY, kickoff: '2027-01-04' })).toEqual({ today: '2027-01-05', yesterday: '2027-01-04' });
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

  it('Points carry a sign, and a true minus sign', () => {
    expect(formatPoints(3)).toBe('+3');
    expect(formatPoints(0)).toBe('0');
    expect(formatPoints(-2)).toBe('−2');
  });
});

describe('The screen-time sheet', () => {
  it('Screen time on the card reads short: "2 h 15m"', () => {
    expect(formatScreenShort(null)).toBe('Not logged');
    expect(formatScreenShort(0)).toBe('0m');
    expect(formatScreenShort(45)).toBe('45m');
    expect(formatScreenShort(120)).toBe('2 h');
    expect(formatScreenShort(135)).toBe('2 h 15m');
  });

  it('Points chips say pt or pts', () => {
    expect(pointsChip(1)).toBe('+1 pt');
    expect(pointsChip(2)).toBe('+2 pts');
    expect(pointsChip(0)).toBe('0 pts');
    expect(pointsChip(-1)).toBe('−1 pt');
  });
});

describe('The day total', () => {
  it('Breaks the total down by part', () => {
    const entry = { goals: { mind: true, body: true, wildcard: false }, screenMinutes: 135, beers: 1 };
    expect(breakdown(liveDayScore({ par: 3, entry, restDay: false, locked: false }))).toBe('Goals +2 · screen +1 · beers −1');
  });

  it('Says when a power-up changed it', () => {
    const entry = { goals: { mind: true, body: false, wildcard: false }, screenMinutes: 30, beers: 0 };
    expect(breakdown(liveDayScore({ par: 3, entry, restDay: false, locked: false, aerial: true }))).toBe('Goals +1 · screen +3 · beers 0 · Aerial ×2');
    expect(breakdown(liveDayScore({ par: 3, entry, restDay: false, locked: false, ruleOne: true }))).toBe('Rule One: the day scores 0');
    // Ruling R34: a rough day logged honestly is held at a no-show's -5, and says so.
    const rough = { goals: { mind: false, body: false, wildcard: false }, screenMinutes: 480, beers: 6 };
    expect(breakdown(liveDayScore({ par: 3, entry: rough, restDay: false, locked: false }))).toBe('Goals 0 · screen −3 · beers −6 · floor +4');
  });

  it("In Rumble, it names each item's points, and a Magnet's beers", () => {
    const day = (goals: string, beers = 0) => ({ par: 3, log: { goals: { mind: goals.includes('M'), body: goals.includes('B'), wildcard: goals.includes('W') }, screenMinutes: 30, beers } });
    const tornado = rumbleDay(day('MBW'), day('MB'), { a: 'tornado', b: null });
    expect(breakdown(tornado.a)).toBe('Goals +3 · screen +3 · beers 0 · Tornado +2');
    expect(breakdown(tornado.b)).toBe('Goals +2 · screen +3 · beers 0 · Tornado −2');
    const magnet = rumbleDay(day('MBW', 2), day('MBW'), { a: 'magnet', b: null });
    expect(breakdown(magnet.b)).toBe('Goals +3 · screen +3 · beers 0 · Magnet −2');
  });

  it('Says what a holiday event did to the day', () => {
    const entry = { goals: { mind: true, body: false, wildcard: false }, screenMinutes: 30, beers: 0 };
    expect(breakdown(liveDayScore({ par: 3, entry, restDay: false, locked: false, event: 'double' }))).toBe('Goals +1 · screen +3 · beers 0 · Double Points ×2');
    expect(breakdown(liveDayScore({ par: 3, entry, restDay: false, locked: false, event: 'dry' }))).toBe('Goals +1 · screen +3 · beers 0 · Dry Day +2');
    // A beer loses the Dry Day bonus, so it isn't named.
    expect(breakdown(liveDayScore({ par: 3, entry: { ...entry, beers: 1 }, restDay: false, locked: false, event: 'dry' }))).toBe('Goals +1 · screen +3 · beers −1');
    expect(breakdown(liveDayScore({ par: 3, entry: null, restDay: false, locked: true, event: 'pass' }))).toBe('Nothing logged, on a Holiday Pass: 0');
  });

  it('Leaves out screen time while it is not logged, and says nothing when nothing is logged', () => {
    const entry = { goals: { mind: true, body: false, wildcard: false }, screenMinutes: null, beers: 0 };
    expect(breakdown(liveDayScore({ par: 3, entry, restDay: false, locked: false }))).toBe('Goals +1 · beers 0');
    expect(breakdown(liveDayScore({ par: 3, entry: null, restDay: false, locked: false }))).toBe('');
    expect(breakdown(liveDayScore({ par: 3, entry: null, restDay: false, locked: true }))).toBe('Nothing logged: −5');
  });
});
