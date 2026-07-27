# PRD changelog: 2026-07-26 (v2.6 → v2.8)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`

## Merge resolution

Two parallel feature branches were based on PRD v2.6 and both independently claimed version v2.7. The merged canonical sequence is:

- **v2.7:** Driver PWA Figma-comment adjustments and numeric-input validation fix.
- **v2.8:** Vehicle-domain restructuring from the confirmed “Systemlogik Fahrzeugeingabe” requirements.

No requirement from either branch was discarded. The vehicle-domain change is assigned the higher version because it is the later business-requirement/data-model update and is merged on top of the v2.7 Driver PWA documentation state.

---

## PRD v2.8 — Vehicle-domain restructuring

**Baseline:** PRD v2.7 (Driver PWA Figma-comment adjustments + numeric-input validation)
**Source:** Client confirmation **“Systemlogik Fahrzeugeingabe.pdf”** — vehicle-entry system logic.


> **Client-confirmation date:** not stated in the supplied material, so none is asserted here. `2026-07-26` throughout this entry is the **work-order / implementation** date.
>
> **Document availability:** the PDF itself is **not committed to this repository**. Its confirmed contents were supplied with the work order and are transcribed into `prd.json` → `resolved_defaults.vehicle_domain_v2`. Every requirement below traces to that transcription or to pre-existing repository sources — nothing was invented.

Scope note: the deliverable is an updated **clickable prototype** plus updated **requirements/data-model/design docs**. Backend behaviour remains **simulated** in the prototype and captured here as requirements for the dev team.

This is a **confirmed business-requirement and data-model change**, so it takes a **v2.8** bump: it changes the allowed values of a required job field, renames a persisted field, removes two persisted fields, adds one, and replaces a manual input with a derived system behaviour.

---

### 1. The unified-tag proposal was rejected and is superseded [v2.8]

An earlier internal draft proposed collapsing every vehicle classification into **one undifferentiated multi-select tag collection**:

```
vehicle.tags = ["SUV", "own axle", "registered", "electric"]
```

**That proposal was not implemented.** The client confirmation defines **separate semantic categories with different cardinalities and different business meanings**, and treating them as equivalent arbitrary tags would have destroyed information the platform depends on:

- It cannot express **cardinality**. Vehicle type, transport type and registration status are each *exactly one* value; the characteristics are *independently combinable*. A flat array permits `["own axle", "third-party axle"]` and `["registered", "deregistered"]` — contradictory states the domain must make unrepresentable.
- The **red-licence-plate rule** needs two *identified* inputs. `requiresRedLicencePlates` is a function of registration status **and** transport type specifically. Over an untyped array the rule degrades to substring matching against display strings.
- It **erases the independence** the client explicitly confirmed between registration status and transport type.
- It makes **validation and migration impossible to target** — no way to reject a removed vehicle type, and no way to rename “axle” to “transport type” at the API boundary.

A reusable **chip/segmented-control visual primitive is still reused** for selectable options, so the UI is visually consistent — but the domain keeps explicit categories and category-specific fields, and the payload keeps discrete semantic fields.

### 2. Vehicle type: three approved values

**Before (through v2.7):** the admin form offered five values — `SUV`, `PKW`, `Transporter`, `LKW < 3,5t`, `Oldtimer`. Driver filters offered a different, overlapping set (`SUV`, `PKW`, `Van`, `Light truck <3.5t`).

**Now:** exactly three, single-select, from the confirmation:

| Canonical value       | EN                              | DE (client source)             |
| --------------------- | ------------------------------- | ------------------------------ |
| `passenger_car`       | Passenger car                   | PKW                            |
| `truck_up_to_7_5_t`   | Truck up to and including 7.5 t | LKW bis einschließlich 7,5 t   |
| `truck_over_7_5_t`    | Truck over 7.5 t                | LKW über 7,5 t                 |

**Removed entirely:** SUV, Van / Transporter, Classic car / Oldtimer, and the older `LKW < 3,5t` / `Light truck <3.5t` band (not on the approved list, and its 3.5 t boundary differs from the confirmed 7.5 t one). These values are **not storable**: `jobs.vehicle_type` is the `vehicle_type` enum and the application rejects anything outside the approved set **server-side** on both create and update. No preservation or compatibility layer exists.

### 3. Vehicle data: four separate fields

**Before:** manufacturer and model were free-text inputs whose values were **concatenated into a single `vehicleModel` string**; the licence-plate input was **hidden and the stored plate cleared** when the vehicle was deregistered; VIN showed a soft “fewer than 17 characters” notice and saved anyway.

**Now:**

- **Manufacturer** — selected from the existing manufacturer catalogue through a **dropdown** (`AuthStore.MANUFACTURER_SUGGESTIONS`), stored in its own `manufacturer` field. Required.
- **Model** — its own separate input. Required.
- **Official licence plate** — its own separate input, referring **exclusively to the transported vehicle**. Required while registered, **optional but still fully enterable** once deregistered: a previous or de-stamped plate may be recorded when known. It is **never** disabled, hidden, cleared or replaced by a red-plate field merely because the vehicle is deregistered. *This reverses the 2026-07-14 rule.*
- **VIN** — its own input, validated as **exactly 17 characters**. Existing normalization (uppercase, strip spaces and invalid characters, truncate at 17) runs first; the length rule is then enforced on the authoritative write path. No additional VIN business rules were invented.

### 4. “Axle” renamed to “Transport type”

**Before:** `job.axle`, i18n `axle` / `axleConfiguration`, `orderFieldAxle` (“Axle / transport type”), schema `axle_type` / `required_axle_type` / `notification_preferences.axle_type`, and four different stored spellings (`driven on own wheels`, `third-party axle`, `Eigenachse`, `Fremdachse`).

**Now** one canonical single-select category with two values:

| Canonical value      | EN                | DE            |
| -------------------- | ----------------- | ------------- |
| `own_axle`           | Own axle          | Eigenachse    |
| `third_party_axle`   | Third-party axle  | Fremdachse    |

Renamed consistently across UI labels, translation keys, the store/DTO field, `schema.dbml`, `logical-model.md`, this PRD, the context pack, driver-screen spec, i18n index and tests. Because the mapping is a **known 1:1** over every spelling ever used, the rename migrates completely and reversibly. The old `job.vehicle` / `job.axle` field names are gone — no deprecated aliases are retained.

### 5. Registration status: explicit and independent

**Before:** an optional four-way segmented control mixing two different concepts — *Not specified / Registered / Deregistered / **Red plates*** — where choosing “Red plates” silently wrote `registrationStatus = deregistered` **and** `redPlates = true`.

**Now** a required two-value single-select category — Registered (Zugelassen) / Deregistered (Abgemeldet) — that is **independent of transport type**, never inferred from it, and never merged into a tag array. “Red plates” is no longer an option in this control (or anywhere): it is not a registration status.

The column is `NOT NULL` — every record carries an explicit status. There is no "not specified" state.

### 6. Additional vehicle characteristics

Independent, individually selectable attributes:

| Field             | EN               | DE            |
| ----------------- | ---------------- | ------------- |
| `electricVehicle` | Electric vehicle | E-Fahrzeug    |
| `readyToDrive`    | Ready to drive   | Fahrbereit    |

`readyToDrive` is **new**. It is relevant to third-party-axle transport, so the form shows an applicability note when transport type is *third-party axle*.

**Deliberate UX decision (no existing requirement to the contrary):** the control stays **available and non-destructive** in every context — it is *emphasised*, not hidden, and its stored value is **never auto-cleared** when the transport type or any other control changes. The established repository pattern of hiding a non-applicable field existed only for the licence plate, and that exact behaviour is what this confirmation removes; applying it here would risk the silent data loss the work order forbids. Recorded in `driver-screen-spec.md` and in `prd.json`.

Both characteristics are shown to the service partner in the complete order view.

### 7. Red licence plates: derived, not entered

**Before (incorrect behaviour, now removed):**

- a manual **“Red licence plates”** selection in the vehicle-info control;
- a separate **red-plate number input** (`redPlateNumber`), required whenever the flag was set, with §16 FZV formatting guidance;
- the official licence-plate field **disabled/hidden and its stored value cleared** when “Red licence plates” was selected;
- the red plate’s letters/numbers **recorded** on the job and displayed in the driver’s complete order view.

**Reason for removal:** red licence plates are brought **independently by the executing service partner**. Their specific number is irrelevant to AUTHEON order creation and is not recorded.

**Now** a derived system behaviour with this decision matrix:

| # | Registration status | Transport type     | Outcome                                        |
| - | ------------------- | ------------------ | ---------------------------------------------- |
| 1 | Registered          | Own axle           | Regular transfer on own axle — **not required** |
| 2 | Registered          | Third-party axle   | Regular transfer on third-party axle — **not required** |
| 3 | **Deregistered**    | **Own axle**       | **Red licence plates REQUIRED** — system notice generated automatically |
| 4 | Deregistered        | Third-party axle   | **Not required** (the vehicle is being carried) |

```
requiresRedLicencePlates =
  registrationStatus === DEREGISTERED
  AND transportType    === OWN_AXLE
```

- **One canonical policy.** `requiresRedLicencePlates(registrationStatus, transportType)` in `store.js`, exported on `AuthStore` (production: the backend domain layer). No UI component reproduces the condition.
- **Backend authoritative.** The domain layer computes it, returns it, and rejects any client attempt to write it or a red-plate number. Server-side behaviour never relies on the client; the frontend imports the same shared helper only for immediate form feedback.
- **Derived, not persisted.** Exposed as a read-only `requiresRedLicencePlates: boolean`, recomputed on every sync so it cannot drift. No red-plate column of any kind exists — neither a writable boolean nor a plate number.
- **Canonical German notice** “**Rote Kennzeichen erforderlich**”, served through i18n (`redPlatesRequired`), never hardcoded per screen.

#### The five required notice locations

The notice appears **when and only when** the combination is *Deregistered + Own axle*, in:

1. **Admin Backend** — live in the Create/Edit Job vehicle section and on the job detail.
2. **Marketplace order card**.
3. **Marketplace preview**.
4. **Booking dialog** — clearly highlighted, above the binding slide-to-confirm.
5. **Complete order view after booking** — and also the service partner’s order-details view.

It **remains visible after booking** because it represents an **execution requirement**, not a temporary marketplace message. All five surfaces render the **same single shared component** (`DriverUI.RedPlatesRequiredNotice`) consuming the same policy, so no component can reach a conflicting decision.

### 8. Approved values only — no compatibility layer

The three vehicle types are the complete, exclusive set:

- `jobs.vehicle_type` is the **`vehicle_type` enum**, so a removed value cannot be stored at all.
- The application rejects any non-approved value **server-side** on create *and* update. There is no per-record escape hatch while editing.
- There is no "(legacy)" display template, no neutral fallback icon, and no `isLegacyVehicleType` / `LEGACY_VEHICLE_TYPES` concept anywhere in the domain, UI, filters or preferences.
- `vehicle_registration_status` is `NOT NULL` — no "not specified" state.
- The retired red-plate fields (`red_license_plates`, `red_license_plate_number`) are **dropped outright**; no audit/history column is retained.
- The pre-rename `job.vehicle` / `job.axle` field names are gone; no deprecated read-only aliases remain.

Seed fixtures carry approved values only, and all four red-plate matrix cases remain represented (0847/0839 registered+own, 0846/0842 registered+third-party, 0844/0845 deregistered+own, 0840 deregistered+third-party).

Production-migration blockers this creates are recorded in `docs/database/logical-model.md` → "Migration notes (backend)": existing rows holding a removed vehicle type, or a null registration status, need an explicit client-approved target before the enum cast and the `NOT NULL` constraint can be applied.

### 9. Non-goal restated

**No runtime Admin UI** for adding/removing vehicle classifications is in scope for this phase. Approved values are maintained through the repository’s existing seed/configuration conventions (`store.js` domain constants + `inputFormatters.js` manufacturer catalogue). A management UI remains a future enhancement.

---

### Files changed

**Prototype:** `store.js` (domain constants, normalizers, `requiresRedLicencePlates` policy, `validateVehicleForm`, label resolvers, seed, CSV/order-summary export), `i18n.js` (EN+DE), `admin.jsx`, `driver.jsx`, `driver-ui.jsx` (shared notice component), `AUTHEON Prototype.html` (save-path rejection handling), `styles.css`.

**Docs:** `prd.json` → **v2.8**, this changelog, `autheon-context-pack.md`, `schema.dbml`, `logical-model.md`, `brand-tokens.md`, `design-direction-board-audit.md`, `design-direction-board-remediation.md`, `driver-i18n-index.md`, `driver-screen-spec.md`, `ui-ux-production-plan.md`, `DOMAIN.md`.

**Tests:** `_verify-vehicle-domain.mjs` (new), `tests/e2e/vehicle-domain/*` (new).

### Validation

`node --check` clean for `store.js` / `i18n.js`; `prd.json` parses; i18n EN/DE parity preserved; `_verify-seed.mjs`, `_audit-prototype.mjs`, `_audit-i18n.js` and `_verify-vehicle-domain.mjs` exit 0; Playwright e2e green.

### Open items / blockers

| Item | Status |
| ---- | ------ |
| **Existing rows with a removed vehicle type** | **BLOCKED on client approval.** The prototype now stores approved values only, but any production row holding SUV / Van / Transporter / Oldtimer / Classic / `LKW < 3,5t` needs an explicit approved target before the `vehicle_type` enum cast can run. No destructive migration is written here. |
| **Existing rows with no registration status** | **BLOCKED on client approval.** `vehicle_registration_status` is now `NOT NULL`; a default cannot be guessed because it would fabricate a red-plate decision. |
| **Dropping `red_license_plate_number`** | The column is removed and no value is retained. Take a backup first if production rows hold data. |
| **Client-confirmation date** | Not stated in the supplied material; deliberately not invented. |
| **Registration status now required** | Implemented as required for new/edited records, following “exactly one value” in the confirmation. Flagged for client acknowledgement since it is stricter than the previous optional/nullable field. |
| OQ-19 (cancellation T&C link placeholder), OQ-14 (post-booking driver workflow email) | Unchanged, still open. |

---

## PRD v2.7 — Driver PWA adjustments and numeric-input validation

**Baseline:** PRD v2.6 (2026-07-23, legacy special-case model removed)
**Source:** Figma-comment client feedback + a numeric-input bug report, implemented in **PR #17** (merge `14526e9`, 2026-07-23). The prototype code shipped with that merge; the requirements/design docs were synced on 2026-07-26.

Scope note: the deliverable is an updated **clickable prototype** plus updated **requirements/design docs**. Backend behaviour remains **simulated** in the prototype and captured here as requirements for the dev team.

PR #17 is **UI/UX + input-validation only** — no schema, status-model, i18n-key, or business-rule change — so it takes a **minor v2.7** bump. The three items below were the client's actual questions/bug and are recorded verbatim-in-spirit under `client_feedback_resolved`.

---

### 1. Swipe navigation between in-screen tabs [v2.7]

**Before (v2.6):** the driver **My Jobs** tabs (Active / Performed / Cancelled / Empty run) and **Infopoint** tabs (Documents / News / Help) switched only by tapping the tab pills.

**Now:** each screen renders its tab bodies as a horizontal **paged carousel** (`SwipeViews`, `driver.jsx`). A horizontal drag pages between tabs — the adjacent pane peeks in and snaps to the nearest tab on release; the gesture locks to one axis after ~10px so each pane keeps its own vertical scroll (`touch-action: pan-y`, per-pane `overflow-y`). Transform-only and `prefers-reduced-motion`-safe. Tapping the pills still works and the pills stay in sync. This is in-screen tab paging only — the **bottom navigation still switches on tap**.

- Client request (Figma comment): *"Wäre es technisch umsetzbar durch einen Swipe zwischen den Reitern zu wechseln? … Gleiches gilt auch für den Menüpunkt 'Infopoint'."*
- New CSS: `.swipe-viewport` / `.swipe-track` / `.swipe-pane` / `.swipe-pane-body` (`styles.css`).

### 2. Marketplace header KPI row removed [v2.7]

**Before (v2.6):** the driver Marketplace header carried a restrained KPI chip row — **Available** (published jobs), **Booked** (own assigned/accepted), **Open documents** (tours needing document correction) — added in v2.1 per Design Direction Board §4 ("reduzierter Dashboard-Charakter", remediation R20).

**Now:** the KPI row is **removed** at client request — the same counts already surface as **tab badges under My Jobs**, so the marketplace row only duplicated them.

- Client feedback: *"Diese Infoleiste wird tatsächlich nicht benötigt, da bereits in dem Menüpunkt 'Meine Aufträge' diese Zahlen angezeigt werden."*
- The `.kpi-row` / `.kpi-chip` CSS and the `kpiAvailableJobs` / `kpiBookedJobs` / `kpiOpenDocuments` i18n keys are **left in place but unused** — re-introduce only on explicit client ask.
- DDB marks header KPIs as *may contain*, so their absence stays compliant (audit item 22 → "COVERED → later REMOVED"; remediation R20 superseded by F6).

### 3. Digit-only numeric inputs [v2.7]

**Before (v2.6):** numeric fields accepted free text (letters/symbols allowed).

**Now:** the following inputs strip disallowed characters on input (`inputMode` set to match):

| Field | Location | Rule |
|-------|----------|------|
| Preferred pickup-postal prefix | Driver profile (push prefs) | digits only |
| Filter PLZ (pickup + delivery) | Driver Marketplace filters | digits only |
| Postal code (pickup + delivery) | Admin Create/Edit Job | digits only |
| House number (pickup + delivery) | Admin Create/Edit Job | digits only |
| Distance (km) | Admin Create/Edit Job | digits only |
| Phone + second phone (pickup + delivery) | Admin Create/Edit Job | single leading `+` (country code) then digits |
| Driver offer (EUR) | Admin Create/Edit Job | digits + one decimal separator |
| Alternate contact person (pickup + delivery) | Admin Create/Edit Job | **unchanged — free text** (stores a name) |

- Bug report: *"Only allowing digit input in the pickup zipcode …"* — extended by the client to the admin job-creation numeric fields.
- Decisions confirmed with the client: driver offer keeps decimals (currency), phone keeps a leading `+` (international dialling), and alternate contact person stays free text (it is a name, not a number).

### PRD file changes

- **`prd.json`** → **v2.7**: `version` string prepended with the v2.7 entry (old v2.6 head demoted to a `[v2.6]` tag); **3 new `client_feedback_resolved` entries** (swipe navigation, KPI-bar removal, digit-only inputs) mapping each item to its spec location.
- **Design docs** synced the same day: `driver-screen-spec.md` (Header & KPIs, Screen inventory, Buttons & interactions, CSS companions), `ui-ux-production-plan.md` (§4.4 paged views, §6.1 filters, §7.2/§7.7/§7.8/§7.9, changelog v3.2), `design-system.md` (Components table + Input rule), `design-direction-board-audit.md` (item 22 + F5 addendum), `design-direction-board-remediation.md` (F5/F6/F7 + R20 note).

### Deliberately unchanged

- **No schema / `logical-model.md` / `autheon-context-pack.md` change** — this PR adds no entities, fields, statuses, or business rules; it is presentation + client-side input validation.
- **No i18n key change** — no strings were added or removed. The `kpi*` keys remain (unused) rather than being deleted, so EN/DE parity is unchanged.
- **Alternate contact person** stays a free-text name field despite appearing in the "digits" request list — a deliberate exclusion (confirmed with the client).
- The KPI CSS/i18n are retained (not deleted) so the row can be re-enabled cheaply if the client reverses the decision.

### Validation

`prd.json` parses; `client_feedback_resolved` = 22 entries. Prototype code (`driver.jsx` / `admin.jsx` / `styles.css`) shipped and validated in PR #17 (`14526e9`); this session only synced the requirements/design docs to match.

### Open items (unchanged)

OQ-19 (cancellation T&C link placeholder) and OQ-14 (post-booking driver workflow email) remain open.

---

- Prior changelog: [`prd-changelog-since-2026-07-23.md`](prd-changelog-since-2026-07-23.md)
