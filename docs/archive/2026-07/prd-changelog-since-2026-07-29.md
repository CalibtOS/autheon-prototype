# PRD changelog: 2026-07-29 (v2.14 → v2.16)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`

> **Scope of this file:** the **v2.15** and **v2.16** entries. PRD **v2.11 – v2.14** (all dated 2026-07-29 — admin manufacturer/model catalogue, vehicle search, and the admin orders-overview client fixes) are recorded in the `version` history string inside `prd.json` and in [`../../requirements/admin-client-requirements-status.md`](../../requirements/admin-client-requirements-status.md), but were never given a separate changelog file. That gap is pre-existing and is **not** back-filled here.

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

---

## PRD v2.16 — Type-aware notification previews and contextual deep links (2026-07-29)

**Baseline:** PRD v2.15 (driver content-access audit trail)
**Source:** work order "Implement Type-Aware Notification Previews and Contextual Deep Links", extending the existing **Task 20 — Driver Push Notifications & Admin Critical Alerts**.

Scope note: the deliverable is an updated **clickable prototype** plus updated requirements/data-model/design docs. Push *delivery* remains **simulated** — what is implemented is the resolution and navigation layer a real push integration plugs into.

### 1. Previous behaviour (v2.15, as implemented)

Every notification rendered as one flat row: unread dot, title, body, `createdAt · tour`. Nothing distinguished a tour update from an account event, and the interaction model was crude:

- **No category.** A driver scanning the list could not tell an order update from a profile decision.
- **No preview.** The only way to see what a tour notification was about was to leave the Notification Center and open the order.
- **Navigation collapsed to two branches.** `infopoint_news` → the Infopoint **tab** (not the message); anything with a `jobId` → the order; everything else was a dead, unclickable row.
- **No stable reference for non-tour targets.** `infopoint_news` rows carried no `newsId`, `document_rejected` rows no document id — so deep-linking to the exact message or file was impossible, and a hint ("Also in Infopoint → New messages") stood in for it.
- **No availability check.** A notification about a Marketplace order that had since been booked by someone else still offered to open it.
- **No push routing.** No `notificationclick` seam existed at all; there was nowhere for a tap to route to.
- **Coverage gaps against the existing matrix.** `document_accepted` was specified as a driver in-app event and had **no implementation**; newly published matching Marketplace orders produced a simulated push and **no** in-app row, so the notification list never mentioned marketplace work.
- **Hard-coded English.** `"Document rejected"`, `"Change request sent"`, `"Profile change approved"` and `"…declined"` were literals in `store.js` — no DE.

### 2. New behaviour (v2.16)

Eleven acceptance criteria were appended to the **existing** Task 20. No new task, no duplicate notification requirement.

**Card anatomy — every card, every type:** category chip · event heading · preview text **clamped to two lines** · date and time · read/unread dot. Date grouping, unread treatment, **Mark all read** and the panel close behaviour are untouched.

**Categories** (chip on every card) are `order` · `account` · `system` · `general_information`, taken verbatim from the work order's examples. They are **derived from `notification_type`**, never stored.

**Two interaction models — and explicitly no universal bottom sheet:**

| Family | Model |
| --- | --- |
| Tour (`new_published_job`, `order_updated`, `cancelled_by_autheon`, `empty_run_recognised`, `empty_run_not_recognised`) | inline expandable preview, control on the **right**; expanding stays in the Notification Center |
| Infopoint message (`infopoint_news`) | **deep-links to that message** — no accordion |
| Document (`document_accepted`, `document_rejected`) | **deep-links to that document's preview** — no accordion |
| Account (`master_data_change_*`, `email_changed`) | informational; no preview, no link |

**Expanded tour preview** shows pickup and delivery, schedule, vehicle (type · manufacturer · model, transport type, registration status), licence plate where visible, the red-plate notice where derived, and the order status.

**Visibility is enforced by omission, not by hiding.** For an order the driver has **not** committed to, the preview payload does not contain customer, `name`/`street` on either leg, contact person, plate or VIN — those keys are absent from the object the view receives (`driver_visibility_matrix`). The card also states that they become visible after acceptance.

**Contextual primary action:** *View order* for an order on the marketplace (opens the reduced Marketplace preview), *To my orders* for a committed tour (opens the full detail). Which screen a notification may open comes from the same entitlement rule the Marketplace and My Orders use, so a notification can never open a screen those surfaces would keep locked.

**Unavailable Marketplace orders.** Availability is re-resolved every render. A tour the driver has not committed to must still be `published`; otherwise the card says why — *booked by another service partner* (`assigned`/`accepted`), *withdrawn from the marketplace* (`draft`), *cancelled*, or *closed* — **removes** *View order*, and offers **View more orders**, which opens the Marketplace. No stale availability, no possible acceptance attempt.

**Navigation resolves through ids.** Order id, message id, document id — never the title, body or tour number, which are display text and are localized.

**Push taps** carry the notification id on the launch URL (`?notify=<id>`) and go through the same resolver: a tour push opens its card **already expanded**, an Infopoint push opens **the message**, a document push opens **the document** — never the generic overview. One handler covers all three launch states (cold start and home-screen launch arrive as a URL; a tap on a running or backgrounded instance re-navigates the existing client). Anything missing, withdrawn, expired or no longer permitted lands on the Notification Center with that card expanded, stating why — a safe fallback, never a blank screen.

**Coverage gaps closed** against the *existing* matrix: `document_accepted` now creates its notification, and newly published matching Marketplace orders now appear in-app.

**Localization.** The four hard-coded English notification strings moved to `i18n.js` with DE (EN/DE parity verified: 1364/1364 keys). The now-redundant `driverNotifInfopointHint` was removed — the card deep-links to the message instead of hinting at where to find it.

### 3. Notification channel matrix — one change, in-app only

`new_published_job_matching_preferences`: **`driver_in_app` false → true.**

**`driver_push` is untouched, and so is eligibility.** The in-app row is created for exactly the set that already receives the push — push enabled **and** the newly-published toggle on **and** the postal-area filter matching. No driver who was not already eligible receives anything new, and **direct assignment still generates no Marketplace-style new-order push**. The work order's constraint is about which events generate *push*; this is the in-app column, and the same work order requires the Notification Center to surface the event.

`document_accepted` was **already** `driver_in_app: true, driver_push: false` — no matrix change, only the missing implementation.

### 4. Data model — two nullable columns

`user_notifications` gains **`target_entity_type varchar(64)`** and **`target_entity_id uuid`**, plus the `(user_id, created_at)` and `(target_entity_type, target_entity_id)` indexes.

Why it is needed and not avoidable: `job_id` already covers tour notifications, but an Infopoint message notification and a document notification have to open a specific `infopoint_news` / `job_documents` row and had **nowhere** to record which one. `deep_link varchar(1024)` already existed but is a client route — parsing an id back out of a URL is not a stable entity reference, so `deep_link` is now documented as *derived from* these ids rather than authoritative.

Deliberately **not** stored: the notification **category** and the card's **interaction model**. Both are pure functions of `notification_type` in the application layer; persisting them would create rows that disagree with the taxonomy the moment it changes and would need a migration for a presentation decision. `notification_type` stays a free varchar — no enum change — and gains `new_published_job`.

No migration file is introduced because this repository holds documentation and the prototype only; there are no ORM entities, DTOs or migration directories to update.

### 5. Explicitly out of scope

- **Push delivery.** No push subscription, no `web-push` payloads, no service-worker `notificationclick` handler wired to a real subscription. What exists is the resolution + navigation seam and the URL contract it consumes.
- **Push eligibility and preferences.** Untouched, including the postal-area matching rule and the direct-assign default.
- **Which events generate push.** Unchanged. The matrix's `driver_push` column is byte-identical.
- **A universal bottom sheet** for all notification types — explicitly rejected by the work order and not implemented.

### 6. Open questions — NOT decided in this pass

1. **Final category taxonomy and event mapping.** Implemented with the four categories the work order gives as examples; the work order itself notes the taxonomy "still requires confirmation". The mapping is a single table in `store.js` and one i18n block, so a change is cheap — but it is a client decision.
2. **Approved visual design for the collapsed and expanded cards.** Built from existing tokens and primitives (no new token, no new colour); the client has not signed off on a design for these cards.
3. **Which document event "new documents" means.** Both document *outcomes* (`accepted` / `rejected`) are covered, since both are already in the matrix. Whether *newly available admin off-channel documents* should also notify is undecided and was **not** added.
4. **Where profile-change approval/rejection should deep-link.** No destination is confirmed, so those cards stay informational rather than guessing at a Profile subpage.
5. **Whether profile approval and document acceptance should gain push.** They are in-app-only in the matrix and stay that way.
6. **Whether View more orders should be conditional** on other Marketplace orders existing. Shown unconditionally on an unavailable Marketplace card — the Marketplace has its own empty state, so the action is never a dead end.

---

## Files touched (v2.16)

| File | Change |
| --- | --- |
| `docs/requirements/prd.json` | Task 20 acceptance extended (11 criteria); `notification_channels_matrix` in-app flag for newly published matching orders; `resolved_defaults.driver_notification_presentation_v1`; `version` → v2.16 |
| `prototype/project/store.js` | Notification category/kind taxonomy; `resolveDriverNotificationTarget`; `driverNotificationJobPreview` (visibility-stripped projection); `driverIsCommittedToJob`; `driverJobViewMode`; `newsId`/`documentId` on notifications; in-app row for newly published matching orders; `document_accepted` notification; localized notification copy; representative notification seed |
| `prototype/project/driver.jsx` | Notification card rework (category chip, tour accordion, deep links, unavailable state); `NotificationTourPreview`; `resolveNotificationNavigation`; `useNotificationDeepLink`; `Infopoint` message deep link; `JobUnlocked` document deep link |
| `prototype/project/i18n.js` | 34 new keys, EN + DE; removed the redundant `driverNotifInfopointHint` |
| `prototype/project/styles.css` | `.notification-card` surface, category chip, chevron, expandable panel, preview list, unavailable state, two-line clamp, ≤359px stacking |
| `prototype/project/AUTHEON Prototype.html`, `pwa/pwa-app.jsx` | Deep-link handling and the new pane handlers on both driver shells |
| `docs/database/schema.dbml`, `docs/database/logical-model.md` | `user_notifications` target columns + indexes; "Notification targeting" section |
| `docs/design/*` | driver-screen-spec (notification card spec), DDB remediation (F9), brand-tokens (component token map), ui-ux-production-plan §7.12, driver-i18n-index (regenerated) |
| `docs/product/autheon-context-pack.md` | Version trail → v2.16; notification presentation bullet |

**Not touched:** push eligibility/preferences, the matrix `driver_push` column, migrations, ORM entities, DTOs, API payloads.
