# PRD changelog: before 2026-05-20 → today

**Canonical file:** `AUTHEON/prd.json`  
**Baseline (last change before Tuesday 2026-05-20):** git `bd55711` — *PRD v1.5 - Client feedback integrated May 2026*  
**Current committed HEAD:** git `5af4b75` (2026-05-25) — *PRD v1.6 - Feedback.pdf traceability May 2026*  
**Working tree vs staged vs HEAD:** no difference — all PRD edits are committed; nothing pending in the index.

**Diff size (baseline → HEAD):** +608 / −64 lines in `prd.json` (7 commits touching the file).

---

## Git timeline (`AUTHEON/prd.json` only)

| Date | Commit | What changed in the PRD |
|------|--------|-------------------------|
| *before 5/20* | `bd55711` | Baseline v1.5 (29 tasks, no Feedback.pdf traceability block) |
| 2026-05-21 | `70e55c2` | Draft permanent delete rules; validation alignment |
| 2026-05-21 | `c396d24` | Prototype validation notes; business rules (+3); `resolved_defaults` (+5) |
| 2026-05-22 | `4ed6a91` | Direct assign / reassign defaults; sync notes (+3); rules (+2) |
| 2026-05-22 | `9de108a` | Master data CRUD documented in sync notes |
| 2026-05-22 | `2d7a892` | Separate pickup/delivery scheduling in sync notes |
| 2026-05-22 | `c4390f9` | Tour documents / review / `invoice` type; sync notes (+4) |
| 2026-05-25 | `5af4b75` | **v1.6 bump:** version string, 9 new top-level sections, traceability matrix, +12 business rules, +4 `resolved_defaults` |

---

## Phase A — v1.5 label, prototype alignment (2026-05-21 → 2026-05-22)

These commits kept the version string at v1.5 but expanded prototype documentation and defaults to match work already done in the HTML demo.

### New `resolved_defaults` keys (vs baseline)

- `admin_new_job_entry`, `cancel_order_slide_disabled_until_valid`, `cancel_order_slide_min_explanation_chars`
- `direct_assign_and_reassign_v1`, `ordering_party_input_v1`
- `special_case_resolution_actions`, `special_case_resolution_label_guidance`
- (Plus document-rejection UX wording update for correction badge scope.)

### New `prototype_assumptions` keys (vs baseline)

`admin_nav`, `assign_driver_picker`, `cancel_slide`, `document_review_statuses_prototype`, `master_data_crud`, `ordering_party_select`, `payment_status_prototype`, `schedule_multi_day`, `seed_mock_data`, `special_case_continue`, `supplier_invoice_number_prototype`, `tour_billing_workspace`, `tour_invoice_document_type`

### `prototype_validation.sync_pass_notes` added (11 entries, dated 2026-05-21)

- Draft delete; Jobs overview New job CTA; cancel slide min. 10 characters
- Seed contacts on all tours; ordering party select; tour docs after Performed only
- Direct assign / reassign picker; special case Continue restores prior status
- Master data CRUD; multi-day pickup/delivery windows
- Tour documents nav/filters; `invoice` only; review statuses; `paymentStatus` prototype behaviour

### Other v1.5-phase edits

- `prototype_coverage_notes` expanded (driver/admin demo bullets, seed data)
- `product_context.important_notes` +1 (configurable app name; draft delete vs cancel)
- `scope_alignment.v1_in_scope` +3 (draft delete, New job entry, binding assign/reassign)
- `global_business_rules` +6 (draft delete, preview data, reassign, special case admin actions, New job entry)
- `production_open_questions` +1

---

## Phase B — v1.6 / Feedback.pdf integration (commit `5af4b75`, 2026-05-25)

### Version and metadata

- `version`: **v1.5 → v1.6** (*Feedback.pdf traceability May 2026*)
- `prototype_validation.last_synced`: 2026-05-21 → **2026-05-25**
- `prototype_validation.verdict`: aligned v1.5 → **PASS v1.6** (audit script)
- `prototype_validation.prd_spec_reference`: **`AUTHEON/prd.json`** (single file)
- +3 sync notes (v1.6 matrices, consolidation of former `prd_updated_v2.json`)

### Nine new top-level PRD sections

| Section | Purpose |
|---------|---------|
| `client_feedback_traceability` | 15 rows mapping Feedback.pdf § → PRD tasks / status |
| `client_feedback_resolved` | 5 open questions from client (D) with resolutions |
| `client_feedback_source` | Points to Feedback.pdf + `autheon_aw_written_feedback_en.md` |
| `client_status_mapping` | Under review / Completed as display labels, not operational statuses |
| `driver_visibility_matrix` | 10 rows: what drivers see before/after accept |
| `notification_channels_matrix` | 14 rows: email vs in-app vs push per event |
| `marketplace_sync_policy` | Pull-to-refresh vs auto-sync answers (A.1) |
| `derived_from` / `baseline_version` | Lineage from v1.5 internal draft |

### Domain model additions

- `pickupAlternateContactPerson`, `deliveryAlternateContactPerson` on jobs
- `cancellation_fields` block (`cancellationActor`, reason codes, timestamps)
- `document_rejection_reason_examples` (fuel, registration, waiting time)
- Restored operational fields: price/revenue, driver compensation, expenses, assigned partner display

### New `resolved_defaults` (v1.6)

- `admin_notification_feed_v1`, `client_display_status_labels`, `document_review_checked_step`
- `push_notification_toggles_v1`, `push_on_direct_assign` (**false**)

### `global_business_rules` (+12)

Includes: document Under Review on first post-Performed upload; admin/driver notification feeds; cancellation attribution; status history; progressive disclosure for alternate contacts; master data update from order entry; marketplace sync policy; three push toggles; document checked step; Under review / Completed display labels.

### `scope_alignment.v1_in_scope` (+5)

Notification feed, driver in-app notifications, `driver_visibility_matrix`, `marketplace_sync_policy`, `client_status_mapping`.

---

## PRD vs latest client feedback (Feedback.pdf)

Source text: `AUTHEON/autheon_aw_written_feedback_en.md`  
Machine traceability: `client_feedback_traceability` in `prd.json`

| PDF | Topic | PRD status in v1.6 | PRD location |
|-----|--------|-------------------|--------------|
| A.1 | Pull-to-refresh / marketplace sync | gap_closed_in_v1_6 | `marketplace_sync_policy`, Tasks 7, 25 |
| A.2 | Three push toggles | gap_closed_in_v1_6 | Tasks 19–20, `push_notification_toggles_v1` |
| A.3 | External navigation | covered | Tasks 8, 28 |
| A.4 | Tour documents | gap_closed_in_v1_6 | Task 27, document fields |
| B.1.1 | Pickup/delivery schedules | covered | Task 5 |
| B.1.2 | Party / pickup / delivery separation | gap_closed_in_v1_6 | Tasks 4–5, visibility matrix |
| B.1.3 | Input formatting | covered | Task 5 |
| B.1.4 | Distance + override | covered | Tasks 16, 28 |
| B.1.5 | Master data + visibility | gap_closed_in_v1_6 | Task 4, matrix |
| B.2 | Under review / Completed | design_decision | `client_status_mapping` (display, not 9th status) |
| B.2.2 | History + notifications | gap_closed_in_v1_6 | Task 22, channels matrix |
| C.1 | Report Problem | covered | Tasks 12–14 |
| C.2 | Notification channels | gap_closed_in_v1_6 | Task 20, matrix |
| C.3 | Infopoint | gap_closed_in_v1_6 | Task 18 |
| D | Open questions | gap_closed_in_v1_6 | `client_feedback_resolved` (5 items) |

**Resolved open questions (section D) in PRD:**

1. Service partner master data editable by admins → yes (Task 3)  
2. Tablet/iPad → phone-first, best-effort responsive  
3. Audit log language → English keys, localized UI  
4. Program name AUTHEON → configurable display name  
5. Report Problem icon → label + warning icon  

---

## What did *not* change in the PRD task list

- **29 tasks** remain; all still `status: "pending"` (production delivery tracker).  
- Task **titles/IDs** unchanged — v1.6 deepens acceptance via new sections and `resolved_defaults`, not new task IDs.

---

## Related documents

- **Prototype vs PRD:** `AUTHEON/prd-prototype-validation.md` (audit PASS 2026-05-25)  
- **Client walkthrough alignment:** `AUTHEON/client-feedback-comparison.md`  
- **Reproduce diff:** `git diff bd55711..HEAD -- AUTHEON/prd.json`
