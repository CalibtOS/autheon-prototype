/**
 * Loads store.js in a minimal browser shim and verifies seed invariants (PRD v1.8).
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const out = (line) => process.stdout.write(`${line}\n`);
const err = (line) => process.stderr.write(`${line}\n`);

const root = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(root, "store.js"), "utf8");

const seedWarnings = [];
class BlobPolyfill {
  constructor(parts = [], opts = {}) {
    this.parts = parts;
    this.type = opts.type || "";
    this.size = parts.reduce((n, p) => n + String(p).length, 0);
  }
}
const sandbox = {
  window: {
    AUTHEON_BRANDING_DEFAULTS: {},
    AUTHEON_FLAG_DEFAULTS: {},
  },
  Blob: BlobPolyfill,
  URL: {
    createObjectURL: () => "blob:mock",
    revokeObjectURL: () => {},
  },
  React: {
    useState: (v) => [v, () => {}],
    useEffect: () => {},
  },
  console: {
    log: () => {},
    warn: (...args) => {
      const msg = args.join(" ");
      if (msg.includes("[AUTHEON] Seed data issues")) {
        seedWarnings.push(msg);
      }
    },
  },
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const store = sandbox.window.AuthStore;
if (!store) {
  err("FAIL: AuthStore not initialized");
  process.exit(1);
}

const jobs = store.getJobs();
const docs = store.getTourDocuments();
let failed = 0;

function fail(msg) {
  err(`FAIL: ${msg}`);
  failed++;
}

function ok(msg) {
  out(`OK: ${msg}`);
}

const activeSeedDoc = docs.find((d) => d.id === "TD-SEED-ACTIVE-001");
const adminSeedDoc = docs.find((d) => d.id === "TD-SEED-ADMIN-0845");
const performedDocCount = docs.filter((d) => {
  const j = jobs.find((x) => x.id === d.jobId);
  return j?.status === "performed";
}).length;

if (docs.length !== 9) fail(`expected 9 tour documents, got ${docs.length}`);
else ok("9 tour documents (6 performed + 3 on active 0845)");

if (performedDocCount !== 6) fail(`expected 6 performed-only seed docs, got ${performedDocCount}`);
else ok("6 documents on performed job 0842");

const nonAllowedDocs = docs.filter((d) => {
  const j = jobs.find((x) => x.id === d.jobId);
  if (!j) return true;
  return !["assigned", "accepted", "empty_run_reported", "performed"].includes(j.status);
});
if (nonAllowedDocs.length)
  fail(
    `documents on disallowed job statuses: ${nonAllowedDocs.map((d) => d.id).join(", ")}`,
  );
else ok("all tour documents on upload-allowed job statuses");

const j842 = jobs.find((j) => j.id === "A-2026-00842");
if (!j842) fail("missing job A-2026-00842");
else {
  if (j842.status !== "performed") fail("0842 not performed");
  else ok("0842 is performed");
  if (j842.paymentStatus === "Paid")
    fail(`0842 paymentStatus should not be Paid (got ${j842.paymentStatus})`);
  else ok(`0842 paymentStatus=${j842.paymentStatus}`);
  if (docs.filter((d) => d.jobId === j842.id).length !== 6)
    fail("0842 should have 6 documents");
  else ok("0842 has 6 documents");
  const rejectedInvoice = docs.find(
    (d) =>
      d.jobId === j842.id &&
      d.documentType === "invoice" &&
      d.reviewStatus === "rejected",
  );
  if (!rejectedInvoice) fail("0842 missing rejected invoice seed");
  else ok("0842 has rejected invoice (TD-SEED-005)");
}

const j845 = jobs.find((j) => j.id === "A-2026-00845");
if (!activeSeedDoc || activeSeedDoc.jobId !== j845?.id)
  fail("active job 0845 must have TD-SEED-ACTIVE-001");
else ok("0845 (accepted/active) has active-tour seed document");

if (!adminSeedDoc || adminSeedDoc.jobId !== j845?.id)
  fail("active job 0845 must have TD-SEED-ADMIN-0845 admin_off_channel doc");
else ok("0845 has admin reference document (read-only for driver)");

if (!store.canDriverReplaceTourDocument(adminSeedDoc))
  ok("driver cannot replace admin_off_channel document");
else fail("canDriverReplaceTourDocument should be false for admin doc");

const j846 = jobs.find((j) => j.id === "A-2026-00846");
if (j846?.status !== "empty_run_reported")
  fail(`0846 must be empty_run_reported (got ${j846?.status})`);
else ok("0846 is empty_run_reported");
if (docs.some((d) => d.jobId === j846?.id))
  fail("empty_run_reported 0846 must have no tour documents");
else ok("0846 (empty_run_reported) has no tour documents");
if (!(j846?.emptyRunReport?.evidence || []).length)
  fail("0846 missing emptyRunReport.evidence");
else ok("0846 has empty-run evidence");

if (j845?.documentReviewSummary !== "Uploaded")
  fail(
    `0845 documentReviewSummary should be Uploaded (got ${j845?.documentReviewSummary})`,
  );
else ok("0845 documentReviewSummary is Uploaded");

const summary = store.getDriverProbationSummary();
if (
  !summary ||
  typeof summary.limit !== "number" ||
  typeof summary.performedCount !== "number"
)
  fail("getDriverProbationSummary should return limit/performedCount");
else
  ok(
    `probation summary API (performed ${summary.performedCount}/${summary.limit}, onProbation=${summary.onProbation})`,
  );

const klaus = store.getDrivers().find((d) => d.id === "DRV-0301");
if (!klaus?.probationClearedAt)
  fail("Klaus (DRV-0301) should be seed-cleared from probation");
else ok("seed has probation-cleared driver");

const blake = store.getDrivers().find((d) => d.id === "DRV-0228");
if (blake?.probationClearedAt)
  fail("Jordan Blake (DRV-0228) should remain on probation in seed");
else ok("seed has mid-probation driver");

const drivers = store.getDrivers();
if (drivers.length !== 6) fail(`expected 6 seeded drivers, got ${drivers.length}`);
else ok("six seeded drivers");

const requiredAccessFields = [
  "operationalAccess",
  "accountAccess",
  "inviteState",
  "accessRemovalDeferredAt",
];
for (const d of drivers) {
  for (const field of requiredAccessFields) {
    if (!(field in d)) fail(`${d.id} missing ${field}`);
  }
}
ok(
  "all drivers carry operationalAccess/accountAccess/inviteState/accessRemovalDeferredAt",
);

for (const d of drivers) {
  if (d.operationalAccess !== "enabled" || d.accountAccess !== "enabled") {
    fail(
      `${d.id} seed must stay fully enabled (got operational=${d.operationalAccess}, account=${d.accountAccess})`,
    );
  }
  if (d.inviteState !== "accepted") {
    fail(`${d.id} seed inviteState must be accepted (got ${d.inviteState})`);
  }
}
ok("all seeded drivers have operational+account enabled and invite accepted");

const adminList =
  typeof store.getAdmins === "function" ? store.getAdmins() : [];
for (const a of adminList) {
  if (a.accountAccess !== "enabled" || a.inviteState !== "accepted") {
    fail(
      `${a.id} seed admin must stay enabled/accepted (got account=${a.accountAccess}, invite=${a.inviteState})`,
    );
  }
}
if (adminList.length)
  ok("all seeded admins have account enabled and invite accepted");

if (typeof store.normalizeOperationalAccess !== "function")
  fail("normalizeOperationalAccess missing from store API");
else if (store.normalizeOperationalAccess("Blocked") !== "disabled")
  fail("normalizeOperationalAccess must fail closed");
else if (store.normalizeOperationalAccess("Active") !== "enabled")
  fail("normalizeOperationalAccess Active→enabled");
else ok("normalizeOperationalAccess exported and fail-closed");

const tomasJobs = store.countActiveJobsForDriver("DRV-0342");
if (tomasJobs !== 2)
  fail(`Tomas Berger should have 2 active jobs, got ${tomasJobs}`);
else ok("Tomas Berger (DRV-0342) has 2 active jobs for D6 branch B");

// D6: Branch A removes BOTH account + operational; Branch B defers account.
{
  const sweep1 = store.runInactivitySweep(new Date());
  if (!sweep1.accessRemovedIds.includes("DRV-0001"))
    fail("D6 Branch A: Dana (DRV-0001) must land in accessRemovedIds");
  if (!sweep1.accessRemovedIds.includes("DRV-0401"))
    fail("D6 Branch A: Erik (DRV-0401) must land in accessRemovedIds");
  if (!sweep1.deferredIds.includes("DRV-0342"))
    fail("D6 Branch B: Tomas (DRV-0342) must land in deferredIds");
  if (!sweep1.deferredNotifiedIds.includes("DRV-0342"))
    fail("D6 Branch B: first deferral must notify (deferredNotifiedIds)");

  const dana = store.getDrivers().find((d) => d.id === "DRV-0001");
  if (
    dana?.accountAccess !== "disabled" ||
    dana?.operationalAccess !== "disabled"
  ) {
    fail(
      `D6 Branch A must disable BOTH axes (got account=${dana?.accountAccess}, operational=${dana?.operationalAccess})`,
    );
  } else ok("D6 Branch A disables accountAccess + operationalAccess");

  const tomas = store.getDrivers().find((d) => d.id === "DRV-0342");
  if (
    tomas?.accountAccess !== "enabled" ||
    tomas?.operationalAccess !== "disabled" ||
    !tomas?.accessRemovalDeferredAt
  ) {
    fail(
      `D6 Branch B must keep account, disable operational, set deferral (got account=${tomas?.accountAccess}, operational=${tomas?.operationalAccess}, deferredAt=${tomas?.accessRemovalDeferredAt})`,
    );
  } else ok("D6 Branch B keeps accountAccess, disables operationalAccess");

  const sweep2 = store.runInactivitySweep(new Date());
  if (sweep2.deferredNotifiedIds.length !== 0)
    fail("D6 Branch B retry must not re-notify (deferredNotifiedIds empty)");
  else ok("D6 Branch B retry is silent for admin/driver notify");

  // R5: stamp must not clear inactivityWarningSentAt
  const erik = store.getDrivers().find((d) => d.id === "DRV-0401");
  // Re-enable Erik briefly to stamp; restore disabled after.
  store.setAccountAccess("driver", "DRV-0401", "enabled");
  store.setDriverOperationalAccess("DRV-0401", "enabled");
  const warnStamp = "2020-01-01T00:00:00.000Z";
  erik.inactivityWarningSentAt = warnStamp;
  store.recordDriverActivity("DRV-0401");
  const erikAfter = store.getDrivers().find((d) => d.id === "DRV-0401");
  if (erikAfter.inactivityWarningSentAt !== warnStamp)
    fail("R5: recordDriverActivity must not clear inactivityWarningSentAt");
  else ok("R5: activity stamp leaves inactivityWarningSentAt intact");
}

const created = store.addDriver({
  name: "Audit Probe Driver",
  company: "Audit Co",
  email: "audit.probe.driver@example.com",
});
if (!created.ok || !created.driver?.driverCode)
  fail("addDriver should auto-assign driverCode");
else if (!/^AU-41-\d{4}$/.test(created.driver.driverCode))
  fail(`unexpected auto driverCode ${created.driver.driverCode}`);
else if (created.driver.operationalAccess !== "disabled")
  fail("addDriver should default operationalAccess to disabled");
else if (created.driver.accountAccess !== "disabled")
  fail("addDriver should default accountAccess to disabled");
else if (created.driver.inviteState !== "pending")
  fail("addDriver should default inviteState to pending");
else ok(`auto-assigned driverCode ${created.driver.driverCode} with access defaults`);

const immutable = store.updateDriver(created.driver.id, {
  driverCode: "AU-41-9999",
});
if (immutable.ok || immutable.reason !== "driver_code_immutable")
  fail("updateDriver must reject driverCode changes");
else ok("driverCode is immutable after create");

const preview = store.getTransportOrderPreview("A-2026-00845");
if (!sandbox.window.AutheonTransportOrderPdf) {
  // Seed shim has no PDF renderer module — generation is a no-op here.
  ok("transport order preview skipped (PDF renderer not loaded in seed shim)");
} else if (
  !preview.ok ||
  !(
    preview.preview?.pdfUrl ||
    preview.preview?.blobUrl ||
    preview.preview?.previewHtml
  ) ||
  !preview.preview?.previewable
) {
  fail("getTransportOrderPreview should return in-PWA preview payload");
} else ok("transport order in-PWA preview API");

if (seedWarnings.length) {
  fail(`validateSeedData reported issues:\n${seedWarnings.join("\n")}`);
} else ok("validateSeedData reported no issues");

const gate845 = store.canDriverUploadTourDocument("A-2026-00845");
if (!gate845.ok) fail(`upload should allow active job 0845 (${gate845.reason})`);
else ok("upload allowed on active 0845");

const gate842 = store.canDriverUploadTourDocument("A-2026-00842");
if (!gate842.ok) fail(`upload should allow performed 0842 (${gate842.reason})`);
else ok("upload allowed on performed 0842");

if (failed) {
  err(`\n${failed} check(s) failed`);
  process.exit(1);
}
out("\nAll seed verification checks passed");
