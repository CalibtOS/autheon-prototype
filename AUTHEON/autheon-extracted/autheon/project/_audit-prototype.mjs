/**
 * Prototype audit: i18n parity, t() keys, PRD v1.5/v1.6 APIs, forbidden legacy strings.
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
  "reportProblemCancel",
  "reportProblemNotPerformable",
  "resolveSpecialCase",
  "markPerformed",
  "getTourDocuments",
  "acceptTourDocument",
  "registerTourDocumentAdmin",
  "getOrderingParties",
  "getAddresses",
  "updateOrderingParty",
  "deleteOrderingParty",
  "updateAddress",
  "deleteAddress",
  "countJobsUsingOrderingParty",
  "countJobsUsingAddress",
  "getAppDisplayName",
  "setAppDisplayName",
  "getBranding",
  "reloadDemo",
  "updateFinancial",
  "getAdminEmailQueue",
  "getDriverNotifications",
  "markDriverNotificationsRead",
  "pushDriverNotification",
  "getJobDisplayStatus",
  "markTourDocumentChecked",
];
const miss = critical.filter((c) => !store.includes(c));
if (miss.length) {
  out(`store.js missing APIs: ${miss.join(", ")}`);
  process.exitCode = 1;
} else out("store.js PRD v1.5+v1.6 APIs: present");

const v16Needles = [
  ["alternateContactPerson", "alternate contact on location"],
  ['"Under Review"', "Under Review job summary"],
  ["pushEnabled", "pushEnabled pref"],
  ["notifyNewPublished", "notifyNewPublished pref"],
  ["notifyPostalPrefix", "notifyPostalPrefix pref"],
  ["cancellationActor", "cancellationActor field"],
  ["function seedDriverNotifications", "seedDriverNotifications()"],
  ["maybeNotifyPublishedJob", "maybeNotifyPublishedJob"],
];
out("");
for (const [needle, label] of v16Needles) {
  if (!store.includes(needle)) {
    out(`PRD v1.6 store missing ${label}`);
    process.exitCode = 1;
  } else out(`PRD v1.6 store ${label}: present`);
}

const forbidden = [
  "return_requested",
  "submitReturn",
  "approveReturn",
  "completeJob",
  "getCustomers",
  "getInvoiceUploads",
];
const scanFiles = ["store.js", "driver.jsx", "admin.jsx", "AUTHEON Prototype.html"];
for (const f of scanFiles) {
  const s = file(f);
  for (const bad of forbidden) {
    if (s.includes(bad)) {
      out(`FORBIDDEN "${bad}" found in ${f}`);
      process.exitCode = 1;
    }
  }
}
if (!process.exitCode) out("Forbidden v1.4 API strings: none");

const driver = file("driver.jsx");
const requiredDocTypes = [
  "invoice",
  "fuel_receipt",
  "toll_receipt",
  "delivery_note",
  "waiting_time_evidence",
  "other_proof",
  "other_receipt",
];
const missingDocTypes = requiredDocTypes.filter(
  (type) => !driver.includes(`"${type}"`),
);
if (missingDocTypes.length) {
  out(`Driver upload missing PRD document types: ${missingDocTypes.join(", ")}`);
  process.exitCode = 1;
} else out("Driver upload PRD document types: present");

const staleCopy = [
  "Request return",
  "Return requested",
  "return window",
  "return deadline",
  "return rules",
  "Mark completed",
];
const copyFiles = ["i18n.js", "driver.jsx", "admin.jsx", "AUTHEON Prototype.html"];
for (const f of copyFiles) {
  const s = file(f);
  for (const bad of staleCopy) {
    if (s.toLowerCase().includes(bad.toLowerCase())) {
      out(`STALE v1.4 copy "${bad}" found in ${f}`);
      process.exitCode = 1;
    }
  }
}
if (!process.exitCode) out("Stale v1.4 user-facing copy: none");

const seedBlock = store.slice(
  store.indexOf("function seedJobs"),
  store.indexOf("function seedDriverState"),
);
const emptySeedContacts = (seedBlock.match(/contactPerson:\s*""/g) || [])
  .length;
out("");
if (emptySeedContacts) {
  out(`Seed jobs with empty contactPerson: ${emptySeedContacts}`);
  process.exitCode = 1;
} else out("Seed pickup/delivery contacts: all populated");

const seedChecks = [
  ["function seedTourDocuments", "seedTourDocuments()"],
  ["function seedAdminEmailQueue", "seedAdminEmailQueue()"],
  ["function seedDriverNotifications", "seedDriverNotifications()"],
  ["function validateSeedData", "validateSeedData()"],
  ["id: \"OP-005\"", "ordering party OP-005"],
  ["TD-SEED-001", "seed tour document rows"],
  ["let tourDocuments = seedTourDocuments()", "tour documents initialized from seed"],
];
out("");
for (const [needle, label] of seedChecks) {
  if (!store.includes(needle)) {
    out(`Seed structure missing ${label}`);
    process.exitCode = 1;
  } else out(`Seed structure ${label}: present`);
}

const admin = file("admin.jsx");
if (!admin.includes("getAdminEmailQueue")) {
  out("admin.jsx missing admin notification feed UI hook");
  process.exitCode = 1;
} else out("admin.jsx notification feed UI: present");

if (!driver.includes("getDriverNotifications")) {
  out("driver.jsx missing driver in-app notifications UI hook");
  process.exitCode = 1;
} else out("driver.jsx in-app notifications UI: present");

if (!driver.includes("notifyNewPublished")) {
  out("driver.jsx missing three push toggles");
  process.exitCode = 1;
} else out("driver.jsx three push toggles: present");
