import { expect, test } from '../../regression/support/fixtures/prototype-test.ts';
import {
  NOTIF,
  gotoPwa,
  pushTap,
  pwaHeading,
} from '../../regression/support/helpers/notifications.ts';

/**
 * Marketplace push behaviour, on the installed /pwa surface.
 *
 * `store.driverPushProjection()` is the seam a real push integration builds its
 * payload from, and it is what makes "the push says nothing specific" a testable
 * property rather than a copy convention: for Marketplace availability the
 * projection has no field that could carry a job, a count or a vehicle, so the
 * assertions below check ABSENCE FROM THE PAYLOAD, not absence from the styling.
 *
 * Push delivery itself stays simulated in the prototype; `?notify=<id>` on the
 * launch URL is the documented seam a service-worker `notificationclick`
 * handler would use, which is why one handler covers all three launch states.
 */

const GENERIC_BODY = { en: 'New orders are available.', de: 'Neue Aufträge sind verfügbar.' };

test.describe('generic Marketplace availability push @smoke', () => {
  test('the push payload is generic and names nothing', async ({ page }) => {
    await gotoPwa(page);
    const push = await page.evaluate(
      (id) => (window as any).AuthStore.driverPushProjection(id),
      NOTIF.marketplace,
    );

    expect(push.generic).toBe(true);
    expect(push.body).toBe(GENERIC_BODY.en);
    expect(push.destination).toBe('marketplace');

    // No job count, no vehicle, no route, no price, no distance, no job id —
    // and no field on the payload that could carry any of them.
    const serialized = JSON.stringify(push);
    expect(serialized, 'no job count or any digit').not.toMatch(/\d/);
    expect(serialized, 'no vehicle data').not.toMatch(
      /Mercedes|Skoda|Audi|Volkswagen|Atego|Superb|Polo|truck|car/i,
    );
    expect(serialized, 'no pickup or delivery city').not.toMatch(
      /Munich|Munchen|München|Berlin|Hamburg|Bremen|Cologne|Köln/i,
    );
    expect(serialized, 'no price').not.toMatch(/€|EUR/i);
    expect(serialized, 'no distance').not.toMatch(/\bkm\b/i);
    expect(Object.keys(push).sort()).toEqual(['body', 'destination', 'generic', 'title']);
    // Notably absent: a notificationId. The push cannot even point at the order
    // that triggered it, so no stale claim can survive to the tap.
    expect(push).not.toHaveProperty('notificationId');
    expect(push).not.toHaveProperty('jobId');
  });

  test('the generic push copy is localized in DE', async ({ page }) => {
    await gotoPwa(page);
    const body = await page.evaluate((id) => {
      (window as any).I18n.setLocale('de');
      return (window as any).AuthStore.driverPushProjection(id).body;
    }, NOTIF.marketplace);
    expect(body).toBe(GENERIC_BODY.de);
  });

  test('an already-gone Marketplace order produces the same generic push', async ({ page }) => {
    await gotoPwa(page);
    const [live, gone] = await page.evaluate(
      ([a, b]) => {
        const store = (window as any).AuthStore;
        return [store.driverPushProjection(a), store.driverPushProjection(b)];
      },
      [NOTIF.marketplace, NOTIF.marketplaceGone],
    );
    // Identical: the push never described the order, so its fate cannot change
    // what the push says.
    expect(gone).toEqual(live);
  });

  for (const mode of ['cold', 'open', 'background'] as const) {
    test(`tapping the push opens the Marketplace (${mode} launch)`, async ({ page }) => {
      await pushTap(page, NOTIF.marketplace, mode);
      await expect(page.locator('.notifications-dropdown')).toHaveCount(0);
      expect(await pwaHeading(page)).toMatch(/Marketplace|Marktplatz/i);
      // Current availability is on screen, not a stale snapshot.
      await expect(page.locator('.jobcard-btn').first()).toBeVisible();
    });
  }

  test('a booked-away order still lands on the current Marketplace with no stale action', async ({
    page,
  }) => {
    await pushTap(page, NOTIF.marketplaceGone, 'cold');

    expect(await pwaHeading(page)).toMatch(/Marketplace|Marktplatz/i);
    // No dedicated unavailable-order screen, and no replacement journey.
    await expect(page.getByText(/no longer available|nicht mehr verfügbar/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /View more orders/i })).toHaveCount(0);
    await expect(page.locator('.notifications-dropdown')).toHaveCount(0);

    // The gone order offers no acceptance path: it is not in the current list.
    const tours = await page.locator('.jobcard-btn').allInnerTexts();
    expect(tours.join(' '), 'the withdrawn order must not be bookable').not.toContain('0839-26');
  });

  test('an empty Marketplace is an acceptable outcome', async ({ page }) => {
    await gotoPwa(page);
    // Withdraw everything, then follow the push.
    await page.evaluate(() => {
      const store = (window as any).AuthStore;
      store.getJobs?.().forEach((job: any) => {
        if (job.status === 'published') job.status = 'draft';
      });
    });
    await page.evaluate((id) => {
      window.history.pushState({}, '', `/pwa/?notify=${id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, NOTIF.marketplace);

    expect(await pwaHeading(page)).toMatch(/Marketplace|Marktplatz/i);
    // The existing empty state, not an error and not a blank screen.
    const text = await page.locator('.phone-screen').innerText();
    expect(text.trim().length).toBeGreaterThan(20);
    await expect(page.locator('.jobcard-btn')).toHaveCount(0);
  });
});

test.describe('other push destinations are unchanged @smoke', () => {
  test('a non-Marketplace push keeps its own copy and its own target', async ({ page }) => {
    await gotoPwa(page);
    const push = await page.evaluate(
      (id) => (window as any).AuthStore.driverPushProjection(id),
      NOTIF.document,
    );
    expect(push.generic).toBe(false);
    expect(push.destination).toBe('notification_target');
    expect(push.notificationId).toBe(NOTIF.document);
  });

  const targets = [
    { id: NOTIF.infopointMessage, label: 'Infopoint message', assert: /Message|Nachricht/i },
    { id: NOTIF.document, label: 'document on its tour', assert: /0842-26/ },
    { id: NOTIF.profileChange, label: 'Profile subpage', assert: /Basic data|Stammdaten/i },
    { id: NOTIF.assignedRide, label: 'assigned ride detail', assert: /0848-26/ },
  ];
  for (const target of targets) {
    test(`a ${target.label} push opens its exact destination, not the pane`, async ({ page }) => {
      await pushTap(page, target.id, 'cold');
      expect(await pwaHeading(page)).toMatch(target.assert);
      await expect(page.locator('.notifications-dropdown')).toHaveCount(0);
    });
  }

  test('an unknown notification id lands on a safe fallback, never a blank screen', async ({
    page,
  }) => {
    await pushTap(page, 'DN-DOES-NOT-EXIST', 'cold');
    const text = await page.locator('.phone-screen').innerText();
    expect(text.trim().length).toBeGreaterThan(20);
    // The Notification Center over the safe root — the only honest destination
    // when the id carries no context at all.
    await expect(page.locator('.notifications-dropdown')).toBeVisible();
  });
});

test.describe('push eligibility and preferences are unchanged @smoke', () => {
  test('direct assignment creates an in-app row and no Marketplace-style push', async ({
    page,
  }) => {
    await gotoPwa(page);
    const result = await page.evaluate(() => {
      const store = (window as any).AuthStore;
      const countPushes = () =>
        store.getAuditLog().filter((e: any) => e.action === 'push_notification_simulated').length;
      // Direct assignment runs from a DRAFT order, and publish/assign validate
      // that the dates are present and in the future.
      const job = store.getJobs().find((j: any) => j.status === 'draft');
      job.pickup.date = '15.11.2027';
      job.delivery.date = '16.11.2027';
      job.pickup.dateLong = '';
      job.delivery.dateLong = '';
      const driver = store.getCurrentDriver();
      const before = countPushes();
      const assigned = store.assignJob(job.id, driver.id);
      return {
        assigned,
        pushDelta: countPushes() - before,
        assignedRow: store
          .getDriverNotifications()
          .some((n: any) => n.type === 'job_assigned' && n.jobId === job.id),
      };
    });
    expect(result.assigned.ok, 'the assignment succeeded').toBe(true);
    expect(result.assignedRow, 'the in-app job_assigned row is created').toBe(true);
    expect(
      result.pushDelta,
      'direct assignment must not emit a Marketplace-style availability push',
    ).toBe(0);
  });

  test('the push toggle and postal-prefix area still gate who is notified', async ({ page }) => {
    await gotoPwa(page);
    // Eligibility is per driver, and the demo data has more than one active
    // driver — so the property to assert is WHO received a delivery, not how
    // many were sent. Only the current driver's preferences are changed here.
    const outcome = await page.evaluate(() => {
      const store = (window as any).AuthStore;
      const deliveriesFor = (name: string) =>
        store
          .getAuditLog()
          .filter((e: any) => e.action === 'push_notification_simulated')
          .filter((e: any) => String(e.meta).includes(name)).length;
      const job = store.getJobs().find((j: any) => j.status === 'draft');
      job.pickup.date = '15.11.2027';
      job.delivery.date = '16.11.2027';
      job.pickup.dateLong = '';
      job.delivery.dateLong = '';
      const me = store.getCurrentDriver().name;
      const pickupPrefix = String(job.pickup.postalCode).slice(0, 2);

      // 1. Master push switch off → this driver must not be notified.
      store.updateDriverPrefs({ pushEnabled: false });
      const beforeOff = deliveriesFor(me);
      store.publishJob(job.id);
      const withPushOff = deliveriesFor(me) - beforeOff;

      // 2. Push on, but a postal area that cannot match the pickup.
      job.status = 'draft';
      store.updateDriverPrefs({
        pushEnabled: true,
        notifyNewPublished: true,
        postalAreas: [pickupPrefix === '99' ? '11' : '99'],
      });
      const beforeArea = deliveriesFor(me);
      store.publishJob(job.id);
      const withNonMatchingArea = deliveriesFor(me) - beforeArea;

      // 3. Push on, area matches → notified.
      job.status = 'draft';
      store.updateDriverPrefs({
        pushEnabled: true,
        notifyNewPublished: true,
        postalAreas: [pickupPrefix],
      });
      const beforeMatch = deliveriesFor(me);
      store.publishJob(job.id);
      const withMatchingArea = deliveriesFor(me) - beforeMatch;

      return { withPushOff, withNonMatchingArea, withMatchingArea };
    });

    expect(outcome.withPushOff, 'push disabled → not notified').toBe(0);
    expect(outcome.withNonMatchingArea, 'postal area does not match → not notified').toBe(0);
    expect(outcome.withMatchingArea, 'postal area matches → notified').toBe(1);
  });

  test('a simulated Marketplace send carries the generic body, never the route', async ({
    page,
  }) => {
    await gotoPwa(page);
    const metas = await page.evaluate(() => {
      const store = (window as any).AuthStore;
      const job = store.getJobs().find((j: any) => j.status === 'draft');
      job.pickup.date = '15.11.2027';
      job.delivery.date = '16.11.2027';
      job.pickup.dateLong = '';
      job.delivery.dateLong = '';
      store.updateDriverPrefs({
        pushEnabled: true,
        notifyNewPublished: true,
        postalAreas: [],
      });
      store.publishJob(job.id);
      return store
        .getAuditLog()
        .filter((e: any) => e.action === 'push_notification_simulated')
        .map((e: any) => String(e.meta));
    });
    const delivery = (metas as string[]).find((m) => /available/i.test(m));
    expect(delivery, 'a delivery line was logged').toBeTruthy();
    // The audit meta is `<push body> → <recipient>`, so the delivered copy is
    // everything left of the log's own delimiter. Assert on that, not on the
    // whole line — the arrow here is the delimiter, not route text.
    const deliveredCopy = String(delivery).split('→')[0].trim();
    expect(deliveredCopy).toBe(GENERIC_BODY.en);
    // The old copy interpolated "{from} → {to}" into the body itself.
    expect(deliveredCopy, 'no city in the delivered copy').not.toMatch(
      /Munich|München|Berlin|Hamburg|Bremen|Cologne|Köln/i,
    );
    expect(deliveredCopy, 'no digits in the delivered copy').not.toMatch(/\d/);
  });
});
