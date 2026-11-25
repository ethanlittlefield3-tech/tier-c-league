import { describe, expect, it } from 'vitest';
import {
  HOUSE,
  buildSchedule,
  checkRivalPicks,
  opponentOf,
  type Pair,
  type WeekPlan,
} from '../src/index.ts';

/** A league of n players, p1 to pn, and rival picks in draft order. */
function league(n: number): { players: string[]; picks: Pair[] } {
  const players = Array.from({ length: n }, (_, i) => `p${i + 1}`);
  const picks: Pair[] = [];
  for (let i = 0; i + 1 < n; i += 2) picks.push([players[i] as string, players[i + 1] as string]);
  if (n % 2 === 1) picks.push([players[n - 1] as string, HOUSE]);
  return { players, picks };
}

const key = ([a, b]: Pair) => [a, b].sort().join(' v ');
const keys = (plan: WeekPlan) => plan.pairs.map(key).sort();
const SIZES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('8. Schedule', () => {
  it('Week 1 is exactly the rival picks from the draft', () => {
    for (const n of SIZES) {
      const { picks } = league(n);
      const [week1] = buildSchedule({ picks, weeks: 6 });
      expect(week1?.pairs, `${n} players`).toEqual(picks);
    }
  });

  it('Everyone plays exactly once every week, for 2 to 12 players', () => {
    for (const n of SIZES) {
      const { players, picks } = league(n);
      for (const plan of buildSchedule({ picks, weeks: 12 })) {
        const seen = plan.pairs.flat().filter((p) => p !== HOUSE).sort();
        expect(seen, `${n} players, week ${plan.week}`).toEqual([...players].sort());
      }
    }
  });

  it('Everyone meets everyone else once before any repeat', () => {
    for (const n of SIZES) {
      const { picks } = league(n);
      const seats = picks.length * 2; // The House takes a seat when the count is odd
      const cycle = buildSchedule({ picks, weeks: seats - 1 });
      const met = cycle.flatMap((plan) => plan.pairs.map(key));
      expect(new Set(met).size, `${n} players: no matchup repeats`).toBe(met.length);
      expect(met.length, `${n} players: every possible matchup happens`).toBe((seats * (seats - 1)) / 2);
    }
  });

  it('After a full round-robin the cycle starts over from the Week 1 matchups', () => {
    for (const n of SIZES) {
      const { picks } = league(n);
      const seats = picks.length * 2;
      const plan = buildSchedule({ picks, weeks: seats });
      expect(keys(plan[seats - 1] as WeekPlan), `${n} players`).toEqual(keys(plan[0] as WeekPlan));
    }
  });

  it('Two players face each other every week', () => {
    const plan = buildSchedule({ picks: [['alex', 'maya']], weeks: 6 });
    for (const week of plan) expect(week.pairs).toEqual([['alex', 'maya']]);
  });

  it('With an odd count, the last player picked faces The House in Week 1', () => {
    const { picks } = league(5);
    const [week1] = buildSchedule({ picks, weeks: 6 });
    expect(opponentOf(week1 as WeekPlan, 'p5')).toBe(HOUSE);
  });

  it('With an odd count, one player a week faces The House, and everyone gets that bye once per cycle', () => {
    for (const n of [3, 5, 7, 9, 11]) {
      const { players, picks } = league(n);
      const cycle = buildSchedule({ picks, weeks: n });
      const byes = cycle.map((plan) => {
        const onBye = players.filter((p) => opponentOf(plan, p) === HOUSE);
        expect(onBye.length, `${n} players, week ${plan.week}: one bye`).toBe(1);
        return onBye[0];
      });
      expect([...byes].sort(), `${n} players`).toEqual([...players].sort());
    }
  });

  it('Group-play weeks are reserved: Team Week, 2v2, Bounty Week and Alley pause the round-robin', () => {
    const { picks } = league(6);
    const straight = buildSchedule({ picks, weeks: 4 });
    const plan = buildSchedule({ picks, weeks: 6, modes: { 3: 'teamWeek', 5: 'alley' } });
    expect(plan.map((week) => week.mode)).toEqual(['regular', 'regular', 'teamWeek', 'regular', 'alley', 'regular']);
    expect(plan[2]).toMatchObject({ pairs: [], round: null });
    expect(plan[4]).toMatchObject({ pairs: [], round: null });
    // The 1v1 weeks around them are rounds 1 to 4, with none skipped.
    const oneVOnes = plan.filter((week) => week.round !== null);
    expect(oneVOnes.map(keys)).toEqual(straight.map(keys));
  });

  it('Rumble and Drop Shot are 1v1 modes, so they use the next round-robin pairing', () => {
    const { picks } = league(6);
    const straight = buildSchedule({ picks, weeks: 6 });
    const plan = buildSchedule({ picks, weeks: 6, modes: { 3: 'rumble', 5: 'dropShot' } });
    expect(plan.map(keys)).toEqual(straight.map(keys));
    expect(plan[2]?.mode).toBe('rumble');
  });

  it('Week 1 can never be a group-play week', () => {
    const { picks } = league(4);
    expect(() => buildSchedule({ picks, weeks: 6, modes: { 1: 'alley' } })).toThrow(/Week 1/);
  });

  it('Rival picks that leave someone out, use someone twice or misuse The House are refused', () => {
    const players = ['a', 'b', 'c', 'd'];
    const good: Pair[] = [
      ['a', 'c'],
      ['b', 'd'],
    ];
    expect(checkRivalPicks(players, good)).toBeNull();
    expect(checkRivalPicks(players, [['a', 'c']])).toMatch(/no Week 1 opponent/);
    expect(checkRivalPicks(players, [['a', 'c'], ['a', 'd']])).toMatch(/two matchups/);
    expect(checkRivalPicks(players, [['a', 'a'], ['b', 'd']])).toMatch(/themselves/);
    expect(checkRivalPicks(players, [['a', 'c'], ['b', 'zed']])).toMatch(/not in this league/);
    expect(checkRivalPicks(players, [['a', 'c'], ['b', HOUSE]])).toMatch(/odd/);
    // Five players: The House must take the last player left.
    const five = [...players, 'e'];
    expect(checkRivalPicks(five, [['a', 'c'], ['b', 'd'], ['e', HOUSE]])).toBeNull();
    expect(checkRivalPicks(five, [['e', HOUSE], ['a', 'c'], ['b', 'd']])).toMatch(/last pick/);
    expect(checkRivalPicks(five, [['a', 'c'], ['b', 'd']])).toMatch(/no Week 1 opponent/);
  });
});
