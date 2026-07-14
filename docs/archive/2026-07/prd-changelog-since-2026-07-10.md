# PRD changelog: 2026-07-10 → 2026-07-14 (v2.1)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`
**Baseline:** PRD v2.0 (2026-07-10)
**This version:** PRD v2.1 (2026-07-14) — both same-day changes below ship under the one v2.1 version string
**Source:** Design Direction Board — AUTHEON GmbH, July 2026 (`Design Direction Board.pdf`, §5 "Cards, Listen und Auftragsdarstellung") + direct client direction 2026-07-14 (vehicle-info capture in job creation, conditional plate rules).

Delta summary since v2.0: **1 NEW field group · 1 CHANGED validation rule · 1 RESOLVED open question**.

---

## V-01 — Important vehicle info on jobs [NEW]

The 2026-06-29 open question "is zugelassen / nicht zugelassen a required V1 field?" is **resolved**: the Design Direction Board lists *Wichtige Info (Zugelassen / Abgemeldet / E-Fahrzeug / Rote Kennzeichen)* as marketplace-card content, and the client confirmed capture in the admin job form.

New optional job fields (see `resolved_defaults.vehicle_important_info_v1`, `schema.dbml` `jobs`):

| Field | Type | Semantics |
|-------|------|-----------|
| `vehicle_registration_status` | enum `registered` \| `deregistered`, nullable | null = not specified |
| `electric_vehicle` | boolean, default false | announcement tag |
| `red_license_plates` | boolean, default false | announcement tag |
| `red_license_plate_number` | varchar(32) | required only when `red_license_plates` is set |

Rendered as text-labelled tags on driver marketplace/My-Jobs cards and in the vehicle detail (driver + admin). No marketplace filter dimension in V1; never required for Save Draft / Publish / Direct Assign (except the conditional rules below).

## V-02 — Conditional license-plate capture in job creation [CHANGED]

- Registration **registered** (or unspecified): regular license plate stays a **required** field (unchanged behavior).
- Registration **deregistered**: the license-plate input is **hidden** and the stored plate cleared — a deregistered vehicle carries no valid plate.
- **Red plates** flag set: a separate **red plate number** input appears and is required.

**Domain background (German law, § 16 FZV — rote Kennzeichen):** red transfer plates are issued to dealers/workshops, with a recognition number starting **06** (05 = inspection bodies, 07 = classic cars), e.g. `K-06 1234`. The plate is assigned to the **operator, not the vehicle** — which is why AUTHEON captures it per tour on the job record rather than in a vehicle master table. Typical AUTHEON case: transferring a deregistered vehicle on its own wheels under the operator's dealer plate.

## Version bump

- `version`: **v2.0 → v2.1** — *important vehicle info metadata (registration status, electric vehicle, red license plates) added as optional job fields per Design Direction Board 07/2026 (2026-07-14)*

## Related files

- `docs/database/schema.dbml` — `vehicle_registration_status` enum, `jobs.electric_vehicle`, `jobs.red_license_plates`, `jobs.red_license_plate_number`, conditional-plate comments
- `docs/database/logical-model.md` — "Important vehicle info" section
- `docs/design/design-direction-board-audit.md` / `design-direction-board-remediation.md` — design-side traceability
- `prototype/project/store.js`, `admin.jsx`, `driver.jsx` — prototype implementation of the same rules
