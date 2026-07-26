import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import type { Page } from '@playwright/test';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { gotoPrototype } from '../../regression/support/helpers/stable-page.ts';
import {
  gotoEditor,
  launcher,
  openEditor,
  panel,
} from '../../regression/support/helpers/theme-editor.ts';

/**
 * Visibility controls: the tool is hidden by default and only appears with
 * ?themecolorchanger=1; a keyboard shortcut and a red launcher badge toggle the
 * whole feature. The console-error fixture guards against runtime errors.
 */

const TOGGLE = 'Control+Alt+Shift+T';
const hideBadge = (p: Page) =>
  prototypeFrame(p).getByRole('button', { name: 'Hide Theme Color Changer' });

test.describe('visibility gate — ?themecolorchanger', () => {
  test('hidden by default on a clean URL (no flash)', async ({ page }) => {
    await gotoPrototype(page); // no gate param
    await expect(launcher(page)).toHaveCount(0);
    await page.waitForTimeout(300); // catch any late/deferred mount
    await expect(launcher(page)).toHaveCount(0);
    // The application itself still works (shell rendered).
    await expect(prototypeFrame(page).getByRole('main')).toBeVisible();
  });

  test('appears with ?themecolorchanger=1', async ({ page }) => {
    await gotoEditor(page);
    await expect(launcher(page)).toBeVisible();
  });

  test('invalid gate values do not activate it', async ({ page }) => {
    for (const v of ['0', 'false', '2', 'on', '']) {
      await gotoPrototype(page, '/?themecolorchanger=' + v);
      await expect(launcher(page)).toHaveCount(0);
    }
  });

  test('works alongside unrelated params, which are preserved', async ({ page }) => {
    await gotoPrototype(page, '/?tab=mine&themecolorchanger=1&foo=bar');
    await expect(launcher(page)).toBeVisible();
    const url = decodeURIComponent(page.url());
    expect(url).toContain('tab=mine');
    expect(url).toContain('foo=bar');
  });
});

test.describe('keyboard shortcut — Ctrl/⌘ + Alt + Shift + T', () => {
  test('hides then restores the whole feature', async ({ page }) => {
    await gotoEditor(page);
    await openEditor(page); // launcher + overlay visible
    await page.keyboard.press(TOGGLE);
    await expect(launcher(page)).toBeHidden();
    await expect(panel(page)).toBeHidden();

    await page.keyboard.press(TOGGLE);
    await expect(launcher(page)).toBeVisible();
  });

  test('exactly one toggle per press (no duplicated listeners)', async ({ page }) => {
    await gotoEditor(page);
    await expect(launcher(page)).toBeVisible();
    await page.keyboard.press(TOGGLE);
    await expect(launcher(page)).toBeHidden();
    await page.keyboard.press(TOGGLE);
    await expect(launcher(page)).toBeVisible();
    await page.keyboard.press(TOGGLE);
    await expect(launcher(page)).toBeHidden();
  });

  test('does not toggle while typing a hex value', async ({ page }) => {
    await gotoEditor(page);
    await openEditor(page);
    const hex = prototypeFrame(page).getByLabel('Hex value for Accent', {
      exact: true,
    });
    await hex.click();
    await hex.pressSequentially('abcdef');
    // Typing the value must not have toggled the feature away.
    await expect(launcher(page)).toBeVisible();
    await expect(hex).toHaveValue(/abcdef/i);
  });
});

test.describe('red hide badge', () => {
  test('hides the feature without opening the overlay; keyboard restores', async ({
    page,
  }) => {
    await gotoEditor(page);
    await expect(launcher(page)).toBeVisible();

    await hideBadge(page).click();
    await expect(launcher(page)).toBeHidden();
    await expect(panel(page)).toHaveCount(0); // did NOT open the editor

    await page.keyboard.press(TOGGLE);
    await expect(launcher(page)).toBeVisible();
  });

  test('travels with the launcher after dragging', async ({ page }) => {
    await gotoEditor(page);
    const start = await launcher(page).boundingBox();
    expect(start).not.toBeNull();

    await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
    await page.mouse.down();
    await page.mouse.move(240, 260, { steps: 10 });
    await page.mouse.up();

    const lb = await launcher(page).boundingBox();
    const bb = await hideBadge(page).boundingBox();
    expect(lb).not.toBeNull();
    expect(bb).not.toBeNull();
    // Launcher actually moved off its default corner…
    expect(lb!.x).toBeLessThan(start!.x - 100);
    // …and the badge is still pinned to its top-right.
    expect(bb!.x + bb!.width).toBeGreaterThan(lb!.x + lb!.width - 2);
    expect(bb!.y).toBeLessThan(lb!.y + 4);
  });
});

test.describe('overlay shortcut hint', () => {
  test('the panel communicates the show/hide shortcut', async ({ page }) => {
    await gotoEditor(page);
    await openEditor(page);
    const frame = prototypeFrame(page);
    // Anchored on the visible copy, not a CSS class.
    await expect(frame.getByText('Show / hide tool:')).toBeVisible();
    // The keycaps live in a presentational row with no ARIA role (like the
    // backdrop / picker-catcher elsewhere); scope the keycap check to it.
    const hint = frame.locator('.ate-help');
    await expect(hint).toContainText('Shift');
    await expect(hint).toContainText('T');
  });
});
