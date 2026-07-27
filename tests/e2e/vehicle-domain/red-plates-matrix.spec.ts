/**
 * Red-licence-plate decision matrix across every UI surface.
 *
 * Client confirmation "Systemlogik Fahrzeugeingabe" (PRD v2.8):
 *   requiresRedLicencePlates = (registrationStatus === DEREGISTERED
 *                               AND transportType === OWN_AXLE)
 *
 * The domain-level matrix is verified exhaustively by
 * `prototype/project/_verify-vehicle-domain.mjs`. This suite verifies that the
 * five required UI surfaces consume that one derived value consistently and
 * never make a conflicting decision.
 */
import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import {
  switchLanguage,
  switchTheme,
  switchToAdminBackend,
  switchToDriverPWA,
} from '../../regression/support/helpers/header-controls.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { gotoPrototype } from '../../regression/support/helpers/stable-page.ts';

const NOTICE_EN = 'Red licence plates required';
const NOTICE_DE = 'Rote Kennzeichen erforderlich';

/** Seed fixtures, one per matrix case (see store.js seedJobs). */
const FIXTURES = {
  /** case 3, published → marketplace card / preview / booking dialog */
  deregisteredOwnAxlePublished: { tour: '0844-26', model: 'Polo' },
  /** case 3, accepted → complete order view after booking */
  deregisteredOwnAxleBooked: { tour: '0845-26', model: 'A4' },
  /** case 4, assigned → deregistered but third-party axle: NO notice */
  deregisteredThirdPartyAxle: { tour: '0840-26', model: 'Q3' },
  /** case 1, published → registered + own axle: NO notice */
  registeredOwnAxle: { tour: '0847-26', model: 'Atego' },
};

async function openDriverMarketplace(page) {
  await gotoPrototype(page);
  await switchLanguage(page, 'EN');
  await switchTheme(page, 'light');
  await switchToDriverPWA(page);
}

test.describe('Red-licence-plate notice — the five required surfaces', () => {
  test('1. Admin Backend: notice is derived live from registration status + transport type', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await switchLanguage(page, 'EN');
    await switchTheme(page, 'light');
    await switchToAdminBackend(page);
    const frame = prototypeFrame(page);

    await frame.getByRole('button', { name: /New job|Neuer Auftrag/i }).click();
    const notice = frame.getByText(NOTICE_EN);

    await test.step('case 1: registered + own axle → no notice', async () => {
      await frame.getByRole('radio', { name: 'Registered', exact: true }).click();
      await frame.getByRole('radio', { name: 'Own axle', exact: true }).click();
      await expect(notice).toHaveCount(0);
    });

    await test.step('case 2: registered + third-party axle → no notice', async () => {
      await frame.getByRole('radio', { name: 'Third-party axle', exact: true }).click();
      await expect(notice).toHaveCount(0);
    });

    await test.step('case 4: deregistered + third-party axle → no notice', async () => {
      await frame.getByRole('radio', { name: 'Deregistered', exact: true }).click();
      await expect(notice).toHaveCount(0);
    });

    await test.step('case 3: deregistered + own axle → NOTICE', async () => {
      await frame.getByRole('radio', { name: 'Own axle', exact: true }).click();
      await expect(notice.first()).toBeVisible();
    });

    await test.step('no stale notice: flipping transport type back clears it immediately', async () => {
      await frame.getByRole('radio', { name: 'Third-party axle', exact: true }).click();
      await expect(notice).toHaveCount(0);
    });

    await test.step('no stale notice: flipping registration status back clears it immediately', async () => {
      await frame.getByRole('radio', { name: 'Own axle', exact: true }).click();
      await expect(notice.first()).toBeVisible();
      await frame.getByRole('radio', { name: 'Registered', exact: true }).click();
      await expect(notice).toHaveCount(0);
    });
  });

  test('1b. Admin Backend job detail shows the notice for a deregistered own-axle order', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await switchLanguage(page, 'EN');
    await switchTheme(page, 'light');
    await switchToAdminBackend(page);
    const frame = prototypeFrame(page);

    await frame
      .getByText(FIXTURES.deregisteredOwnAxleBooked.tour, { exact: true })
      .click();
    await expect(frame.getByText(NOTICE_EN).first()).toBeVisible();
  });

  test('2. Marketplace order card shows the notice only on the deregistered own-axle tour', async ({
    page,
  }) => {
    await openDriverMarketplace(page);
    const frame = prototypeFrame(page);

    // The notice chip lives in the tag row of exactly one marketplace card.
    await expect(frame.locator('.vehicle-flag.red-plates-required')).toHaveCount(1);

    const warnedCard = frame
      .locator('.jobcard-btn')
      .filter({ has: frame.locator('.vehicle-flag.red-plates-required') });
    await expect(warnedCard).toHaveCount(1);
    await expect(
      warnedCard.getByText(FIXTURES.deregisteredOwnAxlePublished.model),
    ).toBeVisible();

    // The registered + own-axle tour must NOT carry it.
    const registeredCard = frame
      .locator('.jobcard-btn')
      .filter({ hasText: FIXTURES.registeredOwnAxle.model });
    await expect(
      registeredCard.locator('.vehicle-flag.red-plates-required'),
    ).toHaveCount(0);
  });

  test('3. + 4. Marketplace preview and booking dialog both show the notice', async ({
    page,
  }) => {
    await openDriverMarketplace(page);
    const frame = prototypeFrame(page);

    await test.step('marketplace preview', async () => {
      await frame
        .getByText(FIXTURES.deregisteredOwnAxlePublished.model)
        .first()
        .click();
      await expect(
        frame.getByRole('heading', { name: /Marketplace preview/i }),
      ).toBeVisible();
      await expect(frame.locator('.red-plates-banner')).toBeVisible();
      await expect(frame.getByText(NOTICE_EN).first()).toBeVisible();
    });

    await test.step('booking dialog — highlighted before the binding confirm', async () => {
      await frame.getByRole('button', { name: /Accept tour/i }).click();
      await expect(
        frame.getByRole('heading', { name: /Accept this tour/i }),
      ).toBeVisible();
      // Scope to the modal: the preview behind it keeps its own banner mounted,
      // so an unscoped locator legitimately matches two elements.
      const dialog = frame.locator('.sheet.modal');
      await expect(dialog.locator('.red-plates-banner')).toBeVisible();
      await expect(dialog.getByText(NOTICE_EN)).toBeVisible();
      // The notice sits above the binding slide-to-confirm so it cannot be
      // committed past unseen.
      await expect(dialog.getByText(/Slide to confirm/i).first()).toBeVisible();
    });
  });

  test('5. Complete order view after booking keeps the notice visible', async ({
    page,
  }) => {
    await openDriverMarketplace(page);
    const frame = prototypeFrame(page);

    await frame.getByRole('button', { name: /My jobs/i }).first().click();
    await frame
      .getByText(FIXTURES.deregisteredOwnAxleBooked.model)
      .first()
      .click();

    // This is an ACCEPTED (booked) tour — the notice must persist because it is
    // an execution requirement, not a temporary marketplace message.
    await expect(frame.locator('.red-plates-banner')).toBeVisible();
    await expect(frame.getByText(NOTICE_EN).first()).toBeVisible();

    await test.step('and it survives a full reload', async () => {
      await page.reload();
      await switchToDriverPWA(page);
      await frame.getByRole('button', { name: /My jobs/i }).first().click();
      await frame
        .getByText(FIXTURES.deregisteredOwnAxleBooked.model)
        .first()
        .click();
      await expect(frame.getByText(NOTICE_EN).first()).toBeVisible();
    });
  });

  test('negative: deregistered + third-party axle shows no notice anywhere', async ({
    page,
  }) => {
    await openDriverMarketplace(page);
    const frame = prototypeFrame(page);

    await frame.getByRole('button', { name: /My jobs/i }).first().click();
    await frame
      .getByText(FIXTURES.deregisteredThirdPartyAxle.model)
      .first()
      .click();

    // Deregistered, but carried on a third-party axle → red plates NOT required.
    await expect(frame.getByText('Deregistered').first()).toBeVisible();
    await expect(frame.getByText(NOTICE_EN)).toHaveCount(0);
    await expect(frame.locator('.red-plates-banner')).toHaveCount(0);
  });
});

test.describe('Warning consistency', () => {
  test('every surface uses the same i18n key — German switches all of them together', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await switchLanguage(page, 'DE');
    await switchTheme(page, 'light');
    await switchToDriverPWA(page);
    const frame = prototypeFrame(page);

    // Card
    await expect(frame.getByText(NOTICE_DE).first()).toBeVisible();
    await expect(frame.getByText(NOTICE_EN)).toHaveCount(0);

    // Preview
    await frame
      .getByText(FIXTURES.deregisteredOwnAxlePublished.model)
      .first()
      .click();
    await expect(frame.getByText(NOTICE_DE).first()).toBeVisible();

    // Booking dialog
    await frame.getByRole('button', { name: /Tour annehmen/i }).click();
    await expect(frame.getByText(NOTICE_DE).first()).toBeVisible();
  });

  test('the derived value is not writable by the client', async ({ page }) => {
    await gotoPrototype(page);
    const store = await page.frames()[1].evaluate(() => {
      const S = (window as any).AuthStore;
      const job = S.getJobs().find((j: any) => j.id === 'A-2026-00847'); // registered + own axle
      const attempts = [
        'redPlates',
        'redPlateNumber',
        'requiresRedLicencePlates',
      ].map((field) => {
        const form = {
          ...S.jobToDraftForm(job),
          [field]: field === 'requiresRedLicencePlates' ? true : 'HH-06 2440',
        };
        const res = S.validateVehicleForm(form, job.vehicleType);
        return {
          field,
          rejected:
            !res.ok &&
            res.errors.some(
              (e: any) => e.field === field && e.reason === 'not_writable',
            ),
        };
      });
      return {
        attempts,
        // The derived flag stays false for a registered + own-axle order no
        // matter what the client sends.
        stillFalse: S.jobRequiresRedLicencePlates(S.getJobs().find((j: any) => j.id === 'A-2026-00847')),
      };
    });

    for (const a of store.attempts) {
      expect(a.rejected, `${a.field} must be rejected as not_writable`).toBe(true);
    }
    expect(store.stillFalse).toBe(false);
  });
});
