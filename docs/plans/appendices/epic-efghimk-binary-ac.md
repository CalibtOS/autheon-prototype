# Epics E / F / G / H / I / M / J / K / SEC — Binary acceptance criteria (expanded)

**Authority:** signed-off prototype (`driver.jsx`, `driver-ui.jsx`, `admin.jsx`, `i18n.js`) → PRD v2.38 → BE/DBML. Exact clone only — **no redesign**.  
**Axis V:** [`exact-screen-clone-gate.md`](./exact-screen-clone-gate.md)  
**Dual cancel vocabularies (binding):** SP Storno ≠ Admin cancel modal codes — never collapse.  
**N/A:** `AccountAccessDialog` (proto stub `null`) — do not clone; remove from must-match Figma lists.  
**OQ rule:** Do not invent answers. Mark **Deferred** + named AC blocked until Resolved.  
**Card body:** Goal · Authority · Acceptance · DoD on every card ([`clickup-apply.md`](../clickup-apply.md)). Includes **F-7/F-8** and **J-1…J-3**.

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
| D05 | `Portal` Marketplace | E-1a,b,d,e,f,g,i (+ L-2 chrome) | ☐ |
| D06 | `FilterSheet` | E-1d, E-1e | ☐ |
| D07 | `JobLocked` | E-2 | ☐ |
| D08 | `JobUnlocked` + docs tab | E-2 | ☐ |
| D09 | `AcceptanceModal` | E-3 | ☐ |
| D10 | `SameDayOverlapSheet` | E-6 | ☐ |
| D11 | `ProbationLimitSheet` | E-7 | ☐ |
| D12 | `TourBookedSuccessSheet` | E-3 | ☐ |

---

## E-1 — Marketplace Portal umbrella (D05, D06)

**Rule:** Do **not** mark E-1 Done until surviving children **E-1a, b, d, e, f, g, i** are all Done (E-1c→b, E-1h→g). L-1/L-2 must be green first (no greeting/avatar; results-row outside header).

| # | AC | Pass? |
|---|----|-------|
| E-1.0 | Umbrella: surviving children E-1a,b,d,e,f,g,i Done; published-only list still holds (proto `Portal`) | ☐ |
| E-1.9 | OQ **#13–16** Deferred → contested card-window / sort-default rows **block Done** (do not invent) | ☐ |

### E-1a — Results-row composition

| # | AC | Pass? |
|---|----|-------|
| E-1a.1 | After L-2: `.portal-results-row` holds results count + `SortSelect` + filter button — **not** inside header | ☐ |
| E-1a.2 | Removable applied-filter chips sit **under** the results-row (sibling of scroll body) | ☐ |
| E-1a.3 | Results-row **survives loading** (controls never vanish while skeleton shows); count caption blank while loading | ☐ |
| E-1a.4 | Sort options = `date_desc` \| `date_asc` \| `price_desc` \| `price_asc` \| `dist_desc` \| `dist_asc`; default `date_desc` | ☐ |

### E-1b — Empty + loading states (includes retired E-1c)

| # | AC | Pass? |
|---|----|-------|
| E-1b.1 | Unfiltered empty: title only `marketplaceEmptyNoOrders` — **no** description, **no** CTA | ☐ |
| E-1b.2 | Filtered empty: title `noJobsMatch`, desc `noToursMatch`, **single** action opens FilterSheet (no dual Clear+Adjust invent) | ☐ |
| E-1b.3 | No invented empty illustrations | ☐ |
| E-1b.4 | Loading = `SkeletonList` count 3 under sticky results-row | ☐ |
| E-1b.5 | `aria-label` / a11y uses loadingJobs equivalent | ☐ |
| E-1b.6 | Whole-screen Suspense that removes results-row = FAIL | ☐ |

### E-1d — FilterSheet clone (D06)

| # | AC | Pass? |
|---|----|-------|
| E-1d.1 | Keys exactly: `startPlz[]`, `endPlz[]`, `from`, `to`, `vehicleType`, `transportType` (or documented alias map to those names) | ☐ |
| E-1d.2 | Vehicle: All + `passenger_car` \| `truck_up_to_7_5_t` \| `truck_over_7_5_t` | ☐ |
| E-1d.3 | Transport: All + `own_axle` \| `third_party_axle` | ☐ |
| E-1d.4 | PLZ multi + date from/until + presets today / this_week; Reset; Cancel; primary **Show N results** with live preview count | ☐ |
| E-1d.5 | Draft edits do **not** move the badge until Apply | ☐ |
| E-1d.6 | D06 clone PASS with screenshots | ☐ |

### E-1e — Badge + chips rules (T7)

| # | AC | Pass? |
|---|----|-------|
| E-1e.1 | Badge count = applied-filters list length (**one per PLZ prefix**); sort never counts | ☐ |
| E-1e.2 | Zero applied → no badge; pluralized accessible name on button | ☐ |
| E-1e.3 | Chip remove clears that filter and refreshes list | ☐ |

### E-1f — JobCard marketplace anatomy (D05 body)

| # | AC | Pass? |
|---|----|-------|
| E-1f.1 | Route City+PLZ → City+PLZ, legs, footer vehicle + **price right**; **no tour# / status** on marketplace card | ☐ |
| E-1f.2 | Tags: registration / EV / ready-to-drive / red-plates derived + axle chip match proto | ☐ |
| E-1f.3 | Tap opens locked job detail; list-enter stagger 0–3 OK | ☐ |
| E-1f.4 | D05 card body screenshot PASS | ☐ |

### E-1g — Portal gated branches (includes retired E-1h)

| # | AC | Pass? |
|---|----|-------|
| E-1g.1 | Deferred vs disabled titles/bodies match proto **or** explicit N/A documenting FE maps only capability errors | ☐ |
| E-1g.2 | Deferred shows open-tour count + restore copy when BE provides data | ☐ |
| E-1g.3 | Blocked branch does not invent a third status enum | ☐ |
| E-1g.4 | When BE exposes equivalent of `inactivityWarningSentAt` → InlineAlert warn on Portal before list | ☐ |
| E-1g.5 | If BE lacks inactivity field → mark N/A with ticket; do not invent a fake banner | ☐ |

### E-1i — D05 + D06 screenshot sign-off

| # | AC | Pass? |
|---|----|-------|
| E-1i.1 | Proto \| FE screenshots for D05 + D06 attached | ☐ |
| E-1i.2 | Design/QA sign-off; no “close enough” | ☐ |
| E-1i.3 | Depends on E-1a…E-1f (+ L-2) green | ☐ |

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

**Goal:** Unlocked job maps CTA uses the same external handoff as prototype (no paid SDK invent).  
**Authority:** proto job-detail maps CTA · PRD T28 · **OQ #3 Resolved 2026-08-14** · Axis V D08.  
**Owner:** Marwan.  
**DoD:** Proto-equivalent Google Maps search URL handoff; no paid in-app SDK.

| # | AC | Pass? |
|---|----|-------|
| E-4.1 | Maps CTA opens same external handoff as prototype (Google Maps search URL from street+PLZ+city) | ☐ |
| E-4.2 | Address payload matches unlocked stop fields only (locked never leaks street) | ☐ |
| E-4.3 | **OQ #3 Resolved** — no paid in-app maps SDK in V1; distance km remains BE-owned (GraphHopper/no-op), not an FE vendor call | ☐ |

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
| E-7.4 | OQ **#36 Resolved** — probation = Profile card + limit sheet only; **no** push/in-app probation event. OQ **#37 Resolved** → type registry covers channel-matrix events (fail loud) | ☐ |
| E-7.5 | D11 clone PASS | ☐ |

---

# Epic F — Driver profile, auth, Infopoint, notifications (+ admin auth)

**PRD:** T18–T20, T33 matrix, T2 auth  
**Axis V:** D01, D02, D20–D23, A01  
**Matrices:** `notification_channels_matrix`, `resolved_defaults` notif presentation

---

## F-1 — Profile umbrella (D22/D23)

**Rule:** Do **not** mark F-1 Done until **F-1a…F-1e** Done.

| # | AC | Pass? |
|---|----|-------|
| F-1.0 | Umbrella: F-1a…F-1e Done; D22/D23 PASS | ☐ |

### F-1a — Landing IA ProfilePaneFull
| # | AC | Pass? |
|---|----|-------|
| F-1a.1 | Identity, probation card, nav rows, help mailtos 1:1 `ProfilePaneFull` | ☐ |

### F-1b — MDR one-open + 409
| # | AC | Pass? |
|---|----|-------|
| F-1b.1 | One open MDR; second open blocked; BE 409 handled; Journey J7 | ☐ |

### F-1c — Change-email Cancel\|Primary + code
| # | AC | Pass? |
|---|----|-------|
| F-1c.1 | Sheet grammar Cancel \| Primary; code step; **no** email enumeration | ☐ |

### F-1d — Password + appearance (or Keycloak N/A)
| # | AC | Pass? |
|---|----|-------|
| F-1d.1 | Password/appearance subpages use L-5 chrome; Keycloak-owned paths marked N/A explicitly | ☐ |

### F-1e — D22/D23 screenshot sign-off
| # | AC | Pass? |
|---|----|-------|
| F-1e.1 | Proto\|FE attached; depends F-1a…d | ☐ |

---

## F-2 — Notification preferences

| # | AC | Pass? |
|---|----|-------|
| F-2.1 | Push / email / in-app toggles match prototype settings surface | ☐ |
| F-2.2 | Preferences persist via production API (`user_notifications` / prefs endpoints) | ☐ |
| F-2.3 | Channel × event rows respect `notification_channels_matrix` (no invented channels) | ☐ |
| F-2.4 | Postal/vehicle filter prefs match proto where present | ☐ |

---

## F-3 — Notifications umbrella (D20)

**Rule:** Do **not** mark F-3 Done until **F-3a…F-3d** Done.

| # | AC | Pass? |
|---|----|-------|
| F-3.0 | Umbrella: F-3a…F-3d Done; Axis V **D20** PASS | ☐ |

### F-3a — List chrome + tab bar hidden + OQ gate (includes retired F-3e/f)
| # | AC | Pass? |
|---|----|-------|
| F-3a.1 | Day-grouped list; mark-all; empty; **no** category chips (OQ #33) | ☐ |
| F-3a.2 | Tab bar hidden (L-5); D20 structure PASS | ☐ |
| F-3a.3 | OQ **#29–32 / #37 Resolved** for type/feed rules; OQ **#20 Resolved** — delivery = in-app + email + Web Push (VAPID) as-built; no invented FCM/APNs | ☐ |

### F-3b — Ride expand five values only
| # | AC | Pass? |
|---|----|-------|
| F-3b.1 | Expand shows **exactly five** proto values — no PLZ/price/plate invent | ☐ |
| F-3b.2 | **OQ #37 Resolved** — registry covers `job_assigned` + `document_correction_required` (and all channel-matrix events) with deep-link + i18n; missing type fails loudly (no plain-card degrade) | ☐ |

### F-3c — Ride actions locked/unlocked/unavailable
| # | AC | Pass? |
|---|----|-------|
| F-3c.1 | Actions respect `driverJobViewMode`; depends E-2 | ☐ |

### F-3d — Deep links news/doc/profile + return-to-origin
| # | AC | Pass? |
|---|----|-------|
| F-3d.1 | Deep links + return-to-origin; depends F-4c / F-1 | ☐ |

---

## F-4 — Infopoint umbrella (D21)

**Rule:** Do **not** mark F-4 Done until **F-4a…F-4e** Done.

| # | AC | Pass? |
|---|----|-------|
| F-4.0 | Umbrella: F-4a…F-4e Done; Axis V **D21** PASS | ☐ |

### F-4a — Pills below header + swipe + unread badge
| # | AC | Pass? |
|---|----|-------|
| F-4a.1 | Docs/news/help pills below header (L-4); swipe; unread badge | ☐ |

### F-4b — Docs View ≠ Download + preview safe-area
| # | AC | Pass? |
|---|----|-------|
| F-4b.1 | View and Download separate; preview hides tab bar / safe-area (L-5) | ☐ |

### F-4c — News full-page detail (not accordion)
| # | AC | Pass? |
|---|----|-------|
| F-4c.1 | News opens **full-page** detail — accordion FAIL | ☐ |

### F-4d — Help contacts tel/mailto
| # | AC | Pass? |
|---|----|-------|
| F-4d.1 | Help contacts tel/mailto match proto | ☐ |

### F-4e — D21 screenshot sign-off
| # | AC | Pass? |
|---|----|-------|
| F-4e.1 | Proto\|FE; depends F-4a…d | ☐ |

---

## F-5 — Driver auth (splash / login / set-password / reset)

| # | AC | Pass? |
|---|----|-------|
| F-5.1 | Login / forgot / set-password chrome 1:1 proto; **no OTP displayed in UI** (Keycloak delta OK) | ☐ |
| F-5.2 | No email/user enumeration messages | ☐ |
| F-5.3 | Demo fill / `?screen=` debug toys **not** shipped | ☐ |
| F-5.4 | D01 + D02 clone PASS | ☐ |
| F-5.5 | OQ **#2 Resolved** — invite/reset mail is AUTHEON SMTP (not Keycloak). Production invite Done requires AUTHEON mailer + Keycloak action link; from-address is ops `SMTP_FROM` | ☐ |
| F-5.6 | OQ **#18 Resolved** — Keycloak login events populate `lastLoginAt`; Active only after activation/first successful login; no demo OTP / fake last-login | ☐ |

---

## F-6 — Admin auth login / set-password

| # | AC | Pass? |
|---|----|-------|
| F-6.1 | `AdminLoginScreen` / `AdminSetPasswordScreen` chrome 1:1 proto | ☐ |
| F-6.2 | Keycloak-backed; no prototype demo credentials UI | ☐ |
| F-6.3 | A01 clone PASS | ☐ |

---

## F-7 — Driver booked/assigned email + order PDF

**Goal:** Drivers receive one AUTHEON workflow email when a job is marketplace-booked or admin-assigned, with the current transport-order PDF attached.  
**Authority:** OQ #12 Resolved 2026-08-12 · OQ #2 Resolved · PRD `driver_booking_assignment_email_v1` · G-6 / OQ #22–28 for PDF **content**.  
**Owner:** Yasser (FS) · Ismail (SMTP send path).  
**DoD:** Send path green; if PDF generation missing, fail loud (no “PDF attached” lie). Card Done for PDF attach waits on G-6.

| # | AC | Pass? |
|---|----|-------|
| F-7.1 | Email fires on marketplace **accept** (`order_accepted_by_driver`) and admin **assign** (`job_assigned`) only | ☐ |
| F-7.2 | No email on publish (no driver yet) or other driver workflow events | ☐ |
| F-7.3 | Email attaches the **current** transport-order PDF when G-6 can generate it | ☐ |
| F-7.4 | If PDF is missing: send fails loud or omits the “PDF attached” claim — never a lying attachment | ☐ |
| F-7.5 | Same mailer as F-8 (`SMTP_*`); Keycloak does not send this mail | ☐ |
| F-7.6 | In-app / push channels unchanged | ☐ |
| F-7.7 | EN+DE templates exist as ops config — do not invent legal footer/from-address | ☐ |

---

## F-8 — AUTHEON SMTP for all application mail

**Goal:** One BE mailer sends invite, reset, F-7 booked/assigned, and admin alerts.  
**Authority:** OQ #2 Resolved 2026-08-12 · PRD `autheon_mail_all_v1`.  
**Owner:** Ismail.  
**DoD:** Mailer on `SMTP_*`; Keycloak still owns users/tokens; Autheon email contains the action link.

| # | AC | Pass? |
|---|----|-------|
| F-8.1 | BE mailer uses `SMTP_*` for invite, reset, F-7, admin alerts | ☐ |
| F-8.2 | Keycloak does **not** send mail (`execute-actions-email` is not the sender) | ☐ |
| F-8.3 | Invite/reset body includes Keycloak action URL; no generated passwords in email | ☐ |
| F-8.4 | `SMTP_FROM` / domain / link expiry are ops env — not invented in product UI | ☐ |
| F-8.5 | F-5 production invite path uses this mailer | ☐ |

---

# Epic G — Admin Jobs / empty-run / cancel / finance / assign / notes / VIN / schedule

**Prototype:** `Overview`, `AdminDetail`, `EmptyRunReviewPanel`, `JobFinancePanel`, `AdminCancelJobModal`, `AssignDriverDialog`, `InternalNotesPanel`, `NewOrder`  
**Axis V:** A03–A12  
**Dual vocabulary:** Admin cancel codes only in G-4 — never SP Storno list

---

## G-1 — Jobs overview umbrella (A03)

**Rule:** Do **not** mark G-1 Done until **G-1a…G-1b** Done.

| # | AC | Pass? |
|---|----|-------|
| G-1.0 | Umbrella: G-1a…b Done; Axis V **A03** PASS | ☐ |

### G-1a — Status tiles + density + filters + new-job entry (includes retired G-1c)
| # | AC | Pass? |
|---|----|-------|
| G-1a.1 | Status tiles/umbrellas + comfort/dense + persisting filters match proto | ☐ |
| G-1a.2 | `client_status_mapping` labels EN/DE | ☐ |
| G-1a.3 | New job entry path from overview matches proto | ☐ |

### G-1b — RowActionsMenu hide unavailable
| # | AC | Pass? |
|---|----|-------|
| G-1b.1 | Unavailable actions **hidden** (not disabled-grey sprawl) | ☐ |

---

## G-11a — AdminDetail section chrome (A05) — was orphan

| # | AC | Pass? |
|---|----|-------|
| G-11a.1 | Detail sections 01–N chrome/order/titles 1:1 `AdminDetail` | ☐ |
| G-11a.2 | Axis V **A05** structure PASS (content widgets may still be other G-* tasks) | ☐ |

## G-11b — AdminDetailFooter action matrix (A05)

| # | AC | Pass? |
|---|----|-------|
| G-11b.1 | Footer actions match proto matrix by status; unavailable hidden | ☐ |
| G-11b.2 | A05 footer half clone PASS | ☐ |

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
| G-4.4 | OQ **#7 Resolved 2026-08-14** — V1 status gates only (`assigned` \| `accepted`); no pickup/delivery phase invent | ☐ |
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

## G-6 — Transport-order PDF generation UX (A11) — **OQ #27–28 still block Done**

**Goal:** Admin transport-order PDF preview/generate matches proto structure; content contract from Resolved OQs; fail path + V1 auto-retry.  
**Authority:** proto A11 · PRD T17 · OQ #22–26 Resolved · OQ #27–28 Deferred · Ismail PDF BE collab.  
**Owner:** Omar (primary). Ismail BE collab.  
**DoD:** All rows Pass or N/A; #27–28 Resolved/waived before claiming content Done.

| # | AC | Pass? |
|---|----|-------|
| G-6.1 | Preview/generate UX shell matches proto transport-order preview **structurally** | ☐ |
| G-6.2 | **OQ #22 Resolved** — `distanceKm` excluded from PDF payload and `PDF_RELEVANT_FIELDS` | ☐ |
| G-6.3 | **OQ #23 Resolved** — new version + partner notify only on template-rendered field changes | ☐ |
| G-6.4 | **OQ #24 Resolved — fail path:** after binding booking saved, on missing required data or generation failure: keep booking; publish no broken PDF; keep previous active version if any; audit `pdf_generation_failed`; admin sees clear generation-failed error | ☐ |
| G-6.5 | **OQ #24 Resolved — auto-retry:** generation path retries up to **3** times with short backoff (in-request); if all fail → G-6.4 path. No durable out-of-process queue beyond those retries | ☐ |
| G-6.6 | **OQ #25 Resolved** — driver/SP sees active PDF only; history = admin/audit only | ☐ |
| G-6.7 | **OQ #26 Resolved** — SP house number + order-creator phone stay optional; PDF collapses cleanly; no new form mandates | ☐ |
| G-6.8 | **OQ #27 Deferred** — proto placeholders for structure only; legal PASS blocked until client pack. **OQ #5 Resolved** (proto-tokens) covers app chrome only — do not invent PDF legal finals | ☐ |
| G-6.9 | **OQ #28 Deferred** — no external font host at production render; Done waits on local font assets in pipeline | ☐ |
| G-6.10 | Task **G-6 legal/font Done is blocked** until #27–28 Resolved **or** explicit client waiver | ☐ |
| G-6.11 | No shipping prototype “sample PDF everywhere” as production content | ☐ |
| G-6.12 | A11 structural clone may PASS; full content/legal/font clone waits #27–28 | ☐ |

---

## G-7 — Assign / reassign driver (A06)

| # | AC | Pass? |
|---|----|-------|
| G-7.1 | `AssignDriverDialog` assign + reassign modes match proto | ☐ |
| G-7.2 | Empty active-drivers state matches proto; marketplace-accepted **not** reassignable (proto rule) | ☐ |
| G-7.3 | Audit event written on assign/reassign | ☐ |
| G-7.4 | **OQ #11 Resolved** — proto assign/reassign + confirmation note only; no exception-only / phone-email proof invent | ☐ |
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

## G-9 — VIN + schedule-override dialogs (A12) (includes retired G-10)

| # | AC | Pass? |
|---|----|-------|
| G-9.1 | Dialog appears on duplicate VIN per proto uniqueness rules | ☐ |
| G-9.2 | Confirm/cancel outcomes match proto (no silent overwrite) | ☐ |
| G-9.3 | Copy EN/DE from i18n; A12 (VIN half) clone PASS | ☐ |
| G-9.4 | Confirm sheet requires note before override / revert-to-draft | ☐ |
| G-9.5 | Illegal status transitions blocked (BE + UI) | ☐ |
| G-9.6 | A12 (schedule half) clone PASS | ☐ |

---

# Epic H — Admin Drivers / Staff / access / probation

**Prototype:** `ServicePartnersCenterPane`, `StaffPane`, `AccessSwitch`  
**N/A:** `AccountAccessDialog` — **do not implement / do not clone**  
**Axis V:** A14, A15 (tabs except Documents→C), A17, A18

---

## H-1 — Drivers / SP center umbrella

**Rule:** Do **not** mark H-1 Done until **H-1a…H-1b** Done.

| # | AC | Pass? |
|---|----|-------|
| H-1.0 | Umbrella: H-1a…b Done; A14 PASS | ☐ |

### H-1a — SP center chrome (partners \| MDR)
| # | AC | Pass? |
|---|----|-------|
| H-1a.1 | Partners \| MDR chrome matches `ServicePartnersCenterPane` | ☐ |

### H-1b — DriversPane + AccessSwitch
| # | AC | Pass? |
|---|----|-------|
| H-1b.1 | Access = **enabled** \| **disabled** only; invite `pending`\|`failed`\|`accepted` | ☐ |
| H-1b.2 | **`AccountAccessDialog` = N/A** — do not ship | ☐ |
| H-1b.3 | **OQ #6 Resolved** — create shows auto `driverCode` as `AU-41-####`; edit cannot change it; FE never invents format | ☐ |

---

## H-2 — SP profile umbrella (except Documents → C-3)

**Rule:** Do **not** mark H-2 Done until **H-2a…H-2d** Done (+ C-3 for Documents tab).

| # | AC | Pass? |
|---|----|-------|
| H-2.0 | Umbrella: H-2a…d Done; A15 non-C PASS | ☐ |

### H-2a — overview + masterdata
| # | AC | Pass? |
|---|----|-------|
| H-2a.1 | overview + masterdata tabs 1:1 proto | ☐ |

### H-2b — orders tab
| # | AC | Pass? |
|---|----|-------|
| H-2b.1 | orders tab 1:1 proto | ☐ |

### H-2c — changerequests in-modal
| # | AC | Pass? |
|---|----|-------|
| H-2c.1 | changerequests in-modal; ties H-3 | ☐ |

### H-2d — notes + audit tabs
| # | AC | Pass? |
|---|----|-------|
| H-2d.1 | notes + audit tabs 1:1 proto | ☐ |

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
| H-5.3 | No daily-limit MDR toy; OQ **#36 Resolved** — release/status via Profile card only; **no** invented probation notif; release still updates E-7 source | ☐ |

---

# Epic I — Customer Center, feed, audit, Infopoint admin, Settings

**Axis V:** A13, A19, A20, A24, A25  
**Matrices:** notif channels (I-2), `app_settings`

---

## I-1 — Customers + Addresses umbrella

**Rule:** Do **not** mark I-1 Done until **I-1a…I-1b** Done. Depends M-2 title hierarchy.

| # | AC | Pass? |
|---|----|-------|
| I-1.0 | Umbrella: I-1a…b Done; A19 PASS | ☐ |

### I-1a — Customers CRUD
| # | AC | Pass? |
|---|----|-------|
| I-1a.1 | Customers CRUD; delete blocked if in use | ☐ |

### I-1b — Addresses CRUD
| # | AC | Pass? |
|---|----|-------|
| I-1b.1 | Addresses CRUD; separation from Customers preserved | ☐ |

---

## I-2 — Admin notification feed umbrella (T33)

**Rule:** Do **not** mark I-2 Done until **I-2a…I-2d** Done.  
**Authority:** signed-off proto `NotificationFeedPane` · **OQ #29 Resolved** — `docs/requirements/dispatch-notification-feed-spec.md` is **binding** · **OQ #30 Resolved** — BE fields + mark-processed required · PRD T33.  
**Owners:** Karim I-2a…c (FE) · Ismail I-2d (BE).

| # | AC | Pass? |
|---|----|-------|
| I-2.0 | Umbrella: I-2a…d Done; A13 PASS | ☐ |

### I-2a — All/Unread/Read list chrome
| # | AC | Pass? |
|---|----|-------|
| I-2a.1 | All / Unread / Read list chrome match `NotificationFeedPane` | ☐ |

### I-2b — Filter menu severity/source/date
| # | AC | Pass? |
|---|----|-------|
| I-2b.1 | Severity/source/date filters match proto + binding feed spec; matrix only — no invented filter axes | ☐ |

### I-2c — Deep links + bulk + row menu
| # | AC | Pass? |
|---|----|-------|
| I-2c.1 | Deep links + bulk + row menu per proto + binding feed spec; **OQ #32 Resolved** — event names = BE/@shared | ☐ |

### I-2d — BE feed contract (OQ #30 Resolved) — Ismail
| # | AC | Pass? |
|---|----|-------|
| I-2d.1 | UserNotification (or equivalent) exposes severity + open/processed status + processedAt/processedBy as needed by binding feed spec + proto | ☐ |
| I-2d.2 | Mark-processed (or equivalent) endpoint exists and is authorized for admin | ☐ |
| I-2d.3 | FE I-2a…c Open/Processed behaviour blocked Done until I-2d green (or explicit N/A with J-1 row) | ☐ |
| I-2d.4 | Shared DTOs published; no FE invent of dead fields | ☐ |

---

## I-3 — Audit log filters / export

| # | AC | Pass? |
|---|----|-------|
| I-3.1 | Filters + CSV export match `AuditPane` | ☐ |
| I-3.2 | Retention purge UI only if proto shows it; OQ **#4 Resolved** — V1 = existing upload pipeline; **no** invented malware/DSGVO/purge claims. Purge control ships only when proto+ops policy exist | ☐ |
| I-3.3 | OQ **#19 Resolved** — durable source = live BE audit APIs; **no** in-memory FE audit; J-1→J-2 if durability gap | ☐ |
| I-3.4 | A24 clone PASS | ☐ |

---

## I-4 — Infopoint admin umbrella

**Rule:** Do **not** mark I-4 Done until **I-4a…I-4b** Done.

| # | AC | Pass? |
|---|----|-------|
| I-4.0 | Umbrella: I-4a…b Done; A20 PASS | ☐ |

### I-4a — Docs CRUD
| # | AC | Pass? |
|---|----|-------|
| I-4a.1 | Docs CRUD + visibility flags; driver sees after publish | ☐ |

### I-4b — News CRUD + notify
| # | AC | Pass? |
|---|----|-------|
| I-4b.1 | News CRUD + notify flags match proto | ☐ |
| I-4b.2 | OQ **#20 Resolved** — notify uses as-built in-app + email + Web Push; no invented native-push provider | ☐ |

---

## I-5 — Settings umbrella

**Rule:** Do **not** mark I-5 Done until **I-5a…I-5c** Done.

| # | AC | Pass? |
|---|----|-------|
| I-5.0 | Umbrella: I-5a…c Done; A25 PASS | ☐ |

### I-5a — User settings
| # | AC | Pass? |
|---|----|-------|
| I-5a.1 | User pane `app_settings`-backed | ☐ |

### I-5b — System operational policies
| # | AC | Pass? |
|---|----|-------|
| I-5b.1 | System policies match proto; **no** Settings Prototype tab / theme editor | ☐ |

### I-5c — Inactivity + help + upload limits
| # | AC | Pass? |
|---|----|-------|
| I-5c.1 | Inactivity **no Run now**; help contacts; upload limits | ☐ |

---

# Epic M — Admin chrome soft parity

**Note:** Soft only — not an old-layout hard break (unlike Epic L).  
**Axis V:** A02 (+ A19 hierarchy with I-1)

---

## M-1 — Sidebar order + chrome titles (includes retired M-4)

| # | AC | Pass? |
|---|----|-------|
| M-1.1 | Sidebar sequence exactly: Jobs → Notification feed → Service Partners → Staff → Customer Center → Infopoint → Tour documents → Audit log → Settings | ☐ |
| M-1.2 | FE today FAIL order (Tour documents #2, Staff before SP) must be corrected — not “close enough” | ☐ |
| M-1.3 | Nav labels EN match proto (`navJobs`…`navFeatures`); Tour Billing product label = “Tour documents” | ☐ |
| M-1.4 | A02 nav order clone PASS | ☐ |
| M-1.5 | Every top-level nav surface primary h1 = proto `sectionTitle` map (Jobs, Notification feed, Service Partners, **Staff**, Customer Center, Infopoint, Tour documents, Audit log, Settings) | ☐ |
| M-1.6 | Staff page title = **Staff** / Personal — **not** “Staff accounts” / “Personal-Konten” | ☐ |
| M-1.7 | DE Tour documents = Tour-Dokumente (hyphen); DE Admin Konsole spacing matches proto | ☐ |
| M-1.8 | SP center tab “Service Partners” casing; MDR tab DE = Profiländerungen (not invent longer rename) | ☐ |
| M-1.9 | Tour Billing / CC: chrome owns umbrella title; tab content does not promote a second peer h1 | ☐ |
| M-1.10 | EN+DE side-by-side for all 9 nav chrome titles PASS | ☐ |

---

## M-2 — Customer Center title hierarchy

| # | AC | Pass? |
|---|----|-------|
| M-2.1 | One chrome title **Customer Center** + content tabs under it (not tabs above separate competing h1s) | ☐ |
| M-2.2 | Per-tab body uses pane-lead only — **no** peer h1 “Customers” / “Addresses” competing with chrome | ☐ |
| M-2.3 | Hierarchy matches prototype `CustomerCenterPane`; A19 PASS | ☐ |
| M-2.4 | No extra dashboard cards in CC chrome | ☐ |

---

## M-3 — Sidebar foot → own Staff profile

| # | AC | Pass? |
|---|----|-------|
| M-3.1 | Name/avatar foot click opens own Staff profile **iff** Phase 6 still in proto | ☐ |
| M-3.2 | If proto removed foot behavior → document N/A and skip without inventing | ☐ |
| M-3.3 | FE today FAIL: foot = logout only — must match proto or N/A | ☐ |
| M-3.4 | A02 foot behavior signed vs current proto | ☐ |

---

# Epic SEC — Authz / IDOR / session

**Rule:** Do **not** mark SEC Done until **SEC-1…SEC-3** Done. OQ **#4 Resolved** (pipeline-as-is). OQ **#18 Resolved** (keycloak-as-planned).

## SEC — Umbrella

| # | AC | Pass? |
|---|----|-------|
| SEC.0 | SEC-1…3 Done; findings filed as blockers | ☐ |

### SEC-1 — Jobs + Storno IDOR
| # | AC | Pass? |
|---|----|-------|
| SEC-1.1 | Driver A cannot GET/POST problems/cancel on driver B’s job | ☐ |
| SEC-1.2 | Admin cancel/empty-run review require admin token | ☐ |
| SEC-1.3 | Dual vocabulary: SP Storno codes never accepted on admin cancel endpoint | ☐ |

### SEC-2 — Docs + billing IDOR
| # | AC | Pass? |
|---|----|-------|
| SEC-2.1 | Cross-partner SP doc read/download 403 | ☐ |
| SEC-2.2 | Tour-doc + CI endpoints IDOR-safe | ☐ |
| SEC-2.3 | Driver token cannot call admin billing | ☐ |

### SEC-3 — Auth/session
| # | AC | Pass? |
|---|----|-------|
| SEC-3.1 | No OTP displayed in UI; Keycloak-backed | ☐ |
| SEC-3.2 | OQ **#18 Resolved** — session/lastLogin from Keycloak; do not invent alternate session UX | ☐ |
| SEC-3.3 | Collab F-5/F-6 chrome still clone PASS | ☐ |

---

# Epic J — BE catch-up only if prototype+PRD require a gap

**Rule:** Do not open J-2/J-3 until J-1 confirms a real missing/wrong API. Prefer FE adaptation.  
**Owner:** Ismail.

---

## J-1 — Gap log: prototype action → missing/wrong endpoint

**Goal:** Every prototype action that cannot be wired to a live API is logged with evidence — no silent BE invention.  
**Authority:** prototype + PRD + current BE controllers · this table.  
**DoD:** Log exists; each row is WIRED / PLANNED / NOT-A-GAP.

| # | AC | Pass? |
|---|----|-------|
| J-1.1 | Spreadsheet/doc: proto action → expected endpoint → actual BE result | ☐ |
| J-1.2 | Rows classified WIRED / WRONG-CONTRACT / MISSING / N/A | ☐ |
| J-1.3 | No FE invents a dead API to “match old FE” | ☐ |
| J-1.4 | J-2/J-3 stay not started until at least one MISSING/WRONG row is confirmed. **OQ #17 Resolved** — j1-gap-gated; no blanket FE-validator port | ☐ |

---

## J-2 — Implement missing BE endpoint (only if J-1 confirms)

**Goal:** Add the confirmed gap under clean architecture. If J-1 has zero gaps, mark **N/A**.  
**Authority:** J-1 · BE use-case + UoW + `@autheon/shared` DTOs.  
**DoD:** Endpoint exists; FE consumes via Repository; no dual-write to retired tables.

| # | AC | Pass? |
|---|----|-------|
| J-2.1 | Implements only J-1-confirmed gaps — no extra “while we’re here” APIs | ☐ |
| J-2.2 | Use-case + UoW + presentation DTO from shared; AuditService where required | ☐ |
| J-2.3 | Authz/IDOR tests for the new path | ☐ |
| J-2.4 | If J-1 empty → this card N/A | ☐ |

---

## J-3 — Shared package dual-publish on enum change

**Goal:** New/changed enums publish to BE and FE shared in one change.  
**Authority:** A-0 · J-2.  
**DoD:** FE submodule/tag matches BE shared; no local forks.

| # | AC | Pass? |
|---|----|-------|
| J-3.1 | Enum/DTO change lands in BE shared and FE `@shared` together | ☐ |
| J-3.2 | No apps/web string-union fork | ☐ |
| J-3.3 | If no enum change this program → N/A | ☐ |

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

## K-5 — ClickUp hygiene + assignment matrix

**Goal:** Board matches the plans: surviving IDs, owners, Goal/Authority/AC/DoD bodies.  
**Authority:** [`clickup-apply.md`](../clickup-apply.md) · [`task-book.md`](../task-book.md).  
**Owner:** Omar.  
**DoD:** [`clickup-apply.md`](../clickup-apply.md) Parts A–F ticked; leftover `[Person]` tags match the task book.

| # | AC | Pass? |
|---|----|-------|
| K-5.1 | Epics A–N + OQ cards exist in AUTHEON list `901217611464` | ☐ |
| K-5.2 | Retired IDs (L-7, M-4, E-1c, E-1h, G-10, G-1c, F-3e, F-3f) are `canceled` with merge pointer | ☐ |
| K-5.3 | Title `[Person]` + primary assignee match [`task-book.md`](../task-book.md) (single owner) | ☐ |
| K-5.4 | Each surviving card body has Goal · Authority · Acceptance · DoD (copied from AC appendix) | ☐ |
| K-5.5 | OQ cards have no wave prefix; Resolved (#1 #2 #9 #10 #12 #33 #34) are `completed`; Deferred stay `questions` | ☐ |

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
| #4 | RESOLVED — pipeline-as-is; no invented malware/DSGVO claims | B/C upload; I-3 purge soft |
| #17 | RESOLVED — j1-gap-gated; J-2 only after J-1 confirms gap | J-1 / J-2 |
| #18 | RESOLVED — keycloak-as-planned; lastLoginAt + Active from real login | F-5 / SEC-3 |
| #19 | RESOLVED — live-audit-apis; no FE in-memory trail | I-3 |
| #20 | RESOLVED — in-app + email + Web Push (VAPID) as-built | F-3 / I-4 |
| #21 | RESOLVED — Missing = delivery_note + invoice only | B-7 |
| #7 | Cancel vs empty-run phase gates | G-4 edge |
| #11 | Direct-assignment policy | G-7 edge |
| #13–16 | Marketplace windows/filters/sort | E-1 contested rows |
| **#22–28** | **PDF cluster** | **G-6 / T17 entire Done** |
| #29–32 | Feed BE fields | F-3, I-2, J8 extras |
| #35 | RESOLVED — in-app Back only; pushState out of scope | L chrome / driver nav |
| #36 | RESOLVED — profile-card-only; no probation notif event | H-5 / E-7 |
| #37 | RESOLVED — full type registry; fail loud | F-3 |

**Resolved (do not reopen):** #1–3, #7, #9–16, #22–26, #29–37 (and earlier closed #33–34).

---

## Explicit non-AC / hygiene

- `AccountAccessDialog` — **N/A** (proto `null`)
- `reloadDemo` — forbidden; E-5 = React Query only
- Theme editor, Settings Prototype tab, seed timers, slow-upload sim — do not ship
- Epic L chrome must PASS before claiming E/F screen 1:1
- Pixel redesign “improvements” — automatic Axis V FAIL

---

*Appendix for Autheon production alignment. Exact clone; dual cancel vocabularies; PDF G-6 blocked on OQ #22–28 Deferred.*
