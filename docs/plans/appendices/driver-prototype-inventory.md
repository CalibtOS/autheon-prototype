# Appendix: Driver prototype inventory (signed-off)

**Source agents:** [Prototype driver screen inventory](d6abf789-b200-4682-bd86-889062b5a368)  
**Authority:** `driver.jsx`, `driver-ui.jsx`, `store.js`, `i18n.js`, `Autheon/docs/design/driver-screen-spec.md`  
**Note:** Where `driver-screen-spec.md` conflicts with prototype on Report Problem (old “7 codes / min 10”), **prototype wins**.

## Shell tabs → production routes

| Proto tab | Route | Component |
|-----------|-------|-----------|
| `portal` | `/marketplace` | `Portal` |
| `mine` | `/jobs` | `MyJobs` |
| `info` | `/infopoint` | `Infopoint` |
| `profile` | `/profile` | `ProfilePaneFull` |

## Screen checklist (Figma-mode)

| Screen / sheet | Must-match | Epic |
|----------------|------------|------|
| Auth (login / forgot / set-password) | No enumeration; OTP TTL rules | F-5 |
| Marketplace `Portal` | Published only; filter/sort chrome; card anatomy; no tour# on card | E-1 |
| `FilterSheet` | PLZ multi, dates, vehicle, transport; badge count rules | E-1 |
| `JobLocked` | City+PLZ only; no plate/VIN/street/contacts; Accept CTA | E-2 |
| `AcceptanceModal` | Slide-to-confirm + legal | E-3 |
| `JobUnlocked` | Full stops; plate/VIN; docs tab; CTAs by status | E-2 |
| `MyJobs` 4 swipe tabs | active / performed / cancelled / empty-run review | D-2 |
| **`ReportProblemSheet`** | Codes below; **MIN 30** chars; evidence empty-run only ≤5 | **A + D-1** |
| `MarkPerformedSheet` | confirm → success upload guidance | E-3 |
| Upload stack | Category → Source sheet (camera never first) | D-4 |
| Notifications | 5-value ride preview; deep links; kinds | F-3 |
| Profile + subpages | MDR, email change, prefs, appearance | F-1, F-2 |
| Infopoint | docs / news / help; news = full page | F-4 |

## Report Problem — binding codes (Wave 0)

**Paths:** `cancel` | `not_performable` (empty run)

### Cancel
`appointment_not_kept` · `booked_accidentally` · `org_not_possible` · `other`

### Empty run
`not_operational` · `not_roadworthy` · `not_present` · `not_released` · `key_docs_missing` · `other`

**Defaults:** cancel → `appointment_not_kept`; empty-run → `not_operational`  
**Validation:** explanation `trim().length >= 30`  
**Evidence:** empty-run only, optional, max 5; cancel has **no** evidence  
**Do not implement:** orphaned i18n `problemReason*` keys; spec’s obsolete 7-code list

## Locked vs unlocked

`driverJobViewMode`: **locked** iff `published` and driver not committed; else **unlocked**. Same authority for notification targets.

## Marketplace filters (keys)

`startPlz[]`, `endPlz[]`, `from`, `to`, `vehicleType`, `transportType`  
Vehicle: `All` + `passenger_car` | `truck_up_to_7_5_t` | `truck_over_7_5_t`  
Transport: `All` + `own_axle` | `third_party_axle`

## IA / visual must-match (summary)

- Shared `DriverScreenHeader` on all four tabs; no Marketplace greeting/avatar  
- Bottom nav: contrast active — **no purple capsule**  
- Red-plate: derived only (`deregistered && own_axle`); single notice component  
- Slide-to-confirm for binding actions  
- Upload never opens camera until “Take photo”  
- Notification ride preview = five values only  

**Expanded chrome AC → Epic L:** [`epic-l-driver-pwa-shell-ui-ac.md`](./epic-l-driver-pwa-shell-ui-ac.md) (Wave 0.5).  
**Exact clone registry:** [`exact-screen-clone-gate.md`](./exact-screen-clone-gate.md) (D01–D23).

## DO NOT SHIP / prototype-only

In-memory store; OTP shown in UI; sample PDF everywhere; terms placeholder; deferred password change; `reloadDemo`; KPI row; browser history Back experiments; daily-limit MDR; storing red-plate numbers; legacy vehicle types.

## FE hard break

`apps/web/.../ReportProblemSheet.tsx` still uses old codes → **Epic A** before any driver fidelity work.
