/**
 * Downstream display and responsive behaviour for the confirmed vehicle domain
 * ("Systemlogik Fahrzeugeingabe"). Only the three approved vehicle types exist —
 * there is no legacy-value compatibility layer.
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

test.describe('Only the approved vehicle types exist', () => {
  test('removed values are not selectable and not writable', async ({ page }) => {
    await gotoPrototype(page);
    await switchLanguage(page, 'EN');
    await switchTheme(page, 'light');
    await switchToAdminBackend(page);
    const frame = prototypeFrame(page);

    await frame.getByRole('button', { name: /New job/i }).click();
    const group = frame.getByRole('radiogroup').filter({ hasText: 'Passenger car' });
    await expect(group.getByRole('radio')).toHaveCount(3);

    for (const removed of ['SUV', 'Van', 'Transporter', 'Classic', 'Oldtimer']) {
      await expect(frame.getByRole('radio', { name: removed, exact: true })).toHaveCount(0);
    }

    const rejected = await page.frames()[1].evaluate(() => {
      const S = (window as any).AuthStore;
      const base = {
        manufacturer: 'Audi',
        model: 'A4',
        plate: 'M-AB 1234',
        vin: 'WAUZZZ4M5KA000001',
        transportType: S.TRANSPORT_TYPE_OWN_AXLE,
        registrationStatus: S.REGISTRATION_REGISTERED,
      };
      return ['SUV', 'Van', 'Transporter', 'Oldtimer', 'Classic', 'PKW', 'Car'].map((v) => ({
        value: v,
        ok: S.validateVehicleForm({ ...base, vehicleType: v }).ok,
        normalizes: S.normalizeVehicleType(v),
      }));
    });
    for (const r of rejected) {
      expect(r.ok, `${r.value} must be rejected`).toBe(false);
      expect(r.normalizes, `${r.value} must not resolve to a storable value`).toBe('');
    }
  });

  test('no record carries a removed type, a red-plate field or a deprecated alias', async ({
    page,
  }) => {
    await gotoPrototype(page);
    const state = await page.frames()[1].evaluate(() => {
      const S = (window as any).AuthStore;
      const jobs = S.getJobs();
      return {
        nonApproved: jobs
          .filter((j: any) => !S.VEHICLE_TYPES.includes(j.vehicleType))
          .map((j: any) => `${j.id}=${j.vehicleType}`),
        missingStatus: jobs
          .filter((j: any) => !S.REGISTRATION_STATUSES.includes(j.registrationStatus))
          .map((j: any) => j.id),
        redPlateFields: jobs
          .filter(
            (j: any) =>
              'redPlates' in j || 'redPlateNumber' in j || 'legacyRedPlateNumber' in j,
          )
          .map((j: any) => j.id),
        aliases: jobs
          .filter((j: any) => 'vehicle' in j || 'axle' in j)
          .map((j: any) => j.id),
      };
    });
    expect(state.nonApproved).toEqual([]);
    expect(state.missingStatus).toEqual([]);
    expect(state.redPlateFields).toEqual([]);
    expect(state.aliases).toEqual([]);
  });

  test('no red-plate number is displayed on any driver surface', async ({ page }) => {
    const frame = await openDriver(page);
    await frame.getByRole('button', { name: /My jobs/i }).first().click();

    await expect(frame.locator('.plate-red')).toHaveCount(0);
    await expect(frame.getByText(/Red plate no\./i)).toHaveCount(0);
    await expect(frame.getByText(/\d{2}-06 \d{4}/)).toHaveCount(0);
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
    await expect(frame.getByText(/\(legacy\)/i)).toHaveCount(0);
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
