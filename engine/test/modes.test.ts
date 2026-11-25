import { describe, expect, it } from 'vitest';
import { GROUP_MODES, groupWeekModes, modeStandings, validRanking } from '../src/modes.ts';

const ranked = (...first: string[]) => [...first, ...GROUP_MODES.filter((mode) => !first.includes(mode))];

describe('The group-play vote', () => {
  it('A ranking names each of the six modes exactly once', () => {
    expect(validRanking(ranked('alley'))).toBe(true);
    expect(validRanking(ranked('alley').slice(1))).toBe(false);
    expect(validRanking(['rumble', 'rumble', 'twoVTwo', 'bounty', 'dropShot', 'alley'])).toBe(false);
    expect(validRanking('alley')).toBe(false);
  });

  it('Each ranking gives its first choice 6 points, down to 1 for its last, and the most points tops the vote', () => {
    const standings = modeStandings({ maya: ranked('alley', 'rumble'), sam: ranked('alley', 'dropShot') }, null);
    expect(standings[0]).toEqual({ mode: 'alley', points: 12 });
    // Alley 12, Rumble 9, Team Week 7, Drop Shot 6.
    expect(standings.map((entry) => entry.mode).slice(0, 4)).toEqual(['alley', 'rumble', 'teamWeek', 'dropShot']);
  });

  it("A tie goes to the commish's own ranking, then to SCOPE.md's order", () => {
    // Maya puts Alley first and Drop Shot last; Alex, the commish, the other way round: 7 points each.
    const rankings = { maya: ranked('alley', 'rumble', 'teamWeek', 'twoVTwo', 'bounty', 'dropShot'), alex: ranked('dropShot', 'rumble', 'teamWeek', 'twoVTwo', 'bounty', 'alley') };
    expect(modeStandings(rankings, 'alex').slice(0, 2).map((entry) => entry.mode)).toEqual(['rumble', 'teamWeek']);
    expect(modeStandings(rankings, 'alex').filter((entry) => entry.points === 7).map((entry) => entry.mode)).toEqual(['dropShot', 'alley']);
    expect(modeStandings({}, null).map((entry) => entry.mode)).toEqual([...GROUP_MODES]);
  });

  it('The top-ranked modes fill the group-play weeks in order, the top one first; with more weeks than modes, the order repeats', () => {
    const standings = modeStandings({ maya: ranked('alley', 'bounty') }, null);
    expect(groupWeekModes([5, 3], standings)).toEqual({ 3: 'alley', 5: 'bounty' });
    expect(Object.values(groupWeekModes([2, 3, 4, 5, 6, 7, 8], standings))).toEqual(['alley', 'bounty', 'rumble', 'teamWeek', 'twoVTwo', 'dropShot', 'alley']);
  });
});
