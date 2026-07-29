# PRD changelog: 2026-07-29 (v2.14 → v2.15)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`

> **Scope of this file:** the **v2.15** entry only. PRD **v2.11 – v2.14** (all dated 2026-07-29 — admin manufacturer/model catalogue, vehicle search, and the admin orders-overview client fixes) are recorded in the `version` history string inside `prd.json` and in [`../../requirements/admin-client-requirements-status.md`](../../requirements/admin-client-requirements-status.md), but were never given a separate changelog file. That gap is pre-existing and is **not** back-filled here.

---

## PRD v2.15 — Driver content-access audit trail (2026-07-29)

**Baseline:** PRD v2.14 (admin orders-overview Phase 4 client fixes)
**Source:** work order "Create Audit Log Entries for Every Driver Document, Notification, and Infopoint Message View or Download", refining the existing **Task 22 — Audit Log & Status History**.

Scope note: the deliverable is an updated **clickable prototype** plus updated requirements docs. Backend behaviour remains **simulated** in the prototype and is captured here as a requirement for the dev team.

This is a **business-requirement refinement, not a new feature area**: Task 22 already required that "all important actions" be logged with action type, actor, affected entity, timestamp and metadata. What it did not state is that *driver reads of driver-accessible content* count as such actions. This entry makes that explicit and closes the gap the prototype had.

### 1. Previous behaviour (v2.14, as specified and as implemented)

Task 22's enumerated action list covered **writes** — orders created/edited/published/assigned/accepted/performed/cancelled, documents uploaded/replaced/rejected/accepted, PDFs generated, driver lifecycle changes, audit export. **Reads were almost entirely unaudited.**

In the prototype specifically:

| Driver interaction | Audited before | Problem |
| --- | --- | --- |
| Transport-order PDF view | `pdf_viewed` | Actor was hardcoded to the dispatcher — a **driver's** view was recorded as the admin's |
| Transport-order PDF download | `pdf_downloaded` | Same wrong actor; no version recorded |
| Tour document view | — | Not logged at all |
| Tour document download | — | Not logged at all |
| Infopoint general-document view | — | Not logged at all |
| Infopoint general-document download | — | Not logged at all |
| Driver notification view | — | Not logged at all |
| Infopoint message (news) view | — | Not logged at all |

So the audit log could show that dispatch produced a document but not that the assigned driver ever read it — and where a read *was* logged, it was attributed to the wrong person.

### 2. New behaviour (v2.15)

Four acceptance criteria were appended to the **existing** Task 22. No new task and no duplicate audit requirement was created.

- Every Driver PWA view of driver-accessible content writes its **own** audit entry: document viewed, document downloaded, driver notification viewed, and Infopoint message viewed (including opening the message detail view).
- Content-access entries record the **acting driver**, the affected document/notification/message, the **timestamp**, the **document version** where the entity has one, the linked **job/tour** where applicable, and a machine-readable **action type** distinguishing `viewed` from `downloaded`.
- Content-access entries are **append-only** and are never merged or deduplicated: repeated views and repeated downloads each produce a distinct entry.
- Content-access logging **reuses the existing content request flows**; no additional endpoint is introduced for document logging.

The behavioural detail is captured in `prd.json` → `resolved_defaults.driver_content_access_audit_v1`.

### 3. Action keys

Keys stay **stable English** (`resolved_defaults.audit_log_language_v1`: "English action keys; UI localized EN/DE") and follow the `<entity>_<past-tense-verb>` convention the audit log already uses (`job_published`, `tour_document_uploaded`, `document_replaced`, `pdf_regenerated`, …). No new naming scheme was invented.

| Content | View key | Download key |
| --- | --- | --- |
| Infopoint general document | `document_viewed` | `document_downloaded` |
| Tour document (driver upload or dispatch off-channel) | `tour_document_viewed` | `tour_document_downloaded` |
| Transport-order PDF | `pdf_viewed` *(pre-existing)* | `pdf_downloaded` *(pre-existing)* |
| Driver notification | `notification_viewed` | — |
| Infopoint message (news item) | `news_item_viewed` | — |

`document_*` is reserved for Infopoint general documents because the admin console already writes `document_created` / `document_updated` / `document_replaced` / `document_deleted` for exactly that entity; `tour_document_*` matches the existing `tour_document_uploaded` / `tour_document_replaced` / `tour_document_checked`; `news_item_*` matches `news_item_created` / `news_item_updated` / `news_item_hidden` / `news_item_shown`.

Every entry additionally carries a machine-readable **`actionType`** of `viewed` or `downloaded`, so the viewed/downloaded distinction is queryable without parsing the action key — and stays correct if a key is ever renamed.

### 4. What counts as a "view"

Resolved from existing behaviour rather than invented:

- **Document view** — the driver requests a preview of the file. Repeated previews are repeated views.
- **Document download** — the driver requests the file for download. Audited as `downloaded`, never additionally as a view.
- **Notification view** — the driver **opens the notifications panel**. That is one notification-list request, and the panel renders every row's full title and body, so each notification the request carries is audited as a view. Reopening the panel is a new view and appends new entries. **Read/unread state is deliberately untouched** — opening the panel does not mark anything read, and marking read is not itself a view.
- **Infopoint message view** — the driver **opens** a message. Audited immediately, before read state is touched, so an already-read message re-opened is audited again. Collapsing an open message is not a view.

### 5. Explicitly out of scope

- **No data-model change.** Production `audit_events` already carries `action_key`, `actor_user_id`, `entity_type`, `entity_id`, `job_id`, `occurred_at` and a `metadata` jsonb. `actionType`, the document version and the notification/document subtype are **metadata**, not new columns. No migration, no new table, no new enum. `schema.dbml` and `logical-model.md` are annotated with the new action keys only, exactly as previous versions annotated theirs.
- **No new endpoint.** Every entry is appended inside a request the Driver PWA already makes.
- **Unchanged:** document preview rendering, download behaviour, share, print, access control and permission checks, Infopoint navigation, Infopoint read/unread behaviour, notification read/unread behaviour, and the admin Audit log table + CSV export (still the same five columns: `at`, `action`, `actor`, `entity`, `meta`).
- **Tour documents carry no version.** The tour-document model has no version field (replacement overwrites in place); the transport-order PDF uses `pdfVersion` and Infopoint documents use `version`. "Document version where applicable" is therefore satisfied without adding a field.

### 6. Open questions — NOT decided in this pass

1. **Share and print.** The document preview sheet offers share and print alongside download. Only view and download are audited. Whether share/print are separate auditable disclosure events is a product decision — the work order raised it as an open question and no repository source answers it.
2. **Failed and unauthorized access attempts.** An unknown, hidden or unauthorized target currently fails safely and audits **nothing**. Whether denied attempts should be recorded (a security-monitoring requirement, distinct from content traceability) is undecided.
3. **Notification view granularity.** A view is recorded per notification carried by a panel opening. If the product instead wants per-row tap granularity, that is a narrower rule and would need confirming — but it would leave notifications that are not tappable (for example `master_data_change_sent`, `email_changed`, which carry no job) permanently unaudited, which is why the list-request rule was chosen.

---

## Files touched

| File | Change |
| --- | --- |
| `docs/requirements/prd.json` | Task 22 acceptance extended (4 criteria); `resolved_defaults.driver_content_access_audit_v1` added; `version` → v2.15 |
| `prototype/project/store.js` | `log()` accepts optional machine-readable fields; `logContentAccess()` + `contentAccessActor()`; audited `getTransportOrderPreview` / `downloadPdf` / `getTourDocumentPreview` / `downloadTourDocumentPlaceholder` / `getInfopointDocumentPreview` / `downloadInfopointDocument`; new `recordDriverNotificationViews()` and `openInfopointNews()` |
| `prototype/project/driver.jsx` | Driver call sites declare `{ actor: "driver" }`; notifications panel audits the list it renders; Infopoint message open routes through `openInfopointNews` |
| `docs/database/schema.dbml` | Header annotation: new action keys, reusing `audit_events` unchanged |
| `docs/database/logical-model.md` | Same annotation + content-access read note |
| `docs/product/autheon-context-pack.md` | Version trail → v2.15; content-access audit bullet |

**Not touched:** migrations, backend entities, DTOs, API payloads, `docs/design/*` (no visual, layout, copy, interaction or responsive change — the admin Audit log renders new rows through its existing table and the Driver PWA is visually identical), `prototype/project/i18n.js` (action keys are English identifiers, never localized, and no user-facing string was added).
