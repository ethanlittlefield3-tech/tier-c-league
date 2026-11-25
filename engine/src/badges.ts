/**
 * Who has earned which badge (SCOPE.md, "Garage and achievements"). Pure:
 * the weekly job gathers a player's finished days and weeks, across every
 * season, and this decides. A badge, once earned, is kept: the job adds new
 * ones and never takes any away.
 *
 * Badges from features still to come (group play, predictions, rematches
 * and playoffs) are never earned here yet.
 */
import type { StreakMark } from './streaks.ts';

/** One finished day of a player's, in order. */
export interface BadgeDay {
  season: string;
  period: string;
  date: string;
  /** 0 for Monday through 6 for Sunday. */
  dayIndex: number;
  rest: boolean;
  /** Something was logged. */
  logged: boolean;
  /** For check-in streaks: in, out, or skipped (a blank rest day, a no-show covered by Rule One). */
  mark: StreakMark;
  noShow: boolean;
  ruleOne: boolean;
  perfect: boolean;
  /** Goals marked hit and standing. */
  hit: { mind: boolean; body: boolean; wildcard: boolean };
  screenMinutes: number | null;
  beers: number;
  total: number;
  aerial: boolean;
  /** Demolitions aimed at this day that Full Boost blocked. */
  blocked: number;
  /** First logged before 9 am that same day. */
  early: boolean;
}

/** One finished week of a player's, in order. */
export interface BadgeWeek {
  season: string;
  period: string;
  /** The opponent, or `null` against The House. */
  opponent: string | null;
  outcome: 'win' | 'draw' | 'loss';
  /** Points minus the opponent's. */
  margin: number;
  /** Behind on points once Thursday locked. */
  trailedThursday: boolean;
  /** The opponent led the standings going into the week. */
  beatLeader: boolean;
  mvp: boolean;
  bust: boolean;
  /** This player's Demolitions that landed this week. */
  demolitionsLanded: number;
}

export interface BadgeFacts {
  days: BadgeDay[];
  weeks: BadgeWeek[];
  /** Seasons whose regular weeks are all final, with this player's share of them. */
  finishedSeasons: { id: string; mostBeers: boolean }[];
  /** Seasons this player ran as commish, with at least one week final. */
  commishSeasons: number;
  tauntsSent: number;
  /** Each brag's reactions from others. */
  bragReactions: number[];
  reactionsReceived: number;
  daresCompleted: number;
  reachedGrandChamp: boolean;
  /** Rematch challenges won this season. */
  rematchesWon?: number;
}

/** The longest run of entries that pass, with `skip` entries neither counting nor breaking it. */
function longestRun<T>(items: readonly T[], test: (item: T) => boolean | 'skip'): number {
  let run = 0;
  let best = 0;
  for (const item of items) {
    const verdict = test(item);
    if (verdict === 'skip') continue;
    run = verdict ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** The days of each week, in order. */
function byWeek(days: readonly BadgeDay[]): BadgeDay[][] {
  const weeks = new Map<string, BadgeDay[]>();
  for (const day of days) {
    const key = `${day.season}/${day.period}`;
    weeks.set(key, [...(weeks.get(key) ?? []), day]);
  }
  return [...weeks.values()];
}

const LANES = ['mind', 'body', 'wildcard'] as const;

export function earnedBadges(facts: BadgeFacts): string[] {
  const earned = new Set<string>();
  const earn = (id: string, when: boolean) => {
    if (when) earned.add(id);
  };
  const { days, weeks } = facts;
  const fullWeeks = byWeek(days).filter((week) => week.length === 7);
  const goalDays = (week: BadgeDay[]) => week.filter((day) => !day.rest);
  const sixGoalDays = (week: BadgeDay[]) => goalDays(week).length === 6;

  // Streaks
  earn('hatTrick', longestRun(days, (day) => (day.rest ? 'skip' : day.perfect)) >= 3);
  earn('perfectWeek', fullWeeks.some((week) => sixGoalDays(week) && goalDays(week).every((day) => day.perfect)));
  const checkIns = longestRun(days, (day) => (day.mark === 'skip' ? 'skip' : day.mark === 'in'));
  earn('ironStreak', checkIns >= 30);
  earn('century', checkIns >= 100);
  earn('earlyBird', longestRun(days, (day) => day.early) >= 7);
  earn('cleanSheet', fullWeeks.some((week) => week.every((day) => !day.noShow && !day.ruleOne && day.screenMinutes !== null)));

  // Lanes
  const laneWeek = (lane: (typeof LANES)[number]) => fullWeeks.some((week) => sixGoalDays(week) && goalDays(week).every((day) => day.hit[lane]));
  earn('scholar', laneWeek('mind'));
  earn('gymRat', laneWeek('body'));
  earn('wildOne', laneWeek('wildcard'));
  earn('tripleThreat', longestRun(fullWeeks, (week) => LANES.every((lane) => week.filter((day) => day.hit[lane]).length >= 5)) >= 3);

  // Screen time
  earn('ghost', longestRun(days, (day) => day.screenMinutes !== null && day.screenMinutes < 60) >= 7);
  earn('touchGrass', days.some((day) => day.screenMinutes !== null && day.screenMinutes < 30));
  earn('monkMode', days.some((day) => day.screenMinutes === 0));
  const averages = fullWeeks.map((week) => {
    const logged = week.filter((day) => day.screenMinutes !== null).map((day) => day.screenMinutes!);
    return logged.length ? logged.reduce((sum, minutes) => sum + minutes, 0) / logged.length : null;
  });
  let falling = 0;
  for (let index = 1; index < averages.length; index += 1) {
    const [before, now] = [averages[index - 1], averages[index]];
    falling = before !== null && before !== undefined && now !== null && now !== undefined && now < before ? falling + 1 : 0;
    if (falling >= 3) earned.add('recoveringAddict');
  }

  // Beers: a dry week needs every day logged, or a week nobody logged would count.
  const dry = (week: BadgeDay[]) => week.every((day) => day.logged && day.beers === 0);
  earn('dryWeek', fullWeeks.some(dry));
  earn('dryMonth', longestRun(fullWeeks, dry) >= 4);
  earn(
    'designatedDriver',
    fullWeeks.some((week) => {
      const friday = week.find((day) => day.dayIndex === 4);
      const saturday = week.find((day) => day.dayIndex === 5);
      return Boolean(friday?.logged && saturday?.logged && friday.beers === 0 && saturday.beers === 0);
    }),
  );
  earn('brewmaster', facts.finishedSeasons.some((season) => season.mostBeers));
  earn('happyHour', fullWeeks.some((week) => week.reduce((sum, day) => sum + day.beers, 0) >= 10));

  // Matchups: 1v1 means against a player, not The House.
  const duels = weeks.filter((week) => week.opponent !== null);
  const wins = duels.filter((week) => week.outcome === 'win');
  earn('firstBlood', wins.length > 0);
  earn('winStreak', longestRun(duels, (week) => week.outcome === 'win') >= 4);
  earn(
    'sweep',
    facts.finishedSeasons.some((season) => {
      const theirs = duels.filter((week) => week.season === season.id);
      return theirs.length > 0 && theirs.every((week) => week.outcome === 'win');
    }),
  );
  earn('comeback', wins.some((week) => week.trailedThursday));
  earn('blowout', wins.some((week) => week.margin >= 20));
  earn('photoFinish', wins.some((week) => week.margin === 1));
  earn('giantKiller', wins.some((week) => week.beatLeader));
  const winsOver = new Map<string, number>();
  for (const week of wins) winsOver.set(week.opponent!, (winsOver.get(week.opponent!) ?? 0) + 1);
  earn('rivalryKing', [...winsOver.values()].some((count) => count >= 5));
  earn('payback', (facts.rematchesWon ?? 0) >= 1);

  // Power-ups
  earn('demolisher', weeks.reduce((sum, week) => sum + week.demolitionsLanded, 0) >= 3);
  earn('untouchable', days.some((day) => day.blocked > 0));
  earn('airMail', days.some((day) => day.aerial && day.total >= 10));
  // Any week won counts here, The House's included.
  earn('clutch', weeks.some((week) => week.outcome === 'win' && days.some((day) => day.season === week.season && day.period === week.period && day.ruleOne)));

  // Social
  earn('trashTalker', facts.tauntsSent >= 50);
  earn('showOff', facts.bragReactions.filter((count) => count >= 3).length >= 10);
  earn('fanFavorite', facts.reactionsReceived >= 100);

  // Season and career
  const seasons = new Set(weeks.map((week) => week.season));
  earn('foundingMember', seasons.has('s1'));
  earn('veteran', seasons.size >= 3);
  const perSeason = (count: (week: BadgeWeek) => boolean) => [...seasons].some((season) => weeks.filter((week) => week.season === season && count(week)).length >= 3);
  earn('mvpMagnet', perSeason((week) => week.mvp));
  earn('bustCollector', perSeason((week) => week.bust));
  earn('wheelSurvivor', facts.daresCompleted >= 3);
  earn('grandChamp', facts.reachedGrandChamp);
  earn('commish', facts.commishSeasons > 0);

  return [...earned].sort();
}
