# PRD changelog: 2026-07-09 → 2026-07-10 (v2.0)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`  
**Baseline:** PRD v1.9 (2026-07-09)  
**This version:** PRD v2.0 (2026-07-10)  
**Source:** Post-v1.9 meeting 2026-07-10 — verified meeting-analysis delta report (findings F-01..F-08; speakers Taner/Carolina/Till). *Note: the source transcript is not yet committed to `meetings/source/`; see Related files.*

Delta summary since v1.9: **3 NEW · 1 CHANGED · 0 CONFLICT · 3 new open questions** (plus 1 DEFERRED — no task change). Importance 7/10; F-06 is the main open risk because it touches the core Report Problem workflow.

---

## Version bump

- `version`: **v1.9 → v2.0** — *probation-only driver UI (legacy limit-request UI removed); automatic immutable sequential driver IDs; same-day per-leg time-window validation; Infopoint separate View/Download actions; branding pack, driver-ID format, Report Problem timing, and production domain flagged for decision*

---

## F-02 — Probation UI replaces legacy limit-request UI [CHANGED]

**Finding:** F-02 (Task 30, Task 19, Task 23). Priority High. Evidence: *"höheres Limit anfragen raus"* (remove "request higher limit") — Taner, 22:09.

**Decision:** The driver-facing presentation must be a probation-specific status/progress card that disappears after release. The old daily-limit usage meter and the "request higher limit" action are removed from the UI. (The backend probation model itself was already set in v1.9, F-01; this is the UI counterpart.)

**Old → new:**

- **Old:** driver profile showed a daily-limit usage meter + "request higher limit" action.
- **New:** driver profile shows a probation status/progress card while on probation; no limit meter, no limit-increase action; card hidden after release; self-accept beyond the initial allowance is blocked with a clear probation-limit explanation.

**PRD changes:**

- Task 30 acceptance: new criterion — driver-facing presentation is a probation card; legacy limit meter + "request higher limit" removed.
- Task 19 acceptance: two new criteria — probation progress card while on probation (no limit meter / no request action); card hidden after release.
- Task 23 acceptance: new criterion — probation self-accept block shows a clear probation-limit explanation.
- `resolved_defaults.driver_probation_acceptance_limit_v1`: extended with the F-02 UI rule.

**Database:** No schema change (UI-only; probation columns already exist from v1.9).

**Prototype sync:** *Pending* — prototype still renders the daily-limit card with "request higher limit"; must switch to the probation status card and hide it after release.

---

## F-03 — Automatic immutable sequential driver IDs [NEW]

**Finding:** F-03 (Task 3, Task 22). Priority Med. Evidence: *"systemseitig automatisch eine ID bekommen"* (receive an ID automatically from the system) — Taner, 37:22.

**Decision:** Driver/service-partner records receive a system-generated, immutable, sequential identifier; retired/blocked IDs are never reused. Exact format is client-defined (open question).

**PRD changes:**

- Task 3 acceptance: driver ID now assigned automatically (not entered manually); monotonic sequence; immutable after creation; never reused after block/inactive/archive/soft-delete/departure.
- Task 22 acceptance: logged actions extended with "driver created with system-assigned driver ID" and "driver probation release".
- `resolved_defaults.driver_id_generation_v1` (new).
- `scope_alignment.v1_in_scope`: new entry (automatic, immutable, never-reused sequential driver IDs).
- `production_open_questions`: new entry — exact ID format (prefix, numeric length, padding, year component, starting sequence).

**Database:** No structural change. `drivers.driver_code` (already `unique`) is annotated as system-assigned/immutable/never-reused; "never reused" is enforced by a monotonic sequence at the service layer, not by adding columns. Documented in `schema.dbml` and `logical-model.md` (constraints).

**Prototype sync:** *Pending* — prototype currently requires driver ID on the create form; must auto-assign and lock it.

---

## F-04 — Same-day per-leg time windows [NEW]

**Finding:** F-04 (Task 5). Priority Med. Evidence: *"Zeitfenster selber müssen immer am selben Tag sein"* (the time windows themselves must always be on the same day) — Taner, 44:19.

**Decision:** A pickup or delivery time window must start and end on the same calendar day. Pickup and delivery may still be on different dates. Cross-midnight windows are unsupported in V1.

**PRD changes:**

- Task 5 acceptance: new criterion — per-leg window is same-day; cross-midnight rejected/blocked with a clear message on save/publish.
- `resolved_defaults.time_window_same_day_v1` (new).

**Database:** No structural change. `job_locations.window_start`/`window_end` are already `time` values tied to one `scheduled_date`. Documented the `window_end >= window_start`, no-cross-midnight rule in `schema.dbml` (comment) and `logical-model.md` (constraints).

**Prototype sync:** *Pending* — add same-day window validation on the admin new/edit order form.

---

## F-05 — General Documents separate View/Download actions [NEW]

**Finding:** F-05 (Task 18, Task 27). Priority Low. Evidence: *"Ich würde zwei Buttons einführen"* (I would introduce two buttons) — Taner, 46:36.

**Decision:** Infopoint General Documents (and driver document rows) expose separate View and Download actions where mobile layout allows; non-previewable types fall back to download-only; constrained layouts may place Download inside the View preview screen.

**PRD changes:**

- Task 18 acceptance: new criterion — separate View/Download with fallback.
- Task 27 acceptance: new criterion — document rows expose View/Download with fallback.
- `resolved_defaults.general_documents_actions_v1` (new).

**Database:** No schema change (UI-only).

**Prototype sync:** *Pending* — add separate View/Download affordances to Infopoint General Documents and document rows.

---

## F-01 — Branding inputs advanced, final pack pending [OPEN]

**Finding:** F-01 (OQ-4, Task 25). Evidence: *"eine Akzentfarbe ... ganz ganz minimal"* (one accent color, used very minimally) — Taner, 12:22.

**Decision:** Not implemented. Direction advanced (minimalist/premium; black/white/grey baseline; restrained purple accent; Montserrat Regular 400) but final hex values, logo, display name, and legal copy are still pending — client to upload the final Corporate Design package (to Monday).

**PRD changes:** `production_open_questions` (OQ-4): updated with the advanced direction; still phrased as an open question.

**Database:** No schema change.

**Prototype sync:** None.

---

## F-06 — Report Problem timing and path semantics [OPEN]

**Finding:** F-06 (Task 12, Task 13, Task 14). Priority High. Evidence: *"Ich gucke mir das an mit Problemmelden"* (I will review Report Problem) — Taner, 58:15.

**Decision:** Not implemented. Final rules for Cancel Order vs Report Order as Not Performable — and which is allowed at which timing point relative to pickup/delivery — are undecided.

**PRD changes:** `production_open_questions`: new entry — for active tours, when is Cancel Order allowed, when is Not Performable required, and does availability change before/after pickup and before/after delivery? **Main open operational risk for V1.**

**Database:** No schema change.

**Prototype sync:** None. Do not change Report Problem timing rules until decided.

---

## F-07 — Production domain and hosting pending clearance [OPEN]

**Finding:** F-07 (Task 25). Priority Med. Evidence: *"müssen wir entscheiden"* (we still have to decide) — Taner, 21:08.

**Decision:** Not implemented. Production domain undecided; client checking legal/market clearance; likely `.com` domain and Hetzner hosting if approved.

**PRD changes:** `production_open_questions`: new entry — final production domain, legal clearance outcome, and hosting provider/responsibility.

**Database:** No schema change.

**Prototype sync:** None.

---

## F-08 — Service-partner company with multiple drivers [DEFERRED]

**Finding:** F-08 (Task 3). Evidence: *"Version 2 rein"* (put into Version 2) — Till, 42:30.

**Decision:** V1 keeps individual driver profiles; structured company/sub-driver management is deferred to Version 2.

**PRD changes:** `scope_alignment.future_scope`: new entry.

**Database:** No schema change.

**Prototype sync:** None.

---

## Prototype work now pending (docs-only step)

This update changes docs only; the prototype is intentionally not touched. Expected new gaps:

- **F-02:** replace daily-limit card + "request higher limit" with a probation status card that hides after release.
- **F-03:** auto-assign an immutable, never-reused driver ID at creation (remove manual driver-ID entry from the create form).
- **F-04:** enforce same-day per-leg time windows (reject cross-midnight) on the admin order form.
- **F-05:** add separate View/Download actions to Infopoint General Documents and document rows.

The version-pinned audit scripts (`_audit-prototype.mjs`, `_verify-seed.mjs`, `_audit-i18n.js`) still assert v1.8/v1.9 behavior and will not auto-detect these v2.0 gaps; update them alongside the prototype migration.

---

## Related files

- Prior changelog: [`prd-changelog-since-2026-07-02.md`](prd-changelog-since-2026-07-02.md)
- Database: [`../../database/schema.dbml`](../../database/schema.dbml), [`../../database/logical-model.md`](../../database/logical-model.md)
- Prototype audit: [`../../requirements/prd-prototype-validation.md`](../../requirements/prd-prototype-validation.md)
- **Out-of-scope for this step (flagged, not edited):** `docs/product/autheon-context-pack.md` still shows v1.9 and should be refreshed to v2.0 in a follow-up (this prompt forbids editing `docs/product/**`).
- **Repo gap:** source meeting transcript for findings F-01..F-08 is not committed under `meetings/source/`; add it for full traceability.
