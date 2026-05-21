# PRD v1.5 vs Static Prototype Audit

> **v1.4 is superseded.** Canonical spec: `AUTHEON/prd.json`.

Last PRD sync: **2026-05-21** (prototype UX refinements: draft delete, Jobs-only New job entry, cancel slide gating, special case resolution labels).

Validated against:

- `AUTHEON/prd.json` (`resolved_defaults`, `prototype_assumptions`, `global_business_rules`)
- `AUTHEON/autheon-extracted/autheon/project/AUTHEON Prototype.html`
- `AUTHEON/autheon-extracted/autheon/project/store.js`
- `AUTHEON/autheon-extracted/autheon/project/driver.jsx`
- `AUTHEON/autheon-extracted/autheon/project/admin.jsx`
- `AUTHEON/autheon-extracted/autheon/project/i18n.js`
- `AUTHEON/autheon-extracted/autheon/project/_audit-prototype.mjs` (automated checks)

## Verdict

The static prototype is **aligned with PRD v1.5** for client walkthroughs. Operational statuses use `performed` and `special_case` only (no `return_requested` / `completed`). Return-window flows are replaced by **Report Problem**. Finance dashboard is **removed** when `financeModule` is false; **tour documents** module is enabled by default in the demo.

Production implementation (database, auth, real PDF template, file storage, map API, SMTP, service worker) remains out of scope for the prototype.

Audit updates:

- Rejected tour documents surface a correction-required job summary; Special Case republish returns to `published` (not Draft).
- **2026-05-21:** Draft jobs can be permanently deleted from admin detail; **New job** is only the primary CTA on Jobs overview (removed from admin sidebar). Cancel Order slide is disabled until explanation ≥ 10 characters. Special case panel: Continue, Republish, Close (administrative close → Performed + settlement Closed), Cancel tour (→ Cancelled).

## Coverage matrix (PRD v1.5 tasks)

| Task | Feature | Prototype |
|---:|---|---|
| 1 | Domain model | Ordering party, pickup/delivery, addresses, document review summary, settlement state, v1.5 statuses |
| 2 | Auth | Persona switcher; blocked/inactive partners |
| 3 | Service partner management | Active, Blocked, Inactive, Archived, Soft deleted; access reset |
| 4 | Ordering party & addresses | Admin panes; shared address master data |
| 5 | Job creation | New order via Jobs overview CTA (not sidebar nav); publish/assign from Draft |
| 6 | Publishing & assignment | Revert Published→Draft; no Published→Assigned |
| 7 | Marketplace | Published only; pull-to-refresh / reload |
| 8 | Detail & visibility | Locked preview; map handoff after unlock |
| 9 | Acceptance | Slide-to-confirm; binding accept |
| 10 | My Jobs | Active, Performed, Cancelled, Special case tabs |
| 11 | Operational completion | Mark as performed |
| 12 | Report Problem | Cancel order (slide, min 10 chars) + not performable (submit) |
| 13 | Special case resolution | Continue, republish, administrative close, cancel order |
| 14 | Admin cancel / draft delete | Cancel non-draft jobs; permanent delete Draft only |
| 15–16 | Admin overview/detail | Filters; draft delete; New job CTA on overview |
| 17 | PDF | HTML/text preview; regenerate; on accept/assign |
| 18 | Infopoint | Documents + News; read/unread |
| 19 | Profile & prefs | Push prefs; no driver workflow email copy |
| 20 | Notifications | Push audit entries; admin email queue demo |
| 21 | Finance scope | Finance nav hidden; partner invoices/documents when module on |
| 22 | Audit log | Timeline + CSV export |
| 23–25 | UX / PWA | Toasts, validation, mobile shell, refresh |
| 26 | QA | Manual demo script below; `_audit-prototype.mjs` passes |
| 27 | Tour documents | PRD default categories, review/reject, bulk download toast, admin register |
| 28 | Distance & maps | Mock estimate/recalculate; external map URLs |
| 29 | Rollout | Documented in PRD assumptions (no Excel migration UI) |

## Demo script (smoke test)

**Driver:** marketplace → accept → maps → perform → Report Problem (cancel) → assigned tour → not performable → special case tab → upload document → Infopoint news → pull refresh.

**Admin:** New job from Jobs overview → save draft → delete draft (optional) → publish → special case resolve (continue / republish / close / cancel) → partner invoices → ordering parties/addresses → audit export → confirm no Finance nav and no New job sidebar item.

## Automated verification

```bash
node AUTHEON/autheon-extracted/autheon/project/_audit-prototype.mjs
```

Expect: i18n EN/DE parity, no forbidden v1.4 store APIs, PRD v1.5 store methods present, PRD default driver document categories present, and no stale v1.4 return-window user-facing copy.

## Remaining production work

See `prototype_assumptions` and `production_open_questions` in `AUTHEON/prd.json` (map API vendor, DSGVO/file retention, final app name, production copy for special case Close vs Cancel).
