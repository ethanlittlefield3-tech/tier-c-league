/**
 * The season trophy case (SCOPE.md, "Ranks and trophies"): each season's
 * awards, kept forever. The regular season's are worked out once its last
 * regular week is final; the playoff trophies come with the playoffs.
 */
import { checkInStreak, type StreakMark } from './streaks.ts';

export type TrophyId = 'champion' | 'finalist' | 'leader' | 'screenTimeKing' | 'ironStreak' | 'demolitionDerby' | 'brewmaster' | 'prophet' | 'mvp' | 'whiffBowl';

export interface TrophyDef {
  id: TrophyId;
  name: string;
  goesTo: string;
  /** Awarded by a feature still to come. */
  later?: 'playoffs';
}

export const TROPHIES: readonly TrophyDef[] = [
  { id: 'champion', name: 'Champion', goesTo: 'Playoff winner', later: 'playoffs' },
  { id: 'finalist', name: 'Finalist', goesTo: 'Playoff runner-up', later: 'playoffs' },
  { id: 'leader', name: 'Regular-Season Leader', goesTo: 'Most Season Points' },
  { id: 'screenTimeKing', name: 'Screen Time King', goesTo: 'Lowest average screen time' },
  { id: 'ironStreak', name: 'Iron Streak', goesTo: 'Longest check-in streak' },
  { id: 'demolitionDerby', name: 'Demolition Derby', goesTo: 'Most Demolitions landed' },
  { id: 'brewmaster', name: 'Brewmaster', goesTo: 'Most beers' },
  { id: 'prophet', name: 'Prophet', goesTo: 'Best predictions record' },
  { id: 'mvp', name: 'MVP of the Season', goesTo: 'Most weekly MVPs' },
  { id: 'whiffBowl', name: 'Whiff Bowl', goesTo: 'Consolation bracket loser', later: 'playoffs' },
];

/** A player's regular season, day by day and week by week. */
export interface TrophyPlayer {
  days: readonly { mark: StreakMark; screenMinutes: number | null; beers: number }[];
  weeks: readonly { mvp: boolean; demolitionsLanded: number }[];
}

/** Who won a trophy, ties shared, and the number that won it. */
export interface TrophyWinner {
  winners: string[];
  value: number;
}

/** Everyone tied for the most, if it is at least `least`. */
function most(values: Record<string, number>, least: number): TrophyWinner | null {
  const top = Math.max(-Infinity, ...Object.values(values));
  if (top < least) return null;
  return { winners: Object.keys(values).filter((player) => values[player] === top).sort(), value: top };
}

/** Everyone tied for the fewest. */
function fewest(values: Record<string, number>): TrophyWinner | null {
  const low = Math.min(Infinity, ...Object.values(values));
  if (low === Infinity) return null;
  return { winners: Object.keys(values).filter((player) => values[player] === low).sort(), value: low };
}

/**
 * The regular season's trophies. Regular-Season Leader is the top of the
 * final standings. Screen Time King is the lowest average screen time over
 * the days it was logged, to the minute, among players who logged it on at
 * least half the season's days. Iron Streak, Demolition Derby, Brewmaster and
 * MVP of the Season are the most of each, at least one. Prophet is the best
 * predictions record. A tie shares the trophy; nobody qualifying leaves it
 * empty.
 */
export function seasonTrophies(input: {
  leader: { player: string; points: number } | null;
  players: Record<string, TrophyPlayer>;
  prophets: { players: string[]; right: number };
}): Partial<Record<TrophyId, TrophyWinner>> {
  const out: Partial<Record<TrophyId, TrophyWinner>> = {};
  if (input.leader) out.leader = { winners: [input.leader.player], value: input.leader.points };

  const screen: Record<string, number> = {};
  const streak: Record<string, number> = {};
  const demolitions: Record<string, number> = {};
  const beers: Record<string, number> = {};
  const mvps: Record<string, number> = {};
  for (const [player, season] of Object.entries(input.players)) {
    const logged = season.days.filter((day) => day.screenMinutes !== null);
    if (season.days.length > 0 && logged.length * 2 >= season.days.length) {
      screen[player] = Math.round(logged.reduce((sum, day) => sum + day.screenMinutes!, 0) / logged.length);
    }
    streak[player] = checkInStreak(season.days.map((day) => day.mark)).best;
    demolitions[player] = season.weeks.reduce((sum, week) => sum + week.demolitionsLanded, 0);
    beers[player] = season.days.reduce((sum, day) => sum + day.beers, 0);
    mvps[player] = season.weeks.filter((week) => week.mvp).length;
  }
  const add = (id: TrophyId, winner: TrophyWinner | null) => {
    if (winner) out[id] = winner;
  };
  add('screenTimeKing', fewest(screen));
  add('ironStreak', most(streak, 1));
  add('demolitionDerby', most(demolitions, 1));
  add('brewmaster', most(beers, 1));
  add('mvp', most(mvps, 1));
  if (input.prophets.players.length > 0) out.prophet = { winners: [...input.prophets.players].sort(), value: input.prophets.right };
  return out;
}
