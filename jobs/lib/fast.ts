/**
 * The fast test league (PHASE1.md, Step 4, Checkpoint D): the commish and
 * three made-up players in a season whose days last a few minutes each, so a
 * whole week of locks, reveals, settlement and the Wheel plays out in about
 * an hour. The made-up players play on their own (`bots.ts`).
 *
 * It is a demo league of its own, made only by its job, so nothing here
 * touches a real league, and the delete job removes it like any demo. The
 * fast clock only ever counts in a league marked `demo`: the calendar job and
 * the weekly job ignore it anywhere else, and the commish can't set it.
 * Nothing here makes its own randomness or reads a clock: the caller passes
 * both in.
 */
import { localDate } from '../../engine/src/calendar.ts';
import { fastCalendar, fastWeekStart, type FastClock } from '../../engine/src/fast.ts';
import { ruleOneIssueWeeks } from '../../engine/src/kit.ts';
import { calendarDocsFrom, mondayOf } from './calendar-docs.ts';
import { leagueSeed, type NewLeague, type SeedDoc } from './league-seed.ts';
import { scheduleDocs } from './schedule-docs.ts';

/** The made-up players, with their goals and dares. */
export const FAST_BOTS = [
  { name: 'Maya', goals: ['Read 20 pages', '10k steps', 'No vaping'], dare: 'Wear a cape to work for a day.' },
  { name: 'Jordan', goals: ['Study 1 hour', 'Gym', 'Cook dinner'], dare: 'Sing the anthem in the group chat.' },
  { name: 'Sam', goals: ['A course lesson', 'A run', 'Call family'], dare: 'Eat a whole lemon, on video.' },
] as const;

const COMMISH_GOALS = ['Read 10 pages', 'Stretch 15 minutes', 'Drink 2 L of water'] as const;

/** Three weeks: Week 1 is the test, and the Wheel's dare is due when Week 2 ends. */
const WEEKS = 3;

export interface FastInput {
  league: NewLeague;
  /** One id and recovery key for each made-up player. */
  bots: { id: string; key: string }[];
  now: number;
  /** How long each day lasts. */
  dayMinutes: number;
  /** How long until Monday of Week 1 starts: time to get in first. */
  leadMinutes: number;
  /** For the dates the app shows. The times all come from the fast clock. */
  timeZone: string;
}

/** Every document of the fast test league, ready to write. */
export function fastDocs(input: FastInput): SeedDoc[] {
  const { league } = input;
  const now = new Date(input.now);
  const root = `leagues/${league.id}`;
  const season = `${root}/seasons/s1`;
  // The dates are only labels: Week 1 is dated from this week's Monday.
  const kickoff = mondayOf(localDate(input.now, input.timeZone));
  const clock: FastClock = { startsAt: input.now + input.leadMinutes * 60_000, dayMinutes: input.dayMinutes };
  const players = [league.commish, ...input.bots.map((bot) => bot.id)];
  const docs: SeedDoc[] = [];

  for (const doc of leagueSeed(league, now)) {
    docs.push(doc.path === root ? { path: root, data: { ...doc.data, demo: true, joining: 'closed', season: 's1', members: Object.fromEntries(players.map((player) => [player, true])) } } : doc);
  }
  input.bots.forEach((bot, index) => {
    docs.push({ path: `${root}/players/${bot.id}`, data: { displayName: FAST_BOTS[index]?.name ?? `Player ${index + 2}`, joinedAt: now } });
    docs.push({ path: `${root}/keys/${bot.id}`, data: { key: bot.key, rotatedAt: now } });
    docs.push({ path: `${root}/lookup/${bot.key}`, data: { player: bot.id } });
  });

  docs.push({
    path: season,
    data: {
      name: 'Fast Test Season',
      status: 'active',
      regularWeeks: WEEKS,
      playoffs: 'oneWeek',
      playoffSize: 4,
      par: 3,
      groupWeeks: [],
      timeZone: input.timeZone,
      kickoff,
      draftAt: null,
      joinMidSeason: false,
      holidayEvents: false,
      updatedAt: now,
      ruleOneIssue: ruleOneIssueWeeks(WEEKS).map((week) => new Date(fastWeekStart(clock, week))),
      scheduledAt: now,
      fast: { startsAt: new Date(clock.startsAt), dayMinutes: clock.dayMinutes, bots: input.bots.map((bot) => bot.id) },
    },
  });
  for (const day of calendarDocsFrom(fastCalendar({ kickoff, regularWeeks: WEEKS, timeZone: input.timeZone }, clock))) docs.push({ path: `${season}/calendar/${day.id}`, data: day.data });

  const goalsOf = (texts: readonly string[]) => ({ goals: { mind: { text: texts[0], version: 1 }, body: { text: texts[1], version: 1 }, wildcard: { text: texts[2], version: 1 } } });
  docs.push({ path: `${season}/roster/${league.commish}`, data: goalsOf(COMMISH_GOALS) });
  input.bots.forEach((bot, index) => docs.push({ path: `${season}/roster/${bot.id}`, data: goalsOf(FAST_BOTS[index]?.goals ?? COMMISH_GOALS) }));

  // The draft, done: the commish picked the first made-up player, so they meet in Week 1.
  const picks: Record<string, string> = {};
  for (let i = 0; i + 1 < players.length; i += 2) picks[players[i]!] = players[i + 1]!;
  const left = players.length % 2 === 1 ? [players[players.length - 1]!] : [];
  docs.push({ path: `${season}/draft/state`, data: { step: 'done', order: players, left, picks, turnStartedAt: null, startedAt: now, votesCloseAt: now } });
  input.bots.forEach((bot, index) => docs.push({ path: `${season}/dares/${bot.id}`, data: { text: FAST_BOTS[index]?.dare ?? 'Post your worst photo.', version: 1 } }));

  const schedule = scheduleDocs({ status: 'draft', regularWeeks: WEEKS, draft: { step: 'done', order: players, picks, left } });
  if ('weeks' in schedule) for (const week of schedule.weeks) docs.push({ path: `${season}/weeks/${week.id}`, data: { ...week.data } });
  return docs;
}

/** The fast clock a season keeps, if it is a demo league's; `null` for every other league. */
export function fastClockOf(league: { demo?: unknown }, season: { fast?: unknown }): (FastClock & { bots: string[] }) | null {
  if (league.demo !== true) return null;
  const fast = season.fast as { startsAt?: unknown; dayMinutes?: unknown; bots?: unknown } | undefined;
  if (!fast || typeof fast.startsAt !== 'number' || typeof fast.dayMinutes !== 'number' || fast.dayMinutes <= 0) return null;
  return { startsAt: fast.startsAt, dayMinutes: fast.dayMinutes, bots: Array.isArray(fast.bots) ? fast.bots.map(String) : [] };
}
