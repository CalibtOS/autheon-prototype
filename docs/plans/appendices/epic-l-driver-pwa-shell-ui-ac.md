# Epic L — Driver PWA chrome / layout UI (binary AC)

**Why this epic exists:** FE already has a 4-tab `DriverShell` + floating `BottomTabBar`, but **primary screen chrome still matches an older prototype generation** (Marketplace greeting/avatar, sort/filter inside header, no shared `DriverScreenHeader`, bell only on Marketplace, tab bar still visible on pushed screens). Signed-off prototype (2026-07-26+) uses a shared header + results/control bands below it.

**Authority:**
- Prototype: `driver.jsx` (`TabBar`, `DriverScreenHeader`), `driver-ui.jsx`, `styles.css` / `pwa.css`
- Inventory: [Prototype PWA shell](85d38c64-6b39-4c54-a765-10f6c4d115e4), [FE shell gaps](0e3620c0-9f49-4543-9404-a0ae3463b83e)
- PRD: T2 (auth gate), T7–T10 (marketplace/my jobs chrome), T18–T20 (infopoint/notif), T25 (PWA mobile-first)

**Depends on:** none (parallel with Epic A)  
**Blocks:** honest “1:1 Figma” claims for Epics E/F/D screen work  
**Wave:** **0.5** — start with Wave 0 or immediately after A-0; do **before** deep Marketplace card polish

**Card body:** Goal · Authority · Acceptance · DoD — copy each L-* section onto ClickUp ([`clickup-apply.md`](../clickup-apply.md)).  
**Owner:** Omar L-1…L-6, L-8 · Youssef L-9.

---

## Current vs signed-off (summary)

| Concern | Signed-off prototype | FE today | Gap |
|---------|----------------------|----------|-----|
| Bottom tabs | 4: portal / mine / info / profile | Same in `DriverLayout` | IA OK |
| Tab chrome | Floating frosted capsule; neutral active; no purple | Floating `BottomTabBar`; verify active token | Soft |
| Primary header | Shared `DriverScreenHeader` on all 4 tabs | Per-screen headers | **Hard UI** |
| Marketplace | Title + subtitle + bell; **no** greeting/avatar; sort/filter in `.portal-results-row` | `MarketplaceHeader`: welcome + avatar; sort/filter in header | **Hard UI** |
| Bell | All 4 tabs → notifications pane/route | Marketplace only | **Hard UI** |
| My Jobs / Infopoint control bands | Below shared header (equal divider height) | Inside/rolled into local headers | Hard UI |
| Tab bar hide | Job detail (+ full-frame overlays); notifs = full panel | Job detail only; `/notifications` + profile subpages keep tab bar | Hard UI |
| Deprecated desktop | Gone | `RootLayout`, `appPageLayout` orphans, `sidebarOpen` | Hygiene |

---

## L-1 — Shared `DriverScreenHeader`

**Goal:** One shared header on all four driver tabs; equal chrome height.  
**Authority:** proto `DriverScreenHeader` · PRD T7–T10 · Axis V D03/D05/D13/D21/D22.  
**Owner:** Omar.  
**DoD:** L-1.1–L-1.5 Pass; side-by-side divider height.

| # | AC | Pass? |
|---|----|-------|
| L-1.1 | One shared component used by Marketplace, My Jobs, Infopoint, Profile landing | ☐ |
| L-1.2 | Props: `title`, optional `subtitle`, optional `actions` (left of bell), notification open + unread | ☐ |
| L-1.3 | Visual contract: title ~24px/600, subtitle ~14px, bottom border, padding aligned to prototype `.pwa-screen-header` | ☐ |
| L-1.4 | Header is **sibling** of scroll body (not inside `DriverScrollBody`) on all four tabs | ☐ |
| L-1.5 | Side-by-side: grey divider height matches across all four tabs (±2px) | ☐ |

---

## L-2 — Marketplace chrome (remove old layout)

**Goal:** Marketplace matches signed-off PWA chrome: no greeting/avatar; sort/filter in results-row.  
**Authority:** proto `Portal` · PRD T7 · Axis V D05.  
**Owner:** Omar.  
**DoD:** L-2.1–L-2.7 Pass; blocks E-1 Done.

| # | AC | Pass? |
|---|----|-------|
| L-2.1 | **No** `welcomeBack` / greeting line on Marketplace | ☐ |
| L-2.2 | **No** user avatar / initials circle in Marketplace header | ☐ |
| L-2.3 | Title = Marketplace + subtitle explore copy via shared header | ☐ |
| L-2.4 | Sort + filter controls live in **results row** under header (not in header actions) | ☐ |
| L-2.5 | Filter chips row under results row (prototype `.header-chips-row` placement) | ☐ |
| L-2.6 | Bell in shared header opens notifications (same destination as other tabs) | ☐ |
| L-2.7 | Access-blocked Marketplace exception (if product still uses it) matches prototype branch — or documented N/A | ☐ |

---

## L-3 — Bell + notifications chrome on all tabs

| # | AC | Pass? |
|---|----|-------|
| L-3.1 | My Jobs header shows bell + unread badge | ☐ |
| L-3.2 | Infopoint header shows bell + unread badge | ☐ |
| L-3.3 | Profile landing header shows bell + unread badge | ☐ |
| L-3.4 | Unread count source = same driver notification unread API/store as Marketplace | ☐ |
| L-3.5 | Opening notifications uses full-frame panel/route (not desktop anchored popover) | ☐ |
| L-3.6 | `/notifications` (or in-shell pane) uses `detailScreenHandle` / equivalent — **bottom tab bar hidden** | ☐ |

---

## L-4 — My Jobs / Infopoint / Profile bands under header

| # | AC | Pass? |
|---|----|-------|
| L-4.1 | My Jobs: search + sort row is **below** shared header | ☐ |
| L-4.2 | My Jobs: status pills (`active` / `performed` / `cancelled` / `empty-run`) below that row — not inside header component | ☐ |
| L-4.3 | Infopoint: docs / news / help slider below shared header | ☐ |
| L-4.4 | Profile landing: identity + nav list in scroll body; header is title/subtitle/bell only | ☐ |

---

## L-5 — Tab bar visibility rules

| # | AC | Pass? |
|---|----|-------|
| L-5.1 | Four primary tab routes show floating tab bar | ☐ |
| L-5.2 | Job locked/unlocked detail: tab bar **hidden** | ☐ |
| L-5.3 | Notifications: tab bar **hidden** | ☐ |
| L-5.4 | Profile subpages (account, settings, MDR, appearance, …): tab bar **hidden**; back via `DriverSubpageHeader` pattern | ☐ |
| L-5.5 | Infopoint message detail: tab bar **hidden** | ☐ |
| L-5.6 | No double bottom chrome (tab bar + sticky CTA) on any pushed screen | ☐ |
| L-5.7 | **OQ #35 Resolved** — V1 navigation Done = **in-app Back** (`DriverSubpageHeader` / proto chrome) only; no browser `pushState`/`popstate` history stack | ☐ |

---

## L-6 — Bottom tab visual / a11y + overlay stacking (includes retired L-7)

| # | AC | Pass? |
|---|----|-------|
| L-6.1 | Tab ids remain `portal` \| `mine` \| `info` \| `profile` | ☐ |
| L-6.2 | Labels EN/DE match prototype keys (`marketplace`, `myJobs`, `infopoint`, `profile`) | ☐ |
| L-6.3 | Active state = neutral/contrast fill — **not** purple capsule (board §H) | ☐ |
| L-6.4 | Infopoint badge = unread news count; cap display `99+` | ☐ |
| L-6.5 | Safe-area: tab bar + scroll pad clear home indicator (compare prototype calc) | ☐ |
| L-6.6 | Floating vs fixed: keep floating until client decides; document open question if still open | ☐ |
| L-6.7 | Sheets/dialogs portal into shell frame (`data-driver-shell` / `.phone-screen` equivalent) | ☐ |
| L-6.8 | Sheet paint order beats tab bar (no dead taps under capsule) | ☐ |
| L-6.9 | Z-order: sticky < popover < tabbar ≤ sheet < dialog < toast (prototype scale) | ☐ |

---

## L-8 — Hygiene (old desktop layout)

| # | AC | Pass? |
|---|----|-------|
| L-8.1 | Live router never mounts deprecated `RootLayout` hamburger shell | ☐ |
| L-8.2 | `RootLayout` / unused `NotificationBellSlot` / `sidebarOpen` quarantined or deleted | ☐ |
| L-8.3 | Orphan `DashboardPage` / desktop `appPageLayout` pages not reachable as driver IA | ☐ |
| L-8.4 | Storybook may keep deprecated shells only if marked `@deprecated` | ☐ |

---

## L-9 — Side-by-side QA gate (release for chrome)

| # | AC | Pass? |
|---|----|-------|
| L-9.1 | Phone 390×844: four tabs screenshot-diff vs prototype (chrome only) | ☐ |
| L-9.2 | Phone 360 width: compact chrome still usable; filter badge readable | ☐ |
| L-9.3 | Tablet full-bleed: no accidental desktop sidebar / top hamburger | ☐ |
| L-9.4 | Auth screens: no tab bar (login / forgot / set-password) | ☐ |
| L-9.5 | Checklist signed in K-2 (driver) under “App chrome” | ☐ |

---

## Suggested ClickUp titles

1. `[FE][UI] Shared DriverScreenHeader on all 4 tabs`  
2. `[FE][UI] Marketplace: remove greeting/avatar; move sort/filter to results row`  
3. `[FE][UI] Notification bell on My Jobs / Infopoint / Profile`  
4. `[FE][UI] Hide tab bar on notifications + profile/infopoint subpages`  
5. `[FE][UI] My Jobs / Infopoint control bands below shared header`  
6. `[FE] Tab visual + overlay stacking (neutral active; sheets beat tab bar)`  
7. `[FE] Quarantine RootLayout / desktop template leftovers`  
8. `[QA] Side-by-side driver chrome vs prototype PWA`  

---

## Out of this epic (still later waves)

- Marketplace **card** anatomy, filters sheet fields → Epic E  
- Report Problem codes → Epic A  
- Notification **card** content (5-value ride preview) → Epic F-3  
- Admin layout → separate admin chrome epic if needed  
