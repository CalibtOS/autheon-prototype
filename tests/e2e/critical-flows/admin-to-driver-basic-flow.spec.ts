import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import {
  expectCurrentSurface,
  switchLanguage,
  switchTheme,
  switchToAdminBackend,
  switchToDriverPWA,
} from '../../regression/support/helpers/header-controls.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { gotoPrototype, waitForPrototypeStable } from '../../regression/support/helpers/stable-page.ts';

test.describe('Admin to DriverPWA state handoff', () => {
  test('admin publishes draft tour 0839-26 and driver sees it in marketplace', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await switchLanguage(page, 'EN');
    await switchTheme(page, 'light');

    const frame = prototypeFrame(page);

    await test.step('open the draft tour in Admin Backend', async () => {
      await switchToAdminBackend(page);
      await frame.getByText('0839-26', { exact: true }).click();
      await expect(
        frame.getByRole('heading', { name: /AutoLogistik KG/i }),
      ).toBeVisible();
      await expect(frame.getByText(/Draft/i).first()).toBeVisible();
    });

    await test.step('publish the draft to the marketplace', async () => {
      await frame
        .getByRole('button', { name: /Publish to marketplace/i })
        .click();
      await expect(frame.getByText(/Published.*0839-26/i)).toBeVisible();
    });

    await test.step('verify the driver marketplace reflects the published tour', async () => {
      await switchToDriverPWA(page);
      await expectCurrentSurface(page, 'driver');
      await waitForPrototypeStable(page);

      const berlinStuttgartCard = frame
        .locator('.jobcard')
        .filter({ hasText: 'Berlin' })
        .filter({ hasText: 'Stuttgart' });

      await expect(berlinStuttgartCard).toBeVisible();
      await berlinStuttgartCard.click();

      await expect(
        frame.getByRole('heading', { name: /Marketplace preview/i }),
      ).toBeVisible();
      await expect(frame.getByText(/BERLIN.*STUTTGART/i)).toBeVisible();
      await expect(frame.getByText(/632 km/i)).toBeVisible();
      await expect(frame.getByRole('button', { name: /Accept tour/i })).toBeVisible();
    });
  });
});
