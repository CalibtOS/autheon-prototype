import { expect, test } from '../regression/support/fixtures/prototype-test.ts';
import { switchToDriverPWA } from '../regression/support/helpers/header-controls.ts';
import { prototypeFrame } from '../regression/support/helpers/selectors.ts';
import {
  openAdminSection,
  openDriverTab,
  prepareAdminVisual,
} from '../regression/support/helpers/visual.ts';

test.describe('help contacts and Profile mail actions @smoke', () => {
  test('Admin saves all three channels through one form and Driver uses the cached recipients', async ({
    page,
  }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, /^Settings$/);

    const frame = prototypeFrame(page);
    await frame.getByRole('tab', { name: /^System settings$/ }).click();

    const helpContacts = frame.getByRole('heading', {
      level: 2,
      name: /^Help contacts$/,
    });
    await expect(helpContacts).toBeVisible();

    const form = frame.locator('.help-contacts-form');
    const save = form.getByRole('button', { name: /^Save contacts$/ });
    const discard = form.getByRole('button', { name: /^Discard changes$/ });
    const feedback = form.locator('#help-contacts-feedback');
    const reportError = form.locator('#help-contacts-report-error');

    await expect(form.locator('#help-contacts-hotline')).toHaveValue(
      '+49 30 1234 5678',
    );
    await expect(form.locator('#help-contacts-infopoint-email')).toHaveValue(
      'support@autheon.example',
    );
    await expect(feedback).toHaveValue('feedback@autheon.example');
    await expect(reportError).toHaveValue('errors@autheon.example');
    await expect(save).toBeDisabled();
    await expect(discard).toBeDisabled();

    await feedback.fill('not-an-email');
    await expect(save).toBeDisabled();
    await expect(form.getByText('Enter a valid email address.')).toBeVisible();

    await discard.click();
    await expect(feedback).toHaveValue('feedback@autheon.example');
    await expect(form.getByText('Enter a valid email address.')).toHaveCount(0);

    await feedback.fill('driver-feedback@example.com');
    await reportError.fill('driver-errors@example.com');
    await expect(save).toBeEnabled();
    await save.click();

    const storedContacts = await page
      .locator('iframe[title="AUTHEON Prototype"]')
      .evaluate(
        (el: HTMLIFrameElement) =>
          (el.contentWindow as any).AuthStore.getDriverSupportContact(),
      );
    expect(storedContacts).toMatchObject({
      phone: '+49 30 1234 5678',
      email: 'support@autheon.example',
      feedbackEmail: 'driver-feedback@example.com',
      reportErrorEmail: 'driver-errors@example.com',
    });

    await switchToDriverPWA(page);
    await openDriverTab(page, /^Profile$/);

    await expect(
      frame.locator('[data-profile-row="feedback"]'),
    ).toHaveAttribute(
      'href',
      `mailto:${encodeURIComponent(
        'driver-feedback@example.com',
      )}?subject=${encodeURIComponent(
        'AUTHEON feedback — Partner ID AU-41-0228',
      )}`,
    );
    await expect(
      frame.locator('[data-profile-row="reportError"]'),
    ).toHaveAttribute(
      'href',
      `mailto:${encodeURIComponent(
        'driver-errors@example.com',
      )}?subject=${encodeURIComponent(
        'AUTHEON error report — Partner ID AU-41-0228',
      )}`,
    );
  });

  test('standalone PWA keeps the German mail actions usable at 320px', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('autheon-locale', 'de');
      localStorage.setItem('autheon-theme', 'light');
    });
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/pwa/?tab=profile', { waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', {
        name: /Fill demo credentials|Demo-Zugangsdaten/i,
      })
      .click();
    await page.getByRole('button', { name: /^Anmelden$/ }).click();

    await expect(
      page.getByRole('heading', { level: 1, name: /^Profil$/ }),
    ).toBeVisible();
    const feedback = page.locator('[data-profile-row="feedback"]');
    const reportError = page.locator('[data-profile-row="reportError"]');
    await feedback.scrollIntoViewIfNeeded();
    await expect(feedback).toBeVisible();
    await expect(reportError).toBeVisible();

    const feedbackHref = (await feedback.getAttribute('href'))!;
    const reportErrorHref = (await reportError.getAttribute('href'))!;
    expect(new URLSearchParams(feedbackHref.split('?')[1]).get('subject')).toBe(
      'AUTHEON Feedback — Partner-ID AU-41-0228',
    );
    expect(
      new URLSearchParams(reportErrorHref.split('?')[1]).get('subject'),
    ).toBe('AUTHEON Fehlermeldung — Partner-ID AU-41-0228');

    const hasOverflow = await page.locator('.phone-screen').evaluate(
      (screen) => screen.scrollWidth > screen.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});
