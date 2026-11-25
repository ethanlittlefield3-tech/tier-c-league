/**
 * Daily scoring: one day, one player.
 *
 * This is the only place a day's points are worked out. The app calls it for
 * live scores and the jobs call it for official results, so the two can never
 * disagree (PHASE1.md, non-negotiable 4).
 *
 * Order of operations (SCOPE.md, "Daily order of operations"):
 *   1. Rule One: the day's play is 0 and nothing in steps 2 to 5 applies.
 *   2. No-show: the base is -5, and every goal counts as missed.
 *   3. Otherwise the base is goals hit + screen time points - beers.
 *   4. Aerial doubles the base.
 *   5. Each Demolition that lands costs 2, and Rumble's point items apply.
 *   6. Docks and corrections come last and are never doubled.
 *      They also survive Rule One (commish ruling, 2026-11-25).
 */

export const LANES = ['mind', 'body', 'wildcard'] as const;
export type Lane = (typeof LANES)[number];

export const SQUARES = ['screen', 'mind', 'body', 'wildcard'] as const;
export type Square = (typeof SQUARES)[number];

/** Every number in the rulebook, in one place. */
export const RULES = {
  goalPoints: 1,
  beerPoints: -1,
  screenNotLogged: -3,
  noShow: -5,
  demolition: -2,
  receiptPenalty: -1,
  winBonus: 5,
  drawBonus: 2,
  /** Team Week and 2v2: each player on the winning side. */
  sideBonus: 3,
  /** Bounty Week: everyone, when the target is hit. */
  bountyBonus: 3,
  /** Dry Day, a holiday event: a logged day with 0 beers. */
  dryDay: 2,
  /** Alley: 1st, 2nd and 3rd place. */
  alleyBonus: [5, 3, 1],
  /** Alley: a goal day with no goals hit costs race points, never Season Points. */
  alleyWall: -2,
  /** Drop Shot: tiles on each floor, hits to break a tile, and the most hits a day can land. */
  dropShotTiles: 20,
  dropShotHitsPerTile: 2,
  dropShotDailyHits: 4,
  dareDodger: -3,
  parMin: 1,
  parMax: 6,
  parDefault: 3,
  beersMax: 30,
  screenMaxMinutes: 1440,
  screenStepMinutes: 15,
  receiptsPerWeek: 3,
} as const;

export function isValidPar(par: number): boolean {
  return Number.isInteger(par) && par >= RULES.parMin && par <= RULES.parMax;
}

export function isValidBeers(beers: number): boolean {
  return Number.isInteger(beers) && beers >= 0 && beers <= RULES.beersMax;
}

export function isValidScreenMinutes(minutes: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes >= 0 &&
    minutes <= RULES.screenMaxMinutes &&
    minutes % RULES.screenStepMinutes === 0
  );
}

/** Par minus one point for each full hour. `null` means not logged: -3 in place of the scale. */
export function screenPoints(minutes: number | null, par: number): number {
  if (minutes === null) return RULES.screenNotLogged;
  return par - Math.floor(minutes / 60);
}

/** What a player logged for one day. Mirrors the `days/{player_day}` document. */
export interface DayLog {
  /** `true` means the player tapped the goal as hit. */
  goals: Readonly<Partial<Record<Lane, boolean>>>;
  /** Unproductive minutes, or `null` while screen time is not logged. */
  screenMinutes: number | null;
  beers: number;
}

/** Whether the log holds anything at all. An empty log is the same as no log. */
export function hasAnythingLogged(log: DayLog | null | undefined): boolean {
  if (!log) return false;
  if (log.screenMinutes !== null) return true;
  if (log.beers > 0) return true;
  return LANES.some((lane) => log.goals[lane] === true);
}

/**
 * Holiday events (SCOPE.md, "Holiday events"), which the commish puts on a
 * regular-season day: Double Points Day, Dry Day (+2 for 0 beers) and Holiday
 * Pass (a no-show scores 0, not -5).
 */
export const HOLIDAY_EVENTS = ['double', 'dry', 'pass'] as const;
export type HolidayEvent = (typeof HOLIDAY_EVENTS)[number];

/** A calendar day's event, or `null` for anything that isn't one. */
export function holidayOf(value: unknown): HolidayEvent | null {
  return (HOLIDAY_EVENTS as readonly unknown[]).includes(value) ? (value as HolidayEvent) : null;
}

export interface DayInput {
  /** The season's screen time par, 1 to 6. */
  par: number;
  log: DayLog | null;
  /** This is the player's rest day: goals take the day off. */
  restDay?: boolean;
  /**
   * The lane this week's Full Boost was used on, if it was used on this day.
   * In a playoff semifinal the #1 seed has a second, so it can be a list.
   */
  fullBoost?: Lane | readonly Lane[] | null;
  aerial?: boolean;
  ruleOne?: boolean;
  /** Lanes that opponents aimed a Demolition at on this day. */
  demolitions?: readonly Lane[];
  /**
   * Squares that no longer count: a failed receipt, a receipt the player
   * backed down from, or a commish void. A voided goal counts as missed and
   * voided screen time counts as not logged.
   */
  voided?: readonly Square[];
  /** Docks (negative) and commish corrections. Applied last, never doubled. */
  adjustments?: readonly number[];
  /** Rumble's items on this day, worked out for both players by `rumbleDay`. */
  rumble?: RumbleEffects;
  /** The day's holiday event, if the commish scheduled one. */
  event?: HolidayEvent | null;
}

/**
 * What Rumble's items do to one player's day (SCOPE.md, "Rumble"), in the
 * order of operations: goals (Boot, Swap) and screen time and beers (Freeze,
 * Magnet) in step 3, then points (Tornado, Punch, Spike) in step 5.
 */
export interface RumbleEffects {
  /** A goal a Boot picked: it scores 0 that day. */
  booted?: Lane | null;
  /** A missed goal a Swap turned into a hit, and a hit it turned into a miss. */
  swapIn?: Lane | null;
  swapOut?: Lane | null;
  /** Freeze: screen time points count this many times. */
  screenTimes?: number;
  /** Magnet: beer points moved onto this day (negative) or off it (positive). */
  beerShift?: number;
  /** Points items gave or took. */
  points?: readonly { item: string; points: number }[];
}

/**
 * - `played`: something was logged.
 * - `noShow`: nothing was logged on a goal day.
 * - `restNoLog`: nothing was logged on a rest day (-3, not -5).
 * - `ruleOne`: the grace day was used.
 * - `open`: nothing logged yet on a day that has not locked (live scoring only).
 */
export type DayKind = 'played' | 'noShow' | 'restNoLog' | 'ruleOne' | 'open';
/** `booted`, `swappedIn` and `swappedOut` are Rumble's: a booted goal scores 0, and Swap moves one hit across. */
export type GoalState = 'hit' | 'boosted' | 'missed' | 'voided' | 'rest' | 'booted' | 'swappedIn' | 'swappedOut';
export type ScreenState = 'logged' | 'notLogged' | 'voided' | 'pending';
/** The feed shows `fizzled` and `ruleOne` as "Blocked", with the reason. */
export type DemolitionOutcome = 'landed' | 'missed' | 'blocked' | 'fizzled' | 'ruleOne';

export interface DayScore {
  /** The day's points after every step. */
  total: number;
  kind: DayKind;
  restDay: boolean;
  goals: Record<Lane, GoalState>;
  goalPoints: number;
  screen: { state: ScreenState; minutes: number | null; points: number };
  /** Beers logged. They count for tiebreaks even when the day scores 0. */
  beers: number;
  beerPoints: number;
  /**
   * Step 2 or 3. On `noShow` and `ruleOne` days this is the rule's fixed
   * value, and the goal, screen and beer parts only describe what was logged.
   */
  base: number;
  aerial: 'none' | 'doubled' | 'cancelled';
  /** What doubling added. Negative when the base was negative. */
  aerialPoints: number;
  demolitions: { lane: Lane; outcome: DemolitionOutcome }[];
  demolitionPoints: number;
  /** Rumble: points items gave or took, step 5; and beer points a Magnet moved, part of the base. */
  rumble: { item: string; points: number }[];
  rumblePoints: number;
  beerShift: number;
  adjustmentPoints: number;
  /**
   * The day's holiday event and what it changed: Double Points Day's doubling,
   * Dry Day's +2 (before an Aerial), or the points a Holiday Pass saved.
   */
  event: { kind: HolidayEvent; points: number } | null;
  perfect: boolean;
  /** Something was logged, so the day counts toward a check-in streak. */
  checkedIn: boolean;
}

export interface ScoreOptions {
  /**
   * The day has not locked yet. Missing entries are still pending, so they
   * show 0 so far in place of the -5 and -3 that land at the lock.
   */
  open?: boolean;
}

function sum(values: readonly number[] | undefined): number {
  let total = 0;
  for (const value of values ?? []) total += value;
  return total;
}

export function scoreDay(input: DayInput, options: ScoreOptions = {}): DayScore {
  const open = options.open === true;
  const restDay = input.restDay === true;
  const log = input.log ?? null;
  const voided = new Set<Square>(input.voided ?? []);
  // Full Boost has nothing to fix on a rest day.
  const played = input.fullBoost === null || input.fullBoost === undefined ? [] : typeof input.fullBoost === 'string' ? [input.fullBoost] : [...input.fullBoost];
  const boosts = new Set<Lane>(restDay ? [] : played);
  const checkedIn = hasAnythingLogged(log) || played.length > 0;
  const beers = log?.beers ?? 0;
  const adjustmentPoints = sum(input.adjustments);

  const rumble = input.rumble ?? {};
  const goals = {} as Record<Lane, GoalState>;
  let goalPoints = 0;
  for (const lane of LANES) {
    const tapped = log?.goals[lane] === true;
    let state: GoalState;
    if (restDay) state = 'rest';
    else if (rumble.booted === lane) state = 'booted';
    else if (tapped && !voided.has(lane)) state = rumble.swapOut === lane ? 'swappedOut' : 'hit';
    else if (boosts.has(lane)) state = 'boosted';
    else if (rumble.swapIn === lane) state = 'swappedIn';
    else if (tapped) state = 'voided';
    else state = 'missed';
    goals[lane] = state;
    if (state === 'hit' || state === 'boosted' || state === 'swappedIn') goalPoints += RULES.goalPoints;
  }

  const minutes = log?.screenMinutes ?? null;
  let screen: DayScore['screen'];
  if (minutes !== null && voided.has('screen')) {
    screen = { state: 'voided', minutes, points: RULES.screenNotLogged };
  } else if (minutes !== null) {
    screen = { state: 'logged', minutes, points: screenPoints(minutes, input.par) };
  } else if (open) {
    screen = { state: 'pending', minutes: null, points: 0 };
  } else {
    screen = { state: 'notLogged', minutes: null, points: RULES.screenNotLogged };
  }
  // Rumble's Freeze: screen time points count double, good or bad.
  if (rumble.screenTimes) screen = { ...screen, points: screen.points * rumble.screenTimes };

  const beerPoints = 0 + beers * RULES.beerPoints;
  const targets = input.demolitions ?? [];

  // Step 1. Rule One: the day's play is 0. Penalties still apply.
  if (input.ruleOne === true) {
    return {
      total: adjustmentPoints,
      kind: 'ruleOne',
      restDay,
      goals,
      goalPoints,
      screen,
      beers,
      beerPoints,
      base: 0,
      aerial: input.aerial === true ? 'cancelled' : 'none',
      aerialPoints: 0,
      demolitions: targets.map((lane) => ({ lane, outcome: 'ruleOne' as const })),
      demolitionPoints: 0,
      rumble: [],
      rumblePoints: 0,
      beerShift: 0,
      adjustmentPoints,
      event: input.event ? { kind: input.event, points: 0 } : null,
      perfect: false,
      checkedIn,
    };
  }

  // Steps 2 and 3. The base. A no-show or a blank rest day is flat: goal and
  // screen items can't change it, but Magnet's beers still land on it.
  // Holiday events: Dry Day's +2 is part of the base, and a Holiday Pass
  // makes a no-show's flat base 0.
  const beerShift = rumble.beerShift ?? 0;
  const holiday = input.event ?? null;
  let eventBase = 0;
  let kind: DayKind;
  let base: number;
  if (checkedIn) {
    kind = 'played';
    eventBase = holiday === 'dry' && beers === 0 ? RULES.dryDay : 0;
    base = goalPoints + screen.points + beerPoints + beerShift + eventBase;
  } else if (open) {
    kind = 'open';
    base = beerShift;
  } else if (restDay) {
    // Logging nothing on a rest day counts as screen time not logged.
    kind = 'restNoLog';
    eventBase = holiday === 'pass' ? -RULES.screenNotLogged : 0;
    base = RULES.screenNotLogged + eventBase + beerShift;
  } else {
    kind = 'noShow';
    eventBase = holiday === 'pass' ? -RULES.noShow : 0;
    base = RULES.noShow + eventBase + beerShift;
  }

  // Step 4. Aerial doubles the base, negatives too, and Double Points Day
  // doubles it again.
  const aerial = input.aerial === true;
  const aerialPoints = aerial ? base : 0;
  const doublePoints = holiday === 'double' ? base + aerialPoints : 0;

  // Step 5. Demolitions. A rest day makes them fizzle; Full Boost blocks.
  const demolitions = targets.map((lane) => {
    let outcome: DemolitionOutcome;
    if (restDay) outcome = 'fizzled';
    else if (goals[lane] === 'hit') outcome = 'missed';
    else if (goals[lane] === 'boosted') outcome = 'blocked';
    else outcome = 'landed';
    return { lane, outcome };
  });
  const landed = demolitions.filter((d) => d.outcome === 'landed').length;
  const demolitionPoints = 0 + landed * RULES.demolition;
  // Rumble's Tornado, Punch and Spike, never doubled.
  const items = [...(rumble.points ?? [])];
  const rumblePoints = items.reduce((total, item) => total + item.points, 0);

  const goalsAllIn = LANES.every((lane) => goals[lane] === 'hit' || goals[lane] === 'boosted' || goals[lane] === 'swappedIn');
  const perfect =
    kind === 'played' && goalsAllIn && screen.state === 'logged' && screen.points >= 0 && beers === 0;

  // Step 6. Docks and corrections last, never doubled.
  return {
    total: base + aerialPoints + doublePoints + demolitionPoints + rumblePoints + adjustmentPoints,
    kind,
    restDay,
    goals,
    goalPoints,
    screen,
    beers,
    beerPoints,
    base,
    aerial: aerial ? 'doubled' : 'none',
    aerialPoints,
    demolitions,
    demolitionPoints,
    rumble: items,
    rumblePoints,
    beerShift,
    adjustmentPoints,
    event: holiday ? { kind: holiday, points: holiday === 'double' ? doublePoints : eventBase } : null,
    perfect,
    checkedIn,
  };
}
