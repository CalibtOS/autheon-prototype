import { expect, type Page } from '@playwright/test';
import {
  getPrototypeFrame,
  prototypeApp,
  prototypeFrame,
  prototypeHeader,
  prototypeMain,
  PROTOTYPE_FRAME_SELECTOR,
} from './selectors.ts';

const DISABLE_ANIMATIONS_STYLE = `
*,
*::before,
*::after {
  animation-duration: 0.001s !important;
  animation-delay: 0s !important;
  transition-duration: 0.001s !important;
  transition-delay: 0s !important;
  scroll-behavior: auto !important;
}
`;

export async function gotoPrototype(page: Page, path = '/'): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForPrototypeShell(page);
}

export async function waitForPrototypeShell(page: Page): Promise<void> {
  await expect(page.locator(PROTOTYPE_FRAME_SELECTOR)).toBeVisible();
  await expect(prototypeApp(page)).toBeVisible();
  await expect(prototypeHeader(page)).toBeVisible();
  await expect(prototypeMain(page)).toBeVisible();
  await expect(
    prototypeFrame(page).getByRole('button', { name: /Driver\s*PWA|Fahrer App/i }),
  ).toBeVisible();
  await expect(
    prototypeFrame(page).getByRole('button', { name: /Admin Backend/i }),
  ).toBeVisible();
}

export async function waitForVisibleMainHeading(page: Page): Promise<void> {
  await expect(prototypeMain(page).getByRole('heading').first()).toBeVisible();
}

export async function waitForPrototypeStable(page: Page): Promise<void> {
  await waitForPrototypeShell(page);
  await waitForVisibleMainHeading(page);

  const frame = await getPrototypeFrame(page);
  await frame.evaluate(async () => {
    await document.fonts?.ready;
  });
}

export async function disablePrototypeAnimations(page: Page): Promise<void> {
  const frame = await getPrototypeFrame(page);
  await frame.addStyleTag({ content: DISABLE_ANIMATIONS_STYLE });
}
