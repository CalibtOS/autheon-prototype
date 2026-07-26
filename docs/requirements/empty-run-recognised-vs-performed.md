# Q&A — When/why is "Empty run recognised / not recognised" categorised under *Performed*?

**Question (QA, 2026-07-22):** *"At what time did we categorize the Recognised / Not-recognised empty-run outcome under the Performed status in the job?"*

## Short answer

**Never as an operational status.** An empty-run outcome is **its own terminal status** on the job. Only the **admin Jobs-board grouping and the pill colour** roll `empty_run_recognised` under the *Performed* **column** — this is a **display/query-only** categorisation applied at render time, not a status change and not a business fact. `empty_run_not_recognised` groups under the *Cancelled* column, **not** Performed.

So there is no point in the workflow where a job "becomes performed" because of an empty run. The vehicle transfer did **not** happen; a recognised empty run is a *resolved, non-cancellation* outcome, and a not-recognised one is a *closed* outcome.

## Where the categorisation happens (exact points in the code)

1. **The real status is set at admin review time** — the moment the dispatcher clicks *Recognised* / *Not recognised* in the empty-run review panel:
   - `store.js` → `reviewEmptyRun(id, decision)`:
     `j.status = recognised ? "empty_run_recognised" : "empty_run_not_recognised";`
   - Both are terminal and read-only. `empty_run_not_recognised` does **not** reactivate the order.

2. **The *Performed*-column categorisation is display-only**, applied at render/query time — the stored status is never `performed`:
   - `store.js` → `statusUmbrella(s)`: `empty_run_recognised → "performed"`, `empty_run_not_recognised → "cancelled"`, `empty_run_reported → "special_case"`, `cancelled_by_sp` / `cancelled_by_autheon → "cancelled"`.
     Used only by the board column counts/filter (`countsByStatus`, admin overview `statusFilter`).
   - `STATUSES.empty_run_recognised.cls = "performed"` — this is the **pill colour class only** (visual grouping so a recognised outcome reads as "closed, not cancelled").

## Why it was grouped this way

Board scannability. Dispatch scans the Jobs board by a few umbrella columns. A **recognised** empty run is a *finished, non-cancellation* case, so it sits with completed work rather than with cancellations; a **not-recognised** empty run and both cancellations sit under *Cancelled*; a pending report sits under *review*. The precise machine status is always shown as a **reason chip** on the row, so no information is lost.

## Guarantee: recognised ≠ operationally performed

`empty_run_recognised` must **never** behave like a real `performed` transport. Verified in code:

- **Probation release / Performed counts** use the **precise** status:
  `driverProbationPerformedCount` filters `j.status === "performed"` — a recognised empty run is **not** counted, so it never releases probation or contributes to the performed threshold.
- `reviewEmptyRun` never adds the job to `driverState.performedIds`, never calls `markPerformed`, and never runs `maybeAutoReleaseProbation`.
- Completion/settlement (`getJobDisplayStatus` "Completed") keys off settlement + document state, not the umbrella.

**Rule of thumb (also in `logical-model.md` and `prd.json` global_business_rules):** `statusUmbrella()` / pill colour are **presentation-only** and must never drive probation, completion, cancellation, editing, or transition logic. Business logic always uses the precise `operational_status`.

## Summary table

| Precise status (`operational_status`) | Set when | Board umbrella column | Pill colour class | Counts as performed? |
|---|---|---|---|---|
| `empty_run_reported` | driver submits empty-run report | review / Special case | `special_case` | No |
| `empty_run_recognised` | admin clicks *Recognised* | **Performed** (display only) | `performed` (display only) | **No** |
| `empty_run_not_recognised` | admin clicks *Not recognised* | Cancelled | `cancelled` | No |

*If dispatch finds the "Performed column" grouping confusing, the display-only mapping can be changed (e.g. give recognised empty runs their own column or group them under a neutral "Resolved" column) without any business-logic impact — the categorisation is purely `statusUmbrella()` + the pill `cls`.*
