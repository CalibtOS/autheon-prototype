/**
 * Loads store.js in a minimal browser shim and verifies the Storno full
 * order-editing workflow (PRD v2.4, Task 32 §7) plus the status-model
 * terminality/eligibility rules. Exits non-zero on any failed assertion.
 *
 * Run: node _verify-order-edit.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(root, "store.js"), "utf8");

const sandbox = {
  window: {
    AUTHEON_BRANDING_DEFAULTS: {},
    AUTHEON_FLAG_DEFAULTS: {},
    I18n: { t: (k) => k },
    InputFormatters: { compareTimeStrings: (a, b) => (a < b ? -1 : a > b ? 1 : 0) },
  },
  Blob: class {
    constructor() {
      this.size = 0;
    }
  },
  URL: { createObjectURL: () => "blob:mock", revokeObjectURL: () => {} },
  React: { useState: (v) => [v, () => {}], useEffect: () => {} },
  console: { log: () => {}, warn: () => {} },
};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const S = sandbox.window.AuthStore;
if (!S) {
  process.stderr.write("FAIL: AuthStore not initialized\n");
  process.exit(1);
}

let pass = 0;
let fail = 0;
const out = (s) => process.stdout.write(s + "\n");
const ok = (cond, msg) => {
  if (cond) {
    pass++;
    out(`OK: ${msg}`);
  } else {
    fail++;
    out(`FAIL: ${msg}`);
  }
};

const jobs = S.getJobs();
const booked =
  jobs.find((j) => j.status === "accepted") ||
  jobs.find((j) => j.status === "assigned");
ok(!!booked, `found a booked order (${booked && booked.id} / ${booked && booked.status})`);

// --- Edit eligibility policy (single source of truth) ---
ok(S.canAdminEditOrder(booked) === true, "canAdminEditOrder true for a booked order");
ok(S.isReadOnlyStatus("empty_run_recognised") === true, "empty_run_recognised is terminal");
ok(S.isReadOnlyStatus("empty_run_not_recognised") === true, "empty_run_not_recognised is terminal");
ok(S.isReadOnlyStatus("empty_run_reported") === false, "empty_run_reported is editable (pending review)");
ok(S.isReadOnlyStatus("cancelled_by_sp") === true, "cancelled_by_sp is terminal");
ok(S.isReadOnlyStatus("cancelled_by_autheon") === true, "cancelled_by_autheon is terminal");
ok(S.isReadOnlyStatus("performed") === true, "performed is terminal");
ok(
  ["draft", "published", "assigned", "accepted", "empty_run_reported"].every((s) => !S.isReadOnlyStatus(s)),
  "draft/published/assigned/accepted/empty_run_reported are editable",
);

const notifBefore = S.getDriverNotifications(booked.driverId).length;
const prevOffer = Number(booked.driverOffer) || 0;
const prevStatus = booked.status;

// --- §7: full non-schedule edit succeeds regardless of the schedule cutoff ---
const form = S.jobToDraftForm(booked);
form.plate = "B-XY 9999";
form.vin = "WVWZZZ1KZAW000999";
form.driverOffer = String(prevOffer + 15);
form.notesDriver = "Updated driver instructions for pickup.";
form.notes = "Internal-only note change (must NOT reach the driver)";
const r = S.updateOrderFromForm(booked.id, form);
ok(r.ok === true, `full non-schedule edit succeeds (reason=${r.reason || ""})`);
const fresh = S.getJob(booked.id);
ok(fresh.status === prevStatus, `operational status preserved (${fresh.status})`);
ok(fresh.plate === "B-XY 9999", "plate persisted");
ok(fresh.vin === "WVWZZZ1KZAW000999", "VIN persisted");
ok(fresh.driverOffer === prevOffer + 15, `driver offer persisted (${fresh.driverOffer})`);
ok(fresh.notesDriver === "Updated driver instructions for pickup.", "driver-visible notes persisted");
ok(fresh.notes === "Internal-only note change (must NOT reach the driver)", "internal notes persisted");

// --- Audit: one entry per changed field, previous -> new captured ---
const edits = S.getAuditLog().filter((a) => a.action === "order_edited");
ok(edits.length >= 4, `order_edited audit entries per changed field (${edits.length})`);
ok(edits.every((a) => /".*" → ".*"/.test(a.meta || "")), "audit meta records previous -> new value");

// --- Notification: one combined, driver-visible only (no internal leak) ---
const notifs = S.getDriverNotifications(booked.driverId);
ok(notifs.length - notifBefore === 1, `exactly one combined partner notification (${notifs.length - notifBefore})`);
const n = notifs.find((x) => x.type === "order_updated");
ok(!!n, "order_updated notification created");
ok(n && !/Internal-only note change/.test(n.body), "internal note value NOT leaked to the driver");
ok(n && /9999/.test(n.body), "driver-visible change (plate) present in notification body");

// --- No-op edit produces no changes/notification/audit ---
const r2 = S.updateOrderFromForm(booked.id, S.jobToDraftForm(fresh));
ok(r2.ok === false && r2.reason === "no_changes", "unchanged save -> no_changes (no fake diffs)");

// --- §13: schedule-cutoff gates ONLY schedule fields; override respected ---
S.setOperationalPolicies({ scheduleChangeMinHoursBeforePickupStart: 1000000, allowPolicyOverrideWithAuditNote: true });
const f3 = S.jobToDraftForm(S.getJob(booked.id));
f3.pickupTo = f3.pickupTo === "12:00" ? "13:00" : "12:00";
const r3 = S.updateOrderFromForm(booked.id, f3);
ok(r3.ok === false && r3.reason === "within_schedule_cutoff", `schedule change blocked within cutoff (reason=${r3.reason || "ok"})`);
const f4 = S.jobToDraftForm(S.getJob(booked.id));
f4.pickupTo = f3.pickupTo;
f4.scheduleOverrideNote = "Customer requested a later pickup window.";
const r4 = S.updateOrderFromForm(booked.id, f4);
ok(r4.ok === true, `schedule change allowed WITH authorized override note (reason=${r4.reason || ""})`);
S.setOperationalPolicies({ scheduleChangeMinHoursBeforePickupStart: 1 });

// --- Terminal orders are read-only ---
const performed = jobs.find((j) => j.status === "performed");
if (performed) {
  const rp = S.updateOrderFromForm(performed.id, S.jobToDraftForm(performed));
  ok(rp.ok === false && rp.reason === "read_only", "performed (terminal) order cannot be edited");
  ok(S.updateActiveOrder(performed.id, { notesDriver: "x" }).reason === "read_only", "updateActiveOrder blocks terminal order");
}

// --- updateActiveOrder primitive still routes through the shared path ---
const r5 = S.updateActiveOrder(booked.id, { notesDriver: "Primitive-path change" });
ok(r5.ok === true, "updateActiveOrder primitive still works");

// --- Terminal empty-run jobs must stay visible in the driver's My Jobs history
//     (regression: reviewEmptyRun clears the id buckets; isMineJob must still
//     recognise the empty-run terminal statuses by driver). ---
const cur = S.getCurrentDriver();
const mineActive = jobs.find(
  (j) => ["assigned", "accepted"].includes(j.status) && j.driver === (cur && cur.name),
);
if (mineActive) {
  S.reportProblemNotPerformable(
    mineActive.id,
    "not_present",
    "Vehicle not present at the pickup location at all today.",
  );
  S.reviewEmptyRun(mineActive.id, "recognised");
  const done = S.getJob(mineActive.id);
  ok(done.status === "empty_run_recognised", "empty run recognised terminal");
  ok(S.isMineJob(done) === true, "recognised empty run stays in the driver's My Jobs");
  const mine = S.getJobs().filter(S.isMineJob);
  ok(
    mine.some((j) => j.id === done.id && S.isEmptyRunTerminal(j.status)),
    "recognised empty run appears in the driver history bucket",
  );
}

out(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
out("All order-edit verification checks passed");
