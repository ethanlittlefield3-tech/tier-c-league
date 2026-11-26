import { expect, test, type Page } from '@playwright/test';
import { enterAsCommish } from './helpers.ts';
import { createLeague, patchDoc, readDoc } from './league.ts';

const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true });

async function openGarage(page: Page) {
  await tab(page, 'Garage').click();
  await expect(page.getByRole('region', { name: 'Your car' })).toBeVisible();
}

test.describe('The Garage', () => {
  test('Your car sits on its turntable; a starter part goes on with a tap, is saved on your profile, and shows as your icon', async ({ page, request }) => {
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
    await expect(page.locator('.frame-me .frame-car')).toHaveAttribute('data-car', 'dart racingRed');
    await page.getByRole('button', { name: 'Your profile, Alex', exact: true }).click();
    await expect(page.locator('.profile-car')).toHaveAttribute('data-car', 'dart racingRed');
  });

  test('A locked part can be tried on: it shows on your car with how to earn it, is never saved, and goes on for good once that badge is earned', async ({ page, request }) => {
    const league = await createLeague(request);
    const profile = `leagues/${league.id}/players/${league.commish}`;
    await enterAsCommish(page, league);
    await openGarage(page);
    await page.getByRole('group', { name: 'Part' }).getByRole('button', { name: 'Paint', exact: true }).click();
    const chrome = page.getByRole('button', { name: 'Chrome finish, locked: earn Perfect Week', exact: true });
    await chrome.click();
    await expect(page.getByRole('status')).toHaveText('Trying on Chrome finish. Earn Perfect Week to keep it: A perfect day on all 6 goal days of a week.');
    await expect(page.locator('.garage-car')).toHaveAttribute('data-car', 'dart chrome');
    expect((await readDoc(request, profile))?.car).toBeUndefined();
    await page.getByRole('button', { name: 'Back to my car', exact: true }).click();
    await expect(page.locator('.garage-car')).toHaveAttribute('data-car', 'dart cobalt');

    await patchDoc(request, profile, { badges: { perfectWeek: { at: new Date(), season: 's1' } } });
    const unlocked = page.getByRole('button', { name: 'Chrome finish', exact: true });
    await unlocked.click();
    await expect(page.getByRole('status')).toHaveText('Chrome finish is on your car.');
    await expect.poll(async () => ((await readDoc(request, profile))?.car as { paint?: string } | undefined)?.paint).toBe('chrome');
  });

  test('An accent, a finish, a trail style and a backdrop go on like any part, and are saved with your car', async ({ page, request }) => {
    const league = await createLeague(request);
    const profile = `leagues/${league.id}/players/${league.commish}`;
    await enterAsCommish(page, league);
    await openGarage(page);
    const slots = page.getByRole('group', { name: 'Part' });
    for (const [slot, part] of [['Accent', 'Racing Red'], ['Finish', 'Pearl'], ['Trail', 'Smoke rings'], ['Backdrop', 'Neon tunnel']] as const) {
      await slots.getByRole('button', { name: slot, exact: true }).click();
      await page.getByRole('list', { name: slot }).getByRole('button', { name: part, exact: true }).click();
      await expect(page.getByRole('status')).toHaveText(`${part} is on your car.`);
    }
    await expect.poll(async () => (await readDoc(request, profile))?.car).toMatchObject({ paint2: 'racingRed', finish: 'pearl', trail: 'rings', backdrop: 'tunnel' });
    // The accent goes where you put it: on and off, place by place.
    await slots.getByRole('button', { name: 'Accent', exact: true }).click();
    const zones = page.getByRole('group', { name: 'Where the accent goes' });
    await zones.getByRole('button', { name: 'Roof', exact: true }).click();
    await zones.getByRole('button', { name: 'Lower body', exact: true }).click();
    await expect(zones.getByRole('button', { name: 'Roof', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => ((await readDoc(request, profile))?.car as { accents?: string[] } | undefined)?.accents).toEqual(['roof']);
    await expect(page.getByRole('region', { name: 'Your car' })).toHaveAttribute('data-backdrop', 'tunnel');
  });

  test('The rank decal and a season decal come with a rank and a finished season; until then they can be tried on', async ({ page, request }) => {
    const league = await createLeague(request);
    const profile = `leagues/${league.id}/players/${league.commish}`;
    await enterAsCommish(page, league);
    await openGarage(page);
    await page.getByRole('group', { name: 'Part' }).getByRole('button', { name: 'Decal', exact: true }).click();
    const decals = page.getByRole('list', { name: 'Decal' });
    await decals.getByRole('button', { name: 'Rank emblem, locked', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Your rank emblem is yours once your first week is final.');
    await expect(decals.getByRole('button', { name: 'Season decal, locked', exact: true })).toBeVisible();

    await patchDoc(request, profile, { rank: 'gold', seasons: { s1: 2027 } });
    await decals.getByRole('button', { name: 'Season 1 (2027)', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Season 1 (2027) is on your car.');
    await decals.getByRole('button', { name: 'Rank emblem', exact: true }).click();
    await expect.poll(async () => ((await readDoc(request, profile))?.car as { decal?: string } | undefined)?.decal).toBe('rank');
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
