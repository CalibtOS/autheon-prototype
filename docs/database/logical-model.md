# AUTHEON database logical model

> **Status override:** Updated 2026-07-10 - PRD v2.0: no structural schema change. `drivers.driver_code` is now documented as system-assigned, immutable, and never reused (F-03); per-leg time windows are same-day only with no cross-midnight window (F-04). Probation-only driver UI, Infopoint View/Download actions, and branding/domain/Report-Problem-timing are UI or open-question items with no data-model impact.

> **Status override:** Updated 2026-07-09 - PRD v1.9 (F-01): driver acceptance limits changed from a per-calendar-day quota to a one-time probation model. `drivers.daily_job_limit` is replaced by `probation_job_limit` + `probation_cleared_at`; the `master_data_change_type.daily_limit_override` request flow is removed; the `app_settings` key `driver.acceptance.defaultDailyJobLimit` is renamed to `driver.acceptance.probationJobCount`, whose value is copied into `drivers.probation_job_limit` at driver creation.

> **Status override:** Updated 2026-07-03 - PRD v1.8 plus backend sync: upload-core `upload_assets`, upload-asset links for feature tables, generated PDF document-file versioning, explicit job date/time windows, and driver daily limits. [`schema.dbml`](schema.dbml) is the accompanying relational schema. [`../requirements/prd.json`](../requirements/prd.json) remains the functional source of truth.

> **Status:** Updated 2026-07-02 — PRD v1.8: `daily_job_limit`, app_settings operational policies, admin cancel driver message. [`schema.dbml`](schema.dbml) is the accompanying relational schema. [`../requirements/prd.json`](../requirements/prd.json) remains the functional source of truth.

## Scope and modelling approach

The prototype stores a whole tour as one mutable JavaScript object, including display-only copies of locations, contacts, customer name, financial values, documents, history, and notifications. That is appropriate for a demo but unsafe for production: it overwrites historical facts, cannot enforce concurrent acceptance, and has no durable audit or delivery boundary.

The production model separates master data, transactional tour data, immutable history, and external file/delivery state. PostgreSQL is the target database. The schema is single-operator for Version 1; do not introduce a tenant key until AUTHEON has a real multi-tenant commercial requirement.

## Entity map

```text
users (Keycloak-linked) ──1:0..1── drivers ──< job_assignments >── jobs
    │                                                    │
    ├──< audit_events                                  ├──< job_locations
    ├──< user_notifications                             ├──< job_status_history
    └──< notification_preferences                       ├──< job_problem_reports
                                                        ├──< job_documents ──< document_files
customers ───────────────────────────────────────┤
locations (optional master-data reference) ──────────────┘

infopoint_documents / infopoint_news ──< read receipts
user_notifications ──< notification_deliveries
```

## Core entities

| Area                     | Tables                                                                                                             | Purpose                                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity                 | `users`, `drivers`                                                                                             | Keycloak owns authentication. AUTHEON stores the local user record (`users`) linked by `keycloak_id`, with first/last name, status, roles, and email verification state. The driver business profile lives in `drivers` where applicable. Roles are persisted locally and provisioned to Keycloak on account invite.                              |
| Master data              | `customers`, `locations`                                                                                           | Reusable reporting/billing customers and pickup/delivery locations, including customer type, billing notes, and operational instructions. Deactivation replaces deletion where a record is referenced. |
| Tours                    | `jobs`, `job_locations`, `job_assignments`, `job_status_history`, `job_distance_estimates`, `job_financials`       | Current operational state plus immutable historical context.                                                                                                                                           |
| Problems                 | `job_problem_reports`, `problem_report_evidence`                                                                   | Cancellation and not-performable reports, reasons, evidence, and the pre-problem status needed for dispatch resolution.                                                                                |
| Documents                | `job_documents`, `document_files`, `job_document_reviews`, `generated_job_documents`, `upload_assets`              | Business document, immutable file versions, review history, generated transport-order PDFs, and upload-core binary metadata.                                                                            |
| Content                  | `infopoint_documents`, `infopoint_news`, `infopoint_news_reads`                                                    | Driver-facing general documents and one-way news.                                                                                                                                                      |
| Notifications            | `notification_preferences`, `push_subscriptions`, `user_notifications`, `outbox_events`, `notification_deliveries` | In-app notifications, driver preferences, push endpoints, durable business events, and per-notification delivery attempts.                                                                                                              |
| Control and traceability | `feature_flags`, `audit_events`, `master_data_change_requests`                                                     | Optional rollout flags, append-only audit, and the one-open-request driver profile-change workflow.                                                                                                    |

## Prototype coverage review

The following maps every persisted prototype collection in `prototype/project/store.js` to the production design. Display-only fields and derived arrays are intentionally not copied as mutable database state.

| Prototype collection       | Production table(s)                                                                            | Review result                                                                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Customer master data       | `customers`, job customer snapshot columns                                                     | Covered: type, contact, billing notes, and operational instructions are retained.                                                                                                                |
| `addresses`                | `locations`, `job_locations`                                                                   | Covered: reusable location plus immutable pickup/delivery snapshot and schedule.                                                                                                                 |
| `documents`                | `infopoint_documents`, `document_files`                                                        | Covered: title, description, category, scope, version, visibility, and optional private file.                                                                                                    |
| `newsItems`                | `infopoint_news`, `infopoint_news_reads`                                                       | Covered: content, publication/visibility, notification flags, and per-user reads.                                                                                                                |
| `jobs`                     | `jobs`, `job_locations`, `job_financials`, `job_distance_estimates`, `generated_job_documents` | Covered: operational data, snapshot fields, vehicle, costs, documents, distance, PDF versions, and independent statuses.                                                                         |
| `drivers` and `admins`     | `users`, `drivers`, `notification_preferences`                        | Covered: shared local user profile with `first_name`/`last_name`, `keycloak_id`, `status`, and `roles`; driver profile/status; and all five prototype notification preferences. Admin and driver authorization uses `users.roles` (`user`, `admin`, `driver`) in addition to Keycloak realm roles. |
| `driverState`              | Derived from jobs, assignments, documents, and notifications                                   | Intentionally not persisted: it is a cacheable UI projection and must not become a second source of truth.                                                                                       |
| `tourDocuments`            | `job_documents`, `document_files`, `job_document_reviews`                                      | Covered: metadata, source, file versions, review/processed state, rejection, correction, and invoice fields.                                                                                     |
| `driverNotifications`      | `user_notifications`                                                                           | Covered: driver recipient, type, tour deep link, read state, title, body, and timestamp.                                                                                                         |
| `adminEmailQueue`          | `outbox_events`, `user_notifications`, `notification_deliveries`                               | Covered: durable business event, admin in-app feed, and per-notification channel delivery attempt/status.                                                                                                   |
| `masterDataChangeRequests` | `master_data_change_requests`                                                                  | Covered: submit snapshot, proposed changes, open/approved/rejected status, resolver, and notes.                                                                                                  |
| `featureFlags`             | `feature_flags`                                                                                | Covered: auditable rollout configuration.                                                                                                                                                        |
| `branding`                 | `app_settings`                                                                                 | Covered: configurable display name and future legal/branding settings without hard-coding product copy.                                                                                          |
| `auditLog`                 | `audit_events` and `job_status_history`                                                        | Covered: generic append-only audit plus structured operational status history.                                                                                                                   |

No production table represents the prototype's former return-request/return-window flow. That is intentional: the current PRD replaces it with `job_problem_reports` for cancellation and not-performable handling.

## Tour data and historical truth

### Master-data references plus snapshots

`jobs.customer_id` and `job_locations.master_location_id` retain their relationship to reusable master data. The job also stores a snapshot of the customer name, type, billing reference, billing notes, instructions, and each pickup/delivery location's address, contacts, schedule, and instructions.

This is intentional. A dispatch edit to a saved address or a customer name must not alter an already assigned tour, an accepted contractual commitment, an audit export, or an already generated PDF. Updating a master record can be offered during draft order entry; it never silently changes a committed tour.

### Assignment mode and marketplace filters

`jobs.assignment_mode` distinguishes between `marketplace` (the job is published and visible to eligible drivers) and `direct` (the job is assigned directly to a specific driver). This determines which notification path fires at publish time.

When `assignment_mode = 'marketplace'`, the columns `required_vehicle_type`, `required_axle_type`, and `pickup_postal_area` drive the eligibility match against `notification_preferences.postal_areas`, `vehicle_type`, and `axle_type`. These are set at publish time and must not change after the job leaves `draft`.

`notification_preferences.postal_areas` is a `text[]` array — drivers subscribe to multiple postal areas. A single `pickup_postal_prefix` was insufficient for multi-area subscriptions.

### Assignment and acceptance

`job_assignments` records every direct assignment, reassignment, and marketplace acceptance. Only one open assignment may exist per job. The current assignee is duplicated in `jobs.current_driver_id` for fast authorization and list queries, but the assignment table is the history.

`jobs.accepted_at` and `jobs.performed_at` are denormalized from `job_status_history` for fast SLA and settlement queries. The service layer sets them during the corresponding status transition; they are never written directly by a client.

Marketplace acceptance must be one transaction:

1. Lock the `jobs` row where `operational_status = 'published'`.
2. Confirm the driver is active.
3. Insert the assignment with `assignment_type = 'marketplace_acceptance'`.
4. Change the job to `accepted`, write status/audit/outbox events, and commit.

This prevents two drivers from accepting the same published tour.

### State separation

`jobs.operational_status` governs the tour lifecycle: `draft`, `published`, `assigned`, `accepted`, `performed`, `cancelled`, or `special_case`.

`jobs.document_review_summary` represents the aggregate document state, while each `job_documents` row has its own review state. `jobs.settlement_state` is independent and must never be used to imply that a driver performed a tour. The old return-request state is deliberately absent.

Status transitions belong in a transaction/service layer, not an unconstrained client update. Every transition writes `job_status_history`, `audit_events`, and, where required, `outbox_events`.

`message_delivery_status` is used only for outbox/email/push/in-app delivery attempts. It is not a vehicle pickup/delivery or tour lifecycle status.

### Settlement audit

`job_financials.settlement_initiated_by` and `settlement_initiated_at` record which admin triggered the settlement transition and when. This satisfies the audit/compliance requirement that all financial state changes are attributable. The `updated_by_user_id` field covers any financial field edit; `settlement_initiated_by` is specific to the act of opening settlement.

### Master-data change type

`master_data_change_requests.change_type` is a required discriminator (`bank_details`, `address`, `vehicle_info`, `license`, `contact`). Without it the admin review queue cannot filter by type, and the service layer cannot apply type-specific validation rules to the proposed change JSON. The partial unique index on `(driver_id) where status = 'open'` applies regardless of type — one open request per driver at a time.

`reviewed_by_user_id` and `reviewed_at` record the reviewing admin independently of `resolved_by_user_id`, which allows a future multi-step flow where a reviewer and an approver may differ.

**Email is not a master-data change type (T1, 2026-07-20).** The driver's sign-in email (`users.email`) is a credential the driver owns, not ops-managed master data, so it is never carried in a `master_data_change_request`. The `contact` type covers company/phone/contact details only.

### Driver self-service email change (T1)

Email changes follow a *verify, don't approve* model with no operations/admin step, recorded in `email_change_requests`:

- **Ownership proof, not approval.** On request the system generates a 6-digit code, stores only its **hash** (`code_hash`), and sends the plaintext to the **new** address. `users.email` is unchanged until the driver submits the matching code — the **old address stays valid for sign-in** throughout, and is notified (in-app/push, and email in production) once the change is confirmed.
- **One pending change per account.** Partial unique index on `email_change_requests(user_id) where status = 'pending'`. Starting a new request supersedes/cancels any prior pending one for that user.
- **Expiry, attempts, resend throttle.** `expires_at` bounds code validity (10 min in the prototype); an expired or mismatched code errors without changing the address. `attempts` caps guesses; `resend_count` + a minimum resend interval (30s in the prototype) throttle re-sends. These live in the application layer.
- **Uniqueness.** `new_email` must be a valid address, different from the current one, and not already used by another account — re-checked at both request and confirm time (a race where another account claims it between steps fails the confirm).
- **Atomic confirm.** On success, within one transaction: set `email_change_requests.status = 'confirmed'` + `confirmed_at`, update `users.email`, and set `users.email_verified = true`.
- **Audit.** `driver_email_change_requested` (request/resend) and `driver_email_changed` (confirm, with old → new) are appended to the audit log.

## Documents and object storage

Files are not stored in PostgreSQL blobs. `upload_assets` is the core binary metadata table and is the source of truth for storage key, checksum, MIME type, size, access, generic technical upload profile, and deletion state. Feature tables reference `upload_asset_id` and enforce business authorization and meaning.

`job_documents` represents the business document type on the tour. Its `current_file_id` points to the active immutable file version; older files remain linked through `document_files.supersedes_file_id`. `document_files.upload_asset_id` points to immutable binary metadata in `upload_assets`. Denormalized fields such as `storage_key`, `mime_type`, and `file_size_bytes` may be retained on `document_files` as audit snapshots, but the upload asset remains the binary source of truth.

Generated transport-order PDFs are represented as generated job documents linked to a `document_files` row (`generated_job_documents.document_file_id`), not as standalone raw storage keys. This keeps generated documents inside the same versioning, download authorization, and audit model as driver/admin tour documents.

Infopoint documents and problem report evidence are not job-document review artifacts. They link directly to `upload_assets` through `infopoint_documents.upload_asset_id` and `problem_report_evidence.upload_asset_id`.

`upload_assets.owner_id` intentionally remains a scalar actor/user identifier in the backend core upload module. Feature tables enforce foreign keys to `upload_assets`; core uploads do not import the users module just to enforce `owner_id`, because that would break the core-module boundary. User existence and business authorization are enforced by feature use cases before upload creation.

An invoice is a document with `document_type = 'invoice'`; it is not a separate invoice table in Version 1. Its supplier invoice fields and review/processed state remain on the document. `job_financials` holds the cached invoice/payment summary required by the current prototype, including an explicit admin override, without turning Version 1 into an accounting ledger.

## Required constraints and indexes

The SQL implementation must include at least these controls:

- Unique `jobs.tour_number` and `drivers.driver_code`. `driver_code` is system-assigned from a monotonic sequence, immutable after creation, and never reused — a departed/blocked/archived driver's code is not reassigned (F-03). The exact code format is client-defined (open question).
- Unique `users.email` and partial unique index on `users.keycloak_id where keycloak_id is not null`.
- User soft-delete via `users.deleted_at`; active-user checks also require `status = 'active'`.
- Unique active assignment per job: partial unique index on `job_assignments(job_id) where ended_at is null`.
- One `pickup` and one `delivery` row per job: unique `(job_id, location_role)`.
- One open master-data change request per driver: partial unique index on `master_data_change_requests(driver_id) where status = 'open'`.
- One pending email change per account (T1): partial unique index on `email_change_requests(user_id) where status = 'pending'`. Code stored as hash only; `expires_at` enforced server-side; `users.email` updated only on confirm.
- Draft-only hard deletion enforced by a stored procedure/service transaction. Non-draft jobs are never hard-deleted.
- `delivery_date >= pickup_date` where both values are present; time-window sanity checks at service level because flexible windows are allowed. Each leg's window is same-day only: `window_end >= window_start` with no cross-midnight window (F-04); pickup and delivery legs may still have different `scheduled_date`.
- Active marketplace index: `(operational_status, pickup_postal_code, pickup_date)` for published tours.
- Driver work queue index: `(current_driver_id, operational_status, pickup_date)`.
- Audit and status-history indexes: `(job_id, occurred_at desc)`.
- Document queue index: `(job_id, review_status, created_at desc)`.
- Outbox delivery index: `(status, available_at)`.

## Access model and data exposure

Authorization is not a UI concern. The database/service policy must enforce that a driver can retrieve only its own assigned/accepted/performed/cancelled/special-case tours and permitted documents.

Keycloak is the identity source of truth for authentication. Application services validate the Keycloak token, resolve `sub` to `users.keycloak_id`, and apply AUTHEON domain rules using the local `users` record. `users.status` (`pending_verification`, `active`, `suspended`, `inactive`) and `users.deleted_at` provide application-level access control; they do not replace Keycloak account state. Authorization checks use `users.roles` (`user`, `admin`, `driver`), which are synced to Keycloak when an account is provisioned.

Marketplace queries must project a deliberately reduced view. They must not return full locations, contacts, vehicle identifiers, customer details, internal notes, or PDFs before acceptance. The base `jobs` and `job_locations` tables are never exposed directly to an untrusted driver client.

## Important vehicle info (Design Direction Board 07/2026)

`jobs.vehicle_registration_status` (`registered` | `deregistered`, nullable = not specified), `jobs.electric_vehicle` (boolean, default false), `jobs.red_license_plates` (boolean, default false), and `jobs.red_license_plate_number` (varchar(32)) are announcement metadata, resolved 2026-07-14 (see `prd.json` → `resolved_defaults.vehicle_important_info_v1` and the v2.1 changelog). They are captured in the admin job form's Vehicle section and — unlike VIN and regular license plate — the three flags are **included in the reduced marketplace projection** pre-acceptance: decision-relevant for service partners and non-sensitive.

**Conditional capture rules (application-enforced, not database constraints):**

- registration `registered` / null → `licenseplate` required by the job form (unchanged rule).
- registration `deregistered` → `licenseplate` must be **null**; a deregistered vehicle carries no valid plate.
- `red_license_plates = true` → `red_license_plate_number` required. German § 16 FZV red transfer plates carry a district code plus a recognition number starting **06** (dealer/workshop series; 05 = inspection bodies, 07 = classic cars), e.g. `K-06 1234`, and are assigned to the **operator, not the vehicle** — which is why the number lives per tour on `jobs` instead of a vehicle master table.

The flags drive no marketplace filter or acceptance rule in V1.

## Open decisions that affect the physical schema

| Decision                | Current schema position                                                                                                                                             | Approval needed                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Authentication          | Keycloak selected. `users.keycloak_id` links AUTHEON records to Keycloak users. Local `users.roles` are provisioned to Keycloak on invite. No password or identity-provider-link tables are stored in AUTHEON. | Realm/client configuration, exact role names/groups, token claims, admin MFA policy, and user provisioning flow. |
| Map/distance            | `jobs.distance_km` is the single canonical distance (estimate or admin entry). `job_distance_estimates` is calculation history only (provider/raw result), not a second current distance. | Provider, routing profile, country coverage, pricing/retention requirements.                                     |
| Admin alerts            | Durable outbox/delivery records, but no hard-coded recipient list.                                                                                                  | Recipient groups, escalation rules, business hours, sender/reply policy.                                         |
| File retention/security | Versioned metadata supports deletion/hold policy; storage implementation remains open.                                                                              | EU-region requirement, retention periods, malware scanner, size/type limits, deletion authority.                 |
| Product display name    | `system_settings`/branding configuration is intentionally deferred.                                                                                                 | Final name, legal entity details, domain, sender identity, localization rules.                                   |
| Finance                 | `job_financials` holds operational amounts (`revenue_amount`, `driver_offer_amount`, `expenses_amount`) plus optional net/gross and invoice/payment summary fields. BE uses `currency` / `vat_rate` for DBML `currency_code` / `tax_rate`. Marketplace reads `driver_offer_amount` only. `jobs.settlement_state` remains the tour closeout state. Payment/invoice summary may still live on `jobs` in BE V1 until fully moved onto `job_financials`. | Whether advanced invoices/ledger/accounting integration become approved scope. |

## Cancellation attribution and driver communication

`jobs.cancellation_actor`, `cancellation_reason_code`, and `cancellation_reason_text` record who cancelled and why. When dispatch cancels an assigned tour, `cancellation_reason_text` is the **driver-facing message** shown in the driver PWA and `order_cancelled_by_autheon` notifications — not an internal-only note.

## Order cancellation & empty-run workflow (Task 2)

Cancellation and empty-run reporting are **separate processes** with distinct statuses, validation, and audit entries — never a shared status or backend action.

**Status model — extended enum, not a discriminator.** `job_status` gains explicit machine values: `cancelled_by_sp`, `cancelled_by_autheon`, `empty_run_reported`, `empty_run_recognised`, `empty_run_not_recognised`. Each carries its own rules, ⚠-availability logic, and audit entries; overloading `cancelled`/`special_case` would lose that distinction. `cancelled`/`special_case` remain as legacy umbrellas. The Jobs board stays scannable by rolling precise statuses up to **umbrella columns** (cancelled_by_sp / cancelled_by_autheon / empty_run_not_recognised → *Cancelled*; empty_run_reported → *review/Special case*; empty_run_recognised → *Performed*) and showing the precise status as a **reason chip** per row.

**Service-partner cancel (§2).** Only on a booked order (`assigned`/`accepted`). Requires a reason (`sp_cancellation_reason`) and a ≥30-char explanation. Result: `cancelled_by_sp`, read-only, removed from the partner's active list but retained in history, admin notified, audit `cancelled_by_service_partner`. Stored in `sp_cancellations` (reason, explanation, date/time, executing partner). Not auto-republished; no fee processing in-system.

**Empty-run report (§3) + review (§4).** The *order* cannot be executed. Requires a reason (`empty_run_reason`) and a ≥30-char description; optional evidence must never block submission. Result: `empty_run_reported`, report locked for the partner, admin notified, audit `empty_run_reported`, stored in `empty_run_reports`. Admin review has exactly two outcomes (`empty_run_decision`): `recognised` → `empty_run_recognised`; `not_recognised` → `empty_run_not_recognised`. Both are terminal/read-only, push + in-app notify the partner, and audit `empty_run_recognised`/`empty_run_not_recognised`. A not-recognised empty run does **not** reactivate the original order.

**Autheon cancellation (§5).** Admin may cancel unbooked (`published`) and booked orders → `cancelled_by_autheon`, read-only, never deleted, stays visible in backend and partner history. Unbooked is removed from the marketplace immediately (the pickup-cutoff policy applies only to **booked** orders — an unbooked order has no committed partner). Booked cancellation pushes a partner notification. Audit `cancelled_by_autheon`.

**Internal notes (§6).** `internal_notes` is append-only, admin-only, never exposed to the service-partner frontend; each note auto-stamps author + timestamp and is permanently attached.

**Edit active order (§7).** Admins may edit non-terminal orders (including booked). On save: persist immediately, push + in-app notify the assigned partner with the **actual changed values** in one combined notification (no re-confirmation), and audit **previous + new** values per changed field (`order_edited`).

**Duplicate order (§9).** Creates a new `draft` copying all data with a new order number, opens it in the editor, leaves the original unchanged, and is not in the marketplace until explicitly published. Audit `order_duplicated`, and publication of the duplicate is audited on publish.

**⚠ availability (§10).** The service-partner ⚠ action is available only on booked orders and is hidden for all terminal states and while an empty-run report is pending review.

**Cancelled/completed behaviour (§8).** Terminal orders cannot be reactivated, edited, reset to a previous status, or directly republished; they stay visible in the backend and the partner's history.

**Concurrency.** Repeat/concurrent submissions must not create duplicate status changes, notifications, or audit entries (guarded by status preconditions — e.g. empty-run report only from `assigned`/`accepted`, review only from `empty_run_reported`).

## App settings (`app_settings`)

Key/value JSON configuration managed by admins (see PRD Task 31 and `resolved_defaults.app_settings_catalog_v1`):

| Key | Purpose |
|-----|---------|
| `branding.display` | Product display name in UI |
| `operational.policies` | Minimum hours before pickup for admin cancel and schedule change; optional override-with-audit flag |
| `cancellation.policies` | Required reason code, minimum driver message length for admin cancel |
| `driver.acceptance.probationJobCount` | System-wide probation allowance; its value is **copied into** `drivers.probation_job_limit` at driver creation (replaces `driver.acceptance.defaultDailyJobLimit`, F-01) |

## Driver probation acceptance limit (PRD v1.9, F-01)

Version 1 uses a one-time probation model instead of a per-calendar-day quota. `drivers.probation_job_limit` is both the initial job allowance while on probation and the number of Performed jobs required for release. `drivers.probation_cleared_at` is null while a driver is on probation and set when the driver is released — automatically once `probation_job_limit` jobs are Performed, or manually by an admin for exceptional account-reset cases. After release no further V1 booking limit applies.

**Where the limit comes from (configurable default).** The system-wide default lives in `app_settings` under `driver.acceptance.probationJobCount`. At driver creation the application layer reads that setting and **copies the value into** `drivers.probation_job_limit` — a per-driver snapshot. SQL column defaults cannot reference another table, so the literal `default 3` on the column is only a safety fallback for when the setting is unavailable or a row is inserted outside the app path. Snapshot semantics are intentional: changing the `app_settings` value affects only drivers created afterward, never existing drivers, so probation terms stay stable and auditable per driver. The remaining allowance is derived (`probation_job_limit` minus the driver's Performed-job count) and is not stored as a separate counter.

The Performed count that drives automatic release is derived from `jobs` / `job_status_history`; `probation_cleared_at` is the durable released flag so a driver is never re-probated once released. Enforcement is server-side at acceptance time.

The prior per-day model (`drivers.daily_job_limit` plus driver limit-increase requests via `master_data_change_requests.change_type = daily_limit_override`) is superseded; the `daily_limit_override` enum value has been removed from `master_data_change_type` (any legacy prototype rows must be migrated before the enum value is dropped). The same-day overlap confirmation prompt is unchanged and remains a soft prompt, not a hard block.

Decision (F-01, 2026-07-10): probation constrains only driver self-service marketplace booking. Admin direct assignment is exempt — admin may assign additional jobs to a driver even while on probation — and Performed jobs count toward the release threshold whether self-accepted or admin-assigned. Enforcement therefore gates the driver acceptance path, not the admin assignment path.

## Explicit non-goals

- Live GPS/location tracking or map tiles.
- Customer self-service accounts and booking portal.
- Full double-entry accounting or ERP integration.
- Historical spreadsheet migration or mass import.
- Database storage of file binaries.
- A separate tablet-only data model.
