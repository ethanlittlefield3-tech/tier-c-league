import { describe, expect, it } from 'vitest';
import { weekStats } from '../lib/week-stats.ts';

const days = [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => ({ date: `2027-01-${String(4 + dayIndex).padStart(2, '0')}`, dayIndex, period: 'w01', phase: 'regular', kind: 'play' }));

describe("A week's habits, kept for Telemetry", () => {
  it("Each player's week: days logged, goals hit, screen time, beers and where their points went", () => {
    const stats = weekStats({
      par: 3,
      days,
      players: {
        maya: { logs: { '2027-01-04': { goals: { mind: true, body: true, wildcard: true }, screenMinutes: 30, beers: 0 } }, kit: [] },
        sam: { logs: {}, kit: [{ item: 'rest', period: 'w01', date: '2027-01-05' }] },
      },
    });
    expect(stats.maya).toMatchObject({ days: 7, logged: 1, perfect: 1, noShows: 5, hits: { mind: 1, body: 1, wildcard: 1 }, screenMinutes: 30 });
    // Sam moved his rest day to Tuesday, so Sunday is a goal day.
    expect(stats.sam).toMatchObject({ days: 7, goalDays: 6, logged: 0, noShows: 6 });
  });

  it('A playoff day never counts here', () => {
    const stats = weekStats({ par: 3, days: [{ ...days[0]!, phase: 'playoff' }], players: { maya: { logs: {}, kit: [] } } });
    expect(stats.maya!.days).toBe(0);
  });
});
