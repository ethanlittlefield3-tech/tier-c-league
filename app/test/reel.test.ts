import { describe, expect, it } from 'vitest';
import { reelCard } from '../src/reel/card.ts';

const NAMES: Record<string, string> = { maya: 'Maya', jordan: 'Jordan', sam: 'Sam', alex: 'Alex' };
const name = (player: string) => NAMES[player] ?? 'The House';
const carOf = (player: string) => (player === 'maya' ? { body: 'bruiser', paint: 'racingRed' } : null);
const result = (opponent: string, points: number, opponentPoints: number) => ({ opponent, points, opponentPoints, outcome: (points > opponentPoints ? 'win' : points < opponentPoints ? 'loss' : 'draw') as 'win' | 'loss' | 'draw' });

describe('The highlight reel', () => {
  it("A week's card shows its MVP with their car and points, its storylines, every result winner first, and the Bust, by real names", () => {
    const card = reelCard({
      league: 'Sunday Squad',
      week: 1,
      name,
      carOf,
      weeks: [
        {
          week: 1,
          results: { jordan: result('maya', 10, 32), maya: result('jordan', 32, 10), alex: result('sam', 15, 15), sam: result('alex', 15, 15) },
          awards: { mvp: ['maya'], bust: ['jordan'], wheel: ['jordan'] },
        },
      ],
    });
    expect(card).toMatchObject({ week: 1, mvp: { name: 'Maya', points: 32, car: { body: 'bruiser', paint: 'racingRed' } }, bust: 'Jordan', headlines: ['Maya crushed Jordan by 22'], results: ['Maya 32–10 Jordan', 'Alex 15–15 Sam'] });
    expect(card?.text).toBe('Sunday Squad: Week 1 highlights\nMVP: Maya, 32 points\nMaya crushed Jordan by 22\nMaya 32–10 Jordan\nAlex 15–15 Sam\nBust: Jordan');
  });

  it("A group-play week's card lists the mode's results: the sides, the Bounty, the race or the floors", () => {
    const card = reelCard({
      league: 'Sunday Squad',
      week: 3,
      name,
      carOf,
      weeks: [
        {
          week: 3,
          results: { maya: { opponent: 'GROUP', points: 30, opponentPoints: 0, outcome: 'none' }, sam: { opponent: 'GROUP', points: 20, opponentPoints: 0, outcome: 'none' } },
          awards: { mvp: ['maya'], bust: [], wheel: ['sam'] },
          group: { mode: 'alley', race: [{ player: 'maya', race: 30, walls: 0, place: 1 }, { player: 'sam', race: 16, walls: 2, place: 2 }] },
        },
      ],
    });
    expect(card?.results).toEqual(['1st in the Alley: Maya, 30 race points, +5', '2nd in the Alley: Sam, 16 race points, +3']);
  });

  it('A week with no results yet has no card', () => {
    expect(reelCard({ league: 'Sunday Squad', week: 2, name, carOf, weeks: [{ week: 2 }] })).toBeNull();
  });
});
