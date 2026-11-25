import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { addDays, weekdayIndex } from '../../engine/src/calendar.ts';
import { enter, expectInApp, joinAs } from './helpers.ts';
import { createLeague, listIds, readDoc, type TestLeague } from './league.ts';

const run = promisify(execFile);
const job = fileURLToPath(new URL('../../jobs/season-calendar.ts', import.meta.url));
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

/** Runs the real calendar job against the local database, for one league only. */
async function runCalendarJob(league: TestLeague): Promise<string> {
  const { stdout } = await run(process.execPath, [job], {
    env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id },
  });
  return stdout;
}

/** A new league, with its commish (Alex) in it on this phone and Commish tools open. */
async function commishTools(page: Page, request: APIRequestContext): Promise<TestLeague> {
  const league = await createLeague(request, { name: 'Sunday Squad' });
  await enter(page);
  await button(page, "I'm already in a league").click();
  await page.getByLabel('League code').fill(league.code);
  await page.getByLabel('Recovery key').fill(league.commishKey);
  await button(page, 'Find my profile').click();
  await button(page, "I've saved it").click();
  await expectInApp(page, 'Alex', 'Sunday Squad');
  await button(page, 'Your profile, Alex').click();
  await button(page, 'Commish tools').click();
  await expect(page.getByRole('heading', { name: 'Commish tools' })).toBeVisible();
  return league;
}

const season = (request: APIRequestContext, league: TestLeague) => readDoc(request, `leagues/${league.id}/seasons/s1`);
const auditActions = async (request: APIRequestContext, league: TestLeague) => {
  const ids = await listIds(request, `leagues/${league.id}/audit`);
  return Promise.all(ids.map(async (id) => String((await readDoc(request, `leagues/${league.id}/audit/${id}`))?.action)));
};

test.describe('Season setup', () => {
  test('The commish starts a season, and the whole league sees its kickoff', async ({ page, request }) => {
    const league = await commishTools(page, request);
    await expect(page.locator('.commish-code')).toHaveText(`${league.code.slice(0, 4)}-${league.code.slice(4)}`);
    await expect(page.getByLabel('Name')).toHaveValue('Season 1');
    await button(page, 'Start the season').click();
    await expect(page.getByRole('status')).toHaveText('Season 1 is set up. Everyone sees the kickoff date now.');

    // The league points at the new season, which is in setup with SCOPE.md's defaults.
    await expect.poll(async () => (await readDoc(request, `leagues/${league.id}`))?.season).toBe('s1');
    const saved = await season(request, league);
    expect(saved).toMatchObject({ name: 'Season 1', status: 'setup', regularWeeks: 6, playoffs: 'oneWeek', playoffSize: 4, par: 3, groupWeeks: [3, 5], timeZone: 'America/New_York', joinMidSeason: false, holidayEvents: true });
    const kickoff = String(saved?.kickoff);
    expect(weekdayIndex(kickoff)).toBe(0);
    // Both changes are in the audit log.
    expect((await auditActions(request, league)).sort()).toEqual(['league.settings', 'season.settings']);

    await button(page, 'Back').click();
    await button(page, 'Back').click();
    await expect(page.getByRole('heading', { name: 'Kickoff is coming' })).toBeVisible();
  });

  test('Only the commish sees Commish tools', async ({ page, request }) => {
    const league = await createLeague(request);
    await joinAs(page, league, 'Riley');
    await button(page, "I've saved it").click();
    await button(page, 'Your profile, Riley').click();
    await expect(page.getByRole('heading', { name: 'Riley', level: 1 })).toBeVisible();
    await expect(button(page, 'Commish tools')).toHaveCount(0);
  });

  test('Settings are checked first: kickoff has to be a Monday', async ({ page, request }) => {
    const league = await commishTools(page, request);
    const monday = await page.getByLabel('Kickoff (a Monday)').inputValue();
    await page.getByLabel('Kickoff (a Monday)').fill(addDays(monday, 1));
    await button(page, 'Start the season').click();
    await expect(page.getByRole('alert')).toContainText('Kickoff has to be a Monday.');
    expect((await readDoc(request, `leagues/${league.id}`))?.season).toBeNull();
  });

  test('The commish can change the settings until the draft, and every change is logged', async ({ page, request }) => {
    const league = await commishTools(page, request);
    await button(page, 'Start the season').click();
    await expect(page.getByRole('status')).toContainText('is set up');
    await expect(button(page, 'Save settings')).toBeVisible();
    await button(page, 'Screen time par: more').click();
    await button(page, 'Week 4').click();
    await button(page, 'Save settings').click();
    await expect(page.getByRole('status')).toHaveText('Saved.');
    await expect.poll(async () => (await season(request, league))?.par).toBe(4);
    expect((await season(request, league))?.groupWeeks).toEqual([3, 4, 5]);
    expect(await auditActions(request, league)).toHaveLength(3);
  });

  test('The calendar job writes every day of the season, and running it again changes nothing', async ({ page, request }) => {
    const league = await commishTools(page, request);
    await button(page, 'Start the season').click();
    await expect.poll(async () => (await readDoc(request, `leagues/${league.id}`))?.season).toBe('s1');

    expect(await runCalendarJob(league)).toContain('42 days written, 0 removed, Rule One times set.');
    const days = await listIds(request, `leagues/${league.id}/seasons/s1/calendar`);
    expect(days).toHaveLength(42);
    const kickoff = String((await season(request, league))?.kickoff);
    expect(days.sort()[0]).toBe(kickoff);
    expect(((await season(request, league))?.ruleOneIssue as unknown[]).length).toBe(2);

    expect(await runCalendarJob(league)).toContain('0 days written, 0 removed.');
  });

  test('When the commish moves kickoff, the calendar moves with it', async ({ page, request }) => {
    const league = await commishTools(page, request);
    await button(page, 'Start the season').click();
    await expect.poll(async () => (await readDoc(request, `leagues/${league.id}`))?.season).toBe('s1');
    await runCalendarJob(league);

    const kickoff = await page.getByLabel('Kickoff (a Monday)').inputValue();
    await page.getByLabel('Kickoff (a Monday)').fill(addDays(kickoff, 7));
    await button(page, 'Save settings').click();
    await expect(page.getByRole('status')).toHaveText('Saved.');
    await expect.poll(async () => (await season(request, league))?.kickoff).toBe(addDays(kickoff, 7));

    expect(await runCalendarJob(league)).toContain('removed');
    const days = (await listIds(request, `leagues/${league.id}/seasons/s1/calendar`)).sort();
    expect(days).toHaveLength(42);
    expect(days[0]).toBe(addDays(kickoff, 7));
  });
});
