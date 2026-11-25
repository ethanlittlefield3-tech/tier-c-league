import { describe, expect, it } from 'vitest';
import { zoneClock } from '../../engine/src/clock.ts';
import { alertsDue, timedChecks, type AlertDay, type AlertInput } from '../lib/alerts.ts';

const H = 3_600_000;
const NY = 'America/New_York';
const clock = zoneClock(NY);
// Week 2: Monday Jan 11 to Sunday Jan 17, 2027, in New York.
const dates = ['2027-01-11', '2027-01-12', '2027-01-13', '2027-01-14', '2027-01-15', '2027-01-16', '2027-01-17'];
const calendar: AlertDay[] = dates.map((date, dayIndex) => {
  const start = clock.timeOf(date, 0);
  return { date, period: 'w02', dayIndex, start, end: start + 24 * H, lock: start + 36 * H };
});
const at = (date: string, hour: number, minute = 0) => clock.timeOf(date, hour, minute);
const goals = (mind: boolean, body: boolean, wildcard: boolean) => ({ mind, body, wildcard });

/** A run 10 minutes long, ending at `now`. */
function run(now: number, extra: Partial<AlertInput> = {}): AlertInput {
  return {
    since: now - 10 * 60_000,
    now,
    clock,
    players: { alex: 'Alex', maya: 'Maya' },
    calendar,
    logged: {},
    kit: [],
    ruleOnesIssued: 1,
    wall: [],
    receipts: [],
    docks: [],
    weeks: [],
    revealed: [],
    spins: [],
    draftAt: null,
    news: [],
    ...extra,
  };
}
const keys = (input: AlertInput) => alertsDue(input).map((alert) => `${alert.player}:${alert.key}`).sort();

describe('Alerts: daily', () => {
  it('At 9 pm, everyone who has not logged today is reminded; a run that missed 9 pm still catches it in its window', () => {
    const input = run(at('2027-01-13', 21, 3), { logged: { 'maya_2027-01-13': { goals: goals(true, true, true), screenMinutes: 30 } } });
    expect(keys(input)).toEqual(['alex:log-2027-01-13']);
    expect(timedChecks({ since: at('2027-01-13', 20, 55), now: at('2027-01-13', 21, 25), clock, calendar }).map((check) => check.kind)).toEqual(['log']);
    expect(keys(run(at('2027-01-13', 21, 30)))).toEqual([]);
  });

  it('At 11 am, yesterday unfinished gets a last call; a missed goal with Full Boost unused, and a no-show with Rule One in hand, say so too', () => {
    const input = run(at('2027-01-14', 11, 5), { logged: { 'maya_2027-01-13': { goals: goals(true, false, true), screenMinutes: 30 } } });
    expect(keys(input)).toEqual(['alex:lastcall-2027-01-13', 'alex:ruleone-2027-01-13', 'maya:boost-2027-01-13']);
    // Full Boost already used this week, and both Rule Ones used: no such reminders.
    const spent = run(at('2027-01-14', 11, 5), {
      logged: { 'maya_2027-01-13': { goals: goals(true, false, true), screenMinutes: 30 } },
      kit: [{ player: 'maya', item: 'fullBoost', period: 'w02', date: '2027-01-12' }, { player: 'alex', item: 'ruleOne', date: '2027-01-05' }],
    });
    expect(keys(spent)).toEqual(['alex:lastcall-2027-01-13']);
  });

  it('Logged but without screen time still gets the last call', () => {
    const input = run(at('2027-01-14', 11, 5), { players: { maya: 'Maya' }, logged: { 'maya_2027-01-13': { goals: goals(true, true, true), screenMinutes: null } } });
    expect(alertsDue(input).map((alert) => [alert.key, alert.body])).toEqual([['lastcall-2027-01-13', "Yesterday locks at noon, and it isn't finished: screen time is missing."]]);
  });

  it("A rest day's missed goals and no-show need no Full Boost or Rule One", () => {
    // Sunday Jan 17 is everyone's rest day; Monday 11 am asks about it.
    const input = run(at('2027-01-18', 11, 5), { calendar: [...calendar, { ...calendar[0]!, date: '2027-01-18', dayIndex: 0, period: 'w03', start: at('2027-01-18', 0), end: at('2027-01-19', 0), lock: at('2027-01-19', 12) }] });
    expect(keys(input)).toEqual(['alex:lastcall-2027-01-17', 'maya:lastcall-2027-01-17']);
  });

  it("On Monday at 9 am, everyone hears this week's rest day: Sunday, or the day they moved it to", () => {
    const input = run(at('2027-01-11', 9, 4), { kit: [{ player: 'maya', item: 'rest', period: 'w02', date: '2027-01-13' }] });
    expect(alertsDue(input).map((alert) => `${alert.player}:${alert.title}`).sort()).toEqual(['alex:Rest day: Sun Jan 17', 'maya:Rest day: Wed Jan 13']);
  });

  it('On Saturday at 8 pm, anyone with Aerial unused hears it is the last chance', () => {
    const input = run(at('2027-01-16', 20, 2), { kit: [{ player: 'alex', item: 'aerial', period: 'w02', date: '2027-01-14' }] });
    expect(keys(input)).toEqual(['maya:aerial-w02']);
  });
});

describe('Alerts: things that happen', () => {
  const now = at('2027-01-13', 15, 0);

  it('A taunt or a quick-chat line aimed at you arrives at once, with your name filled in', () => {
    const wall = [
      { id: 't1', by: 'maya', kind: 'taunt', text: 'Your boost is empty, {name}.', to: 'alex', at: now - 60_000 },
      { id: 'b1', by: 'maya', kind: 'brag', text: 'New PR', to: null, at: now - 60_000 },
      { id: 'old', by: 'maya', kind: 'quick', text: 'GG', to: 'alex', at: now - H },
    ];
    expect(alertsDue(run(now, { wall })).map((alert) => [alert.player, alert.title, alert.body, alert.category])).toEqual([['alex', 'Maya', 'Your boost is empty, Alex.', 'social']]);
  });

  it('A rematch challenge reaches the player challenged at once, and opens Match', () => {
    const rematches = [{ id: 'w01_maya', from: 'maya', to: 'alex', at: now - 60_000 }];
    expect(alertsDue(run(now, { rematches })).map((alert) => [alert.player, alert.title, alert.body, alert.category, alert.screen])).toEqual([
      ['alex', 'Rematch!', 'Maya challenged you to a side race this week: most points wins.', 'social', 'match'],
    ]);
  });

  it('A poke arrives at once, as "you awake?", and opens Today', () => {
    const pokes = [
      { id: '2027-01-13_maya', player: 'maya', to: 'alex', at: now - 60_000 },
      { id: '2027-01-12_maya', player: 'maya', to: 'alex', at: now - 20 * H },
    ];
    expect(alertsDue(run(now, { pokes })).map((alert) => [alert.player, alert.title, alert.body, alert.category, alert.screen])).toEqual([['alex', 'Maya poked you', 'You awake?', 'social', 'today']]);
  });

  it('Receipts asked of you arrive at once, and again an hour before the deadline unless answered', () => {
    const receipt = { id: 'alex_2027-01-13_body', target: 'alex', date: '2027-01-13', square: 'body', by: 'maya', requestedAt: now - 60_000, deadline: at('2027-01-14', 0), proofAt: null, backedDownAt: null };
    expect(alertsDue(run(now, { receipts: [receipt] })).map((alert) => [alert.player, alert.title, alert.body])).toEqual([['alex', 'Receipts, please', 'Maya wants proof of your Body goal on Wed Jan 13.']]);
    expect(alertsDue(run(at('2027-01-13', 23, 5), { receipts: [receipt] })).map((alert) => alert.title)).toEqual(['One hour left']);
    expect(alertsDue(run(at('2027-01-13', 23, 5), { receipts: [{ ...receipt, proofAt: now }] }))).toEqual([]);
  });

  it('A dock arrives with its reason', () => {
    const docks = [{ id: 'd1', player: 'alex', date: '2027-01-12', amount: -1, void: null, reason: 'No photo of the gym', at: now - 60_000 }];
    expect(alertsDue(run(now, { docks })).map((alert) => [alert.player, alert.title, alert.body])).toEqual([['alex', 'Docked 1 on Tue Jan 12', 'No photo of the gym']]);
  });

  it('A Demolition tells its setter how it went, and its target only when it landed; each once', () => {
    const weeks = [{ id: 'w02', week: 2, reveals: [{ player: 'maya', target: 'alex', date: '2027-01-12', lane: 'body', outcome: 'landed', at: at('2027-01-13', 12) }] }];
    expect(alertsDue(run(now, { weeks })).map((alert) => `${alert.player}:${alert.title}`)).toEqual(['maya:Your Demolition landed', 'alex:You got demo’d']);
    expect(alertsDue(run(now, { weeks, revealed: ['reveal-maya-2027-01-12'] }))).toEqual([]);
    const missed = [{ ...weeks[0]!, reveals: [{ ...weeks[0]!.reveals[0]!, outcome: 'missed' }] }];
    expect(alertsDue(run(now, { weeks: missed })).map((alert) => `${alert.player}:${alert.title}`)).toEqual(['maya:Your Demolition missed']);
  });

  it("When a week goes final, each player hears their result with the MVP and Bust, and a spinner hears they spin", () => {
    const weeks = [
      {
        id: 'w02',
        week: 2,
        status: 'final',
        finalAt: now - 60_000,
        results: { alex: { opponent: 'maya', points: 9, opponentPoints: 12, outcome: 'loss' as const }, maya: { opponent: 'alex', points: 12, opponentPoints: 9, outcome: 'win' as const } },
        awards: { mvp: ['maya'], bust: [], wheel: ['alex'] },
      },
    ];
    expect(alertsDue(run(now, { weeks })).map((alert) => [alert.player, alert.title, alert.body])).toEqual([
      ['alex', 'Week 2: you lost', '9–12 against Maya. MVP: Maya. You spin the Wheel of Shame.'],
      ['maya', 'Week 2: you won', '12–9 against Alex. MVP: Maya.'],
    ]);
  });

  it("A Team Week or 2v2 result compares the sides' averages", () => {
    const side = (name: string, players: string[], points: number) => ({ name, players, points, beers: 0 });
    const weeks = [
      {
        id: 'w03',
        week: 3,
        status: 'final',
        finalAt: now - 60_000,
        results: {
          alex: { opponent: 'GROUP', points: 39, opponentPoints: 35.5, outcome: 'win' as const, mode: 'teamWeek', side: side('orange', ['alex'], 36), against: side('blue', ['maya'], 35.5) },
          maya: { opponent: 'GROUP', points: 30, opponentPoints: 36, outcome: 'loss' as const, mode: 'twoVTwo', side: side('duo', ['maya', 'sam'], 30), against: side('house', ['HOUSE'], 33.25) },
        },
        awards: { mvp: [], bust: [], wheel: ['maya'] },
      },
    ];
    expect(alertsDue(run(now, { weeks })).map((alert) => [alert.player, alert.title, alert.body])).toEqual([
      ['alex', 'Week 3: you won', 'Orange averaged 36–35.5 against Blue.'],
      ['maya', 'Week 3: you lost', 'Your duo averaged 30–33.3 against the House duo. You spin the Wheel of Shame.'],
    ]);
  });

  it('A Bounty, Alley or Drop Shot result says how the mode went', () => {
    const week = (id: string, n: number, alex: Record<string, unknown>, group?: { mode: string; target?: { kind: string } }) => ({ id, week: n, status: 'final', finalAt: now - 60_000, results: { alex: { opponent: 'GROUP', points: 30, opponentPoints: 0, ...alex } as never }, awards: { mvp: [], bust: [], wheel: [] }, ...(group ? { group } : {}) });
    const weeks = [
      week('w03', 3, { outcome: 'none', mode: 'bounty', bonus: 3, bounty: { counted: 9, broke: false, hit: true } }, { mode: 'bounty', target: { kind: 'hits' } }),
      week('w04', 4, { outcome: 'none', mode: 'bounty', bonus: 0, bounty: { counted: 0, broke: true, hit: false } }, { mode: 'bounty', target: { kind: 'dry' } }),
      week('w05', 5, { outcome: 'none', mode: 'alley', bonus: 3, race: { points: 26, walls: 1, place: 2 } }),
      week('w06', 6, { opponent: 'maya', outcome: 'win', mode: 'dropShot', opponentPoints: 28, floor: { hits: 7, tiles: 3, opponentHits: 4, opponentTiles: 2 } }),
    ];
    expect(alertsDue(run(now, { weeks })).map((alert) => [alert.title, alert.body])).toEqual([
      ['Week 3: the Bounty was hit', '+3 for everyone. You added 9.'],
      ['Week 4: the Bounty was missed', 'No bonus this week. You broke it.'],
      ['Week 5: 2nd in the Alley', '26 race points: +3.'],
      ['Week 6: you won', '3 tiles to 2 against Maya.'],
    ]);
  });

  it('Everyone else hears when a spinner spins the Wheel, and when their dare proof is up to vote on', () => {
    const spins = [{ id: 'w02_alex_1', player: 'alex', at: now - 60_000, proofAt: null }];
    expect(alertsDue(run(now, { spins })).map((alert) => `${alert.player}:${alert.title}`)).toEqual(['maya:Alex is spinning the Wheel of Shame']);
    const proven = [{ id: 'w02_alex_1', player: 'alex', at: now - 5 * H, proofAt: now - 60_000 }];
    expect(alertsDue(run(now, { spins: proven })).map((alert) => `${alert.player}:${alert.title}`)).toEqual(["maya:Alex's dare proof is up"]);
  });

  it('Draft day: an hour before, and as it starts', () => {
    const draftAt = at('2027-01-13', 19);
    expect(alertsDue(run(at('2027-01-13', 18, 5), { draftAt })).map((alert) => alert.title)).toEqual(['Draft day', 'Draft day']);
    expect(alertsDue(run(at('2027-01-13', 19, 5), { draftAt })).map((alert) => alert.title)).toEqual(['The draft is starting', 'The draft is starting']);
  });

  it('A badge earned, or a rank change, goes to its player under Progress', () => {
    const news: AlertInput['news'] = [
      { id: 'badge_alex_hatTrick', kind: 'badge', player: 'alex', at: now - 60_000, data: { badge: 'hatTrick' } },
      { id: 'rank_maya', kind: 'rank', player: 'maya', at: now - 60_000, data: { rank: 'platinum', from: 'gold' } },
      { id: 'rank_old', kind: 'rank', player: 'maya', at: now - 5 * H, data: { rank: 'gold', from: 'silver' } },
    ];
    expect(alertsDue(run(now, { news })).map((alert) => [alert.player, alert.category, alert.title, alert.body])).toEqual([
      ['alex', 'progress', 'Badge unlocked: Hat Trick', 'The Flame decal is yours to put on your car.'],
      ['maya', 'progress', 'Rank up: Platinum', 'Your last 4 weeks, in Profile.'],
    ]);
  });

  it('Nothing goes to a player who has left the league', () => {
    const wall = [{ id: 't1', by: 'maya', kind: 'taunt', text: 'Hi {name}', to: 'gone', at: now - 60_000 }];
    expect(alertsDue(run(now, { wall }))).toEqual([]);
  });
});
