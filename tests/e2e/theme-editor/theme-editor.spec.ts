import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import type { Page } from '@playwright/test';
import {
  getPrototypeFrame,
  prototypeFrame,
} from '../../regression/support/helpers/selectors.ts';
import { gotoPrototype } from '../../regression/support/helpers/stable-page.ts';

/**
 * Behavioural E2E for the Floating Theme Editor, mapped to the feature spec's
 * acceptance criteria. The editor mounts inside the prototype iframe, so every
 * locator goes through prototypeFrame(page). Per the repo selector-priority
 * guide (tests/docs/FRONTEND_E2E_REGRESSION_FRAMEWORK_GUIDE.md) we drive the UI
 * through roles / accessible names; the only CSS-class locators are the two
 * presentational layers that carry no ARIA role (backdrop, picker catcher).
 *
 * These tests deliberately do NOT suppress the launcher (unlike the visual
 * specs). The prototype's in-memory store re-seeds on every load, so a colour
 * surviving a reload also proves persistence is independent of mock-data reseed.
 */

const ACCENT_VAR = '--brand-accent';
const OVERRIDE_KEY = 'autheon.themeEditor.overrides.v1';
const LAUNCHER_KEY = 'autheon.themeEditor.launcher.v1';

const launcher = (p: Page) =>
  prototypeFrame(p).getByRole('button', { name: 'Open Theme Editor' });
const panel = (p: Page) =>
  prototypeFrame(p).getByRole('dialog', { name: 'Theme Editor' });
const picker = (p: Page) =>
  prototypeFrame(p).getByRole('dialog', { name: /Colour picker/ });
// Exact / anchored so these never also match the "Accent (pressed)" row.
const accentHex = (p: Page) =>
  prototypeFrame(p).getByLabel('Hex value for Accent', { exact: true });
const accentSwatch = (p: Page) =>
  prototypeFrame(p).getByRole('button', {
    name: /^Pick colour for Accent \(currently /,
  });

async function readVar(page: Page, name: string) {
  const frame = await getPrototypeFrame(page);
  const raw = await frame.evaluate(
    (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  );
  return raw.toUpperCase();
}

async function readStorage(page: Page, key: string) {
  const frame = await getPrototypeFrame(page);
  return frame.evaluate((k) => window.localStorage.getItem(k), key);
}

async function openEditor(page: Page) {
  await launcher(page).click();
  await expect(panel(page)).toBeVisible();
}

test.describe('Floating Theme Editor', () => {
  test('AC1: launcher appears in the bottom-right corner on first use', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await expect(launcher(page)).toBeVisible();

    const box = await launcher(page).boundingBox();
    const vp = page.viewportSize();
    expect(box).not.toBeNull();
    expect(vp).not.toBeNull();
    // Bottom-right quadrant of the viewport, fully inside it.
    expect(box!.x).toBeGreaterThan(vp!.width * 0.7);
    expect(box!.y).toBeGreaterThan(vp!.height * 0.7);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vp!.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(vp!.height);
  });

  test('AC5/AC6: opens the editor and lists grouped colours with name, value and swatch', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await openEditor(page);
    const frame = prototypeFrame(page);

    await expect(frame.getByRole('heading', { name: 'Theme Editor' })).toBeVisible();
    // Colours are grouped into logical categories.
    await expect(frame.getByRole('heading', { name: 'Brand' })).toBeVisible();
    await expect(frame.getByRole('heading', { name: 'Backgrounds' })).toBeVisible();
    await expect(frame.getByRole('heading', { name: 'Status' })).toBeVisible();
    // A representative colour exposes its human name, variable, swatch and hex.
    await expect(frame.getByText('Accent', { exact: true })).toBeVisible();
    await expect(frame.getByText('--brand-accent')).toBeVisible();
    await expect(accentSwatch(page)).toBeVisible();
    await expect(accentHex(page)).toHaveValue(/^#[0-9A-F]{6}$/);
  });

  test('AC7: a valid hex edit updates the application immediately', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await openEditor(page);
    await accentHex(page).fill('ff0000');
    await accentHex(page).press('Enter');

    expect(await readVar(page, ACCENT_VAR)).toBe('#FF0000');
    // The derived --primary follows the accent, proving real-time propagation.
    expect(await readVar(page, '--primary')).toBe('#FF0000');
  });

  test('AC8: an invalid hex value does not replace the previous valid value', async ({
    page,
  }) => {
    await gotoPrototype(page);
    const before = await readVar(page, ACCENT_VAR);
    await openEditor(page);
    await accentHex(page).fill('not-a-colour');
    await accentHex(page).press('Enter');

    await expect(accentHex(page)).toHaveAttribute('aria-invalid', 'true');
    expect(await readVar(page, ACCENT_VAR)).toBe(before);
  });

  test('AC14/AC15: theme changes survive a reload (and mock-data reseed)', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await openEditor(page);
    await accentHex(page).fill('00CC66');
    await accentHex(page).press('Enter');
    expect(await readVar(page, ACCENT_VAR)).toBe('#00CC66');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(launcher(page)).toBeVisible();

    expect(await readVar(page, ACCENT_VAR)).toBe('#00CC66');
    expect(await readStorage(page, OVERRIDE_KEY)).toContain('00CC66');
  });

  test('AC16: reset restores the code-defined default colours and keeps the editor open', async ({
    page,
  }) => {
    await gotoPrototype(page);
    const original = await readVar(page, ACCENT_VAR);
    await openEditor(page);
    const frame = prototypeFrame(page);

    await accentHex(page).fill('123456');
    await accentHex(page).press('Enter');
    expect(await readVar(page, ACCENT_VAR)).toBe('#123456');

    await frame.getByRole('button', { name: 'Reset to defaults' }).click();
    await expect(
      frame.getByRole('alertdialog', { name: /Reset all theme colours/ }),
    ).toBeVisible();
    await frame.getByRole('button', { name: 'Reset colours' }).click();

    // Editor stays open so the restored values can be reviewed.
    await expect(panel(page)).toBeVisible();
    expect(await readVar(page, ACCENT_VAR)).toBe(original);
    expect(await readStorage(page, OVERRIDE_KEY)).toBeNull();
  });

  test('AC13: closes via the close button, the backdrop and Escape', async ({
    page,
  }) => {
    await gotoPrototype(page);
    const frame = prototypeFrame(page);

    // Close button
    await openEditor(page);
    await frame.getByRole('button', { name: 'Close Theme Editor' }).click();
    await expect(panel(page)).toBeHidden();

    // Backdrop — a presentational layer with no ARIA role; click a corner well
    // away from the panel.
    await openEditor(page);
    await frame.locator('.ate-backdrop').click({ position: { x: 6, y: 6 } });
    await expect(panel(page)).toBeHidden();

    // Escape
    await openEditor(page);
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
  });

  test('AC18: the launcher is keyboard-operable', async ({ page }) => {
    await gotoPrototype(page);
    await launcher(page).focus();
    await expect(launcher(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel(page)).toBeVisible();
  });

  test('AC9/AC11: a swatch opens the picker and OK commits the value', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await openEditor(page);

    await accentSwatch(page).click();
    await expect(picker(page)).toBeVisible();

    const pickerHex = picker(page).getByLabel('Hex value', { exact: true });
    await pickerHex.fill('#112233');
    await pickerHex.press('Enter');
    await picker(page).getByRole('button', { name: 'OK' }).click();

    await expect(picker(page)).toBeHidden();
    await expect(panel(page)).toBeVisible();
    expect(await readVar(page, ACCENT_VAR)).toBe('#112233');
  });

  test('AC10/AC12: the picker previews live and Cancel restores the pre-picker value', async ({
    page,
  }) => {
    await gotoPrototype(page);
    const original = await readVar(page, ACCENT_VAR);
    await openEditor(page);

    await accentSwatch(page).click();
    await expect(picker(page)).toBeVisible();

    // Live preview: moving the hue changes the applied colour in real time.
    await picker(page).getByRole('slider', { name: 'Hue' }).fill('200');
    expect(await readVar(page, ACCENT_VAR)).not.toBe(original);

    await picker(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(picker(page)).toBeHidden();
    await expect(panel(page)).toBeVisible();
    expect(await readVar(page, ACCENT_VAR)).toBe(original);
    expect(await readStorage(page, OVERRIDE_KEY)).toBeNull();
  });

  test('AC12: clicking outside the picker cancels it but keeps the editor open', async ({
    page,
  }) => {
    await gotoPrototype(page);
    const original = await readVar(page, ACCENT_VAR);
    await openEditor(page);
    const frame = prototypeFrame(page);

    await accentSwatch(page).click();
    await expect(picker(page)).toBeVisible();
    await picker(page).getByRole('slider', { name: 'Hue' }).fill('90');

    // The catcher is a presentational layer (no ARIA role).
    await frame.locator('.ate-picker-catcher').click({ position: { x: 4, y: 4 } });
    await expect(picker(page)).toBeHidden();
    await expect(panel(page)).toBeVisible();
    expect(await readVar(page, ACCENT_VAR)).toBe(original);
  });

  test('AC2/AC3/AC4: dragging moves the launcher without opening the editor', async ({
    page,
  }) => {
    await gotoPrototype(page);
    const start = await launcher(page).boundingBox();
    expect(start).not.toBeNull();

    await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
    await page.mouse.down();
    await page.mouse.move(220, 240, { steps: 12 });
    await page.mouse.up();

    // A drag must not open the editor.
    await expect(panel(page)).toHaveCount(0);

    const moved = await launcher(page).boundingBox();
    expect(moved).not.toBeNull();
    // Snapped to the left edge, still fully inside the viewport.
    const vp = page.viewportSize()!;
    expect(moved!.x).toBeLessThan(start!.x - 100);
    expect(moved!.x).toBeGreaterThanOrEqual(0);
    expect(moved!.y).toBeGreaterThanOrEqual(0);
    expect(moved!.y + moved!.height).toBeLessThanOrEqual(vp.height);

    // Position persists.
    expect(await readStorage(page, LAUNCHER_KEY)).not.toBeNull();
  });

  test('AC20: a localStorage write failure does not break the editor', async ({
    page,
  }) => {
    await gotoPrototype(page);

    // Simulate a storage backend that reads fine but rejects writes (full disk
    // / private mode). Applied AFTER the app has loaded so the host prototype —
    // which does not guard its own localStorage — is unaffected.
    const frame = await getPrototypeFrame(page);
    await frame.evaluate(() => {
      const real = window.localStorage;
      const broken = {
        getItem: (k: string) => real.getItem(k),
        setItem: () => {
          throw new Error('storage full');
        },
        removeItem: () => {
          throw new Error('storage full');
        },
        clear: () => {},
        key: (i: number) => real.key(i),
        get length() {
          return real.length;
        },
      };
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          return broken;
        },
      });
    });

    await expect(launcher(page)).toBeVisible();
    await openEditor(page);

    // A non-blocking storage warning is surfaced, and edits still apply in-memory.
    await expect(
      prototypeFrame(page).getByText(/Local storage is unavailable/i),
    ).toBeVisible();
    await accentHex(page).fill('ABCDEF');
    await accentHex(page).press('Enter');
    expect(await readVar(page, ACCENT_VAR)).toBe('#ABCDEF');
  });
});
