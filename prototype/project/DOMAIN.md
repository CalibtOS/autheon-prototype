# AUTHEON prototype — domain glossary

Canonical spec: [`../../docs/requirements/prd.json`](../../docs/requirements/prd.json) (currently PRD v2.35). This file explains terms used in the static prototype (`store.js`, admin, driver).

Partner/staff access axes are governed by
[`../../../tasks/status-consolidation-decision-brief.md`](../../../tasks/status-consolidation-decision-brief.md)
(status consolidation). DB draft:
[`../../docs/database/schema.dbml`](../../docs/database/schema.dbml).

## Partner / staff access (status consolidation)

Two binary axes + invite lifecycle — **not** the old TitleCase `status` /
`accountStatus` enum:

| Field (prototype `store.js`) | Values | Meaning |
| ---------------------------- | ------ | ------- |
| `operationalAccess` | `enabled` \| `disabled` | Marketplace / assignment eligibility (drivers only) |
| `accountAccess` | `enabled` \| `disabled` | Login access (drivers and admins) — the **user** axis |
| `inviteState` | `pending` \| `failed` \| `accepted` | Onboarding lifecycle; orthogonal to `accountAccess` |
| `lastActiveAt` | ISO timestamp | Dormancy clock in the prototype (mirrors BE `users.last_activity_at`) |
| `accessRemovalDeferredAt` | ISO \| `null` | Sweep branch B: account lockout deferred while open tours remain |
| `deactivationReason` | `null` \| `"inactivity"` | Provenance when the platform closed access via the sweep |

**D6 automatic access removal.** Settings → System → inactivity policy. When
the sweep runs:

- **Branch A** (no open tours): disables **both** `accountAccess` (login / user)
  and `operationalAccess` (marketplace).
- **Branch B** (open tours): disables only `operationalAccess`, keeps
  `accountAccess` enabled so the partner can finish work, sets
  `accessRemovalDeferredAt`, and retries account removal on later runs.

**Seed note.** All demo partners/admins start `enabled` / `enabled` /
`accepted`. A stale `lastActiveAt` (via `daysAgoIso(N)`) only makes them sweep
candidates — it does **not** revoke access at seed time. Backend seed JSON uses
`dormantDaysAgo` for the same idea: a relative authoring helper that writes the
activity clock; the stored field is always `last_activity_at` /
`lastActiveAt`.

## Operational tour status (stored on `job.status`)

Seven values only — no `return_requested`, no operational `completed`:

| Code           | Meaning                                     |
| -------------- | ------------------------------------------- |
| `draft`        | Internal preparation                        |
| `published`    | On driver marketplace                       |
| `assigned`     | Direct dispatch from draft                  |
| `accepted`     | Driver accepted from marketplace            |
| `performed`    | Driver finished the transfer                |
| `cancelled`    | Ended (admin or Report Problem cancel)      |
| `special_case` | Not performable; dispatch decides next step |

## Per-file tour document review (`tourDocuments[].reviewStatus`)

`uploaded` → `accepted` | `rejected` | `correction_required`

Do not confuse with job-level **`documentReviewSummary`** (aggregate label for admin/driver UI).

## Job-level document summary (`job.documentReviewSummary`)

Examples: `Not Started`, `Uploaded`, `Under Review`, `Correction Required`, `Accepted`, `Rejected`.

- **Under Review** — display label when performed tour has uploads awaiting admin review (not a stored operational status).
- **Completed** — display label from `getJobDisplayStatus()` when settlement is closed and documents are accepted (not the removed v1.4 status `completed`).

## Payment status (`job.paymentStatus`)

`Invoice Missing` (default) → `Invoice Received` (when billing invoice accepted in Tour documents) → `Paid` (manual, finance module).

## Tour document type (billing)

Canonical type code: **`invoice`**. UI label: **Billing invoice**. Module nav: **Tour documents** (route id `invoices` in HTML shell).

## Customer vs display fields

Wireframe and admin UI label this entity **Customer** (DE: **Kunde**). The prototype keeps older internal field names for billing and reporting separation from pickup/delivery addresses; production data design uses `customer` terminology.

- **Source of truth:** customer context, `pickup`, and `delivery`.
- **Denormalized fields** (`customer`, `startCity`, …): computed by `syncDisplayFields()` for tables, search, and CSV export.

## Assignment mode (`job.assignmentMode`)

Two values only:

| Code          | Meaning                                                              |
| ------------- | -------------------------------------------------------------------- |
| `marketplace` | Published to driver marketplace; any eligible driver may accept      |
| `direct`      | Assigned directly to a specific driver; never appears in marketplace |

The `push_on_direct_assign` feature flag controls whether a push notification fires on direct assignment (`false` in v1).

## Driver postal area filter (`driver.prefs.postalAreas`)

Array of postal-code prefixes (e.g. `[“80”, “81”]`). Replaces the former single `notifyPostalPrefix` string. A job matches if its pickup postal code starts with **any** entry in the array. Empty array = no filter (all published jobs match for that driver's `vehicleType` / `transportType` preferences).

## Vehicle domain (client confirmation “Systemlogik Fahrzeugeingabe”, 2026-07-26)

Four **explicit** categories with different cardinalities — deliberately *not* one flat tag array. Canonical constants and the single red-plate policy live in `store.js` and are exported on `AuthStore`; user-facing labels always come from `i18n.js`.

| Field                | Cardinality        | Values                                                                                      |
| -------------------- | ------------------ | ------------------------------------------------------------------------------------------- |
| `vehicleType`        | exactly one        | `passenger_car` (PKW) · `truck_up_to_7_5_t` (LKW bis einschl. 7,5 t) · `truck_over_7_5_t` (LKW über 7,5 t) |
| `manufacturer`       | exactly one        | From the manufacturer catalogue (dropdown)                                                   |
| `vehicleModel`       | exactly one        | Free text, separate from the manufacturer                                                    |
| `plate`              | 0..1               | **Official** plate of the transported vehicle; required while registered, optional (but enterable) when deregistered |
| `vin`                | 0..1               | Exactly 17 characters                                                                        |
| `transportType`      | exactly one        | `own_axle` (Eigenachse) · `third_party_axle` (Fremdachse) — renames the old `axle`            |
| `registrationStatus` | exactly one        | `registered` (Zugelassen) · `deregistered` (Abgemeldet) — independent of `transportType`      |
| `electricVehicle`    | independent bool   | E-Fahrzeug                                                                                   |
| `readyToDrive`       | independent bool   | Fahrbereit — relevant to third-party-axle transport; never auto-cleared                       |

**Removed entirely:** SUV · Van / Transporter · Classic car / Oldtimer · `LKW < 3,5t`. These are **not storable** — `normalizeVehicleType` resolves anything outside the approved set to `""`, and `validateVehicleForm` rejects it on create and update. No compatibility layer, no "(legacy)" label, no fallback icon, no per-record escape hatch. The pre-rename `job.vehicle` / `job.axle` field names are gone (no deprecated aliases).

### Red licence plates — derived (`requiresRedLicencePlates`)

Red plates are brought by the executing service partner; **their number is not recorded**. The requirement is derived, never selected:

```
requiresRedLicencePlates = registrationStatus === "deregistered" && transportType === "own_axle"
```

| Registration status | Transport type     | Red plates   |
| ------------------- | ------------------ | ------------ |
| registered          | own_axle           | not required |
| registered          | third_party_axle   | not required |
| **deregistered**    | **own_axle**       | **REQUIRED** |
| deregistered        | third_party_axle   | not required |

`AuthStore.requiresRedLicencePlates()` / `jobRequiresRedLicencePlates()` is the **only** implementation. `job.requiresRedLicencePlates` is a derived denormalization recomputed on every `syncDisplayFields`; it is never accepted from input (`validateVehicleForm` rejects it). The notice `redPlatesRequired` (“Rote Kennzeichen erforderlich”) is rendered by the one shared `DriverUI.RedPlatesRequiredNotice` component in all five required surfaces.

No red-plate field exists on the job at all — not a boolean, not a number. `normalizeVehicleDomain` strips `redPlates` / `redPlateNumber` defensively should either ever appear on an incoming record.

## Master data change type (`masterDataChangeRequest.changeType`)

Required field — discriminates requests in the admin review queue:

| Code           | Fields covered                     |
| -------------- | ---------------------------------- |
| `address`      | Street, postal code, city, country |
| `contact`      | Company name, email, phone         |
| `bank_details` | IBAN, BIC, account holder          |
| `vehicle_info` | Vehicle type, registration status, transport type |
| `license`      | Driver licence class, expiry       |
| `daily_limit_override` | Legacy — removed from driver UI; retained only for old prototype rows |

Prototype auto-derives `address` or `contact` from changed fields for profile requests. Driver limit-increase requests are removed (probation model).

## Report Problem

Replaces the removed v1.4 “return request” flow: cancel order or report not performable (→ `special_case`).

## Admin off-channel documents (`tourDocuments[].source`)

`admin_off_channel` — PDF/images attached by dispatch at job creation/edit or via Tour documents register. Distinct from driver PWA uploads (`driver` / `driver_pwa`).

**Driver permissions:** Admin off-channel documents are **read-only** for drivers (view/download), same as the generated transport order. Drivers cannot replace dispatch-provided documents; only their own `driver_pwa` uploads can be replaced when review status allows.

**Admin permissions:** Dispatch may replace or update `admin_off_channel` documents from the admin console. Transport order PDF uses regenerate, not driver-style file replace.

**Allowance:** Off-channel bytes **count** toward the tour-documents upload area total but are **never refused** by that total (dispatch can push a tour past its allowance; the driver then sees remaining clamped at zero).

## Job attachment size limits (PRD v2.32)

Configurable driver upload rules held in the store as `driverUploadLimits` / production setting `driver.uploads.limits` (`maxFileMb` default 25, `maxTotalMb` default 50). Admin System settings card edits both; drivers feel the change immediately.

### Language

**Upload area**:
An independent bucket of bytes governed by the configured per-file and per-area totals. There are two: (1) a tour's documents, (2) a single Report Problem report's evidence. They read the **same** two configured numbers but do **not** share one combined total.
_Avoid_: labelling the admin total field "per tour" or "per job" — one number drives two areas.

**Allowance**:
How much of an upload area's `maxTotalMb` is still free: used bytes subtracted from the configured total, **clamped at zero** (never displayed negative). Used for tour documents = live driver uploads + admin off-channel rows; rows whose `reviewStatus` is `replaced` do **not** count; generated transport orders live in another collection and never count. Replace is charged as a **delta** (outgoing off, incoming on).

**Platform ceiling**:
Named 50 MB hard backstop no upload of any kind may exceed. Stays on dispatch attach and driver **personal** documents (licence/ID). The configurable per-file limit governs tour documents and evidence only. Accepted side effect: personal docs rose 25 MB → 50 MB when the old single constant was split.

**Refusal reasons** (keep distinct in copy and code):
`file_too_large` — this file exceeds the per-file limit; `allowance_exhausted` — the upload area total is full and removing something is the remedy.

## Driver probation acceptance limit (`drivers.probationJobLimit`)

One-time probation model: each driver may book up to `probationJobLimit` initial jobs (default 3) and must have that many marked **Performed** before release (`probationClearedAt`). Enforced only on driver marketplace `acceptJob()`; admin direct assignment is exempt. Auto-release on perform; admin may manually `releaseDriverFromProbation`. No daily quota and no limit-increase request. Driver profile shows `DriverProbationCard` while on probation.

## Operational policies (Settings)

`operationalPolicies` in `store.js` mirrors production `app_settings`: admin-cancel cutoff, schedule-change cutoff, min driver message length, `probationJobCount` default for new drivers. Override requires audit note when `allowPolicyOverrideWithAuditNote` is true.

Driver upload limits sit beside those policies on System settings (`driverUploadLimits` / `driver.uploads.limits`) — see **Job attachment size limits** above.

## Prototype-only

In-memory data; refresh resets. Normalizers default unknown enum values to canonical ones for demo robustness.
