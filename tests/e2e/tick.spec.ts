import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { createLeague, patchDoc, quietPlayer, readDoc, startSeason, writeDoc, type TestLeague } from './league.ts';

const run = promisify(execFile);
const tickJob = fileURLToPath(new URL('../../jobs/tick.ts', import.meta.url));

/** Runs the alerts job for one league, and returns the pushes it would have sent. */
async function tick(league: TestLeague): Promise<{ device: string; title: string; body: string; screen: string }[]> {
  const { stdout } = await run(process.execPath, [tickJob], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', LEAGUE_ID: league.id } });
  return stdout
    .split('\n')
    .filter((line) => line.startsWith('push '))
    .map((line) => JSON.parse(line.slice(5)) as { device: string; title: string; body: string; screen: string });
}

/** The commish's phone, signed in as the commish, with alerts on and no quiet hours. */
async function phoneWithAlerts(request: APIRequestContext, league: TestLeague): Promise<string> {
  const device = `tick-${league.id}`;
  await writeDoc(request, `leagues/${league.id}/claims/${device}`, { player: league.commish, key: league.commishKey, at: new Date() });
  await writeDoc(request, `devices/${device}`, {
    token: `emulator-${device}`,
    platform: 'ios',
    league: league.id,
    player: league.commish,
    settings: { daily: true, matchup: true, powerups: true, social: true, receipts: true, progress: true, league: true },
    quiet: { start: 0, end: 0 },
    updatedAt: new Date(),
  });
  return device;
}

let posts = 0;
const taunt = (request: APIRequestContext, league: TestLeague, text: string) =>
  writeDoc(request, `leagues/${league.id}/wall/taunt${(posts += 1)}`, { by: 'maya', kind: 'taunt', text, to: league.commish, at: new Date(), deleted: false });

/** The hour in New York now, the league's time zone. */
const hourNow = () => Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/New_York' }).format(new Date()));

test.describe('Sending alerts', () => {
  test('A taunt reaches the phone of the player it is aimed at, once, with their name filled in', async ({ request }) => {
    const league = await createLeague(request);
    await startSeason(request, league);
    await quietPlayer(request, league, 'maya', 'Maya');
    const device = await phoneWithAlerts(request, league);

    await taunt(request, league, 'Your boost is empty, {name}.');
    expect(await tick(league)).toEqual([expect.objectContaining({ device, title: 'Maya', body: 'Your boost is empty, Alex.', screen: 'feed' })]);
    // The next run starts where this one ended: nothing twice.
    expect(await tick(league)).toEqual([]);
  });

  test('In quiet hours a taunt is held, and arrives when they end', async ({ request }) => {
    const league = await createLeague(request);
    await startSeason(request, league);
    await quietPlayer(request, league, 'maya', 'Maya');
    const device = await phoneWithAlerts(request, league);
    const hour = hourNow();
    await patchDoc(request, `devices/${device}`, { quiet: { start: hour, end: (hour + 2) % 24 } });

    await taunt(request, league, 'Sleep tight, {name}.');
    expect(await tick(league)).toEqual([]);
    const held = (await readDoc(request, `jobs/tick_${league.id}`))?.held as Record<string, unknown[]>;
    expect(held[device]).toHaveLength(1);

    await patchDoc(request, `devices/${device}`, { quiet: { start: 0, end: 0 } });
    expect(await tick(league)).toEqual([expect.objectContaining({ device, title: 'Maya', body: 'Sleep tight, Alex.', screen: 'feed' })]);
  });

  test('A switched-off kind never arrives, and a phone signed out by a new key is taken off alerts', async ({ request }) => {
    const league = await createLeague(request);
    await startSeason(request, league);
    await quietPlayer(request, league, 'maya', 'Maya');
    const device = await phoneWithAlerts(request, league);

    await patchDoc(request, `devices/${device}`, { settings: { daily: true, matchup: true, powerups: true, social: false, receipts: true, progress: true, league: true } });
    await taunt(request, league, 'Hello, {name}.');
    expect(await tick(league)).toEqual([]);

    await patchDoc(request, `devices/${device}`, { settings: { daily: true, matchup: true, powerups: true, social: true, receipts: true, progress: true, league: true } });
    await patchDoc(request, `leagues/${league.id}/keys/${league.commish}`, { key: 'TCL-ZZZZ-ZZZZ' });
    await taunt(request, league, 'Anyone there, {name}?');
    expect(await tick(league)).toEqual([]);
    expect(await readDoc(request, `devices/${device}`)).toBeNull();
  });
});
