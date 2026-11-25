import { describe, expect, it } from 'vitest';
import { feedEvents, weekday } from '../src/feed/events.ts';

const names: Record<string, string> = { me: 'You', maya: 'Maya', jordan: 'Jordan', sam: 'Sam', HOUSE: 'The House' };
const name = (player: string) => names[player] ?? 'a former player';
const none = { checkIns: [], kit: [], adjustments: [], weeks: [] };

describe('The live feed', () => {
  it('Dates read as weekdays', () => {
    expect(weekday('2027-01-11')).toBe('Mon');
    expect(weekday('2027-01-17')).toBe('Sun');
  });

  it('A check-in is the first time a player logs a day', () => {
    const events = feedEvents({ ...none, name, checkIns: [{ id: 'maya_2027-01-12', data: { player: 'maya', date: '2027-01-12', firstAt: 1000 } }] });
    expect(events).toEqual([{ id: 'checkin-maya_2027-01-12', at: 1000, kind: 'checkIn', text: 'Maya logged Tue' }]);
  });

  it('Power-ups show when they are set: Aerial, Full Boost and Rule One, but not a moved rest day', () => {
    const events = feedEvents({
      ...none,
      name,
      kit: [
        { id: 'a', data: { player: 'maya', item: 'aerial', date: '2027-01-14', at: 3 } },
        { id: 'b', data: { player: 'me', item: 'fullBoost', date: '2027-01-12', lane: 'body', at: 2 } },
        { id: 'c', data: { player: 'jordan', item: 'ruleOne', date: '2027-01-13', at: 1 } },
        { id: 'd', data: { player: 'sam', item: 'rest', date: '2027-01-16', at: 4 } },
      ],
    });
    expect(events.map((event) => event.text)).toEqual(['Maya set an Aerial for Thu', 'You used Full Boost on Tue: Body goal', 'Jordan used Rule One on Wed']);
  });

  it("Every dock shows with its reason (SCOPE.md), and so do voids and corrections", () => {
    const events = feedEvents({
      ...none,
      name,
      adjustments: [
        { id: 'x', data: { player: 'maya', date: '2027-01-12', amount: -1, void: null, reason: 'Late log', at: 3 } },
        { id: 'y', data: { player: 'jordan', date: '2027-01-13', amount: -1, void: 'body', reason: 'No proof', at: 2 } },
        { id: 'z', data: { player: 'me', date: '2027-01-14', amount: 3, void: null, reason: 'Fixed a typo', at: 1 } },
      ],
    });
    expect(events.map((event) => [event.text, event.detail])).toEqual([
      ['The commish docked Maya 1 point on Tue', 'Late log'],
      ["The commish voided Jordan's Body goal on Wed, −1", 'No proof'],
      ['The commish gave you +3 on Thu', 'Fixed a typo'],
    ]);
  });

  it('A Demolition shows at noon the day after, as Landed, Missed or Blocked with the reason', () => {
    const reveal = (player: string, target: string, outcome: string, at: number) => ({ player, target, date: '2027-01-12', lane: 'body' as const, outcome, at });
    const events = feedEvents({
      ...none,
      name,
      weeks: [{ id: 'w02', data: { week: 2, reveals: [reveal('maya', 'jordan', 'landed', 5), reveal('me', 'maya', 'blocked', 4), reveal('jordan', 'me', 'fizzled', 3), reveal('sam', 'jordan', 'ruleOne', 2), reveal('jordan', 'sam', 'missed', 1)] } }],
    });
    expect(events.map((event) => [event.text, event.outcome])).toEqual([
      ["Maya's Demolition on Jordan's Body goal, Tue", 'Landed'],
      ["Your Demolition on Maya's Body goal, Tue", 'Blocked by Full Boost'],
      ["Jordan's Demolition on your Body goal, Tue", 'Blocked: it was a rest day'],
      ["Sam's Demolition on Jordan's Body goal, Tue", 'Blocked by Rule One'],
      ["Jordan's Demolition on Sam's Body goal, Tue", 'Missed'],
    ]);
  });

  it("A week's results post with every matchup and the awards, then again when they go final", () => {
    const events = feedEvents({
      ...none,
      name,
      weeks: [
        {
          id: 'w02',
          data: {
            week: 2,
            settledAt: 10,
            finalAt: 20,
            results: {
              maya: { opponent: 'jordan', points: 39, opponentPoints: 33, outcome: 'win' },
              jordan: { opponent: 'maya', points: 33, opponentPoints: 39, outcome: 'loss' },
              me: { opponent: 'sam', points: 20, opponentPoints: 20, outcome: 'draw' },
              sam: { opponent: 'me', points: 20, opponentPoints: 20, outcome: 'draw' },
            },
            awards: { mvp: ['maya'], bust: ['jordan'], wheel: ['jordan'] },
          },
        },
      ],
    });
    expect(events).toEqual([
      { id: 'final-w02', at: 20, kind: 'results', text: 'Week 2 is final' },
      {
        id: 'results-w02',
        at: 10,
        kind: 'results',
        text: 'Week 2 results are in',
        detail: 'Maya beat Jordan 39–33\nYou drew with Sam 20–20\nMVP: Maya · Bust: Jordan · Spins the Wheel: Jordan',
      },
    ]);
  });

  it('A bye week reads as a game against The House', () => {
    const events = feedEvents({
      ...none,
      name,
      weeks: [{ id: 'w03', data: { week: 3, settledAt: 5, results: { sam: { opponent: 'HOUSE', points: 25, opponentPoints: 30, outcome: 'loss' } }, awards: { mvp: [], bust: [], wheel: ['sam'] } } }],
    });
    expect(events[0]?.detail).toBe('Sam lost to The House 25–30\nSpins the Wheel: Sam');
  });
});
