import { test } from './support/fixtures/prototype-test.ts';
import {
  expectCurrentSurface,
  expectPrototypeShellVisible,
  switchLanguage,
  switchTheme,
  switchToAdminBackend,
  switchToDriverPWA,
  type PrototypeLanguage,
  type PrototypeSurface,
  type PrototypeTheme,
} from './support/helpers/header-controls.ts';
import { gotoPrototype, waitForPrototypeStable } from './support/helpers/stable-page.ts';

const combinations: Array<{
  label: string;
  surface: PrototypeSurface;
  language: PrototypeLanguage;
  theme: PrototypeTheme;
}> = [
  {
    label: 'DriverPWA + EN + light',
    surface: 'driver',
    language: 'EN',
    theme: 'light',
  },
  {
    label: 'DriverPWA + DE + dark',
    surface: 'driver',
    language: 'DE',
    theme: 'dark',
  },
  {
    label: 'Admin Backend + EN + light',
    surface: 'admin',
    language: 'EN',
    theme: 'light',
  },
  {
    label: 'Admin Backend + DE + dark',
    surface: 'admin',
    language: 'DE',
    theme: 'dark',
  },
];

test.describe('role, language, and theme structural regression', () => {
  for (const combo of combinations) {
    test(`keeps core shell structure stable for ${combo.label}`, async ({
      page,
    }) => {
      await gotoPrototype(page);
      await switchLanguage(page, combo.language);
      await switchTheme(page, combo.theme);

      if (combo.surface === 'driver') {
        await switchToDriverPWA(page);
      } else {
        await switchToAdminBackend(page);
      }

      await waitForPrototypeStable(page);
      await expectPrototypeShellVisible(page);
      await expectCurrentSurface(page, combo.surface);
    });
  }
});
