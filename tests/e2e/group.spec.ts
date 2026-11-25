import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import { addPlayer, createLeague, finishWeekOne, readDoc, startSeason, thisWeek, writeDoc, type TestLeague } from './league.ts';

const run = promisify(execFile);
const weeklyJob = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));

/** Runs the real weekly job against the local database, for one league. */
async function runWeekly(league: TestLeague): Promise<string> {
  const { stdout } = await run(process.execPath, [weeklyJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
  return stdout;
}

type Goals = { mind: boolean; body: boolean; wildcard: boolean };
const ALL: Goals = { mind: true, body: true, wildcard: true };
const ONE: Goals = { mind: true, body: false, wildcard: false };
const NONE: Goals = { mind: false, body: false, wildcard: false };

/** A logged day: the goals listed, 30 minutes of screen time, no beers. */
const logged = (player: string, date: string, goals: Goals) => ({ player, date, goals, screenMinutes: 30, beers: 0, firstAt: new Date(), updatedAt: new Date() });

type Result = { opponent: string; points: number; outcome: string; bonus: number; seasonPoints: number; side?: { name: string; points: number }; race?: { points: number; walls: number; place: number } };

test.describe('Group play', () => {
  test("The weekly job settles a Team Week by the squads' averages: the winners get 3 each, and nobody gets a rivalry record from it", async ({ request }) => {
    const league = await createLeague(request, { name: 'Squad Goals' });
    const season = await startSeason(request, league);
    for (const [id, name] of [['riley', 'Riley'], ['maya', 'Maya'], ['sam', 'Sam'], ['jo', 'Jo']]) await addPlayer(request, league, season, id!, name!);
    await writeDoc(request, `${season.path}/weeks/w01`, {
      week: 1,
      mode: 'teamWeek',
      pairs: [],
      teams: { blue: ['riley', 'maya'], orange: ['sam', 'jo'] },
      targets: { riley: ['sam', 'jo'], maya: ['sam', 'jo'], sam: ['riley', 'maya'], jo: ['riley', 'maya'] },
    });
    const dates = await finishWeekOne(request, season);
    // Blue: Riley hits all three every day, Maya one. Orange: both hit one.
    for (const date of dates.slice(0, 6)) {
      await writeDoc(request, `${season.path}/days/riley_${date}`, logged('riley', date, ALL));
      for (const player of ['maya', 'sam', 'jo']) await writeDoc(request, `${season.path}/days/${player}_${date}`, logged(player, date, ONE));
    }

    expect(await runWeekly(league)).toContain('w01: final, 4 players.');
    const week = await readDoc(request, `${season.path}/weeks/w01`);
    const results = week?.results as Record<string, Result>;
    // Riley 33 and Maya 21 average 27; Sam and Jo average 21. Sunday is each one's blank rest day: -3.
    expect(results.riley).toMatchObject({ opponent: 'GROUP', points: 33, outcome: 'win', bonus: 3, seasonPoints: 36, side: { name: 'blue', points: 27 } });
    expect(results.maya).toMatchObject({ points: 21, outcome: 'win', seasonPoints: 24 });
    expect(results.sam).toMatchObject({ points: 21, outcome: 'loss', bonus: 0, seasonPoints: 21 });
    expect(week?.group).toMatchObject({ mode: 'teamWeek', matches: [{ winner: 'a', decidedBy: 'points' }] });
    // A squad isn't one player: no rivalry records.
    expect((await readDoc(request, `leagues/${league.id}/players/riley`))?.rivals ?? {}).toEqual({});
    // The standings count the bonus.
    const rows = (await readDoc(request, `${season.path}/standings/current`))?.rows as { player: string; seasonPoints: number }[];
    expect(rows[0]).toMatchObject({ player: 'riley', seasonPoints: 36 });
  });

  test('An Alley week is a race: 1st, 2nd and 3rd get 5, 3 and 1, a day with no goals hits the wall, and last place spins', async ({ request }) => {
    const league = await createLeague(request, { name: 'Bowling Night' });
    const season = await startSeason(request, league);
    for (const [id, name] of [['riley', 'Riley'], ['maya', 'Maya'], ['sam', 'Sam'], ['jo', 'Jo']]) await addPlayer(request, league, season, id!, name!);
    await writeDoc(request, `${season.path}/weeks/w01`, { week: 1, mode: 'alley', pairs: [], roster: ['riley', 'maya', 'sam', 'jo'], targets: {} });
    const dates = await finishWeekOne(request, season);
    for (const date of dates.slice(0, 6)) {
      await writeDoc(request, `${season.path}/days/riley_${date}`, logged('riley', date, ALL));
      await writeDoc(request, `${season.path}/days/maya_${date}`, logged('maya', date, ONE));
      await writeDoc(request, `${season.path}/days/sam_${date}`, logged('sam', date, { mind: true, body: true, wildcard: false }));
      // Jo logs screen time but no goals: the wall, every day but Sunday.
      await writeDoc(request, `${season.path}/days/jo_${date}`, logged('jo', date, NONE));
    }

    expect(await runWeekly(league)).toContain('w01: final, 4 players.');
    const week = await readDoc(request, `${season.path}/weeks/w01`);
    const results = week?.results as Record<string, Result>;
    expect(results.riley).toMatchObject({ outcome: 'none', bonus: 5, seasonPoints: 38, race: { points: 33, walls: 0, place: 1 } });
    expect(results.sam).toMatchObject({ bonus: 3, race: { place: 2 } });
    expect(results.maya).toMatchObject({ bonus: 1, race: { place: 3 } });
    // Jo: 15 points, less 2 for each of 6 walls, is 3 race points. Season Points still count the 15.
    expect(results.jo).toMatchObject({ bonus: 0, seasonPoints: 15, race: { points: 3, walls: 6, place: 4 } });
    expect((week?.awards as { wheel: string[] }).wheel).toEqual(['jo']);
  });

  test("A 2v2 week's duos are drawn once it starts on Monday, with who each player may demolish", async ({ request }) => {
    const league = await createLeague(request, { name: 'Double Trouble' });
    const season = await startSeason(request, league);
    for (const [id, name] of [['riley', 'Riley'], ['maya', 'Maya'], ['sam', 'Sam'], ['jo', 'Jo']]) await addPlayer(request, league, season, id!, name!);
    // This week, which has started: today is always in Week 2.
    const { period } = thisWeek(season);
    await writeDoc(request, `${season.path}/weeks/${period}`, { week: 2, mode: 'twoVTwo', pairs: [], roster: ['riley', 'maya', 'sam', 'jo'], targets: {} });

    expect(await runWeekly(league)).toContain(`${period}: 1 2v2 matchup drawn.`);
    const week = await readDoc(request, `${season.path}/weeks/${period}`);
    const duos = week?.duos as { a: string[]; b: string[] }[];
    expect(duos).toHaveLength(1);
    expect([...duos[0]!.a, ...duos[0]!.b].sort()).toEqual(['jo', 'maya', 'riley', 'sam']);
    const targets = week?.targets as Record<string, string[]>;
    for (const player of duos[0]!.a) expect(targets[player]).toEqual(duos[0]!.b);
    for (const player of duos[0]!.b) expect(targets[player]).toEqual(duos[0]!.a);
    // Drawn once: running again changes nothing.
    expect(await runWeekly(league)).not.toContain('drawn');
    expect((await readDoc(request, `${season.path}/weeks/${period}`))?.duos).toEqual(duos);
  });
});
