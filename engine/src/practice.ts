/**
 * The practice week (the commish's request, 2026-11-28): before a season
 * starts, the commish can run one practice week inside the league, each day a
 * few minutes long, so everyone tries the whole game with nothing at stake.
 *
 * It is a season of its own, `practice`, beside the real one: the same
 * screens, rules and jobs, on a fast clock. Nothing in it counts for Season
 * Points, ranks, badges, rivalries or trophies, and it clears itself once its
 * results have been up for a while.
 */
import { defaultBounty, type BountyTarget } from './group.ts';
import { GROUP_MODES, type GroupMode } from './modes.ts';
import { HOUSE, isPairedMode } from './schedule.ts';

/** The practice week's season id, beside the real season's. */
export const PRACTICE_SEASON = 'practice';

/** How long each practice day can last, in minutes. */
export const PRACTICE_DAY_MINUTES = { min: 2, max: 30, standard: 4 } as const;

/** How far ahead the commish can start it, in minutes. GitHub's job needs up to about 10 to wake. */
export const PRACTICE_LEADS = [10, 15, 30, 60] as const;

/** How long the results stay up once they are final, before practice clears itself. */
export const PRACTICE_RESULTS_MINUTES = 30;

/** Stand-in goals for anyone the draft hasn't set goals for yet: each one doable in a practice day. */
export const PRACTICE_GOALS = { mind: 'Read a page of anything', body: '10 push-ups or squats', wildcard: 'Drink a glass of water' } as const;

/** From its start to final results: seven days, then the day after Sunday's lock, when receipts close. */
export function practiceLength(dayMinutes: number): number {
  return 8 * dayMinutes * 60_000;
}

/**
 * Whether a practice week can run: with no season yet, a season in setup, or
 * a drafted season before its first day starts, and over before the draft or
 * kickoff comes round. Never during the draft or the offseason.
 */
export function practiceWindow(input: {
  season: { status: string; draftAt: number | null } | null;
  /** When the season's first day starts, once its calendar is written. */
  kickoffStart: number | null;
  startsAt: number;
  dayMinutes: number;
  now: number;
}): { ok: true } | { ok: false; reason: string } {
  const { min, max } = PRACTICE_DAY_MINUTES;
  if (!Number.isInteger(input.dayMinutes) || input.dayMinutes < min || input.dayMinutes > max) return { ok: false, reason: `Each practice day lasts ${min} to ${max} minutes.` };
  if (input.startsAt <= input.now) return { ok: false, reason: 'Pick a start time ahead.' };
  const end = input.startsAt + practiceLength(input.dayMinutes);
  const season = input.season;
  if (season) {
    if (season.status === 'draft') return { ok: false, reason: 'The draft is on. Practice can run before it starts, or after it, before kickoff.' };
    if (season.status === 'finished') return { ok: false, reason: 'Practice is for before a season: start the next season first.' };
    if (season.status === 'active' && (input.kickoffStart === null || input.now >= input.kickoffStart)) return { ok: false, reason: 'The season has started. Practice is only before kickoff.' };
    if (season.status === 'setup' && season.draftAt !== null && season.draftAt > input.now && end > season.draftAt) {
      return { ok: false, reason: 'It would run into the draft. Start it sooner, or make the days shorter.' };
    }
  }
  if (input.kickoffStart !== null && end > input.kickoffStart) return { ok: false, reason: 'It would run into kickoff. Start it sooner, or make the days shorter.' };
  return { ok: true };
}

/** Practice matchups: the players in the order given (shuffled by the caller), paired off. The odd one out faces The House. */
export function practicePairs(order: readonly string[]): { a: string; b: string }[] {
  const pairs: { a: string; b: string }[] = [];
  for (let at = 0; at < order.length; at += 2) pairs.push({ a: order[at]!, b: order[at + 1] ?? HOUSE });
  return pairs;
}

/** A practice week can be a regular 1v1 week or any of the six group-play modes (the commish's request, 2026-11-28). */
export type PracticeMode = 'regular' | GroupMode;
export const PRACTICE_MODES: readonly PracticeMode[] = ['regular', ...GROUP_MODES];

/**
 * A practice week's matchups, for its mode, from everyone in the order given
 * (shuffled by the caller): 1v1 pairs for a regular week, Rumble and Drop
 * Shot; blue and orange for Team Week, alternating down the order; everyone
 * on the roster for 2v2 (whose duos the weekly job draws when the week
 * starts), Bounty Week (with the league-wide target) and the Alley.
 */
export function practiceWeek(mode: PracticeMode, order: readonly string[]): {
  pairs: { a: string; b: string }[];
  targets: Record<string, string[]>;
  teams?: { blue: string[]; orange: string[] };
  roster?: string[];
  bounty?: BountyTarget;
} {
  if (isPairedMode(mode)) {
    const pairs = practicePairs(order);
    const targets: Record<string, string[]> = {};
    for (const { a, b } of pairs) {
      targets[a] = [b];
      if (b !== HOUSE) targets[b] = [a];
    }
    return { pairs, targets };
  }
  if (mode === 'teamWeek') {
    const blue = order.filter((_, at) => at % 2 === 0);
    const orange = order.filter((_, at) => at % 2 === 1);
    const targets: Record<string, string[]> = {};
    for (const player of blue) targets[player] = [...orange];
    for (const player of orange) targets[player] = [...blue];
    return { pairs: [], teams: { blue, orange }, targets };
  }
  return { pairs: [], roster: [...order], targets: {}, ...(mode === 'bounty' ? { bounty: defaultBounty(order.length) } : {}) };
}
