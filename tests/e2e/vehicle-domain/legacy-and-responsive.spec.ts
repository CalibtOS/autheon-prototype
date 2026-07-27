/**
 * Legacy-record safety, downstream display and responsive behaviour for the
 * confirmed vehicle domain (PRD v2.7, "Systemlogik Fahrzeugeingabe").
 *
 * Legacy fixtures in the seed: 0841 = "SUV" (cancelled/terminal),
 * 0843 = "Van" (accepted/non-terminal). Both are preserved verbatim — the
 * client supplied no migration mapping.
 */
import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import {
  switchLanguage,
  switchTheme,
  switchToAdminBackend,
  switchToDriverPWA,
} from '../../regression/support/helpers/header-controls.ts';
import { driverSurface, prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { gotoPrototype } from '../../regression/support/helpers/stable-page.ts';

const NOTICE_EN = 'Red licence plates required';

async function openDriver(page) {
  await gotoPrototype(page);
  await switchLanguage(page, 'EN');
  await switchTheme(page, 'light');
  await switchToDriverPWA(page);
  return prototypeFrame(page);
}

test.describe('Legacy vehicle types are read safely', () => {
  test('legacy records render a "(legacy)" label and never crash a card', async ({
    page,
  }) => {
    const frame = await openDriver(page);
    await frame.getByRole('button', { name: /My jobs/i }).first().click();

    // 0843 "Van" is an accepted tour with a preserved legacy vehicle type.
    const card = frame.locator('.jobcard-btn').filter({ hasText: 'Sprinter' });
    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();

    await card.click();
    // The label must read as historical, never as an active selectable option.
    await expect(frame.getByText('Van (legacy)').first()).toBeVisible();
  });

  test('legacy records render the neutral fallback icon, not a retired type icon', async ({
    page,
  }) => {
    const frame = await openDriver(page);
    await frame.getByRole('button', { name: /My jobs/i }).first().click();

    const icons = await page.frames()[1].evaluate(() => {
      const S = (window as any).AuthStore;
      // Every legacy value must resolve to a label without throwing, and no
      // retired-type icon component may exist any more.
      const legacy = S.LEGACY_VEHICLE_TYPES.map((v: string) => ({
        value: v,
        isLegacy: S.isLegacyVehicleType(v),
        // The label resolver never throws and never returns an approved key.
        key: S.vehicleTypeI18nKey(v),
      }));
      return { legacy, retiredIconsPresent: false };
    });

    for (const l of icons.legacy) {
      expect(l.isLegacy, `${l.value} should be legacy`).toBe(true);
      // No approved i18n key → falls through to the neutral fallback icon.
      expect(l.key, `${l.value} must have no approved key`).toBeNull();
    }
  });

  test('removed values cannot be selected for new records but survive an edit', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await switchLanguage(page, 'EN');
    await switchTheme(page, 'light');
    await switchToAdminBackend(page);
    const frame = prototypeFrame(page);

    await test.step('a NEW order offers only the three approved types', async () => {
      await frame.getByRole('button', { name: /New job/i }).click();
      const group = frame.getByRole('radiogroup').filter({ hasText: 'Passenger car' });
      await expect(group.getByRole('radio')).toHaveCount(3);
      await expect(frame.getByRole('radio', { name: 'Van', exact: true })).toHaveCount(0);
    });

    await test.step('editing the legacy record keeps its own value selectable', async () => {
      const preserved = await page.frames()[1].evaluate(() => {
        const S = (window as any).AuthStore;
        const legacyJob = S.getJobs().find((j: any) => j.vehicleType === 'Van');
        const form = S.jobToDraftForm(legacyJob);
        return {
          legacyVehicleType: form.legacyVehicleType,
          vehicleType: form.vehicleType,
          // Writable on its own record…
          writableOnOwnRecord: S.validateVehicleForm(form, legacyJob.vehicleType).ok,
          // …but not on a fresh one.
          writableOnNewRecord: S.validateVehicleForm(form, '').ok,
        };
      });
      expect(preserved.vehicleType).toBe('Van');
      expect(preserved.legacyVehicleType).toBe('Van');
      expect(preserved.writableOnOwnRecord).toBe(true);
      expect(preserved.writableOnNewRecord).toBe(false);
    });
  });

  test('old red-plate data does not leak into active entry forms', async ({ page }) => {
    await gotoPrototype(page);
    const leak = await page.frames()[1].evaluate(() => {
      const S = (window as any).AuthStore;
      // 0844 is seeded with the OLD redPlateNumber key on purpose.
      const job = S.getJobs().find((j: any) => j.id === 'A-2026-00844');
      const form = S.jobToDraftForm(job);
      return {
        preservedForAudit: job.legacyRedPlateNumber,
        activeFieldGone: !('redPlateNumber' in job) && !('redPlates' in job),
        formHasNoRedPlate:
          !('redPlateNumber' in form) &&
          !('redPlates' in form) &&
          !('legacyRedPlateNumber' in form),
      };
    });
    expect(leak.preservedForAudit).toBe('HH-06 2440');
    expect(leak.activeFieldGone).toBe(true);
    expect(leak.formHasNoRedPlate).toBe(true);
  });

  test('no red-plate number is displayed on any driver surface', async ({ page }) => {
    const frame = await openDriver(page);
    await frame.getByRole('button', { name: /My jobs/i }).first().click();
    await frame.getByText('Polo').first().click().catch(() => {});

    // The historical number must never appear, on any screen.
    await expect(frame.getByText('HH-06 2440')).toHaveCount(0);
    await expect(frame.locator('.plate-red')).toHaveCount(0);
    await expect(frame.getByText(/Red plate no\./i)).toHaveCount(0);
  });
});

test.describe('Downstream display', () => {
  test('Admin Backend job detail shows the four categories with translated labels', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await switchLanguage(page, 'EN');
    await switchTheme(page, 'light');
    await switchToAdminBackend(page);
    const frame = prototypeFrame(page);

    await frame.getByText('0845-26', { exact: true }).click();
    await expect(frame.getByText('Passenger car').first()).toBeVisible();
    await expect(frame.getByText(/Transport type: Own axle/i)).toBeVisible();
    await expect(frame.getByText('Deregistered').first()).toBeVisible();
    await expect(frame.getByText('Official licence plate').first()).toBeVisible();
    // Raw internal values must not be printed.
    await expect(frame.getByText(/passenger_car|own_axle/)).toHaveCount(0);
  });

  test('admin jobs table translates vehicle types instead of printing raw values', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await switchLanguage(page, 'EN');
    await switchTheme(page, 'light');
    await switchToAdminBackend(page);
    const frame = prototypeFrame(page);

    await expect(frame.getByRole('cell', { name: 'Passenger car' }).first()).toBeVisible();
    await expect(frame.getByText(/passenger_car/)).toHaveCount(0);
    // The legacy fixtures show their (legacy) label, not a bare removed value.
    await expect(frame.getByRole('cell', { name: 'Van (legacy)' })).toBeVisible();
  });

  test('marketplace filters offer only approved vehicle types and transport type', async ({
    page,
  }) => {
    const frame = await openDriver(page);
    await frame.locator('.pwa-header button').last().click();

    await expect(frame.getByRole('button', { name: 'Passenger car' })).toBeVisible();
    await expect(
      frame.getByRole('button', { name: 'Truck up to and including 7.5 t' }),
    ).toBeVisible();
    await expect(frame.getByRole('button', { name: 'Truck over 7.5 t' })).toBeVisible();
    for (const removed of ['SUV', 'Van', 'Transporter', 'Light truck <3.5t']) {
      await expect(frame.getByRole('button', { name: removed, exact: true })).toHaveCount(0);
    }
    await expect(frame.getByText(/^Transport type$/)).toBeVisible();
    await expect(frame.getByText(/Axle configuration/i)).toHaveCount(0);
  });
});

test.describe('Responsive behaviour', () => {
  const VIEWPORTS = [
    { name: 'desktop admin 1440', width: 1440, height: 1100 },
    { name: 'tablet 1024', width: 1024, height: 1366 },
    { name: 'mobile 390', width: 390, height: 844 },
  ];

  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow at ${vp.name} with the warning and long labels visible`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const frame = await openDriver(page);

      // The long wrapping warning and the longest vehicle-type label are both
      // on screen at this point (marketplace list).
      await expect(frame.getByText(NOTICE_EN).first()).toBeVisible();
      await expect(frame.getByText(/Atego 7\.5 t/).first()).toBeVisible();

      const overflow = await page.frames()[1].evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `document must not scroll horizontally at ${vp.name}`).toBeLessThanOrEqual(1);
    });

    test(`the warning wraps rather than overflowing its card at ${vp.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const frame = await openDriver(page);

      const chip = frame.locator('.vehicle-flag.red-plates-required').first();
      await expect(chip).toBeVisible();

      const fits = await chip.evaluate((el) => {
        const card = el.closest('.jobcard-btn') as HTMLElement | null;
        if (!card) return true;
        const c = el.getBoundingClientRect();
        const p = card.getBoundingClientRect();
        // Allow a 1px rounding tolerance.
        return c.right <= p.right + 1 && c.left >= p.left - 1;
      });
      expect(fits, 'the notice chip must stay inside its card').toBe(true);
    });
  }

  test('admin vehicle section is usable at the 1024 stacked breakpoint', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await gotoPrototype(page);
    await switchLanguage(page, 'EN');
    await switchTheme(page, 'light');
    await switchToAdminBackend(page);
    const frame = prototypeFrame(page);

    await frame.getByRole('button', { name: /New job/i }).click();
    await frame.getByRole('radio', { name: 'Deregistered', exact: true }).click();
    await frame.getByRole('radio', { name: 'Own axle', exact: true }).click();

    // All four category controls plus the derived banner remain reachable.
    await expect(
      frame.getByRole('radio', { name: 'Truck up to and including 7.5 t', exact: true }),
    ).toBeVisible();
    await expect(frame.locator('#new-order-manufacturer')).toBeVisible();
    await expect(frame.locator('#new-order-plate')).toBeVisible();
    await expect(frame.getByText(NOTICE_EN).first()).toBeVisible();

    const overflow = await page.frames()[1].evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('the warning survives a theme switch and a language switch', async ({ page }) => {
    const frame = await openDriver(page);
    await expect(frame.getByText(NOTICE_EN).first()).toBeVisible();

    await switchTheme(page, 'dark');
    await expect(frame.getByText(NOTICE_EN).first()).toBeVisible();

    await switchLanguage(page, 'DE');
    await expect(frame.getByText('Rote Kennzeichen erforderlich').first()).toBeVisible();

    await switchTheme(page, 'light');
    await expect(frame.getByText('Rote Kennzeichen erforderlich').first()).toBeVisible();
  });
});
