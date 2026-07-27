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
const tRe = /\bt\(\s*["']([a-zA-Z0-9_.]+)["']/g;
let tm;
while ((tm = tRe.exec(driver))) used.add(tm[1]);

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

const lines = [
  `# Driver PWA — i18n Key Index`,
  ``,
  `> Auto-generated from \`i18n.js\` + t() usage in \`driver.jsx\`, \`driver-ui.jsx\` and the shared`,
  `> vehicle-domain label resolvers in \`store.js\`.`,
  `> Regenerate: \`node prototype/project/_export-driver-i18n.mjs\``,
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
