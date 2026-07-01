# PRD changelog: 2026-06-25 → 2026-07-01 (v1.7)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`  
**Baseline:** PRD v1.6 (prototype sync 2026-05-25, commit `06e0781`)  
**This version:** PRD v1.7 (2026-07-01)  
**Sources:** Meeting 2026-06-25 (Figma walkthrough + scheduling discussion), Meeting 2026-06-29 (prototype review + requirements discovery), Ferhat Q&A session (Q1–Q5)

---

## Version bump

- `version`: **v1.6 → v1.7** — *Meetings 2026-06-25/2026-06-29 integrated; Ferhat Q&A resolved (2026-07-01)*

---

## New meeting sources added

Added to `product_context.source_inputs`:

- `meetings/source/autheon_meeting_2026-06-25_transcript_en.md` — Figma walkthrough and scheduling logic discussion
- `meetings/source/autheon_meeting_2026-06-29_transcript_en.md` — prototype review and requirements discovery

---

## Decisions from Ferhat Q&A (2026-06-29)

### Q1 — Document upload before job completion

**Decision:** Allowed. Tour-linked document upload is available at any operational status (including active tours). The restriction to post-Performed only is removed.

**PRD changes:**
- `important_notes`: added note (already present from user's earlier work)
- Task 11 acceptance: removed "upload blocked on active tours" criterion; replaced with pre-Performed availability
- Task 27 acceptance: added "Upload available at any operational status"
- `resolved_defaults.document_upload_pre_completion_v1`: new key
- `scope_alignment.v1_in_scope`: added item
- `prototype_coverage_notes`: flagged that prototype still restricts to post-Performed (sync pending)

**Database:** No schema change. `job_documents.source` already supports driver/admin uploads at any status — the restriction was only at the application layer.

**Prototype sync needed:** Yes — driver and admin upload UI must be enabled on active tours.

---

### Q2 — Admin car photo / car color

**Decision:** Not required in V1. Free-text notes may capture vehicle appearance if needed. Admins may attach self-created documents (including photos) via the Q4 mechanism if desired.

**PRD changes:**
- `important_notes`: note already present from user's earlier work

**Database:** No change.

---

### Q3 — Driver timeslot blocking / acceptance limits

**Decision (implemented in V1):**
- Each driver has a configurable `daily_job_limit` (integer, default TBD with client), set per driver by admin.
- Hard block on acceptance when the daily limit is reached; driver may submit a limit-increase request.
- When a driver accepts a job on a day where they already have another accepted/assigned job (same-day overlap), Version 1 shows a **confirmation prompt only** — not a hard block.
- Sophisticated overlap detection using time spans, geolocation, or travel time is **out of V1 scope**. Client will define a fuller blocking-settings model in a later version.

**PRD changes:**
- `important_notes`: three notes added (already present from user's earlier work)
- Task 30 (new): "Driver Daily Acceptance Limits" epic
- `resolved_defaults.driver_daily_acceptance_limit_v1`: new key
- `resolved_defaults.driver_fields_v1`: added `dailyJobLimit`
- `scope_alignment.v1_in_scope`: added item
- `scope_alignment.future_scope`: added sophisticated geo/travel-time scheduling

**Database changes:**
- `drivers` table: added `daily_job_limit smallint [not null, default: 3]` — default TBD with client
- `master_data_change_type` enum: added `daily_limit_override` value (driver limit-increase requests reuse the existing change-request queue pattern)

---

### Q4 — Admin documents at job creation / replacing generated document

**Decision:** Yes. Admin may attach additional self-created documents during job creation or editing, including images. These are stored as `job_documents` with `source = admin_off_channel`. Admin may also replace or supplement the auto-generated transport-order document.

**PRD changes:**
- `important_notes`: note already present from user's earlier work
- Task 5 acceptance: added admin document attachment criterion
- Task 27 acceptance: existing acceptance covers it via `admin_off_channel` source
- `resolved_defaults.admin_documents_at_creation_v1`: new key
- `scope_alignment.v1_in_scope`: added item

**Database:** No schema change. `job_documents.source` already has `admin_off_channel`; `generated_job_documents` already tracks the generated PDF separately.

---

### Q5 — Lat/long coordinates for addresses

**Decision:** Not in V1. Kept in mind for future versions.

**PRD changes:**
- `important_notes`: note already present from user's earlier work
- `scope_alignment.future_scope`: added "Geocoding and lat/long coordinate capture for address precision"

**Database:** No change. `locations` table has no lat/long columns — not needed.

---

## Prototype validation status

The prototype matched PRD v1.6 as of 2026-05-25 (PASS). PRD v1.7 introduces **three breaking changes** not yet reflected in the prototype:

| Change | Prototype sync needed |
|---|---|
| Pre-Performed document upload (Q1) | Yes — enable upload on active tours |
| Admin documents at job creation (Q4) | Yes — add document attach to new job form |
| Driver daily acceptance limits (Q3) | Yes — acceptance limit check + same-day prompt |

The `prototype_validation.verdict` has been updated to note this mismatch.

---

## New `resolved_defaults` keys (v1.7)

| Key | Summary |
|---|---|
| `driver_daily_acceptance_limit_v1` | Daily limit field, hard block, limit-increase request, same-day prompt |
| `document_upload_pre_completion_v1` | Upload at any status, not post-Performed only |
| `admin_documents_at_creation_v1` | Admin attaches docs at creation/edit, incl. images |

---

## New task

| ID | Epic | Priority | Status |
|---|---|---|---|
| 30 | Driver Daily Acceptance Limits | 9 | pending |

---

## Related files

- Meeting transcripts: `meetings/source/autheon_meeting_2026-06-25_transcript_en.md`, `meetings/source/autheon_meeting_2026-06-29_transcript_en.md`
- Database schema: `docs/database/schema.dbml` (drivers + enum updated)
- Prototype coverage: `docs/requirements/prd-prototype-validation.md` (not yet re-run for v1.7)
