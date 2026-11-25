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

  it("A week's results post with every matchup and the awards, the MVP and the Bust in the spotlight, then again when they go final", () => {
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
        spotlight: { mvp: ['maya'], bust: ['jordan'] },
      },
    ]);
  });

  it("A week's results carry its storylines, the biggest news first", () => {
    const events = feedEvents({
      ...none,
      name,
      weeks: [
        { id: 'w01', data: { week: 1, settledAt: 5, results: { maya: { opponent: 'jordan', points: 32, opponentPoints: 10, outcome: 'win' }, jordan: { opponent: 'maya', points: 10, opponentPoints: 32, outcome: 'loss' } } } },
      ],
    });
    expect(events[0]?.headlines).toEqual(['Maya crushed Jordan by 22']);
  });

  it('A rematch shows when it is made, and again with the winner and the score once its week is settled', () => {
    const events = feedEvents({
      ...none,
      name,
      rematches: [
        { id: 'w02_jordan', data: { from: 'jordan', to: 'maya', period: 'w03', at: 5, winner: 'jordan', points: { jordan: 25, maya: 20 }, settledAt: 50 } },
        { id: 'w02_sam', data: { from: 'sam', to: 'me', period: 'w03', at: 6, winner: null, points: { sam: 18, me: 18 }, settledAt: 51 } },
      ],
    });
    expect(events.map((event) => event.text)).toEqual([
      'The rematch between Sam and you ended level, 18–18',
      'Jordan won the rematch against Maya, 25–20',
      'Sam challenged you to a rematch: most points in Week 3 wins',
      'Jordan challenged Maya to a rematch: most points in Week 3 wins',
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

  it('Receipts show when asked, and again when proven, backed down from, or left past the deadline', () => {
    const base = { by: 'maya', date: '2027-01-12', square: 'body' as const, requestedAt: 1, deadline: 100, proofAt: null, backedDownAt: null };
    const events = feedEvents({
      ...none,
      name,
      now: 200,
      receipts: [
        { id: 'r1', data: { ...base, target: 'jordan', proofAt: 50 } },
        { id: 'r2', data: { ...base, target: 'me', square: 'screen', backedDownAt: 60 } },
        { id: 'r3', data: { ...base, target: 'sam', square: 'mind' } },
      ],
    });
    expect(events.filter((event) => event.kind === 'receipt').map((event) => [event.text, event.outcome ?? null])).toEqual([
      ["No proof from Sam in time: Mind goal, Tue", 'Voided, −1'],
      ['You backed down: Screen time, Tue', 'Voided'],
      ['Jordan proved it: Body goal, Tue', 'Proven'],
      ['Maya asked Jordan for receipts: Body goal, Tue', null],
      ['Maya asked you for receipts: Screen time, Tue', null],
      ['Maya asked Sam for receipts: Mind goal, Tue', null],
    ]);
  });

  it('A receipt still open shows only that it was asked', () => {
    const events = feedEvents({
      ...none,
      name,
      now: 50,
      receipts: [{ id: 'r4', data: { by: 'maya', target: 'sam', date: '2027-01-12', square: 'mind', requestedAt: 1, deadline: 100, proofAt: null, backedDownAt: null } }],
    });
    expect(events.map((event) => event.text)).toEqual(['Maya asked Sam for receipts: Mind goal, Tue']);
  });

  it('The Wheel shows when it is spun, when proof is posted, and how the vote or the deadline ended it', () => {
    const H = 3_600_000;
    const draw = (player: string, dueAt: number) => ({ id: `w02_${player}_1`, player, n: 1, pool: [], drawnAt: 0, dueAt });
    const events = feedEvents({
      ...none,
      name,
      now: 100 * H,
      wheel: {
        eligible: 2,
        draws: [draw('maya', 200 * H), draw('sam', 50 * H), draw('jordan', 200 * H)],
        spins: { w02_maya_1: { at: 1 * H, proofAt: 10 * H }, w02_sam_1: { at: 2 * H, proofAt: null }, w02_jordan_1: { at: 3 * H, proofAt: 20 * H } },
        votes: [
          { voter: 'jordan', player: 'maya', draw: 'w02_maya_1', choice: 'counts', at: 11 * H },
          { voter: 'me', player: 'jordan', draw: 'w02_jordan_1', choice: 'doesntCount', at: 21 * H },
          { voter: 'maya', player: 'jordan', draw: 'w02_jordan_1', choice: 'doesntCount', at: 22 * H },
        ],
      },
    });
    expect(events.filter((event) => event.kind === 'wheel').map((event) => [event.at / H, event.text, event.outcome ?? null])).toEqual([
      [50, 'Sam dodged the dare: −3 Season Points', null],
      // Two can vote: Jordan's second "doesn't count" settled it, and once Maya had one "counts" a veto was out of reach.
      [22, "Jordan's dare proof", "Doesn't count: spins again"],
      [20, 'Jordan posted dare proof: vote now', null],
      [11, "Maya's dare proof", 'Counts'],
      [10, 'Maya posted dare proof: vote now', null],
      [3, 'Jordan spun the Wheel of Shame', null],
      [2, 'Sam spun the Wheel of Shame', null],
      [1, 'Maya spun the Wheel of Shame', null],
    ]);
  });

  it("The jobs' news: a badge earned, with what it unlocks, and rank changes up, down and first", () => {
    const events = feedEvents({
      ...none,
      name,
      news: [
        { id: 'badge_maya_hatTrick', data: { kind: 'badge', player: 'maya', at: 5, data: { badge: 'hatTrick' } } },
        { id: 'badge_me_happyHour', data: { kind: 'badge', player: 'me', at: 4, data: { badge: 'happyHour' } } },
        { id: 'rank_sam', data: { kind: 'rank', player: 'sam', at: 3, data: { rank: 'platinum', from: 'gold' } } },
        { id: 'rank_jordan', data: { kind: 'rank', player: 'jordan', at: 2, data: { rank: 'silver', from: 'gold' } } },
        { id: 'rank_me', data: { kind: 'rank', player: 'me', at: 1, data: { rank: 'gold', from: null } } },
      ],
    });
    expect(events.map((event) => [event.kind, event.text, event.detail ?? null])).toEqual([
      ['badge', 'Maya earned Hat Trick', '3 perfect days in a row, rest days skipped. Unlocks: Flame decal.'],
      ['badge', 'You earned Happy Hour (shame)', '10 or more beers in one week. Unlocks: Party hat topper.'],
      ['rank', 'Sam ranked up to Platinum', null],
      ['rank', 'Jordan dropped to Silver', null],
      ['rank', 'You are ranked Gold', null],
    ]);
  });
});
