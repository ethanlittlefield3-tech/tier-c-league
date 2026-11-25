import { describe, expect, it } from 'vitest';
import { addRecords, bestPickers, pickFor, scorePicks } from '../src/predictions.ts';

const pairs = [
  { a: 'maya', b: 'sam' },
  { a: 'alex', b: 'jordan' },
  { a: 'riley', b: 'HOUSE' },
];
const results = { maya: { outcome: 'win' }, sam: { outcome: 'loss' }, alex: { outcome: 'draw' }, jordan: { outcome: 'draw' }, riley: { outcome: 'win' } };

describe('Predictions', () => {
  it('A pick is one of the two players in a matchup; picking both, or neither, is no pick, and matchups with The House are not picked', () => {
    expect(pickFor(['maya'], pairs[0]!)).toBe('maya');
    expect(pickFor(['maya', 'sam'], pairs[0]!)).toBeNull();
    expect(pickFor([], pairs[0]!)).toBeNull();
    expect(pickFor(['riley'], pairs[2]!)).toBeNull();
  });

  it('A pick is right when the player picked won; a draw makes every pick on it wrong', () => {
    expect(scorePicks(['maya', 'alex', 'riley'], pairs, results)).toEqual({ made: 2, right: 1 });
    expect(scorePicks(['sam', 'jordan'], pairs, results)).toEqual({ made: 2, right: 0 });
  });

  it('The best record is the most right picks; a tie goes to fewer picks made, and players still level share it', () => {
    expect(bestPickers({ maya: { made: 5, right: 4 }, sam: { made: 5, right: 3 } })).toEqual(['maya']);
    expect(bestPickers({ maya: { made: 5, right: 4 }, sam: { made: 4, right: 4 } })).toEqual(['sam']);
    expect(bestPickers({ maya: { made: 4, right: 4 }, sam: { made: 4, right: 4 } })).toEqual(['maya', 'sam']);
  });

  it('Nobody is top picker without a single right pick', () => {
    expect(bestPickers({ maya: { made: 3, right: 0 } })).toEqual([]);
    expect(bestPickers({})).toEqual([]);
  });

  it("A season's record adds up its weeks", () => {
    expect(addRecords([{ made: 3, right: 2 }, { made: 4, right: 1 }])).toEqual({ made: 7, right: 3 });
  });
});
