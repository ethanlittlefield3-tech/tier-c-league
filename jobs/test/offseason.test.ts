import { describe, expect, it } from 'vitest';
import { zoneClock } from '../../engine/src/clock.ts';
import { offseasonAlerts, offseasonLeavers } from '../lib/offseason.ts';

const H = 3_600_000;
const clock = zoneClock('America/New_York');
const DEADLINE = clock.timeOf('2027-03-12', 23, 59);
const base = {
  season: 's1',
  seasonName: 'Season 1',
  deadline: DEADLINE,
  openedAt: clock.timeOf('2027-03-05', 10),
  clock,
  members: ['alex', 'maya', 'sam'],
  commish: 'alex',
  answers: {} as Record<string, string>,
};
const run = (now: number) => ({ since: now - 10 * 60_000, now });

describe('The offseason: Stay or Leave', () => {
  it('When the commish sets the deadline, everyone is asked to stay or leave by it', () => {
    const alerts = offseasonAlerts({ ...base, ...run(base.openedAt + 5 * 60_000) });
    expect(alerts.map((alert) => alert.player)).toEqual(['alex', 'maya', 'sam']);
    expect(alerts[0]).toMatchObject({ category: 'league', key: 'offseason-s1', title: 'Season 1 is over', body: 'Tap Stay or Leave by Friday, Mar 12, 11:59 pm.', screen: 'today', expires: DEADLINE });
  });

  it('A day before the deadline, only the players who have not answered are reminded', () => {
    const alerts = offseasonAlerts({ ...base, answers: { maya: 'stay' }, ...run(DEADLINE - 24 * H + 5 * 60_000) });
    expect(alerts.map((alert) => [alert.player, alert.title])).toEqual([
      ['alex', 'One day left: stay or leave'],
      ['sam', 'One day left: stay or leave'],
    ]);
    // Nothing in between.
    expect(offseasonAlerts({ ...base, ...run(DEADLINE - 30 * H) })).toEqual([]);
  });

  it('At the deadline, the players who chose Leave come off the roster; no answer means staying, and the commish always stays', () => {
    const answers = { maya: 'leave', sam: 'stay', alex: 'leave' };
    expect(offseasonLeavers({ ...base, answers, now: DEADLINE - 1, done: false })).toBeNull();
    expect(offseasonLeavers({ ...base, answers, now: DEADLINE, done: false })).toEqual(['maya']);
    expect(offseasonLeavers({ ...base, answers: {}, now: DEADLINE, done: false })).toEqual([]);
    // Once done, never again.
    expect(offseasonLeavers({ ...base, answers, now: DEADLINE + H, done: true })).toBeNull();
  });
});
