# PRD v1.6 vs Static Prototype Audit

> **Canonical spec:** [`prd.json`](prd.json) (PRD v1.6, Feedback.pdf traceability, May 2026).

Last PRD sync: **2026-05-25** (single-file consolidation; re-audit after 2026-05-24 prototype commits).

Validated against:

- `prd.json` (`client_feedback_traceability`, `driver_visibility_matrix`, `notification_channels_matrix`, `resolved_defaults`)
- `../../prototype/project/AUTHEON Prototype.html`
- `../../prototype/project/store.js`
- `../../prototype/project/driver.jsx`
- `../../prototype/project/admin.jsx`
- `../../prototype/project/i18n.js`
- `../../prototype/project/_audit-prototype.mjs` (automated checks)

## Verdict

**PASS (2026-05-25)** — `_audit-prototype.mjs` exits 0; v1.6 checklist (items 1–25) plus six client-feedback gap closures and profile change-request queue. Canonical spec: `prd.json`.

Operational statuses remain seven (`draft` … `special_case`); client labels **Under review** and **Completed** are derived from `document_review_summary` and `settlementState`.

Production implementation (database, auth, real PDF template, file storage, map API, SMTP, service worker) remains out of scope for the prototype.

## v1.6 gap checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | `document_review_summary` → Under Review after first post-Performed upload | Done (`reconcileDocumentReviewSummary`; seed tour 0842-26) |
| 2 | Admin notification feed (in-app) | Done (`NotificationFeedPane`, nav) |
| 3 | Driver in-app notifications | Done (`DriverNotificationsList`, profile badge) |
| 4 | Three push toggles | Done (`pushEnabled`, `notifyNewPublished`, `notifyPostalPrefix`) |
| 5 | No push on direct assign | Done (`maybeNotifyPublishedJob`) |
| 6 | Alternate contact + progressive disclosure | Done (New order sec-05 + `mkLocation`) |
| 7 | Update master data from order entry | Done (checkboxes + `updateAddress` / `updateOrderingParty`) |
| 8 | `driver_visibility_matrix` | Done (ordering party in `JobUnlocked` only) |
| 9 | Display labels Under review / Completed | Done (`getJobDisplayStatus` in admin overview) |
| 10 | Admin document review | Done (Accept / Reject only; Mark checked removed as duplicate of Accept) |
| 11 | Upload document / receipt CTA | Done (`tourDocUploadReceiptButton`) |
| 12 | Document type helper notices | Done (fuel + waiting in upload modal) |
| 13 | Re-upload admin alert | Done (`tour_document_reuploaded`) |
| 14 | Infopoint tab labels + nav badge | Done (`infopointDocsTab` / `infopointNewsTab`) |
| 15 | `cancellationActor` on cancel | Done (seed + admin detail banner) |
| 16 | Audit script v1.6 | Done (exit 0, 2026-05-25) |
| 17 | Admin Infopoint: general documents + news publish | Done (`InfopointPane`, `addNewsItem`, upload stub) |
| 18 | Driver Infopoint docs: description, date, view/download stub | Done (`infopointDocViewDownload`) |
| 19 | Cancel binding warning + partner terms link on Report Problem cancel | Done |
| 20 | Seven cancellation reason codes (Feedback.pdf C.1) | Done |
| 21 | Not-performable evidence upload (max 5 files) + admin special-case list | Done |
| 22 | Master-data change request → admin notification feed | Done (`requestMasterDataChange`) |
| 23 | Report Problem warning icon (tour footer + sheet header) | Done (`Ic.Alert`) |
| 24 | Order-entry date/time/VIN/plate formatters + manufacturer datalist | Done (`inputFormatters.js`) |
| 25 | Profile change requests admin pane (list/filter, inline edit, Approve & save, Reject) | Done (`MasterDataRequestsPane`, `masterDataChangeRequests[]`) |
| 26 | One open master-data request per driver; pending UI blocks new submit | Done (`open_request_exists`, `ProfilePaneFull` banner) |
| 27 | Notification feed Review request → masterdata pane with request id | Done (`onReviewMasterDataRequest`, `MDR-*` meta) |
| 28 | Driver in-app notify on master-data approve/reject | Done (`master_data_change_approved` / `rejected`) |

## Coverage matrix (PRD v1.6 tasks)

Same task IDs as v1.5; v1.6 strengthens Tasks 4, 5, 7, 8, 10, 18–20, 22, 26, 27 per `prd.json`.

## Demo script (smoke test v1.6)

**Driver:** Set three push toggles → marketplace pull-refresh → accept → perform → **Infopoint → New messages** (badge, expand) → **General documents** (view/download stub) → notification inbox (tour alerts vs Infopoint hint).

**Admin:** **Infopoint → New messages** publish (subject, body, date) → **General documents** manage/upload stub → publish job → notification feed → tour document review → special case resolve.

**Both:** EN/DE on new strings.

## Automated verification

```bash
node ../../prototype/project/_audit-prototype.mjs
```

Expect: i18n EN/DE parity, PRD v1.5+v1.6 store APIs, v1.6 document summary string `Under Review`, three push pref keys, `alternateContactPerson`, no forbidden v1.4 strings, `DOMAIN.md` present, no legacy identifiers (`ReturnSheet`, `partner_invoice`, `use_partner_invoices`).

## Clarity pass (2026-05)

- Terminology: **Tour documents** + **Billing invoice** (type `invoice`); **Report Problem** (not return request).
- Code: `reportProblemJob` state, `onOpenTourBilling`, `use_tour_documents` financial guard.
- Removed v1.4 i18n and unused partner-invoice copy; see `DOMAIN.md` for operational vs display statuses.

## Remaining production work

See `production_open_questions` in `prd.json`.

## Client feedback comparison

See [`../research/client-feedback-comparison.md`](../research/client-feedback-comparison.md) for Feedback.pdf section ↔ prototype mapping (2026-05-20 onward).
