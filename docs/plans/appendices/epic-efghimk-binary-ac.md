# Epics E / F / G / H / I / M / K — Binary acceptance criteria (expanded)

**Authority:** signed-off prototype (`driver.jsx`, `driver-ui.jsx`, `admin.jsx`, `i18n.js`) → PRD v2.38 → BE/DBML. Exact clone only — **no redesign**.  
**Axis V:** [`exact-screen-clone-gate.md`](./exact-screen-clone-gate.md) · **Coverage:** [`coverage-gate.md`](./coverage-gate.md)  
**Dual cancel vocabularies (binding):** SP Storno ≠ Admin cancel modal codes — never collapse.  
**N/A:** `AccountAccessDialog` (proto stub `null`) — do not clone; remove from must-match Figma lists.  
**OQ rule:** Do not invent answers. Mark **Deferred** + named AC blocked until Resolved.

Pass/fail only. Screenshots (proto \| FE) required for every Axis V row claimed PASS.

---

## Global locks (all tasks below)

| # | AC | Pass? |
|---|----|-------|
| GL.1 | Side-by-side clone of framed prototype for the task’s surface (Axis V checklist) | ☐ |
| GL.2 | No extra cards/stats/promo/chrome vs prototype; no “mobile best practice” redesign | ☐ |
| GL.3 | EN + DE user-visible strings use prototype `i18n.js` key structure (no raw machine ids on happy path) | ☐ |
| GL.4 | Layered FE only: Page → feature api/hook → Repository → apiClient (no raw fetch in UI) | ☐ |
| GL.5 | Wrong-role / other-driver authz negative exercised where API exists | ☐ |

---

# Epic E — Driver marketplace & job detail fidelity

**PRD:** T7–T10, T9/T30 (overlap/probation), T25  
**Depends on:** Epic L chrome PASS (L-1/L-2) before deep E-1 polish; Epic A for Storno codes elsewhere  
**Axis V owned:** **D05–D12** (plus D16 for Mark performed)  
**Matrices:** `marketplace_sync_policy`, `driver_visibility_matrix`  
**Journeys:** J1 (create→accept), J4 (tour docs from unlocked)

### Axis V registry — Epic E scope

| ID | Surface | Task | Clone |
|----|---------|------|-------|
| D05 | `Portal` Marketplace | E-1 (+ L-2 chrome) | ☐ |
| D06 | `FilterSheet` | E-1 | ☐ |
| D07 | `JobLocked` | E-2 | ☐ |
| D08 | `JobUnlocked` + docs tab | E-2 | ☐ |
| D09 | `AcceptanceModal` | E-3 | ☐ |
| D10 | `SameDayOverlapSheet` | E-6 | ☐ |
| D11 | `ProbationLimitSheet` | E-7 | ☐ |
| D12 | `TourBookedSuccessSheet` | E-3 | ☐ |

---

## E-1 — Marketplace cards / filters 1:1 (D05, D06)

| # | AC | Pass? |
|---|----|-------|
| E-1.1 | Marketplace lists **published** jobs only (proto `Portal` rule) | ☐ |
| E-1.2 | Card anatomy matches proto: route `City → City` + PLZ, legs, footer meta, price right; **no tour# on card** | ☐ |
| E-1.3 | Sort + filter live in **results row** under shared header (not in header) — L-2 already green | ☐ |
| E-1.4 | `FilterSheet` keys exactly: `startPlz[]`, `endPlz[]`, `from`, `to`, `vehicleType`, `transportType` | ☐ |
| E-1.5 | Vehicle options: All + `passenger_car` \| `truck_up_to_7_5_t` \| `truck_over_7_5_t` | ☐ |
| E-1.6 | Transport options: All + `own_axle` \| `third_party_axle` | ☐ |
| E-1.7 | Applied-filter **badge count** matches proto rules (T7 depth); pluralized accessible name | ☐ |
| E-1.8 | Empty + loading states match DriverUI / proto (no invented empty illustration) | ☐ |
| E-1.9 | OQ **#13–16** (card windows / scheduling / filters / sort) = Deferred → rows that depend on undecided rules stay **blocked for Done** (do not invent) | ☐ |
| E-1.10 | D05 + D06 clone checklists signed with screenshots | ☐ |

---

## E-2 — Locked / unlocked chrome + red-plate (D07, D08)

| # | AC | Pass? |
|---|----|-------|
| E-2.1 | `driverJobViewMode` **locked** iff `published` and driver not committed; else unlocked | ☐ |
| E-2.2 | Locked: City+PLZ only; **no** plate / VIN / street / contacts (`driver_visibility_matrix`) | ☐ |
| E-2.3 | Locked: Accept CTA present; Report Problem / docs secrets absent per matrix | ☐ |
| E-2.4 | Unlocked: full stops, plate/VIN, docs tab, status-gated CTAs match proto | ☐ |
| E-2.5 | Red-plate notice: **derived** only (`deregistered && own_axle`); single notice component; **never** stores/shows a red-plate number | ☐ |
| E-2.6 | Document preview entry from unlocked docs matches proto sheet host (D18 owned elsewhere OK) | ☐ |
| E-2.7 | D07 + D08 clone PASS | ☐ |

---

## E-3 — Accept / Mark performed sheets (D09, D12, D16)

| # | AC | Pass? |
|---|----|-------|
| E-3.1 | `AcceptanceModal`: slide-to-confirm + legal/terms gate match proto sequence | ☐ |
| E-3.2 | OQ **#1 Resolved** — `DriverTermsDisclosure`: in-app Fahrerbedingungen sheet when `VITE_DRIVER_TERMS_URL` unset; hosted AGB URL when set. Do **not** invent the URL | ☐ |
| E-3.3 | Post-accept `TourBookedSuccessSheet` (D12) copy/structure 1:1 | ☐ |
| E-3.4 | `MarkPerformedSheet`: confirm → success → upload guidance matches proto | ☐ |
| E-3.5 | Binding actions use slide-to-confirm (no native confirm) | ☐ |
| E-3.6 | D09 + D12 (+ D16 if in wave) clone PASS | ☐ |

---

## E-4 — External maps handoff

| # | AC | Pass? |
|---|----|-------|
| E-4.1 | Maps CTA opens same external handoff behavior as prototype (platform chooser / deep link) | ☐ |
| E-4.2 | Address payload matches unlocked stop fields only (locked never leaks street) | ☐ |
| E-4.3 | OQ **#3** (map vendor/budget) Deferred → production vendor choice **blocks Done** if product requires paid SDK; interim = proto-equivalent OS/maps URL only | ☐ |

---

## E-5 — App-open / pull refresh (React Query — **not** `reloadDemo`)

| # | AC | Pass? |
|---|----|-------|
| E-5.1 | App-open / focus refetch uses React Query invalidate/refetch of marketplace + jobs queries | ☐ |
| E-5.2 | Pull-to-refresh (if proto exposes) triggers same invalidate path — **zero** calls to prototype `reloadDemo` / demo seed reload | ☐ |
| E-5.3 | Fresh list reflects BE state without full app remount or in-memory store wipe | ☐ |
| E-5.4 | No Settings / debug “reload demo” control shipped | ☐ |

---

## E-6 — Same-day overlap confirm (D10) — PRD T9/T30

| # | AC | Pass? |
|---|----|-------|
| E-6.1 | On accept, if another accepted job same calendar day → `SameDayOverlapSheet` shown before commit | ☐ |
| E-6.2 | Confirm continues accept; cancel/dismiss aborts accept (job unchanged) | ☐ |
| E-6.3 | Sheet chrome/copy/actions 1:1 proto `SameDayOverlapSheet` | ☐ |
| E-6.4 | No overlap → sheet never shown | ☐ |
| E-6.5 | D10 clone PASS | ☐ |

---

## E-7 — Probation limit block (D11) — ties H-5

| # | AC | Pass? |
|---|----|-------|
| E-7.1 | When probation snapshot limit reached → `ProbationLimitSheet` blocks accept | ☐ |
| E-7.2 | Single dismiss/primary action matches proto; no alternate “override” on driver | ☐ |
| E-7.3 | Limit semantics = admin H-5 snapshot (same source of truth) | ☐ |
| E-7.4 | OQ **#35–37** probation-notif / type-map gaps Deferred → do not invent notif event; driver sheet still ships | ☐ |
| E-7.5 | D11 clone PASS | ☐ |

---

# Epic F — Driver profile, auth, Infopoint, notifications (+ admin auth)

**PRD:** T18–T20, T33 matrix, T2 auth  
**Axis V:** D01, D02, D20–D23, A01  
**Matrices:** `notification_channels_matrix`, `resolved_defaults` notif presentation

---

## F-1 — Profile + master-data change request

| # | AC | Pass? |
|---|----|-------|
| F-1.1 | Profile landing IA matches `ProfilePaneFull` (identity, probation card placement, nav rows) | ☐ |
| F-1.2 | MDR: **one open request** rule enforced (UI + BE 4xx handled) | ☐ |
| F-1.3 | Change-email sheet grammar matches proto (Cancel \| Primary; code step; no email enumeration) | ☐ |
| F-1.4 | D22/D23 clone rows for profile/subpages PASS | ☐ |

---

## F-2 — Notification preferences

| # | AC | Pass? |
|---|----|-------|
| F-2.1 | Push / email / in-app toggles match prototype settings surface | ☐ |
| F-2.2 | Preferences persist via production API (`user_notifications` / prefs endpoints) | ☐ |
| F-2.3 | Channel × event rows respect `notification_channels_matrix` (no invented channels) | ☐ |

---

## F-3 — In-app notification list + deep links

| # | AC | Pass? |
|---|----|-------|
| F-3.1 | List kinds/event types align to PRD/matrix (aliases OK if BE-mapped) | ☐ |
| F-3.2 | Ride preview = **five values only** (proto rule) | ☐ |
| F-3.3 | Deep links open locked/unlocked job correctly per `driverJobViewMode` | ☐ |
| F-3.4 | Tab bar hidden on notifications (L-5); D20 clone PASS | ☐ |
| F-3.5 | OQ **#29–32** feed BE fields Deferred → mark-read/severity extras **block Done** until dispositioned | ☐ |

---

## F-4 — Infopoint docs / news / help

| # | AC | Pass? |
|---|----|-------|
| F-4.1 | Tabs: docs / news / help under shared header (L-4) | ☐ |
| F-4.2 | **View** and **Download** are separate actions (proto) | ☐ |
| F-4.3 | News opens full-page detail; document preview hides tab bar (safe-area rules) | ☐ |
| F-4.4 | D21 clone PASS | ☐ |

---

## F-5 — Driver auth (splash / login / set-password / reset)

| # | AC | Pass? |
|---|----|-------|
| F-5.1 | Login / forgot / set-password chrome 1:1 proto; **no OTP displayed in UI** (Keycloak delta OK) | ☐ |
| F-5.2 | No email/user enumeration messages | ☐ |
| F-5.3 | Demo fill / `?screen=` debug toys **not** shipped | ☐ |
| F-5.4 | D01 + D02 clone PASS | ☐ |
| F-5.5 | OQ **#2 Resolved** — invite/reset mail is AUTHEON SMTP (not Keycloak). Production invite Done requires AUTHEON mailer + Keycloak action link; from-address is ops `SMTP_FROM` | ☐ |

---

## F-6 — Admin auth login / set-password

| # | AC | Pass? |
|---|----|-------|
| F-6.1 | `AdminLoginScreen` / `AdminSetPasswordScreen` chrome 1:1 proto | ☐ |
| F-6.2 | Keycloak-backed; no prototype demo credentials UI | ☐ |
| F-6.3 | A01 clone PASS | ☐ |

---

# Epic G — Admin Jobs / empty-run / cancel / finance / assign / notes / VIN / schedule

**Prototype:** `Overview`, `AdminDetail`, `EmptyRunReviewPanel`, `JobFinancePanel`, `AdminCancelJobModal`, `AssignDriverDialog`, `InternalNotesPanel`, `NewOrder`  
**Axis V:** A03–A12  
**Dual vocabulary:** Admin cancel codes only in G-4 — never SP Storno list

---

## G-1 — Jobs overview IA + New job entry (A03)

| # | AC | Pass? |
|---|----|-------|
| G-1.1 | Overview status tiles/umbrellas + comfort/dense + persisting filters match proto | ☐ |
| G-1.2 | `RowActionsMenu`: unavailable actions **hidden** (not disabled-grey sprawl) | ☐ |
| G-1.3 | New job entry path matches proto; `client_status_mapping` labels EN/DE | ☐ |
| G-1.4 | A03 clone PASS | ☐ |

---

## G-2 — Job create/edit vehicle domain (A04)

| # | AC | Pass? |
|---|----|-------|
| G-2.1 | Three vehicle types only: `passenger_car` \| `truck_up_to_7_5_t` \| `truck_over_7_5_t` | ☐ |
| G-2.2 | Transport `own_axle` \| `third_party_axle`; red-plate **derived** (never stored number) | ☐ |
| G-2.3 | Save draft / Assign / Publish + validation jump links match `NewOrder` | ☐ |
| G-2.4 | No `special_case` / legacy axle types in UI | ☐ |
| G-2.5 | A04 clone PASS | ☐ |

---

## G-3 — Empty-run review chips/copy (A08)

| # | AC | Pass? |
|---|----|-------|
| G-3.1 | Panel only when empty-run reported/terminal | ☐ |
| G-3.2 | Exactly **Recognised** / **Not recognised** (`recognised` \| `not_recognised`) | ☐ |
| G-3.3 | Displays SP empty-run reason labels (SP vocabulary) — not admin cancel codes | ☐ |
| G-3.4 | A08 clone PASS | ☐ |

---

## G-4 — Admin cancel + driver-facing message (A07)

| # | AC | Pass? |
|---|----|-------|
| G-4.1 | Reason allow-list **only:** `driver_unavailable`, `vehicle_not_available`, `customer_cancelled`, `appointment_not_possible`, `incorrect_order_data`, `vehicle_not_roadworthy`, `other` | ☐ |
| G-4.2 | **Zero** SP Storno codes in this modal (`appointment_not_kept`, etc. absent) | ☐ |
| G-4.3 | Driver-facing message required (proto min length); cutoff override UX matches proto | ☐ |
| G-4.4 | OQ **#7** (cancel vs empty-run phase gates) Deferred → phase-gate edge cases **block Done** until Resolved | ☐ |
| G-4.5 | A07 clone PASS | ☐ |

---

## G-5 — Job finance panel vs `job_financials` (A09)

| # | AC | Pass? |
|---|----|-------|
| G-5.1 | Amounts + `paymentStatus` (Invoice Missing / Received / Paid) match proto + BE | ☐ |
| G-5.2 | Tour-doc review actions + link to consolidated when `financeModule` on | ☐ |
| G-5.3 | BE 422 when finance module off handled without crash | ☐ |
| G-5.4 | A09 clone PASS | ☐ |

---

## G-6 — Transport-order PDF generation UX (A11) — **OQ #22–28 BLOCK**

| # | AC | Pass? |
|---|----|-------|
| G-6.1 | Preview/generate UX shell matches proto transport-order preview **structurally** | ☐ |
| G-6.2 | **OQ #22–28 (PDF cluster) = Deferred** — do **not** invent template/field/retention answers | ☐ |
| G-6.3 | Task **G-6 Done is blocked** until #22–28 Resolved **or** explicit client waiver naming which PDF ACs ship | ☐ |
| G-6.4 | No shipping prototype “sample PDF everywhere” as production content | ☐ |
| G-6.5 | A11 clone PASS only after OQ disposition unlocks content contract | ☐ |

---

## G-7 — Assign / reassign driver (A06)

| # | AC | Pass? |
|---|----|-------|
| G-7.1 | `AssignDriverDialog` assign + reassign modes match proto | ☐ |
| G-7.2 | Empty active-drivers state matches proto; marketplace-accepted **not** reassignable (proto rule) | ☐ |
| G-7.3 | Audit event written on assign/reassign | ☐ |
| G-7.4 | OQ **#11** (direct-assignment policy) Deferred → policy edge **blocks Done** if contested | ☐ |
| G-7.5 | A06 clone PASS | ☐ |

---

## G-8 — Internal notes panel (A10) — T32

| # | AC | Pass? |
|---|----|-------|
| G-8.1 | Admin-only notes CRUD matches `InternalNotesPanel` | ☐ |
| G-8.2 | Visibility rules per T32 / proto (never shown to driver) | ☐ |
| G-8.3 | Empty + add validation match proto | ☐ |
| G-8.4 | A10 clone PASS | ☐ |

---

## G-9 — Duplicate VIN dialog (A12)

| # | AC | Pass? |
|---|----|-------|
| G-9.1 | Dialog appears on duplicate VIN per proto uniqueness rules | ☐ |
| G-9.2 | Confirm/cancel outcomes match proto (no silent overwrite) | ☐ |
| G-9.3 | Copy EN/DE from i18n; A12 (VIN half) clone PASS | ☐ |

---

## G-10 — Schedule-override / revert-to-draft (A12)

| # | AC | Pass? |
|---|----|-------|
| G-10.1 | Confirm sheet requires note before override / revert-to-draft | ☐ |
| G-10.2 | Illegal status transitions blocked (BE + UI) | ☐ |
| G-10.3 | A12 (schedule half) clone PASS | ☐ |

---

# Epic H — Admin Drivers / Staff / access / probation

**Prototype:** `ServicePartnersCenterPane`, `StaffPane`, `AccessSwitch`  
**N/A:** `AccountAccessDialog` — **do not implement / do not clone**  
**Axis V:** A14, A15 (tabs except Documents→C), A17, A18

---

## H-1 — Drivers table + access switches

| # | AC | Pass? |
|---|----|-------|
| H-1.1 | Access axes UI = **enabled** \| **disabled** only (no old status enums) | ☐ |
| H-1.2 | `AccessSwitch` behavior 1:1 proto; invite states `pending` \| `failed` \| `accepted` where shown | ☐ |
| H-1.3 | **`AccountAccessDialog` = N/A** — no stub dialog shipped; no ClickUp AC requiring it | ☐ |
| H-1.4 | A14 table chrome clone PASS | ☐ |

---

## H-2 — SP profile modal tabs (except Documents → Epic C)

| # | AC | Pass? |
|---|----|-------|
| H-2.1 | Tabs present: overview, masterdata, documents, orders, changerequests, notes, audit | ☐ |
| H-2.2 | Non-Documents tabs 1:1 proto; Documents tab owned by Epic C (link only / placeholder OK until C) | ☐ |
| H-2.3 | A15 clone PASS for non-C tabs | ☐ |

---

## H-3 — MDR queue + approve/reject + inline edit

| # | AC | Pass? |
|---|----|-------|
| H-3.1 | Filters: open / approved / rejected / all; page size **20** | ☐ |
| H-3.2 | Approve / reject + inline edit match PRD master-data rules | ☐ |
| H-3.3 | One-open-request invariant preserved admin-side | ☐ |
| H-3.4 | A17 clone PASS | ☐ |

---

## H-4 — Staff invite / resend / last-admin guards

| # | AC | Pass? |
|---|----|-------|
| H-4.1 | Create-only invite modal matches `StaffPane` | ☐ |
| H-4.2 | Last-admin + self-disable guards match proto | ☐ |
| H-4.3 | Resend invite path works; A18 clone PASS | ☐ |

---

## H-5 — Probation UI + manual release

| # | AC | Pass? |
|---|----|-------|
| H-5.1 | Probation snapshot limit displayed; manual release control matches proto | ☐ |
| H-5.2 | Release updates same limit source consumed by E-7 driver sheet | ☐ |
| H-5.3 | No daily-limit MDR toy; OQ **#35–37** Deferred items not silently invented | ☐ |

---

# Epic I — Customer Center, feed, audit, Infopoint admin, Settings

**Axis V:** A13, A19, A20, A24, A25  
**Matrices:** notif channels (I-2), `app_settings`

---

## I-1 — Customers + Addresses master data

| # | AC | Pass? |
|---|----|-------|
| I-1.1 | Customers vs Addresses **separation** preserved (`CustomerCenterPane` hierarchy) | ☐ |
| I-1.2 | CRUD works; delete blocked if in use (proto) | ☐ |
| I-1.3 | A19 (+ M-2 title hierarchy) clone PASS | ☐ |

---

## I-2 — Admin notification feed (T33)

| # | AC | Pass? |
|---|----|-------|
| I-2.1 | All / Unread / Read + severity/source filters match `NotificationFeedPane` | ☐ |
| I-2.2 | Deep links open correct admin job/SP targets | ☐ |
| I-2.3 | Channel/event presentation per matrix; OQ **#29–32** Deferred → extra BE fields **block Done** | ☐ |
| I-2.4 | A13 clone PASS | ☐ |

---

## I-3 — Audit log filters / export

| # | AC | Pass? |
|---|----|-------|
| I-3.1 | Filters + CSV export match `AuditPane` | ☐ |
| I-3.2 | Retention purge UI only if proto+policy allow; OQ **#4**/#17–21 Deferred → purge semantics **block Done** if undecided | ☐ |
| I-3.3 | A24 clone PASS | ☐ |

---

## I-4 — Infopoint admin CRUD

| # | AC | Pass? |
|---|----|-------|
| I-4.1 | Docs + News CRUD; show/hide + notify flags match proto | ☐ |
| I-4.2 | Driver visibility respects flags after publish | ☐ |
| I-4.3 | A20 clone PASS | ☐ |

---

## I-5 — Settings / features / operational policies

| # | AC | Pass? |
|---|----|-------|
| I-5.1 | User + System panes `app_settings`-backed | ☐ |
| I-5.2 | **No Settings Prototype tab**; no theme editor; no “Run now” inactivity toy | ☐ |
| I-5.3 | Policies / help contacts / upload limits match proto System surface | ☐ |
| I-5.4 | A25 clone PASS | ☐ |

---

# Epic M — Admin chrome soft parity

**Note:** Soft only — not an old-layout hard break (unlike Epic L).  
**Axis V:** A02 (+ A19 hierarchy with I-1)

---

## M-1 — Sidebar order

| # | AC | Pass? |
|---|----|-------|
| M-1.1 | Sidebar sequence exactly: Jobs → Notifications → SP → Staff → CC → Infopoint → Tour Billing → Audit → Settings | ☐ |
| M-1.2 | Labels match proto (Tour Billing = “Tour documents” product label) | ☐ |
| M-1.3 | A02 nav order clone PASS | ☐ |

---

## M-2 — Customer Center title hierarchy

| # | AC | Pass? |
|---|----|-------|
| M-2.1 | One chrome title + content tabs (not tabs above separate competing titles) | ☐ |
| M-2.2 | Hierarchy matches prototype `CustomerCenterPane` | ☐ |
| M-2.3 | No extra dashboard cards in CC chrome | ☐ |

---

## M-3 — Sidebar foot → own Staff profile

| # | AC | Pass? |
|---|----|-------|
| M-3.1 | Name/avatar foot click opens own Staff profile **iff** Phase 6 still in proto | ☐ |
| M-3.2 | If proto removed foot behavior → document N/A and skip without inventing | ☐ |
| M-3.3 | A02 foot behavior signed vs current proto | ☐ |

---

# Epic K — QA / clone registries / release

**Depends on:** fidelity waves for surfaces under test  
**Axis V exit:** K-1 + K-2 + K-6

---

## K-1 — Admin side-by-side checklist (A01–A25)

| # | AC | Pass? |
|---|----|-------|
| K-1.1 | Every registry row **A01–A25** has Clone PASS or explicit DEFERRED (toys only) | ☐ |
| K-1.2 | Proto \| FE screenshots attached per row | ☐ |
| K-1.3 | `AccountAccessDialog` listed **N/A** (not FAIL, not PASS) | ☐ |
| K-1.4 | Design/QA sign-off recorded | ☐ |

---

## K-2 — Driver side-by-side checklist (D01–D23)

| # | AC | Pass? |
|---|----|-------|
| K-2.1 | Every **D01–D23** Clone PASS (chrome gated on L-9) | ☐ |
| K-2.2 | D05–D12 (Epic E) included and signed | ☐ |
| K-2.3 | Screenshots on file; no “close enough” | ☐ |
| K-2.4 | Design/QA sign-off recorded | ☐ |

---

## K-3 — Scope A BE e2e regression

| # | AC | Pass? |
|---|----|-------|
| K-3.1 | Scope A BE e2e suite green on CI against current BE | ☐ |
| K-3.2 | Cancel + empty-run + admin review paths still green | ☐ |
| K-3.3 | No reintroduction of legacy Storno codes in fixtures | ☐ |

---

## K-4 — Full FE e2e critical paths (Axis J)

| # | AC | Pass? |
|---|----|-------|
| K-4.1 | All **10** journeys in Axis J section below green on staging | ☐ |
| K-4.2 | Dual cancel vocabularies asserted (SP vs Admin) in relevant journeys | ☐ |
| K-4.3 | Failures file bugs linked to epic task IDs (no silent skip) | ☐ |

---

## K-5 — ClickUp import + assignment matrix

| # | AC | Pass? |
|---|----|-------|
| K-5.1 | Epics A–N (+ Needs-decision OQs) imported | ☐ |
| K-5.2 | Each task has Surface / Prototype ref / PRD / BE / AC fields | ☐ |
| K-5.3 | This appendix linked on E/F/G/H/I/M/K tasks | ☐ |

---

## K-6 — Axis V clone gate audit (re-run)

| # | AC | Pass? |
|---|----|-------|
| K-6.1 | Re-run D01–D23 + A01–A25 after fidelity waves | ☐ |
| K-6.2 | **0 FAIL** and **0 unchecked** product rows | ☐ |
| K-6.3 | Anti-patterns list spot-checked (greeting header, purple capsule, `reloadDemo`, native alert) | ☐ |

---

# Axis J — Critical path journeys (binary AC)

Master plan §6. Each journey ≥3 binary rows. Cross-links epics. Staging + live BE.

### J1 — Admin creates job → publish/assign → driver accepts

| # | AC | Pass? |
|---|----|-------|
| J1.1 | Admin create (G-2) → publish/assign (G-7) succeeds | ☐ |
| J1.2 | Driver sees job on Marketplace (E-1); locked chrome (E-2) | ☐ |
| J1.3 | Accept path: overlap (E-6) / probation (E-7) gates if applicable → D09/D12 success | ☐ |

### J2 — Driver Report Problem cancel (each reason)

| # | AC | Pass? |
|---|----|-------|
| J2.1 | Each SP cancel code (`appointment_not_kept`, `booked_accidentally`, `org_not_possible`, `other`) submits 201 | ☐ |
| J2.2 | Explanation MIN 30; **no** evidence UI on cancel | ☐ |
| J2.3 | Admin sees SP vocabulary on job — **not** admin cancel modal codes | ☐ |

### J3 — Driver empty-run + evidence → admin recognise / not-recognise

| # | AC | Pass? |
|---|----|-------|
| J3.1 | Empty-run reasons + optional ≤5 evidence; default `not_operational` | ☐ |
| J3.2 | Admin G-3 panel offers Recognised / Not recognised only | ☐ |
| J3.3 | Decision persists; driver My Jobs empty-run bucket updates | ☐ |

### J4 — Tour document upload / review

| # | AC | Pass? |
|---|----|-------|
| J4.1 | Driver upload stack (category → source → file) on unlocked job | ☐ |
| J4.2 | Admin review accept/reject/correction on finance/tour surfaces | ☐ |
| J4.3 | Metadata sheet (B-7…B-9) present if in scope for wave; else explicit defer note | ☐ |

### J5 — Consolidated invoice create/review → payment paid

| # | AC | Pass? |
|---|----|-------|
| J5.1 | Create from performed tours (Epic B) | ☐ |
| J5.2 | Review complete → jobs `payment_status` paid | ☐ |
| J5.3 | `financeModule` off → 422 handled | ☐ |

### J6 — SP document upload / review / replace

| # | AC | Pass? |
|---|----|-------|
| J6.1 | Upload via SP Documents tab (Epic C) | ☐ |
| J6.2 | Admin accept/reject; replace path works | ☐ |
| J6.3 | PRD T34: multiple active per category allowed (no `category_taken` regress) | ☐ |

### J7 — MDR request → admin approve/reject

| # | AC | Pass? |
|---|----|-------|
| J7.1 | Driver opens MDR (F-1); second open blocked | ☐ |
| J7.2 | Admin H-3 approve/reject updates driver data | ☐ |
| J7.3 | EN/DE status labels correct | ☐ |

### J8 — Admin notification feed deep link

| # | AC | Pass? |
|---|----|-------|
| J8.1 | Event appears in I-2 feed | ☐ |
| J8.2 | Deep link lands on correct admin entity | ☐ |
| J8.3 | Unread → read transition works within Deferred OQ #29–32 limits | ☐ |

### J9 — Audit export

| # | AC | Pass? |
|---|----|-------|
| J9.1 | Filtered audit list loads (I-3) | ☐ |
| J9.2 | CSV export downloads non-empty valid file | ☐ |
| J9.3 | Authz: non-privileged role denied | ☐ |

### J10 — Infopoint view / download

| # | AC | Pass? |
|---|----|-------|
| J10.1 | Admin publishes doc/news (I-4) visible to driver (F-4) | ☐ |
| J10.2 | View and Download are separate; preview hides tab bar | ☐ |
| J10.3 | Hidden flag → not listed for driver | ☐ |

---

## Open-question blockers (do not invent)

| OQ | Topic | Blocks Done on |
|----|-------|----------------|
| #1 | RESOLVED — in-app terms + optional `VITE_DRIVER_TERMS_URL` | E-3.2 |
| #2 | Invite/reset SMTP | F-5 production invite mail |
| #3 | Map vendor | E-4 paid SDK choice |
| #4, #17–21 | Retention / audit / session / push | I-3 purge; related Settings |
| #7 | Cancel vs empty-run phase gates | G-4 edge |
| #11 | Direct-assignment policy | G-7 edge |
| #13–16 | Marketplace windows/filters/sort | E-1 contested rows |
| **#22–28** | **PDF cluster** | **G-6 / T17 entire Done** |
| #29–32 | Feed BE fields | F-3, I-2, J8 extras |
| #35–37 | Probation notif / type-map | H-5/E-7 notif side only |

**Resolved (do not reopen):** #1, #2, #9, #10, #12, #33, #34.

---

## Explicit non-AC / hygiene

- `AccountAccessDialog` — **N/A** (proto `null`)
- `reloadDemo` — forbidden; E-5 = React Query only
- Theme editor, Settings Prototype tab, seed timers, slow-upload sim — do not ship
- Epic L chrome must PASS before claiming E/F screen 1:1
- Pixel redesign “improvements” — automatic Axis V FAIL

---

*Appendix for Autheon production alignment. Exact clone; dual cancel vocabularies; PDF G-6 blocked on OQ #22–28 Deferred.*
