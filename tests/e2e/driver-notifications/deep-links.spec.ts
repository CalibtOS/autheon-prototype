import { expect, test } from '../../regression/support/fixtures/prototype-test.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { prepareDriverVisual } from '../../regression/support/helpers/visual.ts';
import {
  CARD,
  card,
  expandRideCard,
  openNotificationCenter,
  tapDeepLinkCard,
  tapRideAction,
} from '../../regression/support/helpers/notifications.ts';

/**
 * Contextual deep links: tapping a notification opens the most relevant
 * destination, resolved through the notification's stable entity reference.
 */
test.describe('driver notification deep links @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await prepareDriverVisual(page);
    await openNotificationCenter(page);
  });

  test('an Infopoint notification opens that exact message', async ({ page }) => {
    await tapDeepLinkCard(page, CARD.infopointMessage);
    const frame = prototypeFrame(page);
    // The dedicated detail page, with the complete body.
    await expect(frame.locator('.infopoint-message-body')).toBeVisible();
    await expect(frame.locator('.infopoint-message-body')).toContainText(/warning strikes/i);
    await expect(frame.locator('.detail-header-title')).toBeVisible();
  });

  test('a document notification opens that exact document preview', async ({ page }) => {
    await tapDeepLinkCard(page, CARD.document);
    const frame = prototypeFrame(page);
    // The preview sheet, on the tour the document belongs to.
    await expect(frame.locator('.docview-panel')).toBeVisible();
    await expect(frame.locator('.detail-header-title')).toContainText('0842-26');
  });

  test('a profile-change notification opens the Basic data subpage', async ({ page }) => {
    await tapDeepLinkCard(page, CARD.profileChange);
    await expect(
      prototypeFrame(page).locator('.driver-subpage-header .detail-header-title'),
    ).toHaveText(/^Basic data$/);
  });

  test('an assigned ride opens the full ride detail, not the Marketplace', async ({ page }) => {
    await expandRideCard(page, CARD.assignedRide);
    await tapRideAction(page, CARD.assignedRide);
    const frame = prototypeFrame(page);
    await expect(frame.locator('.detail-header-title')).toContainText('0848-26');
    // Committed ride → the full detail view, so its action reads "To my orders"
    // rather than a Marketplace "View order".
    await expect(
      frame.getByRole('heading', { name: /Marketplace preview|Marktplatz-Vorschau/i }),
    ).toHaveCount(0);
  });

  test('a still-published Marketplace ride opens its Marketplace preview', async ({ page }) => {
    const available = card(page, CARD.marketplace).first();
    await available.locator('.notification-row-toggle').click();
    await available.locator('.notification-card-actions .btn').click();
    await expect(
      prototypeFrame(page).getByRole('heading', {
        name: /Marketplace preview|Marktplatz-Vorschau/i,
      }),
    ).toBeVisible();
  });

  test('navigation resolves through stable ids, not display text', async ({ page }) => {
    // Rewrite every human-readable field a resolver might be tempted to use —
    // title, body and tour number — then confirm the targets are unchanged.
    const before = await prototypeFrame(page)
      .locator('body')
      .evaluate(() => {
        const store = (window as any).AuthStore;
        return store
          .getDriverNotifications()
          .map((row: any) => JSON.stringify(store.resolveDriverNotificationTarget(row)));
      });

    const after = await prototypeFrame(page)
      .locator('body')
      .evaluate(() => {
        const store = (window as any).AuthStore;
        const rows = store.getDriverNotifications();
        rows.forEach((row: any, i: number) => {
          row.title = `scrambled-title-${i}`;
          row.body = `scrambled-body-${i}`;
          row.tour = `ZZZZ-${i}`;
        });
        return rows.map((row: any) =>
          JSON.stringify({
            ...store.resolveDriverNotificationTarget(row),
            // `tour` is display text carried on the target for the card meta
            // line; it legitimately follows the scrambled value.
            tour: undefined,
          }),
        );
      });

    const stripTour = (s: string) => JSON.stringify({ ...JSON.parse(s), tour: undefined });
    expect(after).toEqual(before.map(stripTour));
  });

  test('a missing or malformed target fails safe', async ({ page }) => {
    const results = await prototypeFrame(page)
      .locator('body')
      .evaluate(() => {
        const store = (window as any).AuthStore;
        return ['DN-DOES-NOT-EXIST', '', null, undefined, '../../etc/passwd', 42].map((id) => {
          const target = store.resolveDriverNotificationTarget(id as any);
          return { ok: target.ok, available: target.available, reason: target.unavailableReason };
        });
      });
    for (const result of results) {
      expect(result.ok).toBe(false);
      expect(result.available).toBe(false);
      expect(result.reason).toBe('notification_missing');
    }
  });

  test('an unauthorized document target exposes nothing', async ({ page }) => {
    // A document only opens from a tour the driver is committed to. Commitment
    // comes from the accepted/performed sets or a driver match on the order — so
    // withdrawing ALL THREE is what actually makes the driver unauthorized here.
    const target = await prototypeFrame(page)
      .locator('body')
      .evaluate(() => {
        const store = (window as any).AuthStore;
        const row = store
          .getDriverNotifications()
          .find((n: any) => n.id === 'DN-SEED-001');
        const job = store.getJob('A-2026-00842');
        const previous = { driver: job.driver, driverId: job.driverId };
        store.driver.performedIds.delete(job.id);
        store.driver.acceptedIds.delete(job.id);
        job.driver = 'Someone Else';
        job.driverId = 'DRV-9999';
        const resolved = store.resolveDriverNotificationTarget(row);
        Object.assign(job, previous);
        store.driver.performedIds.add(job.id);
        return resolved;
      });
    expect(target.available).toBe(false);
    expect(target.unavailableReason).toBe('not_permitted');
    // The document id is withheld from an unauthorized target, so a caller
    // cannot navigate with it even by ignoring `available`.
    expect(target.documentId).toBeUndefined();
  });

  test('a legacy row with no target metadata fails safe', async ({ page }) => {
    const target = await prototypeFrame(page)
      .locator('body')
      .evaluate(() => {
        const store = (window as any).AuthStore;
        // A row written before target references existed.
        return store.resolveDriverNotificationTarget({
          id: 'DN-LEGACY',
          type: 'infopoint_news',
          title: 'Legacy',
          body: '',
          read: false,
          createdAt: '01.01.',
        });
      });
    expect(target.ok).toBe(true);
    expect(target.available).toBe(false);
    expect(target.unavailableReason).toBe('message_gone');
  });

  test('opening a notification writes no audit event', async ({ page }) => {
    const counts = await prototypeFrame(page)
      .locator('body')
      .evaluate(() => {
        const store = (window as any).AuthStore;
        const before = store.getAuditEvents?.().length ?? store.getAuditLog?.().length ?? 0;
        store.markDriverNotificationsRead(['DN-SEED-ASSIGNED-001']);
        const after = store.getAuditEvents?.().length ?? store.getAuditLog?.().length ?? 0;
        return { before, after };
      });
    expect(counts.after).toBe(counts.before);
  });

  test('opening the destination content still audits it', async ({ page }) => {
    // The notification is not audited; the content it points at is.
    await tapDeepLinkCard(page, CARD.infopointMessage);
    await expect(prototypeFrame(page).locator('.infopoint-message-body')).toBeVisible();
    const audited = await prototypeFrame(page)
      .locator('body')
      .evaluate(() => {
        const store = (window as any).AuthStore;
        const rows = store.getAuditEvents?.() ?? store.getAuditLog?.() ?? [];
        return rows.some((r: any) => String(r.action) === 'news_item_viewed');
      });
    expect(audited).toBe(true);
  });
});
