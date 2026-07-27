/**
 * Domain-level verification of the vehicle model confirmed by the client
 * document "Systemlogik Fahrzeugeingabe" (PRD v2.8).
 *
 * Loads store.js in the same minimal browser shim as _verify-seed.mjs and
 * asserts the rules that must hold BELOW the UI: the red-licence-plate decision
 * matrix, the authoritative write validation and vehicle-entry constraints.
 *
 * Run: node _verify-vehicle-domain.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const out = (line) => process.stdout.write(`${line}\n`);
const err = (line) => process.stderr.write(`${line}\n`);

const root = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(root, "store.js"), "utf8");

class BlobPolyfill {
  constructor(parts = [], opts = {}) {
    this.parts = parts;
    this.type = opts.type || "";
    this.size = parts.reduce((n, p) => n + String(p).length, 0);
  }
}
const sandbox = {
  window: { AUTHEON_BRANDING_DEFAULTS: {}, AUTHEON_FLAG_DEFAULTS: {} },
  Blob: BlobPolyfill,
  URL: { createObjectURL: () => "blob:mock", revokeObjectURL: () => {} },
  React: { useState: (v) => [v, () => {}], useEffect: () => {} },
  console: { log: () => {}, warn: () => {} },
};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const S = sandbox.window.AuthStore;
if (!S) {
  err("FAIL: AuthStore not initialized");
  process.exit(1);
}

let failed = 0;
const fail = (m) => {
  err(`FAIL: ${m}`);
  failed++;
};
const ok = (m) => out(`OK: ${m}`);
const eq = (actual, expected, label) =>
  actual === expected
    ? ok(`${label} → ${JSON.stringify(actual)}`)
    : fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

const { REGISTRATION_REGISTERED: REG, REGISTRATION_DEREGISTERED: DEREG } = S;
const { TRANSPORT_TYPE_OWN_AXLE: OWN, TRANSPORT_TYPE_THIRD_PARTY_AXLE: THIRD } = S;

// =========================================================================
// 1. THE RED-LICENCE-PLATE DECISION MATRIX (complete, all four cases)
// =========================================================================
out("\n— Red-licence-plate decision matrix —");
eq(S.requiresRedLicencePlates(REG, OWN), false, "1. registered + own axle → no warning");
eq(S.requiresRedLicencePlates(REG, THIRD), false, "2. registered + third-party axle → no warning");
eq(S.requiresRedLicencePlates(DEREG, OWN), true, "3. deregistered + own axle → WARNING");
eq(S.requiresRedLicencePlates(DEREG, THIRD), false, "4. deregistered + third-party axle → no warning");

// The rule must be true for exactly ONE of the four combinations.
const trueCases = [REG, DEREG].flatMap((r) =>
  [OWN, THIRD].map((t) => (S.requiresRedLicencePlates(r, t) ? `${r}+${t}` : null)),
).filter(Boolean);
eq(trueCases.length, 1, "exactly one combination requires red plates");
eq(trueCases[0], `${DEREG}+${OWN}`, "the only true case is deregistered + own axle");

// Registration status and transport type are INDEPENDENT: neither is inferred
// from the other, and an unspecified status never guesses a warning.
eq(S.requiresRedLicencePlates(null, OWN), false, "null registration + own axle → no warning (never guessed)");
eq(S.requiresRedLicencePlates("", OWN), false, "empty registration + own axle → no warning");
eq(S.normalizeRegistrationStatus("nonsense"), null, "unknown registration status → null, not defaulted");

// Only the canonical transport-type values drive the decision.
eq(S.requiresRedLicencePlates(DEREG, OWN), true, "canonical own_axle → WARNING");
eq(S.requiresRedLicencePlates(DEREG, THIRD), false, "canonical third_party_axle → no warning");

// =========================================================================
// 2. DERIVED VALUE IS NOT CLIENT-WRITABLE
// =========================================================================
out("\n— Derived value is read-only —");
for (const banned of ["redPlates", "redPlateNumber", "redLicencePlateNumber", "requiresRedLicencePlates"]) {
  const r = S.validateVehicleForm({
    vehicleType: S.VEHICLE_TYPE_PASSENGER_CAR,
    manufacturer: "Audi",
    model: "A4",
    plate: "M-AB 1234",
    vin: "WAUZZZ4M5KA000001",
    transportType: OWN,
    registrationStatus: REG,
    [banned]: banned === "requiresRedLicencePlates" ? true : "HH-06 2440",
  });
  const rejected = !r.ok && r.errors.some((e) => e.field === banned && e.reason === "not_writable");
  rejected
    ? ok(`write of "${banned}" rejected as not_writable`)
    : fail(`write of "${banned}" was NOT rejected`);
}

// Every seeded job's derived flag must equal the policy — it cannot drift.
const jobs = S.getJobs();
const drifted = jobs.filter(
  (j) => j.requiresRedLicencePlates !== S.requiresRedLicencePlates(j.registrationStatus, j.transportType),
);
eq(drifted.length, 0, "no seeded job's derived flag has drifted from the policy");

// The retired manual inputs must not exist on any record.
const retired = jobs.filter((j) => "redPlates" in j || "redPlateNumber" in j);
eq(retired.length, 0, "no record carries the retired redPlates / redPlateNumber fields");

// =========================================================================
// 3. VEHICLE ENTRY RULES
// =========================================================================
out("\n— Vehicle entry —");
eq(S.selectableVehicleTypes().length, 3, "exactly three vehicle types are selectable");
eq(
  S.selectableVehicleTypes().join(","),
  [S.VEHICLE_TYPE_PASSENGER_CAR, S.VEHICLE_TYPE_TRUCK_UP_TO_7_5_T, S.VEHICLE_TYPE_TRUCK_OVER_7_5_T].join(","),
  "the three approved vehicle types",
);

const baseForm = {
  vehicleType: S.VEHICLE_TYPE_PASSENGER_CAR,
  manufacturer: "Audi",
  model: "A4",
  plate: "M-AB 1234",
  vin: "WAUZZZ4M5KA000001",
  transportType: OWN,
  registrationStatus: REG,
};
eq(S.validateVehicleForm(baseForm).ok, true, "a complete approved form validates");

// Any value outside the three approved types is rejected.
for (const removed of ["SUV", "Van", "Transporter", "Oldtimer", "Classic", "Light truck <3.5t", "LKW < 3,5t", "PKW", "Car"]) {
  const r = S.validateVehicleForm({ ...baseForm, vehicleType: removed });
  const rejected = !r.ok && r.errors.some((e) => e.field === "vehicleType" && e.reason === "removed_vehicle_type");
  rejected
    ? ok(`removed vehicle type "${removed}" rejected`)
    : fail(`removed vehicle type "${removed}" was accepted`);
}

// Manufacturer and model are separate required fields.
eq(S.validateVehicleForm({ ...baseForm, manufacturer: "" }).ok, false, "missing manufacturer rejected");
eq(S.validateVehicleForm({ ...baseForm, model: "" }).ok, false, "missing model rejected");

// VIN: exactly 17 characters.
eq(S.VIN_LENGTH, 17, "VIN length constant");
eq(S.isValidVin("WAUZZZ4M5KA000001"), true, "17-character VIN accepted");
eq(S.isValidVin("WAUZZZ4M5KA00000"), false, "16-character VIN rejected (too short)");
eq(S.isValidVin("WAUZZZ4M5KA0000012"), false, "18-character VIN rejected (too long)");
eq(S.isValidVin(""), false, "empty VIN rejected");
eq(
  S.validateVehicleForm({ ...baseForm, vin: "SHORT" }).errors.some((e) => e.reason === "vin_length"),
  true,
  "short VIN rejected by the authoritative validator",
);

// Official licence plate stays usable for a DEREGISTERED vehicle.
eq(
  S.validateVehicleForm({ ...baseForm, registrationStatus: DEREG, plate: "HH-XY 1234" }).ok,
  true,
  "official plate ACCEPTED for a deregistered vehicle",
);
eq(
  S.validateVehicleForm({ ...baseForm, registrationStatus: DEREG, plate: "" }).ok,
  true,
  "official plate optional for a deregistered vehicle",
);
eq(
  S.validateVehicleForm({ ...baseForm, registrationStatus: REG, plate: "" }).ok,
  false,
  "official plate required while registered",
);

// Registration status must be stated explicitly — never inferred.
eq(
  S.validateVehicleForm({ ...baseForm, registrationStatus: "" }).errors.some(
    (e) => e.field === "registrationStatus",
  ),
  true,
  "missing registration status rejected (explicit category)",
);

// Transport type is independent of registration status: all four combinations
// are valid input, only the derived warning differs.
for (const reg of [REG, DEREG]) {
  for (const tt of [OWN, THIRD]) {
    eq(
      S.validateVehicleForm({ ...baseForm, registrationStatus: reg, transportType: tt }).ok,
      true,
      `${reg} + ${tt} is a valid combination (independence)`,
    );
  }
}

// Ready-to-drive applicability is advisory only.
eq(S.isReadyToDriveApplicable(THIRD), true, "ready-to-drive applicable on third-party axle");
eq(S.isReadyToDriveApplicable(OWN), false, "ready-to-drive not emphasised on own axle");
eq(
  S.validateVehicleForm({ ...baseForm, transportType: OWN, readyToDrive: true }).ok,
  true,
  "ready-to-drive may be set even when not applicable (never forced or cleared)",
);

// =========================================================================
// 4. NO SILENT DATA LOSS ON A ROUND-TRIP
// =========================================================================
out("\n— Form round-trip preserves every category —");
const j845 = jobs.find((j) => j.id === "A-2026-00845");
const form = S.jobToDraftForm(j845);
eq(form.vehicleType, j845.vehicleType, "round-trip preserves vehicleType");
eq(form.manufacturer, j845.manufacturer, "round-trip preserves manufacturer (separate field)");
eq(form.model, j845.vehicleModel, "round-trip preserves model (separate field)");
eq(form.plate, j845.plate, "round-trip preserves official plate");
eq(form.vin, j845.vin, "round-trip preserves VIN");
eq(form.transportType, j845.transportType, "round-trip preserves transportType");
eq(form.registrationStatus, j845.registrationStatus, "round-trip preserves registrationStatus");
eq(form.readyToDrive, j845.readyToDrive, "round-trip preserves readyToDrive (no silent loss)");
eq("redPlateNumber" in form, false, "round-trip form carries NO red-plate number");
eq("redPlates" in form, false, "round-trip form carries NO red-plates flag");
eq("legacyVehicleType" in form, false, "round-trip form carries no removed-type escape hatch");


// =========================================================================
// 5. ONLY THE APPROVED VALUES EXIST
// =========================================================================
out("\n— Strict approved-value domain —");
// Every non-approved value normalizes to "" so it can never be stored.
for (const removed of ["SUV", "Van", "Transporter", "Oldtimer", "Classic", "Light truck <3.5t", "LKW < 3,5t", "PKW", "Car"]) {
  eq(S.normalizeVehicleType(removed), "", `"${removed}" does not resolve to a storable value`);
  eq(S.isAcceptableVehicleTypeForWrite(removed), false, `"${removed}" is not writable`);
}
for (const approved of S.VEHICLE_TYPES) {
  eq(S.normalizeVehicleType(approved), approved, `"${approved}" resolves to itself`);
  eq(S.isAcceptableVehicleTypeForWrite(approved), true, `"${approved}" is writable`);
}

// Labels resolve for approved values and degrade safely otherwise.
const label = (v) => S.vehicleTypeLabel(v, (k) => k);
eq(label(S.VEHICLE_TYPE_TRUCK_OVER_7_5_T), "vehicleTypeTruckOver75t", "approved value renders its own key");
eq(label("SUV"), "—", "unknown value renders a placeholder, not a crash");
eq(label(""), "—", "empty vehicle type renders a placeholder, not a crash");
eq(label(undefined), "—", "undefined vehicle type renders a placeholder, not a crash");

// Every seeded job holds an approved value — no preserved historical values.
const nonApproved = jobs.filter((j) => !S.VEHICLE_TYPES.includes(j.vehicleType));
eq(nonApproved.length, 0, "every seeded job holds an approved vehicle type");
// Registration status is always explicit — never null/unspecified.
const noStatus = jobs.filter((j) => !S.REGISTRATION_STATUSES.includes(j.registrationStatus));
eq(noStatus.length, 0, "every seeded job has an explicit registration status");
// No record carries any retired red-plate field.
const redPlateFields = jobs.filter(
  (j) => "redPlates" in j || "redPlateNumber" in j || "legacyRedPlateNumber" in j,
);
eq(redPlateFields.length, 0, "no record carries any red-plate field");
// The deprecated aliases are gone.
const aliased = jobs.filter((j) => "vehicle" in j || "axle" in j);
eq(aliased.length, 0, "no record carries the deprecated vehicle/axle aliases");

// Filter preferences degrade an unrecognised value to "All".
const prefs = S.normalizeDriverPrefs({ vehicleType: "SUV", transportType: "Eigenachse" });
eq(prefs.vehicleType, "All", "unrecognised vehicle type in a pref degrades to All");
eq(prefs.transportType, "All", "unrecognised transport type in a pref degrades to All");

// =========================================================================
// 6. CANONICAL VALUES ONLY
// =========================================================================
out("\n— Canonical values —");
eq("vehicle" in j845, false, "no deprecated job.vehicle alias");
eq("axle" in j845, false, "no deprecated job.axle alias");
for (const t of S.TRANSPORT_TYPES) {
  eq(S.normalizeTransportType(t), t, `transport type "${t}" resolves to itself`);
}
eq(S.normalizeTransportType("Eigenachse"), OWN, "unrecognised transport type falls back to own_axle");
eq(S.normalizeTransportType("nonsense"), OWN, "unknown transport type falls back to own_axle");

// =========================================================================
// 7. ALL FOUR MATRIX CASES ARE REPRESENTED IN THE SEED
// =========================================================================
out("\n— Seed covers the full matrix —");
const seen = new Set(
  jobs
    .filter((j) => j.registrationStatus)
    .map((j) => `${j.registrationStatus}+${j.transportType}`),
);
for (const c of [`${REG}+${OWN}`, `${REG}+${THIRD}`, `${DEREG}+${OWN}`, `${DEREG}+${THIRD}`]) {
  seen.has(c) ? ok(`seed covers ${c}`) : fail(`seed is missing matrix case ${c}`);
}
const warned = jobs.filter((j) => j.requiresRedLicencePlates);
warned.length >= 2
  ? ok(`${warned.length} seeded jobs require red plates (${warned.map((j) => j.id).join(", ")})`)
  : fail("expected at least two seeded jobs requiring red plates (marketplace + booked)");
// The warning must survive booking: at least one non-draft/published job.
warned.some((j) => ["assigned", "accepted", "performed"].includes(j.status))
  ? ok("a BOOKED job requires red plates (warning must survive booking)")
  : fail("no booked job requires red plates — post-booking visibility is untested");

// =========================================================================
// 8. DOWNSTREAM OUTPUTS
// =========================================================================
out("\n— Downstream outputs —");
const csv = S.exportJobsCsv();
const header = csv.split("\n")[0];
for (const col of [
  "vehicleType", "manufacturer", "vehicleModel", "licencePlate", "vin",
  "transportType", "registrationStatus", "electricVehicle", "readyToDrive",
  "requiresRedLicencePlates",
]) {
  header.includes(col) ? ok(`CSV exposes ${col}`) : fail(`CSV missing column ${col}`);
}
for (const gone of ["redPlate", "axle"]) {
  header.toLowerCase().includes(gone.toLowerCase())
    ? fail(`CSV still exposes retired/renamed column containing "${gone}"`)
    : ok(`CSV no longer exposes "${gone}"`);
}
const summaryWarn = S.transportOrderText("A-2026-00844");
summaryWarn.includes("Rote Kennzeichen erforderlich")
  ? ok("order summary carries the red-plate requirement for a deregistered own-axle tour")
  : fail("order summary is missing the red-plate requirement");
/[0-9]{2}-06 [0-9]{4}/.test(summaryWarn)
  ? fail("order summary leaks a red-plate NUMBER")
  : ok("order summary does NOT leak a red-plate number");
const summaryNoWarn = S.transportOrderText("A-2026-00840"); // deregistered + third-party
summaryNoWarn.includes("Rote Kennzeichen erforderlich")
  ? fail("order summary shows the red-plate requirement for deregistered + third-party axle")
  : ok("order summary omits the requirement for deregistered + third-party axle");

// =========================================================================
if (failed) {
  err(`\n${failed} check(s) failed`);
  process.exit(1);
}
out("\nAll vehicle-domain verification checks passed");
