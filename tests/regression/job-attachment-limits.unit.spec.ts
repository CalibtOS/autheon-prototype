import { test, expect } from './support/fixtures/prototype-test.ts';
import { gotoPrototype } from './support/helpers/stable-page.ts';
import { getPrototypeFrame } from './support/helpers/selectors.ts';

/**
 * Store-level arithmetic for job attachment size limits.
 *
 * The repository has no JS unit-test runner (no bundler, no Jest/Vitest — the
 * prototype is static React + Babel-standalone over CDN scripts), so this
 * follows the same pattern as `marketplace-filter-count.unit.spec.ts` and the
 * audit-retention unit spec: the functions under test are exported on
 * `window.AuthStore` and driven directly in the page realm. No rendering, no
 * clicking — a store-level suite that happens to execute in a browser realm.
 *
 * Contract under test:
 *   AuthStore.getDriverUploadLimits / setDriverUploadLimits
 *   AuthStore.PLATFORM_UPLOAD_CEILING_BYTES
 *   AuthStore.tourDocumentsUsageBytes(jobId, { excludingDocumentId? })
 *   AuthStore.tourDocumentsRemainingBytes(jobId)
 *   AuthStore.assertAttachmentAllowed / assertTourDocumentAttachment
 *   AuthStore.addTourDocument / replaceTourDocument / removeDriverTourDocument
 *   AuthStore.attachAdminJobDocument
 *
 * Seed tour A-2026-00845 carries a ~40 MB accepted document so the default
 * 50 MB area total is nearly full out of the box.
 */

const MB = 1024 * 1024;
/** Seeded live bytes on 0845: driver upload + off-channel + 40 MB accepted. */
const SEED_USAGE_0845 = 156000 + 204800 + 40 * MB;

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

test.describe('AuthStore job attachment size limits (store-level)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPrototype(page);
  });

  test('configured limits default to 25 / 50 MB and round-trip through the setter', async ({
    page,
  }) => {
    const result = await withStore(page, (store) => {
      const initial = store.getDriverUploadLimits();
      store.setDriverUploadLimits({ maxFileMb: 10, maxTotalMb: 30 });
      const updated = store.getDriverUploadLimits();
      store.setDriverUploadLimits({ maxFileMb: 25, maxTotalMb: 50 });
      return {
        initial,
        updated,
        ceiling: store.PLATFORM_UPLOAD_CEILING_BYTES,
      };
    });
    expect(result.initial).toEqual({
      maxFileMb: 25,
      maxTotalMb: 50,
      maxFileBytes: 25 * MB,
      maxTotalBytes: 50 * MB,
    });
    expect(result.updated).toEqual({
      maxFileMb: 10,
      maxTotalMb: 30,
      maxFileBytes: 10 * MB,
      maxTotalBytes: 30 * MB,
    });
    expect(result.ceiling).toBe(50 * MB);
  });

  test('usage counts driver and off-channel docs, excludes replaced rows and transport orders', async ({
    page,
  }) => {
    const result = await withStore(page, (store) => {
      const jobId = 'A-2026-00845';
      const before = store.tourDocumentsUsageBytes(jobId);
      const listed = store.getTourDocumentsForJob(jobId);
      const liveSum = listed
        .filter((d: any) => d.reviewStatus !== 'replaced')
        .reduce((n: number, d: any) => n + (d.sizeBytes || 0), 0);

      const replaceable = listed.find((d: any) => d.id === 'TD-SEED-ACTIVE-001');
      const replaced = store.replaceTourDocument(replaceable.id, {
        name: 'pickup-proof-0845-v2.jpg',
        type: 'image/jpeg',
        size: replaceable.sizeBytes,
      });
      const afterReplace = store.tourDocumentsUsageBytes(jobId);
      const historyRows = store
        .getTourDocumentsForJob(jobId)
        .filter((d: any) => d.reviewStatus === 'replaced');

      // Transport orders are seeded for binding tours and live in a different
      // collection — their presence must not change the documents-area figure.
      const transport = store.getTransportOrderDocuments(jobId);
      const usageWithTransportPresent = store.tourDocumentsUsageBytes(jobId);

      return {
        before,
        liveSum,
        replacedOk: replaced.ok,
        afterReplace,
        historyRows: historyRows.length,
        excludingNew: store.tourDocumentsUsageBytes(jobId, {
          excludingDocumentId: replaced.id,
        }),
        transportCount: transport.length,
        usageWithTransportPresent,
        hasLargeSeed: listed.some((d: any) => d.id === 'TD-SEED-LARGE-0845'),
      };
    });

    expect(result.hasLargeSeed).toBe(true);
    expect(result.before).toBe(SEED_USAGE_0845);
    expect(result.liveSum).toBe(result.before);
    expect(result.replacedOk).toBe(true);
    expect(result.afterReplace).toBe(result.before);
    expect(result.historyRows).toBe(1);
    expect(result.excludingNew).toBe(result.afterReplace - 156000);
    expect(result.transportCount).toBeGreaterThan(0);
    expect(result.usageWithTransportPresent).toBe(result.afterReplace);
  });

  test('per-file and exhausted-allowance refusals stay distinct', async ({ page }) => {
    const result = await withStore(page, (store) => {
      const jobId = 'A-2026-00845';
      const tooBig = store.addTourDocument(
        { name: 'huge.pdf', type: 'application/pdf', size: 26 * 1024 * 1024 },
        { jobId, documentType: 'other_proof' },
      );
      const fitsFileButNotArea = store.addTourDocument(
        {
          name: 'fifteen-mb.pdf',
          type: 'application/pdf',
          size: 15 * 1024 * 1024,
        },
        { jobId, documentType: 'other_proof' },
      );
      return { tooBig, fitsFileButNotArea };
    });
    expect(result.tooBig).toEqual({ ok: false, reason: 'file_too_large' });
    expect(result.fitsFileButNotArea).toEqual({
      ok: false,
      reason: 'allowance_exhausted',
    });
    expect(result.tooBig.reason).not.toBe(result.fitsFileButNotArea.reason);
  });

  test('delta replace succeeds on a nearly full tour; a larger replacement does not', async ({
    page,
  }) => {
    const result = await withStore(page, (store) => {
      const jobId = 'A-2026-00845';
      const remaining = store.tourDocumentsRemainingBytes(jobId);
      const likeForLike = store.replaceTourDocument('TD-SEED-ACTIVE-001', {
        name: 'pickup-proof-same.jpg',
        type: 'image/jpeg',
        size: 156000,
      });
      const live = store
        .getTourDocumentsForJob(jobId)
        .find(
          (d: any) =>
            d.reviewStatus === 'uploaded' &&
            d.fileName === 'pickup-proof-same.jpg',
        );
      const tooLarge = store.replaceTourDocument(live.id, {
        name: 'pickup-proof-huge.jpg',
        type: 'image/jpeg',
        size: 20 * 1024 * 1024,
      });
      return {
        remaining,
        likeForLike,
        tooLarge,
        remainingAfter: store.tourDocumentsRemainingBytes(jobId),
      };
    });
    expect(result.remaining).toBe(50 * MB - SEED_USAGE_0845);
    expect(result.likeForLike.ok).toBe(true);
    expect(result.tooLarge).toEqual({ ok: false, reason: 'allowance_exhausted' });
    expect(result.remainingAfter).toBe(result.remaining);
  });

  test('removing a document frees its bytes so a previously refused upload succeeds', async ({
    page,
  }) => {
    const result = await withStore(page, (store) => {
      const jobId = 'A-2026-00842';
      const driverId = store.getCurrentDriver().id;
      // Cap the area at 1 MB — seeded live docs on 00842 already exceed that,
      // so any new upload is refused until enough uploaded rows are removed.
      store.setDriverUploadLimits({ maxFileMb: 25, maxTotalMb: 1 });
      const usageBefore = store.tourDocumentsUsageBytes(jobId);
      const probe = {
        name: 'needs-room.pdf',
        type: 'application/pdf',
        size: 50000,
      };
      const refused = store.addTourDocument(probe, {
        jobId,
        documentType: 'other_proof',
      });

      let freed = 0;
      const removals: Array<{ ok: boolean }> = [];
      while (store.tourDocumentsUsageBytes(jobId) + probe.size > 1 * 1024 * 1024) {
        const next = store
          .getTourDocumentsForJob(jobId)
          .find(
            (d: any) =>
              d.reviewStatus === 'uploaded' &&
              d.source === 'driver' &&
              d.driverId === driverId,
          );
        if (!next) break;
        freed += next.sizeBytes || 0;
        removals.push(store.removeDriverTourDocument(next.id));
      }
      const usageAfter = store.tourDocumentsUsageBytes(jobId);
      const after = store.addTourDocument(probe, {
        jobId,
        documentType: 'other_proof',
      });
      return { refused, removals, freed, usageBefore, usageAfter, after };
    });
    expect(result.usageBefore).toBeGreaterThan(1 * MB);
    expect(result.refused).toEqual({ ok: false, reason: 'allowance_exhausted' });
    expect(result.removals.length).toBeGreaterThan(0);
    expect(result.removals.every((r) => r.ok)).toBe(true);
    expect(result.usageAfter).toBe(result.usageBefore - result.freed);
    expect(result.usageAfter + 50000).toBeLessThanOrEqual(1 * MB);
    expect(result.after.ok).toBe(true);
  });

  test('remaining clamps at zero once dispatch pushes the tour past its allowance', async ({
    page,
  }) => {
    const result = await withStore(page, (store) => {
      const jobId = 'A-2026-00845';
      const before = store.tourDocumentsRemainingBytes(jobId);
      const attach = store.attachAdminJobDocument(jobId, {
        name: 'dispatch-overfill.pdf',
        type: 'application/pdf',
        size: 15 * 1024 * 1024,
      });
      const usage = store.tourDocumentsUsageBytes(jobId);
      const remaining = store.tourDocumentsRemainingBytes(jobId);
      const limits = store.getDriverUploadLimits();
      return { before, attach, usage, remaining, maxTotal: limits.maxTotalBytes };
    });
    expect(result.before).toBe(50 * MB - SEED_USAGE_0845);
    expect(result.attach.ok).toBe(true);
    expect(result.usage).toBeGreaterThan(result.maxTotal);
    expect(result.remaining).toBe(0);
  });

  test('evidence allowance is independent of the tour documents area', async ({ page }) => {
    const result = await withStore(page, (store) => {
      const jobId = 'A-2026-00845';
      const tourUsage = store.tourDocumentsUsageBytes(jobId);
      const tourRefuse = store.assertTourDocumentAttachment(jobId, {
        name: 'evidence-sized.pdf',
        type: 'application/pdf',
        size: 20 * 1024 * 1024,
      });
      // A problem report starts empty — usage 0 — so the same file fits.
      const evidenceOk = store.assertAttachmentAllowed({
        fileSizeBytes: 20 * 1024 * 1024,
        currentUsageBytes: 0,
      });
      const evidenceBatch = store.assertAttachmentAllowed({
        fileSizeBytes: 20 * 1024 * 1024,
        currentUsageBytes: 35 * 1024 * 1024,
      });
      return { tourUsage, tourRefuse, evidenceOk, evidenceBatch };
    });
    expect(result.tourUsage).toBe(SEED_USAGE_0845);
    expect(result.tourRefuse).toEqual({ ok: false, reason: 'allowance_exhausted' });
    expect(result.evidenceOk).toEqual({ ok: true });
    expect(result.evidenceBatch).toEqual({
      ok: false,
      reason: 'allowance_exhausted',
    });
  });

  test('lowering a configured limit invalidates nothing already attached', async ({
    page,
  }) => {
    const result = await withStore(page, (store) => {
      const jobId = 'A-2026-00845';
      const before = store.getTourDocumentsForJob(jobId).map((d: any) => ({
        id: d.id,
        reviewStatus: d.reviewStatus,
        sizeBytes: d.sizeBytes,
      }));
      const usageBefore = store.tourDocumentsUsageBytes(jobId);
      store.setDriverUploadLimits({ maxFileMb: 1, maxTotalMb: 1 });
      const after = store.getTourDocumentsForJob(jobId).map((d: any) => ({
        id: d.id,
        reviewStatus: d.reviewStatus,
        sizeBytes: d.sizeBytes,
      }));
      return {
        before,
        after,
        usageBefore,
        usageAfter: store.tourDocumentsUsageBytes(jobId),
        remaining: store.tourDocumentsRemainingBytes(jobId),
      };
    });
    expect(result.after).toEqual(result.before);
    expect(result.usageAfter).toBe(result.usageBefore);
    expect(result.remaining).toBe(0);
  });

  test('platform ceiling governs personal docs; configured per-file governs tour docs', async ({
    page,
  }) => {
    const result = await withStore(page, (store) => {
      const driverId = store.getCurrentDriver().id;
      // 30 MB is over the configured 25 MB per-file but under the 50 MB ceiling.
      const thirty = {
        name: 'licence.pdf',
        type: 'application/pdf',
        size: 30 * 1024 * 1024,
      };
      const personal = store.addDriverOnboardingDocument(driverId, thirty, {
        category: 'licence_front',
      });
      const tour = store.addTourDocument(thirty, {
        jobId: 'A-2026-00842',
        documentType: 'other_proof',
      });
      const overCeiling = store.addDriverOnboardingDocument(
        driverId,
        {
          name: 'too-big.pdf',
          type: 'application/pdf',
          size: 51 * 1024 * 1024,
        },
        { category: 'licence_back' },
      );
      return {
        personal,
        tour,
        overCeiling,
        ceiling: store.PLATFORM_UPLOAD_CEILING_BYTES,
      };
    });
    expect(result.personal.ok).toBe(true);
    expect(result.tour).toEqual({ ok: false, reason: 'file_too_large' });
    expect(result.overCeiling).toEqual({ ok: false, reason: 'file_too_large' });
    expect(result.ceiling).toBe(50 * MB);
  });
});
