/**
 * One-shot client-walkthrough capture for job attachment size limits.
 * Run from autheon-prototype with the dev server on :4173:
 *   node docs/requirements/job-attachment-size-limits-walkthrough/_capture.mjs
 *
 * Writes PNGs next to this script. Not part of the Playwright test suite.
 */
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const MB = 1024 * 1024;
const FRAME = 'iframe[title="AUTHEON Prototype"]';

mkdirSync(OUT, { recursive: true });

function pdfBuffer(bytes, name) {
  // Minimal PDF header so mime sniffing is happy; pad to exact size.
  const header = Buffer.from(
    `%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%% ${name}\n`,
  );
  if (bytes <= header.length) return header.subarray(0, bytes);
  return Buffer.concat([header, Buffer.alloc(bytes - header.length, 0x20)]);
}

function filePayload(name, bytes, mime = 'application/pdf') {
  return {
    name,
    mimeType: mime,
    buffer: mime.startsWith('image/')
      ? Buffer.concat([
          Buffer.from([0xff, 0xd8, 0xff, 0xd9]), // minimal JPEG SOI/EOI
          Buffer.alloc(Math.max(0, bytes - 4), 0x00),
        ])
      : pdfBuffer(bytes, name),
  };
}

async function getFrame(page) {
  const iframe = page.locator(FRAME);
  await iframe.waitFor({ state: 'visible' });
  const handle = await iframe.elementHandle();
  const frame = await handle.contentFrame();
  if (!frame) throw new Error('prototype frame missing');
  return frame;
}

async function loginBoth(frame) {
  await frame.evaluate(() => {
    const store = window.AuthStore;
    if (!store.isDriverAuthenticated()) {
      store.loginDriver({
        email: 'driver.one@demo.local',
        password: 'password',
      });
    }
    if (!store.isAdminAuthenticated()) {
      store.loginAdmin({
        email: 'demo.admin@demo.local',
        password: 'password',
      });
    }
  });
}

async function switchSurface(page, which) {
  const frame = await getFrame(page);
  const label =
    which === 'admin' ? /Admin Backend/i : /Driver\s*PWA|Fahrer App/i;
  await frame.getByRole('banner').getByRole('button', { name: label }).click();
  await page.waitForTimeout(400);
}

async function switchLang(page, lang) {
  const frame = await getFrame(page);
  await frame
    .getByRole('banner')
    .locator('.locale-switch')
    .getByRole('button', { name: lang })
    .click();
  await page.waitForTimeout(300);
}

async function shot(page, name, locator) {
  const target = locator || page.locator(FRAME);
  await target.screenshot({
    path: path.join(OUT, `${name}.png`),
    animations: 'disabled',
  });
  console.log('wrote', name + '.png');
}

async function openAdminUploadLimits(page) {
  await switchSurface(page, 'admin');
  const frame = await getFrame(page);
  await frame
    .locator('.admin-nav')
    .getByRole('button', { name: /^Settings$|^Einstellungen$/i })
    .click();
  await page.waitForTimeout(300);
  await frame
    .getByRole('tab', { name: /System settings|Systemeinstellungen/i })
    .click();
  await page.waitForTimeout(300);
  const card = frame.locator('section.card', {
    has: frame.getByRole('heading', {
      name: /Driver upload limits|Upload-Limits für Fahrer|Fahrer-Upload/i,
    }),
  });
  await card.scrollIntoViewIfNeeded();
  return card;
}

async function openDriverJob(page, tourNum, { bucket } = { bucket: 'active' }) {
  await switchSurface(page, 'driver');
  const frame = await getFrame(page);
  await frame
    .locator('.tabbar-capsule')
    .getByRole('button', { name: /My Jobs|Meine Aufträge/i })
    .click();
  await page.waitForTimeout(300);
  if (bucket === 'performed') {
    await frame
      .getByRole('button', { name: /Performed|Durchgeführt/i })
      .click();
    await page.waitForTimeout(200);
  }
  await frame
    .locator('.phone-shell')
    .getByRole('button', { name: new RegExp(`Tour #${tourNum}`) })
    .first()
    .click();
  await page.waitForTimeout(500);
}

async function startStagedBatch(page, categoryName) {
  const frame = await getFrame(page);
  await frame
    .getByRole('button', { name: /Upload document|Dokument \/ Beleg hochladen/i })
    .click();
  await page.waitForTimeout(200);
  await frame.getByRole('button', { name: categoryName }).click();
  await page.waitForTimeout(200);
}

async function setStagedFiles(page, files) {
  const frame = await getFrame(page);
  const chooseFile = frame.getByRole('button', {
    name: /Choose file|Datei wählen/i,
  });
  if (await chooseFile.isVisible().catch(() => false)) {
    // Choose file closes the source sheet, then opens the native picker.
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
    await chooseFile.click();
    const chooser = await chooserPromise;
    await chooser.setFiles(files);
  } else {
    const input = frame
      .locator('.phone-shell input[type="file"][accept*=".pdf"]')
      .last();
    await input.setInputFiles(files);
  }
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  let frame = await getFrame(page);
  await frame.locator('#root .app').waitFor({ state: 'visible' });
  await loginBoth(frame);
  await switchLang(page, 'EN');
  await frame
    .getByRole('banner')
    .locator('.theme-switch')
    .getByRole('button', { name: /Light|Hell/i })
    .click();

  // ── 1. Admin upload limits card ─────────────────────────────────────
  let card = await openAdminUploadLimits(page);
  await shot(page, '01-admin-upload-limits-card', card);

  frame = await getFrame(page);
  await frame.locator('#upload-limits-max-file').fill('10');
  await frame.locator('#upload-limits-max-total').fill('5');
  await page.waitForTimeout(200);
  await shot(page, '01b-admin-cross-field-error', card);

  // DE spot-check of the same error
  await switchLang(page, 'DE');
  card = await openAdminUploadLimits(page);
  await frame.locator('#upload-limits-max-file').fill('10');
  await frame.locator('#upload-limits-max-total').fill('5');
  await page.waitForTimeout(200);
  await shot(page, '01b-de-admin-cross-field-error', card);
  await switchLang(page, 'EN');

  card = await openAdminUploadLimits(page);
  await frame.locator('#upload-limits-max-file').fill('10');
  await frame.locator('#upload-limits-max-total').fill('20');
  await page.waitForTimeout(200);
  await frame
    .locator('.upload-limits-form')
    .getByRole('button', { name: /Save upload limits|Upload-Limits speichern/i })
    .click();
  await page.waitForTimeout(400);
  await shot(page, '01c-admin-limits-saved', card);

  // Restore demo-friendly limits for driver walk (25/50) then tune per step.
  frame = await getFrame(page);
  await frame.evaluate(() => {
    window.AuthStore.setDriverUploadLimits({ maxFileMb: 10, maxTotalMb: 50 });
  });

  // ── 2. Mixed batch with oversized file ──────────────────────────────
  // Tour 0843 is accepted with little/no seed docs — room for a mixed batch.
  // Prefer 0845 for nearly-full later; use 0843 here if it exists for the driver.
  await openDriverJob(page, '0845-26');
  frame = await getFrame(page);
  // Give 0845 headroom for the mixed-batch demo by temporarily raising total
  // and removing nothing — instead bump total to 100 via store so used~40 leaves room.
  await frame.evaluate(() => {
    window.AuthStore.setDriverUploadLimits({ maxFileMb: 10, maxTotalMb: 100 });
  });
  await startStagedBatch(page, /Other proof|Sonstiger Nachweis/i);
  await setStagedFiles(page, [
    filePayload('delivery-note.pdf', 2 * MB),
    filePayload('oversized-scan.pdf', 12 * MB),
    filePayload('gate-photo.jpg', 1 * MB, 'image/jpeg'),
  ]);
  frame = await getFrame(page);
  const staged = frame.locator('.staged-upload-sheet, .sheet.staged-upload-sheet, [class*="staged"]').first();
  // Sheet uses class staged-upload-sheet on Sheet root — fall back to dialog
  const sheet = frame.locator('.sheet').filter({ hasText: /Check your selection|Auswahl prüfen/i });
  await sheet.waitFor({ state: 'visible' });
  await shot(page, '02-driver-mixed-batch-oversized', sheet);

  // DE spot-check
  await switchLang(page, 'DE');
  await page.waitForTimeout(300);
  await shot(page, '02-de-driver-mixed-batch-oversized', sheet);
  await switchLang(page, 'EN');
  await page.waitForTimeout(200);

  // ── 3. Remove oversized → upload enabled ────────────────────────────
  frame = await getFrame(page);
  await frame
    .getByRole('button', { name: /Remove oversized-scan\.pdf|oversized-scan\.pdf.*entfernen|Remove oversized/i })
    .click();
  await page.waitForTimeout(300);
  await shot(page, '03-driver-after-remove-upload-enabled', sheet);

  // Cancel out of this batch
  await frame
    .locator('.sheet')
    .filter({ hasText: /Check your selection|Auswahl prüfen/i })
    .getByRole('button', { name: /^Cancel$|^Abbrechen$/i })
    .click();
  await page.waitForTimeout(300);

  // ── 4. Mid-batch refusal (one stays with reason, retry) ─────────────
  // Stage a good PDF + an unsupported .txt. Client does not type-check the
  // selection; the store refuses the .txt after the PDF lands.
  await startStagedBatch(page, /Other proof|Sonstiger Nachweis/i);
  await setStagedFiles(page, [
    filePayload('ok-proof.pdf', 0.5 * MB),
    {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a document the store accepts'),
    },
  ]);
  frame = await getFrame(page);
  const sheet4 = frame.locator('.sheet').filter({ hasText: /Check your selection|Auswahl prüfen/i });
  await sheet4.waitFor({ state: 'visible' });
  await frame.getByRole('button', { name: /^Upload$|^Hochladen$/i }).click();
  await page.waitForTimeout(600);
  await shot(page, '04-driver-partial-refusal-retry', sheet4);

  await frame
    .locator('.sheet')
    .filter({ hasText: /Check your selection|Auswahl prüfen|Retry these files|Diese Dateien erneut/i })
    .getByRole('button', { name: /^Cancel$|^Abbrechen$/i })
    .click();
  await page.waitForTimeout(200);

  // ── 5. Nearly-full tour: zero remaining + exhausted refusal ─────────
  frame = await getFrame(page);
  // Restore defaults then set total at/under seed usage so remaining is 0.
  await frame.evaluate(() => {
    window.AuthStore.setDriverUploadLimits({ maxFileMb: 25, maxTotalMb: 50 });
    const jobId = 'A-2026-00845';
    const used = window.AuthStore.tourDocumentsUsageBytes(jobId);
    const totalMb = Math.max(1, Math.floor(used / (1024 * 1024)));
    // Cap total at current used MB so remaining clamps to 0.
    window.AuthStore.setDriverUploadLimits({
      maxFileMb: 25,
      maxTotalMb: totalMb,
    });
    return {
      used,
      remaining: window.AuthStore.tourDocumentsRemainingBytes(jobId),
      limits: window.AuthStore.getDriverUploadLimits(),
    };
  });
  // Back out and re-open so usage figure refreshes cleanly
  const back = frame.locator('.phone-shell').getByRole('button', { name: /Back|Zurück/i }).first();
  if (await back.count()) {
    await back.click();
    await page.waitForTimeout(300);
  }
  await openDriverJob(page, '0845-26');
  await startStagedBatch(page, /Other proof|Sonstiger Nachweis/i);
  await setStagedFiles(page, [filePayload('one-more.pdf', 1 * MB)]);
  frame = await getFrame(page);
  const sheet5 = frame.locator('.sheet').filter({ hasText: /Check your selection|Auswahl prüfen/i });
  await sheet5.waitFor({ state: 'visible' });
  await shot(page, '05-driver-exhausted-allowance', sheet5);

  await frame
    .locator('.sheet')
    .filter({ hasText: /Check your selection|Auswahl prüfen/i })
    .getByRole('button', { name: /^Cancel$|^Abbrechen$/i })
    .click();
  await page.waitForTimeout(200);

  // ── 6. Amount walk across a batch of receipts ───────────────────────
  frame = await getFrame(page);
  await frame.evaluate(() => {
    window.AuthStore.setDriverUploadLimits({ maxFileMb: 25, maxTotalMb: 50 });
  });
  // Accepted tour 0845 exposes the tour-documents card (performed tours move
  // uploads to the My documents tab). Same TourDocumentUploadFlow either way.
  const back2 = frame.locator('.phone-shell').getByRole('button', { name: /Back|Zurück/i }).first();
  if (await back2.count()) await back2.click();
  await page.waitForTimeout(300);
  await openDriverJob(page, '0845-26');
  await startStagedBatch(page, /Fuel receipt|Tankbeleg/i);
  await setStagedFiles(page, [
    filePayload('fuel-1.pdf', 0.4 * MB),
    filePayload('fuel-2.pdf', 0.4 * MB),
    filePayload('fuel-3.pdf', 0.4 * MB),
  ]);
  frame = await getFrame(page);
  const sheet6a = frame.locator('.sheet').filter({ hasText: /Check your selection|Auswahl prüfen/i });
  await sheet6a.waitFor({ state: 'visible' });
  await frame
    .locator('.sheet')
    .filter({ hasText: /Check your selection|Auswahl prüfen/i })
    .getByRole('button', { name: /^Upload$|^Hochladen$/i })
    .click();
  await page.waitForTimeout(500);
  const amountSheet = frame.locator('.sheet').filter({
    hasText: /Receipt \d+ of \d+|Beleg \d+ von \d+/i,
  });
  await amountSheet.waitFor({ state: 'visible' });
  await shot(page, '06-driver-amount-walk', amountSheet);

  await switchLang(page, 'DE');
  await page.waitForTimeout(300);
  await shot(page, '06-de-driver-amount-walk', amountSheet);
  await switchLang(page, 'EN');

  // Dismiss amount walk (returns to staged sheet with remaining files), then cancel batch
  await frame
    .locator('.sheet')
    .filter({ hasText: /Receipt \d+ of \d+|Beleg \d+ von \d+/i })
    .getByRole('button', { name: /^Cancel$|^Abbrechen$/i })
    .click();
  await page.waitForTimeout(300);
  const stagedAfterAmount = frame.locator('.sheet').filter({
    hasText: /Check your selection|Auswahl prüfen/i,
  });
  if (await stagedAfterAmount.isVisible().catch(() => false)) {
    await stagedAfterAmount
      .getByRole('button', { name: /^Cancel$|^Abbrechen$/i })
      .click();
    await page.waitForTimeout(300);
  }

  // ── 7. Evidence blocked at submit on problem report ─────────────────
  frame = await getFrame(page);
  await frame.evaluate(() => {
    window.AuthStore.setDriverUploadLimits({ maxFileMb: 5, maxTotalMb: 10 });
  });
  // Already on tour 0845 detail after cancelling the amount batch.
  await frame.getByRole('button', { name: /Report problem|Problem melden/i }).click();
  await page.waitForTimeout(400);
  // Empty-run path (carries evidence)
  await frame
    .locator('.sheet .radio-card')
    .filter({ hasText: /Report empty run|Leerfahrt melden/i })
    .click();
  await page.waitForTimeout(400);
  // Reason + explanation so the only block is evidence size
  await frame
    .locator('.sheet .radio-card')
    .filter({ hasText: /not being released|Fahrzeug wird nicht herausgegeben/i })
    .click();
  const textarea = frame.locator('.sheet textarea').first();
  await textarea.fill(
    'Vehicle not released at the gate — need to attach oversized yard photos as evidence of the blockage.',
  );
  // Prefer the Add file button + filechooser so the sheet stays consistent
  const addEvidence = frame
    .locator('.sheet')
    .getByRole('button', { name: /Add file|Datei hinzufügen/i });
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
  await addEvidence.click();
  const chooser = await chooserPromise;
  await chooser.setFiles([
    filePayload('yard-photo-huge.jpg', 8 * MB, 'image/jpeg'),
  ]);
  await page.waitForTimeout(500);
  const problemSheet = frame
    .locator('.sheet')
    .filter({ hasText: /Report problem|Problem melden/i })
    .last();
  await shot(page, '07-driver-evidence-blocked', problemSheet);

  await switchLang(page, 'DE');
  await page.waitForTimeout(300);
  await shot(page, '07-de-driver-evidence-blocked', problemSheet);

  // Restore defaults
  frame = await getFrame(page);
  await frame.evaluate(() => {
    window.AuthStore.setDriverUploadLimits({ maxFileMb: 25, maxTotalMb: 50 });
  });

  console.log('Done. Screenshots in', OUT);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
