# Task split registry — living WBS

**Status:** 2026-08-13 — structure revision (merge pass)  
**Rule:** Parent/umbrella Done only when **all surviving children** Done. Exact clone; no redesign; no invented OQs.  
**Authority:** prototype → PRD → DBML/BE → this registry + binary AC appendices.  
**How to run a card:** [pm-operating-system.md](./pm-operating-system.md)  
**Who owns it:** [assignment-capacity-matrix.md](./assignment-capacity-matrix.md)

Retired IDs are **never reused**. ClickUp status = `canceled` with `Merged into {ID}`.

---

## WBS rules (why cards look like this)

| Keep as one card | Split into children | Do not create a card |
|------------------|---------------------|----------------------|
| One owner, one PR, one surface/contract | XL, two owners, or independent screens | OQ gates (those are AC rows) |
| Same files (empty+loading, nav+titles) | FilterSheet vs JobCard vs access-blocked | Umbrella implementation WIP |
| Dialog family on one admin surface (VIN + schedule) | Implementation vs QA screenshot sign-off | Horizontal “all DTOs then all UI” (except Ismail BE) |

**2026-08-13 merge pass** — too many S cards were the same PR:

| Surviving ID | Absorbs (retired) | Why merge |
|--------------|-------------------|-----------|
| **L-6** | L-7 | Tab bar visual + overlay stacking = one BottomTabBar PR |
| **M-1** | M-4 | Sidebar order + chrome titles = same nav/i18n files |
| **E-1b** | E-1c | Empty + loading = same MarketplaceScreen |
| **E-1g** | E-1h | Access-blocked + inactivity = Portal gated branches |
| **G-9** | G-10 | VIN + schedule-override = A12 confirm dialogs |
| **G-1a** | G-1c | Overview chrome including new-job entry |
| **F-3a** | F-3e, F-3f | List chrome + tab-bar hide; OQ #29–32 is a gate row not a build card |

**Explicitly not merged** (would recreate mega-cards or mix owners):

| IDs | Why they stay split |
|-----|---------------------|
| E-1a / E-1d / E-1f | Results-row vs FilterSheet vs JobCard — different surfaces |
| D-2a vs D-2b…e | Membership rules (Omar) vs UI clone (Marwan) |
| G-11a vs G-11b | AdminDetail body vs footer matrix |
| F-4c vs F-4a | News full-page is a hard FE gap; pills are chrome |
| F-3b / F-3c / F-3d | Expand values vs ride actions vs deep links |
| I-5a / I-5b / I-5c | User vs policies vs inactivity/help/limits — same Settings app, different clusters |
| E-3 | Accept + Mark performed = one job-detail session, one owner |
| N-3 | Vertical slice “zero native dialogs”; split admin/driver would be horizontal |
| K-4 | One QA epic with J1–J10 checklist — not ten cards |
| SEC-1/2/3 | Different IDOR surfaces |

**Explicitly not split further:** G-11a stays L (one screen). C-3 stays L. B-4 stays L.

---

## Wave map (title prefix)

| Wave | Prefix | Epics |
|------|--------|-------|
| 0 | `[W0]` | A, L, N |
| 1 | `[W1]` | B, C |
| 2 | `[W2]` | D (+ G-3/4/7/8 Storno vertical) |
| 3 | `[W3]` | E, F (+ F-7/F-8 mail) |
| 4 | `[W4]` | G (rest), H, I, M |
| 5 | `[W5]` | K, J, SEC-1…3 |
| — | none | OQ-* (questions, not build waves) |

---

## Driver PWA

### L — Shell (Wave 0)

L-1…L-5, **L-6** (includes retired L-7), L-8, L-9. No further split.

### E-1 Marketplace (D05+D06)

Umbrella **E-1** → surviving children:

| ID | Title | Depends |
|----|-------|---------|
| E-1 | Umbrella Marketplace | all children below |
| E-1a | Results-row composition | L-1/L-2 |
| E-1b | Empty + loading states (was E-1b+E-1c) | E-1a |
| E-1d | FilterSheet clone (D06) | L-2 |
| E-1e | Badge + chips rules (T7) | E-1d |
| E-1f | JobCard marketplace anatomy | E-1a |
| E-1g | Portal gated branches — access-blocked + inactivity (was E-1g+E-1h) | L-2 |
| E-1i | D05+D06 screenshot sign-off | E-1a…g |

Retired: **E-1c**, **E-1h**.

### D-2 My Jobs (D13)

| ID | Title | Depends |
|----|-------|---------|
| D-2 | Umbrella My Jobs | D-2a…f |
| D-2a | Bucket membership (active/performed/cancelled+terminals/review) | A |
| D-2b | Control band below shared header (L-4) | L-1/L-4 |
| D-2c | My-jobs JobCard (tour# + status; assigned banner) | — |
| D-2d | Empty / search-miss / soft-cap / loading | N |
| D-2e | SwipeViews axis-lock + pill sync | D-2b |
| D-2f | D13 screenshot sign-off | D-2a…e |

### F-1 Profile (D22/D23)

| ID | Title | Depends |
|----|-------|---------|
| F-1 | Umbrella Profile | F-1a…e |
| F-1a | Landing IA ProfilePaneFull | L-1/L-4 |
| F-1b | MDR one-open + 409 | H-3 journey |
| F-1c | Change-email Cancel\|Primary + code step | — |
| F-1d | Password + appearance (or N/A Keycloak) | L-5 |
| F-1e | D22/D23 screenshot sign-off | F-1a…d |

### F-2 Notification prefs

Keep **single** card. No lettered split.

### F-3 Notifications (D20)

| ID | Title | Depends |
|----|-------|---------|
| F-3 | Umbrella Notifications | F-3a…d |
| F-3a | List chrome + tab bar hidden + OQ #29–32 gate (was a+e+f) | L-5 |
| F-3b | Ride expand five values only | F-3a |
| F-3c | Ride actions locked/unlocked/unavailable | E-2 |
| F-3d | Deep links news/doc/profile + return-to-origin | F-4c, F-1 |

Retired: **F-3e**, **F-3f**.

### F-4 Infopoint (D21)

| ID | Title | Depends |
|----|-------|---------|
| F-4 | Umbrella Infopoint | F-4a…e |
| F-4a | Pills below header + swipe + unread badge | L-4 |
| F-4b | Docs View ≠ Download + preview safe-area | L-5 |
| F-4c | News **full-page** detail (not accordion) | L-5 |
| F-4d | Help contacts tel/mailto | — |
| F-4e | D21 screenshot sign-off | F-4a…d |

### N — Dialogs (Wave 0)

N-1 inventory → N-2 primitive (Omar) → **N-3** migrate all call sites (Yasser, one vertical) → N-4 patterns → N-5 QA. Do not split N-3 by admin/driver.

---

## Admin

### M chrome

| ID | Title |
|----|-------|
| M-1 | Sidebar order **and** page chrome titles EN+DE (was M-1+M-4) |
| M-2 | CC one chrome title + tabs under it (no competing per-tab h1) |
| M-3 | Foot → Staff profile (or N/A) |

Retired: **M-4**.

**Proto order:** Jobs → Notif → SP → Staff → CC → Infopoint → Tour docs → Audit → Settings  
**FE today FAIL:** Tour docs too early; Staff before SP; Staff h1 “Staff accounts”.

| Fail | Task |
|------|------|
| Order + chrome titles EN+DE | **M-1** |
| CC tabs above competing Customers/Addresses h1 | M-2 |
| Foot = logout only | M-3 |
| Tour Billing missing CI tab | B-3 / B-3a / B-4 / B-5 |
| SP profile 3/7 tabs | H-2a…d + C-3 |

### B Tour Billing

| ID | Title |
|----|-------|
| B-3 | Umbrella / 2-tab center shell (A21) |
| B-3a | TourBillingPane 1:1 docs tab (A22) |
| B-4 | CI create + mismatch |
| B-5 | CI review decisions |

### G Jobs

| ID | Title | Axis V |
|----|-------|--------|
| G-1 | Umbrella overview | A03 |
| G-1a | Status tiles + density + filters + new-job entry (was G-1a+G-1c) | A03 |
| G-1b | RowActionsMenu hide unavailable | A03 |
| G-11a | AdminDetail sections 01–N chrome | **A05** |
| G-11b | AdminDetailFooter action matrix | **A05** |
| G-2…G-8 | Keep (vehicle, empty-run, cancel, finance, PDF, assign, notes) | |
| G-9 | VIN + schedule-override / revert-to-draft dialogs (was G-9+G-10) | A12 |

Retired: **G-1c**, **G-10**.

### H SP / Staff

| ID | Title |
|----|-------|
| H-1 | Umbrella drivers table |
| H-1a | SP center partners \| MDR chrome |
| H-1b | DriversPane + AccessSwitch |
| H-2 | Umbrella SP profile |
| H-2a | overview + masterdata tabs |
| H-2b | orders tab |
| H-2c | changerequests in-modal |
| H-2d | notes + audit tabs |
| C-3 | Documents tab (Epic C) |
| H-3…H-5 | Keep |

### I CC / feed / audit / Infopoint / Settings

| ID | Title |
|----|-------|
| I-1 | Umbrella |
| I-1a | Customers CRUD |
| I-1b | Addresses CRUD |
| I-2 | Umbrella feed |
| I-2a | All/Unread/Read list chrome |
| I-2b | Filter menu severity/source/date |
| I-2c | Deep links + bulk + row menu |
| I-4 | Umbrella Infopoint admin |
| I-4a | Docs CRUD |
| I-4b | News CRUD + notify |
| I-5 | Umbrella Settings |
| I-5a | User settings |
| I-5b | System operational policies |
| I-5c | Inactivity (no Run now) + help + upload limits |
| I-3 | Audit keep |

### SEC

| ID | Title |
|----|-------|
| SEC | Umbrella |
| SEC-1 | Jobs + Storno IDOR |
| SEC-2 | Docs + billing IDOR |
| SEC-3 | Auth/session |

---

## Program Done still requires

- Axis V D01–D23 + A01–A25 PASS (K-1/K-2/K-6)
- Journeys J1–J10 (K-4)
- Dual cancel vocabularies
- OQ disposition (no invent); G-6 blocked on #22–28
- No redesign / no toys

---

## ClickUp IDs (AUTHEON `901217611464`)

### Retired this pass (cancel → pointer)

| Retired | ClickUp | Merged into | Surviving ClickUp |
|---------|---------|-------------|-------------------|
| L-7 | `869egzku1` | L-6 | `869egzkua` |
| M-4 | `869ehetj1` | M-1 | `869egzm1u` |
| E-1c | `869eheq0y` | E-1b | `869ehepy0` |
| E-1h | `869eheqa1` | E-1g | `869eheq1p` |
| G-10 | `869egzm17` | G-9 | `869egzm18` |
| G-1c | `869ehet5p` | G-1a | `869ehet5h` |
| F-3e | `869ehet59` | F-3a | `869ehet4u` |
| F-3f | `869ehet5a` | F-3a | `869ehet4u` |

### Umbrellas (reference)

| ID | ClickUp |
|----|---------|
| E-1 | `869ehepxk` |
| F-3 | `869egzm0p` |
| G-1 | `869egzm0w` |
| I-1 | `869egzm1k` |

SOT for **assignees** is the capacity matrix, not leftover `[Person]` tags. After API recovery, retitle `[Person]` to match the matrix (especially E-1 body → Marwan, F-3 chrome → Karim, I-1a → Yasser, G-2 → Omar).
