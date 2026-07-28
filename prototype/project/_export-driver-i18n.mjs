/**
 * Export driver-relevant i18n keys for autheon-fe handoff.
 * Run: node _export-driver-i18n.mjs > ../../docs/design/driver-i18n-index.md
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const i18n = fs.readFileSync(path.join(root, "i18n.js"), "utf8");
// Driver-facing copy now comes from three places: driver.jsx itself, the shared
// primitives in driver-ui.jsx (e.g. RedPlatesRequiredNotice), and the shared
// vehicle-domain label resolvers in store.js (vehicleTypeLabel /
// transportTypeLabel / registrationStatusLabel), which map a canonical value to
// an i18n key so the Driver PWA and Admin Backend cannot disagree. All three are
// scanned so keys reaching the driver via a shared resolver are not missed.
const driver = [
  fs.readFileSync(path.join(root, "driver.jsx"), "utf8"),
  fs.readFileSync(path.join(root, "driver-ui.jsx"), "utf8"),
  vehicleDomainKeySource(fs.readFileSync(path.join(root, "store.js"), "utf8")),
].join("\n");

/**
 * Extract the i18n keys the shared vehicle-domain resolvers can emit, as
 * synthetic t("key") calls so the scanner below picks them up.
 */
function vehicleDomainKeySource(store) {
  const start = store.indexOf("const VEHICLE_TYPE_I18N");
  const end = store.indexOf("function log(");
  if (start < 0 || end < 0) return "";
  const block = store.slice(start, end);
  const keys = new Set();
  // Values of the *_I18N maps, plus keys passed directly to the resolvers.
  for (const m of block.matchAll(/:\s*"([a-zA-Z][a-zA-Z0-9_]*)"/g)) keys.add(m[1]);
  for (const m of block.matchAll(/tr\(\s*"([a-zA-Z][a-zA-Z0-9_]*)"/g)) keys.add(m[1]);
  return [...keys].map((k) => `t("${k}")`).join("\n");
}

function localeBlock(marker, endMarker) {
  const i = i18n.indexOf(marker);
  const j = i18n.indexOf(endMarker, i + marker.length);
  return i18n.slice(i + marker.length, j);
}

function parseKeys(block) {
  const keys = {};
  const re = /^\s{6}([a-zA-Z_][a-zA-Z0-9_]*):\s*"((?:\\.|[^"\\])*)"/gm;
  let m;
  while ((m = re.exec(block))) keys[m[1]] = m[2];
  return keys;
}

const en = parseKeys(localeBlock("en: {", "de: {"));
const de = parseKeys(localeBlock("de: {", "\n  };"));

const used = new Set();
const tRe = /(?<![A-Za-z0-9_])t\(\s*["']([a-zA-Z0-9_.]+)["']/g;
let tm;
while ((tm = tRe.exec(driver))) used.add(tm[1]);

// tPlural("key", count) resolves key_one / key_other at runtime — record both
// forms so pluralized messages are not reported as unused.
const tPluralRe = /\btPlural\(\s*["']([a-zA-Z0-9_.]+)["']/g;
let pm;
while ((pm = tPluralRe.exec(driver))) {
  used.add(`${pm[1]}_one`);
  used.add(`${pm[1]}_other`);
}

const keys = [...used].filter((k) => !k.includes(".")).sort();

// Keys the shared primary-screen header depends on. Called out explicitly
// because a header regression is easy to introduce by deleting a "title" key
// that looks unused. Kept in the generator so it survives regeneration.
const HEADER_SECTION = [
  `## Primary-screen header keys`,
  ``,
  `The four primary screens share one header component (\`DriverScreenHeader\`, see`,
  `[\`driver-screen-spec.md\`](driver-screen-spec.md)). These keys are the header's contract —`,
  `every one of them is load-bearing:`,
  ``,
  `| Screen | Title key | Subtitle key |`,
  `|--------|-----------|--------------|`,
  `| Marketplace | \`marketplace\` | \`exploreJobs\` |`,
  `| My Orders | \`myJobs\` | \`myJobsSubtitle\` |`,
  `| Infopoint | \`infopoint\` | \`infopointSubtitle\` |`,
  `| Profile | \`profileTitle\` | \`profileSubtitle\` |`,
  ``,
  `**Notification action (all four screens):** \`driverNotifications\` is the translated accessible`,
  `name of the header notification button. When the unread count is > 0 the component renders`,
  `\`\` \`${'${driverNotifications}'} (${'${count}'})\` \`\` — e.g. "Notifications (3)" / "Benachrichtigungen (3)" —`,
  `so the unread count reaches screen readers as text and the visual badge is never the only signal.`,
  `Do not remove or repurpose this key, and keep any translation short enough to stay legible as a`,
  `button label.`,
  ``,
  `## Marketplace filter keys`,
  ``,
  `**Languages:** the Driver PWA ships **English (\`en\`)** and **German (\`de\`)** only. Every key`,
  `below exists in both; \`de\` is the client-facing locale.`,
  ``,
  `| Key | Used for |`,
  `|-----|----------|`,
  `| \`filters\` | Filter panel heading, and the filter button's accessible name when **no** filters are applied |`,
  `| \`filtersApplied_one\` / \`filtersApplied_other\` | Filter button's accessible name when filters ARE applied — resolved by \`tPlural("filtersApplied", count)\` |`,
  `| \`reset\` | Clears the draft selections inside the open filter panel |`,
  `| \`showResults\` | Filter panel's apply CTA — \`{count}\` here is the number of **matching orders**, not the filter count |`,
  `| \`removeFilterChip\` | Accessible name of each removable applied-filter chip |`,
  ``,
  `### Pluralization`,
  ``,
  `\`t()\` interpolates \`{token}\` but has no plural support. \`tPlural(key, count, vars?)\``,
  `(added 2026-07-27, \`i18n.js\`) resolves \`<key>_one\` / \`<key>_other\` and injects \`{count}\`.`,
  `Both driver locales have simple one/other plural categories, so two forms are sufficient.`,
  ``,
  `Whole sentences live in the translation files — components must **not** concatenate fragments`,
  `(\`count + " filters applied"\`), because German word order differs and concatenation cannot be`,
  `translated. Correct usage:`,
  ``,
  '```js',
  `aria-label={count ? tPlural("filtersApplied", count) : t("filters")}`,
  '```',
  ``,
  `| Count | EN | DE |`,
  `|-------|----|----|`,
  `| 0 | Filters | Filter |`,
  `| 1 | Filters, 1 applied | Filter, 1 aktiv |`,
  `| 3 | Filters, 3 applied | Filter, 3 aktiv |`,
  ``,
  `> The badge itself is \`aria-hidden\`; this accessible name is the only thing assistive tech`,
  `> announces, so the count must stay inside it.`,
  ``,
  `---`,
  ``,
  `### Deprecated / removed`,
  ``,
  `| Key | Status | Reason |`,
  `|-----|--------|--------|`,
  `| \`welcomeBack\` | **Removed 2026-07-26** (EN + DE) | The Marketplace greeting block (avatar + "Welcome back," + driver name) was removed by client decision and was not relocated. The key had no other consumer. |`,
  `| \`kpiAvailableJobs\`, \`kpiBookedJobs\`, \`kpiOpenDocuments\` | **Orphaned** — still defined in \`i18n.js\`, not referenced by any \`t()\` | The Marketplace KPI chip row is not currently rendered. Retained pending a client decision on whether the row returns; see audit item 22. |`,
  ``,
  `---`,
  ``,
];

const DOCUMENT_UPLOAD_SECTION = [
  `## Document upload (source selection, 2026-07-27)`,
  ``,
  `The upload-source action sheet and the document rows use these keys. Where a concept already had a key,`,
  `it was reused rather than duplicated.`,
  ``,
  `| Concept | Key | Note |`,
  `|---------|-----|------|`,
  `| Add document (sheet title) | \`uploadSourceTitle\` | new |`,
  `| Take photo | \`uploadSourcePhoto\` | new |`,
  `| Camera (photo action description) | \`uploadSourcePhotoDesc\` | new |`,
  `| Choose file | \`uploadSourceFile\` | new |`,
  `| Select PDF or image from device | \`uploadSourceFileDesc\` | new |`,
  `| Unsupported file type | \`invoiceUploadInvalidType\` | existing, reused |`,
  `| File too large | \`invoiceUploadTooLarge\` | new — mirrors the advertised 25 MB limit |`,
  `| PDF document (accessible file kind) | \`docKindPdf\` (+ \`docKindImage\`, \`docKindFile\`) | new — the extension badge is decorative, so the kind is also exposed as text |`,
  `| Upload failed | reason-specific keys via \`tourDocUploadErrorMessage()\`: \`invoiceUploadInvalidType\`, \`invoiceUploadTooLarge\`, \`invoiceUploadRestricted\`, \`invoiceUploadNotYourTour\`, \`invoiceUploadTourRequired\`, \`tourDocRequiresPerformed\`, \`tourDocReplaceNotAllowed\`, \`tourDocReplaceNotOwner\`, \`tourDocOfficialNotReplaceable\` | existing — there is deliberately no generic "upload failed" string; the driver always gets the actual reason |`,
  `| Upload in progress | — | **no key**: the prototype store commits the attachment synchronously, so there is no progress state to label. Add one only when a real async upload lands |`,
  `| Remove document | \`removeDocTitle\`, \`removeDocBody\`, \`removeDocConfirm\`, \`removeDocBlocked\` | existing, reused |`,
  `| Replace document | \`tourDocReplaceButton\`, \`tourDocReplaceNotAllowed\`, \`tourDocReplaceNotOwner\` | existing, reused |`,
  `| Upload succeeded | \`tourDocUploadSuccess\` | existing, reused |`,
  `| Size/type hints on the dropzone | \`performedUploadHintEmpty\`, \`myDocsUploadHint\` | existing — must stay in sync with the enforced 25 MB limit |`,
  ``,
  `---`,
  ``,
];

const lines = [
  `# Driver PWA — i18n Key Index`,
  ``,
  `> Auto-generated from \`i18n.js\` + t() usage in \`driver.jsx\`, \`driver-ui.jsx\` and the shared`,
  `> vehicle-domain label resolvers in \`store.js\`.`,
  `> Regenerate: \`node prototype/project/_export-driver-i18n.mjs\``,
  ``,
  `Supported languages: **EN** and **DE**. Every driver-facing string is looked up through \`t()\`;`,
  `no language literal belongs in a component. Pluralized accessible names use \`tPlural(key, count)\``,
  `(resolving \`<key>_one\` / \`<key>_other\`) — see Marketplace filter keys below.`,
  ``,
  `## Vehicle domain (client confirmation "Systemlogik Fahrzeugeingabe", 2026-07-26)`,
  ``,
  `Canonical value → key mapping. Labels are **never** hardcoded in a component; the`,
  `resolvers \`AuthStore.vehicleTypeLabel\` / \`transportTypeLabel\` /`,
  `\`registrationStatusLabel\` own this mapping for both apps.`,
  ``,
  `| Category | Canonical value | Key |`,
  `|---|---|---|`,
  `| Vehicle type (exactly one) | \`passenger_car\` | \`vehicleTypePassengerCar\` |`,
  `| Vehicle type | \`truck_up_to_7_5_t\` | \`vehicleTypeTruckUpTo75t\` |`,
  `| Vehicle type | \`truck_over_7_5_t\` | \`vehicleTypeTruckOver75t\` |`,
  `| Transport type (exactly one) | \`own_axle\` | \`ownAxle\` |`,
  `| Transport type | \`third_party_axle\` | \`thirdPartyAxle\` |`,
  `| Registration status (exactly one) | \`registered\` | \`vehicleInfoRegistered\` |`,
  `| Registration status | \`deregistered\` | \`vehicleInfoDeregistered\` |`,
  `| Characteristic (independent) | \`electricVehicle\` | \`vehicleInfoElectric\` |`,
  `| Characteristic (independent) | \`readyToDrive\` | \`vehicleReadyToDrive\` (+ \`vehicleReadyToDriveApplicability\`) |`,
  `| Derived requirement | \`requiresRedLicencePlates === true\` | \`redPlatesRequired\` (+ \`redPlatesRequiredDetail\`) |`,
  ``,
  `Field labels: \`vehicleType\` · \`manufacturer\` (+ \`manufacturerPh\`) · \`newOrderModel\` ·`,
  `\`officialLicencePlate\` (+ \`officialLicencePlateHint\`) · \`vin\` (+ \`newOrderVinLen\`,`,
  `\`newOrderVinLengthError\`) · \`transportType\` · \`registrationStatus\` ·`,
  `\`vehicleCharacteristics\`.`,
  ``,
  `**Deprecated / removed 2026-07-26** (confirmed unused before removal — no \`t()\``,
  `reference remained in \`admin.jsx\`, \`driver.jsx\`, \`driver-ui.jsx\` or \`store.js\`):`,
  `\`axle\`, \`axleConfiguration\`, \`orderFieldAxle\` (→ \`orderFieldTransportType\`),`,
  `\`vehicleInfoRedPlates\`, \`redPlateNumber\`, \`orderFieldRedPlates\`,`,
  `\`orderFieldRedPlateNumber\`, \`newOrderRedPlatePh\`, \`newOrderRedPlateHint\`,`,
  `\`newOrderPlateHiddenDeregistered\`, \`newOrderRegistrationNone\`,`,
  `\`newOrderRegistrationLabel\`, \`newOrderVtSuv\`, \`newOrderVtPkw\`,`,
  `\`newOrderVtTransporter\`, \`newOrderVtClassic\`, \`lightTruck\`, \`adminVehicleTrp\`,`,
  `\`newOrderVinShortNotice\`, \`newOrderBrand\`, \`newOrderBrandPh\`,`,
  `\`vehicleTypeLegacy\`, \`vehicleTypeLegacyHint\`.`,
  `Removed vehicle types have no key at all — they are not storable values.`,
  ``,
  `---`,
  ``,
  ...HEADER_SECTION,
  ...DOCUMENT_UPLOAD_SECTION,
  `## All driver keys in use`,
  ``,
  `| Key | EN | DE |`,
  `|-----|----|----|`,
];
for (const k of keys) {
  const enVal = (en[k] || "—").replace(/\|/g, "\\|");
  const deVal = (de[k] || "—").replace(/\|/g, "\\|");
  lines.push(`| \`${k}\` | ${enVal} | ${deVal} |`);
}

const outPath = path.join(root, "..", "..", "docs", "design", "driver-i18n-index.md");
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
process.stdout.write(`Wrote ${outPath} (${keys.length} keys)\n`);
