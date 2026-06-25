# AUTHEON database logical model

> **Status:** Draft for architecture review. [`schema.dbml`](schema.dbml) is the accompanying relational schema. [`../requirements/prd.json`](../requirements/prd.json) remains the functional source of truth.

## Scope and modelling approach

The prototype stores a whole tour as one mutable JavaScript object, including display-only copies of locations, contacts, customer name, financial values, documents, history, and notifications. That is appropriate for a demo but unsafe for production: it overwrites historical facts, cannot enforce concurrent acceptance, and has no durable audit or delivery boundary.

The production model separates master data, transactional tour data, immutable history, and external file/delivery state. PostgreSQL is the target database. The schema is single-operator for Version 1; do not introduce a tenant key until AUTHEON has a real multi-tenant commercial requirement.

## Entity map

```text
app_users ──1:0..1── drivers ──< job_assignments >── jobs
    │                                                    │
    ├──< audit_events                                  ├──< job_locations
    ├──< user_notifications                             ├──< job_status_history
    └──< authentication_identities                      ├──< job_problem_reports
                                                        ├──< job_documents ──< document_files
customers ───────────────────────────────────────┤
locations (optional master-data reference) ──────────────┘

infopoint_documents / infopoint_news ──< read receipts
outbox_events ──< notification_deliveries
```

## Core entities

| Area | Tables | Purpose |
| --- | --- | --- |
| Identity | `app_users`, `authentication_identities`, `drivers` | Separate application users from external authentication and the driver business profile. One user can have roles; a driver has a dedicated profile. |
| Master data | `customers`, `locations` | Reusable reporting/billing parties and pickup/delivery locations, including party type, billing notes, and operational instructions. Deactivation replaces deletion where a record is referenced. |
| Tours | `jobs`, `job_locations`, `job_assignments`, `job_status_history`, `job_distance_estimates`, `job_financials` | Current operational state plus immutable historical context. |
| Problems | `job_problem_reports`, `problem_report_evidence` | Cancellation and not-performable reports, reasons, evidence, and the pre-problem status needed for dispatch resolution. |
| Documents | `job_documents`, `document_files`, `job_document_reviews`, `generated_job_documents` | Business document, immutable file versions, review history, and generated transport-order PDFs. |
| Content | `infopoint_documents`, `infopoint_news`, `infopoint_news_reads` | Driver-facing general documents and one-way news. |
| Notifications | `notification_preferences`, `push_subscriptions`, `user_notifications`, `outbox_events`, `notification_deliveries` | In-app notifications, driver preferences, push endpoints, and reliable external delivery. |
| Control and traceability | `feature_flags`, `audit_events`, `master_data_change_requests` | Optional rollout flags, append-only audit, and the one-open-request driver profile-change workflow. |

## Prototype coverage review

The following maps every persisted prototype collection in `prototype/project/store.js` to the production design. Display-only fields and derived arrays are intentionally not copied as mutable database state.

| Prototype collection | Production table(s) | Review result |
| --- | --- | --- |
| Customer master data | `customers`, job customer snapshot columns | Covered: type, contact, billing notes, and operational instructions are retained. |
| `addresses` | `locations`, `job_locations` | Covered: reusable location plus immutable pickup/delivery snapshot and schedule. |
| `documents` | `infopoint_documents`, `document_files` | Covered: title, description, category, scope, version, visibility, and optional private file. |
| `newsItems` | `infopoint_news`, `infopoint_news_reads` | Covered: content, publication/visibility, notification flags, and per-user reads. |
| `jobs` | `jobs`, `job_locations`, `job_financials`, `job_distance_estimates`, `generated_job_documents` | Covered: operational data, snapshot fields, vehicle, costs, documents, distance, PDF versions, and independent statuses. |
| `drivers` and `admins` | `app_users`, `user_roles`, `drivers`, `notification_preferences` | Covered: shared identity, roles, driver profile/status, and all five prototype notification preferences. |
| `driverState` | Derived from jobs, assignments, documents, and notifications | Intentionally not persisted: it is a cacheable UI projection and must not become a second source of truth. |
| `tourDocuments` | `job_documents`, `document_files`, `job_document_reviews` | Covered: metadata, source, file versions, review/processed state, rejection, correction, and invoice fields. |
| `driverNotifications` | `user_notifications` | Covered: driver recipient, type, tour deep link, read state, title, body, and timestamp. |
| `adminEmailQueue` | `outbox_events`, `notification_deliveries`, `user_notifications` | Covered: durable event, per-channel delivery attempt/status, recipient, and admin in-app feed. |
| `masterDataChangeRequests` | `master_data_change_requests` | Covered: submit snapshot, proposed changes, open/approved/rejected status, resolver, and notes. |
| `featureFlags` | `feature_flags` | Covered: auditable rollout configuration. |
| `branding` | `app_settings` | Covered: configurable display name and future legal/branding settings without hard-coding product copy. |
| `auditLog` | `audit_events` and `job_status_history` | Covered: generic append-only audit plus structured operational status history. |

No production table represents the prototype's former return-request/return-window flow. That is intentional: the current PRD replaces it with `job_problem_reports` for cancellation and not-performable handling.

## Tour data and historical truth

### Master-data references plus snapshots

`jobs.customer_id` and `job_locations.master_location_id` retain their relationship to reusable master data. The job also stores a snapshot of the customer name, type, billing reference, billing notes, instructions, and each pickup/delivery location's address, contacts, schedule, and instructions.

This is intentional. A dispatch edit to a saved address or a customer name must not alter an already assigned tour, an accepted contractual commitment, an audit export, or an already generated PDF. Updating a master record can be offered during draft order entry; it never silently changes a committed tour.

### Assignment and acceptance

`job_assignments` records every direct assignment, reassignment, and marketplace acceptance. Only one open assignment may exist per job. The current assignee is duplicated in `jobs.current_driver_id` for fast authorization and list queries, but the assignment table is the history.

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

## Documents and object storage

Files are not stored in PostgreSQL blobs. `document_files.storage_key` points to private object storage and is immutable once committed. Replacing a file creates a new version; it does not overwrite the previous file record. This preserves review evidence and supports audit, retention, malware scan state, and later legal-hold rules.

`job_documents` represents the business document type on the tour. Its `current_file_id` points to the active immutable file version; older files remain linked through `document_files.supersedes_file_id`. An invoice is a document with `document_type = 'invoice'`; it is not a separate invoice table in Version 1. Its supplier invoice fields and review/processed state remain on the document. `job_financials` holds the cached invoice/payment summary required by the current prototype, including an explicit admin override, without turning Version 1 into an accounting ledger.

## Required constraints and indexes

The SQL implementation must include at least these controls:

- Unique `jobs.tour_number` and `drivers.partner_code`.
- Unique active assignment per job: partial unique index on `job_assignments(job_id) where ended_at is null`.
- One `pickup` and one `delivery` row per job: unique `(job_id, location_role)`.
- One open master-data change request per driver: partial unique index on `master_data_change_requests(driver_id) where status = 'open'`.
- Draft-only hard deletion enforced by a stored procedure/service transaction. Non-draft jobs are never hard-deleted.
- `delivery_date >= pickup_date` where both values are present; time-window sanity checks at service level because flexible windows are allowed.
- Active marketplace index: `(operational_status, pickup_postal_code, pickup_date)` for published tours.
- Driver work queue index: `(current_driver_id, operational_status, pickup_date)`.
- Audit and status-history indexes: `(job_id, occurred_at desc)`.
- Document queue index: `(job_id, review_status, created_at desc)`.
- Outbox delivery index: `(status, available_at)`.

## Access model and data exposure

Authorization is not a UI concern. The database/service policy must enforce that a driver can retrieve only its own assigned/accepted/performed/cancelled/special-case tours and permitted documents.

Marketplace queries must project a deliberately reduced view. They must not return full locations, contacts, vehicle identifiers, customer details, internal notes, or PDFs before acceptance. The base `jobs` and `job_locations` tables are never exposed directly to an untrusted driver client.

## Open decisions that affect the physical schema

| Decision | Current schema position | Approval needed |
| --- | --- | --- |
| Authentication | Provider-neutral `authentication_identities`; no password columns in application tables. | Identity provider, driver login method, admin MFA/SSO requirements. |
| Map/distance | `job_distance_estimates` records provider, raw result, and manual override. | Provider, routing profile, country coverage, pricing/retention requirements. |
| Admin alerts | Durable outbox/delivery records, but no hard-coded recipient list. | Recipient groups, escalation rules, business hours, sender/reply policy. |
| File retention/security | Versioned metadata supports deletion/hold policy; storage implementation remains open. | EU-region requirement, retention periods, malware scanner, size/type limits, deletion authority. |
| Product display name | `system_settings`/branding configuration is intentionally deferred. | Final name, legal entity details, domain, sender identity, localization rules. |
| Finance | `job_financials` holds only operational amounts and settlement state. | Whether advanced invoices/ledger/accounting integration become approved scope. |

## Explicit non-goals

- Live GPS/location tracking or map tiles.
- Customer self-service accounts and booking portal.
- Full double-entry accounting or ERP integration.
- Historical spreadsheet migration or mass import.
- Database storage of file binaries.
- A separate tablet-only data model.
