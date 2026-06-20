# PRD client-source validation report

**Date:** 2026-05-25  
**PRD:** [`prd.json`](prd.json) (v1.6)
**Baseline for “since last Tuesday”:** git `bd55711` (last PRD touch before 2026-05-20)  
**Current PRD:** git `5af4b75` + working tree (identical)  
**Client sources:**

| Source | Path | Role |
|--------|------|------|
| Written feedback (Feedback.pdf) | [`../../meetings/source/autheon_aw_written_feedback_en.md`](../../meetings/source/autheon_aw_written_feedback_en.md) | Sections A–D |
| Meeting (2026-05-18) | [`../../meetings/source/autheon_aw_meeting_transcript_en_with_index.md`](../../meetings/source/autheon_aw_meeting_transcript_en_with_index.md) | REQ 001–023, scope de-scoping |
| Original scope / wireframes | Listed in `product_context.source_inputs` | Pre-feedback baseline |

**Prototype check:** `_audit-prototype.mjs` — **PASS** (exit 0)

---

## Overall verdict

| Layer | Result |
|-------|--------|
| **Written feedback (A–D) → PRD** | **PASS** — all 15 `client_feedback_traceability` rows mapped; 5 section-D questions in `client_feedback_resolved` |
| **Meeting (REQ 001–023) → PRD** | **PASS** — all 23 meeting requirements present in PRD text (keywords + scope sections) |
| **PRD changes since 2026-05-20 → client sources** | **PASS** — Phase A/B changes trace to meeting and/or written feedback (see below) |
| **PRD → prototype** | **PASS** — automated audit + `prd-prototype-validation.md` |
| **Documentation hygiene** | **PASS** — canonical paths updated during repository consolidation |

**Conclusion:** The current PRD is **substantively grounded** in the client’s written feedback and the 2026-05-18 meeting. Changes since last Tuesday are **documenting and formalizing** work the client already asked for—not introducing unrelated scope.

---

## 1. Written feedback (Feedback.pdf) — full traceability

From `client_feedback_traceability` in `prd.json`:

| § | Status in PRD | Validated against written feedback |
|---|---------------|-----------------------------------|
| A.1 Pull-to-refresh / sync | gap_closed_in_v1_6 | § A.1 — marketplace refresh questions |
| A.2 Push (3 toggles) | gap_closed_in_v1_6 | § A.2 — driver-controlled push |
| A.3 External navigation | covered | § A.3 — pickup/delivery map handoff |
| A.4 Tour documents | gap_closed_in_v1_6 | § A.4 — types, review, rejection |
| B.1.1 Schedules | covered | § B.1.1 — separate dates/windows |
| B.1.2 Party / pickup / delivery | gap_closed_in_v1_6 | § B.1.2 — separation + contacts |
| B.1.3 Input formatting | covered | § B.1.3 — date/time/VIN/plate |
| B.1.4 Distance | covered | § B.1.4 — estimate + override |
| B.1.5 Master data + visibility | gap_closed_in_v1_6 | § B.1.5 + visibility table |
| B.2 Status model | design_decision | § B.2 — Under review / Completed → display mapping, not 9th ops status |
| B.2.2 History + notifications | gap_closed_in_v1_6 | § B.2.2 — triggers |
| C.1 Report Problem | covered | § C.1 — cancel + not performable |
| C.2 Notification channels | gap_closed_in_v1_6 | § C.2 — backend/frontend/push |
| C.3 Infopoint | gap_closed_in_v1_6 | § C.3 — rename, tabs, badge |
| D Open questions | gap_closed_in_v1_6 | § D — all 5 in `client_feedback_resolved` |

**Section D resolutions (written feedback lines 780–784):**

| Client question | PRD resolution |
|-----------------|----------------|
| Service partner master data editable? | Yes — Task 3, `client_feedback_resolved` |
| iPad / tablet? | Phone-first, best-effort — Task 25 |
| Audit log language? | English keys, localized UI |
| Program name AUTHEON? | Configurable display name |
| Report Problem icon? | Label + warning icon |

---

## 2. Meeting (2026-05-18) — REQ 001–023

| REQ | Meeting topic | PRD evidence |
|-----|---------------|--------------|
| 001–003 | Order model / ordering party | `important_notes`, Tasks 4–5, `driver_visibility_matrix`, domain fields |
| 004–006 | Address master, optional save, country | Task 4, `scope_alignment`, `pickupCountry`, save-to-master in prototype notes |
| 007 | External navigation | Task 8, 28, `global_business_rules` |
| 008 | Marketplace + pull refresh | `marketplace_sync_policy`, Task 7 |
| 009–010 | Driver push, admin email | `notification_channels_matrix`, Tasks 19–20 |
| 011–012 | Documents + review | Task 27, rejection examples, correction flow |
| 013 | Partner invoices | Task 27 / optional scope, tour documents |
| 014 | No finance dashboard | `scope_alignment.future_scope`, `important_notes` |
| 015 | Ops vs document status | `client_status_mapping` |
| 016 | Special cases | Tasks 12–14, Report Problem |
| 017 | Infopoint | Task 18 |
| 018 | Service partner lifecycle | Task 3, blocked/archive |
| 019 | Auth | `v1_optional_or_needs_decision`, Task 2 — **open for production** |
| 020 | Vehicle condition | `future_scope` |
| 021 | No Excel migration | Rollout from zero, `important_notes` |
| 022 | No CSV import | `future_scope` |
| 023 | A→B tours only | `scope_alignment.v1_in_scope` |

**Meeting “Must have” list (§7)** — all reflected in `scope_alignment.v1_in_scope` or tasks.

**Meeting open questions (§6)** — PRD handling:

| Meeting open question | PRD location |
|----------------------|--------------|
| Map / distance API vendor | `production_open_questions` |
| Admin alert recipients | `v1_optional_or_needs_decision` |
| Auth method | `v1_optional_or_needs_decision` + Task 2 |
| Document rejection / correction | `global_business_rules`, `correction_required` |
| Final app name | `production_open_questions`, `client_feedback_resolved` |
| Documents in V1 vs V2? | `v1_optional_or_needs_decision` (tour documents) |
| Service partner extra fields | Risks / Task 3 (flexible) |

---

## 3. PRD changes since 2026-05-20 — source mapping

### Phase A (2026-05-21 → 2026-05-22, still v1.5 label)

Documented in `prd-changelog-since-2026-05-20.md`. Each cluster traces to client input:

| PRD change (Phase A) | Written feedback | Meeting |
|----------------------|-------------------|---------|
| Draft permanent delete | B.2 Draft — admin may delete | — |
| New job on Jobs overview (no sidebar duplicate) | B.1 order creation UX | 3.1 Order creation |
| Cancel slide min. 10 characters | C.1 cancellation explanation | 3.12 Cancellation |
| Ordering party select (not free text only) | B.1.2a ordering party | 3.2, REQ 003 |
| Pickup/delivery master data + CRUD | B.1.5, B.1.2b/c | 3.3–3.4, REQ 004–005 |
| Separate pickup/delivery schedules | B.1.1 | 3.1, REQ 002 |
| Direct assign / reassign picker | Implied assigned vs published | 3.11 / binding acceptance |
| Tour documents, `invoice` type, review statuses | A.4, B.2 Performed/Under review | 3.8, REQ 011–012 |
| Special case Continue restores prior status | C.1 not performable | 3.12, REQ 016 |
| Finance dashboard removed from demo scope | — | 3.13, REQ 014 |
| Return flow removed → Report Problem | C.1 | 3.12, §4 “Replace return logic” |

### Phase B (2026-05-25, v1.6)

| PRD change (Phase B) | Written feedback | Meeting |
|----------------------|-------------------|---------|
| `client_feedback_traceability` (15 rows) | A–D structure | Cross-check §4 Direct PRD Changes |
| `driver_visibility_matrix` | B.1.5 visibility table | 3.2, REQ 001 |
| `notification_channels_matrix` | C.2 | 3.7, REQ 009–010 |
| `marketplace_sync_policy` | A.1 | REQ 008 |
| `client_status_mapping` | B.2 Under review / Completed | 3.11, REQ 015 |
| Alternate contact fields | B.1.2 optional contacts | 3.1 contacts |
| `cancellationActor` | C.1 cancellation reason | 3.12 |
| Three push toggles, no push on direct assign | A.2 | REQ 009 |
| Admin notification feed + driver inbox | C.2 | 3.7 |
| Under Review on first post-Performed upload | B.2 Under review | 3.8 documents |

**Nothing in Phase A/B introduces** finance dashboard, Excel migration, CSV import, vehicle condition module, or complex tour chains — those stay **out of scope** per meeting §7 and written feedback tone.

---

## 4. What is in the PRD but NOT from May 2026 client feedback

Expected and valid — original project inputs:

- Wireframes, Scope PWA, transport-order PDF template, vehicle CSV glossary (`source_inputs` items 1–4)
- 29 implementation **tasks** (delivery tracker; unchanged IDs since baseline)
- Technical/production concerns (DSGVO, map API budget, PDF legal review) in `production_open_questions` / `risks`
- Prototype/demo assumptions (`prototype_assumptions`, `prototype_coverage_notes`)

These do **not** conflict with client feedback; they describe **how** to build what the client asked for.

---

## 5. Gaps and recommendations

| # | Gap | Severity | Action |
|---|-----|----------|--------|
| 1 | Historical repository paths existed before consolidation. | Resolved | Paths were updated during repository consolidation. |
| 2 | Meeting transcript not listed in `client_feedback_source` | Low | Add `meeting_reference` path |
| 3 | `product_context.source_inputs` still says generic “Internal PRD update report” without file path | Low | Point to `meetings/autheon_aw_meeting_transcript_en_with_index.md` |
| 4 | Meeting §6 “document V1 vs V2” pricing | Info | Already in `v1_optional_or_needs_decision` — confirm with client on contract |
| 5 | REQ 019 auth method | Open | Remains intentional open question for production |
| 6 | Admin Infopoint news publish UI | **Closed** — `InfopointPane`, publish form, audit checks #17–18 |

---

## 6. Related artifacts

- `../archive/2026-05/prd-changelog-since-2026-05-20.md` — git-level PRD diff
- `../research/client-feedback-comparison.md` — PRD + prototype vs feedback
- `prd-prototype-validation.md` — prototype checklist

---

## Sign-off summary (for client/internal)

> **The PRD v1.6 at `prd.json` reflects the client’s written Feedback.pdf (sections A–D) and the 2026-05-18 meeting conclusions. All PRD edits since 2026-05-20 document client-driven prototype alignment (Phase A) and formal traceability matrices (Phase B). Remaining open items are production decisions (auth, map API, final app name), not missing client requirements.**
