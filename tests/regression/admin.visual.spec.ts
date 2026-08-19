import { test, expect } from './support/fixtures/prototype-test.ts';
import { prototypeFrame } from './support/helpers/selectors.ts';
import {
  openAdminPaneTab,
  openAdminSection,
  prepareAdminVisual,
  settleForCapture,
  waitForOpenDialog,
} from './support/helpers/visual.ts';

/**
 * Visual (pixel) regression baselines for the Admin Backend surface.
 *
 * All snapshots are EN + light on the single desktop viewport (see
 * playwright.config.ts). The in-memory store re-seeds on every page load, so
 * every screen/popup is deterministic in layout — but not every region is
 * deterministic in content, and those regions are masked:
 *
 *   - the Audit-Log's time column, because seeded audit events are dated as
 *     offsets from the current date and therefore render differently every day;
 *   - the live status-history entry appended behind the admin toast.
 */

/**
 * Admin console LEFT-NAV entries.
 *
 * The console groups master data behind two centre panes, so several screens are
 * no longer reachable from the nav directly:
 *
 *   Service Partners -> tab "Service Partners" | tab "Profile change requests"
 *   Customer Center  -> tab "Customers"        | tab "Addresses"
 *
 * Reach the second tab of either pane with `TAB` below.
 */
const NAV = {
  jobs: /^Jobs$|^Aufträge$/i,
  notifications: /Notification feed|Benachrichtigungs/i,
  servicePartners: /Service Partners|Servicepartner/i,
  staff: /^Staff$|^Personal$/i,
  customerCenter: /Customer Center|Kundencenter/i,
  infopoint: /^Infopoint$/i,
  tourDocs: /Tour documents|Tour-Dokumente/i,
  audit: /Audit log|Audit-Log/i,
  settings: /^Settings$|^Einstellungen$/i,
};

/** Tabs inside the two grouping panes above. */
const TAB = {
  servicePartners: /Service Partners|Servicepartner/i,
  changeRequests: /Profile change requests|Profiländerungen/i,
  customers: /^Customers$|^Kunden$/i,
  addresses: /^Addresses$|^Adressen$/i,
};

/** Open a job from the overview table by its tour number. */
async function openJob(page: import('@playwright/test').Page, tour: string) {
  await prototypeFrame(page)
    .locator('tbody tr')
    .filter({ hasText: tour })
    .first()
    .click();
  await expect(
    prototypeFrame(page).getByText(new RegExp(`Tour.*${tour}|${tour}`)).first(),
  ).toBeVisible();
  await settleForCapture(page);
}

test.describe('Admin Backend visual regression @visual-regression', () => {
  // ----- Screens -----

  test('job overview screen @visual-smoke', async ({ page }) => {
    await prepareAdminVisual(page);
    await expect(page).toHaveScreenshot('admin-overview.png', { fullPage: true });
  });

  test('job detail screen (draft)', async ({ page }) => {
    await prepareAdminVisual(page);
    await openJob(page, '0839-26'); // draft
    await expect(page).toHaveScreenshot('admin-job-detail.png', { fullPage: true });
  });

  test('job detail screen (assigned)', async ({ page }) => {
    await prepareAdminVisual(page);
    await openJob(page, '0848-26'); // assigned -> different status panels/actions
    await expect(page).toHaveScreenshot('admin-job-detail-assigned.png', { fullPage: true });
  });

  test('new order form screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await prototypeFrame(page)
      .getByRole('button', { name: /New job|Neuer Auftrag/i })
      .click();
    await settleForCapture(page);
    await expect(page).toHaveScreenshot('admin-new-order.png', { fullPage: true });
  });

  test('edit order form screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openJob(page, '0839-26'); // draft -> editable
    await prototypeFrame(page)
      .getByRole('button', { name: /Edit draft|Entwurf bearbeiten/i })
      .click();
    await settleForCapture(page);
    await expect(page).toHaveScreenshot('admin-edit-order.png', { fullPage: true });
  });

  test('notification feed screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.notifications);
    await expect(page).toHaveScreenshot('admin-notifications.png', { fullPage: true });
  });

  test('profile change requests screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.servicePartners);
    await openAdminPaneTab(page, TAB.changeRequests);
    await expect(page).toHaveScreenshot('admin-masterdata-list.png', { fullPage: true });
  });

  test('drivers screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.servicePartners);
    await expect(page).toHaveScreenshot('admin-drivers.png', { fullPage: true });
  });

  test('staff screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.staff);
    await expect(page).toHaveScreenshot('admin-staff.png', { fullPage: true });
  });

  test('customers screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.customerCenter);
    await expect(page).toHaveScreenshot('admin-customers.png', { fullPage: true });
  });

  test('addresses screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.customerCenter);
    await openAdminPaneTab(page, TAB.addresses);
    await expect(page).toHaveScreenshot('admin-addresses.png', { fullPage: true });
  });

  test('infopoint screen (documents tab)', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.infopoint);
    await expect(page).toHaveScreenshot('admin-infopoint.png', { fullPage: true });
  });

  test('infopoint screen (news tab)', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.infopoint);
    await prototypeFrame(page)
      .getByRole('button', { name: /New messages|Neue Nachrichten/i })
      .click();
    await settleForCapture(page);
    await expect(page).toHaveScreenshot('admin-infopoint-news.png', { fullPage: true });
  });

  test('tour documents (billing) screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.tourDocs);
    await expect(page).toHaveScreenshot('admin-tour-billing.png', { fullPage: true });
  });

  test('audit log screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.audit);
    // Seeded audit events are dated as offsets from the current date, so the
    // time column reads differently every day -> mask it, the same idiom the
    // toast baseline below already uses.
    await expect(page).toHaveScreenshot('admin-audit.png', {
      fullPage: true,
      mask: [prototypeFrame(page).locator('.tbl tbody td.mono')],
    });
  });

  test('settings / features screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.settings);
    await expect(page).toHaveScreenshot('admin-features.png', { fullPage: true });
  });

  // ----- Popups -----

  test('assign driver dialog', async ({ page }) => {
    await prepareAdminVisual(page);
    await openJob(page, '0839-26'); // draft -> can assign
    await prototypeFrame(page)
      .getByRole('button', { name: /Assign driver/i })
      .first()
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-assign-driver-dialog.png', { fullPage: true });
  });

  test('reassign driver dialog', async ({ page }) => {
    await prepareAdminVisual(page);
    await openJob(page, '0848-26'); // assigned -> can reassign
    await prototypeFrame(page)
      .getByRole('button', { name: /Reassign driver/i })
      .first()
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-reassign-driver-dialog.png', { fullPage: true });
  });

  test('new driver modal', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.servicePartners);
    await prototypeFrame(page)
      .getByRole('button', { name: /New service partner|Neuer Servicepartner/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-new-driver-modal.png', { fullPage: true });
  });

  test('new staff modal', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.staff);
    await prototypeFrame(page)
      .getByRole('button', { name: /New staff|Neues Personal/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-new-staff-modal.png', { fullPage: true });
  });

  /**
   * REMOVED: account access dialog (generated credentials).
   *
   * The console no longer generates or shows initial credentials. `admin.jsx`
   * stubs the dialog out entirely (`const AccountAccessDialog = null;`) and the
   * Service Partners pane states the new rule: production sends Keycloak invite
   * emails so service partners set their own password. A newly created partner
   * now starts with account access DISABLED and a "Resend invite" action, and no
   * dialog opens on save.
   *
   * There is therefore nothing to capture. The scenario is marked `deprecated` in
   * tests/regression/visual-coverage.manifest.json rather than deleted, so the
   * retirement stays on the record. Re-adding coverage here needs a product
   * decision about what the invite flow should look like, not a baseline update.
   */
  test('customer modal', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.customerCenter);
    await prototypeFrame(page)
      .getByRole('button', { name: /Add customer|Kunde anlegen/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-customer-modal.png', { fullPage: true });
  });

  test('address modal', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.customerCenter);
    await openAdminPaneTab(page, TAB.addresses);
    await prototypeFrame(page)
      .getByRole('button', { name: /Add address|Adresse hinzufügen/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-address-modal.png', { fullPage: true });
  });

  test('infopoint document modal', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.infopoint);
    await prototypeFrame(page)
      .getByRole('button', { name: /Add document|Dokument hinzufügen/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-infopoint-doc-modal.png', { fullPage: true });
  });

  test('infopoint edit document modal', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.infopoint);
    await prototypeFrame(page)
      .getByRole('button', { name: /^Edit$|^Bearbeiten$/i })
      .first()
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-infopoint-edit-doc-modal.png', { fullPage: true });
  });

  test('infopoint delete document modal', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.infopoint);
    await prototypeFrame(page)
      .getByRole('button', { name: /^Delete$|^Löschen$/i })
      .first()
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-infopoint-delete-doc-modal.png', {
      fullPage: true,
    });
  });

  test('infopoint edit news modal', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.infopoint);
    await prototypeFrame(page)
      .getByRole('button', { name: /New messages|Neue Nachrichten/i })
      .click();
    await settleForCapture(page);
    await prototypeFrame(page)
      .getByRole('button', { name: /^Edit$|^Bearbeiten$/i })
      .first()
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-infopoint-news-modal.png', { fullPage: true });
  });

  test('tour document register dialog', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.tourDocs);
    await prototypeFrame(page)
      .getByRole('button', { name: /Register off-channel document|Dokument außerhalb/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-tour-billing-register-dialog.png', { fullPage: true });
  });

  test('tour document view invoice dialog', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.tourDocs);
    await prototypeFrame(page)
      .getByRole('button', { name: /^View$|^Ansehen$/i })
      .first()
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-tour-billing-view-invoice.png', { fullPage: true });
  });

  test('tour document accept invoice dialog', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.tourDocs);
    // Only invoice-type documents open the accept dialog (others accept
    // instantly), so target the invoice row specifically.
    await prototypeFrame(page)
      .locator('tr')
      .filter({ hasText: 'driver-invoice-0842.pdf' })
      .first()
      .getByRole('button', { name: /^Accept$|^Akzeptieren$/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-tour-billing-accept-invoice.png', { fullPage: true });
  });

  test('admin toast notification', async ({ page }) => {
    await prepareAdminVisual(page);
    await openJob(page, '0839-26'); // draft
    await prototypeFrame(page)
      .getByRole('button', { name: /Publish to marketplace|Auf Marktplatz/i })
      .click();

    // Publishing this seeded draft now trips the driver-offer threshold guard,
    // which asks for confirmation BEFORE the order is published — so the toast
    // never appeared and the test timed out on it. Confirm the amount to reach
    // the toast. Asserted rather than treated as optional: the seed is fixed, so
    // if this dialog stops appearing that is a product change worth failing on.
    await expect(
      prototypeFrame(page).getByText(/Offer above the usual range|Angebot über dem üblichen Bereich/i),
    ).toBeVisible();
    await prototypeFrame(page)
      .getByRole('button', { name: /Accept amount|Betrag bestätigen/i })
      .click();

    const toast = prototypeFrame(page).locator('.toast, [role="status"]').first();
    await expect(toast).toBeVisible();
    // Publishing appends a live-timestamped entry to the status-history card;
    // mask it so only the toast + stable layout are compared.
    await expect(page).toHaveScreenshot('admin-toast.png', {
      fullPage: true,
      mask: [
        prototypeFrame(page)
          .locator('.card')
          .filter({ hasText: /Status history|Statusverlauf/i }),
      ],
    });
  });
});
