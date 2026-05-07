/**
 * Prototype audit: i18n parity (en/de top-level keys) and t("key") references.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const out = (line) => process.stdout.write(`${line}\n`);

const root = path.dirname(fileURLToPath(import.meta.url));
const file = (p) => fs.readFileSync(path.join(root, p), "utf8");

function localeKeys(text, startMarker, endMarker) {
  const i = text.indexOf(startMarker);
  if (i < 0) throw new Error("missing " + startMarker);
  const j = text.indexOf(endMarker, i + startMarker.length);
  if (j < 0) throw new Error("missing " + endMarker);
  const block = text.slice(i + startMarker.length, j);
  const keys = [];
  const re = /^\s{6}([a-zA-Z_][a-zA-Z0-9_]*):/gm;
  let m;
  while ((m = re.exec(block))) keys.push(m[1]);
  return new Set(keys);
}

const i18n = file("i18n.js");
const en = localeKeys(i18n, "en: {", "de: {");
const de = localeKeys(i18n, "de: {", "\n  };");

const missingInDe = [...en].filter((k) => !de.has(k));
const missingInEn = [...de].filter((k) => !en.has(k));

out(`i18n en keys: ${en.size} de keys: ${de.size}`);
if (missingInDe.length) out(`In en but not de: ${missingInDe.join(", ")}`);
else out("In en but not de: (none)");
if (missingInEn.length) out(`In de but not en: ${missingInEn.join(", ")}`);
else out("In de but not en: (none)");

const tRe = /\bt\(\s*["']([a-zA-Z0-9_.]+)["']/g;
const files = [
  "admin.jsx",
  "driver.jsx",
  "feature-flags.js",
  "AUTHEON Prototype.html",
];
const used = new Set();
for (const f of files) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, "utf8");
  let m;
  tRe.lastIndex = 0;
  while ((m = tRe.exec(s))) used.add(m[1]);
}

const missingFromEn = [...used].filter((k) => !en.has(k) && !k.includes("."));
missingFromEn.sort();

out("");
out(`Distinct t() string keys in scanned files: ${used.size}`);
if (missingFromEn.length) {
  out("Used but missing from i18n en:");
  missingFromEn.forEach((k) => out(`   ${k}`));
  process.exitCode = 1;
} else {
  out("Used but missing from i18n en: (none)");
}

const store = file("store.js");
const critical = [
  "addPartnerInvoiceRecordAdmin",
  "updateInvoiceUpload",
  "downloadInvoicePlaceholder",
  "updateFinancial",
  "getInvoiceUploads",
  "getJobs",
  "getDrivers",
];
const miss = critical.filter((c) => !store.includes(c));
if (miss.length) {
  out(`store.js missing strings: ${miss.join(", ")}`);
  process.exitCode = 1;
} else out("store.js critical API strings: present");
