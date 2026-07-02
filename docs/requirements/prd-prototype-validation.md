# PRD v1.8 vs Static Prototype Audit

> **Canonical spec:** [`prd.json`](prd.json) (PRD v1.8).

**Last synced:** 2026-07-02  
**Audit scripts:** `prototype/project/_audit-prototype.mjs`, `prototype/project/_audit-i18n.js`, `prototype/project/_verify-seed.mjs`

---

## Verdict

**PASS v1.8** when all three scripts exit 0.

Includes v1.7 meeting outcomes (pre-Performed upload, daily limits, admin docs at creation) plus v1.8 admin cancel driver message, operational policies, profile limit tracking, and limit-increase requests.

---

## v1.8 checklist

| # | Requirement | Prototype evidence |
|---|-------------|-------------------|
| 1 | Tour document upload on active tours (not post-Performed only) | `canDriverUploadTourDocument` + `JobTourDocuments` uses `canUpload` gate; seed `TD-SEED-ACTIVE-001` on job 0845 |
| 2 | Driver daily acceptance limit on accept | `acceptJob()` hard block at `dailyJobLimit`; `DriverDailyLimitCard` on Profile |
| 3 | Same-day overlap confirmation on accept | `SameDayOverlapSheet` (no `window.confirm`) |
| 4 | Admin cancel modal: reason code + driver message (min chars) | `AdminCancelJobModal` + live counter |
| 5 | Driver cancelled tour shows reason + message | `cancellation-card` on `JobUnlocked` |
| 6 | Special-case cancel uses same reason rules | `SpecialCaseResolutionPanel` reason + message fields → `cancelJob()` |
| 7 | Settings → operational policies | `OperationalPoliciesForm` in Features/Settings |
| 8 | `getOperationalPolicies` / policy check APIs | `store.js` |
| 9 | Seed document on active tour (0845) | `TD-SEED-ACTIVE-001` |
| 10 | EN/DE i18n parity | `_audit-i18n.js` |
| 11 | Schedule-change cutoff on revert + draft edit | `checkScheduleChangePolicy` + override in `AUTHEON Prototype.html` |
| 12 | Driver limit-increase request (`daily_limit_override`) | `requestDailyLimitIncrease()` + `MasterDataRequestsPane` |
| 13 | Driver profile shows daily limit usage | `getDriverDailyAcceptanceSummary()` + `DriverDailyLimitCard` |
| 14 | Admin sets `daily_job_limit` per driver | Users pane field `adminUsersFieldDailyLimit` |
| 15 | Admin docs at job create/edit (section 07) | `newOrderSecDocuments` + `attachAdminJobDocument` |
| 16 | Admin notification for limit / profile requests | `master_data_change_requested` in notification feed |

---

## v1.7 checklist (carried forward)

| # | Requirement | Status |
|---|-------------|--------|
| 17 | Document Under Review after first post-Performed upload | Done (v1.6; active uploads use `Uploaded` summary until performed) |
| 18 | Report Problem seven codes + slide min 10 chars | Done (v1.6) |
| 19 | Schema `daily_job_limit` + `daily_limit_override` | [`schema.dbml`](../database/schema.dbml) |
| 20 | Single upload CTA on tour documents (no duplicate buttons) | One primary button in `JobTourDocuments` panel header |

---

## Demo smoke test (v1.8)

1. Admin → Settings → change cancel cutoff to 0, save.
2. Admin → job detail → Cancel job → pick reason + min-length message → driver notification body matches.
3. Driver → cancelled tour → reason label + message visible.
4. Driver → accept marketplace job → same-day overlap → confirmation sheet (not browser alert).
5. Driver → active tour 0845 → Tour documents → single upload button → upload works.
6. Admin → New job → section 07 → attach PDF/image → save draft → visible on Tour billing.
7. Admin → Users → edit driver → change daily job limit → accept blocked at new limit.
8. Admin → published tour → revert to draft inside schedule cutoff → override prompt or block.
9. Driver → Profile → daily limit card shows count → Request higher limit OR hit limit on accept → Admin → Profile change requests → Approve & save → accept succeeds.
10. Run: `node prototype/project/_audit-prototype.mjs` and `node prototype/project/_verify-seed.mjs`.

---

## Explicit prototype scope limits (not gaps)

| Topic | Status |
|-------|--------|
| Geo / travel-time overlap blocking | Future scope (`prd.json` `future_scope`) |
| Cross-day pickup/delivery date ranges on one leg | Future / client TBD |
| Production backend enforcement | `autheon-be` tasks still `pending` |
| Daily limit on admin direct assign | Not in prototype (accept-only enforcement) |

---

## Related

- Changelog: [`../archive/2026-07/prd-changelog-since-2026-07-01.md`](../archive/2026-07/prd-changelog-since-2026-07-01.md)
- Prior v1.6 audit items 1–28: [`../archive/2026-05/prd-changelog-since-2026-05-20.md`](../archive/2026-05/prd-changelog-since-2026-05-20.md)
