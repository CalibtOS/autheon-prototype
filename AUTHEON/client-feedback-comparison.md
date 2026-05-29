# Client feedback ↔ PRD ↔ prototype comparison

**Canonical spec:** `AUTHEON/prd.json` (PRD v1.6)  
**Written feedback reference:** `AUTHEON/meetings/autheon_aw_written_feedback_en.md` (from Feedback.pdf)  
**Meeting reference:** `AUTHEON/meetings/autheon_aw_meeting_transcript_en_with_index.md` (2026-05-18)  
**Full validation report:** `AUTHEON/prd-client-source-validation.md`  
**Prototype:** `AUTHEON/autheon-extracted/autheon/project/`  
**Period covered:** 2026-05-20 (Tuesday) → 2026-05-25  
**PRD diff detail:** `AUTHEON/prd-changelog-since-2026-05-20.md` (baseline `bd55711` → HEAD `5af4b75`)  
**Automated check:** `_audit-prototype.mjs` — **PASS** (2026-05-25)

**Git note:** Working tree, index, and HEAD all match — PRD v1.6 is fully committed; no unstaged `prd.json` delta.

---

## Executive summary

Since 2026-05-20 the static prototype and PRD were aligned to **client Feedback.pdf (May 2026)**: separate ordering party / pickup / delivery, Report Problem flows, tour documents after Performed, master data CRUD, notifications (three push toggles, in-app feeds), and v1.6 traceability matrices. **All 15 Feedback.pdf sections in `client_feedback_traceability` are marked covered or gap-closed in the PRD; the prototype audit script passes.**

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
| B.1.2 | Party vs pickup vs delivery + contacts | Task 4–5, visibility matrix | gap_closed_in_v1_6 | New order form; `driver_visibility_matrix`; route contacts (5/24) |
| B.1.3 | Input formatting (date, VIN, plate) | Task 5 | covered | New order field masks / validation in admin |
| B.1.4 | Distance estimate + override | Task 16, 28 | covered | Distance estimate/recalculate in admin |
| B.1.5 | Master data + visibility | Task 4, matrix | gap_closed_in_v1_6 | Ordering party & address CRUD; ordering party hidden until unlock |
| B.2 | Under review / Completed labels | `client_status_mapping` | design_decision | Display status derived from docs + settlement (not extra operational statuses) |
| B.2.2 | Status history & notifications | Task 22, channels matrix | gap_closed_in_v1_6 | Audit log; admin notification feed; driver inbox |
| C.1 | Report Problem (cancel / not performable) | Task 12–14 | covered | Slide cancel (10+ chars); special case flow |
| C.2 | Notification channels | Task 20, matrix | gap_closed_in_v1_6 | In-app feeds; push prefs; no push on direct assign |
| C.3 | Infopoint tabs & badge | Task 18 | gap_closed_in_v1_6 | Admin **Infopoint** nav: General documents + New messages publish; driver tabs, badge, view/download stub |
| D | Open questions | `client_feedback_resolved` | gap_closed_in_v1_6 | See PRD `client_feedback_resolved` entries |

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

Full detail: `AUTHEON/prd-prototype-validation.md`.

---

## Demo paths (client walkthrough)

**Admin:** Infopoint → New messages (publish) → switch to Driver Infopoint (badge) → General documents (view/download).

**Clarify:** Profile notifications = tour alerts; Infopoint news = admin broadcasts.

**Languages:** Toggle EN/DE on new strings.

---

## Gaps / not in prototype

- PRD **tasks** remain `pending` for production delivery (expected).
- Real email SMTP, PDF generation, persistent storage, auth, service worker push — see `production_open_questions` in `prd.json`.
- Finance dashboard, CSV mass import, historical Excel migration — explicitly de-scoped in PRD v1.6.

---

## How to re-run verification

```bash
node AUTHEON/autheon-extracted/autheon/project/_audit-prototype.mjs
```

Open `AUTHEON/autheon-extracted/autheon/project/AUTHEON Prototype.html` in a browser for manual smoke test (see `prd-prototype-validation.md`).
