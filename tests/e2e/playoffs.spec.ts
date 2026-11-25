import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { addDays, localDate } from '../../engine/src/calendar.ts';
import { calendarDocs, mondayOf } from '../../jobs/lib/calendar-docs.ts';
import { addPlayer, createLeague, patchDoc, readDoc, writeDoc, writeDocs, type TestLeague } from './league.ts';

const run = promisify(execFile);
const weeklyJob = fileURLToPath(new URL('../../jobs/weekly.ts', import.meta.url));

async function runWeekly(league: TestLeague): Promise<string> {
  const { stdout } = await run(process.execPath, [weeklyJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
  return stdout;
}

type Goals = { mind: boolean; body: boolean; wildcard: boolean };
const goals = (count: number): Goals => ({ mind: count >= 1, body: count >= 2, wildcard: count >= 3 });

/**
 * A one-week season with a one-week, top-4 playoff, all of it over: kickoff
 * three Mondays ago, so the playoff week ran from two Mondays ago. Week 1 is
 * final, with the six players in Season Points order; the commish, who plays
 * too, logged nothing and is last.
 */
async function pastPlayoffs(request: APIRequestContext) {
  const league = await createLeague(request, { name: 'Bracket Busters' });
  const timeZone = 'America/New_York';
  const kickoff = addDays(mondayOf(localDate(Date.now(), timeZone)), -21);
  const path = `leagues/${league.id}/seasons/s1`;
  const players = ['riley', 'maya', 'sam', 'jo', 'kim', 'lee'];
  for (const player of players) await addPlayer(request, league, { path, timeZone, par: 3, kickoff, today: '', yesterday: '' }, player, player.charAt(0).toUpperCase() + player.slice(1));
  await writeDoc(request, path, { name: 'Season 1', status: 'active', regularWeeks: 1, playoffs: 'oneWeek', playoffSize: 4, par: 3, groupWeeks: [], timeZone, kickoff, draftAt: null, joinMidSeason: false, holidayEvents: false });
  await patchDoc(request, `leagues/${league.id}`, { season: 's1' });
  const calendar = calendarDocs({ kickoff, regularWeeks: 1, timeZone, playoffs: 'oneWeek', playoffSize: 4 });
  await writeDocs(request, calendar.map((doc) => ({ path: `${path}/calendar/${doc.id}`, data: doc.data as never })));
  // Week 1, final: Season Points in the players' order.
  const results = Object.fromEntries(players.map((player, at) => [player, { player, opponent: players[at % 2 === 0 ? at + 1 : at - 1]!, points: 30 - at, beers: 0, opponentPoints: 0, opponentBeers: 0, outcome: 'win', seasonPoints: 30 - at }]));
  await writeDoc(request, `${path}/weeks/w01`, { week: 1, period: 'w01', mode: 'regular', pairs: [], targets: {}, status: 'final', results, lines: players.map((player, at) => ({ player, points: 30 - at, beers: 0, perfectDays: 0 })) });
  const days = (period: string) => calendar.filter((doc) => doc.data.period === period && doc.data.kind === 'play').map((doc) => doc.id);
  const log = (player: string, date: string, count: number) =>
    writeDoc(request, `${path}/days/${player}_${date}`, { player, date, goals: goals(count), screenMinutes: 30, beers: 0, firstAt: new Date(), updatedAt: new Date() });
  return { league, path, days, log };
}

test.describe('The playoffs', () => {
  test('The weekly job seeds the bracket from the standings, settles the semifinals and then the final, and crowns the champion with trophies and the league banner', async ({ request }) => {
    const { league, path, days, log } = await pastPlayoffs(request);
    await writeDoc(request, `${path}/config/seasonDare`, { text: 'Sing the anthem at the next game', audit: 'a1' });
    // Semifinals: 1 Riley against 4 Jo, 2 Maya against 3 Sam. Jo and Maya win.
    // The Whiff Bowl: Kim, the best seed of three, is safe; Lee beats the commish, who logs nothing.
    for (const date of days('p01')) {
      for (const [player, count] of [['riley', 1], ['jo', 3], ['maya', 3], ['sam', 2], ['kim', 2], ['lee', 1]] as const) await log(player, date, count);
    }
    // The final: Maya beats Jo.
    for (const date of days('p02')) {
      await log('maya', date, 3);
      await log('jo', date, 2);
    }

    expect(await runWeekly(league)).toContain('playoffs seeded, 4 in and 3 in the Whiff Bowl.');
    expect(await readDoc(request, `${path}/weeks/p01`)).toMatchObject({ phase: 'playoff', round: 'semi', pairs: [{ a: 'riley', b: 'jo' }, { a: 'maya', b: 'sam' }, { a: 'lee', b: league.commish }] });

    expect(await runWeekly(league)).toContain('semifinals settled.');
    expect(await readDoc(request, `${path}/weeks/p02`)).toMatchObject({ round: 'final', pairs: [{ a: 'jo', b: 'maya' }] });
    expect(((await readDoc(request, `${path}/playoffs/bracket`))?.whiff as { loser: string }).loser).toBe(league.commish);

    expect(await runWeekly(league)).toContain('champion crowned.');
    expect(await readDoc(request, `${path}/playoffs/bracket`)).toMatchObject({ champion: 'maya', finalist: 'jo' });
    expect((await readDoc(request, `leagues/${league.id}`))?.banner).toEqual({ player: 'maya', season: 's1' });
    expect((await readDoc(request, `leagues/${league.id}/trophies/s1`))?.trophies).toMatchObject({ champion: { winners: ['maya'] }, finalist: { winners: ['jo'] }, whiffBowl: { winners: [league.commish] } });
    // Playoff points never become Season Points.
    const rows = (await readDoc(request, `${path}/standings/current`))?.rows as { player: string; seasonPoints: number }[];
    expect(rows.find((row) => row.player === 'maya')?.seasonPoints).toBe(29);

    // The next run gives out the badges: Champion and Finalist.
    await runWeekly(league);
    expect(Object.keys(((await readDoc(request, `leagues/${league.id}/players/maya`))?.badges ?? {}) as Record<string, unknown>)).toEqual(expect.arrayContaining(['champion', 'finalist']));
    expect(Object.keys(((await readDoc(request, `leagues/${league.id}/players/jo`))?.badges ?? {}) as Record<string, unknown>)).toContain('finalist');

    // The Whiff Bowl's loser spins the Wheel, and it holds only the Season Dare the commish picked.
    const final = await readDoc(request, `${path}/weeks/p02`);
    expect(final).toMatchObject({ awards: { wheel: [league.commish] }, seasonDare: 'Sing the anthem at the next game' });
    expect((final?.wheel as Record<string, { pool: string[] }>)[`p02_${league.commish}_1`]?.pool).toEqual(['Sing the anthem at the next game']);
  });
});
