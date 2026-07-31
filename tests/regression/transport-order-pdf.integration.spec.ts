import { test, expect } from './support/fixtures/prototype-test.ts';
import { gotoPrototype } from './support/helpers/stable-page.ts';
import { getPrototypeFrame } from './support/helpers/selectors.ts';

/**
 * Integration tests for transport-order PDF generation as a DOMAIN behaviour:
 * generation timing, immutable versioning, the active-version pointer,
 * idempotency, the audit trail, the partner notification and server-side
 * authorization.
 *
 * These drive `AuthStore` inside the page realm — the store is the prototype's
 * stand-in for the backend, and it is the layer that owns all of the above. The
 * renderer's own behaviour is covered by `transport-order-pdf.unit.spec.ts`.
 *
 * Each test starts from a freshly reloaded demo dataset so version numbers and
 * audit entries are not carried between cases.
 */

type Store = Record<string, (...args: unknown[]) => unknown>;

async function inStore<T>(
  page: import('@playwright/test').Page,
  fn: (store: Store) => T,
): Promise<T> {
  const frame = await getPrototypeFrame(page);
  return frame.evaluate((source) => {
    const store = (window as unknown as { AuthStore?: Store }).AuthStore;
    if (!store) throw new Error('AuthStore is not loaded');
    // eslint-disable-next-line no-new-func
    return new Function('store', `return (${source})(store);`)(store);
  }, fn.toString()) as Promise<T>;
}

/**
 * Clears the demo driver's probation gate. That rule is unrelated to PDF
 * generation but would otherwise refuse `acceptJob()` in the seeded dataset,
 * so it is neutralised explicitly rather than worked around.
 */
async function resetDemo(page: import('@playwright/test').Page): Promise<void> {
  await inStore(page, (store) => {
    (store.reloadDemo as () => void)();
    const driver = (store.getCurrentDriver as () => { probationClearedAt: string })();
    driver.probationClearedAt = '01.04.2026 10:00';
  });
}

test.describe('transport-order PDF generation (domain behaviour)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPrototype(page);
    await resetDemo(page);
  });

  test('a still-published marketplace order has no document until acceptance', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
      }[];
      const published = jobs.filter((j) => j.status === 'published');
      const drafts = jobs.filter((j) => j.status === 'draft');
      const docsFor = (id: string) =>
        (store.getTransportOrderDocuments as (i: string) => unknown[])(id).length;
      return {
        publishedCount: published.length,
        publishedDocs: published.map((j) => docsFor(j.id)),
        draftDocs: drafts.map((j) => docsFor(j.id)),
        // Generating for a non-binding order is refused outright.
        draftRefusal: drafts.length
          ? (store.regeneratePdf as (i: string) => { ok: boolean; reason: string })(
              drafts[0].id,
            )
          : null,
      };
    });

    expect(result.publishedCount).toBeGreaterThan(0);
    expect(result.publishedDocs.every((n) => n === 0)).toBe(true);
    expect(result.draftDocs.every((n) => n === 0)).toBe(true);
    expect(result.draftRefusal).toMatchObject({ ok: false, reason: 'not_binding' });
  });

  test('marketplace acceptance creates an immutable v1 after the booking is saved', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
      }[];
      const job = jobs.find((j) => j.status === 'published')!;
      const accept = (store.acceptJob as (i: string, o: unknown) => { ok: boolean })(
        job.id,
        { confirmSameDayOverlap: true },
      );
      const docs = (store.getTransportOrderDocuments as (i: string) => unknown[])(
        job.id,
      ) as unknown as Record<string, unknown>[];
      return { accept, docs, jobId: job.id };
    });

    expect(result.accept).toMatchObject({ ok: true });
    expect(result.docs).toHaveLength(1);
    expect(result.docs[0]).toMatchObject({
      version: 1,
      isActive: true,
      trigger: 'marketplace_acceptance',
      status: 'generated',
      // Every field the specification requires on the record.
      gtcDocumentId: 'AGB-SP',
      gtcVersion: '2026-01',
    });
    expect(String(result.docs[0].checksumSha256)).toMatch(/^[0-9a-f]{64}$/);
    expect(String(result.docs[0].storageRef)).toContain('/v1/');
    expect(String(result.docs[0].generatedAt)).not.toBe('');
    expect(result.docs[0].dataRevision).toBe(1);
    expect(result.docs[0].servicePartnerSnapshot).toMatchObject({
      company: expect.any(String),
      street: expect.any(String),
      postalCode: expect.any(String),
      city: expect.any(String),
      country: expect.any(String),
    });
  });

  test('direct assignment creates an immutable v1 and a refused assignment creates none', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
        driverOffer: number | null;
        vin: string;
      }[];
      const draft = jobs.find((j) => j.status === 'draft')! as unknown as {
        id: string;
        driverOffer: number | null;
        pickup: { date: string };
        delivery: { date: string };
      };
      // Seeded drafts carry year-less display dates, which the repository's
      // pre-existing order validation rejects (and it also refuses past
      // dates). Completing them is test setup, not part of what is under test.
      const dotted = (daysAhead: number) => {
        const d = new Date();
        d.setDate(d.getDate() + daysAhead);
        const p2 = (n: number) => String(n).padStart(2, '0');
        return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;
      };
      draft.pickup.date = dotted(30);
      draft.delivery.date = dotted(31);

      // A draft that fails validation must not be assigned AND must not
      // produce a document — a rolled-back booking leaves no paperwork.
      const savedOffer = draft.driverOffer;
      draft.driverOffer = null;
      const refused = (
        store.assignJob as (i: string, d: string, o?: unknown) => { ok: boolean; reason: string }
      )(draft.id, 'DRV-0301', { confirmedDuplicate: true });
      const afterRefusal = (
        store.getTransportOrderDocuments as (i: string) => unknown[]
      )(draft.id).length;

      draft.driverOffer = savedOffer;
      // Pick a partner the store actually considers assignable, rather than
      // hardcoding an id whose account status may block assignment.
      const assignable = (store.getDrivers as () => { id: string }[])().find(
        (d) =>
          (
            store.resolveAssignableDriver as (r: string) => { ok: boolean }
          )(d.id).ok,
      )!;
      const assigned = (
        store.assignJob as (i: string, d: string, o?: unknown) => { ok: boolean; reason?: string }
      )(draft.id, assignable.id, { confirmedDuplicate: true });
      const docs = (store.getTransportOrderDocuments as (i: string) => unknown[])(
        draft.id,
      ) as unknown as Record<string, unknown>[];
      return { refused, afterRefusal, assigned, docs };
    });

    expect(result.refused).toMatchObject({ ok: false });
    // The critical assertion: a failed booking leaves no document behind.
    expect(result.afterRefusal).toBe(0);
    expect(result.assigned).toMatchObject({ ok: true });
    expect(result.docs).toHaveLength(1);
    expect(result.docs[0]).toMatchObject({
      version: 1,
      isActive: true,
      trigger: 'direct_assignment',
    });
  });

  test('a relevant change adds one version, keeps the previous one, and moves the active pointer', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
      }[];
      const job = jobs.find((j) => j.status === 'assigned')!;
      const before = (store.getTransportOrderDocuments as (i: string) => unknown[])(
        job.id,
      ) as unknown as Record<string, unknown>[];

      // Route through the real admin edit path, not a direct field poke, so
      // the relevant-change detection is what decides.
      const edit = (
        store.updateActiveOrder as (i: string, patch: unknown) => { ok: boolean }
      )(job.id, { driverOffer: 999 });

      const after = (store.getTransportOrderDocuments as (i: string) => unknown[])(
        job.id,
      ) as unknown as Record<string, unknown>[];
      return {
        edit,
        beforeVersions: before.map((d) => d.version),
        beforeChecksums: before.map((d) => d.checksumSha256),
        afterVersions: after.map((d) => d.version),
        afterActive: after.filter((d) => d.isActive).map((d) => d.version),
        afterChecksums: after.map((d) => d.checksumSha256),
        v1Unchanged:
          after[0].checksumSha256 === before[0].checksumSha256 &&
          after[0].generatedAt === before[0].generatedAt &&
          JSON.stringify(after[0].servicePartnerSnapshot) ===
            JSON.stringify(before[0].servicePartnerSnapshot),
        changedFields: after[1]?.changedFields,
        revisions: after.map((d) => d.dataRevision),
      };
    });

    expect(result.edit).toMatchObject({ ok: true });
    expect(result.beforeVersions).toEqual([1]);
    expect(result.afterVersions).toEqual([1, 2]);
    // Exactly one active version, and it is the new one.
    expect(result.afterActive).toEqual([2]);
    // v1's binary reference, checksum, timestamp and snapshot are untouched.
    expect(result.v1Unchanged).toBe(true);
    expect(result.afterChecksums[0]).not.toBe(result.afterChecksums[1]);
    expect(result.changedFields).toContain('driverOffer');
    expect(result.revisions).toEqual([1, 2]);
  });

  test('an irrelevant change creates no version and does not notify the partner', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
      }[];
      const job = jobs.find((j) => j.status === 'assigned')!;
      const notifsBefore = (
        store.getDriverNotifications as (d?: string) => { documentId?: string }[]
      )().length;
      const before = (store.getTransportOrderDocuments as (i: string) => unknown[])(
        job.id,
      ).length;

      // Admin-only internal note and admin-only expenses: neither is rendered.
      (store.addInternalNote as (i: string, t: string) => unknown)(
        job.id,
        'Admin-only note, must never reach the partner',
      );
      const expenseEdit = (
        store.updateActiveOrder as (i: string, patch: unknown) => { ok: boolean }
      )(job.id, { expenses: 42 });

      const relevantSet = (store.getPdfRelevantFields as () => string[])();
      return {
        before,
        after: (store.getTransportOrderDocuments as (i: string) => unknown[])(job.id)
          .length,
        expenseEdit,
        notifsAdded:
          (store.getDriverNotifications as (d?: string) => { documentId?: string }[])().length -
          notifsBefore,
        pdfNotifs: (store.getDriverNotifications as (d?: string) => { documentId?: string }[])()
          .filter((n) => String(n.documentId || '').startsWith('TOPDF')).length,
        // The declared relevant-change set excludes admin-only and unrendered
        // fields, including the PWA distance.
        excluded: ['expenses', 'notes', 'distanceKm', 'category', 'electricVehicle',
          'readyToDrive', 'requiresRedLicencePlates']
          .filter((f) => relevantSet.includes(f)),
        included: ['driverOffer', 'plate', 'vin', 'vehicleType', 'registrationStatus',
          'transportType', 'notesDriver', 'pickupDate', 'deliveryEmail']
          .filter((f) => !relevantSet.includes(f)),
      };
    });

    expect(result.after).toBe(result.before);
    expect(result.excluded).toEqual([]);
    expect(result.included).toEqual([]);
    expect(result.pdfNotifs).toBe(0);
  });

  test('a new active version notifies the assigned partner without admin-only data', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
        tour: string;
      }[];
      const job = jobs.find((j) => j.status === 'assigned')!;
      (store.addInternalNote as (i: string, t: string) => unknown)(
        job.id,
        'SECRET_ADMIN_NOTE',
      );
      (store.updateActiveOrder as (i: string, p: unknown) => unknown)(job.id, {
        driverOffer: 777,
      });
      const docs = (store.getTransportOrderDocuments as (i: string) => unknown[])(
        job.id,
      ) as unknown as { id: string; isActive: boolean }[];
      const active = docs.find((d) => d.isActive)!;
      // A seeded order may reference its partner by name only, so resolve the
      // record the same way the store does.
      const partner = (store.getDrivers as () => { id: string; name: string }[])().find(
        (d) =>
          d.id === (job as unknown as { driverId?: string }).driverId ||
          d.name === (job as unknown as { driver?: string }).driver,
      )!;
      const notif = (
        store.getDriverNotifications as (d?: string) => Record<string, string>[]
      )(partner.id).find((n) => n.documentId === active.id);
      return {
        tour: job.tour,
        activeId: active.id,
        notif,
        // The partner's own driver record must be the recipient.
        driverId: notif?.driverId,
        jobDriverId: partner.id,
      };
    });

    expect(result.notif).toBeTruthy();
    // Stable job/document identifiers, so the notification can deep-link.
    expect(result.notif!.jobId).toBeTruthy();
    expect(result.notif!.documentId).toBe(result.activeId);
    expect(result.notif!.tour).toBe(result.tour);
    expect(result.driverId).toBe(result.jobDriverId);
    // No admin-only content leaks into the partner's notification.
    const text = `${result.notif!.title} ${result.notif!.body}`;
    expect(text).not.toContain('SECRET_ADMIN_NOTE');
    expect(text).not.toMatch(/777/);
    expect(text).toContain(result.tour);
  });

  test('repeating a trigger at the same data revision does not duplicate a version', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
      }[];
      const job = jobs.find((j) => j.status === 'assigned')!;
      const versionsAfter = () =>
        ((store.getTransportOrderDocuments as (i: string) => unknown[])(
          job.id,
        ) as unknown as { version: number }[]).map((d) => d.version);
      const start = versionsAfter();
      // Five retries of the same relevant-change event at one revision.
      for (let i = 0; i < 5; i += 1) {
        (store.updateActiveOrder as (i: string, p: unknown) => unknown)(job.id, {
          // Writing the SAME value produces no diff, so no revision bump.
          driverOffer: (job as unknown as { driverOffer: number }).driverOffer,
        });
      }
      return { start, end: versionsAfter() };
    });

    expect(result.start).toEqual([1]);
    // No-op edits never mint a version.
    expect(result.end).toEqual([1]);
  });

  test('manual regenerate mints a new version and preserves the superseded one', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
      }[];
      const job = jobs.find((j) => j.status === 'assigned')!;
      (store.regeneratePdf as (i: string) => unknown)(job.id);
      (store.regeneratePdf as (i: string) => unknown)(job.id);
      const docs = (store.getTransportOrderDocuments as (i: string) => unknown[])(
        job.id,
      ) as unknown as Record<string, unknown>[];
      return {
        versions: docs.map((d) => d.version),
        active: docs.filter((d) => d.isActive).map((d) => d.version),
        triggers: docs.map((d) => d.trigger),
        storageRefs: docs.map((d) => d.storageRef),
        activeCount: docs.filter((d) => d.isActive).length,
      };
    });

    expect(result.versions).toEqual([1, 2, 3]);
    expect(result.active).toEqual([3]);
    expect(result.activeCount).toBe(1);
    expect(result.triggers).toEqual([
      'direct_assignment',
      'admin_manual',
      'admin_manual',
    ]);
    // Each version has its own storage location: nothing is overwritten.
    expect(new Set(result.storageRefs).size).toBe(3);
  });

  test('missing mandatory data blocks publication and keeps the previous version active', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
        vin: string;
      }[];
      const job = jobs.find((j) => j.status === 'assigned')!;
      const before = (store.getTransportOrderDocuments as (i: string) => unknown[])(
        job.id,
      ) as unknown as { version: number }[];
      job.vin = '';
      const failed = (store.regeneratePdf as (i: string) => unknown)(job.id);
      const after = (store.getTransportOrderDocuments as (i: string) => unknown[])(
        job.id,
      ) as unknown as { version: number; isActive: boolean }[];
      const audit = (store.getAuditLog as () => Record<string, string>[])();
      return {
        failed,
        beforeCount: before.length,
        afterCount: after.length,
        activeVersion: after.filter((d) => d.isActive).map((d) => d.version),
        failureEntry: audit.find((a) => a.action === 'pdf_generation_failed'),
      };
    });

    expect(result.failed).toMatchObject({ ok: false, reason: 'missing_mandatory' });
    expect(result.afterCount).toBe(result.beforeCount);
    // The previously valid document stays the current one.
    expect(result.activeVersion).toEqual([1]);
    // The failure is visible in the audit trail, not swallowed.
    expect(result.failureEntry).toBeTruthy();
    expect(result.failureEntry!.missingFields).toContain('vin');
  });

  test('generation and regeneration are audited with every required identifier', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
        tour: string;
      }[];
      const job = jobs.find((j) => j.status === 'assigned')!;
      (store.regeneratePdf as (i: string) => unknown)(job.id);
      const docs = (store.getTransportOrderDocuments as (i: string) => unknown[])(
        job.id,
      ) as unknown as { id: string; version: number; checksumSha256: string }[];
      const audit = (store.getAuditLog as () => Record<string, string>[])();
      return {
        tour: job.tour,
        jobId: job.id,
        v2: docs[1],
        regenEntry: audit.find(
          (a) => a.action === 'pdf_regenerated' && a.entityId === docs[1].id,
        ),
      };
    });

    const entry = result.regenEntry!;
    expect(entry).toBeTruthy();
    expect(entry.entityType).toBe('transport_order_pdf');
    expect(entry.jobId).toBe(result.jobId);
    expect(entry.tour).toBe(result.tour);
    expect(entry.documentVersion).toBe('v2');
    expect(entry.activeVersion).toBe('v2');
    expect(entry.checksumSha256).toBe(result.v2.checksumSha256);
    expect(entry.trigger).toBe('admin_manual');
    expect(entry.gtcDocument).toBe('AGB-SP@2026-01');
    expect(entry.at).toBeTruthy();
    expect(entry.actor).toBeTruthy();
  });

  test('pdf_viewed and pdf_downloaded record the acting driver and document version', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
      }[];
      const job = jobs.find((j) => j.status === 'accepted')!;
      const driver = (store.getCurrentDriver as () => { id: string; name: string })();
      (store.getTransportOrderPreview as (i: string, o: unknown) => unknown)(job.id, {
        actor: 'driver',
      });
      (store.downloadPdf as (i: string, o: unknown) => unknown)(job.id, {
        actor: 'driver',
      });
      // Repeated access must append, never merge.
      (store.getTransportOrderPreview as (i: string, o: unknown) => unknown)(job.id, {
        actor: 'driver',
      });
      const audit = (store.getAuditLog as () => Record<string, string>[])();
      return {
        driverId: driver.id,
        driverName: driver.name,
        views: audit.filter((a) => a.action === 'pdf_viewed'),
        downloads: audit.filter((a) => a.action === 'pdf_downloaded'),
      };
    });

    expect(result.views).toHaveLength(2);
    expect(result.downloads).toHaveLength(1);
    for (const entry of [...result.views, ...result.downloads]) {
      expect(entry.actor).toBe(result.driverName);
      expect(entry.actorId).toBe(result.driverId);
      expect(entry.entityType).toBe('transport_order_pdf');
      expect(entry.documentVersion).toMatch(/^v\d+$/);
      expect(entry.jobId).toBeTruthy();
    }
    expect(result.views[0].actionType).toBe('viewed');
    expect(result.downloads[0].actionType).toBe('downloaded');
  });

  test('a driver cannot reach another partner’s transport order', async ({ page }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
        driverId: string;
        driver: string;
      }[];
      const job = jobs.find((j) => j.status === 'assigned')!;
      // Hand the order to a different partner, leaving the signed-in driver
      // uninvolved. Access must be refused at the store, not hidden in the UI.
      job.driverId = 'DRV-0301';
      job.driver = 'Klaus Neumann';
      const asDriver = (
        store.getTransportOrderPreview as (i: string, o: unknown) => { ok: boolean; reason: string }
      )(job.id, { actor: 'driver' });
      const download = (
        store.downloadPdf as (i: string, o: unknown) => { ok: boolean; reason: string }
      )(job.id, { actor: 'driver' });
      const auditAfter = (store.getAuditLog as () => Record<string, string>[])().filter(
        (a) => a.action === 'pdf_viewed' || a.action === 'pdf_downloaded',
      ).length;
      // The dispatcher (admin) side is still allowed.
      const asAdmin = (
        store.getTransportOrderPreview as (i: string) => { ok: boolean }
      )(job.id);
      return { asDriver, download, auditAfter, asAdmin: asAdmin.ok };
    });

    expect(result.asDriver).toMatchObject({ ok: false, reason: 'forbidden' });
    expect(result.download).toMatchObject({ ok: false, reason: 'forbidden' });
    // A refused request must not appear in the content-access trail at all.
    expect(result.auditAfter).toBe(0);
    expect(result.asAdmin).toBe(true);
  });

  test('only the active version is exposed through the driver document flow', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
      }[];
      const job = jobs.find((j) => j.status === 'accepted')!;
      (store.regeneratePdf as (i: string) => unknown)(job.id);
      const docs = (store.getTransportOrderDocuments as (i: string) => unknown[])(
        job.id,
      ) as unknown as { id: string; version: number; isActive: boolean }[];
      const preview = (
        store.getTransportOrderPreview as (i: string, o: unknown) => unknown
      )(job.id, { actor: 'driver' }) as unknown as {
        ok: boolean;
        preview: { documentId: string; documentVersion: string };
      };
      return {
        versions: docs.map((d) => d.version),
        activeId: docs.find((d) => d.isActive)!.id,
        supersededId: docs.find((d) => !d.isActive)!.id,
        served: preview.preview,
        // Historical versions remain retrievable on the admin/audit surface.
        historyHtml: (
          store.getTransportOrderDocumentHtml as (i: string) => { ok: boolean }
        )(docs[0].id).ok,
      };
    });

    expect(result.versions).toEqual([1, 2]);
    expect(result.served.documentId).toBe(result.activeId);
    expect(result.served.documentVersion).toBe('v2');
    expect(result.served.documentId).not.toBe(result.supersededId);
    expect(result.historyHtml).toBe(true);
  });

  test('the booking-time partner snapshot survives a later profile edit', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
        driverId: string;
      }[];
      const job = jobs.find((j) => j.status === 'assigned')!;
      const docsOf = () =>
        (store.getTransportOrderDocuments as (i: string) => unknown[])(
          job.id,
        ) as unknown as { version: number; servicePartnerSnapshot: Record<string, string> }[];
      const original = docsOf()[0].servicePartnerSnapshot;

      // Move the partner's registered office AFTER the booking.
      const partner = (store.getDrivers as () => Record<string, string>[])().find(
        (d) =>
          d.id === job.driverId ||
          d.name === (job as unknown as { driver?: string }).driver,
      )!;
      partner.company = 'RENAMED AFTER BOOKING GmbH';
      partner.street = 'Neue Straße';
      partner.city = 'Hamburg';
      partner.postalCode = '20095';

      // Then force a brand-new version.
      (store.regeneratePdf as (i: string) => unknown)(job.id);
      const after = docsOf();
      return {
        original,
        v1: after[0].servicePartnerSnapshot,
        v2: after[1].servicePartnerSnapshot,
      };
    });

    // v1 is untouched...
    expect(result.v1).toEqual(result.original);
    // ...and a NEW version still carries the booking-time snapshot, because the
    // snapshot is frozen at v1 and carried forward, not re-read from today's
    // profile.
    expect(result.v2).toEqual(result.original);
    expect(result.v2.company).not.toBe('RENAMED AFTER BOOKING GmbH');
  });

  test('filename, displayed tour, metadata title and audit entry share one identifier', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
        tour: string;
      }[];
      const job = jobs.find((j) => j.status === 'accepted')!;
      const active = (
        store.getActiveTransportOrderDocument as (i: string) => unknown
      )(job.id) as unknown as {
        fileName: string;
        metaTitle: string;
        tour: string;
        id: string;
      };
      const audit = (store.getAuditLog as () => Record<string, string>[])();
      const dl = (store.downloadPdf as (i: string) => unknown)(job.id) as unknown as {
        fileName: string;
        previewHtml: string;
      };
      return {
        tour: job.tour,
        fileName: active.fileName,
        metaTitle: active.metaTitle,
        docTour: active.tour,
        downloadName: dl.fileName,
        htmlTitle: (dl.previewHtml.match(/<title>([^<]*)<\/title>/) || [])[1],
        auditTour: audit.find((a) => a.action === 'pdf_downloaded')?.tour,
      };
    });

    const tour = result.tour;
    expect(result.fileName).toBe(`Fahrauftrag-${tour}.pdf`);
    expect(result.metaTitle).toBe(`Fahrauftrag ${tour}`);
    expect(result.docTour).toBe(tour);
    expect(result.downloadName).toBe(`Fahrauftrag-${tour}.pdf`);
    expect(result.htmlTitle).toBe(`Fahrauftrag ${tour}`);
    expect(result.auditTour).toBe(tour);
  });

  test('the seeded dataset selects the approved template from the backend vehicle type', async ({
    page,
  }) => {
    const result = await inStore(page, (store) => {
      const jobs = (store.getJobs as () => unknown[])() as unknown as {
        id: string;
        status: string;
        vehicleType: string;
      }[];
      return jobs
        .filter((j) => ['assigned', 'accepted', 'performed'].includes(j.status))
        .map((j) => {
          const active = (
            store.getActiveTransportOrderDocument as (i: string) => unknown
          )(j.id) as unknown as { template: string; title: string } | null;
          return { vt: j.vehicleType, template: active?.template, title: active?.title };
        });
    });

    expect(result.length).toBeGreaterThan(0);
    for (const row of result) {
      if (row.vt === 'passenger_car') {
        expect(row.template).toBe('pkw');
        expect(row.title).toBe('FAHRAUFTRAG PKW');
      } else {
        expect(['truck_up_to_7_5_t', 'truck_over_7_5_t']).toContain(row.vt);
        expect(row.template).toBe('lkw');
        expect(row.title).toBe('FAHRAUFTRAG LKW');
      }
    }
  });
});
