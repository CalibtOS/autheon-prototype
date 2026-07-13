import { test } from '../../regression/support/fixtures/prototype-test.ts';
import {
  expectCurrentSurface,
  expectPrototypeShellVisible,
  switchLanguage,
  switchTheme,
  switchToAdminBackend,
  switchToDriverPWA,
} from '../../regression/support/helpers/header-controls.ts';
import { gotoPrototype } from '../../regression/support/helpers/stable-page.ts';

test.describe('prototype header controls @smoke', () => {
  test('switches role, language, and theme without breaking the shell @smoke', async ({
    page,
  }) => {
    await gotoPrototype(page);

    await switchToDriverPWA(page);
    await expectCurrentSurface(page, 'driver');

    await switchToAdminBackend(page);
    await expectCurrentSurface(page, 'admin');

    await switchLanguage(page, 'DE');
    await expectPrototypeShellVisible(page);
    await expectCurrentSurface(page, 'admin');

    await switchLanguage(page, 'EN');
    await expectPrototypeShellVisible(page);
    await expectCurrentSurface(page, 'admin');

    await switchTheme(page, 'dark');
    await expectPrototypeShellVisible(page);
    await expectCurrentSurface(page, 'admin');

    await switchTheme(page, 'light');
    await expectPrototypeShellVisible(page);
    await expectCurrentSurface(page, 'admin');
  });
});
