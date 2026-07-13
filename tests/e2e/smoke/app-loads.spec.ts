import { test } from '../../regression/support/fixtures/prototype-test.ts';
import { expectCurrentSurface, expectPrototypeShellVisible } from '../../regression/support/helpers/header-controls.ts';
import { gotoPrototype, waitForPrototypeStable } from '../../regression/support/helpers/stable-page.ts';

test.describe('prototype app load @smoke', () => {
  test('loads the shell and exposes core header controls @smoke', async ({ page }) => {
    await gotoPrototype(page);
    await waitForPrototypeStable(page);

    await expectPrototypeShellVisible(page);
    await expectCurrentSurface(page, 'driver');
  });
});
