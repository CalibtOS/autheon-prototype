import { test, expect } from './support/fixtures/prototype-test.ts';
import { prototypeFrame } from './support/helpers/selectors.ts';
import {
  openDriverTab,
  prepareDriverVisual,
  settleForCapture,
  waitForOpenDialog,
} from './support/helpers/visual.ts';

/**
 * Visual (pixel) regression baselines for the Driver PWA surface.
 *
 * All snapshots are captured EN + light on the single desktop viewport
 * configured in playwright.config.ts. The prototype store is in-memory and
 * re-seeded on every page load, so state is deterministic per test.
 *
 * The only live/dynamic region in the app is the marketplace header date
 * label (`new Date()`), which is masked below.
 */

const TAB = {
  marketplace: /Marketplace|Marktplatz/i,
  myJobs: /My jobs|Meine Aufträge|Meine Jobs/i,
  info: /Infopoint/i,
  profile: /Profile|Profil/i,
};

/** Header label carries the live date -> mask it everywhere on the marketplace. */
function marketplaceDateMask(page: import('@playwright/test').Page) {
  return [prototypeFrame(page).getByText(/open tours|offene Touren/i)];
}

/** Open the first published tour card from the marketplace. */
async function openMarketplaceJob(page: import('@playwright/test').Page) {
  const card = prototypeFrame(page).locator('.jobcard-btn').first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(
    prototypeFrame(page).getByRole('heading', {
      name: /Marketplace preview|Marktplatz-Vorschau/i,
    }),
  ).toBeVisible();
  await settleForCapture(page);
}

/** Open the first accepted/active tour from the My jobs list (execution detail). */
async function openMyJobsExecution(page: import('@playwright/test').Page) {
  await openDriverTab(page, TAB.myJobs);
  const card = prototypeFrame(page).locator('.jobcard-btn').first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(prototypeFrame(page).locator('.detail-header-title')).toBeVisible();
  await settleForCapture(page);
}

test.describe('Driver PWA visual regression @visual-regression', () => {
  test('marketplace screen @visual-smoke', async ({ page }) => {
    await prepareDriverVisual(page);
    await expect(page).toHaveScreenshot('driver-marketplace.png', {
      fullPage: true,
      mask: marketplaceDateMask(page),
    });
  });

  /**
   * Applied-filter count badge on the closed filter control. One filter and
   * three filters are captured because the badge, the button's applied state
   * and the chip row all change together.
   */
  async function applyMarketplaceFilters(
    page: import('@playwright/test').Page,
    apply: (panel: import('@playwright/test').Locator) => Promise<void>,
  ) {
    await prototypeFrame(page).locator('.header-filter-btn').click();
    const panel = prototypeFrame(page).locator('.sheet');
    await expect(panel).toBeVisible();
    await apply(panel);
    await panel.locator('.sheet-foot .btn.primary').click();
    await expect(panel).toHaveCount(0);
    await settleForCapture(page);
  }

  /**
   * Commit a postal-area filter.
   *
   * The PLZ fields are chip inputs, not plain text inputs: typing sets a draft,
   * and the two-digit prefix only becomes an applied filter once it is added.
   * `fill()` alone therefore leaves the applied count at 0 and the badge absent,
   * because `Badge` renders nothing for a count of 0. Targeted by the stable
   * element id rather than `.input` position, so adding another field to the
   * sheet cannot silently repoint this at the wrong control.
   */
  async function addPostalArea(
    panel: import('@playwright/test').Locator,
    field: 'pickup' | 'delivery',
    prefix: string,
  ) {
    const input = panel.locator(`#filter-${field}-plz`);
    await input.fill(prefix);
    await input.press('Enter');
    await expect(panel.locator('.filter-plz-pill').filter({ hasText: prefix })).toBeVisible();
  }

  test('marketplace — one applied filter (badge = 1)', async ({ page }) => {
    await prepareDriverVisual(page);
    await applyMarketplaceFilters(page, async (panel) => {
      await addPostalArea(panel, 'pickup', '80');
    });
    await expect(
      prototypeFrame(page).locator('.header-filter-btn .header-btn-badge'),
    ).toHaveText('1');
    await expect(page).toHaveScreenshot('driver-marketplace-filter-1.png', {
      fullPage: true,
      mask: marketplaceDateMask(page),
    });
  });

  test('marketplace — multiple applied filters (badge = 3)', async ({ page }) => {
    await prepareDriverVisual(page);
    await applyMarketplaceFilters(page, async (panel) => {
      await addPostalArea(panel, 'pickup', '80');
      await addPostalArea(panel, 'delivery', '10');
      await panel.locator('.chip-btn').filter({ hasText: 'Passenger car' }).first().click();
    });
    await expect(
      prototypeFrame(page).locator('.header-filter-btn .header-btn-badge'),
    ).toHaveText('3');
    await expect(page).toHaveScreenshot('driver-marketplace-filter-3.png', {
      fullPage: true,
      mask: marketplaceDateMask(page),
    });
  });

  test('marketplace locked job detail', async ({ page }) => {
    await prepareDriverVisual(page);
    await openMarketplaceJob(page);
    await expect(page).toHaveScreenshot('driver-job-locked.png', { fullPage: true });
  });

  test('my jobs — active tab', async ({ page }) => {
    await prepareDriverVisual(page);
    await openDriverTab(page, TAB.myJobs);
    await expect(page).toHaveScreenshot('driver-myjobs-active.png', { fullPage: true });
  });

  test('my jobs — performed tab', async ({ page }) => {
    await prepareDriverVisual(page);
    await openDriverTab(page, TAB.myJobs);
    await prototypeFrame(page)
      .locator('.myjobs-tabs-slider')
      .getByRole('button', { name: /Performed|Durchgeführt/i })
      .click();
    await settleForCapture(page);
    await expect(page).toHaveScreenshot('driver-myjobs-performed.png', { fullPage: true });
  });

  test('my jobs — cancelled tab', async ({ page }) => {
    await prepareDriverVisual(page);
    await openDriverTab(page, TAB.myJobs);
    await prototypeFrame(page)
      .locator('.myjobs-tabs-slider')
      .getByRole('button', { name: /Cancelled|Storniert/i })
      .click();
    await settleForCapture(page);
    await expect(page).toHaveScreenshot('driver-myjobs-cancelled.png', { fullPage: true });
  });

  // Was "special cases" until the legacy special-case model was removed (PRD
  // v2.6); the 4th tab is now the empty-run review tab.
  test('my jobs — empty run tab', async ({ page }) => {
    await prepareDriverVisual(page);
    await openDriverTab(page, TAB.myJobs);
    await prototypeFrame(page)
      .locator('.myjobs-tabs-slider')
      .getByRole('button', { name: /Empty run|Leerfahrt/i })
      .click();
    await settleForCapture(page);
    await expect(page).toHaveScreenshot('driver-myjobs-empty-run.png', { fullPage: true });
  });

  test('job execution detail (unlocked)', async ({ page }) => {
    await prepareDriverVisual(page);
    await openMyJobsExecution(page);
    await expect(page).toHaveScreenshot('driver-job-unlocked.png', { fullPage: true });
  });

  test('infopoint screen', async ({ page }) => {
    await prepareDriverVisual(page);
    await openDriverTab(page, TAB.info);
    await expect(page).toHaveScreenshot('driver-infopoint.png', { fullPage: true });
  });

  test('profile screen', async ({ page }) => {
    await prepareDriverVisual(page);
    await openDriverTab(page, TAB.profile);
    await expect(page).toHaveScreenshot('driver-profile.png', { fullPage: true });
  });

  test('notifications screen', async ({ page }) => {
    await prepareDriverVisual(page);
    await prototypeFrame(page)
      .getByRole('button', { name: /Notifications|Benachrichtigungen/i })
      .first()
      .click();
    await settleForCapture(page);
    await expect(page).toHaveScreenshot('driver-notifications.png', { fullPage: true });
  });

  test('filter sheet popup', async ({ page }) => {
    await prepareDriverVisual(page);
    await prototypeFrame(page)
      .getByRole('button', { name: /^Filters?$|^Filter$/i })
      .first()
      .click();
    await waitForOpenDialog(page);
    await expect(
      prototypeFrame(page).getByRole('heading', { name: /^Filters?$|^Filter$/i }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot('driver-filter-sheet.png', { fullPage: true });
  });

  test('acceptance modal popup', async ({ page }) => {
    await prepareDriverVisual(page);
    await openMarketplaceJob(page);
    await prototypeFrame(page)
      .getByRole('button', { name: /Accept tour|Tour annehmen/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('driver-acceptance-modal.png', { fullPage: true });
  });

  test('report problem sheet popup', async ({ page }) => {
    await prepareDriverVisual(page);
    await openMyJobsExecution(page);
    await prototypeFrame(page)
      .getByRole('button', { name: /Report problem|Problem melden/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('driver-report-problem-sheet.png', { fullPage: true });
  });

  test.skip('daily limit request sheet popup', async ({ page }) => {
    // Legacy daily-limit request UI was replaced by the probation progress
    // card. Keep this baseline out of CI until an approved replacement flow is
    // added instead of letting a dead selector fail as an execution error.
    await prepareDriverVisual(page);
    await openDriverTab(page, TAB.profile);
    await prototypeFrame(page)
      .getByRole('button', { name: /Request higher limit|Höheres Limit anfragen/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('driver-daily-limit-sheet.png', { fullPage: true });
  });

  test('upload document category modal popup', async ({ page }) => {
    await prepareDriverVisual(page);
    await openMyJobsExecution(page);

    // Tour-document upload moved out of the job-detail body into the execution
    // screen's "My documents" tab, behind a fixed bottom upload bar. The old
    // in-body control (`JobTourDocuments`) is still defined in driver.jsx but is
    // no longer rendered anywhere, so looking for it found nothing.
    await prototypeFrame(page)
      .getByRole('tab', { name: /My documents|Meine Dokumente/i })
      .click();
    await settleForCapture(page);

    await prototypeFrame(page)
      .locator('.mydocs-upload-bar')
      .getByRole('button', { name: /Upload document|Dokument hochladen/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('driver-category-modal.png', { fullPage: true });
  });
});
