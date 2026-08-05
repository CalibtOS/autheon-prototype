import type { Locator, Page } from '@playwright/test';
import { test, expect } from './support/fixtures/prototype-test.ts';
import { prototypeFrame } from './support/helpers/selectors.ts';
import {
  openAdminSection,
  prepareAdminVisual,
  prepareDriverVisual,
  settleForCapture,
} from './support/helpers/visual.ts';
import { switchToDriverPWA } from './support/helpers/header-controls.ts';

/**
 * UI coverage for job attachment size limits.
 *
 * `job-attachment-limits.unit.spec.ts` proves the arithmetic in the store.
 * This proves the screens actually read it: what the staged sheet lists, which
 * row carries which mark, when Upload is held back, what survives a refusal,
 * and that a limit saved in the admin console reaches the driver in the same
 * session. No screenshots — every assertion is on text, state or count, so it
 * gates on a fresh clone where the visual baselines do not exist.
 *
 * Limits are seeded through the store where the point of the test is the
 * driver's screen; the one test whose subject IS the admin card drives that
 * card by hand.
 */

const MB = 1024 * 1024;
const TOUR = '0845-26';

function pdf(name: string, bytes: number) {
  const header = Buffer.from(`%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%% ${name}\n`);
  return {
    name,
    mimeType: 'application/pdf',
    buffer:
      bytes <= header.length
        ? header.subarray(0, bytes)
        : Buffer.concat([header, Buffer.alloc(bytes - header.length, 0x20)]),
  };
}

const stagedSheet = (page: Page): Locator =>
  prototypeFrame(page).locator('.sheet').filter({ has: prototypeFrame(page).locator('.staged-upload-list') });

const stagedRows = (page: Page): Locator => prototypeFrame(page).locator('.staged-upload-row');

const usageLine = (page: Page): Locator => prototypeFrame(page).locator('.staged-upload-usage');

const uploadButton = (page: Page): Locator =>
  stagedSheet(page).locator('.sheet-foot .btn.primary, footer .btn.primary').last();

// Driver tour uploads are listed in the My documents tab, not inline in the
// details body — the tab is the only upload site on a tour detail.
const documentRows = (page: Page): Locator =>
  prototypeFrame(page).locator('.mydocs-list .mydoc-row');

async function setLimits(page: Page, maxFileMb: number, maxTotalMb: number): Promise<void> {
  await prototypeFrame(page)
    .locator('body')
    .evaluate(
      (_el, limits) => {
        (window as never as { AuthStore: any }).AuthStore.setDriverUploadLimits(limits);
      },
      { maxFileMb, maxTotalMb },
    );
}

async function openTour(page: Page): Promise<void> {
  await prototypeFrame(page)
    .locator('.tabbar-capsule')
    .getByRole('button', { name: /My Jobs/i })
    .click();
  await settleForCapture(page);
  await prototypeFrame(page)
    .locator('.phone-shell')
    .getByRole('button', { name: new RegExp(`Tour #${TOUR}`) })
    .first()
    .click();
  await settleForCapture(page);
}

/** Uploads live behind the My documents tab on every owned-tour status. */
async function openDocumentsTab(page: Page): Promise<void> {
  await prototypeFrame(page)
    .locator('.detail-tabs-row')
    .getByRole('tab', { name: /My documents/i })
    .click();
  await settleForCapture(page);
}

/** Category chooser, then the batch, straight onto the hidden file input. */
async function stageBatch(
  page: Page,
  category: RegExp,
  files: ReturnType<typeof pdf>[],
): Promise<void> {
  await prototypeFrame(page)
    .getByRole('button', { name: /Upload document/i })
    .click();
  await prototypeFrame(page).getByRole('button', { name: category }).click();
  await prototypeFrame(page)
    .locator('.phone-shell input[type="file"][accept*=".pdf"]')
    .last()
    .setInputFiles(files);
  await expect(stagedSheet(page)).toBeVisible();
}

test.describe('Job attachment size limits (driver + admin surfaces)', () => {
  test('the staged sheet marks the oversized file and holds Upload back until it is gone', async ({
    page,
  }) => {
    await prepareDriverVisual(page);
    await setLimits(page, 10, 100);
    await openTour(page);
    await openDocumentsTab(page);
    await stageBatch(page, /Other proof/i, [
      pdf('delivery-note.pdf', 2 * MB),
      pdf('oversized-scan.pdf', 12 * MB),
      pdf('gate-photo.pdf', 1 * MB),
    ]);

    await expect(stagedRows(page)).toHaveCount(3);
    // The size sits on the row, so the driver can see which file is which.
    await expect(stagedRows(page).nth(0)).toContainText('2.0 MB');
    await expect(stagedRows(page).nth(1)).toContainText('12.0 MB');

    // The mark names the file that causes the problem, not the batch.
    const warned = prototypeFrame(page).locator('.staged-upload-warn');
    await expect(warned).toHaveCount(1);
    await expect(stagedRows(page).nth(1).locator('.staged-upload-warn')).toContainText(
      'max 10 MB per file',
    );
    await expect(uploadButton(page)).toBeDisabled();

    // Removing that one file is the whole remedy.
    await stagedRows(page).nth(1).locator('.staged-upload-remove').click();
    await expect(stagedRows(page)).toHaveCount(2);
    await expect(prototypeFrame(page).locator('.staged-upload-warn')).toHaveCount(0);
    await expect(uploadButton(page)).toBeEnabled();
  });

  test('the remaining figure clamps at zero rather than showing a negative amount', async ({
    page,
  }) => {
    await prepareDriverVisual(page);
    // The seeded ~40 MB accepted document already puts 0845 over a 20 MB area.
    await setLimits(page, 25, 20);
    await openTour(page);
    await openDocumentsTab(page);
    await stageBatch(page, /Other proof/i, [pdf('one-more.pdf', 1 * MB)]);

    await expect(usageLine(page)).toContainText('0.0 MB left');
    await expect(usageLine(page)).not.toContainText('-');
    // Distinct from the per-file message: the tour is the problem, and the
    // remedy named is removal.
    await expect(stagedSheet(page)).toContainText('no room left');
    await expect(prototypeFrame(page).locator('.staged-upload-warn')).toHaveCount(0);
    await expect(uploadButton(page)).toBeDisabled();
  });

  test('a refused file keeps its reason while the rest land, and the action becomes Retry', async ({
    page,
  }) => {
    await prepareDriverVisual(page);
    await setLimits(page, 25, 100);
    await openTour(page);
    await openDocumentsTab(page);
    const before = await documentRows(page).count();

    await stageBatch(page, /Other proof/i, [
      pdf('ok-proof.pdf', 512 * 1024),
      { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a document') },
    ]);
    await expect(stagedRows(page)).toHaveCount(2);
    await uploadButton(page).click();

    // The one the store accepted left the list; the refused one stayed, with
    // the reason attached to its own row.
    await expect(stagedRows(page)).toHaveCount(1);
    await expect(stagedRows(page)).toContainText('notes.txt');
    await expect(prototypeFrame(page).locator('.staged-upload-fail')).toContainText(
      'not accepted',
    );
    await expect(uploadButton(page)).toContainText('Retry');

    // Re-running must never re-send what already succeeded.
    await stagedSheet(page)
      .getByRole('button', { name: /^Cancel$/i })
      .click();
    await settleForCapture(page);
    await expect(documentRows(page)).toHaveCount(before + 1);
  });

  test('a receipt batch walks one amount form per file and resumes after abandoning', async ({
    page,
  }) => {
    await prepareDriverVisual(page);
    await setLimits(page, 25, 100);
    await openTour(page);
    await openDocumentsTab(page);
    const before = await documentRows(page).count();

    await stageBatch(page, /Fuel receipt/i, [
      pdf('fuel-1.pdf', 200 * 1024),
      pdf('fuel-2.pdf', 200 * 1024),
      pdf('fuel-3.pdf', 200 * 1024),
    ]);
    await uploadButton(page).click();

    const walk = prototypeFrame(page).locator('.tour-doc-amount-walk-progress');
    await expect(walk).toHaveText('Receipt 1 of 3');

    await prototypeFrame(page).locator('#mydocs-net').fill('100');
    await prototypeFrame(page).locator('#mydocs-tax').fill('19');
    await prototypeFrame(page).locator('#mydocs-gross').fill('119');
    await prototypeFrame(page).getByRole('button', { name: /Save and upload/i }).click();
    await expect(walk).toHaveText('Receipt 2 of 3');

    // Abandoning keeps what was written and leaves the rest staged, unmarked,
    // so Upload is a resume rather than a restart.
    await prototypeFrame(page)
      .locator('.sheet')
      .filter({ has: walk })
      .getByRole('button', { name: /^Cancel$/i })
      .click();
    await expect(stagedRows(page)).toHaveCount(2);
    await expect(prototypeFrame(page).locator('.staged-upload-fail')).toHaveCount(0);
    await expect(uploadButton(page)).toContainText('Upload');

    await stagedSheet(page)
      .getByRole('button', { name: /^Cancel$/i })
      .click();
    await settleForCapture(page);
    await expect(documentRows(page)).toHaveCount(before + 1);
  });

  test('a limit lowered mid-walk produces a real size refusal on the file it hits', async ({
    page,
  }) => {
    await prepareDriverVisual(page);
    await setLimits(page, 25, 100);
    await openTour(page);
    await openDocumentsTab(page);

    await stageBatch(page, /Fuel receipt/i, [
      pdf('fuel-big.pdf', 8 * MB),
      pdf('fuel-small.pdf', 200 * 1024),
    ]);
    await uploadButton(page).click();
    await expect(prototypeFrame(page).locator('.tour-doc-amount-walk-progress')).toHaveText(
      'Receipt 1 of 2',
    );

    // The staged sheet's pre-check is not on screen during the walk, so this
    // is the one honest route to the store's per-file refusal: an
    // administrator lowers the limit while the driver is mid-batch. Same call
    // the admin card makes on Save.
    await setLimits(page, 5, 100);
    await prototypeFrame(page).locator('#mydocs-net').fill('100');
    await prototypeFrame(page).locator('#mydocs-tax').fill('19');
    await prototypeFrame(page).locator('#mydocs-gross').fill('119');
    await prototypeFrame(page).getByRole('button', { name: /Save and upload/i }).click();

    // The walk ends and hands the driver back to the staged list, because that
    // is the only place the mark and its remedy are visible. The copy is
    // reachable, not decorative.
    await expect(stagedSheet(page)).toBeVisible();
    await expect(prototypeFrame(page).locator('.staged-upload-fail')).toContainText(
      'this file is too large',
    );
    await expect(stagedRows(page).nth(0)).toContainText('fuel-big.pdf');
    // The file that was never attempted stays staged and unmarked.
    await expect(stagedRows(page)).toHaveCount(2);
    await expect(prototypeFrame(page).locator('.staged-upload-fail')).toHaveCount(1);
  });

  test('the admin card blocks a total below the per-file limit and reaches the driver without a reload', async ({
    page,
  }) => {
    await prepareAdminVisual(page);
    await openAdminSection(page, /^Settings$/i);
    await prototypeFrame(page).getByRole('tab', { name: /System settings/i }).click();
    await settleForCapture(page);

    const maxFile = prototypeFrame(page).locator('#upload-limits-max-file');
    const maxTotal = prototypeFrame(page).locator('#upload-limits-max-total');
    const saveButton = prototypeFrame(page).locator(
      '.upload-limits-form button[type="submit"]',
    );

    // The label must never call the total "per tour" — one number governs two
    // areas, and that wording is a client sign-off item.
    const totalLabel = prototypeFrame(page).locator('label[for="upload-limits-max-total"]');
    await expect(totalLabel).toContainText('per upload area');
    await expect(totalLabel).not.toContainText('per tour');

    await maxFile.fill('10');
    await maxTotal.fill('5');
    await expect(prototypeFrame(page).locator('#upload-limits-max-total-error')).toContainText(
      'at least the max. size per file',
    );
    await expect(saveButton).toBeDisabled();

    await maxTotal.fill('100');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await settleForCapture(page);

    // Same session, no reload: the driver's sheet reads the new per-file limit.
    await switchToDriverPWA(page);
    await settleForCapture(page);
    await openTour(page);
    await openDocumentsTab(page);
    await stageBatch(page, /Other proof/i, [pdf('twelve-mb.pdf', 12 * MB)]);
    await expect(prototypeFrame(page).locator('.staged-upload-warn')).toContainText(
      'max 10 MB per file',
    );
    await expect(uploadButton(page)).toBeDisabled();
  });

  test('oversized problem-report evidence locks the slide and says which thing to fix', async ({
    page,
  }) => {
    await prepareDriverVisual(page);
    await setLimits(page, 5, 10);
    await openTour(page);

    await prototypeFrame(page).getByRole('button', { name: /Report problem/i }).click();
    await prototypeFrame(page)
      .locator('.sheet .radio-card')
      .filter({ hasText: /Report empty run/i })
      .click();
    await prototypeFrame(page)
      .locator('.sheet textarea')
      .first()
      .fill(
        'Vehicle not released at the gate, so the run could not be performed as dispatched today.',
      );

    const slide = prototypeFrame(page).locator('.slide-confirm').first();
    // Explanation alone is enough — the slide is unlocked before evidence.
    await expect(slide).not.toHaveClass(/disabled/);

    await prototypeFrame(page)
      .locator('.sheet input[type="file"]')
      .last()
      .setInputFiles([pdf('yard-photo-huge.pdf', 8 * MB)]);

    await expect(prototypeFrame(page).locator('.sheet')).toContainText('Max file size: 5 MB');
    await expect(slide).toHaveClass(/disabled/);
    // The locked copy must name the evidence, not the character minimum the
    // driver has already satisfied.
    await expect(slide).toContainText('Remove the flagged evidence file');
    await expect(slide).not.toContainText('at least 30 characters');
  });
});
