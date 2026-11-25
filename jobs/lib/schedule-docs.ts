/**
 * A season's schedule, from its finished draft (PHASE1.md, "Schedule"):
 * Week 1 from the rival picks, then a round-robin so everyone meets before
 * any repeat. With an odd count, one player a week faces The House. The
 * group-play vote's modes fill the season's group-play weeks.
 */
import { HOUSE, buildSchedule, checkRivalPicks, groupWeekModes, modeStandings, week1Pairs, weekPeriod } from '../../engine/src/index.ts';

export interface DraftState {
  step: string;
  order: string[];
  picks: Record<string, string>;
  left: string[];
}

export interface WeekDoc {
  week: number;
  period: string;
  mode: string;
  pairs: { a: string; b: string }[];
  /** Who each player faces, which is who they may demolish. `HOUSE` for a bye. */
  targets: Record<string, string[]>;
}

export type ScheduleResult = { skip: string } | { weeks: { id: string; data: WeekDoc }[] };

export function scheduleDocs(input: {
  status: unknown;
  regularWeeks: unknown;
  draft: DraftState | null;
  /** The season's group-play weeks. */
  groupWeeks?: unknown;
  /** The group-play vote's rankings, by voter. */
  rankings?: Record<string, unknown>;
  commish?: string | null;
}): ScheduleResult {
  if (input.status !== 'draft') return { skip: 'not-in-draft' };
  const draft = input.draft;
  if (!draft || draft.step !== 'done') return { skip: 'draft-not-done' };
  if (!Array.isArray(draft.order) || !Array.isArray(draft.left) || typeof draft.picks !== 'object' || draft.picks === null) return { skip: 'no-picks' };
  if (draft.left.length > 1) return { skip: 'picks-not-done' };
  const weeks = Number(input.regularWeeks);
  if (!Number.isInteger(weeks) || weeks < 1) return { skip: 'bad-settings' };

  const pairs = week1Pairs(draft);
  if (checkRivalPicks(draft.order, pairs) !== null) return { skip: 'bad-picks' };
  return {
    weeks: buildSchedule({ picks: pairs, weeks, modes: groupWeekModes(groupWeeksOf(input.groupWeeks, weeks), modeStandings(input.rankings ?? {}, input.commish ?? null)) }).map((plan) => {
      const targets: Record<string, string[]> = {};
      for (const [a, b] of plan.pairs) {
        targets[a] = [b];
        if (b !== HOUSE) targets[b] = [a];
      }
      const period = weekPeriod(plan.week);
      return { id: period, data: { week: plan.week, period, mode: plan.mode, pairs: plan.pairs.map(([a, b]) => ({ a, b })), targets } };
    }),
  };
}

/** The season's group-play weeks that can be played: after Week 1, inside the regular season. */
function groupWeeksOf(value: unknown, regularWeeks: number): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((week): week is number => Number.isInteger(week) && week >= 2 && week <= regularWeeks);
}
