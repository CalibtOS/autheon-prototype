/**
 * Renders the transport-order fixtures to real PDFs through Playwright's
 * Chromium — Strategy A of the PDF-generation skill (HTML/CSS -> Chromium ->
 * PDF), using the same renderer the prototype runtime loads.
 *
 * Usage:
 *   node tools/pdf/generate-transport-order-pdfs.mjs [outDir] [--only=pkw,lkw-over-7-5t]
 *                                                   [--font-dir=path/to/montserrat]
 *
 * Output (default `visual-regression-artifacts/transport-order-pdf/`):
 *   <key>.pdf         the document
 *   <key>.html        the exact markup that produced it (review + debugging)
 *   manifest.json     per-fixture template, title, page count, checksums
 *
 * FONTS. Montserrat Regular 400 / Bold 700 must be fully embedded. The
 * repository intentionally ships no font binaries (see "README copy.md"), and
 * this task must not commit unverified ones, so the default is the same Google
 * Fonts source the prototype shell already uses — Chromium embeds whatever it
 * loads, so the output PDFs do carry the full faces. Point `--font-dir` at a
 * directory holding `Montserrat-Regular.ttf` / `Montserrat-Bold.ttf` to inline
 * repository-owned files instead and make the render fully offline. See
 * blocker B3 in the traceability document.
 */
import { chromium } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  FONT_DIR,
  REPO_ROOT,
  loadFixtures,
  loadPdfInfo,
  loadTransportOrderModule,
} from "./document-module.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : "";
};
const positional = args.filter((a) => !a.startsWith("--"));
const OUT_DIR = path.resolve(
  positional[0] ||
    path.join(REPO_ROOT, "visual-regression-artifacts", "transport-order-pdf"),
);
const only = flag("only")
  ? new Set(flag("only").split(",").map((s) => s.trim()))
  : null;
// Real embedded TrueType is not optional: handed a woff2 webfont, Skia writes
// Type3 outline glyphs instead of an embedded face, which fails both the
// "fonts fully embedded" requirement and text extraction. So the generator
// always inlines TTFs and refuses to run without them.
const fontDir = flag("font-dir") || FONT_DIR;
if (!fs.existsSync(fontDir)) {
  console.error(
    `No font directory at ${fontDir}.\n` +
      "Run `npm run pdf:fonts` to cache the OFL Montserrat faces, or pass\n" +
      "--font-dir=<dir> pointing at repository-owned Montserrat-Regular.ttf /\n" +
      "Montserrat-Bold.ttf.",
  );
  process.exit(1);
}

/** pt of bottom page margin reserved for the `Seite X von Y` counter strip. */
const COUNTER_STRIP_PT = 13;

const Doc = loadTransportOrderModule();
const { FIXTURES } = loadFixtures();
const { setPdfInfo } = loadPdfInfo();
const fontCss = inlineFontCss(fontDir);

/**
 * Builds `@font-face` rules with data: URIs when repository-owned Montserrat
 * files are supplied. Returns "" to fall back to the webfont stylesheet.
 */
function inlineFontCss(dir) {
  if (!dir) return "";
  const faces = [
    { file: "Montserrat-Regular.ttf", weight: 400 },
    { file: "Montserrat-Bold.ttf", weight: 700 },
  ];
  const css = [];
  for (const face of faces) {
    const file = path.resolve(dir, face.file);
    if (!fs.existsSync(file)) {
      throw new Error(`--font-dir is missing ${face.file} (${file})`);
    }
    const b64 = fs.readFileSync(file).toString("base64");
    css.push(
      `@font-face{font-family:Montserrat;font-style:normal;font-weight:${face.weight};` +
        `font-display:block;src:url(data:font/ttf;base64,${b64}) format("truetype");}`,
    );
  }
  return css.join("\n");
}

/**
 * Fails loudly when the document font did not load. A silent fallback to a
 * host font changes every line break, so it must never pass unnoticed.
 */
async function assertFontsLoaded(page) {
  const state = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      regular: document.fonts.check('400 9pt Montserrat'),
      bold: document.fonts.check('700 9pt Montserrat'),
    };
  });
  if (!state.regular || !state.bold) {
    throw new Error(
      `Montserrat did not load (regular=${state.regular}, bold=${state.bold}). ` +
        "Check network access or pass --font-dir with repository-owned files.",
    );
  }
}

/**
 * Chromium renders header/footer templates as a SEPARATE mini document that
 * inherits none of the page's styles, so the font faces have to be repeated
 * here — otherwise the counter silently falls back to Times.
 */
const counterFooter = (labels, css) =>
  `<style>${css}</style>` +
  '<div style="width:100%;font-family:Montserrat,sans-serif;font-size:6pt;color:#000;' +
  'text-align:center;padding:0 56.6pt 3pt 70.8pt;">' +
  `${labels.page} <span class="pageNumber"></span> ${labels.of} <span class="totalPages"></span>` +
  "</div>";

async function renderPdf(page, html, { multiPage }) {
  await page.setContent(html, { waitUntil: "load" });
  await assertFontsLoaded(page);
  return page.pdf({
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: multiPage,
    headerTemplate: "<div></div>",
    footerTemplate: multiPage
      ? counterFooter(Doc.LABELS.pageCounter, fontCss)
      : "<div></div>",
  });
}

/** Page count without a PDF library: every page object carries one /Type /Page. */
function countPages(buffer) {
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
const manifest = [];

try {
  for (const fixture of FIXTURES) {
    if (only && !only.has(fixture.key)) continue;

    const built = Doc.buildDocument(fixture.input, { fontCss });
    if (!built.ok) {
      throw new Error(
        `fixture "${fixture.key}" is missing mandatory data: ${built.missing.join(", ")}`,
      );
    }

    // Pass 1 measures the real page count; pass 2 re-renders with the
    // `Seite X von Y` strip only when the document actually spans pages, so a
    // single-page document keeps the approved template's exact bottom margin.
    let pdf = await renderPdf(page, built.html, { multiPage: false });
    let pages = countPages(pdf);
    let html = built.html;
    if (pages > 1) {
      html = Doc.renderHtml(built.payload, {
        fontCss,
        pageMarginBottom: COUNTER_STRIP_PT,
      });
      pdf = await renderPdf(page, html, { multiPage: true });
      pages = countPages(pdf);
    }

    // Chromium sets /Title from <title> but cannot set /Author, so the
    // information dictionary is completed with an incremental update.
    pdf = setPdfInfo(pdf, {
      Title: built.payload.metaTitle,
      Author: built.payload.metaAuthor,
    });

    const pdfPath = path.join(OUT_DIR, `${fixture.key}.pdf`);
    const htmlPath = path.join(OUT_DIR, `${fixture.key}.html`);
    fs.writeFileSync(pdfPath, pdf);
    fs.writeFileSync(htmlPath, html);

    manifest.push({
      key: fixture.key,
      label: fixture.label,
      tour: built.payload.tour,
      template: built.payload.template,
      title: `${built.payload.title.lead} ${built.payload.title.accent}`,
      metaTitle: built.payload.metaTitle,
      metaAuthor: built.payload.metaAuthor,
      fileName: built.payload.fileName,
      pages,
      // Checksum of the canonical document source, as recorded by the store.
      sourceChecksumSha256: built.checksum,
      // Checksum of the bytes actually written here.
      pdfChecksumSha256: crypto.createHash("sha256").update(pdf).digest("hex"),
      pdfBytes: pdf.length,
      files: {
        pdf: path.relative(REPO_ROOT, pdfPath),
        html: path.relative(REPO_ROOT, htmlPath),
      },
    });
    console.log(
      `${fixture.key.padEnd(24)} ${built.payload.template.toUpperCase().padEnd(4)} ` +
        `${pages} page(s)  ${pdf.length} bytes`,
    );
  }
} finally {
  await browser.close();
}

fs.writeFileSync(
  path.join(OUT_DIR, "manifest.json"),
  `${JSON.stringify(
    { fontSource: fontDir ? `inlined:${fontDir}` : "webfont:google-fonts", documents: manifest },
    null,
    2,
  )}\n`,
);
console.log(`\nmanifest: ${path.join(OUT_DIR, "manifest.json")}`);
