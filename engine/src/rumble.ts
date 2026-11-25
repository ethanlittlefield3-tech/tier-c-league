/**
 * Rumble (SCOPE.md, "Rumble"): a 1v1 where each player gets one random item
 * a day instead of the weekly kit. The server draws the items in advance and
 * seals them; each day's are revealed when it starts. A Boot's goal is picked
 * by noon and stays hidden until the day locks.
 *
 * Items go in the order of operations: goals first (Boot, then Swap), then
 * screen time and beers (Freeze, Magnet), then points (Tornado, Punch,
 * Spike). A Rule One by either player cancels both items that day.
 */
import { scoreDay, LANES, type DayInput, type DayScore, type Lane, type RumbleEffects, type ScoreOptions } from './scoring.ts';

export const RUMBLE_ITEMS = ['tornado', 'punch', 'boot', 'spike', 'swap', 'freeze', 'magnet'] as const;
export type RumbleItem = (typeof RUMBLE_ITEMS)[number];

export const RUMBLE_NAMES: Record<RumbleItem, string> = {
  tornado: 'Tornado',
  punch: 'Punch',
  boot: 'Boot',
  spike: 'Spike',
  swap: 'Swap',
  freeze: 'Freeze',
  magnet: 'Magnet',
};

/** Each item in a line, from SCOPE.md. */
export const RUMBLE_TEXT: Record<RumbleItem, string> = {
  tornado: "Take 2 points from your opponent's day and add them to yours.",
  punch: 'If your day beats theirs, they lose 3.',
  boot: "Pick one of their goals by 12:00 pm: it scores 0 today, and they don't see which until the day locks.",
  spike: 'On a perfect day, take 1 point from them.',
  swap: 'If you missed a goal and they hit one, one of your misses becomes a hit and one of their hits a miss.',
  freeze: 'Their screen time points count double, good or bad.',
  magnet: 'Your beers count against them instead of you.',
};

export const RUMBLE_POINTS = { tornado: 2, punch: -3, spike: -1 } as const;

/** A day's items: each side's, and the goal a Boot picked on the other's day. */
export interface RumbleDayItems {
  a: RumbleItem | null;
  b: RumbleItem | null;
  aBoot?: Lane | null;
  bBoot?: Lane | null;
}

const hitLanes = (score: DayScore) => LANES.filter((lane) => score.goals[lane] === 'hit');
const missedLanes = (score: DayScore) => LANES.filter((lane) => score.goals[lane] === 'missed' || score.goals[lane] === 'voided');
/** A day's play: its points before the commish's docks. */
const play = (score: DayScore) => score.total - score.adjustmentPoints;

/** Both players' day with their items played against each other. */
export function rumbleDay(a: DayInput, b: DayInput, items: RumbleDayItems, options: ScoreOptions = {}): { a: DayScore; b: DayScore } {
  const plain = { a: scoreDay(a, options), b: scoreDay(b, options) };
  if (a.ruleOne === true || b.ruleOne === true || (items.a === null && items.b === null)) return plain;
  const fx: { a: RumbleEffects; b: RumbleEffects } = { a: {}, b: {} };
  const sides = [
    { me: 'a', them: 'b', item: items.a, boot: items.aBoot ?? null },
    { me: 'b', them: 'a', item: items.b, boot: items.bBoot ?? null },
  ] as const;
  const scored = () => ({ a: scoreDay({ ...a, rumble: fx.a }, options), b: scoreDay({ ...b, rumble: fx.b }, options) });

  // Goals: Boot first; a resting goal can't be booted.
  for (const side of sides) {
    if (side.item === 'boot' && side.boot && !(side.them === 'a' ? a : b).restDay) fx[side.them].booted = side.boot;
  }
  // Then Swap, on the goals as they stand: your first miss and their first hit, both in lane order.
  const afterBoot = scored();
  for (const side of sides) {
    if (side.item !== 'swap') continue;
    const miss = missedLanes(afterBoot[side.me])[0];
    const hit = hitLanes(afterBoot[side.them])[0];
    if (miss && hit) {
      fx[side.me].swapIn = miss;
      fx[side.them].swapOut = hit;
    }
  }
  // Screen time and beers: Freeze and Magnet.
  for (const side of sides) {
    if (side.item === 'freeze') fx[side.them].screenTimes = 2;
    if (side.item === 'magnet') {
      const beers = plain[side.me].beers;
      fx[side.me].beerShift = (fx[side.me].beerShift ?? 0) + beers;
      fx[side.them].beerShift = (fx[side.them].beerShift ?? 0) - beers;
    }
  }
  // Points, from the days as they stand now: Tornado, Punch and Spike.
  const mid = scored();
  const points = { a: [] as { item: string; points: number }[], b: [] as { item: string; points: number }[] };
  for (const side of sides) {
    if (side.item === 'tornado') {
      points[side.me].push({ item: 'tornado', points: RUMBLE_POINTS.tornado });
      points[side.them].push({ item: 'tornado', points: -RUMBLE_POINTS.tornado });
    }
    if (side.item === 'punch' && play(mid[side.me]) > play(mid[side.them])) points[side.them].push({ item: 'punch', points: RUMBLE_POINTS.punch });
    if (side.item === 'spike' && mid[side.me].perfect && !(side.them === 'a' ? a : b).restDay) points[side.them].push({ item: 'spike', points: RUMBLE_POINTS.spike });
  }
  fx.a.points = points.a;
  fx.b.points = points.b;
  return scored();
}
