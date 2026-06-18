import { expect, type Page } from '@playwright/test';
import {
  adminSurface,
  driverSurface,
  prototypeFrame,
  prototypeHeader,
  prototypeHtml,
} from './selectors.ts';
import { waitForPrototypeStable } from './stable-page.ts';

export type PrototypeSurface = 'driver' | 'admin';
export type PrototypeLanguage = 'EN' | 'DE';
export type PrototypeTheme = 'light' | 'dark';

export async function switchToDriverPWA(page: Page): Promise<void> {
  await prototypeHeader(page)
    .getByRole('button', { name: /Driver\s*PWA|Fahrer App/i })
    .click();
  await expectCurrentSurface(page, 'driver');
}

export async function switchToAdminBackend(page: Page): Promise<void> {
  await prototypeHeader(page)
    .getByRole('button', { name: /Admin Backend/i })
    .click();
  await expectCurrentSurface(page, 'admin');
}

export async function switchLanguage(
  page: Page,
  language: PrototypeLanguage,
): Promise<void> {
  await prototypeHeader(page)
    .locator('.locale-switch')
    .getByRole('button', { name: language })
    .click();

  await expect(prototypeHtml(page)).toHaveAttribute(
    'lang',
    language.toLowerCase(),
  );
  await waitForPrototypeStable(page);
}

export async function switchTheme(
  page: Page,
  theme: PrototypeTheme,
): Promise<void> {
  const name = theme === 'light' ? /Light|Hell/i : /Dark|Dunkel/i;

  await prototypeHeader(page)
    .locator('.theme-switch')
    .getByRole('button', { name })
    .click();

  await expect(prototypeHtml(page)).toHaveAttribute('data-theme', theme);
  await waitForPrototypeStable(page);
}

export async function expectPrototypeShellVisible(page: Page): Promise<void> {
  const header = prototypeHeader(page);

  await expect(header).toBeVisible();
  await expect(
    header.locator('.brand').getByText('Transport Portal', { exact: true }),
  ).toBeVisible();
  await expect(header.getByRole('button', { name: /Driver\s*PWA|Fahrer App/i })).toBeVisible();
  await expect(header.getByRole('button', { name: /Admin Backend/i })).toBeVisible();
  await expect(header.locator('.locale-switch').getByRole('button', { name: 'EN' })).toBeVisible();
  await expect(header.locator('.locale-switch').getByRole('button', { name: 'DE' })).toBeVisible();
  await expect(header.locator('.theme-switch').getByRole('button', { name: /Light|Hell/i })).toBeVisible();
  await expect(header.locator('.theme-switch').getByRole('button', { name: /Dark|Dunkel/i })).toBeVisible();
  await expect(prototypeFrame(page).getByRole('main')).toBeVisible();
}

export async function expectCurrentSurface(
  page: Page,
  surface: PrototypeSurface,
): Promise<void> {
  if (surface === 'driver') {
    await expect(driverSurface(page)).toBeVisible();
    await expect(adminSurface(page)).toBeHidden();
    await expect(
      prototypeFrame(page).getByRole('heading', { name: /Marketplace|Marktplatz/i }),
    ).toBeVisible();
    return;
  }

  await expect(adminSurface(page)).toBeVisible();
  await expect(driverSurface(page)).toBeHidden();
  await expect(
    prototypeFrame(page).getByRole('heading', {
      name: /Job overview|Auftrags/i,
    }),
  ).toBeVisible();
}
