import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { STARTER_DARES } from '../../engine/src/dares.ts';
import { enterAsCommish, joinAs } from './helpers.ts';
import { addPlayer, createLeague, patchDoc, readDoc, setGoals, startSeason, thisWeek, writeDoc } from './league.ts';

const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });
const tile = (page: Page, item: string) => page.locator(`.power-tile[data-item="${item}"]`);
const goal = (page: Page, lane: string) => page.locator(`.check-goal[data-lane="${lane}"]`);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const short = (date: string) => DAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7]!;

/** Riley joins a season with Maya, Sam and Jo, and saves the key. */
async function withFour(page: Page, request: APIRequestContext) {
  const league = await createLeague(request, { name: 'Bracket Busters' });
  const season = await startSeason(request, league);
  const key = await joinAs(page, league, 'Riley');
  const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
  await setGoals(request, season, me, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
  for (const [id, name] of [['maya', 'Maya'], ['sam', 'Sam'], ['jo', 'Jo'], ['kim', 'Kim'], ['lee', 'Lee']] as const) await addPlayer(request, league, season, id, name);
  return { league, season, me };
}

test.describe('The playoffs on the phone', () => {
  test("In a semifinal, Today names your opponent, and the #1 seed has a second Full Boost that counts too", async ({ page, request }) => {
    const { season, me } = await withFour(page, request);
    // This week is the semifinal round, and Riley is the #1 seed.
    for (const date of thisWeek(season).dates) await patchDoc(request, `${season.path}/calendar/${date}`, { period: 'p01', phase: 'playoff' });
    await writeDoc(request, `${season.path}/playoffs/bracket`, {
      size: 4,
      seeds: [me, 'maya', 'sam', 'jo'],
      outside: ['kim', 'lee'],
      semis: [{ a: me, b: 'jo' }, { a: 'maya', b: 'sam' }],
      final: null,
      suddenDeath: false,
      whiff: { pairs: [{ a: 'kim', b: 'lee' }], safe: [], racers: [], loser: null },
      champion: null,
      finalist: null,
    });
    await writeDoc(request, `${season.path}/weeks/p01`, {
      week: 7,
      period: 'p01',
      phase: 'playoff',
      round: 'semi',
      mode: 'regular',
      pairs: [{ a: me, b: 'jo' }, { a: 'maya', b: 'sam' }, { a: 'kim', b: 'lee' }],
      targets: { [me]: ['jo'], jo: [me], maya: ['sam'], sam: ['maya'], kim: ['lee'], lee: ['kim'] },
    });
    await button(page, "I've saved it").click();
    await expect(page.locator('.mode-banner')).toContainText('Semifinal');
    await expect(page.locator('.mode-banner')).toContainText('You face Jo: the winner plays in the final.');

    await tile(page, 'fullBoost').click();
    await page.locator('.power-boost-day').filter({ hasText: short(season.today) }).getByRole('button', { name: /Count Body/ }).click();
    await expect(goal(page, 'body')).toHaveAttribute('data-state', 'boosted');
    const second = page.getByRole('group', { name: 'Your second Full Boost' });
    await expect(second).toContainText('As the #1 seed, you have a second Full Boost this round.');
    // Body is already boosted, so the second one offers the other goals.
    await expect(second.getByRole('button', { name: new RegExp(`Count Body\\s*on ${short(season.today)}`) })).toHaveCount(0);
    await second.getByRole('button', { name: new RegExp(`Count Wildcard\\s*on ${short(season.today)}`) }).click();
    await expect(goal(page, 'wildcard')).toHaveAttribute('data-state', 'boosted');
    await expect(goal(page, 'body')).toHaveAttribute('data-state', 'boosted');
    await expect.poll(async () => (await readDoc(request, `${season.path}/kit/p01_${me}_fullBoost2`))?.lane).toBe('wildcard');

    await button(page, 'Take back your second Full Boost').click();
    await expect(goal(page, 'wildcard')).not.toHaveAttribute('data-state', 'boosted');
    await expect.poll(() => readDoc(request, `${season.path}/kit/p01_${me}_fullBoost2`)).toBeNull();
  });

  test("League shows the bracket: the champion, each game's score with the winner first, and the Whiff Bowl's loser with the Season Dare", async ({ page, request }) => {
    const { league, season, me } = await withFour(page, request);
    await writeDoc(request, `${season.path}/playoffs/bracket`, {
      size: 4,
      seeds: ['maya', me, 'sam', 'jo'],
      outside: ['kim', 'lee'],
      semis: [
        { a: 'maya', b: 'jo', winner: 'maya', decidedBy: 'points' },
        { a: me, b: 'sam', winner: 'sam', decidedBy: 'points' },
      ],
      final: { a: 'maya', b: 'sam', winner: 'maya', decidedBy: 'points' },
      suddenDeath: false,
      whiff: { pairs: [{ a: 'kim', b: 'lee', winner: 'kim', decidedBy: 'points' }], safe: [], racers: ['lee'], loser: 'lee' },
      champion: 'maya',
      finalist: 'sam',
    });
    const result = (points: number, opponentPoints: number) => ({ points, opponentPoints, outcome: points > opponentPoints ? 'win' : 'loss' });
    await writeDoc(request, `${season.path}/weeks/p01`, { week: 7, period: 'p01', phase: 'playoff', round: 'semi', status: 'final', results: { maya: result(20, 14), [me]: result(12, 15), kim: result(10, 6) } });
    await writeDoc(request, `${season.path}/weeks/p02`, { week: 7, period: 'p02', phase: 'playoff', round: 'final', status: 'final', results: { maya: result(18, 16) } });
    await writeDoc(request, `${season.path}/config/seasonDare`, { text: 'Sing the anthem at the next game', audit: 'a1' });
    await patchDoc(request, `leagues/${league.id}`, { banner: { player: 'maya', season: 's1' } });
    await button(page, "I've saved it").click();
    await tab(page, 'League').click();

    const playoffs = page.locator('.playoffs');
    await expect(playoffs.locator('.playoffs-banner')).toHaveText('Champion: Maya');
    const semis = playoffs.getByRole('list', { name: 'Semifinals' });
    await expect(semis.locator('li').nth(0)).toHaveText(/1 Maya 20\s*beat\s*4 Jo 14/);
    // Riley lost as the 2 seed, so Sam is named first, and Riley's row is marked as theirs.
    await expect(semis.locator('li').nth(1)).toHaveText(/3 Sam 15\s*beat\s*2 You 12/);
    await expect(semis.locator('li').nth(1)).toHaveAttribute('data-me', 'true');
    await expect(playoffs.getByRole('list', { name: 'Final', exact: true })).toHaveText(/1 Maya 18\s*beat\s*3 Sam 16/);
    await expect(playoffs.getByRole('list', { name: 'Whiff Bowl' })).toContainText('Lee is last, and does the Season Dare: Sing the anthem at the next game');
  });

  test('The commish picks the Season Dare from the pool before the playoffs, and it is fixed once they are seeded', async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Bracket Busters' });
    const season = await startSeason(request, league);
    await enterAsCommish(page, league);
    await button(page, 'Your profile, Alex').click();
    await button(page, 'Commish tools').click();
    const panel = page.getByRole('region', { name: 'Season Dare' });
    await expect(panel).toContainText('Left unpicked, they spin the Wheel as usual.');

    const dare = STARTER_DARES[0]!;
    await panel.getByRole('button', { name: dare, exact: true }).click();
    await expect(panel).toContainText(`The Whiff Bowl's loser does: ${dare}`);
    await expect(panel.getByRole('button', { name: dare, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await readDoc(request, `${season.path}/config/seasonDare`))?.text).toBe(dare);
    const picked = await readDoc(request, `${season.path}/config/seasonDare`);
    expect(await readDoc(request, `leagues/${league.id}/audit/${String(picked?.audit)}`)).toMatchObject({ action: 'season.dare', target: 'config/seasonDare' });

    await writeDoc(request, `${season.path}/playoffs/bracket`, { size: 4, seeds: ['a', 'b', 'c', 'd'], outside: [], semis: [], final: null, suddenDeath: false, whiff: null, champion: null, finalist: null });
    await expect(panel).toContainText('The playoffs are seeded, so the Season Dare is fixed.');
    await expect(panel.getByRole('button', { name: dare, exact: true })).toHaveCount(0);
  });
});
