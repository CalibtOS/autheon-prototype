import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import type { Page } from '@playwright/test';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import {
  gotoPrototype,
  waitForPrototypeShell,
} from '../../regression/support/helpers/stable-page.ts';
import {
  gotoEditor,
  launcher,
  openEditor,
  panel,
  pwaLauncher,
  readStorage,
  UI_KEY,
} from '../../regression/support/helpers/theme-editor.ts';

/**
 * Visibility controls: hidden on first visit; ?themecolorchanger=1|0 overrides
 * and persists; otherwise localStorage wins. Keyboard shortcut, hide badge, and
 * header toggle all persist. The console-error fixture guards runtime errors.
 */

const TOGGLE = 'Control+Alt+Shift+T';
const hideBadge = (p: Page) =>
  prototypeFrame(p).getByRole('button', { name: 'Hide Theme Color Changer' });

const headerToggle = (p: Page) =>
  prototypeFrame(p).getByRole('button', { name: 'Theme editor', exact: true });

test.describe('visibility gate — ?themecolorchanger', () => {
  test('hidden by default on a clean URL (no flash)', async ({ page }) => {
    await gotoPrototype(page); // no gate param, no localStorage
    await expect(launcher(page)).toHaveCount(0);
    await page.waitForTimeout(300); // catch any late/deferred mount
    await expect(launcher(page)).toHaveCount(0);
    await expect(prototypeFrame(page).getByRole('main')).toBeVisible();
  });

  test('appears with ?themecolorchanger=1', async ({ page }) => {
    await gotoEditor(page);
    await expect(launcher(page)).toBeVisible();
  });

  test('?themecolorchanger=1 on load sets localStorage to visible', async ({
    page,
  }) => {
    await gotoPrototype(page, '/?themecolorchanger=1');
    await expect(launcher(page)).toBeVisible();
    const raw = await readStorage(page, UI_KEY);
    expect(JSON.parse(raw!)).toEqual({ visible: true });
  });

  test('?themecolorchanger=0 on load hides and sets localStorage to false', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({ visible: true }));
    }, UI_KEY);
    await gotoPrototype(page, '/?themecolorchanger=0');
    await expect(launcher(page)).toHaveCount(0);
    const raw = await readStorage(page, UI_KEY);
    expect(JSON.parse(raw!)).toEqual({ visible: false });
  });

  test('invalid gate values fall through to localStorage (default hidden)', async ({
    page,
  }) => {
    for (const v of ['false', '2', 'on', '']) {
      await gotoPrototype(page, '/?themecolorchanger=' + v);
      await expect(launcher(page)).toHaveCount(0);
    }
  });

  test('restores from localStorage when URL has no gate param', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({ visible: true }));
    }, UI_KEY);
    await gotoPrototype(page);
    await expect(launcher(page)).toBeVisible();
  });

  test('works alongside unrelated params, which are preserved', async ({ page }) => {
    await gotoPrototype(page, '/?tab=mine&themecolorchanger=1&foo=bar');
    await expect(launcher(page)).toBeVisible();
    const url = decodeURIComponent(page.url());
    expect(url).toContain('tab=mine');
    expect(url).toContain('foo=bar');
  });
});

test.describe('visibility persistence — toggles and navigation', () => {
  test('header toggle without URL param → reload → launcher still visible', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await headerToggle(page).click();
    await expect(launcher(page)).toBeVisible();
    await page.reload();
    await waitForPrototypeShell(page);
    await expect(launcher(page)).toBeVisible();
    expect(JSON.parse((await readStorage(page, UI_KEY))!)).toEqual({
      visible: true,
    });
  });

  test('keyboard shortcut hide → reload → stays hidden', async ({ page }) => {
    await gotoPrototype(page);
    await headerToggle(page).click();
    await expect(launcher(page)).toBeVisible();
    await page.keyboard.press(TOGGLE);
    await expect(launcher(page)).toBeHidden();
    await page.reload();
    await waitForPrototypeShell(page);
    await expect(launcher(page)).toHaveCount(0);
    expect(JSON.parse((await readStorage(page, UI_KEY))!)).toEqual({
      visible: false,
    });
  });

  test('red hide badge → reload → stays hidden', async ({ page }) => {
    await gotoPrototype(page);
    await headerToggle(page).click();
    await expect(launcher(page)).toBeVisible();
    await hideBadge(page).click();
    await expect(launcher(page)).toBeHidden();
    await page.reload();
    await waitForPrototypeShell(page);
    await expect(launcher(page)).toHaveCount(0);
    expect(JSON.parse((await readStorage(page, UI_KEY))!)).toEqual({
      visible: false,
    });
  });

  test('toggle on in prototype → navigate to /pwa/ → launcher visible', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await headerToggle(page).click();
    await expect(launcher(page)).toBeVisible();
    await page.goto('/pwa/');
    await expect(pwaLauncher(page)).toBeVisible();
  });

  test('cross-tab sync between prototype and PWA', async ({ page, context }) => {
    await gotoPrototype(page);
    const pwaPage = await context.newPage();
    await pwaPage.goto('/pwa/');
    await expect(pwaLauncher(pwaPage)).toHaveCount(0);

    await headerToggle(page).click();
    await expect(launcher(page)).toBeVisible();
    await expect(pwaLauncher(pwaPage)).toBeVisible();

    await page.keyboard.press(TOGGLE);
    await expect(launcher(page)).toBeHidden();
    await expect(pwaLauncher(pwaPage)).toHaveCount(0);
  });
});

test.describe('keyboard shortcut — Ctrl/⌘ + Alt + Shift + T', () => {
  test('hides then restores the whole feature', async ({ page }) => {
    await gotoEditor(page);
    await openEditor(page);
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
    await expect(panel(page)).toHaveCount(0);

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
    expect(lb!.x).toBeLessThan(start!.x - 100);
    expect(bb!.x + bb!.width).toBeGreaterThan(lb!.x + lb!.width - 2);
    expect(bb!.y).toBeLessThan(lb!.y + 4);
  });
});

test.describe('framed-preview header toggle', () => {
  test('shows and hides the theme editor from the navbar', async ({ page }) => {
    await gotoPrototype(page);
    const toggle = headerToggle(page);

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(launcher(page)).toHaveCount(0);

    await toggle.click();
    await expect(launcher(page)).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await toggle.click();
    await expect(launcher(page)).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  test('stays in sync when the keyboard shortcut hides the tool', async ({
    page,
  }) => {
    await gotoEditor(page);
    const toggle = headerToggle(page);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(launcher(page)).toBeVisible();

    await page.keyboard.press(TOGGLE);
    await expect(launcher(page)).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('overlay shortcut hint', () => {
  test('the panel communicates the show/hide shortcut', async ({ page }) => {
    await gotoEditor(page);
    await openEditor(page);
    const frame = prototypeFrame(page);
    await expect(frame.getByText('Show / hide tool:')).toBeVisible();
    const hint = frame.locator('.ate-help');
    await expect(hint).toContainText('Shift');
    await expect(hint).toContainText('T');
  });
});
