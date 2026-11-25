import { describe, expect, it } from 'vitest';
import { scoreDay, settleWeek, totalWeek, weeklyAwards, type WeekTotals } from '../src/index.ts';
import { WORKED_WEEKS, type WorkedWeek } from './worked-weeks.ts';

/** Run a whole worked week through the engine, the same way the weekly job will. */
export function runWorkedWeek(example: WorkedWeek) {
  const totals: Record<string, WeekTotals> = {};
  for (const player of example.players) {
    totals[player.name] = totalWeek(player.days.map((day) => scoreDay({ par: example.par, ...day })));
  }
  const settlement = settleWeek(example.pairs, totals);
  const lines = example.players.map((p) => ({
    player: p.name,
    points: (totals[p.name] as WeekTotals).points,
    beers: (totals[p.name] as WeekTotals).beers,
  }));
  const earlier = Object.fromEntries(example.players.map((p) => [p.name, p.earlier ?? []]));
  return { totals, settlement, awards: weeklyAwards(example.week, lines, earlier) };
}

describe('Worked example weeks: the engine matches the totals worked out by hand', () => {
  for (const example of WORKED_WEEKS) {
    it(example.title, () => {
      const { totals, settlement, awards } = runWorkedWeek(example);
      for (const player of example.players) {
        const name = player.name;
        expect(totals[name]?.points, `${name}: points`).toBe(example.expected.points[name]);
        expect(totals[name]?.beers, `${name}: beers`).toBe(example.expected.beers[name]);
        expect(settlement.results[name]?.outcome, `${name}: result`).toBe(example.expected.outcome[name]);
        expect(settlement.results[name]?.seasonPoints, `${name}: Season Points`).toBe(
          example.expected.seasonPoints[name],
        );
      }
      expect(settlement.house?.points, 'The House').toBe(example.expected.house);
      expect(awards.mvp, 'MVP').toEqual(example.expected.mvp);
      expect(awards.bust, 'Bust').toEqual(example.expected.bust);
      expect(awards.wheel, 'Wheel').toEqual(example.expected.wheel);
    });
  }
});
