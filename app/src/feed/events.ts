/**
 * The live feed (SCOPE.md, "Live rivalry and social"): check-ins,
 * power-ups, revealed Demolitions, docks and results, worked out on the phone
 * from the league's own data, so it moves the moment anything happens.
 * Badges earned and rank changes come from the jobs' news in `feed/`.
 */
import { BADGES, DODGE_PENALTY, andList, PROOF_VOTE_HOURS, RANK_NAMES, dareStatus, rankMove, storylines, type DemolitionOutcome, type Lane, type Rank, type Square } from '@tcl/engine';
import { groupLines, type GroupDoc } from '../group/words.ts';
import { storyText } from './stories.ts';

export interface FeedEvent {
  id: string;
  at: number;
  kind: 'checkIn' | 'power' | 'dock' | 'reveal' | 'results' | 'receipt' | 'wheel' | 'badge' | 'rank' | 'rematch' | 'picks' | 'champion' | 'left';
  text: string;
  /** A second line: a dock's reason, or a week's scores and awards. */
  detail?: string;
  /** How a revealed Demolition went. */
  outcome?: string;
  /** The week a results post is about, for its highlight reel. */
  week?: number;
  /** A week's storylines, the biggest news first (SCOPE.md, "Season storylines"). */
  headlines?: string[];
  /** The week's MVP and Bust, shown with their cars (SCOPE.md, "MVP and Bust"). */
  spotlight?: { mvp: string[]; bust: string[] };
}

interface Result {
  opponent: string;
  points: number;
  opponentPoints: number;
  /** `none` in a Bounty or Alley week. */
  outcome: 'win' | 'draw' | 'loss' | 'none';
  seasonPoints?: number;
}

export interface FeedInput {
  /** A player's name, "You" for this phone's player and "The House" for HOUSE. */
  name: (player: string) => string;
  checkIns: { id: string; data: { player: string; date: string; firstAt?: number | null } }[];
  kit: { id: string; data: { player: string; item: string; date: string; lane?: Lane; at?: number | null } }[];
  adjustments: { id: string; data: { player: string; date: string; amount: number; void: Square | null; reason?: string; at?: number | null } }[];
  weeks: {
    id: string;
    data: {
      week: number;
      reveals?: { player: string; target: string; date: string; lane: Lane; outcome: DemolitionOutcome | string; at: number }[];
      results?: Record<string, Result>;
      awards?: { mvp: string[]; bust: string[]; wheel: string[] };
      /** A group-play week's summary, once settled. */
      group?: GroupDoc | null;
      settledAt?: number | null;
      finalAt?: number | null;
    };
  }[];
  /** Receipts, newest first. */
  receipts?: {
    id: string;
    data: { by: string; target: string; date: string; square: Square; requestedAt?: number | null; deadline: number; proofAt: number | null; backedDownAt: number | null };
  }[];
  /** The time now, to tell a receipt or a dare left past its deadline. */
  now?: number;
  /** Rematch challenges, and how their side races ended. */
  rematches?: { id: string; data: { from: string; to: string; period: string; at?: number | null; winner?: string | null; points?: Record<string, number>; settledAt?: number | null } }[];
  /** The jobs' news: badges earned and rank changes. */
  news?: { id: string; data: { kind: string; player: string; at?: number | null; data?: { badge?: string; rank?: Rank; from?: Rank | null; top?: string[]; right?: number; made?: number; week?: number; season?: string; finalist?: string | null; whiffLoser?: string | null } } }[];
  /** The Wheel of Shame's latest draws, their spins and the votes on their proof. */
  wheel?: {
    eligible: number;
    draws: { id: string; player: string; dueAt: number }[];
    spins: Record<string, { at: number | null; proofAt: number | null }>;
    votes: { voter: string; player?: string; draw: string; choice: string; at?: number | null }[];
  };
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LANE: Record<Lane, string> = { mind: 'Mind', body: 'Body', wildcard: 'Wildcard' };
const SQUARE: Record<Square, string> = { screen: 'screen time', mind: 'Mind goal', body: 'Body goal', wildcard: 'Wildcard goal' };
const OUTCOME: Record<string, string> = {
  landed: 'Landed',
  missed: 'Missed',
  blocked: 'Blocked by Full Boost',
  fizzled: 'Blocked: it was a rest day',
  ruleOne: 'Blocked by Rule One',
};
const VERB: Record<Exclude<Result['outcome'], 'none'>, string> = { win: 'beat', draw: 'drew with', loss: 'lost to' };
const TITLE: Record<Square, string> = { screen: 'Screen time', mind: 'Mind goal', body: 'Body goal', wildcard: 'Wildcard goal' };

/** A date's weekday, short: "Tue". */
export function weekday(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return DAY[new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)).getUTCDay()] ?? '';
}

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const possessive = (name: string) => (name === 'You' ? 'your' : `${name}'s`);
const object = (name: string) => (name === 'You' ? 'you' : name);
const points = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
const signed = (value: number) => (value < 0 ? `−${-value}` : `+${value}`);
const list = (players: string[], name: (player: string) => string) => players.map(name).join(' and ');

/** Every event, newest first. */
export function feedEvents(input: FeedInput): FeedEvent[] {
  const { name } = input;
  const events: FeedEvent[] = [];

  for (const { id, data } of input.checkIns) {
    if (typeof data.firstAt !== 'number') continue;
    events.push({ id: `checkin-${id}`, at: data.firstAt, kind: 'checkIn', text: `${name(data.player)} logged ${weekday(data.date)}` });
  }

  for (const { id, data } of input.kit) {
    if (typeof data.at !== 'number') continue;
    const who = name(data.player);
    const day = weekday(data.date);
    const text =
      data.item === 'aerial'
        ? `${who} set an Aerial for ${day}`
        : data.item === 'fullBoost'
          ? `${who} used Full Boost on ${day}${data.lane ? `: ${LANE[data.lane]} goal` : ''}`
          : data.item === 'ruleOne'
            ? `${who} used Rule One on ${day}`
            : null;
    if (text) events.push({ id: `kit-${id}`, at: data.at, kind: 'power', text });
  }

  for (const { id, data } of input.adjustments) {
    if (typeof data.at !== 'number') continue;
    const who = name(data.player);
    const day = weekday(data.date);
    const text = data.void
      ? `The commish voided ${possessive(who)} ${SQUARE[data.void]} on ${day}, ${signed(data.amount)}`
      : data.amount < 0
        ? `The commish docked ${object(who)} ${-data.amount} point${data.amount === -1 ? '' : 's'} on ${day}`
        : `The commish gave ${object(who)} ${signed(data.amount)} on ${day}`;
    events.push({ id: `dock-${id}`, at: data.at, kind: 'dock', text, ...(data.reason ? { detail: data.reason } : {}) });
  }

  for (const { id, data } of input.weeks) {
    for (const reveal of data.reveals ?? []) {
      events.push({
        id: `reveal-${id}-${reveal.player}-${reveal.date}`,
        at: reveal.at,
        kind: 'reveal',
        text: `${cap(possessive(name(reveal.player)))} Demolition on ${possessive(name(reveal.target))} ${LANE[reveal.lane]} goal, ${weekday(reveal.date)}`,
        outcome: OUTCOME[reveal.outcome] ?? reveal.outcome,
      });
    }
    if (data.results && typeof data.settledAt === 'number') {
      // A group-play week has its mode's own lines; a 1v1 week, each matchup once.
      const lines: string[] = groupLines(data.group, name)?.map((line) => line.text) ?? [];
      const told = new Set<string>();
      for (const [player, result] of data.group ? [] : Object.entries(data.results)) {
        if (told.has(player) || result.outcome === 'none') continue;
        told.add(player);
        told.add(result.opponent);
        lines.push(`${name(player)} ${VERB[result.outcome]} ${name(result.opponent)} ${points(result.points)}–${points(result.opponentPoints)}`);
      }
      const awards = data.awards;
      const honors = [
        awards?.mvp.length ? `MVP: ${list(awards.mvp, name)}` : '',
        awards?.bust.length ? `Bust: ${list(awards.bust, name)}` : '',
        awards?.wheel.length ? `Spins the Wheel: ${list(awards.wheel, name)}` : '',
      ].filter(Boolean);
      if (honors.length > 0) lines.push(honors.join(' · '));
      const spotlight = awards && (awards.mvp.length > 0 || awards.bust.length > 0) ? { spotlight: { mvp: awards.mvp, bust: awards.bust } } : {};
      // Storylines from the season so far, up to this week.
      const settledWeeks = input.weeks.filter((each) => each.data.results).map((each) => ({ week: each.data.week, results: each.data.results! }));
      const headlines = storylines(settledWeeks, data.week).map((story) => storyText(story, name));
      events.push({ id: `results-${id}`, at: data.settledAt, kind: 'results', text: `Week ${data.week} results are in`, detail: lines.join('\n'), week: data.week, ...(headlines.length ? { headlines } : {}), ...spotlight });
    }
    if (typeof data.finalAt === 'number') {
      events.push({ id: `final-${id}`, at: data.finalAt, kind: 'results', text: `Week ${data.week} is final` });
    }
  }

  for (const { id, data } of input.rematches ?? []) {
    const week = Number(data.period.slice(1));
    if (typeof data.at === 'number') {
      events.push({ id: `rematch-${id}`, at: data.at, kind: 'rematch', text: `${name(data.from)} challenged ${object(name(data.to))} to a rematch: most points in Week ${week} wins` });
    }
    if (typeof data.settledAt === 'number') {
      const of = (player: string) => points(data.points?.[player] ?? 0);
      const loser = data.winner === data.from ? data.to : data.from;
      const text = data.winner
        ? `${name(data.winner)} won the rematch against ${object(name(loser))}, ${of(data.winner)}–${of(loser)}`
        : `The rematch between ${name(data.from)} and ${object(name(data.to))} ended level, ${of(data.from)}–${of(data.to)}`;
      events.push({ id: `rematch-result-${id}`, at: data.settledAt, kind: 'rematch', text });
    }
  }

  for (const { id, data } of input.receipts ?? []) {
    const who = name(data.target);
    const what = `${TITLE[data.square]}, ${weekday(data.date)}`;
    if (typeof data.requestedAt === 'number') {
      events.push({ id: `receipt-${id}`, at: data.requestedAt, kind: 'receipt', text: `${name(data.by)} asked ${object(who)} for receipts: ${what}` });
    }
    if (typeof data.proofAt === 'number') {
      events.push({ id: `proven-${id}`, at: data.proofAt, kind: 'receipt', text: `${who} proved it: ${what}`, outcome: 'Proven' });
    } else if (typeof data.backedDownAt === 'number') {
      events.push({ id: `backed-${id}`, at: data.backedDownAt, kind: 'receipt', text: `${who} backed down: ${what}`, outcome: 'Voided' });
    } else if (input.now !== undefined && input.now >= data.deadline) {
      events.push({ id: `failed-${id}`, at: data.deadline, kind: 'receipt', text: `No proof from ${object(who)} in time: ${what}`, outcome: 'Voided, −1' });
    }
  }

  if (input.wheel && input.now !== undefined) {
    const now = input.now;
    for (const draw of input.wheel.draws) {
      const spin = input.wheel.spins[draw.id] ?? null;
      const votes = input.wheel.votes.filter((vote) => vote.draw === draw.id);
      const who = name(draw.player);
      if (spin && typeof spin.at === 'number') events.push({ id: `spun-${draw.id}`, at: spin.at, kind: 'wheel', text: `${who} spun the Wheel of Shame` });
      if (spin && typeof spin.proofAt === 'number') events.push({ id: `proof-${draw.id}`, at: spin.proofAt, kind: 'wheel', text: `${who} posted dare proof: vote now` });
      const statusAt = (when: number) =>
        dareStatus({
          spunAt: spin?.at ?? null,
          proofAt: spin?.proofAt ?? null,
          dueAt: draw.dueAt,
          now: when,
          eligible: input.wheel!.eligible,
          counts: votes.filter((vote) => vote.choice === 'counts').length,
          doesntCount: votes.filter((vote) => vote.choice === 'doesntCount').length,
        });
      const status = statusAt(now);
      if ((status === 'counted' || status === 'redo') && typeof spin?.proofAt === 'number') {
        // Decided by the votes as they came in, or else when the 24 hours closed.
        const closesAt = spin.proofAt + PROOF_VOTE_HOURS * 3_600_000;
        const lastVote = Math.max(0, ...votes.map((vote) => vote.at ?? 0));
        const early = lastVote > 0 && lastVote < closesAt && statusAt(lastVote) === status;
        events.push({
          id: `decided-${draw.id}`,
          at: early ? lastVote : closesAt,
          kind: 'wheel',
          text: `${cap(possessive(who))} dare proof`,
          outcome: status === 'counted' ? 'Counts' : "Doesn't count: spins again",
        });
      }
      // The Season Dare, after the playoffs, costs no Season Points: the standings are final.
      if (status === 'dodged') events.push({ id: `dodged-${draw.id}`, at: draw.dueAt, kind: 'wheel', text: draw.id.startsWith('p') ? `${who} dodged the Season Dare` : `${who} dodged the dare: ${signed(DODGE_PENALTY)} Season Points` });
    }
  }

  for (const { id, data } of input.news ?? []) {
    if (typeof data.at !== 'number') continue;
    const who = name(data.player);
    if (data.kind === 'badge') {
      const badge = BADGES.find((found) => found.id === data.data?.badge);
      if (!badge) continue;
      events.push({ id: `news-${id}`, at: data.at, kind: 'badge', text: `${who} earned ${badge.name}${badge.shame ? ' (shame)' : ''}`, detail: `${badge.how}. Unlocks: ${andList(badge.unlocks.map((part) => part.name))}.` });
    }
    if (data.kind === 'picks' && data.data?.top?.length) {
      const top = data.data.top.map(name);
      const text =
        top.length === 1
          ? `Top picker in Week ${data.data.week}: ${top[0]}, ${data.data.right} right of ${data.data.made}`
          : `Top pickers in Week ${data.data.week}: ${list(data.data.top, name)}, ${data.data.right} right each`;
      events.push({ id: `news-${id}`, at: data.at, kind: 'picks', text });
    }
    // The season's champion, and who left the league in the offseason.
    const seasonWords = `Season ${String(data.data?.season ?? '').replace(/^s/, '')}`;
    if (data.kind === 'champion') {
      const detail = [data.data?.finalist ? `Finalist: ${name(data.data.finalist)}.` : '', data.data?.whiffLoser ? `Last in the Whiff Bowl: ${name(data.data.whiffLoser)}.` : ''].filter(Boolean).join(' ');
      events.push({ id: `news-${id}`, at: data.at, kind: 'champion', text: `${who} won ${seasonWords}`, ...(detail ? { detail } : {}) });
    }
    if (data.kind === 'left') events.push({ id: `news-${id}`, at: data.at, kind: 'left', text: `${who} left the league after ${seasonWords}` });
    if (data.kind === 'rank' && data.data?.rank) {
      const move = rankMove(data.data.from ?? null, data.data.rank);
      const text = data.data.from ? `${who} ${move === 'down' ? 'dropped to' : 'ranked up to'} ${RANK_NAMES[data.data.rank]}` : `${who} ${who === 'You' ? 'are' : 'is'} ranked ${RANK_NAMES[data.data.rank]}`;
      events.push({ id: `news-${id}`, at: data.at, kind: 'rank', text });
    }
  }

  return events.sort((a, b) => b.at - a.at);
}
