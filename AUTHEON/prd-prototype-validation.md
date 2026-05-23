# PRD v1.6 vs Static Prototype Audit

> **v1.5 baseline:** `AUTHEON/prd.json` (unchanged). **Canonical spec for prototype work:** `AUTHEON/prd_updated_v2.json`.

Last PRD sync: **2026-05-23** (v1.6: notifications, Under Review summary, visibility matrix, three push toggles).

Validated against:

- `AUTHEON/prd_updated_v2.json` (`client_feedback_traceability`, `driver_visibility_matrix`, `notification_channels_matrix`, `resolved_defaults`)
- `AUTHEON/autheon-extracted/autheon/project/AUTHEON Prototype.html`
- `AUTHEON/autheon-extracted/autheon/project/store.js`
- `AUTHEON/autheon-extracted/autheon/project/driver.jsx`
- `AUTHEON/autheon-extracted/autheon/project/admin.jsx`
- `AUTHEON/autheon-extracted/autheon/project/i18n.js`
- `AUTHEON/autheon-extracted/autheon/project/_audit-prototype.mjs` (automated checks)

## Verdict

**PASS (2026-05-23)** — `_audit-prototype.mjs` exits 0; all 16 v1.6 checklist items are implemented in the prototype.

The static prototype targets **PRD v1.6** (`prd_updated_v2.json`) for client walkthroughs. Operational statuses remain seven (`draft` … `special_case`); client labels **Under review** and **Completed** are derived from `document_review_summary` and `settlementState`.

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
| 10 | Admin mark document checked | Done (`markTourDocumentChecked` in tour billing) |
| 11 | Upload document / receipt CTA | Done (`tourDocUploadReceiptButton`) |
| 12 | Document type helper notices | Done (fuel + waiting in upload modal) |
| 13 | Re-upload admin alert | Done (`tour_document_reuploaded`) |
| 14 | Infopoint tab labels + nav badge | Done (`infopointDocsTab` / `infopointNewsTab`) |
| 15 | `cancellationActor` on cancel | Done (seed + admin detail banner) |
| 16 | Audit script v1.6 | Done (exit 0) |

## Coverage matrix (PRD v1.6 tasks)

Same task IDs as v1.5; v1.6 strengthens Tasks 4, 5, 7, 8, 10, 18–20, 22, 26, 27 per `prd_updated_v2.json`.

## Demo script (smoke test v1.6)

**Driver:** Set three push toggles → marketplace pull-refresh → accept → ordering party visible in tour detail → perform → upload fuel receipt (see helper) → open notification inbox → Infopoint news badge.

**Admin:** Publish job → **notification feed** event → open job → mark document checked → reject with preset reason → driver inbox shows rejection → special case resolve → cancel shows `cancellationActor`.

**Both:** EN/DE on new strings.

## Automated verification

```bash
node AUTHEON/autheon-extracted/autheon/project/_audit-prototype.mjs
```

Expect: i18n EN/DE parity, PRD v1.5+v1.6 store APIs, v1.6 document summary string `Under Review`, three push pref keys, `alternateContactPerson`, no forbidden v1.4 strings.

## Remaining production work

See `production_open_questions` in `AUTHEON/prd_updated_v2.json`.
