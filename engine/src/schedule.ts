/**
 * The season schedule.
 *
 * Week 1 comes from the draft's rival picks. After that a round-robin means
 * everyone meets everyone before any repeat. It uses the "circle method":
 * seat the players around a table, pair off the seats facing each other, then
 * keep one seat fixed and rotate everyone else one place each round. Seating
 * the Week 1 rivals facing each other makes the draft picks round 1.
 */

/** The bye opponent. With an odd count, one player a week faces The House. */
export const HOUSE = 'HOUSE';

/**
 * The opponent of a group-play result that wasn't a 1v1: a Team Week squad,
 * a 2v2 duo, the Bounty or the Alley. The result says which.
 */
export const GROUP = 'GROUP';

/** A result was a 1v1 against a real player: the only kind that counts head-to-head or in a rivalry. */
export function againstPlayer(opponent: string): boolean {
  return opponent !== HOUSE && opponent !== GROUP;
}

export type Pair = readonly [string, string];

export const WEEK_MODES = [
  'regular',
  'rumble',
  'teamWeek',
  'twoVTwo',
  'bounty',
  'dropShot',
  'alley',
] as const;
export type WeekMode = (typeof WEEK_MODES)[number];

/** Modes played as 1v1s. Rumble and Drop Shot use the next round-robin pairing. */
export const PAIRED_MODES: readonly WeekMode[] = ['regular', 'rumble', 'dropShot'];

export function isPairedMode(mode: WeekMode): boolean {
  return PAIRED_MODES.includes(mode);
}

/** Why a set of rival picks can't be used, or `null` when it is fine. */
export function checkRivalPicks(players: readonly string[], picks: readonly Pair[]): string | null {
  if (players.length < 2) return 'A league needs at least 2 players.';
  if (players.includes(HOUSE)) return `"${HOUSE}" is reserved for the bye opponent.`;
  if (new Set(players).size !== players.length) return 'A player is listed twice.';
  const odd = players.length % 2 === 1;
  const seen = new Set<string>();
  for (const [index, [a, b]] of picks.entries()) {
    if (a === b) return `${a} cannot face themselves.`;
    for (const who of [a, b]) {
      if (who === HOUSE) {
        if (!odd) return 'The House only plays when the player count is odd.';
        if (index !== picks.length - 1) return 'The House faces the last player left, so it must be the last pick.';
      } else if (!players.includes(who)) {
        return `${who} is not in this league.`;
      }
      if (seen.has(who)) return `${who} is in two matchups.`;
      seen.add(who);
    }
  }
  for (const player of players) {
    if (!seen.has(player)) return `${player} has no Week 1 opponent.`;
  }
  if (odd && !seen.has(HOUSE)) return 'With an odd count, the last player faces The House.';
  return null;
}

/** Seat the Week 1 rivals facing each other: pick k sits at seats k and (last - k). */
export function circleOrder(picks: readonly Pair[]): string[] {
  const seats = new Array<string>(picks.length * 2);
  for (const [k, [a, b]] of picks.entries()) {
    seats[k] = a;
    seats[seats.length - 1 - k] = b;
  }
  return seats;
}

/** The matchups for a round, counted from 0. After a full round-robin the cycle starts over. */
export function roundPairs(order: readonly string[], round: number): Pair[] {
  const n = order.length;
  if (n < 2 || n % 2 === 1) throw new RangeError('The circle needs an even number of seats.');
  const moving = n - 1;
  const seatAt = (i: number): string => {
    if (i === 0) return order[0] as string;
    const from = (((i - 1 - round) % moving) + moving) % moving;
    return order[1 + from] as string;
  };
  const pairs: Pair[] = [];
  for (let i = 0; i < n / 2; i += 1) {
    const a = seatAt(i);
    const b = seatAt(n - 1 - i);
    // Keep The House on the right so a bye always reads "player vs The House".
    pairs.push(a === HOUSE ? [b, a] : [a, b]);
  }
  return pairs;
}

export interface WeekPlan {
  week: number;
  mode: WeekMode;
  /** Which round-robin round this week uses, or `null` when the mode has its own format. */
  round: number | null;
  pairs: Pair[];
}

export interface ScheduleInput {
  /** Week 1 matchups in draft order. With an odd count the last one is [player, HOUSE]. */
  picks: readonly Pair[];
  /** Regular-season weeks. */
  weeks: number;
  /** Group-play weeks and their modes. Any week not listed is a regular 1v1. */
  modes?: Readonly<Record<number, WeekMode>>;
}

export function buildSchedule({ picks, weeks, modes = {} }: ScheduleInput): WeekPlan[] {
  if (picks.length === 0) throw new RangeError('The schedule needs at least one Week 1 matchup.');
  if ((modes[1] ?? 'regular') !== 'regular') {
    throw new RangeError('Week 1 is always a regular 1v1 from the rival picks.');
  }
  const order = circleOrder(picks);
  const plan: WeekPlan[] = [];
  let round = 0;
  for (let week = 1; week <= weeks; week += 1) {
    const mode = modes[week] ?? 'regular';
    if (isPairedMode(mode)) {
      plan.push({ week, mode, round, pairs: roundPairs(order, round) });
      round += 1;
    } else {
      // Team Week, 2v2, Bounty Week and Alley pause the round-robin.
      plan.push({ week, mode, round: null, pairs: [] });
    }
  }
  return plan;
}

/** Who a player faces in a week: a player id, HOUSE, or `null` when the week has no 1v1. */
export function opponentOf(plan: WeekPlan, player: string): string | null {
  for (const [a, b] of plan.pairs) {
    if (a === player) return b;
    if (b === player) return a;
  }
  return null;
}
