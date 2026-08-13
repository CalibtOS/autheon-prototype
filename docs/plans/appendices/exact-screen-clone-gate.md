# Exact screen clone gate (FE = prototype)

**Binding rule:** Production FE must be an **exact clone** of the signed-off prototype screens — layout, hierarchy, chrome, copy structure, interaction sequence, empty/error states. Not “inspired by.” Not “same features, nicer layout.”

**Authority:** `Autheon/prototype/project/` (`admin.jsx`, `driver.jsx`, `driver-ui.jsx`, `styles.css` / `pwa.css`, `i18n.js`) treated as **Figma**.  
**PRD** supplies acceptance and open questions; it does **not** authorize redesign.  
**Allowed deltas only:** Keycloak/real auth, live BE data, no demo toys, production URLs, safe-area instead of mock notch.

---

## 1. Axis V — Visual & structural clone

| Check | Pass criteria |
|-------|----------------|
| **IA** | Same screens, tabs, sheets, modals; no extra product screens; no missing product screens |
| **Hierarchy** | Same title → subtitle → controls → body order (e.g. shared header then bands) |
| **Chrome** | Same shell (driver 4-tab capsule; admin sidebar + `.admin-top`) |
| **Components** | Same control types (slide-to-confirm, sheets, pills, filter badge placement) |
| **Copy structure** | Same EN/DE keys/labels as `i18n.js` (wording may follow i18n; structure must match) |
| **Spacing / type / radius** | Match prototype tokens (header 24/600, tab 10/600, sheet radius 24, etc.) within tight QA tolerance |
| **States** | Empty, loading, error, disabled, success sheets match proto |
| **Motion** | Required interactions only (sheet dismiss, slide-to-confirm) — no new decorative motion |

**Program Done:** every row in §3 registries has `Clone: PASS` signed by Design/QA (K-1 / K-2).

---

## 2. Side-by-side protocol (mandatory per screen)

For each registry row:

1. Open **prototype** (framed admin or `/pwa` driver) and **FE** at same breakpoint.  
2. Fill checklist below (binary).  
3. Attach two screenshots (proto | FE) on the ClickUp task.  
4. Failures → reopen FE task; **no “close enough.”**  
5. Sign: assignee + Design/QA.

### Per-screen clone checklist (copy onto every fidelity task)

```text
Screen: _______________  Proto: _______________  FE route: _______________
Breakpoint: [ ] 390×844  [ ] 360  [ ] tablet/admin wide

Structure
[ ] Same primary title + subtitle placement
[ ] Same header actions (bell, back, etc.)
[ ] Same control bands (not moved into wrong region)
[ ] Same bottom chrome (tab bar on/off rules)
[ ] No extra cards / stats / promo blocks vs proto
[ ] No missing sections vs proto (product scope)

Content & controls
[ ] Same fields / filters / tabs / CTAs in same order
[ ] Same validation gates (e.g. MIN 30, slide unlock)
[ ] Same empty / error / success surfaces
[ ] EN labels match i18n; DE smoke checked

Visual
[ ] Type scale / weight match (title, subtitle, meta)
[ ] Surfaces (canvas/paper/line) match intent
[ ] No purple-capsule / greeting-avatar / old-header regressions
[ ] Safe-area / scroll clearance correct

Auth / data (allowed delta)
[ ] Real API — same UX as proto with seed-equivalent data
[ ] No prototype toys (demo OTP display, reloadDemo, theme editor)

Verdict: [ ] PASS  [ ] FAIL — notes: _______________
Signed: _______________ date: _______________
```

---

## 3. Screen registries (must all reach PASS)

### 3.1 Driver (Epic K-2)

| # | Proto surface | FE route / host | Epic | Clone |
|---|---------------|-----------------|------|-------|
| D01 | `DriverLoginScreen` | auth routes | F-5 | ☐ |
| D02 | `DriverSetPasswordScreen` | set-password | F-5 | ☐ |
| D03 | Shell `TabBar` + 4 tabs | `DriverShell` | L | ☐ |
| D04 | `DriverScreenHeader` (all tabs) | shared header | L-1 | ☐ |
| D05 | `Portal` Marketplace | `/` or marketplace | L-2, E-1a,b,d,e,f,g,i | ☐ |
| D06 | `FilterSheet` | marketplace | E-1d, E-1e | ☐ |
| D07 | `JobLocked` | job detail locked | E-2 | ☐ |
| D08 | `JobUnlocked` + docs tab | job detail | E-2 | ☐ |
| D09 | `AcceptanceModal` | accept | E-3 | ☐ |
| D10 | `SameDayOverlapSheet` | accept gate | E-6 | ☐ |
| D11 | `ProbationLimitSheet` | accept gate | E-7 | ☐ |
| D12 | `TourBookedSuccessSheet` | post-accept | E-3 | ☐ |
| D13 | `MyJobs` + 4 buckets | `/jobs` | D-2, L-4 | ☐ |
| D14 | `ReportProblemSheet` | job detail | A, D-1 | ☐ |
| D15 | `PendingNotice` | after report | D-1 | ☐ |
| D16 | `MarkPerformedSheet` | job detail | E-3 | ☐ |
| D17 | Upload stack (category/source/staging/amount) | job docs | D-4, B-9 | ☐ |
| D18 | `DocumentPreviewSheet` | docs | E-2 | ☐ |
| D19 | `RemoveDocModal` | docs | B-10 | ☐ |
| D20 | `DriverNotificationsPane` | `/notifications` | F-3, L-5 | ☐ |
| D21 | `Infopoint` + message detail | `/infopoint` | F-4 | ☐ |
| D22 | `ProfilePaneFull` + subpages | `/profile` | F-1, F-2 | ☐ |
| D23 | `ChangeEmailSheet` / password / appearance | profile | F-1, F-5 | ☐ |

### 3.2 Admin (Epic K-1)

| # | Proto surface | FE route / host | Epic | Clone |
|---|---------------|-----------------|------|-------|
| A01 | `AdminLoginScreen` / set-password | admin auth | F-6 | ☐ |
| A02 | `AdminNav` sidebar order + foot + chrome titles | admin shell | M-1, M-3 | ☐ |
| A03 | `Overview` + row actions | `/jobs` | G-1 | ☐ |
| A04 | `NewOrder` create/edit | create/edit | G-2 | ☐ |
| A05 | `AdminDetail` + footer | `/jobs/:id` | G-11a, G-11b | ☐ |
| A06 | `AssignDriverDialog` | detail | G-7 | ☐ |
| A07 | `AdminCancelJobModal` | detail | G-4 | ☐ |
| A08 | `EmptyRunReviewPanel` | detail | G-3 | ☐ |
| A09 | `JobFinancePanel` | detail | G-5 | ☐ |
| A10 | `InternalNotesPanel` | detail | G-8 | ☐ |
| A11 | Transport-order preview | detail | G-6 | ☐ |
| A12 | VIN / schedule-override dialogs | create/detail | G-9 | ☐ |
| A13 | `NotificationFeedPane` | `/notifications` | I-2 | ☐ |
| A14 | `ServicePartnersCenterPane` | `/drivers` | H | ☐ |
| A15 | `ServicePartnerProfileModal` (7 tabs) | drivers | H-2, C | ☐ |
| A16 | SP Documents tab | profile | C-3 | ☐ |
| A17 | `MasterDataRequestsPane` | drivers MDR | H-3 | ☐ |
| A18 | `StaffPane` | staff | H-4 | ☐ |
| A19 | `CustomerCenterPane` hierarchy | CC | I-1, M-2 | ☐ |
| A20 | `InfopointPane` admin | infopoint | I-4 | ☐ |
| A21 | `TourBillingCenterPane` (2 tabs) | tour-documents | B-3 | ☐ |
| A22 | `TourBillingPane` | tab documents | B | ☐ |
| A23 | `ConsolidatedInvoicesPane` | tab invoices | B-4, B-5 | ☐ |
| A24 | `AuditPane` | audit | I-3 | ☐ |
| A25 | `SettingsPane` User + System | settings | I-5 | ☐ |

---

## 4. Anti-patterns (automatic FAIL)

| FE does this | Verdict |
|--------------|---------|
| Adds greeting/avatar / dashboard stats / extra cards not in proto | FAIL |
| Moves sort/filter into header when proto has results row | FAIL |
| Bell only on one tab | FAIL |
| Purple active tab capsule | FAIL |
| Native `alert`/`confirm` | FAIL (Epic N) |
| Redesigns “for mobile best practice” away from proto | FAIL |
| Ships Settings Prototype tab / theme editor / demo reload | FAIL |
| Claims PASS without screenshots | FAIL |

---

## 5. Allowed production deltas (not FAIL)

| Delta | Why allowed |
|-------|-------------|
| Keycloak / real OTP (no OTP shown in UI) | Security |
| Live API loading skeletons if proto had instant store | Performance — skeleton style should still match DriverUI |
| Safe-area instead of `PhoneStatusBar` notch | Real devices |
| Hide feature behind `financeModule` when BE gates | Contract |
| Placeholder T&C URL until OQ #1 resolved | Open question |
| No `reloadDemo` — React Query refresh | E-5 |

---

## 6. How this plugs into epics

| When | What |
|------|------|
| Expand-before-build | Every fidelity AC appendix must list registry IDs (Dxx/Axx) |
| Implementation PR | Link proto component + FE path; include before/after screenshots |
| Epic exit | All registry rows for that epic = PASS |
| K-1 / K-2 | Full admin/driver registry sign-off |
| Program Done | 0 unchecked registry rows (except DEFERRED toys) |

---

## 7. Relationship to coverage gate

- Axis **P** = surface exists in the plan.  
- Axis **V** (this doc) = surface **looks and behaves** like the prototype.  
Both required. A wired-but-wrong layout (current Marketplace header) is P=COVERED, **V=FAIL** until Epic L passes.
