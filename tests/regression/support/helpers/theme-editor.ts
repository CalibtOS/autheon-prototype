import { expect, type Page } from '@playwright/test';
import { getPrototypeFrame, prototypeFrame } from './selectors.ts';

/**
 * Shared automation for the Floating Theme Editor specs. The editor mounts
 * inside the prototype iframe, so every locator goes through prototypeFrame().
 * Per the selector-priority guide we drive the UI through roles / accessible
 * names; the only CSS-class locators (backdrop, picker catcher) live in the
 * specs that need them, since those layers carry no ARIA role.
 */

export const ACCENT_VAR = '--brand-accent';
export const OVERRIDE_KEY = 'autheon.themeEditor.overrides.v1';
export const LAUNCHER_KEY = 'autheon.themeEditor.launcher.v1';

export const launcher = (p: Page) =>
  prototypeFrame(p).getByRole('button', { name: 'Open Theme Editor' });

export const panel = (p: Page) =>
  prototypeFrame(p).getByRole('dialog', { name: 'Theme Editor' });

export const picker = (p: Page) =>
  prototypeFrame(p).getByRole('dialog', { name: /Colour picker/ });

// Exact / anchored so these never also match the "Accent (pressed)" row.
export const accentHex = (p: Page) =>
  prototypeFrame(p).getByLabel('Hex value for Accent', { exact: true });

export const accentSwatch = (p: Page) =>
  prototypeFrame(p).getByRole('button', {
    name: /^Pick colour for Accent \(currently /,
  });

/** Computed value of a CSS custom property on <html>, upper-cased. */
export async function readVar(page: Page, name: string): Promise<string> {
  const frame = await getPrototypeFrame(page);
  const raw = await frame.evaluate(
    (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  );
  return raw.toUpperCase();
}

export async function readStorage(
  page: Page,
  key: string,
): Promise<string | null> {
  const frame = await getPrototypeFrame(page);
  return frame.evaluate((k) => window.localStorage.getItem(k), key);
}

export async function readClipboard(page: Page): Promise<string> {
  const frame = await getPrototypeFrame(page);
  return frame.evaluate(() => navigator.clipboard.readText());
}

export async function openEditor(page: Page): Promise<void> {
  await launcher(page).click();
  await expect(panel(page)).toBeVisible();
}

export async function setAccent(page: Page, hex: string): Promise<void> {
  await accentHex(page).fill(hex);
  await accentHex(page).press('Enter');
}

export async function openExport(page: Page): Promise<void> {
  await prototypeFrame(page).getByText('Export & share').click();
}
