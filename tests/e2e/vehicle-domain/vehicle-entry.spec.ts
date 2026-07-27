/**
 * Vehicle entry — the confirmed category structure in the Admin Backend.
 *
 * Client confirmation "Systemlogik Fahrzeugeingabe" (PRD v2.8): four explicit
 * single/multi-cardinality categories, NOT one flattened tag collection.
 */
import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import {
  switchLanguage,
  switchTheme,
  switchToAdminBackend,
} from '../../regression/support/helpers/header-controls.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { gotoPrototype } from '../../regression/support/helpers/stable-page.ts';

const APPROVED_TYPES = [
  'Passenger car',
  'Truck up to and including 7.5 t',
  'Truck over 7.5 t',
];
const REMOVED_TYPES = ['SUV', 'Van', 'Transporter', 'Classic', 'Oldtimer'];

async function openNewOrderVehicleSection(page) {
  await gotoPrototype(page);
  await switchLanguage(page, 'EN');
  await switchTheme(page, 'light');
  await switchToAdminBackend(page);
  const frame = prototypeFrame(page);
  await frame.getByRole('button', { name: /New job|Neuer Auftrag/i }).click();
  await expect(frame.getByRole('heading', { name: /Vehicle/i }).first()).toBeVisible();
  return frame;
}

test.describe('Vehicle type — exactly one, three approved values', () => {
  test('only the three approved vehicle types are selectable', async ({ page }) => {
    const frame = await openNewOrderVehicleSection(page);
    const group = frame.getByRole('radiogroup').filter({ hasText: 'Passenger car' });

    await expect(group.getByRole('radio')).toHaveCount(3);
    for (const label of APPROVED_TYPES) {
      await expect(group.getByRole('radio', { name: label, exact: true })).toBeVisible();
    }
  });

  test('removed vehicle types are unavailable for new records', async ({ page }) => {
    const frame = await openNewOrderVehicleSection(page);
    for (const removed of REMOVED_TYPES) {
      await expect(
        frame.getByRole('radio', { name: removed, exact: true }),
      ).toHaveCount(0);
    }
    // …and the old light-truck band is gone too.
    await expect(frame.getByRole('radio', { name: /3[.,]5\s*t/i })).toHaveCount(0);
  });

  test('selection is single-select: duplicate selection is impossible by component design', async ({
    page,
  }) => {
    const frame = await openNewOrderVehicleSection(page);
    const group = frame.getByRole('radiogroup').filter({ hasText: 'Passenger car' });

    await group.getByRole('radio', { name: 'Passenger car', exact: true }).click();
    await expect(group.getByRole('radio', { checked: true })).toHaveCount(1);

    await group.getByRole('radio', { name: 'Truck over 7.5 t', exact: true }).click();
    // Still exactly one checked — the second choice replaced the first rather
    // than accumulating, which a tag array could not guarantee.
    await expect(group.getByRole('radio', { checked: true })).toHaveCount(1);
    await expect(
      group.getByRole('radio', { name: 'Truck over 7.5 t', exact: true }),
    ).toHaveAttribute('aria-checked', 'true');
    await expect(
      group.getByRole('radio', { name: 'Passenger car', exact: true }),
    ).toHaveAttribute('aria-checked', 'false');
  });
});

test.describe('Vehicle data — separate fields', () => {
  test('manufacturer is chosen from a dropdown, not typed freely', async ({ page }) => {
    const frame = await openNewOrderVehicleSection(page);
    const manufacturer = frame.locator('#new-order-manufacturer');

    await expect(manufacturer).toBeVisible();
    // A real <select>, so the catalogue is controlled rather than advisory.
    expect(await manufacturer.evaluate((el) => el.tagName)).toBe('SELECT');
    const options = await manufacturer.locator('option').count();
    expect(options).toBeGreaterThan(5);

    await manufacturer.selectOption('Volkswagen');
    await expect(manufacturer).toHaveValue('Volkswagen');
  });

  test('model is a separate field from the manufacturer', async ({ page }) => {
    const frame = await openNewOrderVehicleSection(page);
    await frame.locator('#new-order-manufacturer').selectOption('Audi');
    await frame.locator('#new-order-model').fill('A4 Avant');

    // Neither field absorbed the other.
    await expect(frame.locator('#new-order-manufacturer')).toHaveValue('Audi');
    await expect(frame.locator('#new-order-model')).toHaveValue('A4 Avant');
  });

  test('official licence plate stays enabled for a deregistered vehicle', async ({
    page,
  }) => {
    const frame = await openNewOrderVehicleSection(page);
    const plate = frame.locator('#new-order-plate');

    await plate.fill('HH-XY 1234');
    await frame.getByRole('radio', { name: 'Deregistered', exact: true }).click();

    // The field must remain present, enabled and NOT cleared.
    await expect(plate).toBeVisible();
    await expect(plate).toBeEnabled();
    await expect(plate).toHaveValue('HH-XY 1234');

    // Toggling back and forth must never destroy the value either.
    await frame.getByRole('radio', { name: 'Registered', exact: true }).click();
    await frame.getByRole('radio', { name: 'Deregistered', exact: true }).click();
    await expect(plate).toHaveValue('HH-XY 1234');
  });

  test('no red-licence-plate input and no manual red-plate selection exist', async ({
    page,
  }) => {
    const frame = await openNewOrderVehicleSection(page);

    // No red-plate number field, under any of its former labels.
    await expect(frame.getByText(/Red plate no\.|Rotes Kennzeichen \(Nr/i)).toHaveCount(0);
    await expect(frame.locator('input[placeholder*="06"]')).toHaveCount(0);

    // No manual "Red plates" option in the registration control.
    await expect(frame.getByRole('radio', { name: /^Red plates$/i })).toHaveCount(0);
    await expect(
      frame.getByRole('button', { name: /^Red plates$/i }),
    ).toHaveCount(0);

    // The registration control offers exactly the two confirmed statuses —
    // no "Not specified" and no red-plates pseudo-status.
    const regGroup = frame.getByRole('radiogroup').filter({ hasText: 'Registered' });
    await expect(regGroup.getByRole('radio')).toHaveCount(2);
    await expect(frame.getByRole('radio', { name: /Not specified/i })).toHaveCount(0);
  });

  test('VIN accepts exactly 17 characters and rejects shorter/longer', async ({
    page,
  }) => {
    const frame = await openNewOrderVehicleSection(page);
    const vin = frame.locator('#new-order-vin');
    const error = frame.locator('#new-order-vin-error');

    await test.step('16 characters → rejected', async () => {
      await vin.fill('WAUZZZ4M5KA00000');
      await expect(error).toBeVisible();
      await expect(vin).toHaveAttribute('aria-invalid', 'true');
    });

    await test.step('exactly 17 characters → accepted', async () => {
      await vin.fill('WAUZZZ4M5KA000001');
      await expect(error).toHaveCount(0);
      await expect(vin).not.toHaveAttribute('aria-invalid', 'true');
      await expect(vin).toHaveValue('WAUZZZ4M5KA000001');
    });

    await test.step('18 characters → truncated to 17 by normalization, so never over-long', async () => {
      await vin.fill('WAUZZZ4M5KA0000012');
      await expect(vin).toHaveValue('WAUZZZ4M5KA000001');
      await expect(error).toHaveCount(0);
    });

    await test.step('a longer value is rejected by the domain validator itself', async () => {
      const rejected = await page.frames()[1].evaluate(() => {
        const S = (window as any).AuthStore;
        return {
          tooLong: S.isValidVin('WAUZZZ4M5KA0000012'),
          tooShort: S.isValidVin('WAUZZZ4M5KA00000'),
          exact: S.isValidVin('WAUZZZ4M5KA000001'),
        };
      });
      expect(rejected.tooLong).toBe(false);
      expect(rejected.tooShort).toBe(false);
      expect(rejected.exact).toBe(true);
    });
  });
});

test.describe('Transport type and registration status are independent categories', () => {
  test('each is its own single-select group and neither changes the other', async ({
    page,
  }) => {
    const frame = await openNewOrderVehicleSection(page);
    const transport = frame.getByRole('radiogroup').filter({ hasText: 'Own axle' });
    const registration = frame
      .getByRole('radiogroup')
      .filter({ hasText: 'Deregistered' });

    await expect(transport.getByRole('radio')).toHaveCount(2);
    await expect(registration.getByRole('radio')).toHaveCount(2);

    // Set registration, then change transport type: registration must hold.
    await registration.getByRole('radio', { name: 'Deregistered', exact: true }).click();
    await transport.getByRole('radio', { name: 'Third-party axle', exact: true }).click();
    await expect(
      registration.getByRole('radio', { name: 'Deregistered', exact: true }),
    ).toHaveAttribute('aria-checked', 'true');

    // And the reverse: changing registration must not move transport type.
    await registration.getByRole('radio', { name: 'Registered', exact: true }).click();
    await expect(
      transport.getByRole('radio', { name: 'Third-party axle', exact: true }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  test('all four combinations are reachable', async ({ page }) => {
    const frame = await openNewOrderVehicleSection(page);
    for (const reg of ['Registered', 'Deregistered']) {
      for (const tt of ['Own axle', 'Third-party axle']) {
        await frame.getByRole('radio', { name: reg, exact: true }).click();
        await frame.getByRole('radio', { name: tt, exact: true }).click();
        await expect(
          frame.getByRole('radio', { name: reg, exact: true }),
        ).toHaveAttribute('aria-checked', 'true');
        await expect(
          frame.getByRole('radio', { name: tt, exact: true }),
        ).toHaveAttribute('aria-checked', 'true');
      }
    }
  });

  test('"Axle" wording is gone from the vehicle section', async ({ page }) => {
    const frame = await openNewOrderVehicleSection(page);
    // The label carries a required marker, so match the wording not the exact node.
    await expect(frame.getByText(/^Transport type\s*\*?$/)).toBeVisible();
    // The old standalone label and the old filter label must not reappear.
    await expect(frame.getByText(/^Axle\s*\*?$/)).toHaveCount(0);
    await expect(frame.getByText(/Axle configuration/i)).toHaveCount(0);
  });
});

test.describe('Additional vehicle characteristics — independent attributes', () => {
  test('both can be selected independently and combined', async ({ page }) => {
    const frame = await openNewOrderVehicleSection(page);
    const electric = frame.getByRole('button', { name: 'Electric vehicle', exact: true });
    const ready = frame.getByRole('button', { name: 'Ready to drive', exact: true });

    // Toggles, not a radio set — so both can be on at once.
    await expect(electric).toHaveAttribute('aria-pressed', 'false');
    await electric.click();
    await expect(electric).toHaveAttribute('aria-pressed', 'true');
    await ready.click();
    await expect(electric).toHaveAttribute('aria-pressed', 'true');
    await expect(ready).toHaveAttribute('aria-pressed', 'true');

    // Independently clearable.
    await electric.click();
    await expect(electric).toHaveAttribute('aria-pressed', 'false');
    await expect(ready).toHaveAttribute('aria-pressed', 'true');
  });

  test('ready-to-drive applicability does not cause silent data loss', async ({
    page,
  }) => {
    const frame = await openNewOrderVehicleSection(page);
    const ready = frame.getByRole('button', { name: 'Ready to drive', exact: true });
    const note = frame.getByText(/Decision-relevant for third-party-axle/i);

    await frame.getByRole('radio', { name: 'Third-party axle', exact: true }).click();
    await expect(note).toBeVisible(); // emphasised where it is applicable
    await ready.click();
    await expect(ready).toHaveAttribute('aria-pressed', 'true');

    // Switching to own axle (where it is not applicable) must NOT clear it and
    // must NOT hide the control — no silent loss.
    await frame.getByRole('radio', { name: 'Own axle', exact: true }).click();
    await expect(note).toHaveCount(0);
    await expect(ready).toBeVisible();
    await expect(ready).toBeEnabled();
    await expect(ready).toHaveAttribute('aria-pressed', 'true');

    // And switching back preserves it again.
    await frame.getByRole('radio', { name: 'Third-party axle', exact: true }).click();
    await expect(ready).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Payload keeps semantic fields (not a flattened tag array)', () => {
  test('the composed job carries discrete category fields', async ({ page }) => {
    await gotoPrototype(page);
    const shape = await page.frames()[1].evaluate(() => {
      const S = (window as any).AuthStore;
      const job = S.getJobs().find((j: any) => j.id === 'A-2026-00845');
      return {
        keys: Object.keys(job),
        vehicleType: job.vehicleType,
        transportType: job.transportType,
        registrationStatus: job.registrationStatus,
        electricVehicle: typeof job.electricVehicle,
        readyToDrive: typeof job.readyToDrive,
        hasTagArray:
          Array.isArray((job as any).tags) ||
          Array.isArray((job as any).vehicleTags) ||
          Array.isArray((job as any).vehicleClassifications),
      };
    });

    // Explicit, individually typed fields…
    expect(shape.vehicleType).toBe('passenger_car');
    expect(shape.transportType).toBe('own_axle');
    expect(shape.registrationStatus).toBe('deregistered');
    expect(shape.electricVehicle).toBe('boolean');
    expect(shape.readyToDrive).toBe('boolean');
    expect(shape.keys).toContain('manufacturer');
    expect(shape.keys).toContain('vehicleModel');

    // …and no flattened classification collection anywhere.
    expect(shape.hasTagArray).toBe(false);
  });
});
