import { expect, type Locator, type Page } from '@playwright/test';
import {
  switchLanguage,
  switchTheme,
  switchToAdminBackend,
  switchToDriverPWA,
} from './header-controls.ts';
import { prototypeFrame, prototypeHeader } from './selectors.ts';
import {
  disablePrototypeAnimations,
  gotoPrototype,
  waitForPrototypeStable,
} from './stable-page.ts';

/**
 * All visual baselines are captured with one consistent configuration:
 * EN language, light theme, on a single desktop viewport (see
 * playwright.config.ts). This helper puts the prototype into that known state
 * so every screen/popup snapshot is comparable and deterministic.
 */
/**
 * The Floating Theme Editor mounts a fixed launcher (a dev/design overlay) on
 * every surface. Suppress it BEFORE navigation so it never appears in pixel
 * baselines — its own behaviour is covered in tests/e2e/theme-editor. Must be
 * called before the first goto to take effect.
 */
export async function hideThemeEditorChrome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('autheon.themeEditor.hidden', '1');
    } catch {
      /* localStorage unavailable — the launcher self-suppresses anyway */
    }
  });
}

async function prepareVisualBaseline(page: Page): Promise<void> {
  await hideThemeEditorChrome(page);
  await gotoPrototype(page);
  await switchLanguage(page, 'EN');
  await switchTheme(page, 'light');
}

/** Prepare the Driver PWA surface for a visual snapshot. */
export async function prepareDriverVisual(page: Page): Promise<void> {
  await prepareVisualBaseline(page);
  await switchToDriverPWA(page);
  await settleForCapture(page);
}

/** Prepare the Admin Backend surface for a visual snapshot. */
export async function prepareAdminVisual(page: Page): Promise<void> {
  await prepareVisualBaseline(page);
  await switchToAdminBackend(page);
  await settleForCapture(page);
}

/**
 * Disable animations and wait for the shell + fonts to be stable. Run again
 * after navigating so late-mounted regions cannot animate during capture.
 */
export async function settleForCapture(page: Page): Promise<void> {
  await disablePrototypeAnimations(page);
  await waitForPrototypeStable(page);
}

/** Click a Driver PWA bottom-tab by its accessible label. */
export async function openDriverTab(
  page: Page,
  label: RegExp,
): Promise<void> {
  await prototypeFrame(page)
    .locator('.tabbar-capsule')
    .getByRole('button', { name: label })
    .click();
  await settleForCapture(page);
}

/** Click an Admin console left-nav item by its accessible label. */
export async function openAdminSection(
  page: Page,
  label: RegExp,
): Promise<void> {
  await prototypeFrame(page).locator('.admin-nav').getByRole('button', { name: label }).click();
  await settleForCapture(page);
}

/**
 * Wait for an open dialog/sheet to be fully mounted and visible before
 * capturing it. Uses the shared modal container classes in the prototype.
 */
export async function waitForOpenDialog(page: Page): Promise<Locator> {
  const dialog = prototypeFrame(page)
    .locator('[role="dialog"], .sheet-backdrop, .modal-backdrop')
    .last();
  await expect(dialog).toBeVisible();
  await disablePrototypeAnimations(page);
  return dialog;
}

export { prototypeFrame, prototypeHeader };
