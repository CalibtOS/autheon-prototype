# Prototype → FE → BE Production Alignment Plan

**Status:** **Planning Complete 100% (v2.2)** — 2026-08-13.  
**Work list / order / owners:** [`task-book.md`](./task-book.md)  
**ClickUp board sync (give to a teammate):** [`clickup-apply.md`](./clickup-apply.md)  
**Index:** [`README.md`](./README.md)  
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
Title: `[Wn][ID][Role][Person] Short title`. Assignees follow [`task-book.md`](./task-book.md). Board edits: [`clickup-apply.md`](./clickup-apply.md).

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
| L-6 | Tab visual + overlay stacking (includes retired L-7) | FE | M | Soft | Neutral active; sheets beat tab bar |
| L-8 | Quarantine `RootLayout` / desktop template leftovers | FE | S | Soft | Not in live router; no sidebar IA |
| L-9 | QA side-by-side chrome checklist (phone + tablet) | QA | M | Hard UI | Screenshots signed vs prototype PWA |

**Expanded binary AC:** [`appendices/epic-l-driver-pwa-shell-ui-ac.md`](./appendices/epic-l-driver-pwa-shell-ui-ac.md)

### Epic M — Admin chrome soft parity (nav / titles / Customer Center)

**Owner mix:** FE Admin  
**Depends on:** none  
**Exit:** Sidebar order + page chrome titles + CC hierarchy + foot match prototype.  
**Note:** Admin shell is **not** an old-layout hard break (unlike Epic L). Soft only.  
**2026-08-13:** Screen-by-screen nav audit — FE order/naming still FAIL. See [`task-book.md`](./task-book.md) § M.

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| M-1 | Sidebar order **and** chrome titles EN+DE (includes retired M-4) | FE | L | Proto sequence + sectionTitle map (Staff≠Staff accounts) |
| M-2 | Customer Center: one chrome title + tabs under it | FE | S | No competing per-tab h1 |
| M-3 | Sidebar foot → own Staff profile (if still in proto) | FE | S | Proto foot or N/A |

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
| B-3 | **Umbrella** — Tour Billing 2-tab center (A21) | FE | — | B-3 shell + B-3a Done |
| B-3a | TourBillingPane docs tab 1:1 (A22) | FE | M | Existing tour-docs surface clone |
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
| D-2 | **Umbrella** — My Jobs exact clone (D13) | FE | — | All D-2a…D-2f Done |
| D-2a | Bucket membership (active/performed/cancelled+empty-run terminals/review) | FE | M | Empty-run terminals in Cancelled |
| D-2b | Control band below shared header (search/sort/pills) | FE | M | Depends L-4 |
| D-2c | My-jobs JobCard (tour# + status; assigned banner; correction chip) | FE | M | Opposite of marketplace card |
| D-2d | Empty / search-miss / soft-cap / loading states | FE | S | Per-bucket empty copy |
| D-2e | SwipeViews axis-lock + pill sync | FE | S | Vertical scroll preserved |
| D-2f | D13 screenshot sign-off | QA | S | 4 buckets × empty/populated |
| D-3 | Cancelled job reason label rendering (new codes) | FE | S | EN/DE labels, no raw ids |
| D-4 | Evidence upload source sheet phases vs prototype | FE | M | Spec + prototype match |
| D-5 | E2E full Storno vertical (driver → admin) | QA | L | End-to-end green |

### Epic E — Driver marketplace & job detail fidelity (Figma-mode)
**Sources:** `driver.jsx` (`Portal`, `FilterSheet`, `JobCard`), `driver-ui.jsx`, `driver-screen-spec.md`  
**Depends on:** Epic L (L-1/L-2 chrome PASS) before Marketplace content clone can be Done.  
**WBS:** E-1 surviving children **E-1a, b, d, e, f, g, i**. See [`task-book.md`](./task-book.md).

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| E-1 | **Umbrella** — Marketplace Portal exact clone (D05+D06) | FE | — | Surviving children Done; screenshots |
| E-1a | Results-row composition (count + SortSelect + filter btn + chips) | FE | M | Survives loading; not in header |
| E-1b | Empty + loading states (includes retired E-1c) | FE | M | Unfiltered/filtered empty; SkeletonList×3 |
| E-1d | FilterSheet clone (D06) — sections, Reset, Show N results, keys | FE | L | vehicleType/transportType keys |
| E-1e | Badge + chips rules (T7) — per-PLZ count; sort excluded | FE | S | Plural a11y; zero → no badge |
| E-1f | JobCard marketplace anatomy (no tour#; route/legs/price/tags) | FE | M | D05 body clone PASS |
| E-1g | Portal gated branches — access-blocked + inactivity (includes retired E-1h) | FE | L | Or explicit N/A; do not invent banner |
| E-1i | D05+D06 screenshot sign-off | QA | S | Proto\|FE attached; no close-enough |
| E-2 | Locked/unlocked job chrome + red-plate notice | FE | M | Spec § match |
| E-3 | Accept / Mark performed sheets | FE | M | Prototype match |
| E-4 | External maps handoff | FE | S | Same behavior as prototype |
| E-5 | App-open / pull refresh via React Query invalidate (not proto `reloadDemo`) | FE | S | Fresh data; no demo seed reload |
| E-6 | Same-day overlap confirm sheet | FE | M | Matches `SameDayOverlapSheet`; PRD T9/T30 |
| E-7 | Probation limit block sheet (driver) | FE | M | Matches `ProbationLimitSheet`; ties H-5 |

**Known FE hard UI today (Marketplace):** `MarketplaceHeader` still has greeting/avatar + sort/filter in header → **L-2** must land before E-1a can PASS.

### Epic F — Driver profile, auth, Infopoint, notifications
**2026-08-13 split:** F-1 / F-3 / F-4 were mega-cards. See [`task-book.md`](./task-book.md).

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| F-1 | **Umbrella** — Profile (D22/D23) | FE | — | All F-1a…F-1e Done |
| F-1a | Landing IA ProfilePaneFull | FE | M | Identity, probation, nav, help mailtos |
| F-1b | MDR one-open + 409 | FE | M | No second open; Journey J7 |
| F-1c | Change-email Cancel\|Primary + code step | FE | M | No enumeration |
| F-1d | Password + appearance (or Keycloak N/A) | FE | S | L-5 subpage chrome |
| F-1e | D22/D23 screenshot sign-off | QA | S | Proto\|FE |
| F-2 | Notification preferences (single card) | FE | M | Matrix; postal/vehicle filters |
| F-3 | **Umbrella** — Notifications (D20) | FE | — | F-3a…d Done |
| F-3a | List chrome + tab bar hidden + OQ #29–32 gate (includes retired F-3e/f) | FE | L | Mark-all; empty; no invent severity |
| F-3b | Ride expand five values only | FE | L | No PLZ/price/plate invent |
| F-3c | Ride actions locked/unlocked/unavailable | FE | M | Depends E-2 |
| F-3d | Deep links news/doc/profile + return-to-origin | FE | L | Depends F-4c |
| F-4 | **Umbrella** — Infopoint (D21) | FE | — | All F-4a…F-4e Done |
| F-4a | Pills below header + swipe + unread badge | FE | M | L-4 |
| F-4b | Docs View ≠ Download + preview safe-area | FE | M | L-5 |
| F-4c | News **full-page** detail (not accordion) | FE | L | Hard FE gap today |
| F-4d | Help contacts tel/mailto | FE | S | — |
| F-4e | D21 screenshot sign-off | QA | S | — |
| F-5 | Driver auth splash/login/set-password/reset | FE | M | Prototype flows |
| F-6 | Admin auth login/set-password chrome | FE | M | `AdminLoginScreen` / `AdminSetPasswordScreen` parity |
| F-7 | Driver booked/assigned email + order PDF | FS | M | OQ-12; blocked PDF content on G-6 |
| F-8 | AUTHEON SMTP for all mail | BE | M | OQ-2 |

### Epic G — Admin Jobs / empty-run / cancel / finance panel
**Prototype:** `Overview`, `AdminDetail`, `EmptyRunReviewPanel`, `JobFinancePanel`, `AdminCancelJob…`  
**2026-08-13:** G-1 mega + **A05 AdminDetail had no task** → G-1a/b + G-11a/b. See [`task-book.md`](./task-book.md).

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| G-1 | **Umbrella** — Jobs overview (A03) | FE | — | G-1a…b Done |
| G-1a | Status tiles + density + filters + new-job entry (includes retired G-1c) | FE | L | A03 |
| G-1b | RowActionsMenu — hide unavailable (not grey sprawl) | FE | M | A03 |
| G-11a | AdminDetail section chrome 01–N | FE | L | **A05** (was orphan) |
| G-11b | AdminDetailFooter action matrix | FE | M | **A05** |
| G-2 | Job create/edit vehicle domain (Systemlogik) | FE | L | Three vehicle types; red-plate derived |
| G-3 | Empty-run review chips/copy 1:1 | FE | S | Already wired — fidelity only |
| G-4 | Admin cancel with driver-facing message | FE | M | Admin allow-list only; ≠ SP Storno |
| G-5 | Job finance panel vs `job_financials` | FE | M | paymentStatus compatible |
| G-6 | Transport-order PDF generation UX | FE | M | Matches prototype generation; blocked on PDF OQs |
| G-7 | Assign / reassign driver dialog | FE | M | `AssignDriverDialog` parity + audit |
| G-8 | Internal notes panel | FE | M | `InternalNotesPanel` + T32 notes rules |
| G-9 | VIN + schedule-override / revert-to-draft dialogs (includes retired G-10) | FE | M | A12; required note; illegal transition blocked |

### Epic H — Admin Drivers / Staff / access axes
**Prototype:** `ServicePartnersCenterPane`, `StaffPane`, `AccessSwitch` (`AccountAccessDialog` = proto stub `null` → **N/A**, do not clone)  
**2026-08-13 split:** H-1 / H-2 mega. Documents stay Epic C-3. See [`task-book.md`](./task-book.md).

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| H-1 | **Umbrella** — Drivers / SP center | FE | — | H-1a…b Done |
| H-1a | SP center chrome (partners \| MDR) | FE | M | Proto IA |
| H-1b | DriversPane + AccessSwitch | FE | M | enabled/disabled only |
| H-2 | **Umbrella** — SP profile modal (except Documents) | FE | — | H-2a…d Done |
| H-2a | overview + masterdata tabs | FE | M | Proto tabs |
| H-2b | orders tab | FE | M | Proto |
| H-2c | changerequests in-modal | FE | M | Ties H-3 |
| H-2d | notes + audit tabs | FE | M | Proto |
| H-3 | MDR queue + approve/reject + inline edit | FE | L | PRD master-data rules |
| H-4 | Staff invite / resend / last-admin guards | FE | M | Prototype guards |
| H-5 | Probation UI + manual release | FE | M | Snapshot limit semantics |

### Epic I — Admin Customer Center, Infopoint, Audit, Notifications, Settings
**2026-08-13 split:** I-1 / I-2 / I-4 / I-5 mega. See [`task-book.md`](./task-book.md).

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| I-1 | **Umbrella** — Customers + Addresses | FE | — | I-1a…b Done |
| I-1a | Customers CRUD | FE | M | Separation preserved |
| I-1b | Addresses CRUD | FE | M | Separation preserved |
| I-2 | **Umbrella** — Admin notification feed | FE | — | I-2a…c Done |
| I-2a | All/Unread/Read list chrome | FE | M | Task 33 |
| I-2b | Filter menu severity/source/date | FE | M | Proto |
| I-2c | Deep links + bulk + row menu | FE | M | Proto |
| I-3 | Audit log filters/export UX | FE | M | Prototype parity |
| I-4 | **Umbrella** — Infopoint admin | FE | — | I-4a…b Done |
| I-4a | Docs CRUD | FE | M | Visibility flags |
| I-4b | News CRUD + notify | FE | M | Notify flags |
| I-5 | **Umbrella** — Settings | FE | — | I-5a…c Done |
| I-5a | User settings | FE | M | `app_settings` |
| I-5b | System operational policies | FE | M | Proto |
| I-5c | Inactivity (no Run now) + help + upload limits | FE | M | Proto |

### Epic J — BE catch-up only if prototype+PRD require gaps vs current BE
**Rule:** Do not open BE tasks unless a prototype action has no API or wrong contract. Prefer FE adaptation.  
**Owner:** Ismail (primary). J-2/J-3 stay **not started** until J-1 confirms a real gap.

| Task ID | Title | Role | Trigger |
|---------|-------|------|---------|
| J-1 | Gap log: prototype action → missing/wrong endpoint | BE/FE | Discovery during Epics B–I |
| J-2 | Implement missing BE endpoint (if any) under clean arch | BE | J-1 confirmed |
| J-3 | Shared package dual-publish (BE + FE) for new enums | Full-stack | When enums change |

### Epic SEC — Authz / IDOR / session (Wave 5, parallel with K)
**Owner:** Ayman. One mega-card is not enough for jobs vs docs vs auth.

| Task ID | Title | Role | Effort | AC |
|---------|-------|------|--------|----|
| SEC | **Umbrella** — Authz/IDOR/session gate | Sec | — | SEC-1…3 Done |
| SEC-1 | Jobs + Storno IDOR (driver A cannot act on B; admin-only cancel) | Sec | M | Negative tests green |
| SEC-2 | Docs + billing IDOR (SP docs, tour docs, CI) | Sec | M | Cross-partner 403 |
| SEC-3 | Auth/session (Keycloak; no OTP in UI; F-5 collab) | Sec | M | OQ #18 gates extras |

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
- `production_open_questions` (37) = **disposition** each as Resolved | Deferred+wave impact (see [`oq-disposition.md`](./appendices/oq-disposition.md))  
- `prototype_validation.verdict` = PASS (prototype is ahead of FE)

When creating ClickUp tasks, attach `PRD T{n}` + story text + acceptance list as description checklist.

**Coverage proof:** Axis V registries in [`exact-screen-clone-gate.md`](./appendices/exact-screen-clone-gate.md). Do not claim “plan complete” without 0 Axis-P orphans, 0 Axis-R MISSING, and Axis V registries in place. Historical coverage-gate notes: `docs/archive/2026-08/plans-superseded/coverage-gate.md`.

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

## 12. Next actions (execution — plan is 100% complete)

1. **Answer OQs** one at a time — start with **#7**, then PDF **#22–28** — [oq-disposition.md](./appendices/oq-disposition.md) § How answers land
2. **Start Wave 0:** Ismail A-0 · Yasser A-1…A-4 · Omar A-6 + L + N-2 · Yasser N-1 · Karim M-1
3. Pull cards only if Definition of Ready is green — [`task-book.md`](./task-book.md) §1
4. Do not invent OQ answers; G-6 PDF Done blocked on #22–28 until client Resolves or waives
5. When ClickUp API recovers (or via UI now): execute [`clickup-apply.md`](./clickup-apply.md)

---

## Living plan files

Index: [`README.md`](./README.md).

| File | Role |
|------|------|
| [`task-book.md`](./task-book.md) | Owners, order, surviving IDs, PRD T1–T34 map |
| [`clickup-apply.md`](./clickup-apply.md) | **Give to a teammate** — every ClickUp change |
| [`appendices/oq-disposition.md`](./appendices/oq-disposition.md) | All 37 OQs |
| [`appendices/exact-screen-clone-gate.md`](./appendices/exact-screen-clone-gate.md) | Axis V registries D/A |
| [`appendices/epic-a-binary-ac.md`](./appendices/epic-a-binary-ac.md) | Epic A AC |
| [`appendices/epic-l-driver-pwa-shell-ui-ac.md`](./appendices/epic-l-driver-pwa-shell-ui-ac.md) | Epic L AC |
| [`appendices/epic-ndbc-binary-ac.md`](./appendices/epic-ndbc-binary-ac.md) | Epics N, D, B, C AC |
| [`appendices/epic-efghimk-binary-ac.md`](./appendices/epic-efghimk-binary-ac.md) | Epics E–I, M, J, K, SEC, F-7/F-8 + journeys AC |

Superseded drafts (inventories, old WBS, PM OS, coverage-gate): `docs/archive/2026-08/plans-superseded/`.

### Planning-complete verdict

| Criterion | Met? |
|-----------|------|
| 0 Axis-P orphans (tasks exist) | **Yes** |
| 0 Axis-R MISSING (T23→N) | **Yes** |
| All OQs Resolved or Deferred+impact | **Yes** ([oq-disposition.md](./appendices/oq-disposition.md)) — 7 Resolved, 30 Deferred+impact, 0 invented |
| Binary AC + Goal/Authority/DoD for every surviving task ID | **Yes** (A, L, NDBC, EFGHIMK incl. F-7/F-8, B-3a, J-1…3, E-4 owned) |
| Axis V registries exist | **Yes** |
| Matrices + journeys indexed | **Yes** |
| PM operating system (RACI, DoR/DoD, card schema) | **Yes** |
| Implementation / clone PASS rows | **No** — that is **program** Done, not plan Done |
| ClickUp board exists | **Yes** — K-5 remaining is [`clickup-apply.md`](./clickup-apply.md) (API rate-limited); [`task-book.md`](./task-book.md) is SOT |

**Planning is 100% complete. Product is not shipped.** Next: (1) answer remaining OQs one at a time per [oq-disposition.md](./appendices/oq-disposition.md) § How answers land; (2) execute Wave 0.

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
10. **Coverage gate:** Prototype/PRD/BE audits found orphans (SameDayOverlap, RemoveDoc, VIN dialog, admin auth, T23). Closed via E-6/E-7, B-10, G-7…G-9, F-6, Epic N. Historical notes: `docs/archive/2026-08/plans-superseded/coverage-gate.md`.  
11. **Exact clone:** FE screens must match prototype 1:1 (Axis V). Current Marketplace greeting header = V FAIL until Epic L. Protocol: [`exact-screen-clone-gate.md`](./appendices/exact-screen-clone-gate.md).

*Generated for Autheon production alignment. Prototype is the signed-off visual/behavioral contract; PRD supplies acceptance; BE/DBML supplies machine contracts.*
