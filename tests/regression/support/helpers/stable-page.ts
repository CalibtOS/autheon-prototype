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
  await assertServingAutheon(page);
  await waitForPrototypeShell(page);
}

/**
 * Confirm the base URL really serves AUTHEON before anything is captured.
 *
 * `webServer.reuseExistingServer` is true, so an unrelated process already
 * listening on the dev port is reused silently. Without this check a visual run
 * can compare approved AUTHEON baselines against a completely different
 * application and report the result as a set of visual differences.
 */
async function assertServingAutheon(page: Page): Promise<void> {
  const title = await page.title();

  if (/AUTHEON/i.test(title)) return;

  throw new Error(
    `The base URL ${page.url()} is not serving the AUTHEON prototype (document title: "${title}"). ` +
      'Another process is probably already listening on the dev port and was reused by ' +
      'webServer.reuseExistingServer. Stop it, or set E2E_PORT / E2E_BASE_URL to the right target.',
  );
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
