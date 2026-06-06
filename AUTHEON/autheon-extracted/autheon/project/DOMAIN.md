# AUTHEON prototype — domain glossary (PRD v1.6)

Canonical spec: `AUTHEON/prd.json`. This file explains terms used in the static prototype (`store.js`, admin, driver).

## Operational tour status (stored on `job.status`)

Seven values only — no `return_requested`, no operational `completed`:

| Code | Meaning |
|------|---------|
| `draft` | Internal preparation |
| `published` | On driver marketplace |
| `assigned` | Direct dispatch from draft |
| `accepted` | Partner accepted from marketplace |
| `performed` | Partner finished the transfer |
| `cancelled` | Ended (admin or Report Problem cancel) |
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

## Ordering party vs display fields

Wireframe and admin UI label this entity **Customer** (DE: **Kunde**). The data model keeps `orderingPartyId` / `orderingPartyName` for billing and reporting separation from pickup/delivery addresses.

- **Source of truth:** `orderingPartyId`, `orderingPartyName`, `pickup`, `delivery`.
- **Denormalized fields** (`customer`, `startCity`, …): computed by `syncDisplayFields()` for tables, search, and CSV export.

## Report Problem

Replaces the removed v1.4 “return request” flow: cancel order or report not performable (→ `special_case`).

## Prototype-only

In-memory data; refresh resets. Normalizers default unknown enum values to canonical ones for demo robustness.
