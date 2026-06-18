import type { Frame, FrameLocator, Locator, Page } from '@playwright/test';

export const PROTOTYPE_FRAME_TITLE = 'AUTHEON Prototype';
export const PROTOTYPE_FRAME_SELECTOR = `iframe[title="${PROTOTYPE_FRAME_TITLE}"]`;

export function prototypeFrame(page: Page): FrameLocator {
  return page.frameLocator(PROTOTYPE_FRAME_SELECTOR);
}

export async function getPrototypeFrame(page: Page): Promise<Frame> {
  const iframe = page.locator(PROTOTYPE_FRAME_SELECTOR);
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();

  if (!frame) {
    throw new Error(`Could not resolve iframe "${PROTOTYPE_FRAME_TITLE}".`);
  }

  return frame;
}

export function prototypeHeader(page: Page): Locator {
  return prototypeFrame(page).getByRole('banner');
}

export function prototypeMain(page: Page): Locator {
  return prototypeFrame(page).getByRole('main');
}

export function prototypeHtml(page: Page): Locator {
  return prototypeFrame(page).locator('html');
}

export function prototypeApp(page: Page): Locator {
  return prototypeFrame(page).locator('#root .app');
}

export function driverSurface(page: Page): Locator {
  return prototypeFrame(page).locator('.phone-shell');
}

export function adminSurface(page: Page): Locator {
  return prototypeFrame(page).locator('.admin');
}

