# Prototype → FE → BE Production Alignment Plan

**Status:** **Planning Complete v2.0** (2026-08-11) — coverage gate plan-complete criteria met; ready for Wave 0 execution  
**Authority (binding order):**
1. **Signed-off prototype** — `Autheon/prototype/project/` (`admin.jsx`, `driver.jsx`, `driver-ui.jsx`, `store.js`, `i18n.js`, `DOMAIN.md`) treated as Figma / client visual+behavioral sign-off
2. **PRD** — `Autheon/docs/requirements/prd.json` (**v2.38**) for acceptance criteria and scope
3. **DBML / current BE** — `Autheon/docs/database/schema.dbml` + `autheon-be` for machine codes and APIs
4. **FE/BE architecture rules** — layered clean architecture; no shortcuts

**Goal:** Production FE is an **exact screen-for-screen clone** of the signed-off prototype (layout, chrome, IA, interactions, copy structure), wired to Autheon production BE/architecture, and fully compatible with the Scope A BE sync already landed. “Same features, different layout” is a **fail**.

**Non-goals (explicit):**
- Inventing screens/modules not in prototype nav
- Redesigning screens for “modern best practice” away from prototype
- Reintroducing removed concepts (`special_case`, `not_performable`, old access status enums, daily-limit MDR UI)
- Shipping prototype-only toys (theme editor, seed timers, slow-upload sim)
- Full multilingual legal CMS (PRD `out_of_scope`)
- Changing BE to match *old* FE contracts — FE must move to prototype/DBML

**Exact clone protocol:** [`appendices/exact-screen-clone-gate.md`](./appendices/exact-screen-clone-gate.md) (Axis V + D01–D23 / A01–A25 registries).

---

## 1. Operating principles (every ClickUp task must obey)

### 1.1 Triple lock + exact clone
Every production task must close **all four**:
| Lock | Meaning |
|------|---------|
| **Prototype parity** | Side-by-side **exact clone** of framed prototype for the screen/pane (Axis V checklist) |
| **PRD acceptance** | Mapped PRD task acceptance bullets pass |
| **BE contract** | Live API + DBML enums; no invented codes |
| **Clone evidence** | Proto \| FE screenshots attached; registry ID (Dxx/Axx) marked PASS |

Reject PRs that “improve” layout, add cards/stats, or move chrome vs prototype.

### 1.2 Architecture (FE)
From `autheon-fe` architecture rules:
```
Page → feature api/hook → Repository → apiClient
```
Order for new endpoints: `@shared` DTO → `I*Repository` → data repo → container → feature api → UI.  
Forbidden in pages/components: raw `fetch`/`axios`, container imports.

### 1.3 Architecture (BE)
Use cases + UoW + domain entities; presentation DTOs from `@autheon/shared`; no dual-write to retired tables; audit via `AuditService`; wipe+reseed under `synchronize:true` (no migrations in V1).

### 1.4 QA gate per vertical slice
- Unit (shared enums / mappers / use-cases)
- Component / MSW where UI-critical
- E2E happy path against live BE
- Side-by-side prototype checklist signed by assignee
- No regress of already-green Scope A BE e2e

### 1.5 ClickUp field conventions
Suggested custom fields on every task:
- `Surface`: Admin | Driver | Shared | BE | Cross
- `Prototype ref`: file + component name
- `PRD refs`: `T12`, `T33`, …
- `BE endpoints`: path list
- `Break risk`: None | Soft | Hard
- `Effort`: S | M | L | XL
- `Owner role`: FE | BE | Full-stack | QA | Design
- `Depends on`: task IDs
- `AC`: binary checklist (pass/fail)

---

## 2. Authority map (where truth lives)

| Concern | Prototype | PRD | BE (current) | FE (current) |
|---------|-----------|-----|--------------|--------------|
| Admin IA / panes | `admin.jsx` nav | Tasks by epic | Controllers exist | Partial — missing Tour Billing consolidated + SP Documents |
| Driver IA / sheets | `driver.jsx` + `driver-screen-spec.md` | Driver tasks | APIs exist | Partial — **Storno codes hard-break** |
| Reason codes | Short machine ids in `driver.jsx` | Task 12 | DBML + shared enums | **Wrong old codes** |
| Access axes | `enabled`/`disabled` | Status consolidation | Physical columns + APIs | Aligned |
| Notifications | Feed + preferences | T19, T33, matrices | Rich `user_notifications` | Mostly aligned via aliases |
| Consolidated invoices | `ConsolidatedInvoicesPane` | Phase 12 / related tasks | `/consolidated-invoices` | **Missing** |
| SP onboarding docs | SP profile Documents tab | v2.36 / driver docs | `/drivers/.../documents` | **Missing** |
| Empty-run admin review | `EmptyRunReviewPanel` | Empty-run tasks | `review-empty-run` | Present |

Prototype validation note in PRD: **PASS v2.10** (prototype synced to PRD) — therefore **FE must catch up to prototype**, not the reverse.

---

## 3. Current known hard break (must ship before fidelity work)

| ID | Issue | Evidence | Fix |
|----|-------|----------|-----|
| **HB-1** | Driver Report Problem sends pre–Scope A codes | `autheon-fe/apps/web/.../ReportProblemSheet.tsx` | Align to prototype/DBML: cancel `appointment_not_kept\|booked_accidentally\|org_not_possible\|other`; empty-run `not_operational\|not_roadworthy\|not_present\|not_released\|key_docs_missing\|other` |
| **HB-2** | i18n keys still old machine ids | `apps/web/locales/{en,de}/**` | Rename keys + labels to match `prototype/project/i18n.js` |
| **HB-3** | FE shared package missing Storno enums | `autheon-fe/packages/shared` | Mirror BE `SpCancellationReason` / `EmptyRunReason` |

**Still OK against BE:** admin empty-run review path; access axes; audit/notification API aliases; unused new APIs don’t break boot.

### 3.1 Hard UI break — Driver PWA chrome still on old layout

Tab **IA** is already 4-tab `DriverShell` + floating `BottomTabBar`. Visual/behavioral chrome is **not** signed-off prototype:

| Old FE (still shipping) | Signed-off prototype PWA |
|-------------------------|--------------------------|
| Marketplace greeting + avatar + sort/filter **in** header | Shared `DriverScreenHeader`; no greeting/avatar; sort/filter in results row |
| Notification bell on Marketplace only | Bell on **all four** primary tabs |
| Hand-rolled headers per tab (uneven divider height) | One shared header; control bands **below** |
| Tab bar still on `/notifications` + profile subpages | Tab bar hidden on pushed screens |
| Deprecated `RootLayout` leftovers in codebase | Mobile shell only |

**Plan response:** Epic **L** (Wave 0.5) — full binary AC in [`appendices/epic-l-driver-pwa-shell-ui-ac.md`](./appendices/epic-l-driver-pwa-shell-ui-ac.md). Do not treat Epics E/F as “1:1” until L passes.

---

## 4. Epic structure (ClickUp-ready)

> Use these as ClickUp **Epics/Folders**. Nested tasks below are assignable units.

### Epic A — Contract & Foundation (unblock production vs BE)
**Owner mix:** FE lead + shared-package owner  
**Depends on:** nothing (BE already ready)  
**Exit:** Driver cancel + empty-run succeed on live BE; no old codes in UI/tests.

| Task ID | Title | Role | Effort | Break | AC (binary) |
|---------|-------|------|--------|-------|-------------|
| A-0 | Sync FE `packages/shared` submodule to BE shared HEAD | Full-stack | M | Hard | FE exports Storno/CI/driver-doc enums; builds green; no local enum forks |
| A-1 | Add FE shared Storno enums mirroring BE/DBML (if not via A-0 alone) | FE | S | Hard | Enums exported; identical string unions to BE shared |
| A-2 | Fix `ReportProblemSheet` reason lists + defaults + **MIN 30** + evidence rules | FE | S | Hard | UI only DBML codes; default empty-run `not_operational`; cancel no evidence; empty-run ≤5 files |
| A-3 | Align EN/DE i18n reason keys to prototype | FE | S | Soft | Labels match prototype; no raw-id fallback for happy path |
| A-4 | Update unit/MSW/e2e asserting old codes | FE/QA | S | Hard | Tests green; no fixtures with old codes |
| A-5 | Live BE smoke: cancel + empty-run + admin review | QA | S | Hard | POST 201; review recognised/not_recognised works |
| A-6 | Document dual cancel vocabularies (SP vs Admin) in shared package | FE/BE | S | Soft | Separate enums; admin modal codes not collapsed into SP Storno |

**Expanded binary AC:** [`appendices/epic-a-binary-ac.md`](./appendices/epic-a-binary-ac.md)

### Epic L — Driver PWA chrome / layout UI (old → signed-off shell)

**Owner mix:** FE + Design/QA  
**Depends on:** none (parallel with A)  
**Exit:** Side-by-side chrome matches prototype PWA; no greeting/avatar Marketplace; shared header + bell on all tabs; tab bar hidden on pushed screens.  
**PRD:** T7–T10 chrome, T20 bell entry, T25 mobile-first  
**Evidence:** FE `MarketplaceHeader` still has `welcomeBack` + avatar; per-tab headers.

| Task ID | Title | Role | Effort | Break | AC (binary) |
|---------|-------|------|--------|-------|-------------|
| L-1 | Shared `DriverScreenHeader` on all 4 tabs | FE | M | Hard UI | Equal title/divider height; sibling of scroll body |
| L-2 | Marketplace: remove greeting/avatar; move sort/filter to results row | FE | M | Hard UI | Matches prototype Portal chrome |
| L-3 | Notification bell on My Jobs / Infopoint / Profile | FE | S | Hard UI | Same unread source + destination |
| L-4 | My Jobs / Infopoint control bands below shared header | FE | M | Hard UI | Search/sort/pills / info tabs not inside header |
| L-5 | Hide tab bar on notifications + profile/infopoint subpages | FE | S | Hard UI | Extend `detailScreenHandle` rules |
| L-6 | Tab active token = neutral (no purple capsule) + safe-area pad | FE | S | Soft | Board §H + prototype CSS |
| L-7 | Overlay portal stacking beats tab bar | FE | S | Soft | No dead taps under capsule |
| L-8 | Quarantine `RootLayout` / desktop template leftovers | FE | S | Soft | Not in live router; no sidebar IA |
| L-9 | QA side-by-side chrome checklist (phone + tablet) | QA | M | Hard UI | Screenshots signed vs prototype PWA |

**Expanded binary AC:** [`appendices/epic-l-driver-pwa-shell-ui-ac.md`](./appendices/epic-l-driver-pwa-shell-ui-ac.md)

### Epic M — Admin chrome soft parity (nav / Customer Center)

**Owner mix:** FE Admin  
**Depends on:** none  
**Exit:** Sidebar order + Customer Center title hierarchy match prototype; foot profile open optional.  
**Note:** Admin shell is **not** an old-layout hard break (unlike Epic L). Soft only.

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| M-1 | Reorder admin sidebar to prototype sequence | FE | S | Jobs → Notifications → SP → Staff → CC → Infopoint → Tour Billing → Audit → Settings |
| M-2 | Customer Center: one chrome title + content tabs (not tabs above separate titles) | FE | S | Hierarchy matches prototype |
| M-3 | Sidebar foot: open own Staff profile on name/avatar click (if Phase 6 still in proto) | FE | S | Same as prototype foot behavior |

### Epic N — Error handling & dialog standard (PRD T23)
**Owner mix:** FE shared UI  
**Depends on:** none (can start early; blocks “done” for all surfaces that use dialogs)  
**Exit:** Shared dialog/toast/inline-error patterns match `resolved_defaults.dialog_standard_v1`; no native `alert`/`confirm` in admin or driver.  
**PRD:** T23 (+ T26 dialog ACs)

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| N-1 | Inventory FE alert/confirm/toast usage | FE | S | List of call sites |
| N-2 | Shared Dialog / Confirm / toast primitives 1:1 proto DriverUI | FE | M | Matches prototype primitives |
| N-3 | Migrate admin+driver call sites off native alert/confirm | FE | L | Zero native dialogs in product paths |
| N-4 | Error banner / inline field error patterns | FE | M | T23 acceptance mapped |
| N-5 | QA checklist for dialog standard | QA | S | T26 dialog ACs sampled |

### Epic B — Admin Tour Billing = Prototype `invoices`
**Prototype:** `TourBillingCenterPane` / `ConsolidatedInvoicesPane` / `TourBillingPane`  
**BE:** `billing.controller` `/api/v1/consolidated-invoices*`  
**FE today:** `/tour-documents` only (tab 1)  
**PRD:** Phase 12 consolidated invoices + tour docs

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| B-1 | Shared DTOs/Zod for consolidated invoices | FE | S | Schemas match BE responses |
| B-2 | Repository + hooks (list/create/review) | FE | M | Layered FE architecture only |
| B-3 | Tour Billing center shell with 2 tabs (match prototype) | FE | M | Side-by-side IA match |
| B-4 | Consolidated invoice create + mismatch UX | FE | L | Matches prototype validation/copy |
| B-5 | Review decisions (complete/reject/correction) + financeModule gate | FE | M | BE 422 when finance off handled |
| B-6 | E2E: create → review → jobs payment_status paid | QA | M | Green against live BE |
| B-7 | Design: driver/admin tour-doc amount & invoice metadata field matrix | Design | S | Field list vs prototype amount/accept sheets (supplier #, dates, period, amount) |
| B-8 | Shared + BE: persist tour-doc metadata on upload/accept | BE | M | DTO + persistence; GET returns fields |
| B-9 | FE: amount/metadata sheet in driver tour-doc upload (+ admin accept meta if proto) | FE | L | Staging → category → metadata → upload; no HTTP in components |
| B-10 | Remove tour document modal | FE | S | `RemoveDocModal` parity + BE delete/replace |

### Epic C — Admin Service Partner Documents
**Prototype:** `ServicePartnerProfileModal` Documents tab (`SP_PROFILE_TABS`)  
**BE:** `driver-documents.controller`  
**FE today:** missing tab

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| C-1 | Shared driver-document enums/DTOs | FE | S | Match DBML categories/statuses |
| C-2 | Repository + hooks upload/list/review/replace | FE | M | Architecture order respected |
| C-3 | Documents tab UI 1:1 prototype | FE | L | Side-by-side pass |
| C-4 | Wire create-driver onboarding docs if still in prototype create flow | FE | M | Only if prototype still shows it |
| C-5 | E2E upload → admin accept/reject → replace | QA | M | Green |

### Epic D — Driver Storno & job lifecycle fidelity
**Prototype:** Report problem sheets, My Jobs buckets, empty-run states  
**PRD:** Task 12 (+ related empty-run / cancel tasks)  
**Depends on:** Epic A

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| D-1 | Report problem UX parity (copy, validation length, evidence) | FE | M | Prototype match + BE limits |
| D-2 | My Jobs Active/Performed/Cancelled/Empty-run buckets | FE | M | Same filters/labels as prototype |
| D-3 | Cancelled job reason label rendering (new codes) | FE | S | EN/DE labels, no raw ids |
| D-4 | Evidence upload source sheet phases vs prototype | FE | M | Spec + prototype match |
| D-5 | E2E full Storno vertical (driver → admin) | QA | L | End-to-end green |

### Epic E — Driver marketplace & job detail fidelity (Figma-mode)
**Sources:** `driver.jsx`, `driver-ui.jsx`, `driver-screen-spec.md`

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| E-1 | Marketplace cards/filters 1:1 prototype | FE | L | Screen-spec checklist complete |
| E-2 | Locked/unlocked job chrome + red-plate notice | FE | M | Spec § match |
| E-3 | Accept / Mark performed sheets | FE | M | Prototype match |
| E-4 | External maps handoff | FE | S | Same behavior as prototype |
| E-5 | App-open / pull refresh via React Query invalidate (not proto `reloadDemo`) | FE | S | Fresh data; no demo seed reload |
| E-6 | Same-day overlap confirm sheet | FE | M | Matches `SameDayOverlapSheet`; PRD T9/T30 |
| E-7 | Probation limit block sheet (driver) | FE | M | Matches `ProbationLimitSheet`; ties H-5 |

### Epic F — Driver profile, auth, Infopoint, notifications
| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| F-1 | Profile + master-data change request UX | FE | M | One-open-request rule |
| F-2 | Notification preferences (push/email/postal) | FE | M | Matches prototype settings |
| F-3 | In-app notification list + deep links | FE | M | Matrix-aligned event types |
| F-4 | Infopoint docs/news/help | FE | M | Separate View/Download |
| F-5 | Driver auth splash/login/set-password/reset | FE | M | Prototype flows |
| F-6 | Admin auth login/set-password chrome | FE | M | `AdminLoginScreen` / `AdminSetPasswordScreen` parity |

### Epic G — Admin Jobs / empty-run / cancel / finance panel
**Prototype:** `Overview`, job detail, `EmptyRunReviewPanel`, `JobFinancePanel`, `AdminCancelJob…`

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| G-1 | Jobs overview IA + New job entry | FE | M | Prototype + PRD |
| G-2 | Job create/edit vehicle domain (Systemlogik) | FE | L | Three vehicle types; red-plate derived |
| G-3 | Empty-run review chips/copy 1:1 | FE | S | Already wired — fidelity only |
| G-4 | Admin cancel with driver-facing message | FE | M | Required reason message |
| G-5 | Job finance panel vs `job_financials` | FE | M | paymentStatus compatible |
| G-6 | Transport-order PDF generation UX | FE | M | Matches prototype generation; blocked on PDF OQs |
| G-7 | Assign / reassign driver dialog | FE | M | `AssignDriverDialog` parity + audit |
| G-8 | Internal notes panel | FE | M | `InternalNotesPanel` + T32 notes rules |
| G-9 | Duplicate VIN dialog | FE | S | Proto uniqueness rules |
| G-10 | Schedule-override / revert-to-draft confirm | FE | S | Required note; illegal transition blocked |

### Epic H — Admin Drivers / Staff / access axes
**Prototype:** `ServicePartnersCenterPane`, `StaffPane`, `AccessSwitch` (`AccountAccessDialog` = proto stub `null` → **N/A**, do not clone)

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| H-1 | Drivers table + access switches | FE | M | enabled/disabled only |
| H-2 | SP profile modal tabs (except Documents → Epic C) | FE | L | Prototype tabs |
| H-3 | MDR queue + approve/reject + inline edit | FE | L | PRD master-data rules |
| H-4 | Staff invite / resend / last-admin guards | FE | M | Prototype guards |
| H-5 | Probation UI + manual release | FE | M | Snapshot limit semantics |

### Epic I — Admin Customer Center, Infopoint, Audit, Notifications, Settings
| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| I-1 | Customers + Addresses master data | FE | M | Separation preserved |
| I-2 | Admin notification feed (Task 33) | FE | L | Spec + prototype feed |
| I-3 | Audit log filters/export UX | FE | M | Prototype parity |
| I-4 | Infopoint admin CRUD | FE | M | Visibility + notify flags |
| I-5 | Settings / features / operational policies | FE | M | `app_settings` backed |

### Epic J — BE catch-up only if prototype+PRD require gaps vs current BE
**Rule:** Do not open BE tasks unless a prototype action has no API or wrong contract. Prefer FE adaptation.

| Task ID | Title | Role | Trigger |
|---------|-------|------|---------|
| J-1 | Gap log: prototype action → missing/wrong endpoint | BE/FE | Discovery during Epics B–I |
| J-2 | Implement missing BE endpoint (if any) under clean arch | BE | J-1 confirmed |
| J-3 | Shared package dual-publish (BE + FE) for new enums | Full-stack | When enums change |

### Epic K — QA / Release readiness
| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| K-1 | Prototype side-by-side checklist (admin) — registry A01–A25 | QA/Design | L | Every Axx PASS; screenshots on file |
| K-2 | Prototype side-by-side checklist (driver) — registry D01–D23 | QA/Design | L | Every Dxx PASS; screenshots on file |
| K-3 | Regression suite: Scope A BE e2e still green | QA | M | CI green |
| K-4 | Full FE e2e critical paths | QA | XL | Critical paths listed below |
| K-5 | ClickUp import + assignment matrix | PM | M | All epics imported |
| K-6 | Axis V clone gate audit (re-run registries) | QA | M | 0 FAIL / 0 unchecked product rows |

---

## 5. Suggested implementation wave order

```text
Wave 0    Epic A            (hard BE break — Storno codes)
Wave 0.5  Epic L + start N   (Driver chrome; dialog standard can parallel)
Wave 1    Epic B + C        (prototype surfaces with BE already ready)
Wave 2    Epic D + G-3/G-4/G-7/G-8  (Storno vertical + assign/notes)
Wave 3    Epic E + F        (driver content + auth F-5/F-6 — requires L)
Wave 4    Epic G + H + I + M  (admin Figma fidelity + soft chrome)
Wave 5    Epic J (only if needed) + Epic K (release)
```

Parallelization:
- Wave 0 ∥ Wave 0.5 (codes vs chrome are independent)
- After Wave 0: FE-Admin (B/C) ∥ FE-Driver (D) ∥ QA smoke
- Do **not** start deep Marketplace card polish (E-1) until L-2/L-1 pass
- Design can start K-1/K-2 checklists immediately (no code); K-2 chrome section gates on L-9

---

## 6. Critical path e2e (release bar)

1. Admin creates job → publish/assign → driver accepts  
2. Driver Report Problem cancel (each reason)  
3. Driver Report Problem empty-run + evidence → admin recognise / not-recognise  
4. Tour document upload/review  
5. Consolidated invoice create/review → payment paid  
6. SP document upload/review/replace  
7. MDR request → admin approve/reject  
8. Admin notification feed deep link  
9. Audit export  
10. Infopoint view/download  

---

## 7. Prototype components to treat as Figma (admin)

Must match (non-exhaustive; inventory agents expanding):
`Overview`, `EmptyRunReviewPanel`, `JobFinancePanel`, `ServicePartnersCenterPane`, `ServicePartnerProfileModal`, `MasterDataRequestsPane`, `StaffPane`, `CustomerCenterPane`, `CustomersPane`, `AddressesPane`, `NotificationFeedPane`, `TourBilling*` / `ConsolidatedInvoicesPane`, `AuditPane`, `SettingsPane`, `AccessSwitch`, `AccountAccessDialog`, Infopoint admin panes.

**Do not ship:** `theme-editor.js`, upload slow-sim, prototype seed clocks.

---

## 8. Prototype driver screens to treat as Figma

Must match: Marketplace portal + filters, My Jobs buckets, job locked/unlocked, job details/documents, Report Problem sheets, Accept/Perform sheets, Notifications, Infopoint, Profile/settings/auth.

Reason codes (binding):
- Cancel: `appointment_not_kept`, `booked_accidentally`, `org_not_possible`, `other`
- Empty run: `not_operational`, `not_roadworthy`, `not_present`, `not_released`, `key_docs_missing`, `other`

---

## 9. PRD linkage (import aid)

PRD file: `Autheon/docs/requirements/prd.json`  
- 34 tasks with fields: `id`, `epic`, `priority`, `story`, `acceptance[]`, `status`, `files[]`  
- `scope_alignment.v1_in_scope` (29) = must implement  
- `production_open_questions` (37) = **disposition** each as Resolved | Deferred+wave impact (see coverage-gate §6)  
- `prototype_validation.verdict` = PASS (prototype is ahead of FE)

When creating ClickUp tasks, attach `PRD T{n}` + story text + acceptance list as description checklist.

**Coverage proof:** [`appendices/coverage-gate.md`](./appendices/coverage-gate.md) — axes P/R/B/M/J/X/**V**. Do not claim “plan complete” without 0 Axis-P orphans, 0 Axis-R MISSING, and Axis V registries in place.

---

## 10. Risks

| Risk | Sev | Mitigation |
|------|-----|------------|
| FE “improves” beyond prototype | 🔴 | Axis V clone gate; reject unsolicited UX; screenshot evidence |
| Open questions silently decided by eng | 🔴 | Epic “Needs decision”; block related AC |
| Dual enum sources BE vs FE drift | 🟡 | Shared package mirror + CI snapshot |
| Large fidelity waves without Wave 0 | 🔴 | Wave 0 mandatory first |
| BE changes to fit FE legacy | 🔴 | Forbidden — FE moves to prototype/DBML |

---

## 11. Definition of Done (program)

- [ ] Coverage gate green: 0 Axis-P ORPHAN · 0 Axis-R MISSING · OQs dispositioned · journeys e2e  
- [ ] **Axis V:** registries D01–D23 and A01–A25 all PASS (exact screen clone)  
- [ ] All Wave 0–5 epics closed or explicitly deferred with client sign-off  
- [ ] Side-by-side checklists K-1/K-2/K-6 signed with screenshots  
- [ ] Critical path e2e green on staging against current BE  
- [ ] No old Storno codes in FE source  
- [ ] Driver PWA chrome matches signed-off shell (Epic L / no Marketplace greeting layout)  
- [ ] Consolidated invoices + SP documents live and matching prototype  
- [ ] T23 dialog standard shipped (Epic N) — no native alert/confirm  
- [ ] No out_of_scope or prototype-only toys shipped  
- [ ] Open questions Resolved or Deferred with named AC impact (not silent eng decisions)  
- [ ] 0 PARTIAL remaining on shipped in-scope epics

---

## 12. Next actions (execution — plan is complete)

1. Import Epics A–N + Needs-decision (mirror [`oq-disposition.md`](./appendices/oq-disposition.md)) into ClickUp — **K-5**  
2. Attach binary AC appendices on every card  
3. **Start Wave 0:** Epic A (shared sync + ReportProblemSheet)  
4. **Parallel Wave 0.5:** Epic L (PWA chrome) + Epic N (dialogs)  
5. Do not invent OQ answers; G-6 PDF Done blocked on #22–28 until client Resolves or waives  
6. Re-run coverage / Axis V registries before program Done  

---

## Appendix index

| Appendix | Status | Role |
|----------|--------|------|
| [`appendices/admin-prototype-inventory.md`](./appendices/admin-prototype-inventory.md) | **Complete** | Admin surfaces |
| [`appendices/driver-prototype-inventory.md`](./appendices/driver-prototype-inventory.md) | **Complete** | Driver surfaces |
| [`appendices/prd-task-traceability.md`](./appendices/prd-task-traceability.md) | **Complete** | T1–T34 → epics |
| [`appendices/fe-be-gap-matrix.md`](./appendices/fe-be-gap-matrix.md) | **Complete** | FE/BE gaps |
| [`appendices/coverage-gate.md`](./appendices/coverage-gate.md) | **Complete** | Axes P/R/B/M/J/X/V |
| [`appendices/exact-screen-clone-gate.md`](./appendices/exact-screen-clone-gate.md) | **Complete** | Axis V registries D/A |
| [`appendices/oq-disposition.md`](./appendices/oq-disposition.md) | **Complete** | All 37 OQs dispositioned |
| [`appendices/matrices-and-journeys.md`](./appendices/matrices-and-journeys.md) | **Complete** | Axis M + J index |
| [`appendices/epic-a-binary-ac.md`](./appendices/epic-a-binary-ac.md) | **Complete** | Epic A AC |
| [`appendices/epic-l-driver-pwa-shell-ui-ac.md`](./appendices/epic-l-driver-pwa-shell-ui-ac.md) | **Complete** | Epic L AC |
| [`appendices/epic-ndbc-binary-ac.md`](./appendices/epic-ndbc-binary-ac.md) | **Complete** | Epics N, D, B, C AC |
| [`appendices/epic-efghimk-binary-ac.md`](./appendices/epic-efghimk-binary-ac.md) | **Complete** | Epics E–I, M, K + journeys AC |

### Planning-complete verdict

| Criterion | Met? |
|-----------|------|
| 0 Axis-P orphans (tasks exist) | **Yes** |
| 0 Axis-R MISSING (T23→N) | **Yes** |
| All OQs Resolved or Deferred+impact | **Yes** ([oq-disposition.md](./appendices/oq-disposition.md)) |
| Binary AC for every epic A–N | **Yes** |
| Axis V registries exist | **Yes** |
| Matrices + journeys indexed | **Yes** |
| Implementation / clone PASS rows | **No** — execution next (Wave 0) |
| ClickUp cards created | **No** — K-5 operational import |

**100% planning complete ≠ 100% product shipped.** Next: execute Wave 0 (A) ∥ Wave 0.5 (L + N).

### Critical discoveries from inventories (update plan AC)

1. **Driver Report Problem:** min explanation length is **30** (not 10); empty-run evidence optional max **5**; cancel has no evidence.  
2. **Two cancel vocabularies:** SP Storno codes ≠ **Admin cancel** modal codes (`driver_unavailable`, `vehicle_not_available`, …). Keep separate in FE/BE.  
3. **Tour Billing** nav label is “Tour documents” with **two tabs** (documents + consolidated invoices).  
4. **SP profile** has seven tabs; Documents is the missing FE production gap with BE already ready.  
5. Prefer **prototype/store** over older `driver-screen-spec` / `DOMAIN.md` where they still mention `special_case` or obsolete reason lists.  
6. **Driver chrome:** FE Marketplace still ships old `.pwa-header` generation (greeting/avatar, controls in header). Treat as hard UI break — Epic L before content fidelity.  
7. **Tour-doc metadata sheet** missing in FE → Epic B-7…B-9 (not only consolidated invoices).  
8. **Admin chrome** largely OK; soft nav order + Customer Center title hierarchy → Epic M (not a hard layout rewrite).  
9. **PRD v2.38:** T34 allows multiple active SP documents per category — Epic C must not reintroduce one-active/`category_taken`.  
10. **Coverage gate:** Prototype/PRD/BE audits found orphans (SameDayOverlap, RemoveDoc, VIN dialog, admin auth, T23). Closed via E-6/E-7, B-10, G-7…G-10, F-6, Epic N. Method: [`coverage-gate.md`](./appendices/coverage-gate.md).  
11. **Exact clone:** FE screens must match prototype 1:1 (Axis V). Current Marketplace greeting header = V FAIL until Epic L. Protocol: [`exact-screen-clone-gate.md`](./appendices/exact-screen-clone-gate.md).

*Generated for Autheon production alignment. Prototype is the signed-off visual/behavioral contract; PRD supplies acceptance; BE/DBML supplies machine contracts.*
