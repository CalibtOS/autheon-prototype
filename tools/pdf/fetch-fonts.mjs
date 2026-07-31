/**
 * Caches the two Montserrat faces the approved template requires into an
 * UNTRACKED directory so the generator can inline them as data: URIs and
 * Chromium can embed the real `sfnt` into the PDF.
 *
 * Usage: node tools/pdf/fetch-fonts.mjs   (or `npm run pdf:fonts`)
 *
 * WHY THIS EXISTS RATHER THAN COMMITTED FONT FILES
 * The repository intentionally ships no font binaries ("README copy.md"), and
 * this work order forbids committing unverified font files. So the faces are
 * treated as a CACHED BUILD INPUT, not a repository asset: they land in
 * `tools/pdf/.fonts/` (git-ignored), their source URL and SHA-256 are recorded
 * in `SOURCES.json`, and nothing is added to version control.
 *
 * SOURCE: Google's own font host, via the legacy CSS endpoint — the only
 * Google Fonts API that serves static TrueType rather than woff2. Montserrat
 * is licensed under the SIL Open Font License 1.1.
 *
 * PRODUCTION must vendor licensed files under the application's own asset
 * pipeline instead of relying on this cache — see blocker B3.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export { FONT_DIR } from "./document-module.mjs";
import { FONT_DIR as CACHE_DIR } from "./document-module.mjs";

const CSS_URL = "https://fonts.googleapis.com/css?family=Montserrat:400,700";
// The legacy endpoint content-negotiates on User-Agent; an ancient UA is what
// makes it emit `format('truetype')` instead of woff2.
const LEGACY_UA = "Mozilla/4.0";

const WANTED = [
  { weight: 400, file: "Montserrat-Regular.ttf" },
  { weight: 700, file: "Montserrat-Bold.ttf" },
];

async function main() {
  const css = await fetch(CSS_URL, { headers: { "User-Agent": LEGACY_UA } }).then(
    (r) => {
      if (!r.ok) throw new Error(`font CSS request failed: HTTP ${r.status}`);
      return r.text();
    },
  );

  // Each @font-face block carries its weight and one truetype url.
  const blocks = css.split("@font-face").slice(1);
  const byWeight = new Map();
  for (const block of blocks) {
    const weight = Number((block.match(/font-weight:\s*(\d+)/) || [])[1]);
    const url = (block.match(/url\((https:[^)]+\.ttf)\)/) || [])[1];
    if (weight && url) byWeight.set(weight, url);
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const sources = { source: CSS_URL, license: "SIL Open Font License 1.1", faces: [] };

  for (const face of WANTED) {
    const url = byWeight.get(face.weight);
    if (!url) {
      throw new Error(
        `no truetype url for weight ${face.weight} in the font CSS response`,
      );
    }
    const bytes = Buffer.from(
      await fetch(url).then((r) => {
        if (!r.ok) throw new Error(`font download failed: HTTP ${r.status} ${url}`);
        return r.arrayBuffer();
      }),
    );
    // A TrueType sfnt starts with 0x00010000 (or the "true"/"ttcf" tags).
    // Anything else - notably woff2's "wOF2" - would silently degrade the PDF
    // to Type3 outline glyphs, so reject it here rather than at review time.
    const magic = bytes.subarray(0, 4).toString("hex");
    if (!["00010000", "74727565", "74746366"].includes(magic)) {
      throw new Error(
        `${face.file} is not a TrueType sfnt (magic ${magic}) - refusing to cache it`,
      );
    }
    const dest = path.join(CACHE_DIR, face.file);
    fs.writeFileSync(dest, bytes);
    const sha = crypto.createHash("sha256").update(bytes).digest("hex");
    sources.faces.push({ file: face.file, weight: face.weight, url, bytes: bytes.length, sha256: sha });
    console.log(`${face.file.padEnd(26)} ${String(bytes.length).padStart(8)} bytes  sha256:${sha.slice(0, 16)}…`);
  }

  fs.writeFileSync(
    path.join(CACHE_DIR, "SOURCES.json"),
    `${JSON.stringify(sources, null, 2)}\n`,
  );
  console.log(`\ncached in ${CACHE_DIR} (git-ignored)`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
