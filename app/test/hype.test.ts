import { describe, expect, it } from 'vitest';
import { hypeCard } from '../src/reel/hype.ts';

describe('The season hype card', () => {
  it("It shows the kickoff, the season's length, everyone's car, the group-play weeks and Week 1, by real names", () => {
    const names: Record<string, string> = { maya: 'Maya', sam: 'Sam', alex: 'Alex' };
    const card = hypeCard({
      league: 'Sunday Squad',
      season: 'Season 1',
      kickoff: 'Mon Jan 4',
      regularWeeks: 6,
      players: [
        { id: 'maya', name: 'Maya', car: { body: 'bruiser' } },
        { id: 'sam', name: 'Sam', car: null },
        { id: 'alex', name: 'Alex', car: null },
      ],
      weeks: [
        { week: 1, mode: 'regular', pairs: [{ a: 'maya', b: 'sam' }, { a: 'alex', b: 'HOUSE' }] },
        { week: 3, mode: 'dropShot', pairs: [] },
        { week: 5, mode: 'alley', pairs: [] },
      ],
      name: (player) => names[player] ?? 'The House',
    });
    expect(card.groupWeeks).toEqual(['Week 3: Drop Shot', 'Week 5: Alley']);
    expect(card.week1).toEqual(['Maya vs Sam', 'Alex vs The House']);
    expect(card.text).toBe('Sunday Squad: Season 1 kicks off Mon Jan 4\n6 weeks, 3 players\nGroup play: Week 3: Drop Shot · Week 5: Alley\nWeek 1: Maya vs Sam · Alex vs The House');
  });
});
