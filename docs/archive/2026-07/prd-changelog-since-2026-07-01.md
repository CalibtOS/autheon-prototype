# PRD changelog: 2026-07-01 → 2026-07-02 (v1.8)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`  
**Baseline:** PRD v1.7 (2026-07-01, commit on `feat/add-two-meeting-summary`)  
**This version:** PRD v1.8 (2026-07-02)  
**Sources:** Product decision — admin cancel driver communication; operational app settings (cutoff example: 1 hour before pickup)

---

## Version bump

- `version`: **v1.7 → v1.8** — *v1.7 prototype sync; admin cancel driver message; operational app settings*

---

## Admin cancellation — driver-facing reason

**Decision:** When dispatch cancels a tour that a driver had accepted or was assigned to, the admin must provide a reason code and a message for the driver. The driver sees this on the cancelled tour and in notifications.

**PRD changes:**

- `important_notes`: two new notes
- Task 14 acceptance: strengthened (required driver message, notification body, cutoff policy)
- Task 13 special-case cancel: same rules via Task 14 cross-reference
- `resolved_defaults.admin_cancel_driver_message_v1`
- `notification_channels_matrix` `order_cancelled_by_autheon`: notes updated
- `client_feedback_resolved`: new entry

**Database:** No schema change. Reuses `jobs.cancellation_reason_code`, `cancellation_reason_text`, `cancellation_actor`.

**Prototype sync:** Admin cancel modal; special-case cancel uses same fields; driver cancelled detail shows reason.

---

## Operational policies (app_settings)

**Decision:** Admins manage rules such as minimum hours before pickup when cancel or schedule change is allowed (default example: 1 hour). Stored in `app_settings`, not hard-coded.

**PRD changes:**

- Task 31 (new): Operational Policies epic
- `resolved_defaults.operational_policies_v1`, `cancellation_policies_v1`, `app_settings_catalog_v1`
- `scope_alignment.v1_in_scope`: admin cancellation policies entry

**Database:** No schema change. Uses existing `app_settings` table.

**Canonical keys:**

| Key | Purpose |
|-----|---------|
| `branding.display` | UI display name |
| `operational.policies` | Cutoff hours, reference time, override flag |
| `cancellation.policies` | Required reason, min message lengths |
| `driver.acceptance.defaultDailyJobLimit` | Default for new drivers |

**Prototype sync:** Settings → Operational policies section in admin Features/Settings pane.

---

## v1.7 prototype sync (included in v1.8)

| v1.7 item | Prototype change |
|-----------|------------------|
| Q1 pre-Performed upload | `canDriverUploadTourDocument` allows active statuses |
| Q3 daily limits | `dailyJobLimit` on drivers; `acceptJob` enforcement + overlap prompt + `requestDailyLimitIncrease` (`daily_limit_override`) |
| Q4 admin docs at creation | Attach stub on new/edit draft job form |

---

## Prototype validation

- `prototype_validation.last_synced`: 2026-07-02
- `prototype_validation.verdict`: PASS v1.8 (verified `_audit-prototype.mjs` 2026-07-02)

---

## Related files

- Prior changelog: [`prd-changelog-since-2026-06-25.md`](prd-changelog-since-2026-06-25.md)
- Database: [`../../database/schema.dbml`](../../database/schema.dbml), [`../../database/logical-model.md`](../../database/logical-model.md)
- Prototype audit: [`../../requirements/prd-prototype-validation.md`](../../requirements/prd-prototype-validation.md)
