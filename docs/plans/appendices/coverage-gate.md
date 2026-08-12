# Coverage gate — how we prove the plan covers everything

**Purpose:** Completeness is proven by measurable axes — not by “epics feel big enough.”  
**Audits (2026-08-11):** [Proto](434dcda6-9b36-43ea-bd0f-462d4459232e) · [PRD](a3f21df8-9a03-445b-a6bc-13eedc6d9174) · [BE](de1842d5-6995-4dcf-a869-2f10ab620eaf)  
**Adversarial review:** [Doubt](0e58604b-1721-49ca-adce-2f1f9f490389) → three axes alone are **INSUFFICIENT**; this doc includes the required fixes.

---

## 1. Method (six axes)

| Axis | Question | Plan-complete rule | Program-Done rule |
|------|----------|--------------------|-------------------|
| **P** Prototype surface | Every nav/screen/sheet/modal has a task or DEFERRED | 0 ORPHAN | Same + PARTIAL surfaces expanded or deferred with impact |
| **R** PRD task | Every T1–T34 has an epic; OQs dispositioned | 0 MISSING; every open Q = Resolved \| Deferred+impact | 0 PARTIAL on shipped waves; OQs not silently coded |
| **B** BE API | Every product API group WIRED / PLANNED / inventoried | No unexplained ORPHAN-BE | Shared enums synced; no FE inventing dead APIs |
| **M** Matrices / policy | Visibility, sync, notif channels, status labels attached as AC | Matrices linked on E/D/F/I | Matrix rows tested or waived |
| **J** Journeys | Critical paths (§6 of master plan + Storno round-trip) have binary AC | Journey list exists | Each journey e2e green |
| **X** Cross-cut NFR | EN/DE for touched strings; authz negatives; PWA/a11y smoke; seed contract | Template in expand-before-build | Smoke signed on release |
| **V** Exact screen clone | Every product screen is a side-by-side clone of prototype (layout+IA+chrome) | Registry exists ([exact-screen-clone-gate.md](./exact-screen-clone-gate.md)) | Every Dxx/Axx row PASS (K-1/K-2) |

### Operating rules
1. **Triple lock** on every implementation task (prototype · PRD · BE).  
2. **Exact clone:** FE must match signed-off prototype screens — see Axis V. No redesign “improvements.” Allowed deltas only: real auth/API, no toys, safe-area.  
3. **Expand-before-build:** no fidelity coding without binary AC appendix (A/L pattern). Template must include: happy path, empty/error, matrix refs, authz negative, EN/DE keys, **registry IDs (Dxx/Axx)**.  
4. **PARTIAL ban at Done:** PARTIAL is OK during planning; **program Done forbids PARTIAL** on in-scope shipped epics.  
5. **OQ disposition:** parking a card is not enough. Each open question = `Resolved` (answer recorded) **or** `Deferred` with **named wave/AC impact**.  
6. **Proto ↔ PRD conflict column:** every contested surface = `ship` | `gate (feature)` | `defer` | `non-goal`.  
7. **Epic J:** no BE invention for FE leftovers; BE only if prototype/PRD lack/wrong API.  
8. **Re-audit:** re-run P/R/B + Axis V registry before program Done.

### What “plan covers everything” means
- [x] Axis P: 0 ORPHAN (toys excluded; mock notch DEFERRED)  
- [x] Axis R: 0 MISSING; all open OQs dispositioned (not merely listed) — [`oq-disposition.md`](./oq-disposition.md)  
- [x] Axis B: inventory complete; A-0 owns enum drift  
- [x] Axes M + J: checklists exist — [`matrices-and-journeys.md`](./matrices-and-journeys.md)  
- [x] Axis V: screen registries in exact-screen-clone-gate.md; K-1/K-2 sign-off path clear  
- [x] AC-expansion backlog ordered; **all epic AC appendices written**  
- [x] Over-scope tasks flagged (E-5, AccountAccess stub, etc.)

**Planning Complete: YES (v2.0).** Execution / clone PASS / ClickUp import remain.

---

## 2. Baseline scorecard (before hole-fill)

| Axis | Baseline | After hole-fill (this revision) |
|------|----------|----------------------------------|
| P | ~8 ORPHAN | Tasks P-1…P-8 + DEFER notch → **0 ORPHAN target** |
| R | T23 MISSING; 21 OQs unlisted | Epic N + full OQ list → **0 MISSING** |
| B | orgs unused OK | Inventory in BE audit — keep |
| M | “attach on ClickUp” only | §4 matrix ownership below |
| J | Critical path list exists | Treat as Axis J; expand AC per path |
| X | Implicit | Expand-before-build template |

---

## 3. Axis P — orphan close-out

| ID | Surface | Proto | Plan task | AC (binary) |
|----|---------|-------|-----------|-------------|
| P-1 | Same-day overlap | `SameDayOverlapSheet` | **E-6** | Shown when accept conflicts same calendar day; confirm/cancel; PRD T9/T30 |
| P-2 | Remove tour doc | `RemoveDocModal` | **B-10** | Confirm remove; BE delete/replace; EN/DE |
| P-3 | Duplicate VIN | AdminApp dialog | **G-9** | Matches proto VIN uniqueness rules |
| P-4 | Schedule override / revert-draft | AdminApp ConfirmSheet | **G-10** | Note required; blocks illegal transition |
| P-5 | Admin auth | `AdminLoginScreen`, `AdminSetPasswordScreen` | **F-6** | Admin auth chrome 1:1; Keycloak-backed |
| P-6 | Probation limit (driver) | `ProbationLimitSheet` | **E-7** | Block accept UX; ties H-5 |
| P-7 | Assign / reassign | `AssignDriverDialog` | **G-7** | Assign/reassign flows + audit |
| P-8 | Internal notes | `InternalNotesPanel` | **G-8** | Notes CRUD/visibility vs proto + T32 |
| — | `PhoneStatusBar` | mock notch | **DEFERRED** | PWA safe-area only; do not ship |

---

## 4. Axis M — matrix ownership

| Matrix / policy | Owner epic | Must appear in AC |
|-----------------|------------|-------------------|
| `driver_visibility_matrix` | E-2, D | Locked field rules |
| `marketplace_sync_policy` | E-1 | List freshness / filters |
| `notification_channels_matrix` | F-3, I-2, T20 | Channel × event |
| `client_status_mapping` | D-2, G-1 | Display labels EN/DE |
| `resolved_defaults` (dialog, notif presentation) | **N**, F-3 | Dialog standard + notif v2 |

---

## 5. Axis R — PRD holes

| Gap | Action |
|-----|--------|
| **T23** Error / dialog UX | **Epic N** |
| T7 filter badge depth | Expand E-1 AC before coding |
| T17 PDF OQ #22–28 | Disposition before G-6 “done” |
| T20/T33 depth | Expand F-3 / I-2 before coding |
| Traceability | T7–T10/T25 → L; T15 → M; T23 → N |

---

## 6. Needs-decision — full open OQ list

**Rule:** each id → ClickUp card with status `Resolved` | `Deferred (wave/AC impact)`.

| IDs | Topic cluster |
|-----|----------------|
| #1 | RESOLVED 2026-08-12 — in-app Fahrerbedingungen sheet; optional hosted `VITE_DRIVER_TERMS_URL` |
| #2 | RESOLVED 2026-08-12 — AUTHEON mail for invite, reset, and all workflow email |
| #3 | Map/distance vendor + budget |
| #4 | Retention / encryption / malware / DSGVO |
| #5 | Production branding |
| #6 | Driver ID format |
| #7 | Cancel vs empty-run phase gates |
| #8 | Domain / hosting |
| #11 | Direct-assignment policy |
| #12 | RESOLVED 2026-08-12 — driver email on booked + assigned, attach order PDF |
| #13–16 | Marketplace card windows, scheduling, filters, sort |
| #17–21 | Admin proto rules on server, Keycloak session, durable audit, push transport, expected tour-doc types |
| #22–28 | PDF cluster (blocks T17 Done) |
| #29–32 | Dispatch feed BE fields / inactivity / naming |
| #35–37 | PWA history, probation notif event, type-map gaps |

**Resolved (do not reopen):** #1, #2, #9, #10, #12, #33, #34.

---

## 7. Over-scope / hygiene

| Item | Disposition |
|------|-------------|
| E-5 | Rewrite: production React Query invalidate / app-open refetch — **not** `reloadDemo` |
| L-8 | FE hygiene — keep |
| AccountAccessDialog | Proto `null` → **N/A**; remove from must-match Figma list |
| Orphan FE `/invoices` | Delete/quarantine; never invent BE |
| Organizations API | Inventoried ORPHAN-BE; no J-2 unless proto gains multi-tenant |

---

## 8. AC-expansion backlog (before coding)

1. A Storno — **done** (`epic-a-binary-ac.md`)  
2. L Driver chrome — **done** (`epic-l-driver-pwa-shell-ui-ac.md`)  
3. N / D / B / C — **done** (`epic-ndbc-binary-ac.md`)  
4. E–I / M / K + journeys — **done** (`epic-efghimk-binary-ac.md`)  

**Backlog cleared for planning.** Coding still follows expand-before-build using these appendices as the AC source.

---

## 9. Expand-before-build AC template (required sections)

Every new epic AC appendix must include:
1. Happy path binary checks (prototype refs)  
2. Empty / error / validation  
3. Matrix rows touched (Axis M)  
4. Authz negative (wrong role / other driver id)  
5. EN + DE keys for user-visible strings  
6. Journey link (Axis J) if cross-surface  
7. Open Q blockers disposition  

---

## 10. PM checklist

**Plan-complete (now):**
- [x] Method documented (7 axes incl. V)  
- [x] Master plan updated with P-1…P-8, Epic N, OQ list, E-5 rewrite  
- [x] OQ disposition appendix for all 37 (`oq-disposition.md`) — ClickUp mirror = K-5  
- [x] AccountAccessDialog marked N/A  
- [x] Binary AC for all epics A–N  
- [x] Exact-clone registries + matrices/journeys index  

**Before each fidelity wave:** use the epic’s binary AC appendix; blocking OQs per `oq-disposition.md`.  
**Before program Done:** re-run axes; 0 ORPHAN; 0 MISSING; 0 PARTIAL on shipped scope; journeys green; Axis V all PASS.
