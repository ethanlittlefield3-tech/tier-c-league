import { expect, test, type Page } from '@playwright/test';
import { enterAsCommish } from './helpers.ts';
import { createLeague, patchDoc, readDoc } from './league.ts';

const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });

async function openGarage(page: Page) {
  await tab(page, 'Garage').click();
  await expect(page.getByRole('region', { name: 'Your car' })).toBeVisible();
}

test.describe('The Garage', () => {
  test('Your car sits on its turntable; a starter part goes on with a tap, and is saved on your profile', async ({ page, request }) => {
    const league = await createLeague(request);
    await enterAsCommish(page, league);
    // Your car is your icon in the header.
    await expect(page.locator('.frame-me .frame-car svg')).toBeVisible();
    await openGarage(page);
    await page.getByRole('group', { name: 'Part' }).getByRole('button', { name: 'Paint', exact: true }).click();
    await page.getByRole('list', { name: 'Paint' }).getByRole('button', { name: 'Racing Red', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Racing Red is on your car.');
    await expect.poll(async () => ((await readDoc(request, `leagues/${league.id}/players/${league.commish}`))?.car as { paint?: string } | undefined)?.paint).toBe('racingRed');
    await expect(page.getByRole('list', { name: 'Paint' }).getByRole('button', { name: 'Racing Red', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  test('A locked part shows the badge that unlocks it, and goes on once that badge is earned', async ({ page, request }) => {
    const league = await createLeague(request);
    const profile = `leagues/${league.id}/players/${league.commish}`;
    await enterAsCommish(page, league);
    await openGarage(page);
    await page.getByRole('group', { name: 'Part' }).getByRole('button', { name: 'Paint', exact: true }).click();
    const chrome = page.getByRole('button', { name: 'Chrome finish, locked: earn Perfect Week', exact: true });
    await chrome.click();
    await expect(page.getByRole('status')).toHaveText('Chrome finish: earn Perfect Week. A perfect day on all 6 goal days of a week.');
    expect((await readDoc(request, profile))?.car).toBeUndefined();

    await patchDoc(request, profile, { badges: { perfectWeek: { at: new Date(), season: 's1' } } });
    const unlocked = page.getByRole('button', { name: 'Chrome finish', exact: true });
    await unlocked.click();
    await expect(page.getByRole('status')).toHaveText('Chrome finish is on your car.');
    await expect.poll(async () => ((await readDoc(request, profile))?.car as { paint?: string } | undefined)?.paint).toBe('chrome');
  });

  test('You drag your car to spin it on the turntable, and it rests on the side you leave it nearest; a tap turns it round', async ({ page, request }) => {
    const league = await createLeague(request);
    await enterAsCommish(page, league);
    await openGarage(page);
    const turntable = page.getByRole('button', { name: 'Turn your car', exact: true });
    const car = page.locator('.garage-turn');
    const box = (await turntable.boundingBox())!;
    const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    // Half a turn and a bit: it rests showing its other side.
    await page.mouse.move(middle.x - 70, middle.y);
    await page.mouse.down();
    await page.mouse.move(middle.x + 70, middle.y, { steps: 10 });
    await page.mouse.up();
    await expect(car).toHaveAttribute('data-side', 'left');

    // Not far enough to pass edge-on: it swings back.
    await page.mouse.move(middle.x, middle.y);
    await page.mouse.down();
    await page.mouse.move(middle.x + 60, middle.y, { steps: 6 });
    await page.mouse.up();
    await expect(car).toHaveAttribute('data-side', 'left');

    await turntable.click();
    await expect(car).toHaveAttribute('data-side', 'right');
    await turntable.press('Enter');
    await expect(car).toHaveAttribute('data-side', 'left');
  });

  test('A goal explosion plays on the turntable when you pick one, or tap Watch it', async ({ page, request }) => {
    const league = await createLeague(request);
    await enterAsCommish(page, league);
    await openGarage(page);
    await page.getByRole('group', { name: 'Part' }).getByRole('button', { name: 'Explosion', exact: true }).click();
    await page.getByRole('button', { name: 'Watch it', exact: true }).click();
    await expect(page.locator('.garage-boom[data-kind="stock"]')).toHaveCount(1);
  });
});
