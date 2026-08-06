# Dispatch Notification Feed — Implementation Spec

**Provenance note:** this document was provided by the client directly to engineering (in an engineering conversation, 2026-08-04), not as an archived PDF/email like `Storno-Workflow-1.pdf`. It is reconstructed here from that conversation to the best of the engineering team's recollection so this feature has an archived source artifact, matching the traceability discipline `prd-client-source-validation.md` established for every other requirement in this PRD. **It is a reconstruction, not a verbatim transcript** — if the client's original file/email still exists, replace this document with it and keep this note as a changelog rather than deleting the history.

**Referenced by:** `docs/requirements/prd.json` → Task 33 ("Dispatch Notification Feed"), `docs/requirements/admin-client-requirements-status.md`.

---

## Overview

A consolidated, admin-facing ("Dispatch") notification feed surfacing operational events across several trigger conditions that need dispatch attention. Each notification carries a status distinct from having been viewed, and a severity used for visual triage. The feed complements — it does not replace — existing screens (job detail, document review, master-data-request review, service-partner profile); notification actions deep-link into those existing screens rather than duplicating their UI.

## Data model

Each notification carries:

- `id`
- `type` — the trigger condition (see the six items below)
- `status` — `open` | `processed`
- `severity` — `red` | `orange` | `gray`
- `message`
- `created_at`
- `processed_at` (set only when `status` becomes `processed`)
- `processed_by` (the acting admin)
- `payload` — trigger-specific data needed for the notification's deep-link action (e.g. job id, document id, driver id)

## Trigger types

1. **Order not accepted by cutoff** — a published order still has no driver assigned once the acceptance cutoff (15:45 the day before pickup) passes.
2. **Cancellation by service partner** — a booked order is cancelled by the service partner.
3. **Empty run reported** — a service partner reports an order as non-executable (empty run).
4. **Documents unreviewed 10+ days** — a tour document has sat in an unreviewed state for 10 or more days without an admin decision.
5. **Profile / master-data change request** — a driver-submitted master-data change request is awaiting an admin decision.
6. **Service partner inactive 90+ days** — a service partner has had no account activity for 90 or more days.

(The overview referred to these collectively as covering the operational surface needing dispatch attention; six distinct trigger conditions are enumerated above.)

## Cross-cutting behavior

- **Nav badge**: shows the open-notification count and pulses while at least one notification is open; stops pulsing once every notification is processed.
- **Status changes only via an explicit action** — a checkmark / "mark processed" control. Viewing a notification, opening its deep link, or navigating away must never change its status.
- **Processed notifications are retained, not deleted** — kept visible under a separate "Processed" view, for audit rather than as an active queue.
- **Severity is always paired with text** — red/orange/gray color coding is a supplement to a text label, never the only signal (accessibility requirement — color alone must never carry meaning).

## Implementation notes (for the engineering team)

- Determine schedule-driven vs. event-driven implementation per trigger type by reusing existing job-scheduler/event infrastructure rather than inventing a new pattern. (Types 2, 3, 5 above are naturally event-driven off existing workflows; types 1, 4, 6 are schedule-driven and need a recurring check.)
- Check existing order/service-partner/document/profile-change-request models before adding new columns or tables — several of the six trigger types can likely be computed from data that already exists.
- Design the notification store for easy extensibility, since this is a first version and more trigger types are expected later.
- Link notification actions to existing order/document/profile screens rather than duplicating their UI in the feed itself.
