/**
 * Domain-level verification of the vehicle model confirmed by the client
 * document "Systemlogik Fahrzeugeingabe" (PRD v2.7).
 *
 * Loads store.js in the same minimal browser shim as _verify-seed.mjs and
 * asserts the rules that must hold BELOW the UI: the red-licence-plate decision
 * matrix, the authoritative write validation, vehicle-entry constraints, and
 * legacy-data safety.
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

// Legacy spellings of the old axle field must resolve to the same decision.
for (const legacy of ["driven on own wheels", "Own axle", "Eigenachse"]) {
  eq(S.requiresRedLicencePlates(DEREG, legacy), true, `legacy own-axle spelling "${legacy}" → WARNING`);
}
for (const legacy of ["third-party axle", "Third-party axle", "Fremdachse"]) {
  eq(S.requiresRedLicencePlates(DEREG, legacy), false, `legacy third-party spelling "${legacy}" → no warning`);
}

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

// Removed vehicle types are unavailable for NEW records.
for (const removed of ["SUV", "Van", "Transporter", "Oldtimer", "Classic", "Light truck <3.5t", "LKW < 3,5t"]) {
  const r = S.validateVehicleForm({ ...baseForm, vehicleType: removed });
  const rejected = !r.ok && r.errors.some((e) => e.field === "vehicleType" && e.reason === "removed_vehicle_type");
  rejected
    ? ok(`removed vehicle type "${removed}" rejected for a new record`)
    : fail(`removed vehicle type "${removed}" was accepted for a new record`);
  // …but it stays acceptable while editing the record that already holds it.
  eq(
    S.validateVehicleForm({ ...baseForm, vehicleType: removed }, removed).ok,
    true,
    `legacy "${removed}" still writable on its OWN record (edit preservation)`,
  );
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

// A legacy record exposes its own value so an edit does not force a remap.
const legacyJob = jobs.find((j) => S.isLegacyVehicleType(j.vehicleType));
if (!legacyJob) fail("expected at least one legacy vehicle-type fixture in the seed");
else {
  const lf = S.jobToDraftForm(legacyJob);
  eq(lf.legacyVehicleType, legacyJob.vehicleType, `legacy record ${legacyJob.id} exposes its own type for edit`);
}

// =========================================================================
// 5. LEGACY DATA SAFETY
// =========================================================================
out("\n— Legacy data —");
// Removed values are preserved VERBATIM — never remapped.
for (const removed of ["SUV", "Van", "Transporter", "Oldtimer", "Classic", "Light truck <3.5t", "LKW < 3,5t"]) {
  eq(S.normalizeVehicleType(removed), removed, `"${removed}" preserved verbatim (no remap)`);
  eq(S.isLegacyVehicleType(removed), true, `"${removed}" reported as legacy`);
}
// The ONE approved rename: a label rename of a retained option.
eq(S.normalizeVehicleType("PKW"), S.VEHICLE_TYPE_PASSENGER_CAR, 'the one rename: "PKW" → passenger_car');
eq(S.normalizeVehicleType("Car"), S.VEHICLE_TYPE_PASSENGER_CAR, 'the one rename: "Car" → passenger_car');
eq(S.isLegacyVehicleType(S.VEHICLE_TYPE_PASSENGER_CAR), false, "passenger_car is not legacy");

// Legacy records must render safely (a label always resolves, never throws).
const label = (v) => S.vehicleTypeLabel(v, (k, p) => (p ? `${k}:${p.value}` : k));
eq(label("SUV"), "vehicleTypeLegacy:SUV", "legacy value renders through the (legacy) template");
eq(label(S.VEHICLE_TYPE_TRUCK_OVER_7_5_T), "vehicleTypeTruckOver75t", "approved value renders its own key");
eq(label(""), "—", "empty vehicle type renders a placeholder, not a crash");
eq(label(undefined), "—", "undefined vehicle type renders a placeholder, not a crash");

// Historical red-plate numbers are preserved for audit but never active.
const j844 = jobs.find((j) => j.id === "A-2026-00844");
eq(j844.legacyRedPlateNumber, "HH-06 2440", "historical red-plate number preserved under its legacy name");
eq("redPlateNumber" in j844, false, "historical record no longer carries the active red-plate field");
eq("redPlateNumber" in S.jobToDraftForm(j844), false, "old red-plate data does not leak into the entry form");

// Filter preferences degrade a removed value to "All" rather than filtering
// the whole marketplace away.
const prefs = S.normalizeDriverPrefs({ vehicle: "SUV", axle: "Eigenachse" });
eq(prefs.vehicleType, "All", "removed vehicle type in a stored pref degrades to All");
eq(prefs.transportType, OWN, "deprecated axle pref name maps to the canonical transportType");

// =========================================================================
// 6. COMPATIBILITY BOUNDARY + DEPRECATED ALIASES
// =========================================================================
out("\n— Compatibility boundary —");
eq(j845.vehicle, j845.vehicleType, "deprecated job.vehicle alias mirrors vehicleType");
eq(j845.axle, j845.transportType, "deprecated job.axle alias mirrors transportType");
eq(S.normalizeTransportType("driven on own wheels"), OWN, "legacy axle value maps at the boundary");
eq(S.normalizeTransportType("Fremdachse"), THIRD, "German axle value maps at the boundary");
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
// Legacy fixtures present.
const legacyFixtures = jobs.filter((j) => S.isLegacyVehicleType(j.vehicleType));
legacyFixtures.length >= 1
  ? ok(`${legacyFixtures.length} legacy vehicle-type fixture(s): ${legacyFixtures.map((j) => `${j.id}=${j.vehicleType}`).join(", ")}`)
  : fail("no legacy vehicle-type fixture in the seed");

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
summaryWarn.includes("HH-06 2440")
  ? fail("order summary leaks the historical red-plate NUMBER")
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
