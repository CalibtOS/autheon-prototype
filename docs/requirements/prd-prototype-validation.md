# PRD v2.0 vs Static Prototype Audit

> **Canonical spec:** [`prd.json`](prd.json) (PRD v2.0).

**Last synced:** 2026-07-14  
**Audit scripts:** `prototype/project/_audit-prototype.mjs`, `prototype/project/_audit-i18n.js`, `prototype/project/_verify-seed.mjs`

---

## Verdict

**PASS v2.0** when all three scripts exit 0.

Includes v1.9/v2.0 outcomes: one-time probation acceptance model, probation-only driver UI, in-PWA document preview + share/print, Infopoint separate View/Download, auto immutable driver IDs, and same-day per-leg time-window hard blocks.

---

## v2.0 checklist

| # | Requirement | Prototype evidence |
|---|-------------|-------------------|
| 1 | Tour document upload on active tours (not post-Performed only) | `canDriverUploadTourDocument` + `JobTourDocuments` uses `canUpload` gate; seed `TD-SEED-ACTIVE-001` on job 0845 |
| 2 | Driver probation acceptance limit on accept | `acceptJob()` blocks with `probation_limit_reached`; `DriverProbationCard` on Profile while on probation |
| 3 | Same-day overlap confirmation on accept | `SameDayOverlapSheet` (no `window.confirm`) |
| 4 | Admin cancel modal: reason code + driver message (min chars) | `AdminCancelJobModal` + live counter |
| 5 | Driver cancelled tour shows reason + message | `cancellation-card` on `JobUnlocked` |
| 6 | Special-case cancel uses same reason rules | `SpecialCaseResolutionPanel` reason + message fields → `cancelJob()` |
| 7 | Settings → operational policies | `OperationalPoliciesForm` in Features/Settings (`probationJobCount`) |
| 8 | `getOperationalPolicies` / policy check APIs | `store.js` |
| 9 | Seed document on active tour (0845) | `TD-SEED-ACTIVE-001` |
| 10 | EN/DE i18n parity | `_audit-i18n.js` |
| 11 | Schedule-change cutoff on revert + draft edit | `checkScheduleChangePolicy` + override in `AUTHEON Prototype.html` |
| 12 | No driver limit-increase request | Limit-increase UI removed; legacy `daily_limit_override` rows auto-rejected |
| 13 | Driver profile shows probation progress | `getDriverProbationSummary()` + `DriverProbationCard` (hidden after release) |
| 14 | Admin sets `probationJobLimit` + manual release | Drivers module + `releaseDriverFromProbation` |
| 15 | Admin docs at job create/edit (section 07) | `newOrderSecDocuments` + `attachAdminJobDocument` |
| 16 | In-PWA document preview + share/print | `DocumentPreviewSheet` + `getTransportOrderPreview` / tour / Infopoint |
| 17 | Infopoint separate View + Download | Infopoint doc rows |
| 18 | Auto immutable sequential driver ID | `nextDriverCode()` on create; edit locked |
| 19 | Same-day per-leg time windows | `cross_midnight_window` + form hard block |

---

## Demo smoke test (v2.0)

1. Admin → Settings → change cancel cutoff to 0, save.
2. Admin → job detail → Cancel job → pick reason + min-length message → driver notification body matches.
3. Driver → cancelled tour → reason label + message visible.
4. Driver → accept marketplace job → same-day overlap → confirmation sheet (not browser alert).
5. Driver → active tour 0845 → Tour documents → View opens in-PWA preview; Download still works.
6. Admin → New job → section 07 → attach PDF/image → save draft → visible on Tour billing.
7. Admin → Users → new driver → driver ID auto-assigned; edit cannot change ID.
8. Admin → published tour → revert to draft inside schedule cutoff → override prompt or block.
9. Driver → Profile → probation card shows Performed progress; at limit → ProbationLimitSheet (no request higher limit).
10. Admin → Users → release driver from probation → card hidden; booking unrestricted.
11. Admin → New job → set pickup From > To → save blocked with same-day window error.
12. Run: `node prototype/project/_audit-prototype.mjs` and `node prototype/project/_verify-seed.mjs`.

---

## Explicit prototype scope limits (not gaps)

| Topic | Status |
|-------|--------|
| Real binary PDF storage | Metadata/demo blobs only |
| Production BE/FE probation migration | Out of prototype scope |
| Driver workflow email after booking | Open conflict — not implemented |
| Branding pack / Report Problem timing | Open — not implemented |
