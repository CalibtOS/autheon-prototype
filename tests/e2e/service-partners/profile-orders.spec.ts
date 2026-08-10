/**
 * Service Partners → partner profile → Orders tab.
 *
 * Client feedback: the orders (tours) listed on a partner profile must be
 * clickable and open the tour, instead of being a dead read-only table.
 */
import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import {
  switchLanguage,
  switchTheme,
  switchToAdminBackend,
} from '../../regression/support/helpers/header-controls.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { gotoPrototype } from '../../regression/support/helpers/stable-page.ts';

/** Opens the Orders tab of the first service partner that has any orders. */
async function openPartnerOrders(page) {
  await gotoPrototype(page);
  await switchLanguage(page, 'EN');
  await switchTheme(page, 'light');
  await switchToAdminBackend(page);
  const frame = prototypeFrame(page);

  await frame.getByRole('button', { name: /^Service Partners$/ }).click();

  // Walk partners until one has a non-empty Orders tab — the seed decides who
  // carries jobs, so the test must not hard-code a partner.
  const profileButtons = frame.getByRole('button', { name: /^Profile$/ });
  const count = await profileButtons.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    await profileButtons.nth(i).click();
    const dialog = frame.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^Orders$/ }).click();

    const rows = dialog.locator('table.tbl tbody tr');
    if ((await rows.count()) > 0) return { frame, dialog, rows };

    // Empty Orders tab — dismiss via the backdrop and try the next partner.
    await dialog.click({ position: { x: 5, y: 5 } });
    await expect(dialog).toHaveCount(0);
  }
  throw new Error('No service partner with orders found in the seed data');
}

test.describe('Service partner profile — orders are clickable', () => {
  test('clicking a tour row opens that job detail', async ({ page }) => {
    const { frame, dialog, rows } = await openPartnerOrders(page);

    const firstRow = rows.first();
    const tour = (await firstRow.locator('td').first().textContent())?.trim();
    expect(tour).toBeTruthy();

    // The row advertises itself as interactive.
    await expect(firstRow).toHaveAttribute('role', 'button');
    await firstRow.click();

    // The modal gives way to the job detail for that tour.
    await expect(dialog).toHaveCount(0);
    await expect(frame.getByText(new RegExp(`Tour\\s+${tour}`))).toBeVisible();
  });

  test('a tour row is reachable and openable by keyboard', async ({ page }) => {
    const { frame, dialog, rows } = await openPartnerOrders(page);

    const firstRow = rows.first();
    const tour = (await firstRow.locator('td').first().textContent())?.trim();

    await firstRow.focus();
    await expect(firstRow).toBeFocused();
    await firstRow.press('Enter');

    await expect(dialog).toHaveCount(0);
    await expect(frame.getByText(new RegExp(`Tour\\s+${tour}`))).toBeVisible();
  });
});
