import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import {
  gotoPrototype,
  waitForPrototypeStable,
} from '../../regression/support/helpers/stable-page.ts';
import {
  switchToAdminBackend,
  switchToDriverPWA,
} from '../../regression/support/helpers/header-controls.ts';
import {
  ACCENT_VAR,
  launcher,
  panel,
  readVar,
} from '../../regression/support/helpers/theme-editor.ts';

/**
 * Task 1 — validate the editor across the required viewport matrix and the
 * prototype surfaces (driver-PWA preview at mobile widths, admin at desktop).
 * The console-error fixture fails the test on any unexpected runtime error.
 * The standalone /pwa/ host (hostWindow === window) is covered by
 * theme-editor.url-export.spec.ts via the directly-loaded top-level prototype.
 */

const VIEWPORTS = [
  { name: '320x568', width: 320, height: 568 },
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1440x900', width: 1440, height: 900 },
];

function expectWithinViewport(
  box: { x: number; y: number; width: number; height: number } | null,
  vw: number,
  vh: number,
) {
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vw + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vh + 1);
}

test.describe('Theme Editor — viewport matrix', () => {
  for (const vp of VIEWPORTS) {
    test(`launcher + panel stay usable at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoPrototype(page);

      // Launcher visible and inside the viewport.
      await expect(launcher(page)).toBeVisible();
      expectWithinViewport(await launcher(page).boundingBox(), vp.width, vp.height);

      // Panel opens and stays fully inside the viewport (no clipping).
      await launcher(page).click();
      await expect(panel(page)).toBeVisible();
      expectWithinViewport(await panel(page).boundingBox(), vp.width, vp.height);

      // Reset/export controls are reachable within the panel.
      await expect(
        prototypeFrame(page).getByRole('button', { name: 'Reset to defaults' }),
      ).toBeVisible();
      await expect(prototypeFrame(page).getByText('Export & share')).toBeVisible();
    });
  }

  test('driver-PWA preview at mobile width keeps the editor usable', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoPrototype(page);
    await switchToDriverPWA(page);
    await waitForPrototypeStable(page);

    await expect(launcher(page)).toBeVisible();
    await launcher(page).click();
    await expect(panel(page)).toBeVisible();
    expectWithinViewport(await panel(page).boundingBox(), 390, 844);
  });

  test('admin surface at desktop keeps the editor usable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoPrototype(page);
    await switchToAdminBackend(page);
    await waitForPrototypeStable(page);

    await expect(launcher(page)).toBeVisible();
    await launcher(page).click();
    await expect(panel(page)).toBeVisible();
    expectWithinViewport(await panel(page).boundingBox(), 1440, 900);
  });

  test('switching PWA → Admin does not corrupt theme state', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoPrototype(page, '/?theme=light:brand-accent=00ff00');
    expect(await readVar(page, ACCENT_VAR)).toBe('#00FF00');

    await switchToAdminBackend(page);
    await waitForPrototypeStable(page);
    // Override still applied after the mode switch (no reload, state intact).
    expect(await readVar(page, ACCENT_VAR)).toBe('#00FF00');
    await expect(launcher(page)).toBeVisible();
  });
});
