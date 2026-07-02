# PRD v1.8 vs Static Prototype Audit

> **Canonical spec:** [`prd.json`](prd.json) (PRD v1.8).

**Last synced:** 2026-07-02  
**Audit script:** `prototype/project/_audit-prototype.mjs`

---

## Verdict

**PASS v1.8** when `_audit-prototype.mjs` exits 0.

Includes v1.7 meeting outcomes (pre-Performed upload, daily limits, admin docs at creation) plus v1.8 admin cancel driver message and operational policies in Settings.

---

## v1.8 checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Tour document upload on active tours (not post-Performed only) | Required |
| 2 | Driver daily acceptance limit on accept | Required |
| 3 | Same-day overlap confirmation on accept | Required |
| 4 | Admin cancel modal: reason code + driver message (min 20 chars) | Required |
| 5 | Driver cancelled tour shows reason + message | Required |
| 6 | Special-case cancel uses same reason rules | Required |
| 7 | Settings → operational policies (cutoff hours, min message, default limit) | Required |
| 8 | `getOperationalPolicies` / `checkAdminCancelPolicy` store APIs | Required |
| 9 | Seed document on active tour (0845) | Required |
| 10 | EN/DE i18n parity for new keys | Required |
| 11 | Schedule-change cutoff on revert + draft edit (override note) | Required |

---

## v1.7 checklist (carried forward)

| # | Requirement | Status |
|---|-------------|--------|
| 12 | Admin attach document stub on new/edit draft job | Required |
| 13 | `drivers.daily_job_limit` in schema + driver profile UI | Required |
| 14 | Document Under Review after first post-Performed upload | Done (v1.6) |
| 15 | Report Problem seven codes + slide min 10 chars | Done (v1.6) |
| 16 | Driver limit-increase request (`daily_limit_override` queue) | Required |

---

## Demo smoke test (v1.8)

1. Admin → Settings → change cancel cutoff to 0, save.
2. Admin → job detail → Cancel job → pick reason + 20+ char message → driver notification body matches.
3. Driver → cancelled tour → reason label + message visible.
4. Driver → accept marketplace job → if same-day overlap, confirm prompt.
5. Driver → active tour → upload document (not only after Performed).
6. Admin → New job → section 07 → attach PDF/image → save draft → visible on Tour billing.
7. Admin → Users → edit driver → change daily job limit → accept blocked at new limit.
8. Admin → published tour → revert to draft inside schedule cutoff → override prompt or block.
9. Driver → hit daily limit on accept → request increase → Admin → Profile change requests → Approve & save → accept succeeds at new limit.

---

## Related

- Changelog: [`../archive/2026-07/prd-changelog-since-2026-07-01.md`](../archive/2026-07/prd-changelog-since-2026-07-01.md)
- Prior v1.6 audit items 1–28 remain in [`../archive/2026-05/prd-changelog-since-2026-05-20.md`](../archive/2026-05/prd-changelog-since-2026-05-20.md)
