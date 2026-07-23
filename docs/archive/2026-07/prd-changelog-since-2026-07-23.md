# PRD changelog: 2026-07-23 (v2.5 → v2.6)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`
**Baseline:** PRD v2.5 (2026-07-22, full order editing + Storno consistency pass)
**Source:** Work order 2026-07-23 — "Remove the legacy special-case model entirely."

Scope note: the deliverable is an updated **clickable prototype** plus updated **requirements/data-model docs**. Backend behaviour remains **simulated** in the prototype and captured here as requirements for the dev team.

Until now the empty-run workflow (v2.4) was built **on top of** the older special-case model and left it in place as a "legacy/read-only" umbrella. This session **deletes the special-case model outright** so there is exactly one driver problem/empty-run path. Because it removes an operational status and an enum value from the spec + data model, it takes a **v2.6** bump.

---

## 1. Legacy special-case model removed [v2.6]

**Before (v2.5):** the `special_case` operational status and `problem_type.not_performable` were retained for backward-compat/read-only display; the empty-run model rode on special-case-named plumbing; the admin job detail still rendered a `SpecialCaseResolutionPanel` (Continue / Republish / Administrative-close / Cancel) for the one seeded `special_case` job.

**Now:** the special-case model is gone. There is one driver problem path — **Cancel order** (`cancelled_by_sp`) or **Report empty run** (`empty_run_reported`) — and one admin outcome for a reported empty run: **Recognised** (`empty_run_recognised`, terminal) or **Not recognised** (`empty_run_not_recognised`, terminal). A not-recognised empty run does **not** reactivate the order. The legacy resolution actions (Continue / Republish / Administrative-close) are removed with the model (client decision 2026-07-23: "replace the special case entirely with the empty run recognised/not-recognised").

### Status model

- **Removed** `special_case` from the `job_status` enum (`store.js STATUSES`, `schema.dbml`, `logical-model.md`, `prd.json`).
- **Removed** `not_performable` from `problem_type` (`schema.dbml`) — the empty-run report replaces it.
- `statusUmbrella()`: `empty_run_reported` is now **its own review bucket** (was grouped under a `special_case` umbrella). `cancelled` is the sole remaining legacy umbrella.

### Seed / demo data

- The seeded problem tour **0846 / A-2026-00846** is now `empty_run_reported` with an `emptyRunReport` (reason `not_present`, prior status `accepted`, 1 evidence file) instead of a `special_case` with a `specialCaseReport`.
- Seed audit + admin email-alert event `special_case_created` → `empty_run_reported`.

### Prototype plumbing renamed (special-case → empty-run)

- `specialCaseReport` → `emptyRunReport`; the report's `statusBeforeSpecialCase` → `statusBeforeReport`.
- `driverState.specialCaseIds` → `driverState.emptyRunReviewIds`; `isSpecialCase(id)` → `isInEmptyRunReview(id)`.
- `buildSpecialCaseEvidenceMeta` → `buildEmptyRunEvidenceMeta` (evidence id prefix `SCE-` → `ERE-`).
- Deleted `store.resolveSpecialCase` + `inferStatusBeforeSpecialCase`; deleted admin `SpecialCaseResolutionPanel` + `SPECIAL_CASE_STORE_DECISION` (the `EmptyRunReviewPanel` is the only review UI). `reportProblemNotPerformable` (→ `empty_run_reported`) no longer dual-writes a legacy `specialCaseReport`.
- CSS: `.pill.special_case` → `.pill.empty_run`; tokens `--st-special-case` → `--st-empty-run`, `--st-special-bg` → `--st-empty-run-bg`.
- Driver My Jobs: the "Special" tab is now the **Empty run** review tab (`emptyRunReviewTab`).

### Docs

- **`prd.json`** → **v2.6**: `special_case` removed from all status lists / rules / summaries; Task 12 epic → "Report Problem, Cancellation & Empty Run"; Task 13 epic → "Admin Empty-Run Review & Cancellation Resolution"; `client_status_mapping` legacy note records the removal. Dated historical timeline entries keep their original wording (accurate record of past decisions).
- **`schema.dbml`** / **`logical-model.md`**: enum values removed; "ignore the special case" retention notes rewritten as removal notes.
- **`autheon-context-pack.md`**: §3/§4/§8/§9 updated — `special_case` is no longer a live status; empty-run terminal model is the sole path.
- **i18n** (EN + DE): removed `status.special_case`, the `adminSpecialCase*` resolution strings, `adminNotifSpecialCaseCreated`, dead `reportProblem*SpecialCase*`/`reportProblemNotPerformable*` keys; renamed `specialCaseTab` → `emptyRunReviewTab`, `adminSpecialCaseEvidence` → `adminEmptyRunEvidence`; reworded status-explainer + acceptance/help copy. EN/DE parity preserved (1233 keys each).

## Deliberately unchanged

- The store method name `reportProblemNotPerformable` and the driver sheet's internal `'not_performable'` path key are **kept** — they are the empty-run entry point (renaming them ripples into the audit contract without changing behaviour). All user-facing copy is "empty run."
- Legacy tables `job_problem_reports` / `problem_report_evidence` remain in `schema.dbml` (back-compat storage), now with the `not_performable` type removed; the canonical path is `sp_cancellations` + `empty_run_reports` / `empty_run_evidence`.
- Dated historical changelog/timeline entries inside `prd.json` (e.g. the 2026-05-21 decision log) keep their original special-case wording as an accurate audit trail.

## Validation

`node --check` clean for `store.js` / `i18n.js`; `prd.json` parses; i18n EN/DE parity 1233/1233; `_verify-seed.mjs` / `_audit-prototype.mjs` re-run (seed job 0846 asserted as `empty_run_reported`, audit expectations updated for the removed `resolveSpecialCase` / renamed evidence builder).

## Open items (unchanged)

OQ-19 (cancellation T&C link placeholder) and OQ-14 (post-booking driver workflow email) remain open.
