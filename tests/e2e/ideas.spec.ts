import { expect, test, type Browser, type Page } from '@playwright/test';
import { enterAsCommish, joinAs } from './helpers.ts';
import { createLeague, listIds, readDoc } from './league.ts';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function openIdeas(page: Page, name: string) {
  await button(page, `Your profile, ${name}`).click();
  await button(page, 'Suggest an idea').click();
  await expect(page.getByRole('heading', { name: 'Suggestion box' })).toBeVisible();
}

async function playerPhone(browser: Browser, league: Parameters<typeof joinAs>[1], name: string): Promise<Page> {
  const phone = await (await browser.newContext()).newPage();
  await joinAs(phone, league, name);
  await button(phone, "I've saved it").click();
  await expect(phone.getByRole('navigation', { name: 'Main' })).toBeVisible();
  return phone;
}

test.describe('The suggestion box', () => {
  test('From Profile, anyone posts an idea; the others upvote it, most upvoted first; the commish tags it, and can take it down, which goes in the league log', async ({ page, request, browser }) => {
    const league = await createLeague(request);
    const riley = await playerPhone(browser, league, 'Riley');
    await openIdeas(riley, 'Riley');
    await riley.getByLabel('Your idea', { exact: true }).fill('A bowling week');
    await button(riley, 'Post it').click();
    await expect(riley.getByRole('status')).toHaveText('Posted. Thanks for the idea.');
    await riley.getByLabel('Your idea', { exact: true }).fill('Double points on birthdays');
    await button(riley, 'Post it').click();
    // Your own idea has no upvote button to press.
    await expect(riley.getByRole('article', { name: 'Idea from You' }).first().getByRole('button', { name: /^Your idea/ })).toBeDisabled();

    await enterAsCommish(page, league);
    await openIdeas(page, 'Alex');
    const ideas = page.getByRole('list', { name: 'Ideas' }).getByRole('article');
    await expect(ideas).toHaveCount(2);
    const birthdays = page.getByRole('article', { name: 'Idea from Riley' }).filter({ hasText: 'Double points on birthdays' });
    await birthdays.getByRole('button', { name: 'Upvote, 0' }).click();
    await expect(birthdays.getByRole('button', { name: 'Upvote, 1' })).toHaveAttribute('aria-pressed', 'true');
    // The most upvoted comes first, on every phone.
    await expect(riley.getByRole('list', { name: 'Ideas' }).getByRole('article').first()).toContainText('Double points on birthdays');

    await birthdays.getByRole('group', { name: 'Tag' }).getByRole('button', { name: 'Planned' }).click();
    await expect(riley.locator('.idea-tag[data-tag="planned"]')).toHaveText('Planned');

    const bowling = page.getByRole('article', { name: 'Idea from Riley' }).filter({ hasText: 'A bowling week' });
    await bowling.getByRole('button', { name: 'Take down' }).click();
    await expect(ideas).toHaveCount(1);
    const actions = async () => (await Promise.all((await listIds(request, `leagues/${league.id}/audit`)).map((id) => readDoc(request, `leagues/${league.id}/audit/${id}`)))).map((entry) => entry?.action);
    await expect.poll(actions).toContain('idea.delete');
    await riley.context().close();
  });
});
