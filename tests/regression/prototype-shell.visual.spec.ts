import { test, expect } from './support/fixtures/prototype-test.ts';
import {
  switchLanguage,
  switchTheme,
} from './support/helpers/header-controls.ts';
import {
  driverSurface,
  prototypeFrame,
  prototypeHeader,
} from './support/helpers/selectors.ts';
import {
  disablePrototypeAnimations,
  gotoPrototype,
  waitForPrototypeStable,
} from './support/helpers/stable-page.ts';
import { hideThemeEditorChrome } from './support/helpers/visual.ts';

test.describe('prototype shell visual regression', () => {
  test('default DriverPWA EN light shell matches approved baseline @visual-regression', async ({
    page,
  }) => {
    await hideThemeEditorChrome(page);
    await gotoPrototype(page);
    await switchLanguage(page, 'EN');
    await switchTheme(page, 'light');
    await prototypeHeader(page)
      .getByRole('button', { name: /Driver\s*PWA|Fahrer App/i })
      .click();
    await expect(driverSurface(page)).toBeVisible();
    await disablePrototypeAnimations(page);
    await waitForPrototypeStable(page);

    const frame = prototypeFrame(page);

    await expect(page).toHaveScreenshot('prototype-shell-default.png', {
      fullPage: true,
      mask: [frame.getByText(/open tours/i)],
    });
  });
});
