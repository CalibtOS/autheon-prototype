# AUTHEON prototype — domain glossary (PRD v1.8)

Canonical spec: [`../../docs/requirements/prd.json`](../../docs/requirements/prd.json). This file explains terms used in the static prototype (`store.js`, admin, driver).

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

Array of postal-code prefixes (e.g. `[“80”, “81”]`). Replaces the former single `notifyPostalPrefix` string. A job matches if its pickup postal code starts with **any** entry in the array. Empty array = no filter (all published jobs match for that driver's vehicle/axle preferences).

## Master data change type (`masterDataChangeRequest.changeType`)

Required field — discriminates requests in the admin review queue:

| Code           | Fields covered                     |
| -------------- | ---------------------------------- |
| `address`      | Street, postal code, city, country |
| `contact`      | Company name, email, phone         |
| `bank_details` | IBAN, BIC, account holder          |
| `vehicle_info` | Vehicle type, registration, axle   |
| `license`      | Driver licence class, expiry       |
| `daily_limit_override` | Request to raise `daily_job_limit` |

Prototype auto-derives `address` or `contact` from changed fields for profile requests. Limit-increase requests use explicit `daily_limit_override`.

## Report Problem

Replaces the removed v1.4 “return request” flow: cancel order or report not performable (→ `special_case`).

## Admin off-channel documents (`tourDocuments[].source`)

`admin_off_channel` — PDF/images attached by dispatch at job creation/edit or via Tour documents register. Distinct from driver PWA uploads (`driver` / `driver_pwa`).

**Driver permissions:** Admin off-channel documents are **read-only** for drivers (view/download), same as the generated transport order. Drivers cannot replace dispatch-provided documents; only their own `driver_pwa` uploads can be replaced when review status allows.

**Admin permissions:** Dispatch may replace or update `admin_off_channel` documents from the admin console. Transport order PDF uses regenerate, not driver-style file replace.

## Driver daily job limit (`drivers.dailyJobLimit`)

Per-driver cap on accepted tours per calendar day (default 3). Enforced in `acceptJob()`; editable in Admin → Users.

## Operational policies (Settings)

`operationalPolicies` in `store.js` mirrors production `app_settings`: admin-cancel cutoff, schedule-change cutoff, min driver message length, default daily limit. Override requires audit note when `allowPolicyOverrideWithAuditNote` is true.

## Prototype-only

In-memory data; refresh resets. Normalizers default unknown enum values to canonical ones for demo robustness.
