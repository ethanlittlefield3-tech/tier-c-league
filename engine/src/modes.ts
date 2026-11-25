/**
 * The group-play vote (SCOPE.md, "Draft day agenda", step 3): everyone ranks
 * the six modes, and the top-ranked fill the season's group-play weeks.
 */

/** The six group-play modes, in SCOPE.md's order. */
export const GROUP_MODES = ['rumble', 'teamWeek', 'twoVTwo', 'bounty', 'dropShot', 'alley'] as const;
export type GroupMode = (typeof GROUP_MODES)[number];

export const MODE_NAMES: Record<GroupMode, string> = {
  rumble: 'Rumble',
  teamWeek: 'Team Week',
  twoVTwo: '2v2',
  bounty: 'Bounty Week',
  dropShot: 'Drop Shot',
  alley: 'Alley',
};

/** Each mode in a line, from SCOPE.md's table. */
export const MODE_BLURBS: Record<GroupMode, string> = {
  rumble: '1v1 with a random item each day. Win +5, draw +2.',
  teamWeek: 'The league split in half, blue against orange. +3 each on the winning team.',
  twoVTwo: 'Duos face duos. +3 each on the winning duo.',
  bounty: 'The whole league chases one shared target. +3 for everyone if it is hit.',
  dropShot: '1v1 scored by floor tiles broken. Win +5, draw +2.',
  alley: 'The whole league races single file. 1st +5, 2nd +3, 3rd +1.',
};

/** A ranking names each of the six modes exactly once. */
export function validRanking(ranking: unknown): ranking is GroupMode[] {
  return Array.isArray(ranking) && ranking.length === GROUP_MODES.length && GROUP_MODES.every((mode) => ranking.includes(mode));
}

/**
 * The vote's standings, top first. A ranking gives its first choice 6 points,
 * down to 1 for its last, and the points are added up. A tie goes to the
 * commish's own ranking, then to SCOPE.md's order.
 */
export function modeStandings(rankings: Readonly<Record<string, unknown>>, commish: string | null): { mode: GroupMode; points: number }[] {
  const points = Object.fromEntries(GROUP_MODES.map((mode) => [mode, 0])) as Record<GroupMode, number>;
  for (const ranking of Object.values(rankings)) {
    if (!validRanking(ranking)) continue;
    ranking.forEach((mode, index) => {
      points[mode] += GROUP_MODES.length - index;
    });
  }
  const theirs = commish === null ? null : rankings[commish];
  const tieOrder: readonly GroupMode[] = validRanking(theirs) ? theirs : GROUP_MODES;
  return [...GROUP_MODES].sort((a, b) => points[b] - points[a] || tieOrder.indexOf(a) - tieOrder.indexOf(b)).map((mode) => ({ mode, points: points[mode] }));
}

/**
 * Each group-play week's mode: the top-ranked modes fill the weeks in order,
 * the top one first. With more group-play weeks than modes, the order repeats.
 */
export function groupWeekModes(weeks: readonly number[], standings: readonly { mode: GroupMode }[]): Record<number, GroupMode> {
  if (standings.length === 0) return {};
  return Object.fromEntries([...new Set(weeks)].sort((a, b) => a - b).map((week, index) => [week, standings[index % standings.length]!.mode]));
}
