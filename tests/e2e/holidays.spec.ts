import { expect, test, type Page } from '@playwright/test';
import { addDays } from '../../engine/src/calendar.ts';
import { enterAsCommish, joinAs } from './helpers.ts';
import { createLeague, futureDays, patchDoc, readDoc, setGoals, startSeason, thisWeek, writeDoc } from './league.ts';

const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });
const goal = (page: Page, lane: string) => page.locator(`.check-goal[data-lane="${lane}"]`);

test.describe('Holiday events', () => {
  test('The commish puts a Dry Day on a day that has not started, and can take it off again; each change goes in the audit log', async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await startSeason(request, league);
    await enterAsCommish(page, league);
    await button(page, 'Your profile, Alex').click();
    await button(page, 'Commish tools').click();
    const panel = page.getByRole('region', { name: 'Holiday events' });
    // The first day offered is tomorrow: today has started.
    const tomorrow = addDays(season.today, 1);
    await expect(panel.getByLabel('Day')).toHaveValue(tomorrow);

    await panel.getByRole('button', { name: 'Dry Day', exact: true }).click();
    await panel.getByRole('button', { name: 'Schedule it' }).click();
    await expect(panel.getByRole('status')).toContainText('Dry Day is on for');
    await expect(panel.getByRole('list', { name: 'Scheduled' })).toContainText('Dry Day');
    const day = await readDoc(request, `${season.path}/calendar/${tomorrow}`);
    expect(day?.event).toBe('dry');
    expect(await readDoc(request, `leagues/${league.id}/audit/${String(day?.audit)}`)).toMatchObject({ action: 'event.set', target: `calendar/${tomorrow}` });

    await panel.getByRole('button', { name: /Take Dry Day off/ }).click();
    await expect(panel.getByRole('status')).toContainText('is a normal day again');
    await expect(panel.getByRole('list', { name: 'Scheduled' })).toHaveCount(0);
    expect((await readDoc(request, `${season.path}/calendar/${tomorrow}`))?.event).toBeNull();
  });

  test("Today says when it's a holiday event and scores it live: Double Points Day doubles the day", async ({ page, request }) => {
    const league = await createLeague(request, { name: 'Sunday Squad' });
    const season = await startSeason(request, league);
    const key = await joinAs(page, league, 'Riley');
    const me = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
    await setGoals(request, season, me, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
    // Riley's rest day is moved off today, whatever day the test runs.
    const [, restDay] = await futureDays(request, season);
    const { period } = thisWeek(season);
    await writeDoc(request, `${season.path}/kit/${period}_${me}_rest`, { player: me, item: 'rest', period, date: restDay, at: new Date() });
    await patchDoc(request, `${season.path}/calendar/${season.today}`, { event: 'double' });
    await button(page, "I've saved it").click();

    await expect(page.locator('.event-banner')).toHaveText("Today: Double Points Day. The day's points count double, and an Aerial doubles them again.");
    await goal(page, 'mind').click();
    // 1 goal, doubled.
    await expect(page.locator('.today-points')).toContainText('+2');
  });
});
