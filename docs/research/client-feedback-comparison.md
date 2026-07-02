# Client feedback ↔ PRD ↔ prototype comparison

**Canonical spec:** [`../requirements/prd.json`](../requirements/prd.json) (PRD v1.8)
**Written feedback reference:** [`../../meetings/source/autheon_aw_written_feedback_en.md`](../../meetings/source/autheon_aw_written_feedback_en.md) (from Feedback.pdf)
**Meeting reference:** [`../../meetings/source/autheon_aw_meeting_transcript_en_with_index.md`](../../meetings/source/autheon_aw_meeting_transcript_en_with_index.md) (2026-05-18)
**Full validation report:** [`../requirements/prd-client-source-validation.md`](../requirements/prd-client-source-validation.md)
**Prototype:** [`../../prototype/project/`](../../prototype/project/)
**Period covered:** 2026-05-20 (Tuesday) → 2026-05-25  
**PRD diff detail:** [`../archive/2026-05/prd-changelog-since-2026-05-20.md`](../archive/2026-05/prd-changelog-since-2026-05-20.md) (baseline `bd55711` → HEAD `5af4b75`)
**Automated check:** `_audit-prototype.mjs` — **PASS v1.8** (2026-07-02)

**Git note:** PRD v1.8 and prototype sync are on branch `feat/add-two-meeting-summary` (v1.7 committed; v1.8 docs/prototype may be uncommitted until merge).

---

## Executive summary

Since 2026-05-20 the static prototype and PRD were aligned to **client Feedback.pdf (May 2026)**. **June/July 2026 meetings (v1.7–v1.8)** added pre-Performed upload, daily acceptance limits with limit-increase requests, admin docs at job creation, admin cancel driver messages, and operational policy settings. **All 15 Feedback.pdf sections remain covered; v1.7/v1.8 meeting outcomes are reflected in PRD v1.8 and the prototype audit.**

Production backend (DB, auth, SMTP, real file storage) remains **out of scope** for the HTML demo — PRD tasks stay `pending` for implementation tracking.

---

## Feedback.pdf alignment (`client_feedback_traceability`)

| PDF § | Client topic | PRD location | PRD status | Prototype evidence |
|-------|----------------|--------------|------------|-------------------|
| A.1 | Marketplace pull-to-refresh / sync | `marketplace_sync_policy`, Task 7, 25 | gap_closed_in_v1_6 | Driver marketplace refresh; audit OK |
| A.2 | Three push toggles | Task 19–20, `resolved_defaults` | gap_closed_in_v1_6 | `pushEnabled`, `notifyNewPublished`, `notifyPostalPrefix` in driver profile |
| A.3 | External map navigation | Task 8, 28 | covered | Map handoff buttons in tour detail |
| A.4 | Tour documents upload/review | Task 27, document fields | gap_closed_in_v1_6 | Post-Performed upload; admin Tour documents; Under Review summary |
| B.1.1 | Separate pickup/delivery schedule | Task 5 | covered | New job + job detail date/time windows |
| B.1.2 | Customer vs pickup vs delivery + contacts | Task 4–5, visibility matrix | gap_closed_in_v1_6 | New order form; `driver_visibility_matrix`; route contacts (5/24) |
| B.1.3 | Input formatting (date, VIN, plate) | Task 5 | covered | New order field masks / validation in admin |
| B.1.4 | Distance estimate + override | Task 16, 28 | covered | Distance estimate/recalculate in admin |
| B.1.5 | Master data + visibility | Task 4, matrix | gap_closed_in_v1_6 | Customer & address CRUD; customer hidden until unlock |
| B.2 | Under review / Completed labels | `client_status_mapping` | design_decision | Display status derived from docs + settlement (not extra operational statuses) |
| B.2.2 | Status history & notifications | Task 22, channels matrix | gap_closed_in_v1_6 | Audit log; admin notification feed; driver inbox |
| C.1 | Report Problem (cancel / not performable) | Task 12–14 | covered | Slide cancel (10+ chars); special case flow |
| C.2 | Notification channels | Task 20, matrix | gap_closed_in_v1_6 | In-app feeds; push prefs; no push on direct assign |
| C.3 | Infopoint tabs & badge | Task 18 | gap_closed_in_v1_6 | Admin **Infopoint** nav: General documents + New messages publish; driver tabs, badge, view/download stub |
| D | Open questions / driver master data | `client_feedback_resolved`, Task 3 | gap_closed_in_v1_6 | Drivers submit change requests (not self-edit); admin **Profile change requests** queue with Approve & save / Reject |

---

## Code changes since 2026-05-20 (git)

| Date | Summary |
|------|---------|
| 2026-05-21 | Draft delete; admin nav; Report Problem / special case; seed validation; customer select on new job; tour doc status UI |
| 2026-05-22 | Master data CRUD; assign/reassign; scheduling; tour document review pipeline |
| 2026-05-23 | Supplier invoice labels; PRD v1.6 matrices; audit script v1.6 |
| 2026-05-24 | PRD/docs update; notification bell on marketplace; tour docs UX; feature flags; route contact address; address handling refactor |
| 2026-05-25 | Single PRD file (`prd.json`); removed `prd_updated_v2.json`; re-audit PASS |
| 2026-05-25 | Admin Infopoint pane: general documents CRUD/upload stub + news publish form; driver doc view/download |

**Primary files touched:** `store.js`, `admin.jsx`, `driver.jsx`, `i18n.js`, `prd.json`, `_audit-prototype.mjs`.

---

## PRD v1.6 automated checklist (prototype)

| # | Requirement | Result |
|---|-------------|--------|
| 1 | Under Review after first post-Performed upload | Pass |
| 2 | Admin notification feed | Pass |
| 3 | Driver in-app notifications | Pass |
| 4 | Three push toggles | Pass |
| 5 | No push on direct assign | Pass |
| 6 | Alternate contact + progressive disclosure | Pass |
| 7 | Update master data from order entry | Pass |
| 8 | Driver visibility matrix | Pass |
| 9 | Display Under review / Completed | Pass |
| 10 | Admin document Accept/Reject | Pass |
| 11 | Upload receipt CTA | Pass |
| 12 | Document type helper notices | Pass |
| 13 | Re-upload admin alert | Pass |
| 14 | Infopoint tab labels + badge | Pass |
| 15 | `cancellationActor` on cancel | Pass |
| 16 | Audit script | Pass (exit 0) |
| 17 | Admin Infopoint news publish | Pass |
| 18 | Driver Infopoint doc view/download | Pass |
| 19–24 | Client feedback gap pass (cancel UX, reasons, evidence, MDR feed, icon, formatters) | Pass |
| 25–28 | Profile change request queue + one-open rule + feed deep-link + driver notify | Pass |

Full detail: [`../requirements/prd-prototype-validation.md`](../requirements/prd-prototype-validation.md).

---

## Demo paths (client walkthrough)

**Admin:** Infopoint → New messages (publish) → switch to Driver Infopoint (badge) → General documents (view/download).

**Clarify:** Profile notifications = tour alerts; Infopoint news = admin broadcasts.

**Languages:** Toggle EN/DE on new strings.

---

## PRD v1.7–v1.8 meeting outcomes (2026-06-25 / 2026-06-29 / 2026-07-02)

| Topic | PRD | Prototype |
|-------|-----|-----------|
| Q1 Pre-Performed document upload | Task 11/27, `document_upload_pre_completion_v1` | `canDriverUploadTourDocument` on active statuses |
| Q2 No car color / photo field | important_notes | Notes + optional admin attach (Q4) |
| Q3 Daily acceptance limit + overlap prompt | Task 30 | `dailyJobLimit`, `acceptJob`, overlap confirm, `requestDailyLimitIncrease` |
| Q4 Admin docs at job creation | `admin_documents_at_creation_v1` | New job section 07, `admin_off_channel` |
| Q5 No lat/long | future_scope | N/A |
| Admin cancel driver message | Task 14, v1.8 | `AdminCancelJobModal`, driver cancelled detail |
| Operational policies | Task 31 | Settings → `OperationalPoliciesForm`, cutoffs enforced |

Changelogs: [`../archive/2026-07/prd-changelog-since-2026-06-25.md`](../archive/2026-07/prd-changelog-since-2026-06-25.md), [`../archive/2026-07/prd-changelog-since-2026-07-01.md`](../archive/2026-07/prd-changelog-since-2026-07-01.md).

---

## Gaps / not in prototype

- PRD **tasks** remain `pending` for production delivery (expected).
- Real email SMTP, PDF generation, persistent storage, auth, service worker push — see `production_open_questions` in `prd.json`.
- Finance dashboard, CSV mass import, historical Excel migration — explicitly de-scoped in PRD v1.6.

**Closed in prototype (2026-05-25 gap pass):** cancel binding warning + terms; seven cancel reasons; not-performable evidence upload; Report Problem warning icon; admin order-entry formatters (`inputFormatters.js`).

**Closed in prototype (2026-05-25 profile requests):** persistent `masterDataChangeRequests` queue; admin nav with open-count badge; inline driver edit on request detail; **Approve & save** (save then close) and **Reject**; driver pending state when one open request exists; notification feed **Review request** deep-link; driver in-app notifications on resolution.

**Closed in prototype (2026-07-02 v1.8):** pre-Performed upload; daily limit + overlap sheet + limit-increase request (`daily_limit_override`); profile daily limit card; admin document attach at job create/edit; admin cancel reason + driver message; operational policy settings; schedule-change cutoff on revert/edit draft.

---

## How to re-run verification

```bash
node prototype/project/_audit-prototype.mjs
```

Open `prototype/project/AUTHEON Prototype.html` in a browser for manual smoke test (see `prd-prototype-validation.md`).
