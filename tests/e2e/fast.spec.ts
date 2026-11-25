import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import { addDays } from '../../engine/src/calendar.ts';
import { enterAsCommish } from './helpers.ts';
import { readDoc } from './league.ts';

const run = promisify(execFile);
const fastJob = fileURLToPath(new URL('../../jobs/fast-week.ts', import.meta.url));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (date: string) => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}`;

async function fast(args: string[], env: Record<string, string>): Promise<string> {
  const { stdout } = await run(process.execPath, [fastJob, ...args], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-tier-c', ...env } });
  return stdout;
}

test.describe('The fast test league', () => {
  test('The fast job makes a league whose days last minutes; the made-up players play on their own, and the app follows its clock', async ({ page, request }) => {
    // Made as if 10 minutes ago, with 8-minute days: Monday has ended and Tuesday is a quarter gone.
    const made = await fast(['make'], { DAY_MINUTES: '8', LEAD_MINUTES: '-10' });
    expect(made).not.toMatch(/TCL-/);
    const id = /id (\S+),/.exec(made)?.[1] ?? '';
    const root = (await readDoc(request, `leagues/${id}`)) ?? {};
    expect(root.demo).toBe(true);
    const commish = String(root.commish);
    const season = (await readDoc(request, `leagues/${id}/seasons/s1`)) ?? {};
    const monday = String(season.kickoff);
    const bots = (season.fast as { bots: string[] }).bots;

    // One turn: everyone made up logs Monday, still open until its noon, and the early riser logs Tuesday.
    expect(await fast(['step'], { LEAGUE_ID: id })).toMatch(/saves by the made-up players/);
    for (const bot of bots) expect(await readDoc(request, `leagues/${id}/seasons/s1/days/${bot}_${monday}`)).toBeTruthy();
    expect(await readDoc(request, `leagues/${id}/seasons/s1/days/${bots[0]}_${addDays(monday, 1)}`)).toBeTruthy();
    expect(await readDoc(request, `leagues/${id}/seasons/s1/days/${bots[2]}_${addDays(monday, 1)}`)).toBeNull();
    // The commish's opponent has set a Demolition on the commish's Wednesday, sealed.
    expect(await readDoc(request, `leagues/${id}/seasons/s1/sealed/w01_${bots[0]}_demolition`)).toMatchObject({ target: commish, date: addDays(monday, 2) });

    // The commish gets in: Today is the fast league's Tuesday, and says it is fast.
    const key = String((await readDoc(request, `leagues/${id}/keys/${commish}`))?.key);
    await enterAsCommish(page, { id, code: String(root.code), name: 'Fast Test League', commish, commishKey: key });
    await expect(page.getByText('Fast test league: each day lasts 8 minutes')).toBeVisible();
    await expect(page.getByRole('button', { name: `Today · ${shortDate(addDays(monday, 1))}`, exact: true })).toBeVisible();

    // A job that isn't for a fast league refuses it.
    await expect(fast(['step'], { LEAGUE_ID: 'no-such-league' })).rejects.toThrow(/not a fast test league/);
  });
});
