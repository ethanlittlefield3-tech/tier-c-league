import { describe, expect, it } from 'vitest';
import { groupLines } from '../src/group/words.ts';

const NAMES: Record<string, string> = { riley: 'Riley', maya: 'Maya', sam: 'Sam', jo: 'Jo', HOUSE: 'The House' };
const name = (player: string) => NAMES[player] ?? 'a former player';
const side = (sideName: string, players: string[], points: number) => ({ name: sideName, players, points });
const text = (group: Parameters<typeof groupLines>[0]) => groupLines(group, name)?.map((line) => line.text);

describe("A group-play week's results, in words", () => {
  it('Team Week and 2v2 compare the averages, the winning side first', () => {
    expect(text({ mode: 'teamWeek', matches: [{ a: side('blue', ['riley'], 24.5), b: side('orange', ['sam'], 27), winner: 'b' }] })).toEqual(['Orange beat Blue 27–24.5 on average']);
    expect(
      text({
        mode: 'twoVTwo',
        matches: [
          { a: side('duo', ['riley', 'maya'], 30), b: side('house', ['HOUSE'], 28.25), winner: 'a' },
          { a: side('duo', ['sam', 'jo'], 20), b: side('duo', ['ann', 'bo'], 20), winner: null },
        ],
      }),
    ).toEqual(['Riley & Maya beat The House duo 30–28.3 on average', 'Sam & Jo drew with a former player & a former player 20–20 on average']);
  });

  it('The Bounty says whether it was hit, how far it got, and who broke a day target', () => {
    expect(text({ mode: 'bounty', target: { kind: 'hits', lane: 'body', count: 40 }, total: 42, needed: 40, hit: true, broke: [] })).toEqual(['The Bounty was hit, 42 of 40: 40 Body hits across the league. +3 for everyone.']);
    expect(text({ mode: 'bounty', target: { kind: 'dry', date: '2027-01-15' }, total: 3, needed: 4, hit: false, broke: ['jo'] })).toEqual(['The Bounty was missed: No beers league-wide on Friday. Broken by Jo.']);
  });

  it('The Alley lists every place, with the bonus for the top three and last place marked', () => {
    const race = [
      { player: 'riley', race: 33, walls: 0, place: 1 },
      { player: 'sam', race: 27, walls: 0, place: 2 },
      { player: 'maya', race: 21, walls: 0, place: 3 },
      { player: 'jo', race: 3, walls: 6, place: 4 },
    ];
    expect(text({ mode: 'alley', race })).toEqual([
      '1st in the Alley: Riley, 33 race points, +5',
      '2nd in the Alley: Sam, 27 race points, +3',
      '3rd in the Alley: Maya, 21 race points, +1',
      '4th in the Alley: Jo, 3 race points, last',
    ]);
  });

  it('Drop Shot says who broke more tiles, the winner first', () => {
    expect(text({ mode: 'dropShot', floors: [{ a: 'riley', b: 'maya', aDaily: [4, 0, 0, 0, 0, 0, 0], bDaily: [0, 2, 2, 2, 0, 0, 0], winner: 'b' }] })).toEqual(['Maya beat Riley, 3–2 in tiles broken']);
  });

  it('A 1v1 week has no group-play summary, so its screen words it', () => {
    expect(groupLines(null, name)).toBeNull();
  });
});
