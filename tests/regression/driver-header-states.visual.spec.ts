import { test, expect } from './support/fixtures/prototype-test.ts';

/**
 * Visual baseline for the DriverScreenHeader states gallery
 * (`prototype/project/driver-header-states.html`).
 *
 * This repository has no Storybook and no bundler, so the gallery page IS the
 * story catalogue: it mounts the real shared header in every state the client
 * decision of 2026-07-26 introduced (no badge, single/multi-digit unread, the
 * four screen titles, screen actions alongside the bell, long strings, narrow
 * phone, tablet column, keyboard focus). Capturing it here gives the same
 * protection a Storybook + snapshot setup would.
 *
 * Captured on the single desktop viewport configured in playwright.config.ts,
 * matching the rest of the Driver PWA visual suite.
 */

const GALLERY_PATH = '/prototype/project/driver-header-states.html';

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
  // 13 stories are declared in the gallery; wait for the last one to mount.
  await expect(page.locator('.story')).toHaveCount(13);
  await expect(page.locator('.header-bell-btn').first()).toBeVisible();
  await page.addStyleTag({ content: DISABLE_ANIMATIONS });
  await page.evaluate(async () => {
    await document.fonts?.ready;
  });
}

test.describe('DriverScreenHeader states gallery @visual-regression', () => {
  test('all header states', async ({ page }) => {
    await openGallery(page);
    await expect(page).toHaveScreenshot('driver-header-states.png', { fullPage: true });
  });

  test('keyboard focus state', async ({ page }) => {
    await openGallery(page);

    // Keyboard-driven focus so Chromium actually matches :focus-visible.
    const bell = page
      .locator('[data-story="Keyboard focus (focus-visible ring)"] .header-bell-btn')
      .first();

    let reached = false;
    for (let i = 0; i < 60 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      reached = await bell.evaluate((el) => el === document.activeElement);
    }
    expect(reached, 'gallery bell must be keyboard reachable').toBe(true);
    expect(await bell.evaluate((el) => el.matches(':focus-visible'))).toBe(true);

    await expect(
      page.locator('[data-story="Keyboard focus (focus-visible ring)"]'),
    ).toHaveScreenshot('driver-header-focus-visible.png');
  });
});
