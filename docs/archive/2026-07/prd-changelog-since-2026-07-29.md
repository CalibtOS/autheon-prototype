# PRD changelog: 2026-07-29 / 2026-07-30 (v2.18 → v2.25)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`

> **Scope of this file:** the **v2.19 – v2.25** entries. Baseline is main's **v2.18**.
>
> **Merge resolution — these entries were renumbered.** They were originally written as **v2.15 – v2.21** on a feature branch. While that branch was in flight, `main` independently claimed v2.15 – v2.18 for four other streams: **v2.15** admin status/assignment-rules Phase 5, **v2.16** driver in-app notification on direct assignment, **v2.17** admin navigation/layout Phase 6, **v2.18** admin service-partner Phase 7. Two different specifications cannot share a version number, so on rebase this branch's entries shifted up by four to v2.19 – v2.25 — the same convention the v2.6 → v2.10 merge used when three streams collided (see [`prd-changelog-since-2026-07-27.md`](prd-changelog-since-2026-07-27.md) "Merge resolution"). **No requirement was dropped or reordered**; only the numbers moved. Mapping: v2.15→v2.19 · v2.16→v2.20 · v2.17→v2.21 · v2.18→v2.22 · v2.19→v2.23 · v2.20→v2.24 · v2.21→v2.25.
>
> PRD **v2.11 – v2.14** (2026-07-29 — admin manufacturer/model catalogue, vehicle search, orders-overview client fixes) are recorded in the `version` history string inside `prd.json` and in [`../../requirements/admin-client-requirements-status.md`](../../requirements/admin-client-requirements-status.md), but were never given a separate changelog file. That gap is pre-existing and is **not** back-filled here.

---

## PRD v2.19 — Driver content-access audit trail (2026-07-29)

> **PARTIALLY SUPERSEDED by PRD v2.25 (below): notification-open auditing was removed from scope.** Everything in this entry about **documents** and **Infopoint messages** still stands. The `notification_viewed` action key, the `driver_notification` entity type and the "Notification view" rule in §4 no longer exist. This entry is kept verbatim so the original decision and its reversal are both traceable.

**Baseline:** PRD v2.18 (admin service-partner Phase 7 client fixes) — see the renumbering note above
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

### 2. New behaviour (v2.19)

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
| Driver notification | ~~`notification_viewed`~~ **removed in v2.25** | — |
| Infopoint message (news item) | `news_item_viewed` | — |

`document_*` is reserved for Infopoint general documents because the admin console already writes `document_created` / `document_updated` / `document_replaced` / `document_deleted` for exactly that entity; `tour_document_*` matches the existing `tour_document_uploaded` / `tour_document_replaced` / `tour_document_checked`; `news_item_*` matches `news_item_created` / `news_item_updated` / `news_item_hidden` / `news_item_shown`.

Every entry additionally carries a machine-readable **`actionType`** of `viewed` or `downloaded`, so the viewed/downloaded distinction is queryable without parsing the action key — and stays correct if a key is ever renamed.

### 4. What counts as a "view"

Resolved from existing behaviour rather than invented:

- **Document view** — the driver requests a preview of the file. Repeated previews are repeated views.
- **Document download** — the driver requests the file for download. Audited as `downloaded`, never additionally as a view.
- ~~**Notification view**~~ — **removed from scope in v2.25.** As originally specified: the driver **opens the notifications panel**. That is one notification-list request, and the panel renders every row's full title and body, so each notification the request carries is audited as a view. Reopening the panel is a new view and appends new entries. **Read/unread state is deliberately untouched** — opening the panel does not mark anything read, and marking read is not itself a view.
- **Infopoint message view** — the driver **opens** a message. Audited immediately, before read state is touched, so an already-read message re-opened is audited again. Collapsing an open message is not a view.

### 5. Explicitly out of scope

- **No data-model change.** Production `audit_events` already carries `action_key`, `actor_user_id`, `entity_type`, `entity_id`, `job_id`, `occurred_at` and a `metadata` jsonb. `actionType`, the document version and the notification/document subtype are **metadata**, not new columns. No migration, no new table, no new enum. `schema.dbml` and `logical-model.md` are annotated with the new action keys only, exactly as previous versions annotated theirs.
- **No new endpoint.** Every entry is appended inside a request the Driver PWA already makes.
- **Unchanged:** document preview rendering, download behaviour, share, print, access control and permission checks, Infopoint navigation, Infopoint read/unread behaviour, notification read/unread behaviour, and the admin Audit log table + CSV export (still the same five columns: `at`, `action`, `actor`, `entity`, `meta`).
- **Tour documents carry no version.** The tour-document model has no version field (replacement overwrites in place); the transport-order PDF uses `pdfVersion` and Infopoint documents use `version`. "Document version where applicable" is therefore satisfied without adding a field.

### 6. Open questions — NOT decided in this pass

1. **Share and print.** The document preview sheet offers share and print alongside download. Only view and download are audited. Whether share/print are separate auditable disclosure events is a product decision — the work order raised it as an open question and no repository source answers it.
2. **Failed and unauthorized access attempts.** An unknown, hidden or unauthorized target currently fails safely and audits **nothing**. Whether denied attempts should be recorded (a security-monitoring requirement, distinct from content traceability) is undecided.
3. ~~**Notification view granularity.**~~ **Moot since v2.25** — notification opens are not audited at all. As originally recorded: a view is recorded per notification carried by a panel opening. If the product instead wants per-row tap granularity, that is a narrower rule and would need confirming — but it would leave notifications that are not tappable (for example `master_data_change_sent`, `email_changed`, which carry no job) permanently unaudited, which is why the list-request rule was chosen.

---

## Files touched

| File | Change |
| --- | --- |
| `docs/requirements/prd.json` | Task 22 acceptance extended (4 criteria); `resolved_defaults.driver_content_access_audit_v1` added; `version` → v2.19 |
| `prototype/project/store.js` | `log()` accepts optional machine-readable fields; `logContentAccess()` + `contentAccessActor()`; audited `getTransportOrderPreview` / `downloadPdf` / `getTourDocumentPreview` / `downloadTourDocumentPlaceholder` / `getInfopointDocumentPreview` / `downloadInfopointDocument`; new `recordDriverNotificationViews()` and `openInfopointNews()` |
| `prototype/project/driver.jsx` | Driver call sites declare `{ actor: "driver" }`; notifications panel audits the list it renders; Infopoint message open routes through `openInfopointNews` |
| `docs/database/schema.dbml` | Header annotation: new action keys, reusing `audit_events` unchanged |
| `docs/database/logical-model.md` | Same annotation + content-access read note |
| `docs/product/autheon-context-pack.md` | Version trail → v2.19; content-access audit bullet |

**Not touched:** migrations, backend entities, DTOs, API payloads, `docs/design/*` (no visual, layout, copy, interaction or responsive change — the admin Audit log renders new rows through its existing table and the Driver PWA is visually identical), `prototype/project/i18n.js` (action keys are English identifiers, never localized, and no user-facing string was added).

---

## PRD v2.20 — Type-aware notification previews and contextual deep links (2026-07-29)

**Baseline:** PRD v2.19 (driver content-access audit trail)
**Source:** work order "Implement Type-Aware Notification Previews and Contextual Deep Links", extending the existing **Task 20 — Driver Push Notifications & Admin Critical Alerts**.

Scope note: the deliverable is an updated **clickable prototype** plus updated requirements/data-model/design docs. Push *delivery* remains **simulated** — what is implemented is the resolution and navigation layer a real push integration plugs into.

### 1. Previous behaviour (v2.19, as implemented)

Every notification rendered as one flat row: unread dot, title, body, `createdAt · tour`. Nothing distinguished a tour update from an account event, and the interaction model was crude:

- **No category.** A driver scanning the list could not tell an order update from a profile decision.
- **No preview.** The only way to see what a tour notification was about was to leave the Notification Center and open the order.
- **Navigation collapsed to two branches.** `infopoint_news` → the Infopoint **tab** (not the message); anything with a `jobId` → the order; everything else was a dead, unclickable row.
- **No stable reference for non-tour targets.** `infopoint_news` rows carried no `newsId`, `document_rejected` rows no document id — so deep-linking to the exact message or file was impossible, and a hint ("Also in Infopoint → New messages") stood in for it.
- **No availability check.** A notification about a Marketplace order that had since been booked by someone else still offered to open it.
- **No push routing.** No `notificationclick` seam existed at all; there was nowhere for a tap to route to.
- **Coverage gaps against the existing matrix.** `document_accepted` was specified as a driver in-app event and had **no implementation**; newly published matching Marketplace orders produced a simulated push and **no** in-app row, so the notification list never mentioned marketplace work.
- **Hard-coded English.** `"Document rejected"`, `"Change request sent"`, `"Profile change approved"` and `"…declined"` were literals in `store.js` — no DE.

### 2. New behaviour (v2.20)

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

## Files touched (v2.20)

| File | Change |
| --- | --- |
| `docs/requirements/prd.json` | Task 20 acceptance extended (11 criteria); `notification_channels_matrix` in-app flag for newly published matching orders; `resolved_defaults.driver_notification_presentation_v1`; `version` → v2.20 |
| `prototype/project/store.js` | Notification category/kind taxonomy; `resolveDriverNotificationTarget`; `driverNotificationJobPreview` (visibility-stripped projection); `driverIsCommittedToJob`; `driverJobViewMode`; `newsId`/`documentId` on notifications; in-app row for newly published matching orders; `document_accepted` notification; localized notification copy; representative notification seed |
| `prototype/project/driver.jsx` | Notification card rework (category chip, tour accordion, deep links, unavailable state); `NotificationTourPreview`; `resolveNotificationNavigation`; `useNotificationDeepLink`; `Infopoint` message deep link; `JobUnlocked` document deep link |
| `prototype/project/i18n.js` | 34 new keys, EN + DE; removed the redundant `driverNotifInfopointHint` |
| `prototype/project/styles.css` | `.notification-card` surface, category chip, chevron, expandable panel, preview list, unavailable state, two-line clamp, ≤359px stacking |
| `prototype/project/AUTHEON Prototype.html`, `pwa/pwa-app.jsx` | Deep-link handling and the new pane handlers on both driver shells |
| `docs/database/schema.dbml`, `docs/database/logical-model.md` | `user_notifications` target columns + indexes; "Notification targeting" section |
| `docs/design/*` | driver-screen-spec (notification card spec), DDB remediation (F9), brand-tokens (component token map), ui-ux-production-plan §7.12, driver-i18n-index (regenerated) |
| `docs/product/autheon-context-pack.md` | Version trail → v2.20; notification presentation bullet |

**Not touched:** push eligibility/preferences, the matrix `driver_push` column, migrations, ORM entities, DTOs, API payloads.

---

## PRD v2.21 — Infopoint message detail page (2026-07-29)

**Baseline:** PRD v2.20 (type-aware notification previews and contextual deep links)
**Source:** work order "Replace Expandable Infopoint Messages with a Dedicated Message Detail Page", refining the existing **Task 18 — Information Center / Infopoint**.

Scope note: presentation and navigation only. No new content type, no admin change, no data-model change.

### 1. Previous behaviour (v2.20, as implemented)

Infopoint News rows were **accordions**. A row showed the title, the date, and the body truncated to **100 characters** with an ellipsis; tapping it expanded the full body **inside the row**, in the middle of a scrolling list, behind a rotating chevron.

That is the wrong container for what admins actually publish. The seeded strike announcement is already 221 characters across three paragraphs, and the client's real cases — updated **AGB** and standing instructions — are far longer. Inside an expanded list row the body pushed the following messages far down the list, had no stable reading position, and the driver lost their place on collapse.

### 2. New behaviour (v2.21)

Five acceptance criteria were appended to the **existing** Task 18. No new task.

**Message list — reduced to what a list is for.**

| Element | Before | After |
| --- | --- | --- |
| Title | ✅ | ✅ |
| Date | ✅ | ✅ |
| Read/unread | dot on the icon only | dot **plus** the state in words (*New* / *Read*, `infopointNewsUnread` / `infopointNewsRead`), and in the row's accessible name |
| Preview text | first 100 chars + `…` | **removed** |
| Expandable body | accordion + rotating chevron + `aria-expanded` | **removed**; forward chevron indicating navigation |

**Message detail page.** A dedicated page that replaces the Infopoint screen header *and* its tab band — the message gets the full viewport rather than a card inside a list inside a tab. It shows:

- a **back arrow in the upper-left corner** (44×44),
- the message **title** (as the page's `h2`, wrapping freely),
- the message **date**,
- the **complete body**, `white-space: pre-line` so the paragraph breaks admins type are preserved, `overflow-wrap: anywhere`, and **never clamped or truncated**.

Back returns to the **complete** message list with the News tab still selected.

**Read state.** Opening a message marks it read immediately (unchanged store call), and the list reflects it on return. The open is still audited as a message view (v2.19) — including re-opening one that is already read.

**Reuse instead of a new pattern.** The page uses the repository's existing driver drill-down header, generalized from `ProfileSubpageHeader` to **`DriverSubpageHeader`** (CSS scope `.profile-subpage-header` → `.driver-subpage-header`; identical rules, zero visual change to Profile). So the back arrow, its 44px target — deliberately above the shared 40px `.detail-back-btn`, because it is the primary escape from a subpage — the centred title and the focus-moves-to-heading-on-entry behaviour are the same on the Infopoint detail page as on every Profile subpage. No second drill-down pattern was introduced.

**Deep links.** The message-detail deep links added in v2.20 — a notification card tap and an Infopoint push tap — now land on this page rather than on an expanded row. Nothing else about them changed.

### 3. Nice-to-have — implemented

**Left-edge swipe-back**, the iOS system gesture. A drag that **starts within 32px of the left edge** and travels right moves the page with the finger and commits past **72px**; abandoning it snaps back.

It is **progressive enhancement**: the visible back arrow is always present and is the primary control; the gesture does nothing without touch. The axis lock is the same 10px threshold `SwipeViews` uses, so scrolling a long message is never hijacked. `touch-action: pan-y` on the page is what reserves the horizontal axis — deliberately **not** `preventDefault()`, which React's passive `touchmove` listener would ignore while logging a console warning. Transform-only, and the snap-back transition is dropped under `prefers-reduced-motion`.

### 4. Explicitly out of scope / unchanged

- **No data-model change.** `infopoint_news` already stores subject, text and publication date; `infopoint_news_reads` already stores the read receipt. Nothing about how a message is stored, published, hidden or read-tracked changed — only how it is presented and navigated. `schema.dbml` and `logical-model.md` are untouched.
- **Admin side unchanged.** Creating, editing, hiding and deleting messages, and the in-app/push notification they trigger, are all as before.
- **Unchanged in the driver app:** the unread badge on the Infopoint tab pill and its count, newest-first sort, the Documents and Help tabs, swiping between the three tabs, and the Infopoint empty state.
- **Tab bar stays visible** on the detail page. The message is a subpage *within* the Infopoint tab, not a modal takeover like job detail, so removing the bottom nav would strand the driver.

### 5. Open question — NOT decided in this pass

**Should the left-edge gesture be iOS-only, or offered on every touch platform?** It is currently offered wherever touch exists. Restricting it to iOS would mean user-agent sniffing for a gesture that is purely additive and always has a visible button beside it, so the broader behaviour was chosen — but the client may prefer platform parity with the native iOS convention only. Recorded, not resolved.

---

## Files touched (v2.21)

| File | Change |
| --- | --- |
| `docs/requirements/prd.json` | Task 18 acceptance extended (5 criteria); `resolved_defaults.infopoint_message_detail_page_v1`; `version` → v2.21 |
| `prototype/project/driver.jsx` | `InfopointMessageDetail` page; `useEdgeSwipeBack`; `ProfileSubpageHeader` → `DriverSubpageHeader`; message list reduced to title + date + read state; `Infopoint` renders the detail page in place of the tabs |
| `prototype/project/i18n.js` | `infopointMessage`, `infopointNewsRead` (EN + DE); `infopointNewsUnread` now actually used |
| `prototype/project/styles.css` | `.infopoint-message-page` / `-card` / `-title` / `-date` / `-body`, list-row title/state/chevron/unread-dot rules; `.profile-subpage-header` → `.driver-subpage-header` |
| `docs/design/*` | driver-screen-spec (message list + detail page), DDB remediation (F10), brand-tokens (component token map), ui-ux-production-plan §7.13 (§7.8 superseded in part), driver-i18n-index (regenerated) |
| `docs/product/autheon-context-pack.md` | Version trail → v2.21; Infopoint detail-page bullet |

**Not touched:** `docs/database/schema.dbml`, `docs/database/logical-model.md`, migrations, admin console, notification eligibility.

---

## PRD v2.22 — Marketplace empty states split by filter state (2026-07-29)

**Baseline:** PRD v2.21 (Infopoint message detail page)
**Source:** work order "Implement Separate Marketplace Empty States for Unfiltered and Filtered Results", refining the existing **Task 7 — Driver Marketplace**.

Scope note: empty-state selection only. No change to the filter predicate, the filter panel, the count badge, the chip row or the results count.

### 1. Previous behaviour (v2.21, as implemented)

The Marketplace rendered **one** empty state, unconditionally:

> **No jobs match**
> No tours match these filters.
> *[Filters]*

It appeared whenever `ordered.length === 0` — including when **no filter was active at all**. An empty marketplace therefore told the driver that orders existed and their filters were hiding them, and pointed them at a filter panel that had nothing to loosen. That is not a cosmetic wording issue: it misrepresents available work, and the driver's rational response (open Filters, find nothing set, close it) wastes their time and erodes trust in the count.

This was already visible as a latent inconsistency: v2.9 had established that active filters and their count **stay displayed when the result set is empty** so that an empty Marketplace is *explained* — but the explanation offered was wrong when there was nothing to explain.

### 2. New behaviour (v2.22)

Four acceptance criteria were appended to the **existing** Task 7.

| Condition | State |
| --- | --- |
| At least one matching order | results list, unchanged |
| `count > 0`, nothing matches | **existing** filter-related state — copy, description and *Filters* action **verbatim unchanged** |
| `count === 0`, no open orders | **new** general state: *"There are currently no open orders."* / *"Es gibt derzeit keine offenen Aufträge."* |

**Selected from the canonical derivation, not a new flag.** The condition is `getAppliedMarketplaceFilterCount(committedFilters) > 0` — the same pure selector that already feeds the filter badge and the chip row (established in v2.9, with the invariant that the chip list and the count come from one derivation). There is no `hasFilters` state, no effect, and therefore no way for the empty state to disagree with the badge the driver is looking at. Because it is derived per render from the committed filter object, **apply / change / clear / reset switch states with no extra wiring** — which is what the behaviour requirement asks for.

**The general state carries no filter action.** This is deliberate and is part of the requirement, not a simplification: the message must not imply filtering is responsible, and a *Filters* button implies precisely that. It also has no `description`, so the single sentence is the whole message.

**Why "no orders" is safe to assert.** `all` is every `published` order and `filtered` applies only the filter predicate. With the count at zero the predicate excludes nothing, so an empty list genuinely means the marketplace is empty — the general message is a statement of fact, not an assumption.

Both states get a stable class (`.marketplace-empty-filtered` / `.marketplace-empty-unfiltered`) so which one is showing is assertable without matching on copy.

### 3. Explicitly out of scope / unchanged

- **The filtered state's copy and behaviour.** Byte-identical, including the slightly redundant title/description pair (*"No jobs match"* / *"No tours match these filters."*) — the work order requires it unchanged, and rewording it would collide with the open terminology question below.
- **No data-model change.** Derived from existing in-memory frontend filter state. `schema.dbml`, `logical-model.md`, migrations, entities, DTOs and API payloads untouched.
- **Filter predicate, filter panel, count badge, chip row, results count, sort:** all untouched.

### 4. Open questions — NOT decided in this pass

1. **Final wording for the general message.** Implemented as *"There are currently no open orders."* — the wording the work order itself proposed ("such as"). Not client-approved copy.
2. **"Orders" vs "tours" in driver-facing Marketplace copy.** The existing strings genuinely mix them: `noJobsMatch` = "No jobs match", `noToursMatch` = "No tours match these filters.", the DE side says "Touren", the tab reads "My jobs", and the new message says "orders". A consistency sweep would touch copy across the whole driver surface in both locales, so **nothing was renamed** — guessing the target term and rewriting dozens of strings is exactly the kind of product decision this pass must not make. Recorded for the client.

---

## Files touched (v2.22)

| File | Change |
| --- | --- |
| `docs/requirements/prd.json` | Task 7 acceptance extended (4 criteria); `resolved_defaults.marketplace_empty_states_v1`; `version` → v2.22 |
| `prototype/project/driver.jsx` | `hasActiveFilters` derived in `Portal` from the canonical count; empty state branches into the filtered and general variants |
| `prototype/project/i18n.js` | `marketplaceEmptyNoOrders` (EN + DE) |
| `docs/design/*` | driver-screen-spec (Marketplace empty states), DDB remediation (F11), ui-ux-production-plan §7.11 addendum, driver-i18n-index (regenerated) |
| `docs/product/autheon-context-pack.md` | Version trail → v2.22; Marketplace empty-state bullet |

**Not touched:** `docs/database/*`, migrations, the filter predicate, the filter panel, the count badge, the chip row, `brand-tokens.md` (no new component, no new token — the shared `EmptyState` primitive is reused as-is).

---

## PRD v2.23 — System-wide dialog standard (2026-07-29)

**Baseline:** PRD v2.22 (Marketplace empty states split by filter state)
**Source:** work order "Standardize All System Dialogs Using the 'Accept Tour' Dialog as the Reference", supporting **Task 9 — Job Acceptance** and extending **Task 26 — QA & Automated Validation** with system-wide dialog QA.

Scope note: **visual only** — layout, hierarchy, alignment, spacing, corner treatment, icon usage and action presentation. No business logic, validation, status transition, permission, action availability, approved label, legal wording or workflow content changed.

### 1. Audit — what was actually wrong

Every dialog hand-rolled its own chrome. The console repeated the *same* fixed backdrop + `.card elev` panel **nine times**, each subtly different:

| Dimension | Values found before |
| --- | --- |
| Backdrop | 9 copies of an inline `position: fixed` + scrim + flex-centre block, `zIndex` 100 / 101 / 102 / 103 / 104 / 105 |
| Panel radius | `--r-3` (12px) via `.card` in the console vs `--r-4` (16px) via `.sheet.modal` in the driver app |
| Panel width | 440 / 480 / 520 / 560 inline `maxWidth` |
| Panel padding | 22 (console) · 20 / 22 / 24 / 26 (driver) |
| Title | `fontSize` 17 / 18 inline (console) · 19 / 20 / 24 (driver) · one dialog used an eyebrow `Lbl` **as** its title |
| Title alignment | left everywhere |
| Description | 4 different inline size/colour/margin combinations |
| Action row | flex `justify-content: flex-end` (console) · `.btn block` stacked · `1fr 1fr` grid · `.confirm-sheet-actions` flex-end · `.sheet-foot` 1:1.6 grid (driver) |
| Control height | 42px in every hand-rolled row — **below the documented 44px floor** |
| Icons | two **byte-identical** inline success-disc SVGs duplicated across two dialogs |

So "dialog" was not a component; it was a shape each screen re-drew from memory.

### 2. The standard

One shared **`Dialog`** primitive in `driver-ui.jsx`, used by **both** surfaces (the console reaches it through `DriverUI.Dialog`, the same route `AdminConfirmBridge` already used to reuse `ConfirmSheet`), plus one `.dialog-*` CSS contract:

| Aspect | Standard |
| --- | --- |
| Corner rounding | `var(--r-4)` — the reference dialog's rounding |
| Panel padding | 24px |
| Widths | 480 default · `--md` 560 · `--lg` 720 (replaces four ad-hoc inline maxWidths) |
| Height | bounded (`min(90vh, 760px)`) with an internally scrolling `.dialog-content` |
| Structure | eyebrow? → **centered** title → **centered** description → left-aligned content → actions |
| Title | 18px desktop / 22px phone, one type step above the 13px muted description |
| Actions | canonical Cancel \| Primary `minmax(0,1fr) / minmax(0,1.6fr)` grid, 12px gap, **44px** minimum height; a single action spans the row (wide, centered); 3+ actions use a wrapping row with the same sizing |
| Icons | only meaningful status, on one shared 52px disc keyed to `--st-accepted` / `--st-assigned` / `--st-cancelled` |

**The action grammar is not new** — it is `.sheet-foot`'s existing canonical 1:1.6 ratio and 44px floor, deliberately reused so the two cannot drift apart.

**Alignment: one structural rule, not a list of exceptions.** Titles and descriptions centre. `.dialog-content` — summaries, forms, warnings, legal text — stays **left-aligned**, because running prose and key/value pairs are unreadable centred. Making that structural rather than a per-dialog opt-out means no dialog has to decide, and answers the "which dialogs are exceptions" question without an approval list.

### 3. What changed, per dialog

**Console (9 dialogs)** — all converted to the shared classes: assign/reassign driver, cancel order, account access, driver create/edit, admin create, master-data modal (customers · addresses · Infopoint documents ×3 · Infopoint news), register tour document, accept invoice, view invoice, finance edit. Assign-driver and cancel-order additionally moved to the `Dialog` **component**. The nine inline backdrops became `.dialog-backdrop`; the one dialog that must stack above another keeps that with a documented `--stacked` modifier instead of a bare `zIndex: 105`.

**Driver PWA** — `PendingNotice`, `TourBookedSuccessSheet`, `ProbationLimitSheet` and `SameDayOverlapSheet` moved to the `Dialog` component (the first two dropped their duplicated inline success SVG for one shared `DialogSuccessIcon`). `RemoveDocModal` kept its meaningful destructive icon and adopted the shared classes. `AcceptanceModal` — **the reference** — now uses the standard's own classes, so the reference and the standard are the same code rather than two descriptions of each other.

**Two documented deviations, both content-driven:**

1. **Accept tour stacks its actions full width.** Its primary is a **slide-to-confirm** control, which cannot share a row with a button. The slide is untouched and must never be replaced by a button.
2. **`.dialog-content` is left-aligned** — the structural rule above.

### 4. Bottom sheets — deliberately a separate spec

`FilterSheet`, `ReportProblemSheet`, `UploadSourceSheet` and `MarkPerformedSheet`'s upload stage are **bottom sheets**: bottom-anchored, drag-to-dismiss via a grabber, with a leading-edge draggable header. They keep all of that and share only the action grammar. Folding them into the centred standard would change **interaction**, not appearance — outside this task's stated visual scope — so it was not done. This is open question 3, recorded rather than answered unilaterally.

### 5. Verification

A dialog-standard probe was run against representative dialogs — confirmation, form, destructive, selection and the reference — on the driver phone surface (401×869) and the console at **desktop (1440)** and **tablet (834)**. Each was asserted for: 16px rounding, 24px padding, a present and centered `.dialog-title`, a title larger than its description, ≥44px control heights, a 12px action gap, the action row still **inside** the panel, and the panel **inside** the viewport. All passed with identical measurements across surfaces and viewports. The slide-to-confirm was asserted still present in the reference dialog. No console or page errors.

*(One measurement trap worth recording: the panel entry animation starts at `scale(0.96)`, so reading a control's bounding rect mid-animation reports 42px for a 44px button. Measure computed style, or wait for the animation.)*

### 6. Open questions — NOT decided in this pass

1. **Are these the approved token values?** The standard is derived from the reference dialog and the tokens already in the repository (`--r-4`, 24px padding, the existing 1:1.6 action ratio, the 44px floor). The client has not signed off on those specific numbers as *the* dialog standard.
2. **Which content-heavy dialogs are approved alignment exceptions?** Answered structurally — content is left-aligned, titles and descriptions centre — so no per-dialog exception list exists. If the client wants specific dialogs fully centred, that is a change to this rule.
3. **Should bottom sheets follow the same standard?** Not folded in, for the interaction reason in §4.

---

## Files touched (v2.23)

| File | Change |
| --- | --- |
| `docs/requirements/prd.json` | Task 26 acceptance extended (6 criteria); `resolved_defaults.dialog_standard_v1`; `version` → v2.23 |
| `prototype/project/driver-ui.jsx` | New shared `Dialog` primitive, exported on `DriverUI` |
| `prototype/project/admin.jsx` | `Dialog` wired in; 9 hand-rolled backdrops/panels/titles/descriptions/action rows converted to the shared classes; assign-driver and cancel-order moved to the component |
| `prototype/project/driver.jsx` | `AcceptanceModal` (the reference) on the standard's classes; `PendingNotice`, `TourBookedSuccessSheet`, `ProbationLimitSheet`, `SameDayOverlapSheet` on the `Dialog` component; `RemoveDocModal` on the shared classes; `DialogSuccessIcon` deduplicated |
| `prototype/project/styles.css` | The `.dialog-*` contract (backdrop, panel + widths, eyebrow, title, description, content, actions, status-icon discs, `.accept-tour-summary`) |
| `docs/design/*` | driver-screen-spec (dialog standard + audit table), brand-tokens (component token map), DDB remediation (F12), ui-ux-production-plan §7.14 |
| `docs/product/autheon-context-pack.md` | Version trail → v2.23; dialog-standard bullet |

**Not touched:** `docs/database/*`, migrations, any store method, any validation rule, any i18n string, the slide-to-confirm controls, and the bottom-sheet components' structure.

---

## PRD v2.24 — Auth demo documentation catch-up (2026-07-29)

**Baseline:** PRD v2.23 (system-wide dialog standard)
**Source:** PR **#32** (`c7a087e`, `2116024`, `8e0182e`, merge `b60d8c8`) — authentication screens that landed in the prototype **without their documentation**.

> **This entry changes no behaviour.** It records what already exists in `prototype/project`, so the documentation stops under-reporting the prototype. Written after those commits were merged to `main`, as a follow-up.

### 1. Why this entry exists

PR #32 added a complete auth surface — a login gate in front of **both** surfaces, eight screens, four shared UI primitives, fifteen store methods and ten audit actions, plus 107 i18n keys per locale. None of `prd.json`, the PRD changelog, the context pack, `driver-i18n-index.md`, `driver-screen-spec.md`, `brand-tokens.md`, the DDB remediation log, `ui-ux-production-plan.md` or the sitemap was updated.

That matters more than usual here, because the change is not additive at the edges: **every previously documented screen now sits behind a sign-in gate**. A reader following `driver-screen-spec.md` or `sitemap.md` before this entry would not know the app opens on a login screen.

### 2. What shipped

**Shared primitives** (`driver-ui.jsx`, exported on `DriverUI`) — one implementation serving both surfaces, the repository's existing pattern:

| Primitive | Role |
| --- | --- |
| `LoginForm` | email + password, show/hide password toggle, field + root error slots, forgot-password link |
| `AuthOtpInput` | 6-cell one-time-code input over one hidden field (paste and keyboard friendly) |
| `ForgotPasswordFlow` | email → code → new password, with resend cooldown |
| `SetPasswordForm` | initial password from an invite link, with an invalid-link state |

**Screens:** `DriverLoginScreen`, `DriverSetPasswordScreen` (`driver.jsx`), `AdminLoginScreen`, `AdminSetPasswordScreen` (`admin.jsx`), each with its forgot-password and code stages.

**The gate.** The framed client preview, `/pwa/` and the Admin Backend all render a login screen until a session exists.

**Store surface:** in-memory `session` and `passwordResets`; `isDriverAuthenticated` · `isAdminAuthenticated` · `getAuthenticatedDriver` · `getAuthenticatedAdmin` · `loginDriver` · `loginAdmin` · `logoutDriver` · `logoutAdmin` · `requestPasswordReset` · `resendPasswordResetCode` · `verifyPasswordResetCode` · `resetPassword` · `acceptInvite`; policy constants `PASSWORD_RESET_CODE_TTL_MS` (10 min) and `PASSWORD_RESET_RESEND_MS` (30 s).

**Ten new audit actions:** `driver_signed_in` / `admin_signed_in`, `driver_signed_out` / `admin_signed_out`, `driver_password_reset_requested` / `admin_password_reset_requested`, `driver_password_reset` / `admin_password_reset`, `driver_invite_accepted` / `admin_invite_accepted`. They follow the log's existing `<entity>_<past-tense-verb>` convention.

### 3. Two behaviours worth keeping, and two that are demo-only

**Keep — no account enumeration.** `requestPasswordReset` returns `{ ok: true }` even when no account matches the email, so the flow never reveals whether an address is registered. Preserve this in production; a "no such user" message here is a user-enumeration vulnerability.

**Keep — bounded codes.** Codes expire after 10 minutes, resend is rate-limited to 30 seconds, and an incorrect or expired code is rejected distinguishably rather than silently accepted.

**Demo-only — the code is shown in the UI.** A static prototype cannot send email, so `requestPasswordReset` returns the code and the flow renders it in an info alert. This follows `ChangeEmailSheet`'s existing `demoCode` convention. **Production delivery is a Keycloak action email** (Task 2) — the code must never reach the client.

**Demo-only — any non-empty password authenticates.** There is nowhere in a static prototype to store or verify a credential. Task 2 already states AUTHEON stores no passwords.

### 4. Data model — no change, and none needed

**Deliberately nothing.** Task 2 already establishes Keycloak as the identity provider and source of truth for roles, and that "AUTHEON stores a local app user profile linked to the Keycloak subject; it does not store passwords". Sessions and password-reset codes therefore live in Keycloak, not in `schema.dbml` — there is no session table and no password-reset table, and adding one would contradict the PRD.

`schema.dbml` and `logical-model.md` are annotated with the **ten new audit action keys** only, matching how every previous version recorded its new actions. `users.email_verified` and `email_change_requests` already exist and are untouched.

### 5. Requirements recorded

Six acceptance criteria were appended to the **existing** Task 2. They deliberately cover only the **gate** and the prototype's simulation boundaries; the fourteen pre-existing criteria (Keycloak as IdP, invite/reset via action emails, role scoping, blocked/archived driver rules, safe unauthorized responses) are unchanged — the prototype now *demonstrates* them rather than restating them. Behavioural detail is in `resolved_defaults.auth_prototype_demo_v1`.

### 6. Open questions — NOT decided here

1. **The exact production login ceremony.** Task 2 already defers it to Keycloak realm configuration ("should keep first login simple while still forcing the user to set their own password"). Unchanged.
2. **Should the driver reset flow use a 6-digit code at all,** or hand off entirely to a Keycloak action link? The prototype demonstrates a code because it cannot delegate to Keycloak — that is an implementation constraint, not a product decision, and it should not be read as one.

---

## Files touched (v2.24)

| File | Change |
| --- | --- |
| `docs/requirements/prd.json` | Task 2 acceptance extended (6 criteria); `resolved_defaults.auth_prototype_demo_v1`; `version` → v2.24 |
| `docs/database/schema.dbml`, `docs/database/logical-model.md` | The ten new audit action keys recorded; explicit note that no session/reset table exists by design |
| `docs/design/driver-screen-spec.md` | Auth screens + the gate; primitives and states |
| `docs/design/brand-tokens.md` | Component token map — auth screens |
| `docs/design/design-direction-board-remediation.md` | F13 (feature row) |
| `docs/design/ui-ux-production-plan.md` | §7.15 + changelog line |
| `docs/design/driver-i18n-index.md` | Regenerated — picks up the auth keys; auth key contract added to the generator |
| `docs/product/autheon-context-pack.md` | Version trail → v2.24; auth bullet |
| `docs/product/sitemap.md` | Auth entry rows for both surfaces |

**Not touched:** any file under `prototype/project` — this commit documents existing behaviour and changes none of it, apart from the `pwa-app.jsx` cache-buster noted in the commit message.

---

## PRD v2.25 — Notification-open auditing removed from scope (2026-07-29)

**Baseline:** PRD v2.24 (auth demo documentation catch-up)
**Source:** the **same work order that specified v2.19**, revised by the team lead after v2.19 shipped.
**Effect:** **partially supersedes v2.19.** Documents and Infopoint messages are unchanged; notification opens are no longer audited.

### 1. What the work order changed

| | Original (implemented as v2.19) | Revised |
| --- | --- | --- |
| Title | "Every Driver Document, **Notification**, and Infopoint Message View or Download" | "Every Driver Document, and Infopoint Message View or Download" |
| Scope of logging | Document view · Document download · **Notification view** · Infopoint message view | Document view · Document download · Infopoint message view |
| Required data | "The affected document, **notification**, or message" | "The affected document or message" |
| Acceptance | included "Every notification view creates a new Audit Log entry" | criterion removed |

### 2. Why this is the right call, not just a smaller one

Recorded so the earlier entry does not read as a mistake, and so this is not silently re-added later:

**A notification is a pointer, not the content.** Every notification points at something already audited — a document, an Infopoint message, or a tour. The audit trail's question is *"did the driver see this content?"*, and that is answered the moment they open it. Auditing the pointer as well recorded the same disclosure twice, at two different times, with the pointer entry arriving **first** — so a reader of the log saw "notification viewed" for a document the driver never actually opened.

**It was the noisiest rule in the trail.** v2.19 audited one entry *per notification* *per panel opening*, because that was the only reading that covered notifications a driver cannot tap (`master_data_change_sent`, `email_changed` — no job to open). With the seeded set that is six entries every time the bell is tapped, and in production it grows with the driver's notification history. The signal-to-noise cost fell entirely on the surface the audit log exists to serve.

**Read/unread already records it.** `user_notifications.read_at` and the unread badge are the notification-level record of what the driver has seen. That was never removed and is the honest place for that fact.

### 3. Removed

- The `notification_viewed` action key.
- The `driver_notification` entity type.
- The store method that appended those entries, and its single call site (the notifications panel's mount effect).

### 4. Unchanged — deliberately verified, not assumed

- **Document auditing:** `document_viewed` / `document_downloaded`, `tour_document_viewed` / `tour_document_downloaded`, `pdf_viewed` / `pdf_downloaded` — same keys, same recorded fields (acting driver + id, entity type + id, timestamp, `actionType`, document version, job/tour), same append-only no-merging rule.
- **Infopoint message auditing:** `news_item_viewed` still fires on every opening of a message detail page, including an already-read one.
- **Every notification behaviour:** delivery and eligibility, the category chips, the tour accordion, the contextual actions, deep links and push routing, unavailable-target handling, read/unread, and **Mark all read**. The panel now simply does not write an audit entry when it opens.

### 5. Data model — nothing to change

`audit_events` stops receiving one `action_key` value; no column, table, enum or index is affected, and this trail never wrote to `user_notifications`. `schema.dbml` and `logical-model.md` are corrected where they listed the removed key.

### 6. Still open from the original work order

Unchanged by this revision, and still not decided:

1. Whether **share** and **print** should be audited alongside view and download.
2. Whether **failed or unauthorized** access attempts should be recorded, or only successful interactions.

---

## Files touched (v2.25)

| File | Change |
| --- | --- |
| `prototype/project/store.js` | `recordDriverNotificationViews` removed; the content-access header comment now records why notification opens are deliberately not audited |
| `prototype/project/driver.jsx` | the notifications panel's audit mount effect removed |
| `docs/requirements/prd.json` | Task 22 criteria corrected (notification wording dropped, with the reason stated); `resolved_defaults.driver_content_access_audit_v1` corrected; `version` → v2.25; the v2.19 history annotated inline |
| `docs/database/schema.dbml`, `docs/database/logical-model.md` | the removed key dropped from the content-access notes |
| `docs/archive/2026-07/prd-changelog-since-2026-07-29.md` | v2.19 annotated as partially superseded; this entry added |
| `docs/product/autheon-context-pack.md` | version trail → v2.25; the audit bullet corrected |

**Not touched:** notification delivery, presentation, deep links, read/unread, `Mark all read`, and all document and Infopoint-message auditing.
