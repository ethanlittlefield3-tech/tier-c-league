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

  test('The build sheet lists every slot with what is on it now; one opens at a time, and a change can be undone', async ({ page, request }) => {
    const league = await createLeague(request);
    const profile = `leagues/${league.id}/players/${league.commish}`;
    await enterAsCommish(page, league);
    await openGarage(page);
    const slots = page.getByRole('group', { name: 'Part' });
    const paint = slots.getByRole('button', { name: 'Paint', exact: true });
    // It opens with every slot closed: the whole build at a glance.
    await expect(slots.getByRole('button')).toHaveCount(11);
    await expect(paint).toHaveAccessibleDescription('Cobalt');
    await slots.getByRole('button', { name: 'Body', exact: true }).click();
    await expect(slots.getByRole('button', { name: 'Body', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await paint.click();
    await expect(paint).toHaveAttribute('aria-expanded', 'true');
    await expect(slots.getByRole('button', { name: 'Body', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('list', { name: 'Paint' }).getByRole('button', { name: 'Racing Red', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Racing Red is on your car.');
    await expect(paint).toHaveAccessibleDescription('Racing Red');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Undone.');
    await expect(paint).toHaveAccessibleDescription('Cobalt');
    await expect.poll(async () => ((await readDoc(request, profile))?.car as { paint?: string } | undefined)?.paint).toBe('cobalt');
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0);
    // Tapping the open slot closes it.
    await paint.click();
    await expect(page.getByRole('list', { name: 'Paint' })).toHaveCount(0);
  });

  test('Your car stays in view at the top while you scroll the parts', async ({ page, request }) => {
    const league = await createLeague(request);
    await enterAsCommish(page, league);
    await openGarage(page);
    await page.getByRole('group', { name: 'Part' }).getByRole('button', { name: 'Paint', exact: true }).click();
    await page.locator('#app').evaluate((app) => app.scrollTo(0, 900));
    const stage = await page.getByRole('region', { name: 'Your car' }).boundingBox();
    const tabs = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
    expect(stage!.y).toBeGreaterThanOrEqual(0);
    expect(stage!.y + stage!.height).toBeLessThan(tabs!.y);
    expect(stage!.y).toBeLessThan(120);
  });

  test('Seven backdrops are everyone\'s, the new ones included, and each is a drawn scene', async ({ page, request }) => {
    const league = await createLeague(request);
    await enterAsCommish(page, league);
    await openGarage(page);
    await page.getByRole('group', { name: 'Part' }).getByRole('button', { name: 'Backdrop', exact: true }).click();
    const list = page.getByRole('list', { name: 'Backdrop' });
    for (const name of ['Garage', 'Stadium at night', 'Neon tunnel', 'City rooftop', 'Desert canyon', 'Snowfield', 'Arcade']) await expect(list.getByRole('button', { name, exact: true })).toBeVisible();
    await expect(page.locator('.garage-have')).toHaveText('7 of 8 backdrops unlocked');
    await list.getByRole('button', { name: 'Snowfield', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Your car' })).toHaveAttribute('data-backdrop', 'snowfield');
    await expect(page.getByRole('region', { name: 'Your car' }).locator('svg.backdrop-art')).toHaveCount(1);
  });

  test('A goal explosion plays on the turntable when you pick one, or tap Watch it', async ({ page, request }) => {
    const league = await createLeague(request);
    await enterAsCommish(page, league);
    await openGarage(page);
    await page.getByRole('group', { name: 'Part' }).getByRole('button', { name: 'Explosion', exact: true }).click();
    await page.getByRole('button', { name: 'Watch it', exact: true }).click();
    await expect(page.locator('.garage-boom[data-kind="stock"]')).toHaveCount(1);
  });

  test('Each slot says how many of its parts are yours, and lists yours first, with what is still locked below', async ({ page, request }) => {
    const league = await createLeague(request);
    await enterAsCommish(page, league);
    await openGarage(page);
    await page.getByRole('group', { name: 'Part' }).getByRole('button', { name: 'Decal', exact: true }).click();
    await expect(page.locator('.garage-have')).toHaveText(/^\d+ of \d+ decals unlocked$/);
    const order = await page.locator('.garage-parts .garage-part').evaluateAll((parts) => parts.map((part) => part.getAttribute('data-locked')));
    expect(order).toContain('true');
    expect(order.indexOf('true')).toBeGreaterThan(0);
    expect(order.slice(order.indexOf('true'))).not.toContain('false');
  });

  test('A part unlocked since your last visit is marked New, first in its list, with a dot on its slot and on the Garage tab; it is not new on the next visit', async ({ page, request }) => {
    const league = await createLeague(request);
    const profile = `leagues/${league.id}/players/${league.commish}`;
    // A badge from before this phone's first look is not new.
    await patchDoc(request, profile, { badges: { hatTrick: { at: new Date(Date.now() - 3_600_000), season: 's1' } } });
    await enterAsCommish(page, league);
    await openGarage(page);
    const slots = page.getByRole('group', { name: 'Part' });
    await slots.getByRole('button', { name: 'Decal', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Decal' }).getByRole('button', { name: 'Flame decal', exact: true })).toBeVisible();
    await expect(page.locator('.garage-new')).toHaveCount(0);
    await slots.getByRole('button', { name: 'Paint', exact: true }).click();
    const have = page.locator('.garage-have');
    const before = Number((await have.textContent())?.split(' ')[0]);

    // Away from the Garage, Perfect Week is earned.
    await tab(page, 'Game Day').click();
    const now = await page.evaluate(() => Date.now());
    await patchDoc(request, profile, { badges: { perfectWeek: { at: new Date(now + 1000), season: 's1' } } });
    await expect(tab(page, 'Garage')).toHaveAccessibleDescription('New parts since you last looked');
    await expect(tab(page, 'Garage').locator('.frame-dot')).toBeVisible();

    await openGarage(page);
    await expect(tab(page, 'Garage').locator('.frame-dot')).toHaveCount(0);
    await expect(slots.getByRole('button', { name: 'Paint', exact: true })).toHaveAccessibleDescription(/New since your last visit/);
    await expect(slots.getByRole('button', { name: 'Topper', exact: true })).toHaveAccessibleDescription(/New since your last visit/);
    await expect(slots.getByRole('button', { name: 'Decal', exact: true }).locator('.garage-dot')).toHaveCount(0);
    await slots.getByRole('button', { name: 'Paint', exact: true }).click();
    const first = page.getByRole('list', { name: 'Paint' }).getByRole('button').first();
    await expect(first).toHaveAccessibleName('Chrome finish');
    await expect(first).toHaveAccessibleDescription('New since your last visit');
    await expect(first.locator('.garage-new')).toHaveText('New');
    await expect(have).toHaveText(new RegExp(`^${before + 1} of \\d+ paints unlocked$`));

    // Next visit, it is one of yours like the rest.
    await tab(page, 'Game Day').click();
    await expect(tab(page, 'Garage').locator('.frame-dot')).toHaveCount(0);
    await openGarage(page);
    await slots.getByRole('button', { name: 'Paint', exact: true }).click();
    await expect(page.locator('.garage-new')).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Paint' }).getByRole('button', { name: 'Chrome finish', exact: true })).toBeVisible();
  });
});
