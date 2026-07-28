import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import {
  openDriverTab,
  prepareDriverVisual,
  settleForCapture,
} from '../../regression/support/helpers/visual.ts';

/**
 * End-to-end journey for the Marketplace applied-filter count badge.
 *
 * Walks the whole flow a driver performs: land on the Marketplace, apply
 * filters, close the panel, read the count, narrow further, clear, re-sort and
 * navigate away. Result counts are asserted only as relative changes
 * (narrowed / restored) — never as exact numbers — because the seeded fixture
 * does not guarantee specific totals.
 */

const TAB = {
  marketplace: /Marketplace|Marktplatz/i,
  profile: /Profile|Profil/i,
} as const;

const filterButton = (page: Page): Locator =>
  prototypeFrame(page).locator('.header-filter-btn');
const filterBadge = (page: Page): Locator =>
  prototypeFrame(page).locator('.header-filter-btn .header-btn-badge');
const chips = (page: Page): Locator =>
  prototypeFrame(page).locator('.header-chips-row .chip');
const panel = (page: Page): Locator => prototypeFrame(page).locator('.sheet');
const jobCards = (page: Page): Locator =>
  prototypeFrame(page).locator('.jobcard-btn');

async function applyPanel(page: Page): Promise<void> {
  await panel(page).locator('.sheet-foot .btn.primary').click();
  await expect(panel(page)).toHaveCount(0);
  await settleForCapture(page);
}

test.describe('Driver Marketplace — applied-filter badge journey @e2e', () => {
  test('driver can see how many filters constrain the Marketplace', async ({ page }) => {
    // 1–2. Open the Marketplace; default state has no filters and no badge.
    await prepareDriverVisual(page);
    await expect(filterButton(page)).toBeVisible();
    await expect(filterBadge(page)).toHaveCount(0);
    await expect(filterButton(page)).toHaveAttribute('aria-label', 'Filters');

    const unfilteredCount = await jobCards(page).count();
    expect(unfilteredCount).toBeGreaterThan(0);

    // 3–4. Open the filter panel and apply two filters.
    await filterButton(page).click();
    await expect(panel(page)).toBeVisible();
    await panel(page).locator('.input').first().fill('80');
    await panel(page).locator('.chip-btn').filter({ hasText: 'Passenger car' }).first().click();
    await applyPanel(page);

    // 5–6. Panel is closed and the badge reports the applied count.
    await expect(panel(page)).toHaveCount(0);
    await expect(filterBadge(page)).toHaveText('2');
    await expect(filterButton(page)).toHaveAttribute('aria-label', 'Filters, 2 applied');

    // 7. Results really are constrained (relative, not an exact total).
    const filteredCount = await jobCards(page).count();
    expect(filteredCount).toBeLessThan(unfilteredCount);
    await expect(chips(page)).toHaveCount(2);

    // 8–10. Reopen, remove one filter, count decreases.
    await filterButton(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).locator('.input').first()).toHaveValue('80');
    await panel(page).locator('.input').first().fill('');
    await applyPanel(page);
    await expect(filterBadge(page)).toHaveText('1');
    await expect(filterButton(page)).toHaveAttribute('aria-label', 'Filters, 1 applied');

    // 11–12. Clear everything; badge disappears and results are restored.
    await filterButton(page).click();
    await expect(panel(page)).toBeVisible();
    await panel(page).locator('.sheet-head .btn.ghost').click();
    await applyPanel(page);
    await expect(filterBadge(page)).toHaveCount(0);
    await expect(chips(page)).toHaveCount(0);
    await expect(jobCards(page)).toHaveCount(unfilteredCount);

    // 13–14. Sorting must not resurrect or alter the badge.
    await filterButton(page).click();
    await panel(page).locator('.chip-btn').filter({ hasText: 'Passenger car' }).first().click();
    await applyPanel(page);
    await expect(filterBadge(page)).toHaveText('1');

    await prototypeFrame(page).locator('.sort-trigger').click();
    await prototypeFrame(page).locator('.sort-menu-item').nth(1).click();
    await settleForCapture(page);
    await expect(filterBadge(page)).toHaveText('1');
    await expect(filterButton(page)).toHaveAttribute('aria-label', 'Filters, 1 applied');

    // 15–16. Navigate away and back. Marketplace filter state lives above the
    // tab switch, so filters — and therefore the badge — persist for the
    // session. (There is no reload persistence by design; see driver-screen-spec.)
    await openDriverTab(page, TAB.profile);
    await expect(filterButton(page)).toHaveCount(0);
    await openDriverTab(page, TAB.marketplace);
    await expect(filterBadge(page)).toHaveText('1');
    await expect(filterButton(page)).toHaveAttribute('aria-label', 'Filters, 1 applied');
  });

  test('reload resets Marketplace filters and the badge together', async ({ page }) => {
    await prepareDriverVisual(page);

    await filterButton(page).click();
    await expect(panel(page)).toBeVisible();
    await panel(page).locator('.chip-btn').filter({ hasText: 'Passenger car' }).first().click();
    await applyPanel(page);
    await expect(filterBadge(page)).toHaveText('1');

    // Marketplace filters are in-memory session state — no persistence layer
    // exists, and none was added for the badge. Both reset together.
    await page.reload();
    await prepareDriverVisual(page);

    await expect(filterBadge(page)).toHaveCount(0);
    await expect(filterButton(page)).toHaveAttribute('aria-label', 'Filters');
    await expect(chips(page)).toHaveCount(0);
  });
});
