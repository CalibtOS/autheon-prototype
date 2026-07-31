/**
 * Loads the transport-order toolkit into Node.
 *
 * `prototype/project/transport-order-pdf.js`, `tools/pdf/fixtures.js` and
 * `tools/pdf/pdf-info.js` are IIFEs that attach themselves to `window` or
 * `globalThis` — the same no-bundler convention every module in the prototype
 * uses. Running them through `vm.runInThisContext` means:
 *
 *   * the generator uses the EXACT renderer file the browser loads, so the
 *     review artefacts can never come from a second implementation;
 *   * the Playwright specs can load them too, even though their TypeScript is
 *     transpiled to CommonJS and cannot import ES modules.
 *
 * The Node-side mirror of this loader is
 * `tests/regression/support/helpers/transport-order-pdf.ts`.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, "..", "..");
export const MODULE_PATH = path.join(
  REPO_ROOT,
  "prototype",
  "project",
  "transport-order-pdf.js",
);
export const FIXTURES_PATH = path.join(HERE, "fixtures.js");
export const PDF_INFO_PATH = path.join(HERE, "pdf-info.js");
/** Where `fetch-fonts.mjs` caches the OFL Montserrat faces (git-ignored). */
export const FONT_DIR = path.join(HERE, ".fonts");

function loadOnce(globalKey, file) {
  if (!globalThis[globalKey]) {
    vm.runInThisContext(fs.readFileSync(file, "utf8"), { filename: file });
  }
  return globalThis[globalKey];
}

export function loadTransportOrderModule() {
  return loadOnce("AutheonTransportOrderPdf", MODULE_PATH);
}

export function loadFixtures() {
  return loadOnce("AutheonTransportOrderFixtures", FIXTURES_PATH);
}

export function loadPdfInfo() {
  return loadOnce("AutheonPdfInfo", PDF_INFO_PATH);
}
