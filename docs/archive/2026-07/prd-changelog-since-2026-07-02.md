# PRD changelog: 2026-07-02 → 2026-07-09 (v1.9)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`  
**Baseline:** PRD v1.8 (2026-07-02)  
**This version:** PRD v1.9 (2026-07-09)  
**Source:** Post-v1.8 prototype-review meeting — verified meeting-analysis delta report (findings F-01..F-11). Speakers Taner/Till/Carolina. *Note: the source transcript is not yet committed to `meetings/source/`; see Related files.*

Delta summary since v1.8: **0 NEW · 2 CHANGED · 1 CONFLICT · 2 new open questions** (plus 4 CONFIRMED, 2 DEFERRED — no edits).

---

## Version bump

- `version`: **v1.8 → v1.9** — *driver probation model replaces daily acceptance limit; in-PWA document preview/share/print; driver workflow email conflict and inactivity handling flagged for decision*

---

## F-01 — Probation model replaces daily acceptance limit [CHANGED]

**Finding:** F-01 (Task 30, Task 3, Task 31, OQ-9). Priority High.

**Decision:** The per-calendar-day acceptance-limit model (v1.8) is replaced by a **one-time probation model**. Every new driver may book up to a configurable number of initial jobs (default 3) and must have that many jobs marked **Performed** before becoming **fully released**; after release there is no further V1 booking limit. There is no rolling daily quota and no driver limit-increase request. Admin may **manually release** a driver from probation for exceptional account-reset cases. (Evidence: *"er muss erstmal tatsächlich drei machen"* — Taner, 14:28.)

**Old → new:**

- **Old (v1.8):** per-driver configurable `daily_job_limit`; hard block per calendar day; driver limit-increase request via change-request queue; same-day overlap confirmation.
- **New (v1.9):** one-time `probation_job_limit` (default 3) initial allowance + Performed release threshold; automatic release on reaching the threshold; manual admin release; same-day overlap confirmation retained unchanged; limit-increase request flow removed.

**PRD changes:**

- Task 30: epic renamed *Driver Daily Acceptance Limits → Driver Probation Acceptance Limit*; story + acceptance rewritten to probation model (blocks, release, manual release, no rolling quota); same-day overlap criteria retained.
- Task 3 acceptance: new criterion — admin can view probation state and manually release a driver (audited).
- Task 31 acceptance: default key `driver.acceptance.defaultDailyJobLimit` → `driver.acceptance.probationJobCount` (default 3).
- `product_context.important_notes`: two acceptance-limit notes rewritten to the probation model.
- `resolved_defaults`: `driver_daily_acceptance_limit_v1` → `driver_probation_acceptance_limit_v1` (rewritten); `app_settings_catalog_v1` key renamed; `driver_fields_v1` `dailyJobLimit` → `probationJobLimit` + `probationCleared`.
- `client_feedback_resolved`: Ferhat Q3 entry marked superseded and rewritten to the probation model.
- `scope_alignment.v1_in_scope`: acceptance-limit entry rewritten to probation model.
- `production_open_questions` (OQ-9): updated — does admin direct assignment count toward the probation Performed threshold, and may admin assign while a driver is probation-blocked?

**Database:** Schema change (F-01 touches data).

- `drivers.daily_job_limit` **replaced by** `probation_job_limit smallint not null default 3` + `probation_cleared_at timestamptz` (null = on probation).
- `master_data_change_type.daily_limit_override` **deprecated** (limit-increase requests removed); retained for legacy prototype rows only.
- `app_settings` canonical key `driver.acceptance.defaultDailyJobLimit` → `driver.acceptance.probationJobCount`.
- Updated `schema.dbml` header, `logical-model.md` status override, app_settings table, and "Driver probation acceptance limit" section.

**Prototype sync:** *Pending* — prototype still implements the v1.8 daily-limit model (`dailyJobLimit`, `acceptJob` daily enforcement, overlap prompt, `requestDailyLimitIncrease` / `daily_limit_override`). Prototype must migrate to probation (`probationJobLimit`, Performed-count release, manual admin release, remove limit-increase request). Docs-only step — audits will report this as a gap.

---

## F-02 — Optional driver workflow email after booking [CONFLICT — NEEDS HUMAN DECISION]

**Finding:** F-02 (Task 20, Task 17, Task 27, global rule). Priority High.

**Conflict:** The meeting proposed an **optional booking-confirmation email to drivers** (potentially including the order and attached PDFs/documents) once a driver has booked (*"sobald jemand gebucht hat, bekommt er"* — Taner, 40:59). This directly contradicts the standing PRD rule that **drivers receive no workflow emails** (PWA/push only).

**Resolution:** **Not silently resolved.** The prohibiting global rule (`global_business_rules`, `important_notes`) stays in force until a human decides. No conflicting rule changed.

**PRD changes:**

- `important_notes`: new note documenting the unresolved conflict and both sides.
- `production_open_questions`: new CONFLICT entry — allow optional driver workflow email after booking, or keep it prohibited?

**Database:** No schema change.

**Prototype sync:** None. Do not implement until decided.

---

## F-03 — In-PWA document preview + download/share/print [CHANGED]

**Finding:** F-03 (Task 8, Task 18, Task 25, Task 27). Priority Med.

**Decision:** Document handling should **prefer preview inside the PWA** for permitted PDFs/images instead of forcing a separate browser tab. Download remains; **share/print** actions are exposed through standard device/system APIs where supported. (Evidence: *"direkt preview mäßig in der App angezeigt wird"* — Taner, 43:53.)

**Old → new:**

- **Old (v1.8):** view/open/download documents from the PWA.
- **New (v1.9):** in-PWA preview preferred over separate browser tab; download retained; share/print added where system APIs support them.

**PRD changes:**

- Task 27 acceptance: two new criteria (in-PWA preview; download + share/print while preview open).
- Task 8 acceptance: new criterion — permitted PDFs (incl. transport-order PDF) preview in-PWA with download/share/print.
- Task 18 acceptance: Infopoint document view criterion updated to in-PWA preview + share/print.
- `client_feedback_resolved`: new F-03 entry.
- `scope_alignment.v1_in_scope`: new in-PWA preview entry.

**Database:** No schema change (share/print are client capabilities).

**Prototype sync:** *Pending* — prototype currently uses view/download stubs; add in-PWA preview and share/print affordances where supported.

---

## F-04 — Inactive service-partner handling [OPEN]

**Finding:** F-04 (Task 3, Task 20, Task 31). Priority Med.

**Decision:** Not implemented. New inactivity-management need raised (possible automatic blocking after a long period without driving; example three months) — policy unresolved (*"drei Monate ... nicht ein einziges Mal fährt"* — Taner, 55:23).

**PRD changes:** `production_open_questions`: new entry — after what inactivity period should a driver be warned, contacted, blocked, set inactive, or archived, and should this be automatic or admin-reviewed?

**Database:** No schema change.

**Prototype sync:** None.

---

## F-05 — Branding/design pack pending [OPEN]

**Finding:** F-05 (OQ-4, Task 25, Task 31). Priority Med. (Evidence: *"Schriftart, Farbe und so weiter"* — Taner, 34:50.)

**Decision:** Not implemented. Client-provided design inputs remain pending.

**PRD changes:** `production_open_questions` (OQ-4): existing app-display-name entry broadened to final production branding inputs — display name, logo, font, colors, and related legal/UI copy.

**Database:** No schema change.

**Prototype sync:** None.

---

## CONFIRMED / DEFERRED — no edits

| Finding | Class | Reference | Action |
|---------|-------|-----------|--------|
| F-06 driver "Mark as performed" sufficient for V1 | CONFIRMED | Task 11 | Confirmed, no edit |
| F-07 delivery proof / delivery-note upload fits document model | CONFIRMED | Task 27 | Confirmed, no edit |
| F-08 marketplace self-acceptance stays automatic | CONFIRMED | Task 9 | Confirmed, no edit |
| F-09 sensitive/high-value jobs assignable off-marketplace | CONFIRMED | Task 6 | Confirmed, no edit |
| F-10 scanner/OCR document-quality checks later scope | DEFERRED | `out_of_scope`, `future_scope` | Already present, no edit |
| F-11 reputation/ranking/qualification later scope | DEFERRED | `out_of_scope` (Driver rating/ranking) | Already present, no edit |

---

## Prototype work now pending (docs-only step)

This update changes docs only; the prototype is intentionally not touched. Expected new gaps:

- **F-01:** migrate prototype from daily-limit model to probation (`probationJobLimit`, Performed-count auto-release, manual admin release; remove `requestDailyLimitIncrease` / `daily_limit_override`; keep same-day overlap prompt).
- **F-03:** add in-PWA document preview + share/print affordances.

Audits (`_audit-prototype.mjs`, `_verify-seed.mjs`, `_audit-i18n.js`) will report these as gaps — do not edit the prototype to make them pass in this step.

---

## Related files

- Prior changelog: [`prd-changelog-since-2026-07-01.md`](prd-changelog-since-2026-07-01.md)
- Database: [`../../database/schema.dbml`](../../database/schema.dbml), [`../../database/logical-model.md`](../../database/logical-model.md)
- Prototype audit: [`../../requirements/prd-prototype-validation.md`](../../requirements/prd-prototype-validation.md)
- **Repo gap:** source meeting transcript for findings F-01..F-11 is not committed under `meetings/source/`; add it for full traceability.
