/**
 * The live feed (SCOPE.md, "Live rivalry and social"): check-ins,
 * power-ups, revealed Demolitions, docks and results, worked out on the phone
 * from the league's own data, so it moves the moment anything happens.
 * Badges, rank-ups and recaps join it in Phase 2.
 */
import type { DemolitionOutcome, Lane, Square } from '@tcl/engine';

export interface FeedEvent {
  id: string;
  at: number;
  kind: 'checkIn' | 'power' | 'dock' | 'reveal' | 'results';
  text: string;
  /** A second line: a dock's reason, or a week's scores and awards. */
  detail?: string;
  /** How a revealed Demolition went. */
  outcome?: string;
}

interface Result {
  opponent: string;
  points: number;
  opponentPoints: number;
  outcome: 'win' | 'draw' | 'loss';
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
      settledAt?: number | null;
      finalAt?: number | null;
    };
  }[];
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
const VERB: Record<Result['outcome'], string> = { win: 'beat', draw: 'drew with', loss: 'lost to' };

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
      const lines: string[] = [];
      const told = new Set<string>();
      for (const [player, result] of Object.entries(data.results)) {
        if (told.has(player)) continue;
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
      events.push({ id: `results-${id}`, at: data.settledAt, kind: 'results', text: `Week ${data.week} results are in`, detail: lines.join('\n') });
    }
    if (typeof data.finalAt === 'number') {
      events.push({ id: `final-${id}`, at: data.finalAt, kind: 'results', text: `Week ${data.week} is final` });
    }
  }

  return events.sort((a, b) => b.at - a.at);
}
