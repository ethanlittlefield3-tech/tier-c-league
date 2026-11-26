import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { weekday } from '../../app/src/feed/events.ts';
import { enterAsCommish, joinAs } from './helpers.ts';
import { createLeague, quietPlayer, readDoc, setGoals, setWindow, startSeason, thisWeek, writeDoc, type TestLeague, type TestSeason } from './league.ts';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });
const HOUR = 3_600_000;
/** A tiny photo to send as proof. The phone turns it into a JPEG. */
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

interface Setup {
  league: TestLeague;
  season: TestSeason;
  riley: { phone: Page; player: string };
}

/**
 * Alex (the commish) and Riley face each other this week. Riley logged today:
 * the Body goal and 90 minutes of screen time. Alex's phone opens on Match.
 */
async function rivals(page: Page, request: APIRequestContext, browser: Browser): Promise<Setup> {
  const league = await createLeague(request);
  const season = await startSeason(request, league);
  const phone = await (await browser.newContext()).newPage();
  const key = await joinAs(phone, league, 'Riley');
  await button(phone, "I've saved it").click();
  await expect(phone.getByRole('navigation', { name: 'Main' })).toBeVisible();
  const player = String((await readDoc(request, `leagues/${league.id}/lookup/${key}`))?.player);
  await setGoals(request, season, player, { mind: 'Read 20 pages', body: '10k steps', wildcard: 'No vaping' });
  await setGoals(request, season, league.commish, { mind: 'Study 1 hour', body: 'Gym', wildcard: 'Cook dinner' });
  const { period } = thisWeek(season);
  await writeDoc(request, `${season.path}/weeks/${period}`, { week: 2, mode: 'regular', targets: { [league.commish]: [player], [player]: [league.commish] } });
  await writeDoc(request, `${season.path}/days/${player}_${season.today}`, {
    player,
    date: season.today,
    goals: { mind: false, body: true, wildcard: false },
    screenMinutes: 90,
    beers: 0,
    firstAt: new Date(),
    updatedAt: new Date(),
  });
  await enterAsCommish(page, league);
  await tab(page, 'Match').click();
  return { league, season, riley: { phone, player } };
}

/** A receipt already asked by Alex, as the app saves it. */
async function asked(request: APIRequestContext, setup: Setup, square: string, options: { date?: string; deadline?: Date; slot?: number } = {}) {
  const date = options.date ?? setup.season.today;
  const id = `${setup.riley.player}_${date}_${square}`;
  await writeDoc(request, `${setup.season.path}/receipts/${id}`, {
    target: setup.riley.player,
    date,
    square,
    by: setup.league.commish,
    slot: `${thisWeek(setup.season).period}_${setup.league.commish}_${options.slot ?? 1}`,
    requestedAt: new Date(Date.now() - HOUR),
    deadline: options.deadline ?? new Date(Date.now() + 5 * HOUR),
    proofAt: null,
    backedDownAt: null,
  });
  return id;
}

test.describe('Receipts', () => {
  test('Ask your opponent for receipts; they prove it with a photo, and you can see it', async ({ page, request, browser }) => {
    const setup = await rivals(page, request, browser);
    const { league, season, riley } = setup;
    const receipts = page.getByRole('region', { name: 'Receipts?' });
    await expect(receipts).toContainText('You have 3 of 3 requests left this week.');
    await receipts.getByRole('button', { name: 'Ask for receipts: Body · 10k steps' }).click();
    await expect(receipts.getByRole('status')).toContainText('Asked. Riley has');
    await expect(receipts).toContainText('You have 2 of 3 requests left this week.');
    const id = `${riley.player}_${season.today}_body`;
    await expect.poll(async () => (await readDoc(request, `${season.path}/receipts/${id}`))?.by).toBe(league.commish);

    // Riley's Today shows who asked, and the deadline.
    const card = riley.phone.getByRole('group', { name: 'Receipts on your Body goal' });
    await expect(card).toContainText(`Alex wants proof of your Body goal for ${weekday(season.today)}. Due in`);
    await card.getByLabel('Upload proof').setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: Buffer.from(PNG, 'base64') });
    await expect(card).toHaveCount(0);
    await expect.poll(async () => typeof (await readDoc(request, `${season.path}/receipts/${id}`))?.proofAt).toBe('string');
    expect(String((await readDoc(request, `${season.path}/proofs/${id}`))?.photo).startsWith('data:image/jpeg;base64,')).toBe(true);

    // Alex sees it proven, and can look at the photo.
    await expect(receipts.locator('.receipt-row[data-status="proven"]')).toContainText('Proven');
    await receipts.getByRole('button', { name: 'See proof' }).click();
    await expect(receipts.getByRole('img', { name: "Riley's proof" })).toBeVisible();
    await riley.phone.context().close();
  });

  test('Backing down is free: the square stops counting, with no extra point', async ({ page, request, browser }) => {
    const setup = await rivals(page, request, browser);
    const id = await asked(request, setup, 'body');
    const card = setup.riley.phone.getByRole('group', { name: 'Receipts on your Body goal' });
    await card.getByRole('button', { name: 'Back down' }).click();
    await expect(card).toContainText('The square stops counting, and you lose nothing more.');
    await card.getByRole('button', { name: 'Back down' }).click();
    await expect(setup.riley.phone.locator('.today-fix')).toHaveText('Receipts: backed down, body voided');
    await expect.poll(async () => typeof (await readDoc(request, `${setup.season.path}/receipts/${id}`))?.backedDownAt).toBe('string');
    await expect(page.getByRole('region', { name: 'Receipts?' }).locator('.receipt-row[data-status="backedDown"]')).toContainText('Backed down: voided');
    await setup.riley.phone.context().close();
  });

  test('No proof by the deadline voids the square and costs 1 more point, on both phones', async ({ page, request, browser }) => {
    const setup = await rivals(page, request, browser);
    await asked(request, setup, 'body', { deadline: new Date(Date.now() - 60_000) });
    await expect(setup.riley.phone.locator('.today-fix')).toHaveText('Receipts: no proof in time, body voided, −1');
    await expect(setup.riley.phone.getByRole('group', { name: 'Receipts on your Body goal' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Receipts?' }).locator('.receipt-row[data-status="failed"]')).toContainText('No proof: voided, −1');
    await setup.riley.phone.context().close();
  });

  test('Each player has 3 requests a week', async ({ page, request, browser }) => {
    const setup = await rivals(page, request, browser);
    await writeDoc(request, `${setup.season.path}/days/${setup.riley.player}_${setup.season.today}`, {
      player: setup.riley.player,
      date: setup.season.today,
      goals: { mind: true, body: true, wildcard: true },
      screenMinutes: 90,
      beers: 0,
      firstAt: new Date(),
      updatedAt: new Date(),
    });
    await asked(request, setup, 'mind', { slot: 1 });
    await asked(request, setup, 'wildcard', { slot: 2 });
    await asked(request, setup, 'screen', { slot: 3 });
    const receipts = page.getByRole('region', { name: 'Receipts?' });
    await expect(receipts).toContainText('You have 0 of 3 requests left this week.');
    await expect(receipts.getByRole('button', { name: 'Ask for receipts: Body · 10k steps' })).toBeDisabled();
    await expect(receipts).toContainText('You have used your 3 requests this week.');
    await setup.riley.phone.context().close();
  });

  test('With a screen-time receipt open, the player can still fix the number after the day locks (ruling R6)', async ({ page, request, browser }) => {
    const setup = await rivals(page, request, browser);
    const { season, riley } = setup;
    await writeDoc(request, `${season.path}/days/${riley.player}_${season.yesterday}`, {
      player: riley.player,
      date: season.yesterday,
      goals: { mind: true, body: false, wildcard: false },
      screenMinutes: 150,
      beers: 0,
      firstAt: new Date(Date.now() - 20 * HOUR),
      updatedAt: new Date(Date.now() - 20 * HOUR),
    });
    await setWindow(request, season, season.yesterday, { start: new Date(Date.now() - 40 * HOUR), lock: new Date(Date.now() - HOUR) });
    await asked(request, setup, 'screen', { date: season.yesterday });

    const pill = riley.phone.getByRole('button', { name: /screen time can still be fixed for receipts/ });
    await pill.click();
    await riley.phone.getByRole('button', { name: /^Screen time:/ }).click();
    const sheet = riley.phone.getByRole('dialog', { name: 'Unproductive screen time' });
    await sheet.getByRole('button', { name: '15 minutes less', exact: true }).click();
    await sheet.getByRole('button', { name: '15 minutes less', exact: true }).click();
    await sheet.getByRole('button', { name: 'Save screen time' }).click();
    await expect.poll(async () => (await readDoc(request, `${season.path}/days/${riley.player}_${season.yesterday}`))?.screenMinutes).toBe(120);
    // Only the number: the goals on that locked day stay as they were.
    expect((await readDoc(request, `${season.path}/days/${riley.player}_${season.yesterday}`))?.goals).toEqual({ mind: true, body: false, wildcard: false });
    await riley.phone.context().close();
  });

  test("From League, anyone's day is a tap away, with Receipts? on what they claimed, not just your opponent's", async ({ page, request, browser }) => {
    const setup = await rivals(page, request, browser);
    const { league, season } = setup;
    await quietPlayer(request, league, 'sam', 'Sam');
    await setGoals(request, season, 'sam', { mind: 'A course lesson', body: 'A run', wildcard: 'Call family' });
    await writeDoc(request, `${season.path}/days/sam_${season.today}`, {
      player: 'sam',
      date: season.today,
      goals: { mind: false, body: true, wildcard: false },
      screenMinutes: null,
      beers: 0,
      firstAt: new Date(),
      updatedAt: new Date(),
    });

    await tab(page, 'League').click();
    await page.getByRole('group', { name: 'Everyone in the league' }).getByRole('button', { name: 'Sam' }).click();
    await page.getByRole('dialog', { name: 'Sam' }).getByRole('button', { name: "See Sam's day" }).click();
    await expect(page.getByRole('heading', { name: "Sam's day" })).toBeVisible();
    const receipts = page.getByRole('region', { name: 'Receipts?' });
    await receipts.getByRole('button', { name: 'Ask for receipts: Body · A run' }).click();
    await expect(receipts.getByRole('status')).toContainText('Asked. Sam has');
    await expect.poll(async () => (await readDoc(request, `${season.path}/receipts/sam_${season.today}_body`))?.by).toBe(league.commish);
    await setup.riley.phone.context().close();
  });
});
