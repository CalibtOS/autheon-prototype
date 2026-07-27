import { test, expect, type Locator, type Page } from '@playwright/test';
import { test as prototypeTest } from './support/fixtures/prototype-test.ts';
import { prototypeFrame } from './support/helpers/selectors.ts';
import { prepareDriverVisual, settleForCapture } from './support/helpers/visual.ts';

/**
 * Integration coverage for the Marketplace applied-filter count badge.
 *
 * Drives the real Portal + FilterSheet composition and asserts the badge
 * against the committed filter state. Complements
 * `marketplace-filter-count.unit.spec.ts`, which covers the pure selector.
 */

const filterButton = (page: Page): Locator =>
  prototypeFrame(page).locator('.header-filter-btn');

const filterBadge = (page: Page): Locator =>
  prototypeFrame(page).locator('.header-filter-btn .header-btn-badge');

const chips = (page: Page): Locator =>
  prototypeFrame(page).locator('.header-chips-row .chip');

const sheet = (page: Page): Locator => prototypeFrame(page).locator('.sheet');

/** Open the filter panel. */
async function openFilterPanel(page: Page): Promise<void> {
  await filterButton(page).click();
  await expect(sheet(page)).toBeVisible();
}

/** Commit the current draft via the panel's primary CTA. */
async function applyFilters(page: Page): Promise<void> {
  await sheet(page).locator('.sheet-foot .btn.primary').click();
  await expect(sheet(page)).toHaveCount(0);
  await settleForCapture(page);
}

/** Close the panel without committing. */
async function cancelFilterPanel(page: Page): Promise<void> {
  await sheet(page).locator('.sheet-foot .btn').first().click();
  await expect(sheet(page)).toHaveCount(0);
  await settleForCapture(page);
}

async function expectBadge(page: Page, value: string | null): Promise<void> {
  if (value === null) {
    // Zero count must render no badge element at all — nothing hidden that
    // still reserves layout space, nothing for a screen reader to reach.
    await expect(filterBadge(page)).toHaveCount(0);
    await expect(filterButton(page)).toHaveAttribute('aria-label', 'Filters');
    return;
  }
  await expect(filterBadge(page)).toHaveText(value);
  await expect(filterButton(page)).toHaveAttribute(
    'aria-label',
    `Filters, ${value} applied`,
  );
}

prototypeTest.describe('Marketplace applied-filter badge', () => {
  prototypeTest.beforeEach(async ({ page }) => {
    await prepareDriverVisual(page);
  });

  prototypeTest('no badge when no filters are applied', async ({ page }) => {
    await expect(filterButton(page)).toBeVisible();
    await expectBadge(page, null);
    await expect(chips(page)).toHaveCount(0);
    await expect(filterButton(page)).not.toHaveClass(/\bactive\b/);
  });

  prototypeTest('draft selections do not move the badge until applied', async ({ page }) => {
    await openFilterPanel(page);
    await sheet(page).locator('.input').first().fill('80');
    await sheet(page).locator('.chip-btn').filter({ hasText: 'SUV' }).first().click();

    // Panel still open, draft dirty — the committed state has not changed.
    await expect(filterBadge(page)).toHaveCount(0);

    await cancelFilterPanel(page);
    await expectBadge(page, null);
  });

  prototypeTest('badge appears with the correct count after Apply', async ({ page }) => {
    await openFilterPanel(page);
    await sheet(page).locator('.input').first().fill('80');
    await applyFilters(page);

    await expectBadge(page, '1');
    await expect(chips(page)).toHaveCount(1);
    await expect(filterButton(page)).toHaveClass(/\bactive\b/);
  });

  prototypeTest('badge increases when another filter is added', async ({ page }) => {
    await openFilterPanel(page);
    await sheet(page).locator('.input').first().fill('80');
    await applyFilters(page);
    await expectBadge(page, '1');

    await openFilterPanel(page);
    await sheet(page).locator('.chip-btn').filter({ hasText: 'SUV' }).first().click();
    await applyFilters(page);
    await expectBadge(page, '2');
  });

  prototypeTest('badge decreases when one filter is removed', async ({ page }) => {
    await openFilterPanel(page);
    await sheet(page).locator('.input').first().fill('80');
    await sheet(page).locator('.chip-btn').filter({ hasText: 'SUV' }).first().click();
    await applyFilters(page);
    await expectBadge(page, '2');

    await chips(page).first().click();
    await settleForCapture(page);
    await expectBadge(page, '1');
    await expect(chips(page)).toHaveCount(1);
  });

  prototypeTest('badge disappears after clearing all filters', async ({ page }) => {
    await openFilterPanel(page);
    await sheet(page).locator('.input').first().fill('80');
    await sheet(page).locator('.chip-btn').filter({ hasText: 'SUV' }).first().click();
    await applyFilters(page);
    await expectBadge(page, '2');

    await openFilterPanel(page);
    await sheet(page).locator('.sheet-head .btn.ghost').click(); // Reset the draft
    await applyFilters(page);

    await expectBadge(page, null);
    await expect(chips(page)).toHaveCount(0);
  });

  prototypeTest('active-filter indication survives closing the panel', async ({ page }) => {
    await openFilterPanel(page);
    await sheet(page).locator('.input').first().fill('80');
    await applyFilters(page);

    await expect(sheet(page)).toHaveCount(0);
    await expectBadge(page, '1');
  });

  prototypeTest('reopening the panel stays in sync with the committed state', async ({ page }) => {
    await openFilterPanel(page);
    await sheet(page).locator('.input').first().fill('80');
    await applyFilters(page);
    await expectBadge(page, '1');

    await openFilterPanel(page);
    // The panel rehydrates from the committed filters.
    await expect(sheet(page).locator('.input').first()).toHaveValue('80');
    await cancelFilterPanel(page);
    await expectBadge(page, '1');
  });

  prototypeTest('changing sort does not affect the badge', async ({ page }) => {
    await openFilterPanel(page);
    await sheet(page).locator('.input').first().fill('80');
    await applyFilters(page);
    await expectBadge(page, '1');

    await prototypeFrame(page).locator('.sort-trigger').click();
    await prototypeFrame(page).locator('.sort-menu-item').nth(1).click();
    await settleForCapture(page);

    await expectBadge(page, '1');
    // And the sort control itself never carries a count badge.
    await expect(
      prototypeFrame(page).locator('.sort-trigger .ui-badge'),
    ).toHaveCount(0);
  });

  prototypeTest('badge reflects filters, not the number of results', async ({ page }) => {
    await openFilterPanel(page);
    // A postal prefix that matches no seeded tour.
    await sheet(page).locator('.input').first().fill('99');
    await applyFilters(page);

    await expect(prototypeFrame(page).locator('.jobcard-btn')).toHaveCount(0);
    await expectBadge(page, '1');
  });

  prototypeTest('badge is decorative and not a separate focus target', async ({ page }) => {
    await openFilterPanel(page);
    await sheet(page).locator('.input').first().fill('80');
    await applyFilters(page);

    const badge = filterBadge(page);
    await expect(badge).toHaveAttribute('aria-hidden', 'true');

    // Nothing focusable inside the button, and the badge swallows no clicks.
    const focusableChildren = await filterButton(page)
      .locator('*')
      .evaluateAll((els) =>
        els.filter((el) => (el as HTMLElement).tabIndex >= 0).length,
      );
    expect(focusableChildren).toBe(0);
    await expect(badge).toHaveCSS('pointer-events', 'none');

    // Clicking exactly on the badge still activates the button.
    await badge.click({ force: true });
    await expect(sheet(page)).toBeVisible();
  });

  prototypeTest('filter button keeps a visible keyboard focus ring', async ({ page }) => {
    const button = filterButton(page);
    let reached = false;
    for (let i = 0; i < 40 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      reached = await button.evaluate((el) => el === el.ownerDocument.activeElement);
    }
    expect(reached, 'filter button must be keyboard reachable').toBe(true);

    const focus = await button.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        focusVisible: el.matches(':focus-visible'),
        outlineStyle: s.outlineStyle,
        outlineWidth: s.outlineWidth,
      };
    });
    expect(focus.focusVisible).toBe(true);
    expect(focus.outlineStyle).not.toBe('none');
    expect(parseFloat(focus.outlineWidth)).toBeGreaterThan(0);
  });

  prototypeTest('accessible name is pluralized and translated (DE)', async ({ page }) => {
    await openFilterPanel(page);
    await sheet(page).locator('.input').first().fill('80');
    await applyFilters(page);
    await expect(filterButton(page)).toHaveAttribute('aria-label', 'Filters, 1 applied');

    await prototypeFrame(page)
      .getByRole('banner')
      .locator('.locale-switch')
      .getByRole('button', { name: 'DE' })
      .click();
    await settleForCapture(page);

    await expect(filterButton(page)).toHaveAttribute('aria-label', 'Filter, 1 aktiv');

    await openFilterPanel(page);
    await sheet(page).locator('.chip-btn').filter({ hasText: 'SUV' }).first().click();
    await applyFilters(page);
    await expect(filterButton(page)).toHaveAttribute('aria-label', 'Filter, 2 aktiv');
  });

  prototypeTest('badge stays attached to the button and does not shift the row', async ({
    page,
  }) => {
    const sortBefore = await prototypeFrame(page).locator('.sort-trigger').boundingBox();
    const buttonBefore = await filterButton(page).boundingBox();
    const titleBefore = await prototypeFrame(page)
      .locator('.pwa-screen-header .header-title')
      .boundingBox();

    await openFilterPanel(page);
    await sheet(page).locator('.input').first().fill('80');
    await sheet(page).locator('.chip-btn').filter({ hasText: 'SUV' }).first().click();
    await applyFilters(page);
    await expectBadge(page, '2');

    const sortAfter = await prototypeFrame(page).locator('.sort-trigger').boundingBox();
    const buttonAfter = await filterButton(page).boundingBox();
    const titleAfter = await prototypeFrame(page)
      .locator('.pwa-screen-header .header-title')
      .boundingBox();

    // Showing the badge must not move the sort button, the filter button or the
    // screen title.
    expect(Math.round(sortAfter!.x)).toBe(Math.round(sortBefore!.x));
    expect(Math.round(sortAfter!.y)).toBe(Math.round(sortBefore!.y));
    expect(Math.round(buttonAfter!.x)).toBe(Math.round(buttonBefore!.x));
    expect(Math.round(buttonAfter!.width)).toBe(Math.round(buttonBefore!.width));
    expect(Math.round(titleAfter!.y)).toBe(Math.round(titleBefore!.y));

    // Badge sits over the button's upper-right corner, inside the phone screen.
    const badgeBox = await filterBadge(page).boundingBox();
    const screenBox = await prototypeFrame(page).locator('.phone-screen').boundingBox();
    expect(badgeBox!.y).toBeLessThan(buttonAfter!.y + buttonAfter!.height / 2);
    expect(badgeBox!.x).toBeGreaterThan(buttonAfter!.x + buttonAfter!.width / 2);
    expect(badgeBox!.x + badgeBox!.width).toBeLessThanOrEqual(
      screenBox!.x + screenBox!.width,
    );
  });
});

/**
 * Responsive checks. A fresh context per width — the Driver PWA uses one
 * layout for every width, so these assert the same contract, not a second
 * tablet design.
 */
test.describe('Marketplace applied-filter badge — responsive', () => {
  for (const width of [320, 360, 390, 430, 768]) {
    test(`badge stays attached and readable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/pwa/');
      await expect(page.locator('.phone-shell')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('.header-filter-btn')).toBeVisible({ timeout: 30_000 });

      const button = page.locator('.header-filter-btn');
      const badge = page.locator('.header-filter-btn .header-btn-badge');

      await expect(badge).toHaveCount(0);

      await button.click();
      const panel = page.locator('.sheet');
      await expect(panel).toBeVisible();
      await panel.locator('.input').nth(0).fill('80');
      await panel.locator('.input').nth(1).fill('10');
      await panel.locator('.chip-btn').filter({ hasText: 'SUV' }).first().click();
      await panel.locator('.sheet-foot .btn.primary').click();
      await expect(panel).toHaveCount(0);

      await expect(badge).toHaveText('3');

      const buttonBox = (await button.boundingBox())!;
      const badgeBox = (await badge.boundingBox())!;
      const sortBox = (await page.locator('.sort-trigger').boundingBox())!;

      // Attached to the button, not floating off it.
      expect(badgeBox.x).toBeGreaterThan(buttonBox.x);
      expect(badgeBox.x + badgeBox.width).toBeLessThanOrEqual(
        buttonBox.x + buttonBox.width + 6,
      );
      // Never past the viewport edge.
      expect(badgeBox.x + badgeBox.width).toBeLessThanOrEqual(width);
      // Sort and filter stay aligned; touch target stays usable.
      expect(Math.round(sortBox.y)).toBe(Math.round(buttonBox.y));
      expect(buttonBox.width).toBeGreaterThanOrEqual(40);
      expect(buttonBox.height).toBeGreaterThanOrEqual(40);
      // No horizontal document scroll introduced.
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
      ).toBe(false);
    });
  }
});
