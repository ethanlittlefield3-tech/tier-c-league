import { describe, expect, it } from 'vitest';
import { addDays, localDate } from '../../engine/src/calendar.ts';
import { playerWeek } from '../../engine/src/days.ts';
import { DEMO_PLAYERS, demoDocs } from '../lib/demo.ts';
import { newLeague } from '../lib/league-seed.ts';

const NY = 'America/New_York';
const NOW = Date.UTC(2027, 0, 20, 17); // Wednesday Jan 20, 2027, noon in New York
let seed = 1;
const random = (bytes: number) => Uint8Array.from({ length: bytes }, () => (seed = (seed * 48271) % 2147483647) & 255);
const league = newLeague({ name: 'Demo League', random });
const fakes = DEMO_PLAYERS.map((_, n) => ({ id: `fake${n}`, key: `TCL-FAKE-00${n}A`.replace('0', 'Q') }));
const docs = demoDocs({ league, fakes, now: NOW, timeZone: NY });
const at = (path: string) => docs.find((doc) => doc.path === path)?.data;
const season = `leagues/${league.id}/seasons/s1`;

describe('The demo league', () => {
  it('Is a league of its own, marked demo, with the commish and five made-up players, closed to joining', () => {
    const root = at(`leagues/${league.id}`);
    expect(root).toMatchObject({ demo: true, joining: 'closed', season: 's1', commish: league.commish });
    expect(Object.keys(root?.members as object)).toHaveLength(6);
    expect(DEMO_PLAYERS.map((player) => player.name)).toEqual(['Maya', 'Jordan', 'Sam', 'Riley', 'Jo']);
  });

  it('Has a season in its third week, with the whole calendar and a schedule for every week', () => {
    expect(at(season)).toMatchObject({ status: 'active', kickoff: '2027-01-04', regularWeeks: 6 });
    expect(docs.filter((doc) => doc.path.startsWith(`${season}/calendar/`))).toHaveLength(42);
    expect(docs.filter((doc) => doc.path.startsWith(`${season}/weeks/`))).toHaveLength(6);
  });

  it('Logs every day before today for everyone, and the commish has the lowest score in Weeks 1 and 2, so the commish spins the Wheel', () => {
    const today = localDate(NOW, NY);
    const days = docs.filter((doc) => doc.path.startsWith(`${season}/days/`));
    expect(days.every((doc) => String(doc.data.date) <= today)).toBe(true);
    const calendar = docs.filter((doc) => doc.path.startsWith(`${season}/calendar/`)).map((doc) => doc.data);
    for (const period of ['w01', 'w02']) {
      const weekDays = calendar.filter((day) => day.period === period).map((day) => ({ ...(day as object), start: (day.start as Date).getTime(), lock: (day.lock as Date).getTime() })) as never[];
      const points = (player: string) =>
        playerWeek({
          par: 3,
          days: weekDays,
          logs: Object.fromEntries(days.filter((doc) => doc.data.player === player).map((doc) => [doc.data.date, doc.data])) as never,
          kit: [],
          demolitionsOn: [],
          adjustments: [],
          now: NOW,
          timeZone: NY,
        }).totals.points;
      const mine = points(league.commish);
      for (const fake of fakes) expect(points(fake.id)).toBeGreaterThan(mine);
    }
  });

  it("Has a receipt waiting on the commish, on yesterday's Body goal", () => {
    const yesterday = addDays(localDate(NOW, NY), -1);
    const receipt = at(`${season}/receipts/${league.commish}_${yesterday}_body`);
    expect(receipt).toMatchObject({ target: league.commish, by: 'fake0', square: 'body', proofAt: null, backedDownAt: null });
    expect(at(`${season}/days/${league.commish}_${yesterday}`)).toMatchObject({ goals: { body: true } });
  });

  it('Has wall posts, one aimed at the commish, and dares for the Wheel', () => {
    expect(docs.filter((doc) => doc.path.startsWith(`leagues/${league.id}/wall/`) && !doc.path.includes('/comments/'))).toHaveLength(3);
    expect(at(`leagues/${league.id}/wall/demo1`)).toMatchObject({ kind: 'quick', to: league.commish });
    expect(docs.filter((doc) => doc.path.startsWith(`${season}/dares/`))).toHaveLength(5);
  });
});
