import { describe, expect, it } from 'vitest';
import { scheduleDocs } from '../lib/schedule-docs.ts';

const done = (order: string[], picks: Record<string, string>, left: string[] = []) => ({ step: 'done', order, picks, left });
const weeksOf = (result: ReturnType<typeof scheduleDocs>) => {
  if ('skip' in result) throw new Error(`skipped: ${result.skip}`);
  return result.weeks;
};

describe('Building the schedule after the draft', () => {
  it('Waits until the draft is done and every rival pick is made', () => {
    expect(scheduleDocs({ status: 'draft', regularWeeks: 6, draft: null })).toEqual({ skip: 'draft-not-done' });
    expect(scheduleDocs({ status: 'draft', regularWeeks: 6, draft: { ...done(['a', 'b', 'c', 'd'], {}), step: 'dares' } })).toEqual({ skip: 'draft-not-done' });
    expect(scheduleDocs({ status: 'draft', regularWeeks: 6, draft: done(['a', 'b', 'c', 'd'], { a: 'b' }, ['c', 'd']) })).toEqual({ skip: 'picks-not-done' });
  });

  it('Leaves a season alone once it is active, so running again changes nothing', () => {
    expect(scheduleDocs({ status: 'active', regularWeeks: 6, draft: done(['a', 'b'], { a: 'b' }) })).toEqual({ skip: 'not-in-draft' });
    expect(scheduleDocs({ status: 'setup', regularWeeks: 6, draft: null })).toEqual({ skip: 'not-in-draft' });
  });

  it('Week 1 is the rival picks, then a round-robin where everyone meets before anyone repeats', () => {
    const weeks = weeksOf(scheduleDocs({ status: 'draft', regularWeeks: 3, draft: done(['maya', 'jordan', 'sam', 'riley'], { maya: 'sam', jordan: 'riley' }) }));
    expect(weeks.map((week) => week.id)).toEqual(['w01', 'w02', 'w03']);
    expect(weeks[0]?.data.pairs).toEqual([
      { a: 'maya', b: 'sam' },
      { a: 'jordan', b: 'riley' },
    ]);
    const met = weeks.flatMap((week) => week.data.pairs.map((pair) => [pair.a, pair.b].sort().join(' v ')));
    expect(new Set(met).size).toBe(6);
  });

  it('Each player may demolish only their opponent that week', () => {
    const [week1] = weeksOf(scheduleDocs({ status: 'draft', regularWeeks: 3, draft: done(['maya', 'jordan', 'sam', 'riley'], { maya: 'sam', jordan: 'riley' }) }));
    expect(week1?.data.targets).toEqual({ maya: ['sam'], sam: ['maya'], jordan: ['riley'], riley: ['jordan'] });
  });

  it('With an odd count, the last player in Week 1 faces The House, and each week one player has The House', () => {
    const weeks = weeksOf(scheduleDocs({ status: 'draft', regularWeeks: 3, draft: done(['maya', 'jordan', 'sam'], { maya: 'jordan' }, ['sam']) }));
    expect(weeks[0]?.data.pairs).toEqual([
      { a: 'maya', b: 'jordan' },
      { a: 'sam', b: 'HOUSE' },
    ]);
    expect(weeks[0]?.data.targets.sam).toEqual(['HOUSE']);
    for (const week of weeks) expect(week.data.pairs.filter((pair) => pair.b === 'HOUSE')).toHaveLength(1);
  });

  it("The group-play vote's top modes fill the group-play weeks, the top one first; Rumble and Drop Shot keep the round-robin's pairs", () => {
    const rankings = { a: ['dropShot', 'alley', 'rumble', 'teamWeek', 'twoVTwo', 'bounty'], b: ['dropShot', 'alley', 'rumble', 'teamWeek', 'twoVTwo', 'bounty'] };
    const weeks = weeksOf(scheduleDocs({ status: 'draft', regularWeeks: 6, groupWeeks: [5, 3], rankings, commish: 'a', draft: done(['a', 'b', 'c', 'd'], { a: 'b', c: 'd' }) }));
    expect(weeks.map((week) => week.data.mode)).toEqual(['regular', 'regular', 'dropShot', 'regular', 'alley', 'regular']);
    expect(weeks[2]?.data.pairs).toHaveLength(2);
    // Alley is the whole league at once: no pairs.
    expect(weeks[4]?.data.pairs).toEqual([]);
  });

  it("A Team Week plays the captains' squads, the same every Team Week; without them, the squads alternate down the draft order", () => {
    const rankings = { a: ['teamWeek', 'rumble', 'twoVTwo', 'bounty', 'dropShot', 'alley'] };
    const squads = { blue: ['a', 'd'], orange: ['b', 'c'] };
    // Seven group-play weeks: the order repeats, so Weeks 2 and 8 are both Team Week.
    const weeks = weeksOf(scheduleDocs({ status: 'draft', regularWeeks: 8, groupWeeks: [2, 3, 4, 5, 6, 7, 8], rankings, commish: 'a', draft: { ...done(['a', 'b', 'c', 'd'], { a: 'b', c: 'd' }), squads } }));
    expect(weeks[1]?.data).toMatchObject({ mode: 'teamWeek', teams: squads });
    expect(weeks[7]?.data).toMatchObject({ mode: 'teamWeek', teams: squads });
    expect(weeks[2]?.data.teams).toBeUndefined();
    const plain = weeksOf(scheduleDocs({ status: 'draft', regularWeeks: 3, groupWeeks: [3], rankings, commish: 'a', draft: done(['a', 'b', 'c', 'd'], { a: 'b', c: 'd' }) }));
    expect(plain[2]?.data.teams).toEqual({ blue: ['a', 'c'], orange: ['b', 'd'] });
  });

  it("Team Week's players may demolish anyone on the other squad; 2v2, Bounty and Alley weeks list the whole league; the season keeps each week's mode", () => {
    const rankings = { a: ['teamWeek', 'twoVTwo', 'bounty', 'alley', 'rumble', 'dropShot'] };
    const squads = { blue: ['a', 'd'], orange: ['b', 'c'] };
    const result = scheduleDocs({ status: 'draft', regularWeeks: 6, groupWeeks: [2, 3, 4, 5], rankings, commish: 'a', draft: { ...done(['a', 'b', 'c', 'd'], { a: 'b', c: 'd' }), squads } });
    if ('skip' in result) throw new Error(result.skip);
    expect(result.modes).toEqual({ 2: 'teamWeek', 3: 'twoVTwo', 4: 'bounty', 5: 'alley' });
    expect(result.weeks[1]?.data.targets).toEqual({ a: ['b', 'c'], d: ['b', 'c'], b: ['a', 'd'], c: ['a', 'd'] });
    // The 2v2 duos are drawn on the week's Monday, so nobody has a target before then.
    expect(result.weeks[2]?.data).toMatchObject({ mode: 'twoVTwo', roster: ['a', 'b', 'c', 'd'], targets: {} });
    expect(result.weeks[3]?.data).toMatchObject({ mode: 'bounty', roster: ['a', 'b', 'c', 'd'], targets: {} });
    expect(result.weeks[4]?.data).toMatchObject({ mode: 'alley', roster: ['a', 'b', 'c', 'd'], targets: {} });
    expect(result.weeks[0]?.data.roster).toBeUndefined();
  });

  it("Each week keeps the date of its Monday, which the rules read to close a week's group-play settings when it starts", () => {
    const weeks = weeksOf(scheduleDocs({ status: 'draft', regularWeeks: 3, kickoff: '2027-01-04', draft: done(['a', 'b', 'c', 'd'], { a: 'b', c: 'd' }) }));
    expect(weeks.map((week) => week.data.monday)).toEqual(['2027-01-04', '2027-01-11', '2027-01-18']);
  });

  it('Without group-play weeks, every week is a normal 1v1 week', () => {
    const weeks = weeksOf(scheduleDocs({ status: 'draft', regularWeeks: 6, groupWeeks: [], draft: done(['a', 'b', 'c', 'd'], { a: 'b', c: 'd' }) }));
    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.data.mode === 'regular' && week.data.pairs.length === 2)).toBe(true);
    expect(weeks.map((week) => week.data.week)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
