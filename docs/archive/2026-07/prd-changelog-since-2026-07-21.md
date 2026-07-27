# PRD changelog: 2026-07-21 → 2026-07-22 (v2.4 → v2.5)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`
**Baseline:** PRD v2.4 (2026-07-21, Storno)
**Source:** Work order 2026-07-21/22 — "Full order editing + Storno status/data-model consistency," plus two follow-up bug fixes reported 2026-07-22.

Scope note: the deliverable is an updated **clickable prototype** plus updated **requirements/data-model docs**. Backend behaviour (persistence, real push, permissions, review side-effects) remains **simulated** in the prototype and captured here as requirements for the dev team.

This session did **not** add a new client requirement — Task 32 §7 already required "edit all order data on any non-terminal order." It **implements** that requirement end-to-end, runs a **consistency pass** so code, `prd.json`, the Context Pack, `logical-model.md`, and `schema.dbml` describe one system, adds one genuine **schema** element the PRD implied but the DBML lacked, and fixes two UI bugs. Because it delivers a real capability + a schema change, it takes a **v2.5** bump.

---

## 1. Full admin order editing (Task 32 §7) — implemented [v2.5]

**Before (v2.4):** the prototype only exposed a focused booked-order editor limited to *driver-visible notes + driver offer*; the full editable form was "captured as a requirement."

**Now:** admins edit **ALL eligible business data** on **any non-terminal order** — draft, published, assigned, accepted, legacy `special_case`, and `empty_run_reported` — through the **same canonical Create/Edit Job form** used for creation. There is no separate limited editor (the old modal was removed) so the active-order editor can never drift from Job Creation.

Editable field categories: customer, category, distance; full pickup + delivery legs (company, street/house no., postal, city, country, contact + alternate contact, phone + second phone, email, notes, date, time window); vehicle (type, make/model, plate, VIN, axle, registration status, electric flag, red-plate flag + number, all conditional validation); driver offer; driver-visible notes + internal order notes.

Save semantics (booked order → `store.updateOrderFromForm`):

- **Persist immediately**; the operational **status is preserved** (an edit never changes status and never mutates cancellation / empty-run / status-history records).
- **One combined** in-app + push notification to the assigned partner listing the **actual driver-visible changed values** (`previous → new`). Internal notes and admin-only financials are audited but **never** included in the partner notification. Multiple field changes in one save = one notification. No partner re-confirmation.
- **Audit** `order_edited`, storing **previous + new** for every changed field; unchanged values create no fake diffs.
- **Schedule-cutoff policy** applies **only** to schedule-field changes on a committed order (with an authorized override + audit note where enabled) and never blocks non-schedule fields.
- **Eligibility** is centralised in one `canAdminEditOrder()` policy; terminal states (`cancelled_by_sp`, `cancelled_by_autheon`, `empty_run_recognised`, `empty_run_not_recognised`, `performed`) are read-only. Reuse a terminal order via **Duplicate order**.

`prd.json` tasks/section changes: Task 16 (full eligible-order editing, no revert-to-Draft required to edit); Task 32 prototype note (full editor implemented); Task 20 (order-updated + empty-run notifications); Task 22 (`order_edited` prev/new, one logical action); Task 26 (full-edit + Storno QA matrix); `global_business_rules` (full-edit rule, terminality/no-reactivation, recognised ≠ performed, umbrella = presentation-only); `operational_job_statuses` extended; `prototype_validation` → truthful PASS; `notification_channels_matrix` (+`order_updated_after_booking`, `empty_run_reported`, `empty_run_recognised`, `empty_run_not_recognised`); stale `resolved_defaults` / `product_context.important_notes` / `prototype_coverage_notes` reconciled.

## 2. Status-model & legacy consistency ("ignore the special case") [v2.5]

- Only `cancelled_by_sp` and `cancelled_by_autheon` are genuine cancellations; empty-run outcomes are **separate** terminal resolutions.
- **`empty_run_recognised` is NOT a performed transport** — it never increments driver Performed counts, releases probation, or triggers performed-specific logic. Probation/completion always key off the precise `performed` status; `statusUmbrella()` (which groups `empty_run_recognised` under the *Performed* board column) is **presentation/query grouping only** and drives no business logic. (Verified in code: `reviewEmptyRun` never touches `performedIds`/`markPerformed`; `driverProbationPerformedCount` matches the precise status.)
- Legacy `special_case` (job_status) and `problem_type.not_performable` are retained for **backward-compat/read-only display only** and are superseded by the empty-run workflow. No new writes route through the special-case path.

## 3. Schema / data-model sync (higher priority) [v2.5]

Audited `prd.json` against `schema.dbml`; the model already supported cancellation-vs-empty-run separation, terminality, internal notes, and `order_edited` prev/new (via `audit_events.metadata` jsonb). Changes made so the **DBML fully follows the PRD**:

- **Added `empty_run_evidence`** (`empty_run_report_id` → `empty_run_reports`, `upload_asset_id` → `upload_assets`, filename snapshot, `created_at`) — first-class home for Task 32 §3.2 optional empty-run attachments, mirroring `problem_report_evidence`, instead of overloading the legacy `job_problem_reports` path. Evidence is optional and never blocks submission.
- **Added the previously-missing FK relationships** for `sp_cancellations`, `empty_run_reports`, `internal_notes` (Task 2 tables) and `email_change_requests` (T1) — these tables existed since v2.3/v2.4 but had no `Ref:` lines.
- **Legacy markers** on `job_status.special_case` and `problem_type.not_performable` documenting they are read-only/back-compat only.
- **No new `jobs` columns**: full editing reuses existing columns; `notification_type` stays a free varchar (new values documented, no enum change).

`logical-model.md` updated to match (v2.5 status-override note; §7 full-edit scope; recognised ≠ performed guard; `empty_run_evidence`; entity-map "Problems (Storno)" row split into canonical vs legacy).

## 4. Bug fixes (reported 2026-07-22) [v2.5]

- **Empty-run evidence was not viewable in admin review.** The review panel only printed "Attached evidence: N." Image evidence now carries an in-session object URL (`buildSpecialCaseEvidenceMeta`) and the panel renders a thumbnail gallery (click to open); non-image / metadata-only evidence shows a file chip with a "preview unavailable (metadata only)" note. (Prototype has no binary storage, so the live preview exists for the current page session.)
- **Notification-feed "Open tour" did nothing.** `NotificationFeedPane` already called `onOpenJob`, but the admin shell rendered it without that prop. Wired `onOpenJob` (→ opens the job detail) and `showToast`.

## Prototype / doc files changed

- `prototype/project/store.js` — `canAdminEditOrder`, `ORDER_EDIT_FIELDS` + flatten/diff, shared `finalizeOrderEdit`, `updateOrderFromForm`, `_persistFormMasterAddresses` (shared with `saveDraft`), `updateActiveOrder` refactor, `jobToDraftForm` carries `dateLong`, `buildSpecialCaseEvidenceMeta` image preview URL.
- `prototype/project/admin.jsx` — full-form editing for booked orders (banner, driver-notes field, `NewOrderFooter` booked-edit mode, unified edit gating via `canAdminEditOrder`, removed limited modal), empty-run evidence gallery.
- `prototype/project/AUTHEON Prototype.html` — `saveBookedOrderEdit` wiring; `NotificationFeedPane` `onOpenJob`/`showToast` wiring.
- `prototype/project/i18n.js` — order-field labels + edit/evidence UI strings (EN + DE).
- `prototype/project/styles.css` — removed a legacy brand-blue hex from a design-token comment (pre-existing audit blocker).
- `prototype/project/_audit-prototype.mjs` — fixed a `"return window"` false-positive that matched `return window.matchMedia(...)` (pre-existing audit blocker).
- `prototype/project/_verify-order-edit.mjs` — **new** durable validation (28 checks) for full editing + Storno terminality.
- `docs/requirements/prd.json`, `docs/product/autheon-context-pack.md`, `docs/database/logical-model.md`, `docs/database/schema.dbml` — reconciled as above.

## Validation

`_audit-prototype.mjs`, `_audit-i18n.js` (EN/DE parity), `_verify-seed.mjs`, `_verify-order-edit.mjs` all exit 0. Playwright smoke (2) + critical-flow (1) pass. `schema.dbml`/`prd.json` parse clean.

## Open items (unchanged)

OQ-19 (cancellation T&C link placeholder) and OQ-14 (post-booking driver workflow email) remain open. PDF regeneration on edit follows the existing manual-regeneration decision (not changed).
