import { test, expect } from './support/fixtures/prototype-test.ts';

/**
 * Visual baseline for the Marketplace filter-button states gallery
 * (`prototype/project/driver-marketplace-filter-states.html`).
 *
 * The repository has no Storybook and no bundler, so the gallery page is the
 * story catalogue: it mounts the real `MarketplaceFilterButton` driven by real
 * committed-filter objects, plus the shared `Badge` primitive on its own for
 * double-digit and 99+ cap behaviour.
 *
 * Captured on the single desktop viewport from playwright.config.ts, matching
 * the rest of the Driver PWA visual suite.
 */

const GALLERY_PATH = '/prototype/project/driver-marketplace-filter-states.html';

const DISABLE_ANIMATIONS = `
*, *::before, *::after {
  animation-duration: 0.001s !important;
  animation-delay: 0s !important;
  transition-duration: 0.001s !important;
  transition-delay: 0s !important;
  scroll-behavior: auto !important;
}
`;

async function openGallery(page: import('@playwright/test').Page) {
  await page.goto(GALLERY_PATH, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.story')).toHaveCount(14);
  await expect(page.locator('.header-filter-btn').first()).toBeVisible();
  await page.addStyleTag({ content: DISABLE_ANIMATIONS });
  await page.evaluate(async () => {
    await document.fonts?.ready;
  });
}

test.describe('Marketplace filter states gallery @visual-regression', () => {
  test('all filter-badge states', async ({ page }) => {
    await openGallery(page);
    await expect(page).toHaveScreenshot('marketplace-filter-states.png', {
      fullPage: true,
    });
  });

  test('keyboard focus state', async ({ page }) => {
    await openGallery(page);

    const story = page.locator('[data-story="Keyboard focus (focus-visible ring)"]');
    const button = story.locator('.header-filter-btn');

    // Keyboard-driven focus so Chromium actually matches :focus-visible.
    let reached = false;
    for (let i = 0; i < 60 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      reached = await button.evaluate((el) => el === document.activeElement);
    }
    expect(reached, 'gallery filter button must be keyboard reachable').toBe(true);
    expect(await button.evaluate((el) => el.matches(':focus-visible'))).toBe(true);

    await expect(story).toHaveScreenshot('marketplace-filter-focus-visible.png');
  });
});
