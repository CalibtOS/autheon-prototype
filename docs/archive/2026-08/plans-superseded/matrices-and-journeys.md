# Axis M — Matrix ownership checklists (planning-complete)

Attach these as AC on the listed epics. Full matrix bodies live in `prd.json` / requirements docs — this file owns **traceability**, not a second source of truth.

| Matrix / policy | Source of truth | Owner epic(s) | Planning AC |
|-----------------|-----------------|---------------|-------------|
| `driver_visibility_matrix` | PRD | E-2, D | ☐ Linked on E/D ClickUp; locked-field tests in E-2 AC |
| `marketplace_sync_policy` | PRD | E-1 | ☐ Linked on E-1; list freshness covered |
| `notification_channels_matrix` | PRD | F-3, I-2, T20 | ☐ Linked; OQ #32 drift → Deferred |
| `client_status_mapping` | PRD | D-2, G-1 | ☐ EN/DE labels in D-2/G-1 AC |
| `resolved_defaults.dialog_standard_v1` | PRD | **N** | ☐ N-2…N-5 AC |
| `resolved_defaults` notif presentation v2 | PRD | F-3 | ☐ Five-value ride preview; no category chips |
| `vehicle_domain_v2` | PRD (OQ #10 resolved) | G-2 | ☐ Three vehicle types; red-plate derived |
| Tour-doc amount field matrix | Proto sheets | B-7 | ☐ Design artifact before B-8/B-9 |

## Axis J — Journey list (planning-complete)

Binary AC: [`epic-efghimk-binary-ac.md`](./epic-efghimk-binary-ac.md) § Axis J (J1–J10).

| # | Journey | Primary epics |
|---|---------|---------------|
| 1 | Create → publish/assign → accept | G, E |
| 2 | Report Problem cancel (each reason) | A, D |
| 3 | Empty-run → admin review | D, G-3 |
| 4 | Tour document upload/review | B, E-2 |
| 5 | Consolidated invoice → paid | B |
| 6 | SP documents upload/review/replace | C |
| 7 | MDR → approve/reject | F-1, H-3 |
| 8 | Admin feed deep link | I-2 |
| 9 | Audit export | I-3 |
| 10 | Infopoint view/download | I-4, F-4 |
