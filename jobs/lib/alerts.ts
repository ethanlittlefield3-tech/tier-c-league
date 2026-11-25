/**
 * Alerts (SCOPE.md, "Notifications"): which pushes are due, worked out by the
 * tick job every 10 minutes for what happened, or came round, since its last
 * run. Pure: the job reads the league, passes it in with the time, and sends
 * what comes back (`deliver.ts` decides each phone's share).
 *
 * Timed alerts go by league time, from the league's clock, so the fast test
 * league gets its own 9 pm and noon. An alert that is no use any more, like
 * "log your day" once the day has locked, carries the time it expires.
 */
import type { Category } from '../../engine/src/alerts.ts';
import { WEEKDAYS, addDays, weekdayIndex } from '../../engine/src/calendar.ts';
import type { LeagueClock } from '../../engine/src/clock.ts';
import { HOUSE } from '../../engine/src/schedule.ts';

export type Screen = 'today' | 'match' | 'feed' | 'league' | 'wheel' | 'draft';

export interface Alert {
  player: string;
  category: Category;
  /** Names the alert: a phone shows one alert per key, the newest. */
  key: string;
  title: string;
  body: string;
  /** The screen a tap opens. */
  screen: Screen;
  /** After this it is no use, so it isn't sent, even after quiet hours. */
  expires: number;
}

export interface AlertDay {
  date: string;
  period: string;
  dayIndex: number;
  start: number;
  end: number;
  lock: number;
}

type Goals = { mind: boolean; body: boolean; wildcard: boolean };

export interface AlertInput {
  /** The last run, and now: alerts due between them are sent. */
  since: number;
  now: number;
  clock: LeagueClock;
  /** Everyone in the league, with their display names. */
  players: Record<string, string>;
  /** The season's days around now: at least yesterday and today. */
  calendar: AlertDay[];
  /** What was logged, by `{player}_{date}`, for the days a timed alert asks about. */
  logged: Record<string, { goals: Goals; screenMinutes: number | null }>;
  /** Kit played this period, and every Rule One. */
  kit: { player: string; item: string; period?: string; date: string }[];
  /** How many Rule Ones each player has been handed so far. */
  ruleOnesIssued: number;
  /** Wall posts made since the last run. */
  wall: { id: string; by: string; kind: string; text: string; to: string | null; at: number; deleted?: boolean }[];
  /** Receipts asked for since the last run, or due within the hour. */
  receipts: { id: string; target: string; date: string; square: string; by: string; requestedAt: number; deadline: number; proofAt: number | null; backedDownAt: number | null }[];
  /** The commish's docks, voids and corrections since the last run. */
  docks: { id: string; player: string; date: string; amount: number; void: string | null; reason: string; at: number }[];
  /** This week and last week. */
  weeks: {
    id: string;
    week: number;
    status?: string;
    finalAt?: number;
    results?: Record<string, { opponent: string; points: number; opponentPoints: number; outcome: 'win' | 'draw' | 'loss' }>;
    awards?: { mvp: string[]; bust: string[]; wheel: string[] };
    reveals?: { player: string; target: string; date: string; lane: string; outcome: string; at: number }[];
  }[];
  /** Demolition reveals already alerted, by key. */
  revealed: string[];
  /** Wheel spins made, or proven, since the last run. */
  spins: { id: string; player: string; at: number; proofAt: number | null }[];
  /** When the live draft starts, if it is set. */
  draftAt: number | null;
}

const HOUR = 3_600_000;
const LANE: Record<string, string> = { mind: 'Mind', body: 'Body', wildcard: 'Wildcard', screen: 'screen time' };

/** "Tue Jan 5" */
function dayText(date: string): string {
  const [, month, day] = date.split('-').map(Number) as [number, number, number];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${WEEKDAYS[weekdayIndex(date)]!.slice(0, 3)} ${months[month - 1]} ${day}`;
}

/** A player's rest day in a day's week: Sunday unless they moved it. */
function restDayOf(input: AlertInput, player: string, day: AlertDay): string {
  const moved = input.kit.find((play) => play.player === player && play.item === 'rest' && play.period === day.period);
  return moved?.date ?? addDays(day.date, 6 - day.dayIndex);
}

/** The timed alerts' moments that came round since the last run: what the job must read for. */
export function timedChecks(input: { since: number; now: number; clock: LeagueClock; calendar: AlertDay[] }): { kind: 'log' | 'lastCall' | 'rest' | 'aerial'; day: AlertDay }[] {
  const due = (at: number) => input.since < at && at <= input.now;
  const checks: { kind: 'log' | 'lastCall' | 'rest' | 'aerial'; day: AlertDay }[] = [];
  for (const day of input.calendar) {
    if (due(input.clock.timeOf(day.date, 21))) checks.push({ kind: 'log', day });
    if (due(input.clock.timeOf(addDays(day.date, 1), 11))) checks.push({ kind: 'lastCall', day });
    if (day.dayIndex === 0 && due(input.clock.timeOf(day.date, 9))) checks.push({ kind: 'rest', day });
    if (day.dayIndex === 5 && due(input.clock.timeOf(day.date, 20))) checks.push({ kind: 'aerial', day });
  }
  return checks;
}

/** Every alert due since the last run. */
export function alertsDue(input: AlertInput): Alert[] {
  const { since, now } = input;
  const inWindow = (at: number | null | undefined) => typeof at === 'number' && since < at && at <= now;
  const name = (player: string) => input.players[player] ?? 'A former player';
  const members = Object.keys(input.players);
  const alerts: Alert[] = [];
  const add = (alert: Alert) => {
    if (alert.expires > now) alerts.push(alert);
  };

  // ---- Daily: 9 pm and 11 am the next day ----------------------------------
  for (const { kind, day } of timedChecks(input)) {
    for (const player of members) {
      const log = input.logged[`${player}_${day.date}`];
      const rest = restDayOf(input, player, day) === day.date;
      if (kind === 'log' && !log) {
        add({ player, category: 'daily', key: `log-${day.date}`, title: 'Log your day', body: `Nothing is logged for today yet. It locks at noon tomorrow.`, screen: 'today', expires: day.lock });
      }
      if (kind === 'lastCall') {
        if (!log || log.screenMinutes === null) {
          add({ player, category: 'daily', key: `lastcall-${day.date}`, title: 'Last call', body: `Yesterday locks at noon, and it isn't finished${log ? ': screen time is missing' : ''}.`, screen: 'today', expires: day.lock });
        }
        const boosted = input.kit.some((play) => play.player === player && play.item === 'fullBoost' && play.period === day.period);
        if (log && !rest && !boosted && (!log.goals.mind || !log.goals.body || !log.goals.wildcard)) {
          add({ player, category: 'daily', key: `boost-${day.date}`, title: 'Full Boost still available', body: 'You missed a goal yesterday. Full Boost can count it as hit until noon.', screen: 'today', expires: day.lock });
        }
        const used = input.kit.filter((play) => play.player === player && play.item === 'ruleOne').length;
        if (!log && !rest && used < input.ruleOnesIssued) {
          add({ player, category: 'daily', key: `ruleone-${day.date}`, title: 'Rule One available', body: 'Yesterday was a no-show. Rule One can make it score 0 instead of −5, until noon.', screen: 'today', expires: day.lock });
        }
      }
      if (kind === 'rest') {
        add({ player, category: 'daily', key: `rest-${day.period}`, title: `Rest day: ${dayText(restDayOf(input, player, day))}`, body: 'Tap to move it, before either day starts.', screen: 'today', expires: day.end });
      }
      if (kind === 'aerial') {
        const used = input.kit.some((play) => play.player === player && play.item === 'aerial' && play.period === day.period);
        if (!used) add({ player, category: 'powerups', key: `aerial-${day.period}`, title: 'Last chance for Aerial', body: 'Aerial is still unused. Set it on Sunday before midnight tonight, and Sunday counts double.', screen: 'today', expires: input.clock.timeOf(addDays(day.date, 1), 0) });
      }
    }
  }

  // ---- Social: taunts at you, when they happen ------------------------------
  for (const post of input.wall) {
    if (!inWindow(post.at) || post.deleted || !post.to || post.to === post.by || !input.players[post.to] || (post.kind !== 'taunt' && post.kind !== 'quick')) continue;
    add({ player: post.to, category: 'social', key: `taunt-${post.id}`, title: name(post.by), body: post.text.split('{name}').join(name(post.to)), screen: 'feed', expires: post.at + 24 * HOUR });
  }

  // ---- Receipts: asked of you, an hour before they're due, and docks --------
  for (const receipt of input.receipts) {
    const what = receipt.square === 'screen' ? 'screen time' : `${LANE[receipt.square] ?? receipt.square} goal`;
    const pending = receipt.proofAt === null && receipt.backedDownAt === null;
    if (inWindow(receipt.requestedAt) && pending) {
      add({ player: receipt.target, category: 'receipts', key: `receipt-${receipt.id}`, title: 'Receipts, please', body: `${name(receipt.by)} wants proof of your ${what} on ${dayText(receipt.date)}.`, screen: 'today', expires: receipt.deadline });
    }
    if (inWindow(receipt.deadline - HOUR) && pending) {
      add({ player: receipt.target, category: 'receipts', key: `receipt-${receipt.id}`, title: 'One hour left', body: `Prove your ${what} on ${dayText(receipt.date)}, or back down for free. No answer costs a point.`, screen: 'today', expires: receipt.deadline });
    }
  }
  for (const dock of input.docks) {
    if (!inWindow(dock.at)) continue;
    const title = dock.void ? `Your ${LANE[dock.void] ?? dock.void} on ${dayText(dock.date)} was voided` : dock.amount < 0 ? `Docked ${Math.abs(dock.amount)} on ${dayText(dock.date)}` : `Your score on ${dayText(dock.date)} was corrected`;
    add({ player: dock.player, category: 'receipts', key: `dock-${dock.id}`, title, body: dock.reason || 'Your commish gave a reason in the league log.', screen: 'today', expires: dock.at + 24 * HOUR });
  }

  // ---- Power-ups: Demolitions, when their day locks -------------------------
  for (const week of input.weeks) {
    for (const reveal of week.reveals ?? []) {
      const key = `reveal-${reveal.player}-${reveal.date}`;
      if (input.revealed.includes(key) || reveal.at > now) continue;
      const lane = LANE[reveal.lane] ?? reveal.lane;
      const them = name(reveal.target);
      const day = dayText(reveal.date);
      // A Demolition lands on a goal its target missed, for −2; it misses a goal they hit.
      const told: Record<string, [string, string]> = {
        landed: ['Your Demolition landed', `${them} missed their ${lane} goal on ${day}: −2 to them.`],
        missed: ['Your Demolition missed', `${them} hit their ${lane} goal on ${day}.`],
        blocked: ['Your Demolition was blocked', `${them} used Full Boost on their ${lane} goal on ${day}.`],
        fizzled: ['Your Demolition fizzled', `${day} was ${them}'s rest day.`],
        ruleOne: ['Your Demolition hit a Rule One', `${them} used Rule One on ${day}.`],
      };
      const [title, body] = told[reveal.outcome] ?? told.missed!;
      add({ player: reveal.player, category: 'powerups', key, title, body, screen: 'match', expires: reveal.at + 24 * HOUR });
      if (reveal.outcome === 'landed') add({ player: reveal.target, category: 'powerups', key: `${key}-on`, title: 'You got demo’d', body: `${name(reveal.player)}'s Demolition caught your missed ${lane} goal on ${day}: −2.`, screen: 'match', expires: reveal.at + 24 * HOUR });
    }
  }

  // ---- Matchup: the result, with the recap, when a week goes final ----------
  for (const week of input.weeks) {
    if (week.status !== 'final' || !inWindow(week.finalAt) || !week.results) continue;
    const recap = [week.awards?.mvp.length ? `MVP: ${week.awards.mvp.map(name).join(', ')}.` : '', week.awards?.bust.length ? `Bust: ${week.awards.bust.map(name).join(', ')}.` : ''].filter(Boolean).join(' ');
    for (const [player, result] of Object.entries(week.results)) {
      if (!input.players[player]) continue;
      const against = result.opponent === HOUSE ? 'The House' : name(result.opponent);
      const outcome = result.outcome === 'win' ? 'you won' : result.outcome === 'loss' ? 'you lost' : 'a draw';
      const spins = week.awards?.wheel.includes(player) ? ' You spin the Wheel of Shame.' : '';
      add({ player, category: 'matchup', key: `result-${week.id}`, title: `Week ${week.week}: ${outcome}`, body: `${result.points}–${result.opponentPoints} against ${against}. ${recap}${spins}`.trim(), screen: 'league', expires: (week.finalAt ?? now) + 24 * HOUR });
    }
  }

  // ---- League: draft day, the Wheel, dare proof -----------------------------
  if (input.draftAt !== null) {
    for (const player of members) {
      if (inWindow(input.draftAt - HOUR)) add({ player, category: 'league', key: 'draft', title: 'Draft day', body: 'The live draft starts in an hour.', screen: 'draft', expires: input.draftAt + HOUR });
      if (inWindow(input.draftAt)) add({ player, category: 'league', key: 'draft', title: 'The draft is starting', body: 'Set your goals and vote on everyone else’s.', screen: 'draft', expires: input.draftAt + 2 * HOUR });
    }
  }
  for (const spin of input.spins) {
    for (const player of members) {
      if (player === spin.player) continue;
      if (inWindow(spin.at)) add({ player, category: 'league', key: `spin-${spin.id}`, title: `${name(spin.player)} is spinning the Wheel of Shame`, body: 'Watch where it lands.', screen: 'wheel', expires: spin.at + HOUR });
      if (inWindow(spin.proofAt)) add({ player, category: 'league', key: `proof-${spin.id}`, title: `${name(spin.player)}'s dare proof is up`, body: 'Does it count? Vote.', screen: 'wheel', expires: (spin.proofAt ?? now) + 24 * HOUR });
    }
  }
  return alerts;
}
