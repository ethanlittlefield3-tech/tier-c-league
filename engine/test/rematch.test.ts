import { describe, expect, it } from 'vitest';
import { rematchFor, rematchResult } from '../src/rematch.ts';

const week = (status: string, outcome: string, opponent = 'maya') => ({ status, results: { riley: { opponent, outcome, points: 18, opponentPoints: 22 } } });

describe('Rematch challenges', () => {
  it('After a final week you lost to a player, you can challenge them', () => {
    expect(rematchFor('riley', week('final', 'loss'))).toEqual({ to: 'maya', points: 18, against: 22 });
  });

  it('Not after a win or a draw, not against The House or a squad, and not before the week is final', () => {
    expect(rematchFor('riley', week('final', 'win'))).toBeNull();
    expect(rematchFor('riley', week('final', 'draw'))).toBeNull();
    expect(rematchFor('riley', week('final', 'loss', 'HOUSE'))).toBeNull();
    // A Team Week or 2v2 loss was to a side, not one player.
    expect(rematchFor('riley', week('final', 'loss', 'GROUP'))).toBeNull();
    expect(rematchFor('riley', week('provisional', 'loss'))).toBeNull();
    expect(rematchFor('riley', null)).toBeNull();
  });

  it('Most points in the race week wins the side race; level points means nobody wins', () => {
    expect(rematchResult('riley', 'maya', 25, 20)).toEqual({ winner: 'riley', loser: 'maya' });
    expect(rematchResult('riley', 'maya', 19, 20)).toEqual({ winner: 'maya', loser: 'riley' });
    expect(rematchResult('riley', 'maya', 20, 20)).toEqual({ winner: null, loser: null });
  });
});
