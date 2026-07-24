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
  test('marketplace screen', async ({ page }) => {
    await prepareDriverVisual(page);
    await expect(page).toHaveScreenshot('driver-marketplace.png', {
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

  test('my jobs — special cases tab', async ({ page }) => {
    await prepareDriverVisual(page);
    await openDriverTab(page, TAB.myJobs);
    await prototypeFrame(page)
      .locator('.myjobs-tabs-slider')
      .getByRole('button', { name: /Special|Sonderf/i })
      .click();
    await settleForCapture(page);
    await expect(page).toHaveScreenshot('driver-myjobs-special.png', { fullPage: true });
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
    await prototypeFrame(page)
      .getByRole('button', { name: /Upload document|Dokument \/ Beleg hochladen/i })
      .click();
    await waitForOpenDialog(page);
    await expect(page).toHaveScreenshot('driver-category-modal.png', { fullPage: true });
  });
});
