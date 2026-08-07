import { test, expect } from './support/fixtures/prototype-test.ts';
import { gotoPrototype } from './support/helpers/stable-page.ts';
import { getPrototypeFrame } from './support/helpers/selectors.ts';

/**
 * Store-level D6 inactivity sweep (status consolidation).
 *
 * Branch A (no active tours): disable accountAccess + operationalAccess.
 * Branch B (active tours): disable operational only, keep login, defer account
 * removal once-per-dormancy for notify.
 *
 * Same Autheon pattern as job-attachment-limits.unit.spec.ts — AuthStore on
 * window, no Jest; driven in the page realm.
 */

async function withStore<T>(
  page: import('@playwright/test').Page,
  fn: (store: any) => T,
): Promise<T> {
  const frame = await getPrototypeFrame(page);
  return frame.evaluate((source) => {
    const store = (window as never as { AuthStore: any }).AuthStore;
    if (!store) throw new Error('AuthStore is not on window');
    // eslint-disable-next-line no-new-func
    return new Function('store', `return (${source})(store);`)(store);
  }, fn.toString()) as Promise<T>;
}

test.describe('AuthStore D6 inactivity sweep (store-level)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPrototype(page);
  });

  test('Branch A removes both axes; Branch B defers account and notifies once', async ({
    page,
  }) => {
    const result = await withStore(page, (store) => {
      const first = store.runInactivitySweep(new Date());
      const dana = store.getDrivers().find((d: any) => d.id === 'DRV-0001');
      const erik = store.getDrivers().find((d: any) => d.id === 'DRV-0401');
      const tomas = store.getDrivers().find((d: any) => d.id === 'DRV-0342');
      const second = store.runInactivitySweep(new Date());
      const deferredAudits = store
        .getAuditLog()
        .filter((a: any) => a.action === 'driver_access_removal_deferred');
      const feed = store
        .getAdminEmailQueue()
        .filter((r: any) => r.event === 'driver_access_removal_deferred');
      return {
        first,
        second,
        dana: {
          accountAccess: dana?.accountAccess,
          operationalAccess: dana?.operationalAccess,
          deactivationReason: dana?.deactivationReason,
        },
        erik: {
          accountAccess: erik?.accountAccess,
          operationalAccess: erik?.operationalAccess,
        },
        tomas: {
          accountAccess: tomas?.accountAccess,
          operationalAccess: tomas?.operationalAccess,
          accessRemovalDeferredAt: tomas?.accessRemovalDeferredAt,
        },
        deferredAuditAdminNotified: deferredAudits.map(
          (a: any) => a.adminNotified,
        ),
        deferredFeedCount: feed.length,
      };
    });

    expect(result.first.accessRemovedIds).toEqual(
      expect.arrayContaining(['DRV-0001', 'DRV-0401']),
    );
    expect(result.first.deferredIds).toContain('DRV-0342');
    expect(result.first.deferredNotifiedIds).toContain('DRV-0342');

    expect(result.dana).toEqual({
      accountAccess: 'disabled',
      operationalAccess: 'disabled',
      deactivationReason: 'inactivity',
    });
    expect(result.erik.accountAccess).toBe('disabled');
    expect(result.erik.operationalAccess).toBe('disabled');

    expect(result.tomas.accountAccess).toBe('enabled');
    expect(result.tomas.operationalAccess).toBe('disabled');
    expect(result.tomas.accessRemovalDeferredAt).toBeTruthy();

    expect(result.second.deferredNotifiedIds).toEqual([]);
    expect(result.deferredFeedCount).toBe(1);
    expect(result.deferredAuditAdminNotified[0]).toBe('true');
    expect(result.deferredAuditAdminNotified.slice(1).every((v) => v === 'false'))
      .toBe(true);
  });

  test('recordDriverActivity does not clear inactivityWarningSentAt (R5)', async ({
    page,
  }) => {
    const result = await withStore(page, (store) => {
      const marker = '2020-01-01T00:00:00.000Z';
      const drivers = store.getDrivers();
      const jordan = drivers.find((d: any) => d.id === 'DRV-0228') || drivers[0];
      jordan.inactivityWarningSentAt = marker;
      store.recordDriverActivity(jordan.id);
      const after = store.getDrivers().find((d: any) => d.id === jordan.id);
      return {
        before: marker,
        after: after?.inactivityWarningSentAt,
        lastActiveAt: after?.lastActiveAt,
        deferredCleared: after?.accessRemovalDeferredAt == null,
      };
    });
    expect(result.after).toBe(result.before);
    expect(result.lastActiveAt).toBeTruthy();
  });
});
