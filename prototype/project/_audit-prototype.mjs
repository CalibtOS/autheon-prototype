/**
 * Prototype audit: i18n parity, t() keys, PRD v1.5/v1.6/v1.8 APIs, forbidden legacy strings.
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
  "getCustomers",
  "getAddresses",
  "updateCustomer",
  "deleteCustomer",
  "updateAddress",
  "deleteAddress",
  "countJobsUsingCustomer",
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
  "requestMasterDataChange",
  "requestDailyLimitIncrease",
  "buildSpecialCaseEvidenceMeta",
  "listMasterDataChangeRequests",
  "getOpenMasterDataChangeRequestForDriver",
  "resolveMasterDataChangeRequest",
  "getOpenMasterDataChangeRequestCount",
  "updateDriver",
  "updateAdmin",
  "getOperationalPolicies",
  "setOperationalPolicies",
  "checkAdminCancelPolicy",
  "getCancellationReasonCodes",
  "getCancellationReasonLabel",
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
  "getInvoiceUploads",
  "ReturnSheet",
  "returnSheet",
  "use_" + "part" + "ner_invoices",
  "part" + "ner_invoice",
  "onOpen" + "Part" + "nerInvoices",
  "open" + "Part" + "nerInvoicesForJob",
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
  "Return-requested",
  "rückgabeangefragte",
  "return window",
  "return deadline",
  "return rules",
  "Mark completed",
  "Part" + "ner " + "invoices",
  "Part" + "ner" + "rechnungen",
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

if (!fs.existsSync(path.join(root, "DOMAIN.md"))) {
  out("DOMAIN.md glossary: missing");
  process.exitCode = 1;
} else out("DOMAIN.md glossary: present");

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
  ["id: \"OP-005\"", "customer OP-005"],
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

if (!admin.includes("MasterDataRequestsPane")) {
  out("admin.jsx Master data requests pane: missing");
  process.exitCode = 1;
} else out("admin.jsx Master data requests pane: present");

if (!driver.includes("getOpenMasterDataChangeRequestForDriver")) {
  out("driver.jsx open master-data request guard: missing");
  process.exitCode = 1;
} else out("driver.jsx open master-data request guard: present");

if (!admin.includes("InfopointPane") || !admin.includes("addNewsItem")) {
  out("admin.jsx Infopoint news publish UI: missing");
  process.exitCode = 1;
} else out("admin.jsx Infopoint news publish UI: present");

if (!admin.includes("navInfopoint") && !admin.includes("adminInfopointPublish")) {
  out("admin.jsx Infopoint labels: missing");
  process.exitCode = 1;
} else out("admin.jsx Infopoint labels: present");

if (!driver.includes("infopointDocsTab") || !driver.includes("infopointNewsTab")) {
  out("driver.jsx Infopoint tabs: missing");
  process.exitCode = 1;
} else out("driver.jsx Infopoint tabs: present");

if (!store.includes("addGeneralDocument")) {
  out("store.js addGeneralDocument API: missing");
  process.exitCode = 1;
} else out("store.js addGeneralDocument API: present");

if (!driver.includes("infopointDocViewDownload")) {
  out("driver.jsx Infopoint doc view/download: missing");
  process.exitCode = 1;
} else out("driver.jsx Infopoint doc view/download: present");

const gapChecks = [
  ["inputFormatters.js", "inputFormatters.js module"],
  ["formatDateInput", "formatDateInput in store"],
  ["requestMasterDataChange", "requestMasterDataChange API"],
  ["requestDailyLimitIncrease", "requestDailyLimitIncrease API"],
  ["buildSpecialCaseEvidenceMeta", "special case evidence builder"],
  ["reportCancelDriverUnavailable", "seven cancel reasons i18n"],
  ["reportProblemCancelBindingWarning", "cancel binding warning i18n"],
  ["reportProblemEvidenceLabel", "not-performable evidence i18n"],
  ["master_data_change_requested", "master data alert event"],
  ["specialCaseReport", "specialCaseReport on jobs"],
];
out("");
for (const [needle, label] of gapChecks) {
  const inStore = store.includes(needle);
  const inDriver = driver.includes(needle);
  const inAdmin = admin.includes(needle);
  const inI18n = i18n.includes(needle);
  const inFmt = fs.existsSync(path.join(root, "inputFormatters.js"))
    ? file("inputFormatters.js").includes(needle)
    : false;
  const ok =
    needle === "inputFormatters.js"
      ? fs.existsSync(path.join(root, "inputFormatters.js"))
      : inStore || inDriver || inAdmin || inI18n || inFmt;
  if (!ok) {
    out(`Gap closure missing ${label} (${needle})`);
    process.exitCode = 1;
  } else out(`Gap closure ${label}: present`);
}

if (!driver.includes("Ic.Alert") && !driver.includes("Alert:")) {
  out("driver.jsx Report Problem warning icon: missing");
  process.exitCode = 1;
} else out("driver.jsx Report Problem warning icon: present");

if (!admin.includes("formatDateInput") && !admin.includes("blurDate")) {
  out("admin.jsx new-order input formatters wired: missing");
  process.exitCode = 1;
} else out("admin.jsx new-order input formatters wired: present");

if (!admin.includes("updateDriver") || !admin.includes("openEditDriver")) {
  out("admin.jsx user edit UI: missing");
  process.exitCode = 1;
} else out("admin.jsx user edit UI: present");

const staleAutheonDispatch = [
  "AUTHEON dispatch",
  "AUTHEON Disposition",
];
for (const bad of staleAutheonDispatch) {
  if (i18n.includes(bad)) {
    out(`STALE copy "${bad}" found in i18n.js`);
    process.exitCode = 1;
  }
}
if (!process.exitCode) out('Stale "AUTHEON dispatch" copy: none');

out("");
const adminNav = file("admin.jsx");
if (!adminNav.includes('t("navCustomers")')) {
  out("admin.jsx Customers nav must use t(\"navCustomers\")");
  process.exitCode = 1;
} else out("admin.jsx Customers nav label: navCustomers");

if (adminNav.includes('t("navOrdering' + 'Part' + 'ies")')) {
  out("admin.jsx must not use old customer nav key for nav/title");
  process.exitCode = 1;
} else out("admin.jsx old customer nav key usage: none");

const oldCustomerNoun = "par" + "ty";
const oldCustomerPlural = "part" + "ies";
const customerUiNeedles = [
  ['searchJobsPlaceholder: "Search tour, ordering ' + oldCustomerNoun, "EN search placeholder"],
  ['"Ordering ' + oldCustomerPlural + '"', "user-facing old customer plural string in i18n en"],
  ['customerLabel: "Ordering ' + oldCustomerNoun + '"', "EN customerLabel"],
  ['newOrderSecCustomerTitle: "Customer / client"', "EN new order section title"],
  ['adminMasterDataCustomerInUseConfirm:\n        "This ordering ' + oldCustomerNoun, "EN delete confirm copy"],
];
for (const [needle, label] of customerUiNeedles) {
  if (i18n.includes(needle)) {
    out(`Customer UI inconsistency ${label}`);
    process.exitCode = 1;
  } else out(`Customer UI consistency ${label}: ok`);
}

if (store.includes("Ordering " + oldCustomerNoun + ":")) {
  out("store.js transport PDF must label customer, not old customer wording");
  process.exitCode = 1;
} else out("store.js transport PDF customer label: ok");

const v18Needles = [
  ["dailyJobLimit", "dailyJobLimit on drivers"],
  ["getOperationalPolicies", "getOperationalPolicies API"],
  ["checkAdminCancelPolicy", "checkAdminCancelPolicy API"],
  ["checkScheduleChangePolicy", "checkScheduleChangePolicy API"],
  ["attachAdminJobDocument", "attachAdminJobDocument API"],
  ["admin_off_channel", "admin off-channel document source"],
  ["formScheduleSnapshot", "schedule change detection in saveDraft"],
  ["job_not_uploadable", "upload allowed on active tours gate"],
  ["reason_code_required", "admin cancel requires reason code"],
  ["driver_message_too_short", "admin cancel driver message validation"],
  ["AdminCancelJobModal", "admin cancel modal component"],
  ["OperationalPoliciesForm", "operational policies settings form"],
  ["newOrderSecDocuments", "admin document attach on new/edit job form"],
  ["adminUsersFieldDailyLimit", "daily job limit in users UI"],
  ["requestDailyLimitIncrease", "daily limit increase request API"],
  ["DailyLimitRequestSheet", "driver limit increase request UI"],
  ["daily_limit_override", "daily_limit_override change type"],
  ["TD-SEED-ACTIVE-001", "seed document on active tour"],
  ["const canUpload = uploadGate.ok", "driver upload UI uses active-tour gate"],
  ["getDriverDailyAcceptanceSummary", "driver daily limit summary API"],
  ["DriverDailyLimitCard", "driver profile daily limit card"],
  ["estimateDistanceFromForm", "estimate distance from new job form"],
  ["newOrderEstimateDistance", "estimate distance button on new job form"],
];
out("");
out("PRD v1.8 checks:");
for (const [needle, label] of v18Needles) {
  const inStore = store.includes(needle);
  const inAdmin = admin.includes(needle);
  const ok =
    needle === "AdminCancelJobModal" || needle === "OperationalPoliciesForm"
      ? inAdmin
      : needle === "DailyLimitRequestSheet"
        ? driver.includes(needle)
      : needle === "newOrderSecDocuments" || needle === "adminUsersFieldDailyLimit"
        ? i18n.includes(needle) && (needle === "adminUsersFieldDailyLimit" ? admin.includes("dailyJobLimit") : admin.includes("sec-07"))
      : needle === "TD-SEED-ACTIVE-001"
        ? inStore
        : needle === "const canUpload = uploadGate.ok"
          ? driver.includes(needle)
        : needle === "SameDayOverlapSheet"
          ? driver.includes(needle)
        : needle === "getDriverDailyAcceptanceSummary"
          ? inStore
        : needle === "DriverDailyLimitCard"
          ? driver.includes(needle)
        : needle === "estimateDistanceFromForm"
          ? inStore
        : needle === "newOrderEstimateDistance"
          ? admin.includes(needle) && i18n.includes(needle)
        : needle === "req-panel"
          ? driver.includes(needle)
        : inStore;
  if (!ok) {
    out(`PRD v1.8 missing ${label}`);
    process.exitCode = 1;
  } else out(`PRD v1.8 ${label}: present`);
}

if (!process.exitCode) {
  out("");
  out("AUDIT PASS");
} else {
  out("");
  out("AUDIT FAIL");
}
