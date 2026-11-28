import { describe, expect, it } from 'vitest';
import {
  isValidBeers,
  isValidPar,
  isValidScreenMinutes,
  scoreDay,
  screenPoints,
} from '../src/index.ts';
import { day, log, minutes, points, score } from './helpers.ts';

describe('1. Daily points', () => {
  it('Each goal hit is worth +1', () => {
    // 3:00 of screen time scores 0 at par 3, so only the goals move the total.
    expect(points(log('---', '3:00'))).toBe(0);
    expect(points(log('M--', '3:00'))).toBe(1);
    expect(points(log('MB-', '3:00'))).toBe(2);
    expect(points(log('MBW', '3:00'))).toBe(3);
  });

  it('Screen time scores par minus one point for each full hour (the par 3 scale), and never below -3, what not logging it costs (ruling R34)', () => {
    const scale: [string, number][] = [
      ['0:00', 3],
      ['0:45', 3],
      ['1:00', 2],
      ['1:45', 2],
      ['2:00', 1],
      ['2:45', 1],
      ['3:00', 0],
      ['3:45', 0],
      ['4:00', -1],
      ['4:45', -1],
      ['5:00', -2],
      ['5:45', -2],
      ['6:00', -3],
      ['7:00', -3],
      ['10:30', -3],
      ['24:00', -3],
    ];
    for (const [screen, expected] of scale) {
      expect(screenPoints(minutes(screen), 3), `${screen} at par 3`).toBe(expected);
    }
  });

  it('Par can be set from 1 to 6, and it shifts the whole scale', () => {
    const rows: [number, string, number][] = [
      [1, '0:30', 1],
      [1, '1:00', 0],
      [1, '2:15', -1],
      [2, '2:00', 0],
      [4, '0:45', 4],
      [6, '0:30', 6],
      [6, '5:45', 1],
      [6, '6:00', 0],
    ];
    for (const [par, screen, expected] of rows) {
      expect(screenPoints(minutes(screen), par), `${screen} at par ${par}`).toBe(expected);
    }
  });

  it('Each beer costs 1 point, down to the floor of a no-show (ruling R34)', () => {
    expect(points(log('MBW', '0:45', 0))).toBe(6);
    expect(points(log('MBW', '0:45', 1))).toBe(5);
    expect(points(log('MBW', '0:45', 4))).toBe(2);
    expect(points(log('MBW', '0:45', 30))).toBe(-5);
  });

  it('Screen time not logged costs 3 in place of the scale, at any par', () => {
    expect(points(log('MBW', null))).toBe(0);
    expect(scoreDay({ par: 1, log: log('MBW', null) }).total).toBe(0);
    expect(scoreDay({ par: 6, log: log('MBW', null) }).total).toBe(0);
  });

  it('Nothing logged all day is a no-show worth -5', () => {
    expect(points(null)).toBe(-5);
    expect(score(null).kind).toBe('noShow');
    // A log with nothing in it is the same as no log at all.
    expect(points(log('---', null, 0))).toBe(-5);
  });

  it('Logging anything is showing up: one beer and nothing else is -4, not -5', () => {
    const result = score(log('---', null, 1));
    expect(result.kind).toBe('played');
    expect(result.total).toBe(-4); // screen time not logged -3, one beer -1
  });

  it('The best normal day at par 3 is +6', () => {
    expect(points(log('MBW', '0:45', 0))).toBe(6);
  });

  it('Entries outside the allowed ranges are invalid: beers 0 to 30, screen time 0 to 1,440 minutes in 15-minute steps, par 1 to 6', () => {
    expect([0, 1, 30].every(isValidBeers)).toBe(true);
    expect([-1, 31, 2.5].some(isValidBeers)).toBe(false);
    expect([0, 15, 45, 1440].every(isValidScreenMinutes)).toBe(true);
    expect([-15, 10, 1455, 22.5].some(isValidScreenMinutes)).toBe(false);
    expect([1, 3, 6].every(isValidPar)).toBe(true);
    expect([0, 7, 2.5].some(isValidPar)).toBe(false);
  });
});

describe('1b. Logging never costs more than logging nothing (ruling R34)', () => {
  it('Logged screen time never scores below -3, the price of not logging it: 7 hours at par 3 is -3, not -4', () => {
    expect(points(log('MBW', '7:00'))).toBe(0);
    expect(points(log('MBW', null))).toBe(0);
  });

  it('A logged day never scores below a no-show: 8 hours of screen time and 6 beers is -5, not -9', () => {
    expect(points(log('---', '8:00', 6))).toBe(-5);
    expect(points(null)).toBe(-5);
  });

  it('A logged rest day never scores below a blank rest day: -3', () => {
    expect(points(log('---', '9:00', 4), { restDay: true })).toBe(-3);
    expect(points(null, { restDay: true })).toBe(-3);
  });

  it('On a Holiday Pass day, a logged day never scores below a blank one, which scores 0 that day', () => {
    expect(points(log('---', '8:00', 3), { event: 'pass' })).toBe(0);
  });

  it('Days above the floor score as before: 5 hours and 2 beers with one goal is -3', () => {
    expect(points(log('M--', '5:00', 2))).toBe(-3);
  });

  it('An Aerial doubles a floored day, as it doubles a no-show, and a Demolition and docks still come after', () => {
    expect(points(log('---', '8:00', 6), { aerial: true })).toBe(-10);
    expect(points(log('---', '8:00', 6), { demolitions: ['mind'], adjustments: [-1] })).toBe(-8);
  });

  it('The day says how much the floor saved', () => {
    expect(scoreDay({ par: 3, log: log('---', '8:00', 6) }).floor).toBe(4);
    expect(scoreDay({ par: 3, log: log('M--', '5:00', 2) }).floor).toBe(0);
  });
});

describe('2. Rest day', () => {
  it('Goals take the day off and score 0, even if they are tapped', () => {
    const result = score(log('MBW', '3:00'), { restDay: true });
    expect(result.total).toBe(0);
    expect(result.goals).toEqual({ mind: 'rest', body: 'rest', wildcard: 'rest' });
  });

  it('Screen time and beers still count, so the best rest day is +3 at par 3, and a logged one never goes below -3 (ruling R34)', () => {
    expect(points(log('---', '0:45', 0), { restDay: true })).toBe(3);
    expect(points(log('---', '0:45', 2), { restDay: true })).toBe(1);
    expect(points(log('---', '5:00', 3), { restDay: true })).toBe(-3);
  });

  it('Logging nothing on a rest day counts as screen time not logged: -3, not a -5 no-show', () => {
    const result = score(null, { restDay: true });
    expect(result.total).toBe(-3);
    expect(result.kind).toBe('restNoLog');
  });

  it('Full Boost has nothing to fix on a rest day', () => {
    expect(points(log('---', '0:45'), { restDay: true, fullBoost: 'mind' })).toBe(3);
  });

  it('Aerial on a rest day doubles only screen time and beers', () => {
    // Goals are off. 1:00 of screen time is +2 and one beer is -1, so the base is 1.
    expect(points(log('MBW', '1:00', 1), { restDay: true, aerial: true })).toBe(2);
  });

  it('Rule One still works on a rest day', () => {
    expect(points(log('---', '7:00', 5), { restDay: true, ruleOne: true })).toBe(0);
  });
});

describe('3. Order of operations', () => {
  it('Rule One makes the day score 0 no matter what happened', () => {
    expect(points(log('---', '7:00', 9), { ruleOne: true }), 'a terrible day').toBe(0);
    expect(points(null, { ruleOne: true }), 'a no-show').toBe(0);
    expect(points(log('MBW', '0:45'), { ruleOne: true, aerial: true }), 'an Aerial day').toBe(0);
    expect(points(log('-BW', '0:45'), { ruleOne: true, demolitions: ['mind'] }), 'a demolished day').toBe(0);
  });

  it('Rule One cancels an Aerial and a Demolition played on that day', () => {
    const result = score(null, { ruleOne: true, aerial: true, demolitions: ['body'] });
    expect(result.aerial).toBe('cancelled');
    expect(result.demolitions).toEqual([{ lane: 'body', outcome: 'ruleOne' }]);
    expect(result.total).toBe(0);
  });

  it('Penalties survive Rule One: a failed receipt and a commish dock still cost their points', () => {
    // A bad day made worse by a failed screen time receipt, then Rule One.
    expect(points(log('---', '0:30', 6), { ruleOne: true, voided: ['screen'], adjustments: [-1] })).toBe(-1);
    expect(points(null, { ruleOne: true, adjustments: [-1, -1] })).toBe(-2);
  });

  it('On a no-show every goal counts as missed, so a Demolition lands: -5 and -2', () => {
    const result = score(null, { demolitions: ['body'] });
    expect(result.demolitions).toEqual([{ lane: 'body', outcome: 'landed' }]);
    expect(result.total).toBe(-7);
  });

  it('Aerial doubles the base, negatives too', () => {
    expect(points(log('MBW', '0:45'), { aerial: true }), '+6 doubles to +12').toBe(12);
    expect(points(log('M--', '4:00', 2), { aerial: true }), '-2 doubles to -4').toBe(-4);
    expect(points(log('---', '3:00'), { aerial: true }), '0 stays 0').toBe(0);
    expect(points(null, { aerial: true }), 'a no-show doubles to -10').toBe(-10);
    expect(points(log('M--', null), { aerial: true }), 'screen time not logged doubles too').toBe(-4);
  });

  it('Demolition comes after Aerial and is never doubled', () => {
    // Body and Wildcard hit, 2:00 of screen time: base 3. Aerial makes 6. Mind was demolished: -2.
    expect(points(log('-BW', '2:00'), { aerial: true, demolitions: ['mind'] })).toBe(4);
  });

  it('Docks come last and are never doubled', () => {
    expect(points(log('MBW', '0:45'), { aerial: true, adjustments: [-1] })).toBe(11);
    expect(points(log('MBW', '0:45'), { adjustments: [-1, -1] })).toBe(4);
  });

  it('A commish correction can add points back, also after the doubling', () => {
    expect(points(log('MBW', '3:00'), { aerial: true, adjustments: [2] })).toBe(8);
  });

  it('Everything at once: an Aerial no-show (-10), a Demolition (-2) and a dock (-1) make -13', () => {
    expect(points(null, { aerial: true, demolitions: ['mind'], adjustments: [-1] })).toBe(-13);
  });
});

describe('4. Weekly kit: Full Boost', () => {
  it('One goal you missed that day counts as hit', () => {
    const result = score(log('M-W', '3:00'), { fullBoost: 'body' });
    expect(result.goals.body).toBe('boosted');
    expect(result.total).toBe(3);
  });

  it('It fixes one goal only', () => {
    expect(points(log('---', '3:00'), { fullBoost: 'mind' })).toBe(1);
  });

  it('On a goal you hit anyway it changes nothing', () => {
    const result = score(log('MBW', '3:00'), { fullBoost: 'mind' });
    expect(result.goals.mind).toBe('hit');
    expect(result.total).toBe(3);
  });

  it("In the playoffs the #1 seed's extra Full Boost counts too, even on the same day as the first", () => {
    const result = score(log('M--', '3:00'), { fullBoost: ['body', 'wildcard'] });
    expect([result.goals.body, result.goals.wildcard]).toEqual(['boosted', 'boosted']);
    expect(result.total).toBe(3);
  });

  it('Using it counts as showing up, so the day is not a no-show', () => {
    const result = score(null, { fullBoost: 'mind' });
    expect(result.kind).toBe('played');
    expect(result.total).toBe(-2); // one boosted goal +1, screen time not logged -3
  });
});

describe('4. Weekly kit: Demolition', () => {
  it('Landed: the targeted goal was missed, so they lose 2', () => {
    const result = score(log('-BW', '3:00'), { demolitions: ['mind'] });
    expect(result.demolitions[0]?.outcome).toBe('landed');
    expect(result.total).toBe(0);
  });

  it('Missed: the targeted goal was hit, so nothing happens', () => {
    const result = score(log('MBW', '3:00'), { demolitions: ['mind'] });
    expect(result.demolitions[0]?.outcome).toBe('missed');
    expect(result.total).toBe(3);
  });

  it('Blocked: Full Boost on the targeted goal', () => {
    const result = score(log('-BW', '3:00'), { fullBoost: 'mind', demolitions: ['mind'] });
    expect(result.demolitions[0]?.outcome).toBe('blocked');
    expect(result.total).toBe(3);
  });

  it('A Full Boost on a different goal does not block it', () => {
    const result = score(log('--W', '3:00'), { fullBoost: 'body', demolitions: ['mind'] });
    expect(result.demolitions[0]?.outcome).toBe('landed');
    expect(result.total).toBe(0);
  });

  it('Fizzled: the target moved their rest day onto that day', () => {
    const result = score(log('---', '3:00'), { restDay: true, demolitions: ['mind'] });
    expect(result.demolitions[0]?.outcome).toBe('fizzled');
    expect(result.total).toBe(0);
  });

  it('It only ever costs the 2 points: screen time and beers are untouched', () => {
    expect(points(log('-BW', '0:45', 1))).toBe(4);
    expect(points(log('-BW', '0:45', 1), { demolitions: ['mind'] })).toBe(2);
  });

  it('Two Demolitions on one day each cost 2 when both land (Team Week and 2v2)', () => {
    expect(points(log('--W', '3:00'), { demolitions: ['mind', 'body'] })).toBe(-3);
  });
});

describe('6. Receipts: what a voided square does to the day', () => {
  it('A voided goal counts as missed', () => {
    const result = score(log('MBW', '3:00'), { voided: ['body'] });
    expect(result.goals.body).toBe('voided');
    expect(result.total).toBe(2);
  });

  it('Voided screen time counts as not logged: -3', () => {
    const result = score(log('MBW', '0:45'), { voided: ['screen'] });
    expect(result.screen.state).toBe('voided');
    expect(result.total).toBe(0);
  });

  it('A failed receipt voids the square and costs 1 more point', () => {
    // A +6 day with a screen time claim that could not be proven.
    expect(points(log('MBW', '0:45'), { voided: ['screen'], adjustments: [-1] })).toBe(-1);
    // A goal that could not be proven.
    expect(points(log('MBW', '0:45'), { voided: ['mind'], adjustments: [-1] })).toBe(4);
  });

  it('Lying does not pay: a false "under 1 hour" ends lower than honestly logging 5 hours', () => {
    const honest = points(log('---', '5:00'));
    const caught = points(log('---', '0:45'), { voided: ['screen'], adjustments: [-1] });
    expect(honest).toBe(-2);
    expect(caught).toBe(-4);
  });

  it('Backing down is free: the square stops counting, with no extra point lost', () => {
    expect(points(log('MBW', '0:45'), { voided: ['mind'] })).toBe(5);
  });

  it('A voided goal counts as missed for a Demolition too, so it lands', () => {
    const result = score(log('MBW', '3:00'), { voided: ['mind'], demolitions: ['mind'] });
    expect(result.demolitions[0]?.outcome).toBe('landed');
    expect(result.total).toBe(0);
  });

  it('A Full Boost can still cover a voided goal, but the lost point stays lost', () => {
    const result = score(log('MBW', '3:00'), { voided: ['mind'], fullBoost: 'mind', adjustments: [-1] });
    expect(result.goals.mind).toBe('boosted');
    expect(result.total).toBe(2);
  });
});

describe('11. Perfect days', () => {
  it('A perfect day is all 3 goals hit, screen time scored 0 or better, and 0 beers', () => {
    expect(score(log('MBW', '0:45', 0)).perfect).toBe(true);
    expect(score(log('MBW', '3:45', 0)).perfect, '3:45 scores 0, which still counts').toBe(true);
  });

  it('Screen time scored below 0 is not perfect', () => {
    expect(score(log('MBW', '4:00', 0)).perfect).toBe(false);
  });

  it('Screen time not logged is not perfect', () => {
    expect(score(log('MBW', null, 0)).perfect).toBe(false);
  });

  it('One beer breaks it', () => {
    expect(score(log('MBW', '0:45', 1)).perfect).toBe(false);
  });

  it('One missed goal breaks it', () => {
    expect(score(log('MB-', '0:45', 0)).perfect).toBe(false);
  });

  it('A goal covered by Full Boost counts as hit, so the day can still be perfect', () => {
    expect(score(log('MB-', '0:45', 0), { fullBoost: 'wildcard' }).perfect).toBe(true);
  });

  it('A voided square breaks it', () => {
    expect(score(log('MBW', '0:45', 0), { voided: ['body'] }).perfect).toBe(false);
    expect(score(log('MBW', '0:45', 0), { voided: ['screen'] }).perfect).toBe(false);
  });

  it('A rest day is never a perfect day', () => {
    expect(score(log('MBW', '0:45', 0), { restDay: true }).perfect).toBe(false);
  });

  it('A Rule One day is never a perfect day', () => {
    expect(score(log('MBW', '0:45', 0), { ruleOne: true }).perfect).toBe(false);
  });
});

describe('Live scores before a day locks', () => {
  it('While a day is open, nothing logged shows 0 so far, not -5', () => {
    const live = scoreDay(day(null), { open: true });
    expect(live.kind).toBe('open');
    expect(live.total).toBe(0);
  });

  it('While a day is open, missing screen time shows 0 so far, not -3', () => {
    const live = scoreDay(day(log('MB-', null)), { open: true });
    expect(live.screen.state).toBe('pending');
    expect(live.total).toBe(2);
  });

  it('Once the day locks, the same entries take the full penalties', () => {
    expect(scoreDay(day(null)).total).toBe(-5);
    expect(scoreDay(day(log('MB-', null))).total).toBe(-1);
  });

  it('A fully logged day shows the same score open or locked', () => {
    const entry = day(log('MBW', '1:15', 2), { aerial: true });
    expect(scoreDay(entry, { open: true }).total).toBe(scoreDay(entry).total);
  });
});
