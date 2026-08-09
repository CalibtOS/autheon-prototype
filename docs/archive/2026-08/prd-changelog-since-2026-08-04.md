# PRD changelog: 2026-08-04 / 2026-08-09 (v2.31 -> v2.36, plus main's independently-numbered v2.33 job-attachment-limits entry)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`

> **Scope of this file:** the **v2.36** and **v2.35** entries, and the **v2.34** entry plus its same-release `[v2.34-cutoff-details]`, `[v2.34-feed-redesign]`, and `[v2.34-filters]` addenda. Baseline is **v2.31** (Driver/User schema fix + several presentation addenda, 2026-08-01 — see [`../2026-07/prd-changelog-since-2026-07-30.md`](../2026-07/prd-changelog-since-2026-07-30.md)).

---

# PRD changelog addendum: 2026-08-09 (v2.36 — service-partner document upload)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`

---

## v2.36 — Service-partner (onboarding) document upload (2026-08-09)

**Baseline:** PRD v2.35 (status consolidation)
**Source:** client requirements #8 ("Service-partner document management — type/review/upload/validity/version") and #9 (document categories), tracked as **Done** in [`../../requirements/admin-client-requirements-status.md`](../../requirements/admin-client-requirements-status.md); prototype implementation `prototype/project/store.js` (`driverDocuments`, `DRIVER_DOC_CATEGORIES`, Phase 7) surfaced in `ServicePartnerProfileModal`'s "Documents" tab.
**Type:** new task + domain-model + schema change. **Documented retroactively** — the capability was already built and client-signed-off in the prototype, but had no PRD task and no row in `schema.dbml`.

### 1. Previous behaviour

Every document concept in the PRD and schema was **job-scoped**. Task 27 (`Tour Documents, Driver Invoices & Billing Reconciliation`) opens with "All uploads are linked to a specific valid job/tour; API requires job id on create", and `job_documents` / `document_files` / `generated_job_documents` all hang off `jobs`. `document_type` covered only tour artefacts (invoice, fuel receipt, toll receipt, delivery note, waiting-time evidence, proofs, transport order).

A service partner's **onboarding** paperwork — business registration, driving licence, identity document — had nowhere to live. The prototype had implemented it anyway (`driverDocuments`, deliberately separate from `tourDocuments`), so the prototype and the specification had drifted: a reviewer reading `prd.json` or `schema.dbml` would have concluded the feature did not exist.

### 2. New behaviour

- **New Task 34**, epic _Service Partner Documents & Onboarding Compliance_ (20 acceptance criteria).
- **Partner-scoped, never tour-scoped.** An upload links to a service partner id and never to a job id; the API rejects a create carrying a job id. These documents stay out of the tour-document lists, the tour review queue, and settlement/invoice reconciliation.
- **Six categories:** business registration (Gewerbeanmeldung), licence front, licence reverse, ID front, ID reverse, other.
- **One active document per category** — active means `Uploaded` or `Accepted`. A second upload into an occupied category is refused rather than silently replacing. **Rejecting or replacing frees the slot**, so a partner re-submits without an admin deleting anything. **`other` is exempt** and may repeat.
- **Own status vocabulary:** `Uploaded` / `Accepted` / `Rejected` / `Replaced`.
- **Versioning:** a replacement **inserts** a new row (`version + 1`, status `Uploaded`) and marks the prior row `Replaced`, linked both directions. Nothing is overwritten; nothing is hard-deleted.
- **Validity:** optional `validUntil`. **Expiry is derived at read time** — an expired document keeps its `Accepted` status.
- **Audit:** upload / accept / reject / replace / remove, plus view / download **for both actors** (partner and reviewing admin), distinguished by acting user.
- File types, size ceilings, private storage, and the Take photo / Choose file source picker are reused unchanged from tour documents.

### 3. Why a separate vocabulary and a separate table

The tour statuses `Missing`, `Under Review` and `Correction Required` **cannot occur** for an onboarding document, and the tour vocabulary has no `Replaced`. Reusing `document_type` / `document_review_status` would have forced four unreachable states onto every partner document and blocked the one state it genuinely needs.

Likewise, `driver_documents` is a separate table rather than a nullable `job_id` on `job_documents`. The two families share only "a reviewed file"; they differ in scope, lifecycle (onboarding/compliance vs per-tour settlement), review vocabulary, retention driver, and constraints — only the partner document has an expiry date and a one-active-row-per-category rule. A nullable-FK merge would make every existing tour-document query filter `job_id IS NOT NULL` permanently.

### 4. Files / docs

| File | Change |
| --- | --- |
| `docs/requirements/prd.json` | v2.36 version prefix; new Task 34; `domain_model_summary` gains `service_partner_document_categories`, `_statuses`, `_fields`, `_rejection_reason_examples` |
| `docs/database/schema.dbml` | New `driver_document_category` + `driver_document_status` enums; new `driver_documents` table; six new `Ref:` lines; header note |
| `docs/database/logical-model.md` | v2.36 status override; "Service-partner onboarding documents" section; entity map; constraints/indexes; content-access audit rows |

### 5. What deliberately did NOT change

`job_documents`, `document_files`, `generated_job_documents`, `document_type`, `document_review_status` and Task 27 are **untouched** — tour documents keep their model exactly as it was. `drivers` gains no column (the link is `driver_documents.driver_id`). No new storage mechanism: files reuse `upload_assets` with `access = 'private'`, the same path `infopoint_documents` uses.

### 6. Open points

- Which categories are **mandatory** before a partner may be released from probation or granted operational access is not yet specified — today no acceptance criterion blocks access on missing documents.
- Whether an **expiring** document should raise a notification-feed alert (the feed already has a `document_unreviewed_stale` type for tour documents) is unresolved; no notification type is added by this version.
- Retention period for `Replaced` versions after a partner leaves the platform is not defined.

---

# PRD changelog addendum: 2026-08-07 (v2.35 — status consolidation)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`

---

## v2.35 — Status consolidation: binary access axes + D6 inactivity sweep (2026-08-07)

**Baseline:** PRD v2.34 (+ filters / feed-redesign / cutoff-details addenda)
**Source:** `tasks/status-consolidation-decision-brief.md` (APPROVED, binding) and the prototype/BE/FE implementation plans under `tasks/status-consolidation-*.md`.
**Type:** domain-model + UX + sweep behaviour change. Retires Active/Blocked/Inactive and the five-value account status enum.

### 1. Previous behaviour

- Driver operational status was a three-value enum: Active / Blocked / Inactive.
- Linked account/access used Pending verification / Active / Suspended / Inactive / Invite failed.
- Inactivity sweep (resolved_defaults.driver_inactivity_auto_deactivation_v1) set operational status to Inactive only and left login enabled.
- Admin UI used status dropdowns / Enable-Disable text buttons and an Auto badge for inactivity provenance.

### 2. New behaviour

- **Axes:** `operationalAccess` and `accountAccess` are each `enabled|disabled`. `inviteState` is `pending|failed|accepted` and orthogonal to login.
- **D1:** disabling operational access is lenient — marketplace/assignment stop; assigned tours continue.
- **D6 sweep:** Branch A removes both axes; Branch B removes marketplace only, defers account removal while tours are open (`accessRemovalDeferredAt`).
- **Activity clock:** `users.last_activity_at` (brief E5).
- **Admin UI:** Enabled/Disabled pill + toggle switch per axis; confirm on disable; filters All/Enabled/Disabled; no Auto badge on overview (D4).
- **Audit:** keep historical action keys (R11/C5); new diffs use `operationalAccess`/`accountAccess`.
- **Notifications:** `driver_operational_access_*`, `account_access_*`, `driver_access_removed_auto`, `driver_access_removal_deferred`.

### 3. Files / docs

| File | Change |
| --- | --- |
| `docs/requirements/prd.json` | v2.35 version prefix; domain_model_summary; Task 2/3/7 acceptance; resolved_defaults; prototype_assumptions; open question resolved |
| `prototype/project/admin.jsx` | AccessSwitch toggles |
| `prototype/project/styles.css` | `.access-switch` styles |
| `tasks/status-consolidation-decision-brief.md` | Binding source |

### 4. What deliberately did NOT change

Tour operational statuses, document-review statuses, soft-delete via `deletedAt`, Keycloak as IdP, and the rule that admins never see generated passwords.

---

## v2.34 addendum — Notification feed Filter dropdown, full-size toolbar buttons (2026-08-06)

**Numbering note:** same release as the three entries below; this is a same-day `[v2.34-filters]` addendum, not a new version.

**Baseline:** PRD v2.34 + `[v2.34-cutoff-details]` + `[v2.34-feed-redesign]`
**Source:** an approved visual reference for the filter control, provided directly to engineering 2026-08-06.
**Type:** new UI capability (filtering) plus a sizing correction to the redesign below. No data-model impact.
**Data model / API:** none. Every facet filters purely in-memory over fields the feed already exposes (`adminAlertSeverity()`, `ADMIN_ALERT_SOURCE`, `adminEmailQueue.at`) — no new stored field, so `docs/database/logical-model.md` and `docs/database/schema.dbml` are unchanged by this addendum.

### 1. Previous behaviour (v2.34-feed-redesign, as implemented the day before)

The table redesign below shipped tabs, multi-select, bulk actions and pagination, but no way to narrow the list by anything other than the All/Unread/Read tabs — a long feed with many gray/informational rows had no way to isolate just the red/urgent ones, or just Documents-sourced rows, or a specific day. The toolbar's four buttons (Filter's precursor didn't exist yet; Mark all as read / Delete selected / Delete all did) used the small `.btn.xs` size, smaller than the approved reference's buttons.

### 2. New behaviour

- **Filter control** — a new button (toolbar, left of "Mark all as read", funnel icon + chevron) opens a dropdown with three facets: **Severity** (checkboxes: Critical/Warning/Info, i.e. red/orange/gray), **Source** (checkboxes: System/Tour system/Documents/Service Partners), and **Date range** (From/To, native date inputs). Any combination narrows the table; the button's own label switches to "Filter (N)" with N = the number of active checkboxes plus 1 if either date bound is set, matching the "Mark selected as read (N)" labelling convention the feed already uses elsewhere.
- **New `NotificationFilterMenu` component** (`admin.jsx`) — same portaled-dropdown mechanics as the existing `AdminAlertRowMenu`/`RowActionsMenu` (escapes `.tbl`/`.table-wrap` overflow clipping by portaling into `document.body` at viewport-fixed coordinates), but left-aligned to its trigger (it's the leftmost button in the group) and holding checkbox/date-input groups instead of a list of actions.
- **Fixed-light popover, by design, not an oversight** — the panel uses hardcoded colors (`#ffffff` background, `#1f2430` text, `#6b7280` muted labels) rather than the app's `--paper`/`--text`/`--muted` theme tokens. An earlier pass reused those theme tokens (copying `AdminAlertRowMenu`'s own `var(--surface, #fff)`/`var(--border, #ccc)` pattern, which likewise never resolves to a real theme value since neither `--surface` nor `--border` is actually defined anywhere in `styles.css`) and the panel rendered dark-mode-colored text on a background that stayed white regardless of theme — invisible. The fix keeps the panel intentionally light in both themes, matching the approved reference image; the two native `<input type="date">` fields also get `colorScheme: "light"` plus the same explicit colors so their calendar affordance doesn't pick up the OS/app dark scheme against a light field.
- **Date-range comparison is month-day only, a carried-over limitation, not a new one:** `adminEmailQueue.at` has always been `nowStamp()`'s display format, `"DD.MM. HH:MM"` — no year, on every seeded and dynamically-queued row alike. The filter's `<input type="date">` values (`"YYYY-MM-DD"`) are compared against a parsed `"MM-DD"` from `row.at` (new `alertMonthDay()` helper), so the range is accurate for a same-year dataset but would misbehave across a year boundary. Fixing that properly means giving `adminEmailQueue` rows a real stored timestamp — out of scope for this addendum, which filters over what the feed already records.
- **Toolbar buttons resized** — Filter, "Mark all as read"/"Mark selected as read (N)", "Delete selected (N)", and "Delete all" all moved from `.btn.xs` to the full-size `.btn` (and `.btn.destructive` for Delete all), matching the approved reference more closely than the initial redesign pass.
- **Filtered-empty state distinguished from tab-empty state:** a new `adminNotificationFilterEmpty` message ("No notifications match the selected filters.") shows whenever any filter is active and narrows the result to zero, instead of the pre-existing "No alerts in the feed." / "No unread alerts." / "No read alerts yet." messages, which now only show when no filter is active.

### 3. What deliberately did NOT change

No new `adminEmailQueue` field, no new `notification_type`/severity/source value, no change to the tabs' own All/Unread/Read semantics — filtering composes with the active tab (e.g. Unread tab + Documents source) rather than replacing it.

### 4. Files changed

| File | Change |
| --- | --- |
| `prototype/project/admin.jsx` | New `NotificationFilterMenu`, `NOTIF_FILTER_SEVERITIES`/`NOTIF_FILTER_SOURCES` constants, `alertMonthDay()` helper; `NotificationFeedPane` gains `severityFilter`/`sourceFilter`/`dateFrom`/`dateTo` state and filtering; toolbar buttons resized |
| `prototype/project/i18n.js` | New EN+DE keys: `adminNotificationFilter`, `adminNotificationFilterCount`, `adminNotificationFilterBySeverity`, `adminNotificationFilterBySource`, `adminNotificationFilterByDate`, `adminNotificationFilterDateFrom`, `adminNotificationFilterDateTo`, `adminNotificationFilterClear`, `adminNotificationFilterEmpty` |
| `prototype/project/AUTHEON Prototype.html` | Cache-bust version bump (`admin.jsx`, `i18n.js`) |
| `docs/requirements/prd.json` | `version` gains the `[v2.34-filters]` entry |
| `docs/archive/2026-08/prd-changelog-since-2026-08-04.md` | This entry |

---

## v2.34 addendum — Notification feed table redesign, unread/read rename, soft delete (2026-08-05)

**Numbering note:** same release as the two entries below (`v2.34` and `[v2.34-cutoff-details]`); this is a same-day `[v2.34-feed-redesign]` addendum, not a new version.

**Baseline:** PRD v2.34 + `[v2.34-cutoff-details]`
**Source:** an approved visual reference for the admin notification feed, provided directly to engineering 2026-08-05.
**Type:** UI redesign of the feed introduced by the v2.34 entry below, plus a **data-model rename** (naming change only — the underlying rule is unchanged) and one genuinely new capability (soft delete).
**Data model / API:** prototype-only, same as the entry it refines. `docs/database/logical-model.md` and `docs/database/schema.dbml` were both updated for the rename and the new `deleted_at` column — see their own dated Status-override entries.

### 1. Previous behaviour (v2.34, as implemented earlier the same day)

The feed from the entry below already had severity, an explicit status action, and three new trigger types — but as a flat list of cards, not a table: text-chip severity badges ("Critical"/"Warning"/"Info"), no way to select more than one row, no bulk actions, no delete of any kind, and no pagination. `adminEmailQueue` rows used `status: 'open' | 'processed'` with `processedAt`/`processedBy`.

### 2. New behaviour

- **Table layout matching the approved reference**: header row with a select-all checkbox (scoped to the current page), per-row checkboxes, a Notification column (icon+color badge, title, detail line, unread dot), a Source column, a Date column, and a row-level "..." menu.
- **Icon+color severity badges** replace the text chip: a 44×44 colored square carrying an event-specific icon (key / warning triangle / circle-x / check-circle / bell / document — new `Ic.N.Key`/`Warning`/`CircleX`/`CheckCircle`/`Bell`/`Trash`/`MailOpen` icons, `prototype/project/driver.jsx`, reused globally). Still never color alone: the row's own title text sits beside it, and the icon's `aria-label`/`title` carries the severity word for assistive tech. Every row reserves the same height (`.notif-row-detail { min-height: 54px }`) whether or not its "read by" line is present, so unread and read rows are visually identical in size.
- **Source column** is a neutral gray pill (`.notif-source-chip`) grouping events into System / Tour system / Documents / Service Partners — deliberately not severity-colored, so it never competes with the badge's color for attention.
- **Terminology rename: `open`/`processed` → `unread`/`read`.** `adminEmailQueue.status` values renamed; `processedAt`/`processedBy` renamed to `readAt`/`readBy`. Naming only — the rule the client's original spec required (status changes only via an explicit action, never by viewing) is unchanged, just relabelled to match the approved reference's own "Unread"/"Read" tab names. `getOpenAdminAlertCount`/`markAdminAlertProcessed` renamed to `getUnreadAdminAlertCount`/`markAdminAlertsRead` (now array-based: `ids=[]` means "every visible alert", the same convention the new delete function uses).
- **Three tabs — All / Unread / Read** — replacing the previous Open/Processed pair. Only All and Unread show a count badge, matching the reference (Read intentionally doesn't).
- **New capability, not in the original client spec — flagged rather than presented as a client requirement:** multi-select checkboxes, "Mark selected as read (N)" / "Mark all as read" (one button that relabels itself based on selection), "Delete selected (N)", and "Delete all". **Delete is a soft delete** — a new `adminEmailQueue.deletedAt` flag, filtered out of `getAdminEmailQueue()` the same way `getDrivers()` already filters `!d.deletedAt`. This was a deliberate design decision, not an oversight: the client's original spec required processed notifications to stay visible for audit, never deleted, and a real hard delete would have broken that. The row is hidden from the admin, the audit record survives underneath.
- **Row-level "..." menu**: a portaled dropdown, reusing the exact pattern the Jobs table's existing `RowActionsMenu` already established (`.tbl`/`.table-wrap` clip overflow, so the menu is portaled into `document.body` at viewport-fixed coordinates computed from the trigger button's own rect). New generic `AdminAlertRowMenu` component, parameterized by an `actions` array rather than hardcoded to job-specific actions like the original.
- **Rows-per-page + pagination**: a footer with a rows-per-page `<select>` (10/20/50, reusing the existing generic `rowsPerPage` i18n key rather than inventing a duplicate) and first/prev/page-number/next/last controls. The range text ("1–20 of 24") sits with the pagination buttons on the right, not beside the rows-per-page control on the left. Switching tabs or the page size resets to page 1 so a stale page number can never show an empty table. The header select-all checkbox is scoped to the current page; "Delete selected"/"Mark selected as read" act on the full `selected` set regardless of which page a row was picked from.
- **Seed data expanded from 5 to 18 rows**, all against real seeded jobs/documents/drivers, covering every event type at least once (job accepted/performed/assigned/reassigned, dispatch cancellation, empty-run recognised/not-recognised, document uploaded/reuploaded/rejected, SP cancellation) — enough volume for pagination to have something real to page through, with a few rows pre-seeded as already-read so the Read tab isn't empty by default.

### 3. A naming collision found and avoided

The backend column rename (`processed_at`/`processed_by_user_id` → the obvious `read_at`/`read_by_user_id`) was **not used**: `user_notifications` already has a `read_at` column from PRD v2.20 — the **driver**-notification read receipt, set on *viewing*. Reusing that name for the admin column would have collided technically and, worse, semantically: the admin equivalent must flip only via an explicit action, never on view. The backend columns are named `admin_read_at`/`admin_read_by_user_id` instead — see `logical-model.md` and `schema.dbml`. The prototype itself has no such collision (`adminEmailQueue` and `driverNotifications` are separate arrays, not a shared object shape), so `store.js` legitimately uses the shorter `readAt`/`readBy`.

### 4. What deliberately did NOT change

The three trigger types and their deep links from the v2.34 entry below, the cutoff-time setting from `[v2.34-cutoff-details]`, and every event's severity classification — this pass only changed how the feed is *presented and operated*, not which events fire or how urgent they are.

### 5. Open questions carried into production

Multi-select, bulk mark-as-read/delete, and pagination are **not** literal asks in the client's "Dispatch Notification Feed — Implementation Spec" — they match an approved design reference but should be confirmed with the client as committed scope before backend work builds against them, same as the other open items already tracked in `production_open_questions`.

### 6. Files changed

| File | Change |
| --- | --- |
| `prototype/project/store.js` | `adminEmailQueue` status values renamed unread/read; `processedAt`/`processedBy` renamed `readAt`/`readBy`; new `deletedAt` (soft delete); `getUnreadAdminAlertCount`/`markAdminAlertsRead`/`deleteAdminAlerts` replace the old open/processed API; seed data expanded 5 → 18 rows |
| `prototype/project/admin.jsx` | `NotificationFeedPane` rebuilt as a table; new `AdminAlertBadge` (icon+color), `AdminAlertRowMenu` (portaled dropdown), `ADMIN_ALERT_ICON`/`ADMIN_ALERT_SOURCE` maps; multi-select, bulk actions, pagination |
| `prototype/project/driver.jsx` | New `Ic.N.Key`/`Warning`/`CircleX`/`CheckCircle`/`Bell`/`Trash`/`MailOpen` icons |
| `prototype/project/styles.css` | `.notif-badge` (icon square, replacing the old text-chip `.notif-severity`), `.notif-source-chip`, `.notif-row-detail` (uniform row height), `.btn.destructive`, `.btn.icon-only` |
| `prototype/project/i18n.js` | ~25 renamed/new EN+DE keys (tabs, bulk-action labels, toasts, column headers, source labels, pagination) |
| `docs/database/logical-model.md` | New dated Status-override block: enum value rename, column rename + collision note, new `deleted_at` |
| `docs/database/schema.dbml` | `notification_status` enum values renamed; `user_notifications` columns renamed + `deleted_at` added |
| `docs/requirements/prd.json` | `version` gains the `[v2.34-feed-redesign]` entry; Task 33 acceptance criteria updated for the rename + a new addendum item for the table redesign; `domain_model_summary.admin_notification_fields` updated |
| `docs/archive/2026-08/prd-changelog-since-2026-08-04.md` | This entry |

---

## PRD v2.34 — Dispatch Notification Feed: admin severity, open/processed lifecycle, three new alert types (2026-08-04/05)

**Baseline:** PRD v2.31
**Source:** client "Dispatch Notification Feed — Implementation Spec", provided directly to engineering 2026-08-04. Archived (reconstructed from that conversation, not a verbatim original — see open question below) at [`../../requirements/dispatch-notification-feed-spec.md`](../../requirements/dispatch-notification-feed-spec.md).
**Refines:** Task 20 ("Driver Push Notifications & Admin Critical Alerts") §14's admin notification feed. New: **Task 33** ("Dispatch Notification Feed"), `prd.json`.
**Type:** new admin-feed capability plus three new trigger types. **Prototype: complete and verified end-to-end. Backend: partial** — see "What is not yet built" below.
**Data model / API:** prototype-only additions so far (`store.js` `adminEmailQueue` row shape). Backend `UserNotification` has no equivalent fields yet — this is real outstanding production work, not client scope drift.

### 1. Previous behaviour (v2.31, as implemented)

The admin notification feed (`NotificationFeedPane`, `store.js` `adminEmailQueue`) was exactly what Task 20 §14 originally scoped: a flat, ever-growing list of alerts with no triage model.

| Concern | Before | Problem |
| --- | --- | --- |
| Severity | A binary `CRITICAL_ALERT_EVENTS` set — an event either got a faint red background tint or nothing | No orange/gray tier; several real event strings the code actually emits (`order_cancelled_by_sp`, `empty_run_recognised`, `job_assigned`, …) weren't in the set at all, and weren't in the i18n map either — those rows silently rendered the raw event key |
| Status | None. `sent` existed but only ever meant "email dispatch attempted", not "an admin looked at this" | Every alert rendered forever. No way to acknowledge one, no way to tell a triaged backlog from a fresh one |
| Nav badge | A plain count, same visual weight whether zero or many | No urgency signal |
| Deep links | Job-level only (`onOpenJob`) or the master-data-request review screen | No way to jump to a specific flagged document or driver |
| Trigger types | 3 of the spec's 6 (SP cancellation, empty-run reported, profile/master-data change request) already fired end-to-end. The other 3 (cutoff, staleness, inactivity) didn't exist in any form | No schedule-driven trigger mechanism existed anywhere in the backend — no cron, no `@nestjs/schedule`, nothing |

### 2. New behaviour

#### 2.1 Foundation — severity, status, badge, mark-processed

- **Severity** (`red` / `orange` / `gray`) replaces the binary critical set. Classified by urgency, not just "is this bad": red = urgent/blocking (SP cancellation, empty-run reported, document re-upload/rejection, the new cutoff type), orange = needs admin action but not urgent (master-data change request, the two new staleness/inactivity types), gray = informational (job accepted/performed/assigned/reassigned, dispatch cancellation, document upload, empty-run recognised). Every real event string the code can emit is covered — none fall back to an unstyled raw key.
- **Status** (`open` / `processed`) is new. `queueAdminEmailAlert()` now stamps every row `status: 'open'`; a new `markAdminAlertProcessed(ids)` (mirroring the pre-existing driver-notification `markDriverNotificationsRead()`) is the *only* path that can flip it — viewing a row, or opening its deep link, never does. Processed rows are retained under a separate **Processed** tab (`NotificationFeedPane` gained an Open/Processed toggle), not deleted — an audit trail, not a queue that empties.
- **Nav badge** now reads `getOpenAdminAlertCount()` (open only, mirroring `getOpenMasterDataChangeRequestCount()`) instead of the raw total, and pulses (`.count-pulse`, new `navBadgePulse` keyframe) only while that count is above zero — it stops on its own once the backlog is cleared, no separate "seen" flag needed.
- **Severity badge** is a labelled chip (`.notif-severity`, `sev-red`/`sev-orange`/`sev-gray`), not a bare colour dot — satisfies the spec's accessibility requirement that colour is never the only signal. Every colour used (`--destructive`, `--st-warn`, `--st-warn-bg`, `--st-draft`, `--st-draft-bg`) is an existing global theme token already used for job/document status pills — no new hardcoded colours were introduced anywhere in this feature.

#### 2.2 The three new trigger types

| Type | Severity | Deep link | Backend status |
| --- | --- | --- | --- |
| Order not accepted by cutoff (`order_not_accepted_cutoff`) | red | Open tour **and** a new **Adjust driver offer** action (`onAdjustDriverOffer` → the existing `openEditDraft(jobId)` helper — no new UI, reuses the order list's own row-menu Edit entry point) | Query/scheduler business logic not yet built |
| Document unreviewed 10+ days (`document_unreviewed_stale`) | orange | Opens Tour Billing scrolled to and highlighting the specific flagged document row (new `filterDocumentId` prop on `TourBillingPane` — previously job-level filtering only) | Query/scheduler business logic not yet built |
| Service partner inactive 90+ days (`service_partner_inactive`) | orange | Opens the flagged driver's existing Service Partner Profile modal, Overview tab (new `initialDriverId` prop threaded `ServicePartnersCenterPane` → `DriversPane`, mirroring the `initialRequestId` pattern Phase 7 already established for master-data requests) | Query/scheduler business logic not yet built |

None of the three has a real clock to compute against in a client-side prototype, so each is seeded pre-fired against a real, named seeded record — the same end state a cron tick would leave behind, without needing one in the browser:

- **Cutoff**: job `A-2026-00847` (published, genuinely unaccepted in the seed data).
- **Staleness**: document `TD-SEED-001` on job `A-2026-00842` — this one wasn't even contrived; that document's seeded `uploadedAt` (`2026-04-21`) is already more than 10 days before whenever this demo is actually opened, by construction.
- **Inactivity**: driver `DRV-0001` (Dana Driver).

The other three trigger types (SP cancellation, empty-run reported, profile/master-data change request) needed **no new triggering logic at all** — they already fired end-to-end pre-existing. This task added only the severity/status classification layer on top of them.

#### 2.3 Order-not-accepted-cutoff refinement (2026-08-05, same release — `[v2.34-cutoff-details]`)

Tightened §1 against the client's exact wording after an initial pass used a generic message:

- Message copy: **"Order for tomorrow not yet accepted"** (was "Order not accepted by cutoff").
- Minimum display fields: the tour number (already shown) plus the pickup date and time — the seeded alert's detail line now reads "Pickup Wed, 23.04.2026 · 08:00–12:00".
- **Both** client-specified actions are present, not one: "Open tour" (generic, pre-existing) *and* the new "Adjust driver offer" action described above.
- **The 15:45 cutoff is now a real admin-configurable setting**, not text baked into the message: `operationalPolicies.orderAcceptanceCutoffTime` (`"15:45"` default, `HH:MM`, 24h), rendered on the System Settings tab (`OperationalPoliciesForm`) using the exact same plain-text-input-plus-blur-format pattern the New/Edit Order form already uses for pickup/delivery time windows (a new `isPolicyTimeValid` gates Save, mirroring the existing integer/EUR policy-field validators).

### 3. Schema impact

`user_notifications` gains four columns — all **admin-feed-only**, exactly as `read_at` is driver-notification-only:

- `severity` (new `notification_severity` enum: `red` / `orange` / `gray`, default `gray`)
- `status` (new `notification_status` enum: `open` / `processed`, default `open`)
- `processed_at`, `processed_by_user_id` (FK → `users.id`)

Three new `notification_type` values (still a free varchar, no enum change — same reasoning as the v2.20 type-aware-notifications entry): `order_not_accepted_cutoff`, `document_unreviewed_stale`, `service_partner_inactive`. Targeting **reuses** the existing v2.20 `target_entity_type`/`target_entity_id` mechanism rather than adding per-type columns — `document_unreviewed_stale` uses `job_id` + `target_entity_type = 'job_document'` (the same shape the existing driver document-outcome notifications already use); `service_partner_inactive` introduces one new `target_entity_type` value, `'driver'`.

`app_settings` (`key = 'operational.policies'`) gains one new jsonb field, `orderAcceptanceCutoffTime` — no new `app_settings` row, just a new field inside the existing canonical key's payload.

**No change** to `jobs`, `job_locations`, `job_documents`, or `drivers` — every trigger condition reads columns that already exist (`job_locations.scheduled_date` + `window_start` for the cutoff type; `job_documents.review_status` + the document's upload timestamp for the staleness type; driver account-activity data — tracked by a separate, independent workstream — for the inactivity type).

Full detail: [`../../database/logical-model.md`](../../database/logical-model.md) (dated Status-override block) and [`../../database/schema.dbml`](../../database/schema.dbml).

### 4. What deliberately did NOT change

- The five pre-existing trigger types' actual triggering logic (cancellation, empty-run, master-data-request workflows) — untouched.
- The driver-facing notification system: `isRead`/`readAt`, categories, deep links. **Severity and status are an admin-feed-only concept and are never surfaced to drivers** — `user_notifications` is one shared table for both recipients, and driver-delivered rows simply carry the default values (`gray`/`open`) and never expose them in any driver UI, same as today.
- `driver.lastActiveAt` — a separate, independent branch already implements real service-partner activity tracking (used for an auto-deactivation policy, a distinct feature from this notification type). An earlier pass of this work populated a parallel `lastLoginAt`/`lastLoginAtIso` field to drive the inactivity type end-to-end; that was fully reverted once the overlap was found, and the seeded `service_partner_inactive` alert now references driver `DRV-0001` without asserting or depending on any specific activity timestamp, so it does not conflict with that branch merging.
- The Service Partner Profile modal's "Last activity" field (separately renamed from a stale, always-`null` "Last login" field to reuse `driver.lastActiveAt` and the existing `adminUsersLastActivity` label/formatter already used in the drivers table) is **not part of this feature** — recorded here only because it touches the same modal.

### 5. Open questions carried into production

1. **Source-document archival is a reconstruction, not a verbatim copy.** `dispatch-notification-feed-spec.md` was written from engineering's recollection of a direct conversation, not an archived client file/email like `Storno-Workflow-1.pdf`. Replace it with the original if one turns up.
2. **Backend data model is genuinely not built yet.** `UserNotification` has no `severity`/`status`/`processedAt`/`processedBy`, and no mark-processed endpoint exists. Required before the real admin frontend can drive the same Open/Processed behaviour the prototype now demonstrates.
3. **What "service-partner activity" means in production.** This backend has no discrete login use case — auth is delegated entirely to Keycloak via already-validated JWTs. Options: stamp last-activity from the existing `IdentityResolverInterceptor` (cheap, needs write-throttling on a hot path), a dedicated client-called endpoint, or a real Keycloak login event.
4. **A pre-existing naming gap, found but not fixed.** `notification_channels_matrix` and the actual code use different event names for some of the same events (e.g. `order_cancelled_by_driver` in the matrix vs. `order_cancelled_by_sp` in code; `document_reuploaded` vs. `tour_document_reuploaded`). Pick one canonical name per event and reconcile both sides in a future pass.
5. **Whether "empty-run reviewed" should itself raise an admin-feed event.** Today the admin decision (recognised/not-recognised) notifies only the driver — the feed goes silent on it.

### 6. Files changed

| File | Change |
| --- | --- |
| `prototype/project/store.js` | `adminEmailQueue` rows gain `status`/`processedAt`/`processedBy`; `queueAdminEmailAlert()` gains an optional extra-payload parameter; new `getOpenAdminAlertCount()` / `markAdminAlertProcessed()`; new `operationalPolicies.orderAcceptanceCutoffTime`; three new seeded alert rows |
| `prototype/project/admin.jsx` | `NotificationFeedPane` rewritten (Open/Processed tabs, severity badges, mark-processed, three new action buttons); nav badge pulse wiring; `TourBillingPane` gains `filterDocumentId`; `ServicePartnersCenterPane`/`DriversPane` gain `initialDriverId`; `OperationalPoliciesForm` gains the cutoff-time field + `isPolicyTimeValid`; SP Profile modal's Last-login field replaced with Last-activity |
| `prototype/project/styles.css` | New `.notif-severity` + `sev-*` modifiers, `.count-pulse` + `navBadgePulse` keyframe — all reusing existing theme tokens |
| `prototype/project/i18n.js` | ~25 new/changed EN+DE keys (event labels, severity labels, feed-tab copy, new action labels, settings label) |
| `prototype/project/AUTHEON Prototype.html` | New `openTourBillingForDocument` / `openDriverProfile` nav helpers; wired into `NotificationFeedPane`/`TourBillingCenterPane`/`ServicePartnersCenterPane` |
| `docs/database/logical-model.md` | New dated Status-override block; three new "Notification targeting" table rows |
| `docs/database/schema.dbml` | New `notification_severity`/`notification_status` enums; four new `user_notifications` columns; new FK ref |
| `docs/requirements/dispatch-notification-feed-spec.md` | New — archived client spec (reconstruction, see open question 1) |
| `docs/requirements/admin-client-requirements-status.md` | New 2026-08-05 addendum |
| `docs/requirements/prd.json` | `version` gains the `[PRD v2.34]` entry and the same-release `[v2.34-cutoff-details]` addendum; new **Task 33**; three new `notification_channels_matrix` rows + `severity` on 8 existing admin-feed rows; `admin_notification_feed_v1` and `operational_policies_v1` resolved defaults updated; four new `production_open_questions`; new `admin_notification_schedule_types_v1` prototype assumption; new `admin_notification_fields` domain-model entry |
| `docs/archive/2026-08/prd-changelog-since-2026-08-04.md` | This file |

**Backend (started, not complete — tracked as open production work, not client scope drift):** `@nestjs/schedule` dependency added and registered in `AppModule` (the cron-scheduling foundation for the three new trigger types); local `NotificationSeverity`/`NotificationStatus` domain value objects added under `src/modules/notifications/domain/value-objects/` (mirroring the existing `job-status.ts` pattern rather than importing the shared-package enums directly into the domain layer). The `UserNotification` domain entity, its ORM entity, its repository, the notification event registry, the outbox processor, and the mark-processed API surface are **not yet updated** — this is the next unit of backend work, independent of anything in the prototype.

---

> **Numbering note (merge of `main`):** `main` independently claimed **v2.32** in `prd.json`'s `version` field for its job-attachment-size-limits work, but its own standalone copy of *this* changelog file titled that same feature **"PRD v2.33"** below — an inconsistency inside `main`'s own commits, not something this merge introduces or corrects. To avoid colliding with either of `main`'s numbers, the Dispatch Notification Feed entry above was renumbered **v2.32 -> v2.34** (not v2.33, which `main` had already taken here). `main`'s entry below is kept exactly as `main` wrote it.

> **Scope of this file:** **PRD v2.33** — job attachment size limits and staged multi-file upload, synced into the prototype and the PRD after the product behaviour shipped (autheon-be / autheon-fe) and the prototype pack landed (PR #46). Baseline is **v2.31**.

---

## PRD v2.33 — Job attachment size limits and staged multi-file upload (2026-08-04 / 2026-08-05)

**Baseline:** PRD v2.31
**Source:** product pack `.scratch/2026-08-02-job-attachment-size-limits/` (be #163 / fe #43) and prototype pack `.scratch/2026-08-04-prototype-job-attachment-size-limits/` (prototype PR #46).
**Client sign-off note:** [`../../requirements/job-attachment-size-limits-sign-off.md`](../../requirements/job-attachment-size-limits-sign-off.md).
**Type:** requirement refinement + prototype sync. Replaces the single compiled-in 25 MB per-file cap with configurable limits, multi-file staged upload, and a second independent upload area for Report Problem evidence.

### 1. Previous behaviour (v2.31 / v2.10 upload rules)

| Concern | Before | Problem |
| --- | --- | --- |
| Per-file limit | One compiled-in **25 MB** on every upload path | Ops could not tighten or relax without a redeploy |
| Area total | None | A tour's documents could grow without bound |
| Selection | One file at a time per category | Drivers combined receipts into one photo or dropped extras |
| Feedback | Size errors after the upload attempt | Mobile data wasted; which file failed was unclear |
| Evidence | Report Problem evidence not size-checked the same way | Oversized evidence only failed after the report existed |
| Admin control | No Settings surface for upload limits | Limits lived in env / code constants |

### 2. What changed

#### 2.1 Two configured limits

Administrators set, in megabytes, on System settings:

- **Max. size per file** — default **25**
- **Max. total per upload area** — default **50**

Both take effect immediately for drivers in the same session. The total field **must not** be labelled "per tour" / "per job": one number drives two independent areas (see §2.3). Cross-field rule: total may not sit below the per-file limit.

Setting key (production / catalog): `driver.uploads.limits` → `{ maxFileMb, maxTotalMb }`.

#### 2.2 Platform ceiling

A named **platform ceiling** of **50 MB** is the hard backstop no upload of any kind may exceed (dispatch off-channel attach, driver personal licence/ID documents, and as the upper bound on the configurable per-file setting). The configurable per-file limit governs **tour documents** and **Report Problem evidence** only.

**Accepted consequence:** driver personal documents rise from 25 MB → 50 MB as a side effect of the ceiling split (same accepted product side effect).

#### 2.3 Two independent upload areas

| Upload area | What counts | Total |
| --- | --- | --- |
| Tour documents | Live driver uploads + admin **off-channel** attachments; **`replaced` history rows do not count**; generated transport orders never count (separate collection) | Own total against `maxTotalMb` |
| Report Problem evidence | Evidence on that report only | Own total against the **same** `maxTotalMb`, independent of tour documents |

Worst case per tour: **two full allowances**. The literal original "one combined total per tour" ask is deliberately not met — journey separation (see sign-off note).

Dispatch off-channel attach **counts** toward the tour-documents area but is **never refused** by that total, so a tour can sit over allowance with remaining shown as **zero** (never negative).

#### 2.4 Staged multi-select (driver)

After choosing a document category once, the driver selects several files, reviews name/size, sees per-file oversize marks and clamped used/remaining, removes rows, and uploads only when the selection fits (and while online). Successful files leave the list; store refusals stay with distinct copy for **file too large** vs **allowance exhausted**. Replace of a single reviewed file stays an immediate single-file path (no staging).

#### 2.5 Prototype-only: amounts per receipt in a batch

Invoice / fuel / toll batches still walk an amount form **per file** in the prototype (`netAmount` etc.). The product frontend has no amount metadata on attachments; when it gains some it either adopts this walk or supersedes it. Recorded in the sign-off note so it is not rediscovered as a product defect.

#### 2.6 Report Problem evidence precheck

Evidence is checked against the same per-file limit and its own area total **before** submit. Oversized files are marked on their row; over-total shows a distinct removal message; submit stays locked. The five-file cap is unchanged. No running usage figure on the composing report (selection in hand is the whole picture).

### 3. Supersedes

| Resolved default | Status |
| --- | --- |
| `document_upload_max_file_size_v1` (fixed 25 MB everywhere) | **SUPERSEDED** by `driver_upload_limits_v1` |
| Task 27 acceptance line that hard-codes "prototype: 25 MB" | Updated to configurable limits + platform ceiling |

`document_upload_source_selection_v1` remains, extended: after category + source, multi-select is allowed for tour documents; the source sheet still precedes the picker.

### 4. Prototype surfaces (after PR #46 + follow-ups)

- Store: `driverUploadLimits`, `PLATFORM_UPLOAD_CEILING_BYTES`, usage/remaining, distinct refusal reasons
- Admin: Driver upload limits card on System settings; audited `driver_upload_limits_changed`
- Driver: staged flow via shared upload path (My documents tab + mark-performed success); evidence prechecks on Report Problem
- Proof: `tests/regression/job-attachment-limits.unit.spec.ts` (+ integration where present)
- Vocabulary: [`prototype/project/DOMAIN.md`](../../../prototype/project/DOMAIN.md) and workspace `CONTEXT.md`

### 5. Explicit non-goals of this PRD bump

- Does not reopen the product/backend schema beyond documenting the setting and counting rules already shipped
- Does not claim the prototype amount-walk is production UI
- Does not fix pre-existing audit i18n baseline findings unrelated to this feature
