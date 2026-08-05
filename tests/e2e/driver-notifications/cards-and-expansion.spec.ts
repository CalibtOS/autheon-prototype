import { expect, test } from '../../regression/support/fixtures/prototype-test.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { prepareDriverVisual } from '../../regression/support/helpers/visual.ts';
import {
  CARD,
  card,
  expandRideCard,
  openNotificationCenter,
  ridePreviewRows,
} from '../../regression/support/helpers/notifications.ts';

/**
 * Notification card presentation (PRD driver_notification_presentation_v2).
 *
 * Two things are being pinned here, and the second matters more than the first:
 * that the approved five values render, and that the values the client ruled out
 * are ABSENT FROM THE PAYLOAD rather than merely unstyled. A CSS-only omission
 * would pass a "is it visible?" assertion and still ship the data.
 */
test.describe('driver notification cards @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await prepareDriverVisual(page);
    await openNotificationCenter(page);
  });

  test('no card shows a category chip, and no category tabs exist', async ({ page }) => {
    const frame = prototypeFrame(page);
    await expect(frame.locator('.notification-card')).not.toHaveCount(0);
    // The chip element is gone entirely — not hidden, not emptied.
    await expect(frame.locator('.notification-row-cat')).toHaveCount(0);
    for (const label of [
      /^Order$/,
      /^Account$/,
      /^System$/,
      /^General information$/,
    ]) {
      await expect(
        frame.locator('.notifications-dropdown').getByText(label, { exact: false }),
        `removed category label ${label} must not appear in the pane`,
      ).toHaveCount(0);
    }
    // No tab band was introduced inside the pane.
    await expect(frame.locator('.notifications-dropdown .myjobs-tab-pill')).toHaveCount(0);
  });

  test('no card leaves an empty container where the chip used to be', async ({ page }) => {
    // A removed element that still occupies layout is a different bug from a
    // removed element: assert every card's text block starts at the heading.
    const firstChildren = await prototypeFrame(page)
      .locator('.notification-row-body')
      .evaluateAll((els) => els.map((el) => el.firstElementChild?.className ?? ''));
    expect(firstChildren.length).toBeGreaterThan(0);
    for (const className of firstChildren) {
      expect(className).toContain('notification-row-title');
    }
  });

  test('card fundamentals survive: heading, two-line preview, date/time, unread state', async ({
    page,
  }) => {
    // The assigned-ride card is the unique-heading one; both seeded Marketplace
    // rows share "New matching order".
    const target = card(page, CARD.assignedRide);
    await expect(target.locator('.notification-row-title')).toHaveText(/\S/);
    await expect(target.locator('.notification-row-meta')).toHaveText(/\d{2}\.\d{2}\./);
    await expect(target).toHaveClass(/unread/);
    await expect(target.locator('.notification-row-dot')).toHaveCount(1);

    const clamp = await target
      .locator('.notification-row-text')
      .evaluate((el) => getComputedStyle(el).webkitLineClamp);
    expect(clamp).toBe('2');
  });

  test('date grouping and Mark all read still work', async ({ page }) => {
    const frame = prototypeFrame(page);
    await expect(frame.locator('.notification-day-header')).not.toHaveCount(0);

    await frame.locator('.notifications-mark-all-btn').click();
    await expect(frame.locator('.notification-card.unread')).toHaveCount(0);
    await expect(frame.locator('.notifications-all-read-hint')).toBeVisible();
  });

  test('the pane closes again', async ({ page }) => {
    const frame = prototypeFrame(page);
    await frame.locator('.notifications-close-btn').click();
    await expect(frame.locator('.notifications-dropdown')).toHaveCount(0);
  });

  test('a ride notification expands inline and never navigates', async ({ page }) => {
    const frame = prototypeFrame(page);
    await expandRideCard(page, CARD.assignedRide);
    // Still inside the Notification Center.
    await expect(frame.locator('.notifications-dropdown')).toBeVisible();
    await expect(card(page, CARD.assignedRide)).toHaveClass(/expanded/);
  });

  test('expanded ride shows exactly the five approved values', async ({ page }) => {
    await expandRideCard(page, CARD.assignedRide);
    const target = card(page, CARD.assignedRide);

    // 1. Ride id.
    await expect(target.locator('.notification-preview-tour')).toHaveText('0848-26');

    // 2-5. Pickup city, delivery city, full date, vehicle display name.
    const rows = await ridePreviewRows(page, CARD.assignedRide);
    expect(rows.map(([label]) => label)).toEqual(['Pickup', 'Delivery', 'Date', 'Vehicle']);
    expect(Object.fromEntries(rows)).toEqual({
      Pickup: 'Bremen',
      Delivery: 'Hamburg',
      // Full date, DD.MM.YYYY, via the shared formatter.
      Date: '08.05.2026',
      // The app's existing vehicle display name (manufacturer + model), the
      // same string the Marketplace / My Jobs card renders.
      Vehicle: 'Skoda Superb',
    });
  });

  test('expanded ride shows none of the excluded values', async ({ page }) => {
    await expandRideCard(page, CARD.assignedRide);
    const panel = card(page, CARD.assignedRide).locator('.notification-card-panel');
    const text = (await panel.innerText()).replace(/\s+/g, ' ');

    // Postal code, distance, price, plate, VIN, customer, street, contacts.
    expect(text, 'no postal code').not.toMatch(/\b\d{5}\b/);
    expect(text, 'no distance').not.toMatch(/\bkm\b/i);
    expect(text, 'no price or driver offer').not.toMatch(/€|EUR/i);
    expect(text, 'no licence plate').not.toMatch(/[A-Z]{1,3}-[A-Z]{1,2}\s?\d{1,4}/);
    expect(text, 'no VIN').not.toMatch(/\b[A-HJ-NPR-Z0-9]{17}\b/);
    expect(text, 'no customer name').not.toMatch(/GmbH|AG\b/);
    // No labels for the removed rows either.
    for (const label of [
      /Licence plate|License plate|Kennzeichen/i,
      /Distance|Entfernung/i,
      /Customer|Kunde/i,
      /Transport type|Transportart/i,
      /Registration|Zulassung/i,
    ]) {
      expect(text, `no ${label} row`).not.toMatch(label);
    }

    // The status pill and the muted sub-lines were dropped with the metadata.
    await expect(panel.locator('.pill')).toHaveCount(0);
    await expect(panel.locator('.notification-preview-sub')).toHaveCount(0);
    await expect(panel.locator('.notification-preview-hint')).toHaveCount(0);
  });

  test('the ride projection carries no field beyond the approved five', async ({ page }) => {
    // The real guarantee: protected and excluded data is absent from the payload,
    // so no styling mistake can reveal it. Checked for a ride the driver IS
    // committed to as well — the projection must not widen after acceptance.
    const shapes = await prototypeFrame(page)
      .locator('body')
      .evaluate(() => {
        const store = (window as any).AuthStore;
        return {
          uncommitted: Object.keys(store.driverNotificationJobPreview('A-2026-00847') ?? {}),
          committed: Object.keys(store.driverNotificationJobPreview('A-2026-00848') ?? {}),
        };
      });

    const approved = ['jobId', 'tour', 'pickupCity', 'deliveryCity', 'date', 'vehicleName'];
    expect(shapes.uncommitted.sort()).toEqual([...approved].sort());
    expect(shapes.committed.sort()).toEqual([...approved].sort());

    for (const forbidden of [
      'postalCode',
      'startPlz',
      'endPlz',
      'distanceKm',
      'plate',
      'vin',
      'customerName',
      'contactPerson',
      'street',
      'pickup',
      'delivery',
      'transportType',
      'registrationStatus',
      'status',
      'displayStatus',
      'driverOffer',
      'revenue',
    ]) {
      expect(shapes.committed, `projection must not carry ${forbidden}`).not.toContain(forbidden);
    }
  });

  test('non-ride notifications render no ride accordion', async ({ page }) => {
    for (const heading of [CARD.infopointMessage, CARD.document, CARD.profileChange]) {
      const target = card(page, heading);
      await expect(target.locator('.notification-row-toggle')).toHaveCount(0);
      await expect(target.locator('.notification-card-panel')).toHaveCount(0);
      // The row itself is the link, with a forward chevron.
      await expect(target.locator('button.notification-row')).toHaveCount(1);
    }
  });

  test('an unavailable Marketplace ride states why and offers no action', async ({ page }) => {
    // `DN-SEED-MARKET-GONE` points at an order that went back to draft.
    const gone = prototypeFrame(page).locator('.notification-card', {
      has: prototypeFrame(page).locator('.notification-unavailable'),
    });
    await expect(gone.first().locator('.notification-unavailable')).toContainText(
      /no longer available/i,
    );
    // No "View order" that would fail, and no replacement journey either — the
    // v2.20 "View more orders" button was removed.
    await expect(gone.first().locator('.notification-card-actions')).toHaveCount(0);
    await expect(
      prototypeFrame(page).getByRole('button', { name: /View more orders/i }),
    ).toHaveCount(0);
  });

  test('no universal bottom sheet or overlay is introduced', async ({ page }) => {
    await expandRideCard(page, CARD.assignedRide);
    const frame = prototypeFrame(page);
    // The only dialog on screen is the Notification Center pane itself.
    await expect(frame.locator('[role="dialog"]')).toHaveCount(1);
    await expect(frame.locator('.sheet, .bottom-sheet')).toHaveCount(0);
  });
});
