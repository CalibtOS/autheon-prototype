import { test, expect } from './support/fixtures/prototype-test.ts';
import { gotoPrototype } from './support/helpers/stable-page.ts';
import { getPrototypeFrame, prototypeFrame } from './support/helpers/selectors.ts';
import { switchLanguage } from './support/helpers/header-controls.ts';
import { openAdminSection, prepareAdminVisual } from './support/helpers/visual.ts';

/**
 * The Audit-Log's ninety-day retention purge.
 *
 * The repository has no JS unit-test runner (no bundler, no Jest/Vitest — the
 * prototype is static React + Babel-standalone over CDN scripts), so this
 * follows the same pattern as `marketplace-filter-count.unit.spec.ts`: the
 * functions under test are exported on the page (`window.AuthStore`) and driven
 * directly in the page context. No rendering, no clicking — a store-level suite
 * that happens to execute in a browser realm.
 *
 * Contract under test:
 *   AuthStore.AUDIT_RETENTION_WINDOW_DAYS -> 90
 *   AuthStore.auditRetentionCutoff(now)   -> now - 90 days
 *   AuthStore.isAuditEventPurgeable(e, c) -> boolean
 *   AuthStore.getAuditRetentionPreview()  -> { cutoffAt, cutoffDisplay, eligibleCount, oldestEventAt }
 *   AuthStore.purgeAuditEvents()          -> { cutoffAt, cutoffDisplay, deletedCount, oldestEventAt }
 *
 * The seeded audit events straddle the window deliberately (ticket 02): three
 * sit 2, 9 and 34 days back and two sit 118 and 172 days back, so every
 * assertion below is falsifiable rather than trivially true — a purge that did
 * nothing and a purge that emptied the log would both fail.
 *
 * The last describe drives the real screen instead of the store. It has to:
 * the claim it proves is that the purge ignores the Audit-Log's date,
 * service-partner and tour filters, and those filters live in the pane, not in
 * the store. Asserting it at store level would be asserting that a function
 * with no parameters has no parameters.
 */

/** Shape the page-context helpers below return. */
type AuditEventRow = { action: string; actor: string; atIso: string };

const RETENTION_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Every audit event currently in the store, newest first. */
async function readAuditLog(
  page: import('@playwright/test').Page,
): Promise<AuditEventRow[]> {
  const frame = await getPrototypeFrame(page);
  return frame.evaluate(() => {
    const store = (window as never as { AuthStore: any }).AuthStore;
    return store.getAuditLog().map((a: AuditEventRow) => ({
      action: a.action,
      actor: a.actor,
      atIso: a.atIso,
    }));
  });
}

/**
 * How many calendar days back an audit event was recorded.
 *
 * Compared midnight to midnight rather than instant to instant: seeded audit
 * events are stamped `daysAgo` days back at a FIXED wall-clock time, so an
 * elapsed-milliseconds division would report 1 or 2 for the same event
 * depending on the hour the suite happens to run at. Rounding absorbs the DST
 * hour.
 */
function daysAgo(atIso: string): number {
  const at = new Date(atIso);
  const now = new Date();
  const midnight = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((midnight(now) - midnight(at)) / MS_PER_DAY);
}

test.describe('AuthStore audit retention (store-level)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPrototype(page);
  });

  test('the retention window is a fixed constant, not an input', async ({ page }) => {
    const frame = await getPrototypeFrame(page);
    const result = await frame.evaluate(() => {
      const store = (window as never as { AuthStore: any }).AuthStore;
      return {
        days: store.AUDIT_RETENTION_WINDOW_DAYS,
        exempt: store.AUDIT_PURGE_EXEMPT_ACTIONS,
        purgeArity: store.purgeAuditEvents.length,
        previewArity: store.getAuditRetentionPreview.length,
      };
    });
    expect(result.days).toBe(RETENTION_DAYS);
    // The exemption is what keeps "was this log ever trimmed?" answerable.
    expect(result.exempt).toEqual(['audit_log_purged']);
    // Neither command accepts anything: no cutoff, no filters, no date range.
    expect(result.purgeArity).toBe(0);
    expect(result.previewArity).toBe(0);
  });

  test('the cutoff is exactly ninety days before the instant it is given', async ({
    page,
  }) => {
    const frame = await getPrototypeFrame(page);
    const result = await frame.evaluate((days) => {
      const store = (window as never as { AuthStore: any }).AuthStore;
      const now = new Date('2026-08-04T12:00:00.000Z');
      const cutoff = store.auditRetentionCutoff(now);
      return {
        cutoff: cutoff.toISOString(),
        deltaDays:
          (now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000) === days,
        // Called with no argument it stamps "now" — the only instant the
        // screen ever supplies, since no caller may choose the cutoff.
        defaultsToNow:
          Math.abs(
            Date.now() -
              days * 24 * 60 * 60 * 1000 -
              store.auditRetentionCutoff().getTime(),
          ) < 5000,
      };
    }, RETENTION_DAYS);
    expect(result.cutoff).toBe('2026-05-06T12:00:00.000Z');
    expect(result.deltaDays).toBe(true);
    expect(result.defaultsToNow).toBe(true);
  });

  test('the boundary rule is strictly older, and unreadable instants survive', async ({
    page,
  }) => {
    const frame = await getPrototypeFrame(page);
    const result = await frame.evaluate(() => {
      const store = (window as never as { AuthStore: any }).AuthStore;
      const cutoff = new Date('2026-05-06T12:00:00.000Z');
      const at = (iso: string) => ({ action: 'job_published', atIso: iso });
      return {
        oneSecondOlder: store.isAuditEventPurgeable(
          at('2026-05-06T11:59:59.000Z'),
          cutoff,
        ),
        exactlyOnTheCutoff: store.isAuditEventPurgeable(
          at('2026-05-06T12:00:00.000Z'),
          cutoff,
        ),
        oneSecondNewer: store.isAuditEventPurgeable(
          at('2026-05-06T12:00:01.000Z'),
          cutoff,
        ),
        unreadable: store.isAuditEventPurgeable(
          { action: 'job_published', atIso: 'not-a-date' },
          cutoff,
        ),
        missing: store.isAuditEventPurgeable({ action: 'job_published' }, cutoff),
        exemptAndAncient: store.isAuditEventPurgeable(
          at('2020-01-01T00:00:00.000Z'),
          cutoff,
        ),
      };
    });
    expect(result.oneSecondOlder).toBe(true);
    // Strictly less-than: an audit event recorded exactly on the cutoff stays.
    expect(result.exactlyOnTheCutoff).toBe(false);
    expect(result.oneSecondNewer).toBe(false);
    // Retention removes what it can prove is old, and proves nothing about an
    // instant it cannot read.
    expect(result.unreadable).toBe(false);
    expect(result.missing).toBe(false);
    expect(result.exemptAndAncient).toBe(true);
  });

  test('the seeded log straddles the window, so a purge always has both sides', async ({
    page,
  }) => {
    const seeded = await readAuditLog(page);
    const ages = seeded.map((a) => daysAgo(a.atIso)).sort((a, b) => a - b);
    expect(ages).toEqual([2, 9, 34, 118, 172]);
    expect(ages.filter((d) => d < RETENTION_DAYS)).toHaveLength(3);
    expect(ages.filter((d) => d > RETENTION_DAYS)).toHaveLength(2);
  });

  test('the preview counts exactly what the purge then removes', async ({ page }) => {
    const frame = await getPrototypeFrame(page);
    const result = await frame.evaluate(() => {
      const store = (window as never as { AuthStore: any }).AuthStore;
      const before = store.getAuditLog().length;
      const preview = store.getAuditRetentionPreview();
      const purge = store.purgeAuditEvents();
      return {
        before,
        preview,
        purge,
        // The purge event it just recorded is the +1.
        after: store.getAuditLog().length,
      };
    });

    expect(result.before).toBe(5);
    expect(result.preview.eligibleCount).toBe(2);
    expect(result.purge.deletedCount).toBe(result.preview.eligibleCount);
    expect(result.after).toBe(result.before - 2 + 1);
    // The dialog's cutoff and the applied cutoff are the same instant, give or
    // take the seconds between opening the dialog and confirming it.
    expect(
      Math.abs(
        new Date(result.purge.cutoffAt).getTime() -
          new Date(result.preview.cutoffAt).getTime(),
      ),
    ).toBeLessThan(5000);
    expect(result.purge.cutoffDisplay).toMatch(
      /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}$/,
    );
  });

  test('the purge removes the two events outside the window and leaves the three inside', async ({
    page,
  }) => {
    const frame = await getPrototypeFrame(page);
    await frame.evaluate(() => {
      (window as never as { AuthStore: any }).AuthStore.purgeAuditEvents();
    });

    const remaining = await readAuditLog(page);
    // 118 and 172 days old -> gone. 2, 9 and 34 days old -> still standing.
    // That contrast is the whole point of demonstrating retention at all.
    expect(
      remaining
        .filter((a) => a.action !== 'audit_log_purged')
        .map((a) => daysAgo(a.atIso))
        .sort((a, b) => a - b),
    ).toEqual([2, 9, 34]);
    expect(remaining.map((a) => a.action)).not.toContain('empty_run_reported');
    expect(remaining.map((a) => a.action)).not.toContain(
      'tour_document_uploaded',
    );
  });

  test('the purge records itself, attributed to the demo admin, at the top of the log', async ({
    page,
  }) => {
    const frame = await getPrototypeFrame(page);
    const recorded = await frame.evaluate(() => {
      const store = (window as never as { AuthStore: any }).AuthStore;
      const result = store.purgeAuditEvents();
      const top = store.getAuditLog()[0];
      return { result, top };
    });

    expect(recorded.top.action).toBe('audit_log_purged');
    expect(recorded.top.actor).toBe('Anna Bauer');
    // The three facts an auditor needs to reconstruct the trim: where the
    // boundary fell, how much went, and what coverage the log still offers.
    expect(recorded.top.cutoffAt).toBe(recorded.result.cutoffAt);
    expect(recorded.top.deletedCount).toBe(2);
    expect(recorded.top.oldestEventAt).toBe(recorded.result.oldestEventAt);
    // Read after the delete and before the record: the oldest SURVIVING event,
    // not the record of this purge.
    expect(daysAgo(recorded.top.oldestEventAt)).toBe(34);
  });

  test('a recorded purge survives a later purge, however old it is', async ({
    page,
  }) => {
    const frame = await getPrototypeFrame(page);
    const result = await frame.evaluate(() => {
      const store = (window as never as { AuthStore: any }).AuthStore;
      const ancient = new Date(
        Date.now() - 200 * 24 * 60 * 60 * 1000,
      ).toISOString();
      // Two audit events of the SAME age, so age cannot separate them — only
      // the action can. Without the exemption, both go.
      store.getAuditLog().unshift(
        { action: 'audit_log_purged', actor: 'Anna Bauer', entity: 'Audit log', at: ancient, atIso: ancient },
        { action: 'audit_log_exported', actor: 'Anna Bauer', entity: 'CSV', at: ancient, atIso: ancient },
      );
      const purge = store.purgeAuditEvents();
      const actions = store.getAuditLog().map((a: { action: string }) => a.action);
      return {
        deletedCount: purge.deletedCount,
        ancientPurgeSurvived: store
          .getAuditLog()
          .some(
            (a: { action: string; atIso: string }) =>
              a.action === 'audit_log_purged' && a.atIso === ancient,
          ),
        ordinaryOfSameAgeSurvived: actions.includes('audit_log_exported'),
      };
    });

    // The two seeded outliers plus the ordinary same-age event — three, not
    // four: the ancient purge event was never eligible.
    expect(result.deletedCount).toBe(3);
    expect(result.ancientPurgeSurvived).toBe(true);
    expect(result.ordinaryOfSameAgeSurvived).toBe(false);
  });

  test('a purge with nothing eligible succeeds and reports zero', async ({ page }) => {
    const frame = await getPrototypeFrame(page);
    const result = await frame.evaluate(() => {
      const store = (window as never as { AuthStore: any }).AuthStore;
      store.purgeAuditEvents(); // first purge clears everything eligible
      const preview = store.getAuditRetentionPreview();
      const second = store.purgeAuditEvents();
      return { preview, second, remaining: store.getAuditLog().length };
    });

    expect(result.preview.eligibleCount).toBe(0);
    expect(result.second.deletedCount).toBe(0);
    // Nothing eligible is not a failure: it removes nothing and still records
    // that an admin trimmed the log. 3 survivors + 2 purge events.
    expect(result.remaining).toBe(5);
  });
});

test.describe('Audit-Log retention control (screen)', () => {
  /**
   * The purge ignores the screen's filters. Asserted here rather than assumed,
   * because the natural-looking mistake — copying the export's filter-aware
   * semantics onto a destructive action — would be invisible at store level.
   */
  test('an admin with filters applied removes the same set as one without', async ({
    page,
  }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, /Audit log|Audit-Log/i);
    const frame = prototypeFrame(page);

    // What a purge that ignores the filters must leave behind, decided by age
    // alone and read BEFORE any filter is touched.
    const before = await readAuditLog(page);
    const expectedSurvivors = before.filter(
      (a) => daysAgo(a.atIso) < RETENTION_DAYS,
    );
    expect(before.length - expectedSurvivors.length).toBe(2);

    // Narrow the log hard: a service partner who authored exactly one event,
    // which is INSIDE the window and would therefore survive any purge. A
    // filter-scoped purge would remove nothing at all here.
    await frame.locator('#audit-filter-driver').selectOption('Jordan Blake');
    await frame.locator('#audit-filter-tour').fill('0845-26');
    await expect(frame.locator('.tbl tbody tr')).toHaveCount(1);

    await frame
      .getByRole('button', { name: /Delete audit events older than 90 days/i })
      .click();
    await expect(
      frame.getByRole('alertdialog').getByText(/2 audit events were recorded/i),
    ).toBeVisible();
    await frame.getByRole('button', { name: /^Delete permanently$/ }).click();

    const surviving = await readAuditLog(page);
    // Exactly the age band went, and nothing the filters were pointing at:
    // an admin with filters applied removes the same set as one without.
    expect(surviving[0].action).toBe('audit_log_purged');
    expect(surviving.slice(1)).toEqual(expectedSurvivors);

    // The filters are still applied afterwards — housekeeping does not cost
    // the admin the investigation they were in the middle of.
    await expect(frame.locator('#audit-filter-driver')).toHaveValue(
      'Jordan Blake',
    );
    await expect(frame.locator('#audit-filter-tour')).toHaveValue('0845-26');
  });

  test('dismissing the confirmation leaves the log untouched', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, /Audit log|Audit-Log/i);
    const frame = prototypeFrame(page);
    const before = await readAuditLog(page);

    await frame
      .getByRole('button', { name: /Delete audit events older than 90 days/i })
      .click();
    const dialog = frame.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    // Opening it to read the count has to be safe.
    await expect(
      dialog.getByText(/This cannot be undone\. Export the audit log first/i),
    ).toBeVisible();
    await dialog.getByRole('button', { name: /^Cancel$/ }).click();
    await expect(dialog).toBeHidden();

    expect(await readAuditLog(page)).toEqual(before);
  });

  test('the retention copy resolves in German', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, /Audit log|Audit-Log/i);
    await switchLanguage(page, 'DE');
    const frame = prototypeFrame(page);

    await frame
      .getByRole('button', { name: /Audit-Ereignisse älter als 90 Tage löschen/ })
      .click();
    const dialog = frame.getByRole('alertdialog');
    await expect(
      dialog.getByText(/2 Audit-Ereignisse wurden vor dem .* aufgezeichnet/),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Dies kann nicht rückgängig gemacht werden/),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: /^Endgültig löschen$/ }),
    ).toBeVisible();
  });
});
