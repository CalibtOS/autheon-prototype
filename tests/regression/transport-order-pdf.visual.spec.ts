import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';
import {
  FONT_DIR,
  loadFixtures,
  loadSetPdfInfo,
  loadTransportOrderModule,
} from './support/helpers/transport-order-pdf.ts';

/**
 * PDF/content and visual-regression coverage for the generated transport order.
 *
 * These tests render the fixtures to REAL PDFs through the same Chromium
 * Playwright drives, then assert on the resulting bytes: embedded fonts,
 * document information dictionary, page count, page counters, and — via
 * `toHaveScreenshot` on the rendered page — the approved visual layout.
 *
 * A passing text assertion is not sufficient on its own, which is why the
 * screenshot comparison is part of the same file: text extraction cannot see a
 * clipped cell, an overlapping header or a broken glyph.
 *
 * Requires the cached Montserrat faces. Run `npm run pdf:fonts` once; the
 * suite skips with a clear message rather than silently validating Type3
 * fallback glyphs.
 */

const COUNTER_STRIP_PT = 13;
const Doc = loadTransportOrderModule();
const FIXTURES = loadFixtures();
const setPdfInfo = loadSetPdfInfo();

const fontsAvailable =
  fs.existsSync(path.join(FONT_DIR, 'Montserrat-Regular.ttf')) &&
  fs.existsSync(path.join(FONT_DIR, 'Montserrat-Bold.ttf'));

function inlineFontCss(): string {
  return [
    { file: 'Montserrat-Regular.ttf', weight: 400 },
    { file: 'Montserrat-Bold.ttf', weight: 700 },
  ]
    .map(({ file, weight }) => {
      const b64 = fs.readFileSync(path.join(FONT_DIR, file)).toString('base64');
      return (
        `@font-face{font-family:Montserrat;font-style:normal;font-weight:${weight};` +
        `font-display:block;src:url(data:font/ttf;base64,${b64}) format("truetype");}`
      );
    })
    .join('\n');
}

/** /Type /Page occurrences — the page objects, not /Pages. */
function countPages(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
}

/** Reads the appended document information dictionary. */
function readInfo(pdf: Buffer): Record<string, string> {
  const text = pdf.toString('latin1');
  const out: Record<string, string> = {};
  for (const [, key, hex] of text.matchAll(/\/(Title|Author)\s*<([0-9a-fA-F]+)>/g)) {
    const bytes = Buffer.from(hex, 'hex');
    // UTF-16BE with a BOM, as written by setPdfInfo().
    out[key] = bytes.subarray(2).swap16().toString('utf16le');
  }
  return out;
}

/** Every embedded font programme, with its subset base name. */
function embeddedFonts(pdf: Buffer): { baseFont: string; type: string }[] {
  const text = pdf.toString('latin1');
  const fonts: { baseFont: string; type: string }[] = [];
  for (const [, type, baseFont] of text.matchAll(
    /\/Subtype\s*\/(Type0|TrueType|Type1|Type3)[\s\S]{0,400}?\/BaseFont\s*\/([#A-Za-z0-9+\-,.]+)/g,
  )) {
    fonts.push({ baseFont, type });
  }
  return fonts;
}

const PDFJS_VERSION = '3.11.174';
const PDFJS_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.js`;
const PDFJS_WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

/**
 * Extracts the visible text of each PDF page, so assertions can see what the
 * DOCUMENT says rather than what the source HTML said. Chromium emits a
 * ToUnicode CMap for the embedded subsets, so the mapping back to characters is
 * exact — this is the same pdf.js the driver PWA and `tools/pdf/render-pdf.mjs`
 * use, loaded from the same pinned version.
 */
async function extractPdfText(
  page: import('@playwright/test').Page,
  pdf: Buffer,
): Promise<string[]> {
  await page.setContent('<!doctype html><title>pdf</title>', { waitUntil: 'load' });
  await page.addScriptTag({ url: PDFJS_URL });
  return page.evaluate(
    async ({ b64, worker }) => {
      const lib = (window as unknown as { pdfjsLib: never }).pdfjsLib as unknown as {
        GlobalWorkerOptions: { workerSrc: string };
        getDocument: (o: unknown) => { promise: Promise<never> };
      };
      lib.GlobalWorkerOptions.workerSrc = worker;
      const raw = atob(b64);
      const data = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) data[i] = raw.charCodeAt(i);
      const doc = (await lib.getDocument({ data }).promise) as unknown as {
        numPages: number;
        getPage: (n: number) => Promise<{
          getTextContent: () => Promise<{ items: { str: string }[] }>;
        }>;
      };
      const pages: string[] = [];
      for (let n = 1; n <= doc.numPages; n += 1) {
        const content = await (await doc.getPage(n)).getTextContent();
        pages.push(content.items.map((i) => i.str).join(' ').replace(/\s+/g, ' '));
      }
      return pages;
    },
    { b64: pdf.toString('base64'), worker: PDFJS_WORKER_URL },
  );
}

type Rendered = {
  pdf: Buffer;
  html: string;
  pages: number;
  checksum: string;
  payload: { metaTitle: string; template: string; tour: string; fileName: string };
};

async function renderFixture(
  page: import('@playwright/test').Page,
  key: string,
): Promise<Rendered> {
  const fixture = FIXTURES.find((f) => f.key === key);
  if (!fixture) throw new Error(`unknown fixture "${key}"`);
  const fontCss = inlineFontCss();
  const built = Doc.buildDocument(fixture.input, { fontCss });
  expect(built.ok, `fixture ${key} missing: ${built.missing?.join(', ')}`).toBe(true);
  // `ok` guarantees both, but the compiler does not know that.
  const payload = built.payload!;
  const initialHtml = built.html!;

  const draw = async (html: string, multiPage: boolean): Promise<Buffer> => {
    await page.setContent(html, { waitUntil: 'load' });
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return (
        document.fonts.check('400 9pt Montserrat') &&
        document.fonts.check('700 9pt Montserrat')
      );
    });
    expect(loaded, 'Montserrat must be loaded before page.pdf()').toBe(true);
    return page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: multiPage,
      headerTemplate: '<div></div>',
      footerTemplate: multiPage
        ? `<style>${fontCss}</style><div style="width:100%;font-family:Montserrat,sans-serif;` +
          'font-size:6pt;color:#000;text-align:center;padding:0 56.6pt 3pt 70.8pt;">' +
          'Seite <span class="pageNumber"></span> von <span class="totalPages"></span></div>'
        : '<div></div>',
    });
  };

  let html = initialHtml;
  let pdf = await draw(html, false);
  let pages = countPages(pdf);
  if (pages > 1) {
    html = Doc.renderHtml(payload, { fontCss, pageMarginBottom: COUNTER_STRIP_PT });
    pdf = await draw(html, true);
    pages = countPages(pdf);
  }
  pdf = setPdfInfo(pdf, {
    Title: payload.metaTitle,
    Author: payload.metaAuthor,
  });
  return { pdf, html, pages, checksum: built.checksum!, payload };
}

test.describe('generated transport-order PDF (content + visual)', () => {
  test.skip(
    !fontsAvailable,
    'Montserrat faces are not cached — run `npm run pdf:fonts` first.',
  );
  // Rendering seven A4 documents twice over is slower than a DOM assertion.
  test.slow();

  test('single-page fixtures are exactly A4 portrait with the required metadata', async ({
    page,
  }) => {
    for (const key of ['pkw', 'lkw-up-to-7-5t', 'lkw-over-7-5t'] as const) {
      const r = await renderFixture(page, key);
      const text = r.pdf.toString('latin1');

      expect(r.pdf.subarray(0, 5).toString('latin1'), key).toBe('%PDF-');
      expect(r.pages, key).toBe(1);

      // A4 portrait: 595 x 842 pt, within Chromium's rounding.
      const box = text.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
      expect(box, key).toBeTruthy();
      expect(Number(box![1]), key).toBeCloseTo(595.3, 0);
      expect(Number(box![2]), key).toBeCloseTo(841.9, 0);

      const info = readInfo(r.pdf);
      expect(info.Title, key).toBe(`Fahrauftrag ${r.payload.tour}`);
      expect(info.Author, key).toBe('AUTHEON GmbH');

      // One tour identifier across metadata title and generated filename.
      expect(r.payload.fileName, key).toBe(`Fahrauftrag-${r.payload.tour}.pdf`);

      // No AcroForm and no editable field anywhere in the document.
      expect(/\/AcroForm/.test(text), key).toBe(false);
      expect(/\/Subtype\s*\/Widget/.test(text), key).toBe(false);

      // Recorded checksum matches a fresh hash of the same canonical source.
      expect(r.checksum, key).toMatch(/^[0-9a-f]{64}$/);
      expect(
        crypto
          .createHash('sha256')
          .update(`${JSON.stringify(r.payload)}\n${r.html}`)
          .digest('hex'),
        key,
      ).toBe(r.checksum);
    }
  });

  test('both Montserrat weights are embedded as real TrueType programmes', async ({
    page,
  }) => {
    const r = await renderFixture(page, 'pkw');
    const fonts = embeddedFonts(r.pdf);
    const text = r.pdf.toString('latin1');

    expect(fonts.length).toBeGreaterThanOrEqual(2);
    // Every face in the document is Montserrat: no host-font substitution.
    for (const font of fonts) {
      expect(font.baseFont, JSON.stringify(fonts)).toMatch(/Montserrat/i);
      // Type3 means Skia could not embed the face and drew outlines instead.
      expect(font.type, JSON.stringify(fonts)).not.toBe('Type3');
    }
    // Regular AND bold are both present as distinct subsets.
    expect(fonts.some((f) => /Bold/i.test(f.baseFont))).toBe(true);
    expect(fonts.some((f) => !/Bold/i.test(f.baseFont))).toBe(true);
    // Actual font programmes, not just references.
    expect((text.match(/\/FontFile2/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  test('the document is German, complete, and free of unresolved placeholders', async ({
    page,
  }) => {
    for (const { key, expectTitle } of [
      { key: 'pkw', expectTitle: 'PKW' },
      { key: 'lkw-up-to-7-5t', expectTitle: 'LKW' },
      { key: 'lkw-over-7-5t', expectTitle: 'LKW' },
    ] as const) {
      const r = await renderFixture(page, key);
      const visible = await page.evaluate(() => document.body.innerText);

      // Title and template come from the canonical backend vehicle type.
      expect(visible, key).toContain(`FAHRAUFTRAG ${expectTitle}`);
      expect(r.payload.template, key).toBe(expectTitle.toLowerCase());

      for (const label of [
        'Fahrzeughersteller & Modell',
        'Amt. Kennzeichen / FIN',
        'Zulassungsstatus',
        'Zugelassen',
        'Abgemeldet',
        'ÜBERNAHME',
        'ÜBERGABE',
        'Ansprechpartner',
        'Datum – Uhrzeit',
        'Telefonnummer – E-Mail',
        'Zusatzinformation:',
        'Buchungsdatum/-Zeit',
        'Vergütung',
        'Sehr geehrte Damen und Herren,',
        'Mit freundlichen Grüßen',
        'AUTHEON GmbH',
      ]) {
        expect(visible, `${key}: ${label}`).toContain(label);
      }

      // German formats, exactly as specified.
      expect(visible, key).toMatch(/\b\d{2}\.\d{2}\.\d{4}\b/);
      expect(visible, key).toMatch(/\b\d{2}:\d{2} Uhr\b/);
      expect(visible, key).toMatch(/\d{1,3}(\.\d{3})*,\d{2} EUR Netto/);
      // Exactly Eigenachse or Fremdachse.
      expect(visible, key).toMatch(/\b(Eigenachse|Fremdachse)\b/);

      // No unresolved token, and no English leaking into the German document.
      expect(visible, key).not.toMatch(/\{\{|\}\}|<%|\$\{|undefined|NaN|\[object/);
      expect(visible, key).not.toMatch(/Transport order|Passenger car|net\b/i);

      // The PWA distance is excluded (Technical Specifications §3).
      expect(visible, key).not.toMatch(/\d+\s*km/i);
    }
  });

  test('a deregistered vehicle marks the second box and shows the red notice', async ({
    page,
  }) => {
    const r = await renderFixture(page, 'deregistered');
    const marks = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll('.reg-cell .cb')];
      const notice = document.querySelector('.dereg');
      return {
        boxes: boxes.length,
        marked: boxes.map((b) => b.querySelectorAll('path').length),
        noticeText: notice?.textContent || '',
        noticeColor: notice ? getComputedStyle(notice).color : '',
        // The notice belongs in the official licence-plate cell.
        insidePlateCell: !!notice?.closest('.plate-cell'),
      };
    });

    expect(r.pages).toBe(1);
    expect(marks.boxes).toBe(2);
    // Exactly one selected box, and it is "Abgemeldet" (the second).
    expect(marks.marked).toEqual([0, 1]);
    expect(marks.noticeText).toBe('Abgemeldet');
    expect(marks.noticeColor).toBe('rgb(192, 0, 0)');
    expect(marks.insidePlateCell).toBe(true);
  });

  test('long content wraps and paginates without clipping or overlap', async ({ page }) => {
    const r = await renderFixture(page, 'long-content');
    expect(r.pages).toBeGreaterThan(1);

    const layout = await page.evaluate(() => {
      const overflowing: string[] = [];
      // A cell whose content is taller than the cell itself is clipped.
      for (const cell of document.querySelectorAll('table.t td, table.t th')) {
        if (cell.scrollHeight > cell.clientHeight + 1) {
          overflowing.push(`${cell.className}:${cell.textContent?.slice(0, 30)}`);
        }
        if (cell.scrollWidth > cell.clientWidth + 1) {
          overflowing.push(`W ${cell.className}:${cell.textContent?.slice(0, 30)}`);
        }
      }
      const body = document.body;
      return {
        overflowing,
        // The page must never scroll sideways: that means content ran past A4.
        horizontalOverflow: body.scrollWidth > body.clientWidth + 1,
        // Both location blocks stayed intact rather than splitting mid-section.
        locSections: document.querySelectorAll('section.loc').length,
        emailWrapped:
          [...document.querySelectorAll('.wrap-any')].some(
            (el) => el.getBoundingClientRect().height > 20,
          ),
      };
    });

    expect(layout.overflowing).toEqual([]);
    expect(layout.horizontalOverflow).toBe(false);
    expect(layout.locSections).toBe(2);
    // The 100-character e-mail address wrapped to more than one line.
    expect(layout.emailWrapped).toBe(true);

    // The counter is Chromium's, not ours: the document reserves the strip and
    // contains no hardcoded counter text anywhere. Its actual rendered value is
    // asserted from the PDF itself in the next test.
    expect(r.html).toContain(`margin: 0 0 ${COUNTER_STRIP_PT}pt 0`);
    expect(r.html).not.toMatch(/Seite\s+\d+\s+von/);
  });

  test('multi-page output carries a truthful Seite X von Y on every page', async ({
    page,
  }) => {
    const r = await renderFixture(page, 'long-content');
    expect(r.pages).toBe(2);

    const perPage = await extractPdfText(page, r.pdf);
    expect(perPage, 'pdf.js text extraction returned nothing').toHaveLength(2);

    // Truthful counters: the denominator equals the real page count.
    expect(perPage[0]).toContain(`Seite 1 von ${r.pages}`);
    expect(perPage[1]).toContain(`Seite 2 von ${r.pages}`);

    // The approved header and footer repeat on both pages.
    for (const [index, text] of perPage.entries()) {
      expect(text, `page ${index + 1} header`).toContain('FAHRAUFTRAG LKW');
      expect(text, `page ${index + 1} footer`).toContain('AUTHEON GmbH');
      expect(text, `page ${index + 1} footer`).toContain('Rheinpromenade 4a');
    }
    // Sections stayed whole: pickup on page 1, delivery on page 2.
    expect(perPage[0]).toContain('ÜBERNAHME');
    expect(perPage[1]).toContain('ÜBERGABE');
  });

  test('the repeated header does not collide with continuation content', async ({
    page,
  }) => {
    await renderFixture(page, 'long-content');
    const geometry = await page.evaluate(() => {
      const header = document.querySelector('.doc-header') as HTMLElement;
      const title = document.querySelector('.doc-title') as HTMLElement;
      const logo = document.querySelector('.logo') as HTMLElement;
      const h = header.getBoundingClientRect();
      const t = title.getBoundingClientRect();
      const l = logo.getBoundingClientRect();
      return {
        // The header band must fully contain BOTH of its children, otherwise a
        // continuation page paints the title over the first table.
        titleInside: t.bottom <= h.bottom + 0.5,
        logoInside: l.bottom <= h.bottom + 0.5,
        titleBaselineFromTop: t.bottom,
        logoTopFromTop: l.top,
      };
    });

    expect(geometry.titleInside).toBe(true);
    expect(geometry.logoInside).toBe(true);
    // Matches the approved template's measured offsets (pt -> css px at 96dpi).
    expect(geometry.logoTopFromTop).toBeCloseTo(29.7 * (96 / 72), 0);
  });

  test('optional fields collapse without leaving an empty labelled cell', async ({
    page,
  }) => {
    const r = await renderFixture(page, 'optional-missing');
    const audit = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('table.t td, table.t th')];
      return {
        empty: cells
          .filter((c) => (c.textContent || '').trim() === '')
          .map((c) => c.className || 'unclassed'),
        // No additional-information block at all when there is nothing to say.
        infoBlocks: document.querySelectorAll('.t-info').length,
        // No orphaned label whose value row vanished.
        labels: [...document.querySelectorAll('table.t th')].map((c) =>
          (c.textContent || '').trim(),
        ),
      };
    });

    expect(r.pages).toBe(1);
    expect(audit.empty).toEqual([]);
    expect(audit.infoBlocks).toBe(0);
    expect(audit.labels).not.toContain('Ansprechpartner');
    expect(audit.labels).not.toContain('Telefonnummer – E-Mail');
    // The mandatory rows are still there.
    expect(audit.labels).toContain('Zulassungsstatus');
    expect(audit.labels).toContain('Vergütung');
  });

  test('umlauts, special characters and international addresses render as glyphs', async ({
    page,
  }) => {
    await renderFixture(page, 'international-umlauts');
    const text = await page.evaluate(() => document.body.innerText);

    for (const needle of [
      'Zürich',
      'København Ø',
      'Škoda',
      'Jürgen Müller-Løvgren',
      'Søren Kjærgaard',
      'Østerbrogade',
      'Größe',
      'Grenzübergang',
    ]) {
      expect(text, needle).toContain(needle);
    }
    // The tofu / replacement characters a missing glyph would produce.
    expect(text).not.toMatch(/[�□]/);
  });

  test.describe('@visual-regression', () => {
    for (const key of [
      'pkw',
      'lkw-up-to-7-5t',
      'deregistered',
      'optional-missing',
      'long-content',
      'international-umlauts',
    ] as const) {
      test(`${key} matches the approved layout`, async ({ page }) => {
        await renderFixture(page, key);
        await page.setViewportSize({ width: 794, height: 1123 }); // A4 at 96dpi
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        // Full-page: the whole flowed document, including continuation pages.
        await expect(page).toHaveScreenshot(`transport-order-${key}.png`, {
          fullPage: true,
          // The document is fully deterministic — fixed fixtures, fixed
          // booking instant, no timestamps rendered — so nothing needs masking.
          maxDiffPixelRatio: 0.001,
        });
      });
    }
  });
});
