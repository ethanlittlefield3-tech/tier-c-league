import { describe, expect, it } from 'vitest';
import { addRecords, bestPickers, oddsCalled, pickFor, pickUpset, scorePicks } from '../src/predictions.ts';

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

  it("The week's biggest upset is the win the fewest pickers saw coming: picked by under half of those who picked that matchup", () => {
    const week = [...pairs, { a: 'kim', b: 'lee' }];
    const done = { ...results, kim: { outcome: 'loss' }, lee: { outcome: 'win' } };
    // Maya won with 1 of 4 behind her; Lee won with 1 of 3.
    const lists = [['sam', 'kim'], ['sam', 'kim'], ['maya', 'lee'], ['sam']];
    expect(pickUpset(lists, week, done)).toEqual({ winner: 'maya', loser: 'sam', pickedBy: 1, of: 4 });
    // Nobody at all saw it coming counts too.
    expect(pickUpset([['sam'], ['sam']], week, done)).toEqual({ winner: 'maya', loser: 'sam', pickedBy: 0, of: 2 });
  });

  it('There is no upset when every winner had half or more of the picks, when a matchup was drawn, or when nobody picked', () => {
    expect(pickUpset([['maya'], ['sam']], pairs, results)).toBeNull();
    expect(pickUpset([['alex'], ['alex'], ['alex']], pairs, results)).toBeNull();
    expect(pickUpset([[], []], pairs, results)).toBeNull();
  });

  it('The odds called a matchup when the favorite won; an even matchup, a draw or The House is not counted', () => {
    const week = [...pairs, { a: 'kim', b: 'lee' }];
    const done = { ...results, kim: { outcome: 'win' }, lee: { outcome: 'loss' } };
    // Maya was favored and won; Kim was the underdog and won; Alex and Jordan drew.
    const odds = { 'maya-sam': 0.6, 'alex-jordan': 0.7, 'kim-lee': 0.3, 'riley-HOUSE': 0.9 };
    expect(oddsCalled(week, odds, done)).toEqual({ called: 1, of: 2 });
    expect(oddsCalled(week, { ...odds, 'maya-sam': 0.5 }, done)).toEqual({ called: 0, of: 1 });
  });

  it("A season's record adds up its weeks", () => {
    expect(addRecords([{ made: 3, right: 2 }, { made: 4, right: 1 }])).toEqual({ made: 7, right: 3 });
  });
});
