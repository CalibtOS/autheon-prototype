/**
 * PDF -> PNG rasteriser (visual verification tool).
 *
 * The PDF-generation skill requires that reference templates and generated
 * output are inspected as *rendered pages*, not via text extraction. macOS dev
 * machines have no poppler/mutool, so we rasterise with the Chromium that
 * Playwright already ships plus pdf.js — the same pdf.js version the driver PWA
 * uses for in-app document preview (see prototype/project/driver.jsx).
 *
 * Usage:
 *   node tools/pdf/render-pdf.mjs <out-dir> <file.pdf> [more.pdf ...] [--scale=2]
 *
 * Output: <out-dir>/<pdf-basename>-p<N>.png
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const PDFJS_VERSION = "3.11.174";
const PDFJS_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.js`;
const PDFJS_WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

const args = process.argv.slice(2);
const scaleArg = args.find((a) => a.startsWith("--scale="));
const scale = scaleArg ? Number(scaleArg.split("=")[1]) : 2;
const positional = args.filter((a) => !a.startsWith("--"));
const [outDir, ...pdfs] = positional;

if (!outDir || pdfs.length === 0) {
  console.error(
    "usage: node tools/pdf/render-pdf.mjs <out-dir> <file.pdf> [...] [--scale=2]",
  );
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
// pdf.js needs a document origin to attach its worker to; about:blank is enough.
await page.goto("about:blank");
await page.addScriptTag({ url: PDFJS_URL });
await page.evaluate((worker) => {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = worker;
}, PDFJS_WORKER_URL);

const written = [];
for (const pdfPath of pdfs) {
  const bytes = fs.readFileSync(pdfPath);
  const base = path.basename(pdfPath, path.extname(pdfPath)).replace(/\s+/g, "_");
  const pageCount = await page.evaluate(
    async ([b64, s]) => {
      const raw = atob(b64);
      const data = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) data[i] = raw.charCodeAt(i);
      const doc = await window.pdfjsLib.getDocument({ data }).promise;
      window.__pages = [];
      for (let n = 1; n <= doc.numPages; n += 1) {
        const pg = await doc.getPage(n);
        const viewport = pg.getViewport({ scale: s });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await pg.render({ canvasContext: ctx, viewport }).promise;
        window.__pages.push(canvas.toDataURL("image/png").split(",")[1]);
      }
      return doc.numPages;
    },
    [bytes.toString("base64"), scale],
  );

  for (let n = 0; n < pageCount; n += 1) {
    const b64 = await page.evaluate((i) => window.__pages[i], n);
    const file = path.join(outDir, `${base}-p${n + 1}.png`);
    fs.writeFileSync(file, Buffer.from(b64, "base64"));
    written.push(file);
  }
  console.log(`${pdfPath}: ${pageCount} page(s)`);
}

await browser.close();
written.forEach((f) => console.log("saved", f));
