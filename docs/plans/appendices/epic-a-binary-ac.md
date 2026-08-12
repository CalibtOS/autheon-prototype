# Epic A — Binary acceptance criteria (expanded)

**PRD:** T12, T32  
**Prototype:** `ReportProblemSheet`, cancel / empty-run paths in `driver.jsx`  
**BE:** `SpCancellationReason`, `EmptyRunReason`; POST `/problems`  
**Depends on:** nothing (BE ready)  
**Blocks:** Epic D fidelity; any Storno E2E

Pass/fail only. Do not invent answers to open PRD questions (T&C link target stays placeholder until client decides).

---

## A-0 — Sync FE `packages/shared` to BE shared HEAD

| # | AC | Pass? |
|---|----|-------|
| A-0.1 | FE submodule SHA equals agreed BE `shared` commit (or release tag) | ☐ |
| A-0.2 | `@shared` exports `SpCancellationReason`, `EmptyRunReason`, `EmptyRunDecision` | ☐ |
| A-0.3 | `@shared` exports consolidated-invoice + driver-document enums used by Epics B/C | ☐ |
| A-0.4 | `pnpm` build of FE packages that import `@shared` succeeds | ☐ |
| A-0.5 | No local duplicate string-union forks of those enums in `apps/web` feature code | ☐ |

---

## A-1 — Enums available to UI (if A-0 alone incomplete)

| # | AC | Pass? |
|---|----|-------|
| A-1.1 | Cancel allow-list exactly: `appointment_not_kept`, `booked_accidentally`, `org_not_possible`, `other` | ☐ |
| A-1.2 | Empty-run allow-list exactly: `not_operational`, `not_roadworthy`, `not_present`, `not_released`, `key_docs_missing`, `other` | ☐ |
| A-1.3 | Admin cancel codes remain a **separate** enum (not merged into SP Storno) | ☐ |

---

## A-2 — `ReportProblemSheet` codes + validation

| # | AC | Pass? |
|---|----|-------|
| A-2.1 | Cancel radio/select options = shared cancel enum only (no `appointment_cannot_be_met`, `organisationally_impossible`, etc.) | ☐ |
| A-2.2 | Empty-run options = shared empty-run enum only (no `vehicle_not_operational`, `key_or_documents_missing`, etc.) | ☐ |
| A-2.3 | Default cancel reason = `appointment_not_kept` | ☐ |
| A-2.4 | Default empty-run reason = `not_operational` | ☐ |
| A-2.5 | Submit disabled until `trim(explanation).length >= 30` (PRD / prototype; not 10) | ☐ |
| A-2.6 | Cancel path: **no** evidence upload UI | ☐ |
| A-2.7 | Empty-run path: evidence optional, max **5** files; respects upload limits | ☐ |
| A-2.8 | `other` requires non-empty free-text when BE requires it | ☐ |
| A-2.9 | POST body reason codes accepted by live BE (201); legacy codes return 400 in test | ☐ |
| A-2.10 | Sheet still portals into `DriverShell` frame; tab bar stays hidden on job detail | ☐ |

---

## A-3 — i18n EN/DE

| # | AC | Pass? |
|---|----|-------|
| A-3.1 | Keys use new machine ids (match prototype `i18n.js` labels) | ☐ |
| A-3.2 | Happy path never shows raw machine id as user-visible label | ☐ |
| A-3.3 | Orphan old `problemReason*` keys removed or aliased with deprecate note | ☐ |

---

## A-4 — Tests / fixtures

| # | AC | Pass? |
|---|----|-------|
| A-4.1 | Unit/MSW fixtures use only DBML codes | ☐ |
| A-4.2 | FE unit/component tests for Report Problem green | ☐ |
| A-4.3 | No grep hits in `apps/web` for legacy cancel/empty-run codes (except explicit “reject legacy” tests) | ☐ |

---

## A-5 — Live BE smoke

| # | AC | Pass? |
|---|----|-------|
| A-5.1 | Driver cancel → job cancelled_by_sp (or PRD-mapped status) | ☐ |
| A-5.2 | Driver empty-run + optional evidence → admin can recognise / not_recognise | ☐ |
| A-5.3 | Scope A BE e2e for report-problem / empty-run-review still green | ☐ |

---

## A-6 — Dual vocabulary docs

| # | AC | Pass? |
|---|----|-------|
| A-6.1 | Shared package / ADR note: SP Storno ≠ Admin cancel modal codes | ☐ |
| A-6.2 | Admin cancel UI still uses admin vocabulary (`driver_unavailable`, …) | ☐ |

---

## Explicit non-AC (do not block Epic A)

- Pixel-perfect sheet chrome → Epic D-1 / Epic L  
- T&C URL final target → open question  
- Admin Problems list beyond empty-run → separate backlog  
