# PRD changelog: 2026-07-26 (v2.6 → v2.7)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`
**Baseline:** PRD v2.6 (2026-07-23, legacy special-case model removed)
**Source:** Figma-comment client feedback + a numeric-input bug report, implemented in **PR #17** (merge `14526e9`, 2026-07-23); plus work order 2026-07-26 — remove the **Weekend** marketplace quick-filter preset and add a **tour booked successfully** confirmation sheet after binding acceptance.

> **Note:** this is the standalone v2.7 entry. [`prd-changelog-since-2026-07-27.md`](prd-changelog-since-2026-07-27.md) carries the merged v2.7 → v2.8 sequence (this entry plus the vehicle-domain restructuring) after two branches independently claimed v2.7.

Scope note: the deliverable is an updated **clickable prototype** plus updated **requirements/design docs**. Backend behaviour remains **simulated** in the prototype and captured here as requirements for the dev team.

PR #17 is **UI/UX + input-validation only** — no schema, status-model, i18n-key, or business-rule change — so it takes a **minor v2.7** bump. The three items below were the client's actual questions/bug and are recorded verbatim-in-spirit under `client_feedback_resolved`. The 2026-07-26 filter/success-sheet work is also UI + i18n only.

---

## 1. Swipe navigation between in-screen tabs [v2.7]

**Before (v2.6):** the driver **My Jobs** tabs (Active / Performed / Cancelled / Empty run) and **Infopoint** tabs (Documents / News / Help) switched only by tapping the tab pills.

**Now:** each screen renders its tab bodies as a horizontal **paged carousel** (`SwipeViews`, `driver.jsx`). A horizontal drag pages between tabs — the adjacent pane peeks in and snaps to the nearest tab on release; the gesture locks to one axis after ~10px so each pane keeps its own vertical scroll (`touch-action: pan-y`, per-pane `overflow-y`). Transform-only and `prefers-reduced-motion`-safe. Tapping the pills still works and the pills stay in sync. This is in-screen tab paging only — the **bottom navigation still switches on tap**.

- Client request (Figma comment): *"Wäre es technisch umsetzbar durch einen Swipe zwischen den Reitern zu wechseln? … Gleiches gilt auch für den Menüpunkt 'Infopoint'."*
- New CSS: `.swipe-viewport` / `.swipe-track` / `.swipe-pane` / `.swipe-pane-body` (`styles.css`).

## 2. Marketplace header KPI row removed [v2.7]

**Before (v2.6):** the driver Marketplace header carried a restrained KPI chip row — **Available** (published jobs), **Booked** (own assigned/accepted), **Open documents** (tours needing document correction) — added in v2.1 per Design Direction Board §4 ("reduzierter Dashboard-Charakter", remediation R20).

**Now:** the KPI row is **removed** at client request — the same counts already surface as **tab badges under My Jobs**, so the marketplace row only duplicated them.

- Client feedback: *"Diese Infoleiste wird tatsächlich nicht benötigt, da bereits in dem Menüpunkt 'Meine Aufträge' diese Zahlen angezeigt werden."*
- The `.kpi-row` / `.kpi-chip` CSS and the `kpiAvailableJobs` / `kpiBookedJobs` / `kpiOpenDocuments` i18n keys are **left in place but unused** — re-introduce only on explicit client ask.
- DDB marks header KPIs as *may contain*, so their absence stays compliant (audit item 22 → "COVERED → later REMOVED"; remediation R20 superseded by F6).

## 3. Digit-only numeric inputs [v2.7]

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

## 4. Weekend marketplace quick-filter removed [v2.7]

**Before (v2.6):** the driver marketplace `FilterSheet` offered three date quick-filter preset chips — **Today**, **This week**, **Weekend** — above the native `type="date"` from/until range inputs. The **Weekend** chip filtered the marketplace list to jobs whose display date fell on a Saturday or Sunday.

**Now:** the **Weekend** preset is gone. The FilterSheet offers **Today** and **This week** presets only, alongside the unchanged native date-range (from/until) inputs. Client direction 2026-07-26: the weekend preset is not needed.

- **No schema change.** The prototype's weekend behaviour was a client-side predicate only (`jobMatchesDriverFilters` matched `Sat`/`Sun` in `dateLong`). Job `dateLong` seed values are retained — they are calendar dates, not a weekend flag.
- **Prototype:** `driver.jsx` — removed `"Weekend"` from `FILTER_DATE_PRESETS`, the FilterSheet chip, the weekend predicate, and the active-filter chip branch; **i18n** — removed the orphaned `weekend` key (EN + DE).

## 5. Tour booked success confirmation [v2.7]

**Before (v2.6):** after binding tour acceptance, the driver landed directly on the unlocked tour with no dedicated confirmation step.

**Now:** a **`TourBookedSuccessSheet`** modal (green check, title, short body, OK) appears after successful booking — mirroring the existing "Tour performed successfully" pattern. Wired in both the PWA shell (`pwa-app.jsx`) and the desktop prototype shell (`AUTHEON Prototype.html`). New i18n keys: `tourBookedSuccessTitle`, `tourBookedSuccessBody` (EN + DE).

## PRD file changes

- **`prd.json`** → **v2.7**: `version` string prepended with the v2.7 entries (old v2.6 head demoted to a `[v2.6]` tag); **3 new `client_feedback_resolved` entries** (swipe navigation, KPI-bar removal, digit-only inputs) mapping each item to its spec location; weekend-filter removal and tour-booked success sheet noted in the version string.
- **Design docs** synced: `driver-screen-spec.md` (Header & KPIs, Screen inventory, Buttons & interactions, CSS companions), `ui-ux-production-plan.md` (§4.4 paged views, §6.1 filters — preset chips now Today / This week only, §7.2/§7.7/§7.8/§7.9, changelog v3.2), `design-system.md` (Components table + Input rule), `design-direction-board-audit.md` (item 22 + F5 addendum), `design-direction-board-remediation.md` (F5/F6/F7 + R20 note), `driver-i18n-index.md` (`weekend` removed; `tourBookedSuccess*` added).

## Deliberately unchanged

- **No schema / `logical-model.md` / `autheon-context-pack.md` change** for PR #17 or the filter/success-sheet work — presentation + client-side input validation / i18n only.
- The `kpi*` keys remain (unused) rather than being deleted, so EN/DE parity is unchanged.
- **Alternate contact person** stays a free-text name field despite appearing in the "digits" request list — a deliberate exclusion (confirmed with the client).
- Job `dateLong` seed values that happen to fall on Sat/Sun — legitimate calendar dates, not a weekend flag.
- Meeting-transcript source files under `meetings/source/` — immutable historical records; their wording is left as-is.

## Validation

`prd.json` parses; `client_feedback_resolved` = 22 entries. Prototype code shipped and validated in PR #17 (`14526e9`); weekend filter and tour-booked success sheet validated in prototype (`driver.jsx`, `pwa-app.jsx`, `i18n.js`). i18n EN/DE parity preserved; no remaining `weekend` references in `driver.jsx` or `i18n.js`.

## Open items (unchanged)

OQ-19 (cancellation T&C link placeholder) and OQ-14 (post-booking driver workflow email) remain open.

---

- Prior changelog: [`prd-changelog-since-2026-07-23.md`](prd-changelog-since-2026-07-23.md)
