import { test, expect } from './support/fixtures/prototype-test.ts';
import {
  switchLanguage,
  switchTheme,
  switchToDriverPWA,
} from './support/helpers/header-controls.ts';
import { prototypeFrame, prototypeHeader } from './support/helpers/selectors.ts';
import { gotoPrototype, waitForPrototypeStable } from './support/helpers/stable-page.ts';

test.describe('prototype shell ARIA regression', () => {
  test('shell header and DriverPWA tabbar match approved ARIA snapshots', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await switchLanguage(page, 'EN');
    await switchTheme(page, 'light');
    await switchToDriverPWA(page);
    await waitForPrototypeStable(page);

    await expect(prototypeHeader(page)).toMatchAriaSnapshot({
      name: 'prototype-shell-header.aria.yml',
    });
    await expect(prototypeFrame(page).locator('.tabbar')).toMatchAriaSnapshot({
      name: 'driver-tabbar.aria.yml',
    });
  });
});
