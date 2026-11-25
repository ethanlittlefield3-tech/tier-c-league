/**
 * A demo league for trying every screen (PHASE1.md, Checkpoint C): the
 * commish and five made-up players, a season in its third week, the first two
 * weeks logged, goals, the schedule, dares, wall posts, power-ups and a
 * receipt waiting on the commish. The weekly job settles it right after, so
 * the standings fill in and the commish, last both weeks, spins the Wheel.
 *
 * It is a league of its own, marked `demo`, so nothing here touches a real
 * league, and the delete job only deletes a league marked `demo`. Nothing here
 * makes its own randomness or reads a clock: the caller passes both in.
 */
import { addDays, localDate, weekStart, type DateStr } from '../../engine/src/calendar.ts';
import { weekPeriod } from '../../engine/src/ids.ts';
import { ruleOneIssueWeeks } from '../../engine/src/kit.ts';
import { calendarDocs, mondayOf } from './calendar-docs.ts';
import { leagueSeed, type NewLeague, type SeedDoc } from './league-seed.ts';
import { scheduleDocs } from './schedule-docs.ts';

/** The made-up players, with their goals and dares. */
export const DEMO_PLAYERS = [
  { name: 'Maya', goals: ['Read 20 pages', '10k steps', 'No vaping'], dare: 'Wear a cape to work for a day.' },
  { name: 'Jordan', goals: ['Study 1 hour', 'Gym', 'Cook dinner'], dare: 'Sing the anthem in the group chat.' },
  { name: 'Sam', goals: ['A course lesson', 'A run', 'Call family'], dare: 'Eat a whole lemon, on video.' },
  { name: 'Riley', goals: ['Practice guitar', 'Yoga', 'Meal prep'], dare: 'Wear your shirt inside out all day.' },
  { name: 'Jo', goals: ['Duolingo lesson', 'Walk 30 minutes', 'Make the bed'], dare: 'Post your oldest selfie.' },
] as const;

const COMMISH_GOALS = ['Read 10 pages', 'Stretch 15 minutes', 'Drink 2 L of water'] as const;

export interface DemoInput {
  league: NewLeague;
  /** One id and recovery key for each made-up player. */
  fakes: { id: string; key: string }[];
  now: number;
  timeZone: string;
}

/** A day's log as the app saves it. */
function log(player: string, date: DateStr, goals: [boolean, boolean, boolean], screenMinutes: number | null, beers: number, at: Date) {
  return { player, date, goals: { mind: goals[0], body: goals[1], wildcard: goals[2] }, screenMinutes, beers, firstAt: at, updatedAt: at };
}

/** Every document of the demo league, ready to write. */
export function demoDocs(input: DemoInput): SeedDoc[] {
  const { league, now, timeZone } = input;
  const nowDate = new Date(now);
  const root = `leagues/${league.id}`;
  const season = `${root}/seasons/s1`;
  const today = localDate(now, timeZone);
  // Kickoff two Mondays ago: today is in Week 3, and Weeks 1 and 2 are logged.
  const kickoff = addDays(mondayOf(today), -14);
  const players = [league.commish, ...input.fakes.map((fake) => fake.id)];
  const docs: SeedDoc[] = [];

  // The league: the commish's own recipe, then the made-up players.
  for (const doc of leagueSeed(league, nowDate)) {
    if (doc.path === root) {
      docs.push({ path: root, data: { ...doc.data, demo: true, joining: 'closed', season: 's1', members: Object.fromEntries(players.map((player) => [player, true])) } });
    } else {
      docs.push(doc);
    }
  }
  input.fakes.forEach((fake, index) => {
    docs.push({ path: `${root}/players/${fake.id}`, data: { displayName: DEMO_PLAYERS[index]?.name ?? `Player ${index + 2}`, joinedAt: nowDate } });
    docs.push({ path: `${root}/keys/${fake.id}`, data: { key: fake.key, rotatedAt: nowDate } });
    docs.push({ path: `${root}/lookup/${fake.key}`, data: { player: fake.id } });
  });

  // The season, its calendar, and every player's goals.
  docs.push({
    path: season,
    data: {
      name: 'Demo Season',
      status: 'active',
      regularWeeks: 6,
      playoffs: 'oneWeek',
      playoffSize: 4,
      par: 3,
      groupWeeks: [3, 5],
      timeZone,
      kickoff,
      draftAt: null,
      joinMidSeason: false,
      holidayEvents: true,
      updatedAt: nowDate,
      ruleOneIssue: ruleOneIssueWeeks(6).map((week) => new Date(weekStart(kickoff, week, timeZone))),
      scheduledAt: nowDate,
    },
  });
  for (const day of calendarDocs({ kickoff, regularWeeks: 6, timeZone })) docs.push({ path: `${season}/calendar/${day.id}`, data: day.data });
  const goalsOf = (texts: readonly string[]) => ({ goals: { mind: { text: texts[0], version: 1 }, body: { text: texts[1], version: 1 }, wildcard: { text: texts[2], version: 1 } } });
  docs.push({ path: `${season}/roster/${league.commish}`, data: goalsOf(COMMISH_GOALS) });
  input.fakes.forEach((fake, index) => docs.push({ path: `${season}/roster/${fake.id}`, data: goalsOf(DEMO_PLAYERS[index]?.goals ?? COMMISH_GOALS) }));

  // The draft, long done: the order, the rival picks, the dares, and votes long closed.
  const picks: Record<string, string> = {};
  for (let i = 0; i + 1 < players.length; i += 2) picks[players[i]!] = players[i + 1]!;
  const left = players.length % 2 === 1 ? [players[players.length - 1]!] : [];
  const week1Monday = new Date(weekStart(kickoff, 1, timeZone));
  docs.push({ path: `${season}/draft/state`, data: { step: 'done', order: players, left, picks, turnStartedAt: null, startedAt: week1Monday, votesCloseAt: week1Monday } });
  input.fakes.forEach((fake, index) => docs.push({ path: `${season}/dares/${fake.id}`, data: { text: DEMO_PLAYERS[index]?.dare ?? 'Post your worst photo.', version: 1 } }));

  // The schedule, as the schedule job makes it.
  const schedule = scheduleDocs({ status: 'draft', regularWeeks: 6, draft: { step: 'done', order: players, picks, left } });
  if ('weeks' in schedule) for (const week of schedule.weeks) docs.push({ path: `${season}/weeks/${week.id}`, data: { ...week.data } });

  // Logs: every day before today. The made-up players do well; the commish
  // does badly in Weeks 1 and 2, so the commish spins the Wheel.
  const at = (date: DateStr) => new Date(weekStart(kickoff, 1, timeZone) + (Date.UTC(...(date.split('-').map(Number) as [number, number, number])) - Date.UTC(...(kickoff.split('-').map(Number) as [number, number, number]))) + 20 * 3_600_000);
  for (let offset = 0; addDays(kickoff, offset) < today; offset += 1) {
    const date = addDays(kickoff, offset);
    const weekday = offset % 7;
    const rest = weekday === 6;
    input.fakes.forEach((fake, i) => {
      const goals: [boolean, boolean, boolean] = rest ? [false, false, false] : [(offset + i) % 3 !== 0, (offset + 2 * i) % 4 !== 0, (offset + i) % 2 === 0];
      docs.push({ path: `${season}/days/${fake.id}_${date}`, data: log(fake.id, date, goals, 45 + 15 * ((offset + i) % 6), (offset + i) % 4 === 0 ? 1 : 0, at(date)) });
    });
    const commishGoals: [boolean, boolean, boolean] = rest ? [false, false, false] : [false, offset % 3 === 0, false];
    docs.push({ path: `${season}/days/${league.commish}_${date}`, data: log(league.commish, date, commishGoals, 195, 1, at(date)) });
  }
  // Today, so far: Maya has already logged.
  if (input.fakes[0]) docs.push({ path: `${season}/days/${input.fakes[0].id}_${today}`, data: log(input.fakes[0].id, today, [true, false, true], 60, 0, new Date(now - 2 * 3_600_000)) });

  // Yesterday the commish claimed their Body goal, and Maya wants receipts on it.
  const yesterday = addDays(today, -1);
  docs.push({ path: `${season}/days/${league.commish}_${yesterday}`, data: log(league.commish, yesterday, [true, true, false], 120, 0, at(yesterday)) });
  if (input.fakes[0]) {
    const period = weekPeriod(Math.floor((Date.UTC(...(yesterday.split('-').map(Number) as [number, number, number])) - Date.UTC(...(kickoff.split('-').map(Number) as [number, number, number]))) / (7 * 24 * 3_600_000)) + 1);
    const id = `${league.commish}_${yesterday}_body`;
    docs.push({
      path: `${season}/receipts/${id}`,
      data: { target: league.commish, date: yesterday, square: 'body', by: input.fakes[0].id, slot: `${period}_${input.fakes[0].id}_1`, requestedAt: new Date(now - 3_600_000), deadline: new Date(now + 8 * 3_600_000), proofAt: null, backedDownAt: null },
    });
    docs.push({ path: `${season}/receiptSlots/${period}_${input.fakes[0].id}_1`, data: { receipt: id } });
  }

  // Power-ups this week: Jordan used Full Boost yesterday, and Rule One.
  if (input.fakes[1]) {
    const thisPeriod = weekPeriod(3);
    if (yesterday >= addDays(kickoff, 14)) {
      docs.push({ path: `${season}/kit/${thisPeriod}_${input.fakes[1].id}_fullBoost`, data: { player: input.fakes[1].id, item: 'fullBoost', period: thisPeriod, date: yesterday, lane: 'body', at: new Date(now - 5 * 3_600_000) } });
    }
    docs.push({ path: `${season}/kit/ruleOne_${input.fakes[1].id}_1`, data: { player: input.fakes[1].id, item: 'ruleOne', number: 1, date: addDays(kickoff, 3), at: at(addDays(kickoff, 3)) } });
  }

  // The wall: a quick-chat line at the commish, a taunt, and a brag with a reaction.
  const post = (id: string, data: Record<string, unknown>) => docs.push({ path: `${root}/wall/${id}`, data: { deleted: false, ...data } });
  if (input.fakes[0]) post('demo1', { by: input.fakes[0].id, kind: 'quick', text: 'Warm up the Wheel of Shame, {name}.', to: league.commish, at: new Date(now - 50 * 60_000) });
  if (input.fakes[2] && input.fakes[1]) post('demo2', { by: input.fakes[2].id, kind: 'taunt', text: 'Your boost is running on empty, {name}.', to: input.fakes[1].id, at: new Date(now - 3 * 3_600_000) });
  if (input.fakes[1] && input.fakes[3]) {
    post('demo3', {
      by: input.fakes[1].id,
      kind: 'brag',
      text: 'New 5k record this morning: 24:10.',
      to: null,
      at: new Date(now - 6 * 3_600_000),
      reactions: { [input.fakes[3].id]: { fire: true, skull: false, beer: false } },
    });
    docs.push({ path: `${root}/wall/demo3/comments/c1`, data: { by: input.fakes[3].id, text: 'Huge. Next one is sub 24.', at: new Date(now - 5 * 3_600_000), deleted: false } });
  }
  return docs;
}
