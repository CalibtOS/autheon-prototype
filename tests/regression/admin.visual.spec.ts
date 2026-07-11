import { test, expect } from './support/fixtures/prototype-test.ts';
import { prototypeFrame } from './support/helpers/selectors.ts';
import {
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
 * every screen/popup is deterministic. Seed timestamps are hardcoded strings;
 * no dynamic regions on the admin surface need masking, except the generated
 * credentials in the Account Access dialog.
 */

const NAV = {
  jobs: /^Jobs$/i,
  notifications: /Notification feed|Benachrichtigungs/i,
  masterData: /Profile change requests|Profiländerungen/i,
  users: /^Users$|^Benutzer$/i,
  customers: /^Customers$|^Kunden$/i,
  addresses: /^Addresses$|^Adressen$/i,
  infopoint: /^Infopoint$/i,
  tourDocs: /Tour documents|Tour-Dokumente/i,
  audit: /Audit log|Audit-Log/i,
  settings: /^Settings$|^Einstellungen$/i,
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

  test('job overview screen', async ({ page }) => {
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

  test('notification feed screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.notifications);
    await expect(page).toHaveScreenshot('admin-notifications.png', { fullPage: true });
  });

  test('profile change requests screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.masterData);
    await expect(page).toHaveScreenshot('admin-masterdata-list.png', { fullPage: true });
  });

  test('users screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.users);
    await expect(page).toHaveScreenshot('admin-users.png', { fullPage: true });
  });

  test('customers screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.customers);
    await expect(page).toHaveScreenshot('admin-customers.png', { fullPage: true });
  });

  test('addresses screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.addresses);
    await expect(page).toHaveScreenshot('admin-addresses.png', { fullPage: true });
  });

  test('infopoint screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.infopoint);
    await expect(page).toHaveScreenshot('admin-infopoint.png', { fullPage: true });
  });

  test('tour documents (billing) screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.tourDocs);
    await expect(page).toHaveScreenshot('admin-tour-billing.png', { fullPage: true });
  });

  test('audit log screen', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.audit);
    await expect(page).toHaveScreenshot('admin-audit.png', { fullPage: true });
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
    await openAdminSection(page, NAV.users);
    await prototypeFrame(page)
      .getByRole('button', { name: /New driver|Neuer Fahrer/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-new-driver-modal.png', { fullPage: true });
  });

  test('new admin modal', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.users);
    await prototypeFrame(page)
      .getByRole('button', { name: /New admin|Neuer Admin/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-new-admin-modal.png', { fullPage: true });
  });

  test('account access dialog (generated credentials)', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.users);
    await prototypeFrame(page)
      .getByRole('button', { name: /New driver|Neuer Fahrer/i })
      .click();
    const formDialog = await waitForOpenDialog(page);

    const frame = prototypeFrame(page);
    // The prototype's form labels are not associated with their inputs, so fill
    // by field order: 0 name, 1 company, 2 driver code, 3 phone, 4 email.
    const inputs = formDialog.locator('input');
    await inputs.nth(0).fill('E2E Test Driver');
    await inputs.nth(1).fill('E2E Logistics GmbH');
    await inputs.nth(2).fill('E2E-9001');
    await inputs.nth(4).fill('e2e.driver.9001@example.test');
    await frame.getByRole('button', { name: /^Save$|^Speichern$/i }).click();

    const dialog = await waitForOpenDialog(page);
    await expect(
      frame.getByRole('heading', { name: /Account access|Zugangsdaten/i }),
    ).toBeVisible();
    // The generated login email and the live "Last invite" timestamp are
    // volatile -> mask both so only the stable dialog layout is compared.
    await expect(page).toHaveScreenshot('admin-account-access-dialog.png', {
      fullPage: true,
      mask: [
        dialog.locator('.mono, code, input'),
        dialog.getByText(/Last invite|Letzte Einladung/i),
        frame.getByText(/e2e\.driver\.9001@example\.test/i),
      ],
    });
  });

  test('customer modal', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.customers);
    await prototypeFrame(page)
      .getByRole('button', { name: /Add customer|Kunde anlegen/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-customer-modal.png', { fullPage: true });
  });

  test('address modal', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.addresses);
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

  test('infopoint rename document modal', async ({ page }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, NAV.infopoint);
    await prototypeFrame(page)
      .getByRole('button', { name: /Rename|Umbenennen/i })
      .first()
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('admin-infopoint-rename-modal.png', { fullPage: true });
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

  test('admin toast notification', async ({ page }) => {
    await prepareAdminVisual(page);
    await openJob(page, '0839-26'); // draft
    await prototypeFrame(page)
      .getByRole('button', { name: /Publish to marketplace|Auf Marktplatz/i })
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
