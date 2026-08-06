# AUTHEON database logical model

> **Status override:** Updated 2026-08-05 - PRD v2.34-feed-redesign / Task 33 (renumbered from v2.32
> — main independently claimed v2.32 for an unrelated job-attachment-size-limits change that landed
> first): Dispatch Notification
> Feed table redesign — renamed and extended the columns the entry directly below this one just added,
> same day. **`user_notifications.status`'s `notification_status` enum values are renamed** `open` →
> `unread`, `processed` → `read` (a naming change only — the underlying rule is unchanged: status flips
> only via an explicit "mark as read" action, single-row or bulk, never as a side effect of viewing).
> **`.processed_at`/`.processed_by_user_id` are renamed** `.admin_read_at`/`.admin_read_by_user_id` —
> deliberately not the shorter `.read_at`/`.read_by_user_id`, since `user_notifications.read_at` already
> exists as the driver-notification read receipt (PRD v2.20, set on **viewing**); reusing that name for
> the admin column would collide technically and, worse, semantically — the admin equivalent must flip
> only via an explicit action, never on view, so it needs a name of its own to keep the two rules from
> merging. **Added `user_notifications.deleted_at`** (nullable timestamptz) — the redesign's "Delete" action (per-row,
> "delete selected", "delete all") is a **soft** delete: a deleted row is hidden from every admin-facing
> read but the row itself is never erased, so the original "retain for audit, never delete" requirement
> survives underneath even though the UI reads as permanent removal. All five columns remain
> **admin-feed-only**, same reasoning as the entry below. **No other structural change** — the three new
> `notification_type` values, the severity enum, and the `app_settings` cutoff-time field from the entry
> below are unaffected by this rename.

> **Status override:** Updated 2026-08-05 - PRD v2.34 / Task 33 (renumbered from v2.32, same reason as
> the entry above): Dispatch Notification Feed — admin
> severity, explicit open/processed lifecycle, and three new schedule-driven `notification_type` values.
> **Added `user_notifications.severity`** (new `notification_severity` enum: `red` / `orange` / `gray`)
> **and `.status`** (new `notification_status` enum: `open` / `processed`, default `open`) **plus
> `.processed_at` and `.processed_by_user_id`** (FK → `users.id`). These four columns are **admin-feed-only**
> — exactly like `read_at` is the driver-notification-only record of acknowledgement, severity/status/
> processed_at/processed_by are meaningful only on rows delivered to an admin recipient and are simply
> unused (default values, never read) on driver-recipient rows; there is one `user_notifications` table for
> both, not two. **Three new `notification_type` values** (still a free varchar, no enum change, same
> reasoning as PRD v2.20): `order_not_accepted_cutoff`, `document_unreviewed_stale`,
> `service_partner_inactive`. Targeting reuses the existing PRD v2.20 mechanism rather than adding
> per-type columns — see "Notification targeting" below for the three new rows. **`app_settings`
> (`key = 'operational.policies'`) gains a new jsonb field, `orderAcceptanceCutoffTime`** (`"HH:MM"`,
> 24h, admin-configurable, default `"15:45"`) — the cutoff `order_not_accepted_cutoff` is computed
> against; no new `app_settings` row/key, just a new field inside the existing canonical key's payload.
> **No change** to `jobs`, `job_locations`, `job_documents`, or `drivers` — every trigger condition reads
> existing columns (`job_locations.scheduled_date` + `window_start` for the cutoff type,
> `job_documents.review_status` + `document_files.uploaded_at`/equivalent for the staleness type, driver
> account-activity data — itself tracked by a separate workstream — for the inactivity type).

> **Status override:** Updated 2026-07-31 - PRD v2.30: consolidated invoices (Admin Phase 12) added
> retroactively — no production table existed for this before this pass. **New `consolidated_invoice_status`
> enum** (`in_review` / `correction_required` / `rejected` / `completed`, kept separate from
> `document_review_status` and `invoice_payment_status`). **New `consolidated_invoices` table** (file,
> supplier invoice number, amount, `driver_offer_sum` snapshot, amount-mismatch flag, status,
> rejection/correction reason, internal note, creator) **and `consolidated_invoice_jobs` join table** — the
> first many-to-many relationship in this schema, since one invoice can cover several completed tours at
> once. Accepting an invoice only flips each linked job's existing `job_financials.payment_status` to
> `paid`; no second payment-status field is introduced. See "Documents and object storage" below for the
> full rationale and "Required constraints and indexes" for the one-active-invoice-per-job guard.

> **Status override:** Updated 2026-07-29 - PRD v2.25: **scope reduction** on the v2.19 content-access audit — opening a driver **notification** is no longer audited. The `notification_viewed` `action_key` and the `driver_notification` `entity_type` are **removed**; a notification points at content that is already audited when the driver opens it, so the pointer entry duplicated the trail and arrived before the actual disclosure. `user_notifications.read_at` remains the notification-level record. Document and Infopoint-message auditing is unchanged. **No structural change.**

> **Status override:** Updated 2026-07-29 - PRD v2.24: auth demo (PR #32) documented retroactively. **No structural change, and none is needed** — Task 2 already makes Keycloak the identity provider and states that AUTHEON "does not store passwords", so sessions and password-reset codes live in Keycloak: there is deliberately **no session table and no `password_resets` table**, and adding one would contradict the PRD. The prototype's in-memory session and reset codes are prototype-only scaffolding. New `audit_events.action_key` values: `driver_signed_in` / `admin_signed_in`, `driver_signed_out` / `admin_signed_out`, `driver_password_reset_requested` / `admin_password_reset_requested`, `driver_password_reset` / `admin_password_reset`, `driver_invite_accepted` / `admin_invite_accepted`.

> **Status override:** Updated 2026-07-29 - PRD v2.20: type-aware driver notifications. **Added `user_notifications.target_entity_type` + `target_entity_id`** (both nullable) so a notification carries a stable reference to the non-tour entity it opens — an `infopoint_news` row for an Infopoint message, a `job_documents` row for a document outcome. `job_id` already covered tour notifications. `deep_link` becomes the client route _derived from_ these ids rather than the navigation source of truth. Added the `(user_id, created_at)` and `(target_entity_type, target_entity_id)` indexes. **No enum change** — `notification_type` stays a free varchar and gains `new_published_job`. Notification **category** and the card's interaction model are derived from `notification_type` in the application layer and deliberately **not stored**. See "Notification targeting" below.

> **Status override:** Updated 2026-07-30 - PRD v2.26: transport-order PDF generation. `generated_job_documents` is **extended** (template key, document title, file name, `booked_at`, `source_data_revision`, `generation_trigger`, `service_partner_snapshot` jsonb, GTC id + version, `checksum_sha256`, `source_checksum_sha256`, `changed_fields` jsonb, `generation_status`, `generation_error`) plus two constraints: a partial unique index enforcing one active document per job, and a unique `(job_id, document_kind, source_data_revision)` making generation idempotent. **No change** to `drivers` (the structured address columns the recipient snapshot needs already exist), `jobs`, `job_distance_estimates` or `audit_events` (one new `action_key`, `pdf_generation_failed`). See "Transport-order PDF versioning" below.
>
> **Status override:** Updated 2026-07-29 - PRD v2.19: driver content-access audit trail. **No structural schema change** — `audit_events` already carries `action_key`, `actor_user_id`, `entity_type`, `entity_id`, `job_id`, `occurred_at` and a `metadata` jsonb, so no column, table, enum, index or migration is added. New `action_key` values recorded when a driver **reads** driver-accessible content: `document_viewed` / `document_downloaded` (`infopoint_documents`), `tour_document_viewed` / `tour_document_downloaded` (`job_documents`), `pdf_viewed` / `pdf_downloaded` (`generated_job_documents` — pre-existing keys, now attributed to the acting **driver** rather than the dispatcher when the access originates in the Driver PWA), `news_item_viewed` (`infopoint_news`). See "Content-access audit" below. **Scope reduced 2026-07-29 (v2.25): `notification_viewed` was removed** — see the status override above.

> **Status override:** Updated 2026-07-22 - PRD v2.5: full admin order-editing implementation + Storno consistency pass. **No new job columns** — editing all eligible business data on any non-terminal order (Storno §7) reuses existing `jobs` / `job_locations` / `job_financials` columns and is captured in `audit_events` under `action_key = 'order_edited'` with a `metadata` jsonb payload carrying the per-field `{field, previous, new}` diff list as one logical edit action (status is preserved, never mutated by an edit). **Added `empty_run_evidence`** (empty-run report attachments → `upload_assets`, mirroring `problem_report_evidence`) so §3.2 optional evidence has a first-class home. **Added the previously-missing FK relationships** for `sp_cancellations`, `empty_run_reports`, `internal_notes`, and `email_change_requests`. **Legacy removal (PRD v2.6, 2026-07-23 — "ignore the special case"):** the `special_case` job_status value and `problem_type.not_performable` have been **removed entirely** — the canonical driver problem workflow is `sp_cancellations` + `empty_run_reports`/`empty_run_evidence`, and the empty-run report model fully replaces the old not-performable → special-case path. New `user_notifications.notification_type` values: `order_updated_after_booking`, `empty_run_reported`, `empty_run_recognised`, `empty_run_not_recognised` (type stays a free varchar).

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

jobs >──< consolidated_invoice_jobs >── consolidated_invoices
  (many-to-many: one invoice can cover several completed jobs at once)
```

## Core entities

| Area                     | Tables                                                                                                                                   | Purpose                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity                 | `users`, `drivers`                                                                                                                       | Keycloak owns authentication. AUTHEON stores the local user record (`users`) linked by `keycloak_id`, with first/last name, status, roles, and email verification state. The driver business profile lives in `drivers` where applicable. Roles are persisted locally and provisioned to Keycloak on account invite.                                                                                    |
| Master data              | `customers`, `locations`                                                                                                                 | Reusable reporting/billing customers and pickup/delivery locations, including customer type, billing notes, and operational instructions. Deactivation replaces deletion where a record is referenced.                                                                                                                                                                                                  |
| Tours                    | `jobs`, `job_locations`, `job_assignments`, `job_status_history`, `job_distance_estimates`, `job_financials`                             | Current operational state plus immutable historical context.                                                                                                                                                                                                                                                                                                                                            |
| Problems (Storno)        | `sp_cancellations`, `empty_run_reports`, `empty_run_evidence`, `internal_notes`; legacy `job_problem_reports`, `problem_report_evidence` | **Canonical (Task 32/Storno):** service-partner cancellations, empty-run reports + optional evidence, and admin-only internal notes. **Legacy (read-only):** `job_problem_reports` / `problem_report_evidence` — retained for back-compat only. The `special_case` status and `not_performable` problem type have been **removed** ("ignore the special case"); the empty-run workflow supersedes them. |
| Documents                | `job_documents`, `document_files`, `job_document_reviews`, `generated_job_documents`, `upload_assets`                                    | Business document, immutable file versions, review history, generated transport-order PDFs, and upload-core binary metadata.                                                                                                                                                                                                                                                                            |
| Billing                  | `consolidated_invoices`, `consolidated_invoice_jobs`                                                                                     | A service-partner invoice covering one or more completed tours at once, with its own review lifecycle — distinct from the per-tour invoice document above and from `job_financials`.                                                                                                                                                                                                                    |
| Content                  | `infopoint_documents`, `infopoint_news`, `infopoint_news_reads`                                                                          | Driver-facing general documents and one-way news.                                                                                                                                                                                                                                                                                                                                                       |
| Notifications            | `notification_preferences`, `push_subscriptions`, `user_notifications`, `outbox_events`, `notification_deliveries`                       | In-app notifications, driver preferences, push endpoints, durable business events, and per-notification delivery attempts.                                                                                                                                                                                                                                                                              |
| Control and traceability | `feature_flags`, `audit_events`, `master_data_change_requests`                                                                           | Optional rollout flags, append-only audit, and the one-open-request driver profile-change workflow.                                                                                                                                                                                                                                                                                                     |

## Prototype coverage review

The following maps every persisted prototype collection in `prototype/project/store.js` to the production design. Display-only fields and derived arrays are intentionally not copied as mutable database state.

| Prototype collection       | Production table(s)                                                                            | Review result                                                                                                                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer master data       | `customers`, job customer snapshot columns                                                     | Covered: type, contact, billing notes, and operational instructions are retained.                                                                                                                                                                                                                  |
| `addresses`                | `locations`, `job_locations`                                                                   | Covered: reusable location plus immutable pickup/delivery snapshot and schedule.                                                                                                                                                                                                                   |
| `documents`                | `infopoint_documents`, `document_files`                                                        | Covered: title, description, category, scope, version, visibility, and optional private file.                                                                                                                                                                                                      |
| `newsItems`                | `infopoint_news`, `infopoint_news_reads`                                                       | Covered: content, publication/visibility, notification flags, and per-user reads.                                                                                                                                                                                                                  |
| `jobs`                     | `jobs`, `job_locations`, `job_financials`, `job_distance_estimates`, `generated_job_documents` | Covered: operational data, snapshot fields, vehicle, costs, documents, distance, PDF versions, and independent statuses.                                                                                                                                                                           |
| `drivers` and `admins`     | `users`, `drivers`, `notification_preferences`                                                 | Covered: shared local user profile with `first_name`/`last_name`, `keycloak_id`, `status`, and `roles`; driver profile/status; and all five prototype notification preferences. Admin and driver authorization uses `users.roles` (`user`, `admin`, `driver`) in addition to Keycloak realm roles. |
| `driverState`              | Derived from jobs, assignments, documents, and notifications                                   | Intentionally not persisted: it is a cacheable UI projection and must not become a second source of truth.                                                                                                                                                                                         |
| `tourDocuments`            | `job_documents`, `document_files`, `job_document_reviews`                                      | Covered: metadata, source, file versions, review/processed state, rejection, correction, and invoice fields.                                                                                                                                                                                       |
| `driverNotifications`      | `user_notifications`                                                                           | Covered: driver recipient, type, tour deep link, read state, title, body, and timestamp.                                                                                                                                                                                                           |
| `adminEmailQueue`          | `outbox_events`, `user_notifications`, `notification_deliveries`                               | Covered: durable business event, admin in-app feed, and per-notification channel delivery attempt/status.                                                                                                                                                                                          |
| `masterDataChangeRequests` | `master_data_change_requests`                                                                  | Covered: submit snapshot, proposed changes, open/approved/rejected status, resolver, and notes.                                                                                                                                                                                                    |
| `featureFlags`             | `feature_flags`                                                                                | Covered: auditable rollout configuration.                                                                                                                                                                                                                                                          |
| `consolidatedInvoices`     | `consolidated_invoices`, `consolidated_invoice_jobs`                                           | **Not previously covered** (added 2026-07-31, PRD v2.30): no production table existed for a multi-tour invoice before this pass. Now covered: linked jobs, file, amount, driver-offer-sum snapshot, mismatch flag, 4-state status, rejection/correction reason, internal note, and creator.        |
| `branding`                 | `app_settings`                                                                                 | Covered: configurable display name and future legal/branding settings without hard-coding product copy.                                                                                                                                                                                            |
| `auditLog`                 | `audit_events` and `job_status_history`                                                        | Covered: generic append-only audit plus structured operational status history.                                                                                                                                                                                                                     |

No production table represents the prototype's former return-request/return-window flow. That is intentional: the current PRD replaces it with the Storno driver flows — `sp_cancellations` (cancellation) and `empty_run_reports`/`empty_run_evidence` (empty-run reporting + admin review).

## Tour data and historical truth

### Master-data references plus snapshots

`jobs.customer_id` and `job_locations.master_location_id` retain their relationship to reusable master data. The job also stores a snapshot of the customer name, type, billing reference, billing notes, instructions, and each pickup/delivery location's address, contacts, schedule, and instructions.

This is intentional. A dispatch edit to a saved address or a customer name must not alter an already assigned tour, an accepted contractual commitment, an audit export, or an already generated PDF. Updating a master record can be offered during draft order entry; it never silently changes a committed tour.

### Assignment mode and marketplace filters

`jobs.assignment_mode` distinguishes between `marketplace` (the job is published and visible to eligible drivers) and `direct` (the job is assigned directly to a specific driver). This determines which notification path fires at publish time.

When `assignment_mode = 'marketplace'`, the columns `required_vehicle_type`, `required_transport_type`, and `pickup_postal_area` drive the eligibility match against `notification_preferences.postal_areas`, `vehicle_type`, and `transport_type`. These are set at publish time and must not change after the job leaves `draft`. Filter preferences hold an approved vehicle type or null (no filter).

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

`jobs.operational_status` governs the tour lifecycle: `draft`, `published`, `assigned`, `accepted`, `performed`, `cancelled`, and the Storno statuses `cancelled_by_sp`, `cancelled_by_autheon`, `empty_run_reported`, `empty_run_recognised`, `empty_run_not_recognised`. (The former `special_case` value has been removed.)

`jobs.document_review_summary` represents the aggregate document state, while each `job_documents` row has its own review state. `jobs.settlement_state` is independent and must never be used to imply that a driver performed a tour. The old return-request state is deliberately absent.

Status transitions belong in a transaction/service layer, not an unconstrained client update. Every transition writes `job_status_history`, `audit_events`, and, where required, `outbox_events`.

`message_delivery_status` is used only for outbox/email/push/in-app delivery attempts. It is not a vehicle pickup/delivery or tour lifecycle status.

### Notification targeting

A notification — driver or admin — has to open **the exact thing it is about**, so `user_notifications` carries the target as ids, never as text:

| Notification family                                                                                                     | Target columns                                                       | Opens                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Tour (`new_published_job`, `order_updated`, `cancelled_by_autheon`, `empty_run_recognised`, `empty_run_not_recognised`) | `job_id`                                                             | the tour — full detail once the driver is committed to it, the reduced Marketplace preview otherwise |
| Infopoint message (`new_infopoint_message`)                                                                             | `target_entity_type = 'infopoint_news'`, `target_entity_id`          | that message                                                                                         |
| Document outcome (`document_accepted`, `document_rejected`)                                                             | `job_id` + `target_entity_type = 'job_document'`, `target_entity_id` | that document's preview on that tour                                                                 |
| Account (`master_data_change_*`, `email_changed`)                                                                       | —                                                                    | informational; no target                                                                             |
| Admin: order not accepted by cutoff (`order_not_accepted_cutoff`)                                                       | `job_id`                                                             | the tour, opened directly into the edit form so dispatch can adjust the driver offer                |
| Admin: document unreviewed 10+ days (`document_unreviewed_stale`)                                                       | `job_id` + `target_entity_type = 'job_document'`, `target_entity_id` | that document's row, highlighted, inside Tour Billing — same shape as the driver document-outcome row |
| Admin: service partner inactive 90+ days (`service_partner_inactive`)                                                   | `target_entity_type = 'driver'`, `target_entity_id`                  | that service partner's profile                                                                       |

**Ids, not display text.** A title, a body and a tour number are display strings — localized, editable, and reusable. Resolving navigation from them would break on a rename and could point at the wrong record. `deep_link` is still stored for the client route, but it is **derived from** these ids and is not authoritative.

**Category and interaction model are derived, not stored.** `order` / `account` / `system` / `general_information`, and whether a card renders an inline tour preview or deep-links, are both a pure function of `notification_type` in the application layer. Storing them would create rows that disagree with the current taxonomy the moment it changes, and would need a migration for a presentation decision.

**Targets are re-checked at read time, never trusted.** Before a notification offers an action, the application resolves the target and confirms the driver may still open it: the tour must still exist, and an order the driver has **not** committed to must still be `published`. A tour that has since been booked by another partner, withdrawn to `draft`, or cancelled resolves as unavailable with a reason, the action is withdrawn, and no acceptance attempt is possible. A document only resolves for a tour the driver is committed to. This is authorization, so it belongs server-side as well as in the client.

**Protected fields are stripped, not hidden.** The preview payload for an order the driver has not committed to must omit customer, full addresses, contact details, plate and VIN entirely (`driver_visibility_matrix`), rather than sending them and hiding them in the UI.

### Content-access audit

Driver **reads** of driver-accessible content are audited alongside writes (PRD v2.19, Task 22). This needs no new structure: `audit_events` is the append-only home, one row per interaction.

| Column          | Content-access meaning                                                                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action_key`    | `document_viewed` / `document_downloaded` (Infopoint general documents) · `tour_document_viewed` / `tour_document_downloaded` · `pdf_viewed` / `pdf_downloaded` (transport-order PDF) · `news_item_viewed` |
| `actor_user_id` | the driver who performed the read — **not** the dispatcher, even where the same service call also serves the admin console                                                                                 |
| `entity_type`   | `infopoint_document` · `tour_document` · `transport_order_pdf` · `infopoint_news`                                                                                                                          |
| `entity_id`     | the affected `infopoint_documents` / `job_documents` / `generated_job_documents` / `user_notifications` / `infopoint_news` row                                                                             |
| `job_id`        | the tour, where the content belongs to one (tour documents, transport-order PDF, tour-linked notifications)                                                                                                |
| `occurred_at`   | timestamp of the read                                                                                                                                                                                      |
| `metadata`      | `actionType` (`viewed` \| `downloaded` — keeps the distinction queryable independently of the action key), the document version where the entity has one, and the document/notification subtype            |

**Append-only, never merged.** Each interaction inserts its own row; repeated views and repeated downloads produce distinct rows. There is no upsert, no counter and no "last viewed at" column — a read count is a query over `audit_events`, not stored state. The existing `(entity_type, entity_id, occurred_at)` index serves "who has read this document" and the `(job_id, occurred_at desc)` index serves the per-tour trail.

**No version column is added.** `infopoint_documents.version_label` and the generated-PDF document-file version already supply "the document version where applicable". `job_documents` has no version concept (a replacement overwrites in place and is separately audited as `tour_document_replaced`), so tour-document access entries simply carry none.

**Marking read is not a read.** `user_notifications.read_at` and `infopoint_news_reads` remain the read-state model and are unchanged; they answer "has this been acknowledged", while `audit_events` answers "who opened it, and when, how many times".

**Opening a notification is deliberately NOT audited** (scope reduced in v2.25). A notification is a _pointer_ to content — a document, an Infopoint message, or a tour — and that content is audited the moment the driver opens it. Auditing the pointer as well recorded the same disclosure twice and, because the pointer entry lands first, made the log claim a document had been seen before it was opened. `user_notifications.read_at` stays the notification-level record.

### Settlement audit

`job_financials.settlement_initiated_by` and `settlement_initiated_at` record which admin triggered the settlement transition and when. This satisfies the audit/compliance requirement that all financial state changes are attributable. The `updated_by_user_id` field covers any financial field edit; `settlement_initiated_by` is specific to the act of opening settlement.

### Master-data change type

`master_data_change_requests.change_type` is a required discriminator (`bank_details`, `address`, `vehicle_info`, `license`, `contact`). Without it the admin review queue cannot filter by type, and the service layer cannot apply type-specific validation rules to the proposed change JSON. The partial unique index on `(driver_id) where status = 'open'` applies regardless of type — one open request per driver at a time.

`reviewed_by_user_id` and `reviewed_at` record the reviewing admin independently of `resolved_by_user_id`, which allows a future multi-step flow where a reviewer and an approver may differ.

**Email is not a master-data change type (T1, 2026-07-20).** The driver's sign-in email (`users.email`) is a credential the driver owns, not ops-managed master data, so it is never carried in a `master_data_change_request`. The `contact` type covers company/phone/contact details only.

### Driver self-service email change (T1)

Email changes follow a _verify, don't approve_ model with no operations/admin step, recorded in `email_change_requests`:

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

### Transport-order PDF versioning (PRD v2.26, 2026-07-30)

`generated_job_documents` rows are **immutable after insert**. The only column ever updated is `is_current`. A relevant order-data change never rewrites a row or its binary: it inserts the next `version_number` pointing at a new `document_files` row, then moves `is_current` in the same transaction. This is what makes an earlier version's binary, checksum and booking-time snapshot permanently reproducible from the audit trail.

Each row carries the full audit set the client technical specification requires: `booked_at`, `source_data_revision`, `generation_trigger`, `service_partner_snapshot`, `generated_by_user_id`, `gtc_document_id` + `gtc_version`, `checksum_sha256` (the stored binary) and `source_checksum_sha256` (the canonical render source — the revision fingerprint that changes if and only if rendered content changes).

Three rules are database concerns, not application discipline:

- **One active document per job and kind.** `CREATE UNIQUE INDEX … ON generated_job_documents (job_id, document_kind) WHERE is_current` — a partial unique index, which DBML cannot express, so `schema.dbml` carries the plain index and this note carries the predicate.
- **Idempotent generation.** `(job_id, document_kind, source_data_revision)` is unique, so a retry, a duplicated event or two concurrent triggers for the same revision cannot mint a second version. The write is the concurrency control.
- **Monotonic versions.** `(job_id, document_kind, version_number)` stays unique, as before.

The **recipient snapshot is frozen at v1 and carried forward unchanged** to every later version of the same booking. A later edit to the service partner's profile must not alter any version of an already binding document — including a new version generated afterwards for an unrelated field change. `drivers.street` / `house_number` / `postal_code` / `city` / `country_code` are the source the snapshot is built from; they already exist and need no change.

`generation_status` = `failed` with `generation_error` records a generation that could not publish (missing mandatory data, renderer error). A failed row never becomes `is_current`, and the previously active document stays current. The matching audit key is `pdf_generation_failed`; `pdf_generated`, `pdf_regenerated`, `pdf_viewed` and `pdf_downloaded` are unchanged.

**Order-creator fields.** The document's `Auftragserstellung` field needs the generating admin's initials/name **and** telephone number. The users/admins representation must expose both; the prototype adds `initials` and `phone` to its admin records. Whether they become mandatory is an open question (see `prd.json` production open questions).

**The PWA distance is not persisted into the document.** `job_distance_estimates` remains the distance source for the PWA and for pricing; it is deliberately not part of the generated document's payload. This is an unresolved conflict with Task 17's older acceptance wording — see `../requirements/transport-order-pdf-traceability.md` blocker B1.

Infopoint documents and problem report evidence are not job-document review artifacts. They link directly to `upload_assets` through `infopoint_documents.upload_asset_id` and `problem_report_evidence.upload_asset_id`.

`upload_assets.owner_id` intentionally remains a scalar actor/user identifier in the backend core upload module. Feature tables enforce foreign keys to `upload_assets`; core uploads do not import the users module just to enforce `owner_id`, because that would break the core-module boundary. User existence and business authorization are enforced by feature use cases before upload creation.

A single-tour invoice is a document with `document_type = 'invoice'`; it is not a separate invoice table in Version 1. Its supplier invoice fields and review/processed state remain on the document. `job_financials` holds the cached invoice/payment summary required by the current prototype, including an explicit admin override, without turning Version 1 into an accounting ledger.

**Consolidated invoices (Admin Phase 12, added 2026-07-31)** are a distinct concept from the single-tour invoice document above, and do get their own table: `consolidated_invoices` plus a `consolidated_invoice_jobs` join table. A service partner's real-world invoice can cover several completed tours at once, which a `job_documents` row (one document, one `job_id`) cannot represent — this is the first place in the schema where one financial record legitimately spans multiple jobs. `consolidated_invoices` stores the invoice file (`upload_asset_id`), the entered amount, a `driver_offer_sum` snapshot computed from the linked jobs' `job_financials.driver_offer_amount` at creation time (for the client's required amount-mismatch check), and its own 4-state `consolidated_invoice_status` lifecycle (`in_review` / `correction_required` / `rejected` / `completed`) — deliberately independent of both `document_review_status` and `invoice_payment_status`. Accepting a consolidated invoice (`completed`) only flips each linked job's existing `job_financials.payment_status` to `paid`; it never introduces a second, competing payment-status field.

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
- Unique `(consolidated_invoice_id, job_id)` on `consolidated_invoice_jobs`. A job may not be linked to more than one _non-rejected_ `consolidated_invoices` row at a time (the prototype guard `countActiveInvoicesForJob`/`getActiveInvoiceForJob`) — enforce server-side with a service-level check inside the same transaction that inserts the join rows, since a partial unique index cannot express "unique except when the referenced parent's status is rejected" across two tables.
- Document queue index: `(job_id, review_status, created_at desc)`.
- Outbox delivery index: `(status, available_at)`.

## Access model and data exposure

Authorization is not a UI concern. The database/service policy must enforce that a driver can retrieve only its own assigned/accepted/performed/cancelled/empty-run tours and permitted documents.

Keycloak is the identity source of truth for authentication. Application services validate the Keycloak token, resolve `sub` to `users.keycloak_id`, and apply AUTHEON domain rules using the local `users` record. `users.status` (`pending_verification`, `active`, `suspended`, `inactive`) and `users.deleted_at` provide application-level access control; they do not replace Keycloak account state. Authorization checks use `users.roles` (`user`, `admin`, `driver`), which are synced to Keycloak when an account is provisioned.

Marketplace queries must project a deliberately reduced view. They must not return full locations, contacts, vehicle identifiers, customer details, internal notes, or PDFs before acceptance. The base `jobs` and `job_locations` tables are never exposed directly to an untrusted driver client.

## Vehicle domain (client confirmation "Systemlogik Fahrzeugeingabe", 2026-07-26)

The vehicle model is **four explicit categories plus independent characteristics**, each with its own field, allowed values and business meaning. An earlier internal proposal to collapse every vehicle classification into one unstructured multi-select tag collection (`vehicle.tags = ["SUV", "own axle", "registered", "electric"]`) was **rejected and superseded** by the client confirmation: the categories carry different cardinalities and different rules, so they must stay distinct. There is no `vehicle_tags` / `vehicle_classifications` structure.

### Entity and field semantics

| Field                              | Cardinality               | Semantics                                                                                                                                                                                                                      |
| ---------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `jobs.vehicle_type`                | **exactly one**           | `passenger_car` (PKW), `truck_up_to_7_5_t` (LKW bis einschl. 7,5 t), `truck_over_7_5_t` (LKW über 7,5 t). The `vehicle_type` enum — only these three values are storable. Single-select, never a multi-select attribute group. |
| `jobs.vehicle_manufacturer`        | exactly one               | Selected from the manufacturer catalogue via a **dropdown**, not free text. Required.                                                                                                                                          |
| `jobs.vehicle_model`               | exactly one               | **Separate** free-text field. Manufacturer and model are no longer squashed into one string.                                                                                                                                   |
| `jobs.licenseplate`                | 0..1                      | **Official** licence plate of the **transported vehicle**. Never a red plate, never replaced by one.                                                                                                                           |
| `jobs.vin`                         | 0..1                      | Exactly **17 characters** when present (confirmed rule). Existing normalization (uppercase, strip spaces/invalid chars, truncate at 17) runs before validation.                                                                |
| `jobs.transport_type`              | **exactly one**           | `own_axle` (Eigenachse) / `third_party_axle` (Fremdachse). Renames the former "axle" concept.                                                                                                                                  |
| `jobs.vehicle_registration_status` | **exactly one**, NOT NULL | `registered` (Zugelassen) / `deregistered` (Abgemeldet). **Independent of transport type** — explicitly represented, never inferred, never merged into a tag array.                                                            |
| `jobs.electric_vehicle`            | independent boolean       | E-Fahrzeug. Combinable with any other characteristic.                                                                                                                                                                          |
| `jobs.ready_to_drive`              | independent boolean       | Fahrbereit. Combinable. See "Ready-to-drive applicability" below.                                                                                                                                                              |

Vehicle type, manufacturer, model, transport type, registration status and both characteristics are **included in the reduced marketplace projection** pre-acceptance (decision-relevant for service partners, non-sensitive). The licence plate and VIN remain hidden until acceptance.

### Official licence plate and deregistration

- registration `registered` → `licenseplate` **required** by the job form.
- registration `deregistered` → `licenseplate` is **optional but fully accepted**. A previous or de-stamped official plate may still be entered when known.

This **replaces** the earlier rule, which hid the input and forced the stored plate to null on deregistration. The plate field must never be disabled, hidden, cleared or replaced by a red-plate field merely because the vehicle is deregistered.

### Red licence plates — derived, never stored, never entered

Red licence plates are brought **independently by the executing service partner**. Their specific number is irrelevant to AUTHEON order creation and is **not recorded**. The requirement is a **derived** system behaviour:

```
requiresRedLicencePlates =
  registrationStatus === DEREGISTERED
  AND transportType    === OWN_AXLE
```

**Four-case decision table:**

| Registration status | Transport type     | Outcome                                           | Notice                          |
| ------------------- | ------------------ | ------------------------------------------------- | ------------------------------- |
| `registered`        | `own_axle`         | Regular transfer on own axle                      | none                            |
| `registered`        | `third_party_axle` | Regular transfer on third-party axle              | none                            |
| `deregistered`      | `own_axle`         | **Red licence plates required**                   | "Rote Kennzeichen erforderlich" |
| `deregistered`      | `third_party_axle` | No red plates required (vehicle is being carried) | none                            |

**Source-of-truth layer.** The rule lives in exactly one domain function, `requiresRedLicencePlates(registrationStatus, transportType)` (prototype: `store.js`, exported on `AuthStore`; production: the backend domain layer). The **backend/domain layer is authoritative**: it computes and returns the value, validates writes, and never trusts a client-supplied one. The frontend imports the same shared helper only for immediate form feedback. No UI component re-implements the condition.

It is deliberately **not persisted**: a stored column could drift from its two inputs and would be writable. The API exposes it as a **read-only derived property** `requiresRedLicencePlates: boolean`. There is no red-plate column of any kind — a manually writable red-plate boolean and any red-plate **number** field are rejected on create/update.

### Ready-to-drive applicability

`ready_to_drive` is decision-relevant for **third-party-axle** transport. Applicability drives **UI emphasis only** (an applicability note under third-party axle): the control stays available in every context and the stored value is **never auto-cleared or rewritten** when the transport type or any other control changes. There is no requirement making it mandatory, so none was added. Final UX behaviour is recorded in `docs/design/driver-screen-spec.md`.

### Approved values only

The three `vehicle_type` values above are the **complete** set. `SUV`, `Van` / `Transporter`, `Classic car` / `Oldtimer` and the older `Light truck <3.5t` / `LKW < 3,5t` band were removed by the client confirmation and are **not storable**: the column is the `vehicle_type` enum, the application rejects anything outside the set on create and update, and no compatibility or preservation layer exists. There is no "(legacy)" display state and no per-value escape hatch while editing a record.

### Migration notes (backend)

| Change                                                | Strategy                                                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `axle_type varchar` → `transport_type transport_type` | 1:1 rename (`driven on own wheels`/`Own axle`/`Eigenachse` → `own_axle`; `third-party axle`/`Third-party axle`/`Fremdachse` → `third_party_axle`). Reversible.      |
| `vehicle_type varchar` → `vehicle_type` enum          | `PKW`/`Car` → `passenger_car`. **Every other pre-existing value requires an explicit client-approved target before the enum cast can run** — see the blocker below. |
| `required_vehicle_type` → `vehicle_type` enum         | Same constraint as above; it is a publish-time copy of the job's type.                                                                                              |
| `vehicle_manufacturer` / `vehicle_model` split        | Manufacturer was previously folded into the model string. Backfill required before `vehicle_manufacturer` becomes `not null`.                                       |
| Drop `red_license_plates`                             | Safe: the boolean carried no information beyond the derived rule.                                                                                                   |
| Drop `red_license_plate_number`                       | The number is not recorded at all. Take a backup before dropping if any production rows hold a value.                                                               |
| Add `ready_to_drive`                                  | `default false`. No historical source exists, so no backfill is attempted.                                                                                          |
| `vehicle_registration_status` → `not null`            | Requires a value on every existing row before the constraint can be added — see the blocker below.                                                                  |

All migrations must be reversible and verified against representative data. Rollback restores `axle_type` from `transport_type` via the inverse 1:1 map; the dropped `red_license_plates` boolean is recomputed from the derived rule.

**Blockers before the enum cast and the NOT NULL constraint can be applied:**

1. **Vehicle type.** Rows holding `SUV`, `Van`, `Transporter`, `Oldtimer`, `Classic` or the `<3.5t` light-truck band have **no approved target value**. The cast to the enum fails until the client approves a mapping (or approves discarding those rows). Do not guess a mapping.
2. **Registration status.** Rows with a null status have no approved default. Defaulting to `registered` or `deregistered` would fabricate a red-plate decision, so the client must supply the value or approve a default.

**Prototype note:** the prototype store is seeded in memory with no persistence layer, so no runtime data migration exists there. The table above is the requirement for the production backend, whose existing data has not yet been surveyed against these two blockers.

## Open decisions that affect the physical schema

| Decision                | Current schema position                                                                                                                                                                                                                                                                                                                                                                                                                              | Approval needed                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Authentication          | Keycloak selected. `users.keycloak_id` links AUTHEON records to Keycloak users. Local `users.roles` are provisioned to Keycloak on invite. No password or identity-provider-link tables are stored in AUTHEON.                                                                                                                                                                                                                                       | Realm/client configuration, exact role names/groups, token claims, admin MFA policy, and user provisioning flow. |
| Map/distance            | `jobs.distance_km` is the single canonical distance (estimate or admin entry). `job_distance_estimates` is calculation history only (provider/raw result), not a second current distance.                                                                                                                                                                                                                                                            | Provider, routing profile, country coverage, pricing/retention requirements.                                     |
| Admin alerts            | Durable outbox/delivery records, but no hard-coded recipient list.                                                                                                                                                                                                                                                                                                                                                                                   | Recipient groups, escalation rules, business hours, sender/reply policy.                                         |
| File retention/security | Versioned metadata supports deletion/hold policy; storage implementation remains open.                                                                                                                                                                                                                                                                                                                                                               | EU-region requirement, retention periods, malware scanner, size/type limits, deletion authority.                 |
| Product display name    | `system_settings`/branding configuration is intentionally deferred.                                                                                                                                                                                                                                                                                                                                                                                  | Final name, legal entity details, domain, sender identity, localization rules.                                   |
| Finance                 | `job_financials` holds operational amounts (`revenue_amount`, `driver_offer_amount`, `expenses_amount`) plus optional net/gross and invoice/payment summary fields. BE uses `currency` / `vat_rate` for DBML `currency_code` / `tax_rate`. Marketplace reads `driver_offer_amount` only. `jobs.settlement_state` remains the tour closeout state. Payment/invoice summary may still live on `jobs` in BE V1 until fully moved onto `job_financials`. | Whether advanced invoices/ledger/accounting integration become approved scope.                                   |

## Cancellation attribution and driver communication

`jobs.cancellation_actor`, `cancellation_reason_code`, and `cancellation_reason_text` record who cancelled and why. When dispatch cancels an assigned tour, `cancellation_reason_text` is the **driver-facing message** shown in the driver PWA and `order_cancelled_by_autheon` notifications — not an internal-only note.

## Order cancellation & empty-run workflow (Task 2)

Cancellation and empty-run reporting are **separate processes** with distinct statuses, validation, and audit entries — never a shared status or backend action.

**Status model — extended enum, not a discriminator.** `job_status` gains explicit machine values: `cancelled_by_sp`, `cancelled_by_autheon`, `empty_run_reported`, `empty_run_recognised`, `empty_run_not_recognised`. Each carries its own rules, ⚠-availability logic, and audit entries; overloading `cancelled` would lose that distinction. `cancelled` remains as a legacy umbrella (the former `special_case` umbrella has been removed). The Jobs board stays scannable by rolling precise statuses up to **umbrella columns** (cancelled_by_sp / cancelled_by_autheon / empty_run_not_recognised → _Cancelled_; empty_run_reported → its own _Empty run reported_ review column; empty_run_recognised → _Performed_) and showing the precise status as a **reason chip** per row.

**Service-partner cancel (§2).** Only on a booked order (`assigned`/`accepted`). Requires a reason (`sp_cancellation_reason`) and a ≥30-char explanation. Result: `cancelled_by_sp`, read-only, removed from the partner's active list but retained in history, admin notified, audit `cancelled_by_service_partner`. Stored in `sp_cancellations` (reason, explanation, date/time, executing partner). Not auto-republished; no fee processing in-system.

**Empty-run report (§3) + review (§4).** The _order_ cannot be executed. Requires a reason (`empty_run_reason`) and a ≥30-char description; optional evidence must never block submission. Result: `empty_run_reported`, report locked for the partner, admin notified, audit `empty_run_reported`, stored in `empty_run_reports` with optional attachments in `empty_run_evidence` (never required to submit, §3.2). Admin review has exactly two outcomes (`empty_run_decision`): `recognised` → `empty_run_recognised`; `not_recognised` → `empty_run_not_recognised`. Both are terminal/read-only, push + in-app notify the partner, and audit `empty_run_recognised`/`empty_run_not_recognised`. A not-recognised empty run does **not** reactivate the original order. **`empty_run_recognised` is an empty-run resolution, NOT a performed transport:** the vehicle transfer did not happen, so it must never increment a driver's Performed-job count, release probation, or trigger performed-specific completion logic — probation and completion always key off the precise `performed` status, never the board umbrella. The `statusUmbrella()` rollup (which groups `empty_run_recognised` under the _Performed_ board column for scannability) is **presentation/query grouping only** and must never drive probation, completion, cancellation, editing, or transition logic.

**Autheon cancellation (§5).** Admin may cancel unbooked (`published`) and booked orders → `cancelled_by_autheon`, read-only, never deleted, stays visible in backend and partner history. Unbooked is removed from the marketplace immediately (the pickup-cutoff policy applies only to **booked** orders — an unbooked order has no committed partner). Booked cancellation pushes a partner notification. Audit `cancelled_by_autheon`.

**Internal notes (§6).** `internal_notes` is append-only, admin-only, never exposed to the service-partner frontend; each note auto-stamps author + timestamp and is permanently attached.

**Edit active order (§7).** Admins may edit **all eligible business data** of any non-terminal order — draft, published, assigned, accepted and `empty_run_reported` — through the same canonical Create/Edit Job form used for creation (one `canAdminEditOrder()` eligibility policy, not scattered status arrays). On save: persist immediately, preserve the operational status (a business-data edit never changes status and never mutates cancellation/empty-run/status-history records), push + in-app notify the assigned partner with the **actual driver-visible changed values** in one combined notification (no re-confirmation; internal notes and admin-only financials are audited but never included in the partner notification), and audit **previous + new** values per changed field (`order_edited`). Editing business data does **not** require reverting a Published order to Draft. The schedule-change cutoff (`operational.policies`) gates only schedule-field changes on a committed order — with an authorized override + audit note where enabled — and never blocks non-schedule fields.

**Duplicate order (§9).** Creates a new `draft` copying all data with a new order number, opens it in the editor, leaves the original unchanged, and is not in the marketplace until explicitly published. Audit `order_duplicated`, and publication of the duplicate is audited on publish.

**⚠ availability (§10).** The service-partner ⚠ action is available only on booked orders and is hidden for all terminal states and while an empty-run report is pending review.

**Cancelled/completed behaviour (§8).** Terminal orders cannot be reactivated, edited, reset to a previous status, or directly republished; they stay visible in the backend and the partner's history.

**Concurrency.** Repeat/concurrent submissions must not create duplicate status changes, notifications, or audit entries (guarded by status preconditions — e.g. empty-run report only from `assigned`/`accepted`, review only from `empty_run_reported`).

## App settings (`app_settings`)

Key/value JSON configuration managed by admins (see PRD Task 31 and `resolved_defaults.app_settings_catalog_v1`):

| Key                                   | Purpose                                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `branding.display`                    | Product display name in UI                                                                                                                                               |
| `operational.policies`                | Minimum hours before pickup for admin cancel and schedule change; optional override-with-audit flag                                                                      |
| `cancellation.policies`               | Required reason code, minimum driver message length for admin cancel                                                                                                     |
| `driver.acceptance.probationJobCount` | System-wide probation allowance; its value is **copied into** `drivers.probation_job_limit` at driver creation (replaces `driver.acceptance.defaultDailyJobLimit`, F-01) |
| `driver.inactivity.policy`            | Automatic deactivation of dormant service partners: `{ enabled, thresholdDays, warningDays }`, default `{ true, 90, 15 }`. Read **live** by the sweep — deliberately *not* snapshotted onto the driver row like `probationJobCount`, because the policy is a platform-wide rule evaluated fresh each run rather than a term fixed per partner at signup |

## Automatic deactivation of inactive service partners (resolves OQ-15)

Three columns on `drivers` carry this feature. Full decision record: `prd.json` →
`resolved_defaults.driver_inactivity_auto_deactivation_v1`.

| Column | Meaning |
| --- | --- |
| `last_activity_at` | Last authenticated request by the partner. Written by a global interceptor on any driver-authenticated request, throttled to one write per hour per partner. **Indexed** (`idx_drivers_last_activity_at`) — the sweep's only predicate is a range scan over it. |
| `inactivity_warning_sent_at` | Idempotency marker for the pre-deactivation warning; cleared whenever `last_activity_at` is stamped. |
| `deactivation_reason` | `'inactivity'` when the platform deactivated the partner; `NULL` when a human did. |

**Dormancy is `COALESCE(last_activity_at, created_at)`.** A `NULL` activity
timestamp means "never signed in", not "idle forever" — reading it the second way
would deactivate every partner on their onboarding day, before the invitation
email had been opened. The fallback is applied in SQL, not by filtering in
memory, so the sweep never loads the whole partner table to discard most of it.

**Which axis this touches.** Deactivation sets `drivers.status = 'inactive'` —
the operational/marketplace axis **only**. `users.status` and the identity
provider are untouched, so the partner can still sign in, read their tour
history, and see why marketplace access was lost. This matches
`update-driver-status` (operational, no identity call) and differs from
`suspend-user` (disables the Keycloak user and revokes sessions) and
`delete-driver` (deletes the identity). Enforcement needs no new call sites:
`inactive` was already an access-restricting status.

**Reversal.** An admin setting the partner back to `active` clears
`deactivation_reason` **and** re-stamps `last_activity_at`. Without the re-stamp
the partner's last activity would still be months old and the next nightly sweep
would silently undo the reactivation.

**Concurrency.** The sweep runs inside a transaction holding
`pg_try_advisory_xact_lock('drivers:inactivity-sweep')`, so in a multi-replica
deployment exactly one instance acts and a partner cannot be deactivated — or
notified — once per pod.

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
