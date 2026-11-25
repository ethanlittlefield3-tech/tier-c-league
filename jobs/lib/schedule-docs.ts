/**
 * A season's schedule, from its finished draft (PHASE1.md, "Schedule"):
 * Week 1 from the rival picks, then a round-robin so everyone meets before
 * any repeat. With an odd count, one player a week faces The House. The
 * group-play vote's modes fill the season's group-play weeks.
 */
import { HOUSE, addDays, isDate, buildSchedule, checkRivalPicks, groupWeekModes, isPairedMode, modeStandings, week1Pairs, weekPeriod } from '../../engine/src/index.ts';

export interface DraftState {
  step: string;
  order: string[];
  picks: Record<string, string>;
  left: string[];
  /** The captains' draft's squads, when Team Week won a slot. */
  squads?: { blue: string[]; orange: string[] };
}

export interface WeekDoc {
  week: number;
  period: string;
  mode: string;
  pairs: { a: string; b: string }[];
  /**
   * Who each player may demolish: their opponent (`HOUSE` for a bye), or in
   * Team Week anyone on the other squad. 2v2's are set when its duos are
   * drawn on the Monday; the Bounty and the Alley have no Demolition.
   */
  targets: Record<string, string[]>;
  /** Team Week's squads, which hold for the season. */
  teams?: { blue: string[]; orange: string[] };
  /** Everyone in a 2v2, Bounty or Alley week: the weeks with no 1v1 pairs and no squads. */
  roster?: string[];
  /** The week's Monday: the rules close its group-play settings when that day starts. */
  monday?: string;
}

export type ScheduleResult = { skip: string } | { weeks: { id: string; data: WeekDoc }[]; modes: Record<number, string> };

export function scheduleDocs(input: {
  status: unknown;
  regularWeeks: unknown;
  draft: DraftState | null;
  /** The season's group-play weeks. */
  groupWeeks?: unknown;
  /** The group-play vote's rankings, by voter. */
  rankings?: Record<string, unknown>;
  commish?: string | null;
  /** The season's first Monday, for each week's Monday. */
  kickoff?: unknown;
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
  const plans = buildSchedule({ picks: pairs, weeks, modes: groupWeekModes(groupWeeksOf(input.groupWeeks, weeks), modeStandings(input.rankings ?? {}, input.commish ?? null)) });
  return {
    weeks: plans.map((plan) => {
      const targets: Record<string, string[]> = {};
      for (const [a, b] of plan.pairs) {
        targets[a] = [b];
        if (b !== HOUSE) targets[b] = [a];
      }
      const period = weekPeriod(plan.week);
      const teams = plan.mode === 'teamWeek' ? (draft.squads ?? splitSquads(draft.order)) : null;
      // Team Week: anyone on the other squad can be demolished.
      if (teams) {
        for (const player of teams.blue) targets[player] = [...teams.orange];
        for (const player of teams.orange) targets[player] = [...teams.blue];
      }
      const roster = !isPairedMode(plan.mode) && !teams ? [...draft.order] : null;
      const monday = typeof input.kickoff === 'string' && isDate(input.kickoff) ? { monday: addDays(input.kickoff, 7 * (plan.week - 1)) } : {};
      return { id: period, data: { week: plan.week, period, mode: plan.mode, pairs: plan.pairs.map(([a, b]) => ({ a, b })), targets, ...(teams ? { teams } : {}), ...(roster ? { roster } : {}), ...monday } };
    }),
    // The season keeps each group-play week's mode, so its calendar gets the right power-ups.
    modes: Object.fromEntries(plans.filter((plan) => plan.mode !== 'regular').map((plan) => [plan.week, plan.mode])),
  };
}

/** The season's group-play weeks that can be played: after Week 1, inside the regular season. */
function groupWeeksOf(value: unknown, regularWeeks: number): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((week): week is number => Number.isInteger(week) && week >= 2 && week <= regularWeeks);
}

/** Without a captains' draft, the squads alternate down the draft order. */
function splitSquads(order: readonly string[]): { blue: string[]; orange: string[] } {
  return { blue: order.filter((_, at) => at % 2 === 0), orange: order.filter((_, at) => at % 2 === 1) };
}
