# AUTHEON — Driver PWA Design: Source of Truth & Remediation Plan

> **Status:** v3.0 — 2026-07-14, incorporating the **Design Direction Board — AUTHEON GmbH, July 2026**.
> **Authority hierarchy (§0):**
> 1. **PRD** (`../requirements/prd.json`) — behavioral authority: workflow, permissions, data, scope.
> 2. **Design Direction Board (July 2026)** — client visual authority: typography, colors, cards, navigation appearance, interaction style.
> 3. **Prototype** (`prototype/project/`) — implementation reference; it must comply with both authorities and is corrected wherever it conflicts.
> 4. **Design documentation** (this file, [`brand-tokens.md`](brand-tokens.md), [`driver-screen-spec.md`](driver-screen-spec.md), [`screenshots/README.md`](screenshots/README.md), [`driver-i18n-index.md`](driver-i18n-index.md)) — the implementation contract derived from those authorities.
>
> Internal design choices remain only where they do not conflict with the PRD or the board.
> **Evidence:** Code audit of `prototype/project/*` + board-compliance audit [`design-direction-board-audit.md`](design-direction-board-audit.md) with rendered screenshots in [`audit-2026-07-14/`](audit-2026-07-14/) (earlier visual audit: `audit-2026-07-10/`).
> **Companion:** `../design-system.md` stays as the short component reference; Appendix A here covers the later production (Next.js/shadcn) mapping.

---

## 0. Design Direction Board — canonical requirements

The board's visual direction is **serious, modern, premium, minimalist, business-oriented** — banking/SaaS/Apple-style business software, efficient and quickly scannable; decorative effects must never reduce readability or hide operational information.

Canonical sections (do not duplicate the rules — reference them):

| Topic | Canonical location |
|-------|--------------------|
| Brand palette, accent rules, "no dominant purple navigation", typography (Inter Tight, 400/500/600, no default uppercase), surfaces/radius/elevation, gradients & motion restraint, status-color conditions, `--cta` review status | [`brand-tokens.md`](brand-tokens.md) |
| Marketplace card content (route, PLZ+city, dates, windows, vehicle, axle, status, compensation right/center-right, conditional registered/deregistered/red-plate metadata with PRD scope guard), navigation IA + active-state rules, header/KPI restraint, filter/sort placement, buttons, slide-to-confirm quality | [`driver-screen-spec.md`](driver-screen-spec.md) |
| Baseline captures + visual assertions | [`screenshots/README.md`](screenshots/README.md) |
| Item-by-item compliance status & open client decisions | [`design-direction-board-audit.md`](design-direction-board-audit.md) |

**Open client decisions** (do not resolve silently): fixed vs floating bottom nav · permitted uppercase meta labels · **primary button color (dark per PDF button board vs purple per §2)** · orange `--cta` binding treatment · animated nav logo mark.
**Resolved 2026-07-14:** registered/deregistered + e-vehicle + red plates = optional V1 job fields (`prd.json` `vehicle_important_info_v1`); header KPI row implemented per PDF §4. The client PDF lives at [`../../Design Direction Board.pdf`](../../Design%20Direction%20Board.pdf).

---

## 1. Executive Summary

The prototype has a good foundation (semantic tokens, client Farbgebung, 7-status color system, JetBrains Mono for data) but **execution drifted away from it almost everywhere**, and the July 2026 Design Direction Board supersedes several earlier internal choices: **Inter Tight replaces Plus Jakarta Sans** as the primary UI font, 700-weight titles give way to a 400/500/600 hierarchy, and the purple active-navigation capsule is prohibited. Drifts and superseded choices get fixed **in the prototype first**. The measurable root causes:

| #   | Root cause                                                                                                                                                                                                                                                                                                                                                | Evidence                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | **Brand unified (2026-07-11).** Client Farbgebung (`#6F29FF` accent) applies to **driver PWA, admin console, and demo chrome** via `:root` tokens. Status purple shifted to `#9333EA` to avoid brand collision; `--st-published` stays logistics blue `#2563EB`. | [`brand-tokens.md`](brand-tokens.md); `styles.css` `:root` |
| 2   | **Typography chaos.** 4 type tokens defined, **20 distinct px font sizes** used (9–30px incl. 9.5/10.5/12.5/13.5px) + 257 inline `fontSize` in JSX. Body text 12–14px — below the 16px mobile minimum.                                                                                                                                                    | CSS + JSX scan                                                                |
| 3   | **No spacing scale.** 23 arbitrary padding/margin/gap values (1–36px); 262 inline `marginTop`.                                                                                                                                                                                                                                                            | CSS + JSX scan                                                                |
| 4   | **709 inline `style={{}}` objects** bypass the design system; 78 unique hex colors (≈30 off-token).                                                                                                                                                                                                                                                       | `admin.jsx` (491), `driver.jsx` (218)                                         |
| 5   | **Pattern gaps** in the two user-named pain points: notifications rendered as a desktop popover inside the phone; filters with mixed idioms, dead date inputs, and no applied-filter visibility.                                                                                                                                                          | `driver-notifications.jpeg`, `driver-filter-sheet.jpeg`, `admin-filters.jpeg` |

---

## 2. Design Decisions to Lock (the "source of truth" contract)

These are the decisions the prototype must embody. Everything in §4–§8 follows from them.

1. **Unified brand = client Farbgebung (2026-07-11).** Primary accent `#6F29FF` applies to **driver PWA, admin console, and demo chrome** via `:root` tokens in `styles.css`. Text `#111111` / `#6E6E73` · canvas `#F5F5F7` · surface `#FFFFFF` · border `#E5E5EA`. Dark mode: `#1C1C1E` / `#2C2C2E` canvas/surface, accent `#8F5BFF`. Canonical reference: [`brand-tokens.md`](brand-tokens.md).
2. **Status colors are frozen semantics**, identical on every surface: draft `#64748B` · published `#2563EB` (logistics blue — **not** brand accent) · assigned `#C2410C` · accepted `#059669` · special-case `#9333EA` (shifted from `#A855F7` to avoid brand collision) · performed `#0F172A` · cancelled `#DC2626` · warn `#EA580C`. Never color-only: pill always carries the text label.
3. **One dark theme token set** via `[data-theme="dark"]` — brand-consistent Apple-like neutrals; admin uses denser table surfaces but same accent/text tokens.
4. **7 type sizes replace 20** (§4.2), set in **Inter Tight** (Design Direction Board) with a **400 body / 500 label / 600 selective-emphasis** weight system — 700+ only as an explicitly justified exception, never the default for titles or headings. No default-uppercase headings or labels (sparing meta markers only, per brand-tokens). Body = 16px on mobile. JetBrains Mono is an internal data font only (tour no., PLZ, VIN, timestamps, money) — never for labels, nav, buttons, headings, table headers.
4b. **Navigation appearance (board §H).** Bottom nav on white surface; active items via black/white/gray contrast, darker text, filled icon, or a subtle neutral marker. **No dominant purple navigation** in driver tab bar or admin sidebar. Fixed-vs-floating stays an open client decision.
4c. **Cards & compensation (board §F).** Marketplace card content, compensation prominence/right-placement, route line, conditional registered/deregistered/red-plate metadata (PRD scope guard), restrained header KPIs, top-positioned filter/sort: per [`driver-screen-spec.md`](driver-screen-spec.md). Moderate radius (cards ≤16px, sheets ≤24px), fine borders, subtle neutral elevation, restrained gradients, minimal transform/opacity micro-animations.
5. **4-pt spacing scale** (§4.3). No off-scale values.
6. **One feedback hierarchy** (§6.2): Toast / InlineAlert / confirm-Sheet / app Banner — and `window.confirm` (20 call sites) is banned.
7. **Every interactive element**: real `<button>`/`<a>`, ≥44px target, visible focus, accessible name. Icon-only controls always get `aria-label`.
8. **Every list screen** ships empty, loading (skeleton), and error states.

---

## 3. Audit Findings (evidence)

### 3.1 Brand & theming fork — CRITICAL

- ~~Brand fork~~ **Corrected 2026-07-11:** the `.phone-shell` purple token scope implements the client brand guide ("Farbgebung") and stays. Still flagged: `--st-published` differs per surface, and special-case `#A855F7` shares the brand's purple family — both need an explicit client decision.
- Top switcher bar "Light" label is near-invisible in dark mode (`driver-dark.jpeg`).

### 3.2 Typography — CRITICAL

- Size distribution: `13px(28) 14px(27) 12px(24) 11px(14) 10px(11) 10.5px(9) 12.5px(9) 15px(5) 24px(4) 9.5px(4)…` — accreted, not designed.
- 9.5–10.5px uppercase mono used for body-level content (form labels, section titles, table headers, stat labels). Below ~11px uppercase mono is decorative, and its ubiquity flattens hierarchy.
- All px (except the 4 tokens) — user font scaling broken; production must be rem-based, prototype should move its tokens to rem too.

### 3.3 Spacing, radius, elevation, z-index — HIGH

- 23 spacing values; card padding alone varies 10/12/14/16/18/20px. Radius tokens exist but 15 raw radii also used. z-index almost clean (20–60) with `998/999` outliers.

### 3.4 Filters — HIGH (user-named)

- **Driver `FilterSheet`** (structurally good: bottom sheet, live "Show N results", presets) — but: date fields are bare text inputs (no picker, no `inputmode`), vehicle type = multi chips while axle = segmented control (two idioms for one decision type), 10px mono labels, and applied filters are invisible after the sheet closes (no chips row, no count badge on the filter button).
- **Admin:** "Filters" reveals only status quick-chips that duplicate the `Status: all` dropdown AND the clickable stat cards — three controls for one dimension, zero for date range / customer / driver / postal / docs state (`admin-filters.jpeg`).

### 3.5 Notifications — HIGH (user-named)

- Driver bell opens a ~320px anchored **desktop popover floating inside the phone viewport** (`driver-notifications.jpeg`). No read/unread, no day grouping, no deep link to the related job, no mark-all-read, no empty state.
- Three badge systems: bell red dot · Info tab red numeral · admin sidebar gray count pill.
- `DriverNotificationsPane` (driver) and `NotificationFeedPane` (admin) are two unrelated designs of the same domain object.
- Feedback is interchangeable today: toasts, `InlineAlert`, `banner`, `PendingNotice`, and 20× `window.confirm` (unstylable, JS-blocking — production blocker).

### 3.6 Component drift — HIGH

- Buttons: `.btn` 14px base but `sm/xs` drop to 12/11px; ~34 `<div onClick>` "buttons" in driver.jsx with no focus/keyboard support.
- Status has 4 visual dialects: `.pill`, dot+UPPERCASE mono (admin table), colored timeline dots (JobCard), plain stat numbers.
- 6 card surface treatments (`card/flat/elev/detail-card/info-card/jobcard`) with inconsistent padding/radius/shadow.
- Dates/times/money have no single formatter: `23.04. → 24.04.` vs `08.05. · P 09:00-12:00 / D 12:00-16:00` vs `Flexible`; `€ 260.00` pill vs plain text.

### 3.7 Accessibility — CRITICAL

- 33 `aria-` attributes total across 12k interactive lines. Header sort/filter buttons and 3 of 4 tab bar items have **no accessible name** (verified in live DOM).
- Dark `--muted-2: #8E8E93` on `#2C2C2E` ≈ 3.4:1 — fails 4.5:1 at the small sizes used.
- Focus-visible only on nav + table rows. Positive: `prefers-reduced-motion` handled; `.touch-target` utility exists but is opt-in.

### 3.8 PWA shell — note

No manifest/service worker/icons. For the **prototype** only a manifest + icons are in scope (installable demo); offline/SW strategy is a production concern → Appendix A.

---

## 4. Design Tokens (prototype `styles.css` — the spec)

Keep the existing var names (they're good); fix values and enforce usage. Production maps 1:1 to shadcn tokens (Appendix A).

### 4.1 Color

- Keep the `.phone-shell` brand token scope (client brand guide "Farbgebung") as one light + one dark block, clearly commented as brand source; scattered purple hardcodes elsewhere become `var(--primary…)` references. ✅ done 2026-07-11
- Admin dark fixes: `--muted: #A8B5C9`, `--muted-2: #8E9CB5` (pass 4.5:1 on `--paper`) ✅; verify every `--st-*`/`--st-*-bg` pair in both themes and in the PWA dark set (`--st-warn` on `--st-warn-bg` is borderline in light — re-derive).
- Kill the remaining off-token hexes: map each to the nearest token or delete the rule.
- Admin `--canvas` → neutral `#F8FAFC` ✅ (PWA canvas stays brand `#F5F5F7`).

### 4.2 Typography (7 sizes, rem — Inter Tight)

Primary font **Inter Tight** (board-mandated; replaces Plus Jakarta Sans). Weight ceiling is **600**; 700+ requires an explicit, documented exception.

| Token             | Size / weight                                   | Use                                                              |
| ----------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `--text-display`  | `clamp(1.75rem, 1.2rem + 1.2vw, 2.25rem)` / 600 | Page titles                                                      |
| `--text-title`    | 1.25rem / 600                                   | Screen titles ("Marketplace"), sheet/dialog titles               |
| `--text-heading`  | 1.0625rem / 600                                 | Card titles, section headings                                    |
| `--text-body`     | **1rem / 400–500**                              | Default — mobile minimum honored                                 |
| `--text-body-sm`  | 0.875rem / 400–500                              | Dense table cells, secondary text                                |
| `--text-caption`  | 0.8125rem / 500                                 | Meta, helper/error text                                          |
| `--text-overline` | 0.6875rem / 600 / +0.06em / uppercase           | **Restricted**: only the approved sparing meta markers (brand-tokens list) — max one level per card, **sans, not mono** |

Line-height 1.5 body / 1.3 headings. Every current 9–11px mono label becomes `caption` (sentence case) or — only if on the approved meta-marker list — `overline`, or is deleted. Status pills, table headers, price/contact labels are sentence-case sans (not uppercase, not mono).

### 4.3 Spacing, radius, elevation, z-index, motion, touch

- **Spacing:** `4, 8, 12, 16, 20, 24, 32, 40, 48`. Cards pad 16 (mobile) / 20 (desktop); screen gutters 16 / 24; card-stack gap 12.
- **Radius:** only `--r-1..4` + `--r-pill`. Inputs+buttons `r-2` · cards `r-3` · sheets/modals `r-4` · pills `pill`.
- **Elevation:** `--sh-1` resting · `--sh-2` raised/hover · `--sh-3` overlay. Borders are the default separator.
- **z-index:** `10` sticky header · `20` popover · `30` tab bar · `40` sheet · `50` dialog · `60` toast. Replace 998/999.
- **Motion:** 120ms micro / 200ms standard / 320ms sheet, `cubic-bezier(0.32,0.72,0,1)`, transform/opacity only, `prefers-reduced-motion` kept.
- **Touch:** ≥44×44px with ≥8px gaps — default on all interactive styles, not the opt-in `.touch-target` class.

### 4.4 Layout & scroll architecture (fixed-height app shell)

*(Added 2026-07 — the shell moved from a document-scroll model to a fixed-height, internally-scrolling one so admin sticky positioning works. `styles.css` `.app`/`.admin`/`.admin-nav`/`.grid-form-layout`.)*

- **App shell (`.app`):** grid `52px 1fr`, pinned to `height: 100dvh` (with a `100vh` fallback), `min-height: 0`, `overflow: hidden`. The header row never scrolls; each surface below it scrolls **internally**. Do **not** use `min-height: 100vh` here — that lets the whole document scroll and breaks `position: sticky` inside the admin content.
- **Driver:** the `.phone-shell` stage is the internal scroller (unchanged behaviour, now guaranteed a definite height).
- **Paged tab views (`SwipeViews`, `driver.jsx` — 2026-07, PR #17):** My Jobs and Infopoint render their tab bodies as a horizontal paged carousel inside the internal scroller. A horizontal drag pages between tabs (adjacent pane peeks in, snaps on release) while each pane keeps its own vertical scroll — `.swipe-viewport { overflow:hidden; touch-action: pan-y }`, `.swipe-track` (flex, `translate3d` + snap transition), `.swipe-pane { flex:0 0 100%; overflow-y:auto }`. The gesture locks to one axis after ~10px; transform-only, reduced-motion safe. Tab pills stay in sync and still switch on tap.
- **Admin (`.admin`):** two-column grid `248px 1fr` bounded to the shell with `grid-template-rows: minmax(0, 1fr)` + `min-height: 0`, so `.admin-main` → `.admin-content` (`flex: 1; min-height: 0; overflow: auto`) inherits a definite height and scrolls internally instead of growing the document. The sidebar `.admin-nav` scrolls independently (`min-height: 0; overflow-y: auto`).
- **Sticky Create/Edit-Job sidebars (`.grid-form-layout`):** the three-column form (`180px 1fr 280px`, `align-items: start`) pins its left section-nav and right live-summary `> aside` to the top of the scrolling `.admin-content` (`position: sticky; top: 0`). Each sidebar caps at `max-height: calc(100dvh - 172px)` with its own `overflow-y: auto` + `overscroll-behavior: contain`, so a tall sidebar scrolls by itself and never overlaps the top bar or footer while the central form scrolls.
- **Narrow desktop fallback (`@media (max-width: 1200px)`):** the form collapses to a single column (`minmax(0, 1fr)`) and the sidebars drop sticky (`position: static; max-height: none; overflow: visible`) so they never overlap the form or force a horizontal scrollbar. This only removes the desktop sticky behaviour; tablet/mobile layouts are reviewed separately.
- **Production note:** use `100dvh`, never `100vh`, for the shell height (mobile URL-bar resize) — already flagged in Appendix A.

---

## 5. Driver PWA Component Standards (prototype inventory → spec)

| Component (driver.jsx)                                                                            | Required state                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Pill` / `.pill`                                                                                  | THE status representation everywhere (admin table too). Dot + label, `--st-*` pairs, never color-only.                                                                                                                                                                            |
| Badge (new)                                                                                       | One numeric badge component: pill radius, 99+ cap, `--cta`/`--destructive` only for action-required, `--primary` otherwise. Dot-only allowed solely on the bell. Replaces the 3 dialects (bell dot / tab numeral / sidebar pill).                                                 |
| `.btn`                                                                                            | Variants: `primary · cta · secondary · ghost · destructive · icon`; sizes `sm 40px · md 44px · lg 48px`; text never below `body-sm`. All `<div onClick>` (~34) converted to `<button>`. Icon variant requires `aria-label`.                                                       |
| `JobCard`                                                                                         | Keep the route-timeline layout (it's good). Normalize: padding 16, radius `r-3`, `--sh-1`; city names `heading`, PLZ mono `caption`, times mono `body-sm` right-aligned, price pill mono `body` semibold. One date/time formatter (`inputFormatters.js` grows into `formatters`). |
| `TabBar`                                                                                          | `<nav>`; ALL items show icon + label (not just active); `aria-current="page"`; numeric Badge (not red dot); safe-area `env(safe-area-inset-bottom)`; **white bar surface, fine border, subtle shadow; active item = darker text + filled icon + subtle neutral marker — no purple capsule (board §H)**; fixed-vs-floating = open client decision.                                                                          |
| `FilterSheet`                                                                                     | See §6.1.                                                                                                                                                                                                                                                                         |
| Sheets (`ReportProblemSheet`, `DailyLimitRequestSheet`, `SameDayOverlapSheet`, `AcceptanceModal`) | One sheet primitive: `r-4` top radius, drag handle + close button, title `title`, sticky footer (Cancel ghost left / primary right — order never flips), focus trap + ESC + scroll-lock, `role="dialog"` + `aria-labelledby`.                                                     |
| `InlineAlert`, `banner`, `PendingNotice`                                                          | Collapse into ONE `InlineAlert` (`info/success/warn/error`, dismissible, `role="alert"` for errors) + ONE app `Banner` slot (offline/preview/update — never stacks).                                                                                                              |
| `DriverNotificationsPane`                                                                         | Full-height page — see §6.2.                                                                                                                                                                                                                                                      |
| `PhoneStatusBar`                                                                                  | Presentation chrome for the demo only — keep out of the design contract (production device provides it).                                                                                                                                                                          |
| EmptyState / Skeleton (new)                                                                       | Icon + one-liner + action; JobCard-shaped skeletons. Required on Marketplace, MyJobs (each tab), Notifications, Infopoint, tour documents.                                                                                                                                        |

---

## 6. Pattern Standards (the user-named pain points)

### 6.1 Filters — one mental model

**Bottom sheet on driver, filter bar + popover on admin; applied filters always visible as removable chips; result count always live.**

Driver `FilterSheet` fixes:

- Date fields → native `type="date"` inputs styled to token spec + preset chips (Today / This week) that fill them.
- PLZ inputs → `inputmode="numeric"`, **digit-only (non-digits stripped on input, 2026-07 PR #17)** + the existing PLZ formatter.
- One selection idiom: segmented control for ≤3 mutually exclusive options; checkbox-chips for multi-select. Vehicle type and axle are both multi-select → both become checkbox-chips.
- Labels: `caption`, sentence case, sans (kill 10px mono uppercase).
- After apply: chips row under the Marketplace header (`80339+ ×` · `SUV ×` · `Reset`), filter icon gets a count Badge, CTA keeps live count ("Show 5 jobs").
- Filters persist per driver (mirrors PRD notification `postal_areas`).

Admin (secondary scope): one `FilterBar` — search (tour/customer/driver/VIN) · status multi-select · date-range · customer/driver combobox · docs state; applied-filter chips + Reset; stat cards remain as _shortcuts that set the status filter visibly_; the redundant quick-chip row is removed.

### 6.2 Notifications — one system

- **Model:** severity (info/success/warn/critical) · category (job, document, request, system) · read state · timestamp · deep link.
- **Driver:** bell opens a **full-height sheet/page** (not a popover): grouped by day; unread = semibold + 8px primary dot; tap navigates to linked job/document; "Mark all read"; designed empty state ("You're all caught up"). Same copy templates feed future web-push.
- **Admin:** same `NotificationList` component inside a right drawer.
- **Badges:** per §5 Badge spec — one language everywhere.
- **Feedback hierarchy (binding):** Toast = non-critical confirmations (auto-dismiss 4s, max 1, above tab bar) · InlineAlert = in-context persistent info/validation · confirm Sheet/Dialog = binding or destructive actions (accept job, cancel, reject document — typed reason where PRD requires) · Banner = app-level (offline/preview/update). **All 20 `window.confirm` call sites are migrated to confirm sheets.**

### 6.3 Async states

Every list/detail: skeleton (mirrors final layout, no spinners for content areas), designed empty state with next action, error state with retry + friendly copy (raw errors never shown; user-facing strings via i18n EN/DE).

---

## 7. Screen-by-Screen Specification (driver PWA — full sweep)

> Live capture of every screen on 2026-07-10 (screenshots in `audit-2026-07-10/`) + per-component code metrics. Worst offenders by measurement: **ProfilePaneFull** (48 inline styles, 8 font sizes, 9 `window.confirm`), **Infopoint** (27 inline, 8 sizes), **ReportProblemSheet** (456 lines, 4 div-buttons). Zero skeletons exist app-wide; empty states exist only in JobTourDocuments, NotificationsList, Infopoint, Profile.

### 7.1 Marketplace (`Portal`, L719)

**Current:** solid JobCard layout; but "2 RESULTS" overline is mono-uppercase; sort + filter header buttons unlabeled; applied filters invisible; no pull-to-refresh affordance; no empty/skeleton state; result list has no last-updated indicator.
**Target:** header per §5 TabBar/Badge; results count as `caption` ("2 jobs available"); sort button becomes a labeled menu (Price / Distance / Pickup date, with direction); applied-filter chips row (§6.1); JobCard skeletons ×3 while loading; empty state "No jobs match — Edit filters / check back later"; pull-to-refresh with spinner + "Updated 9:41" caption; card tap = whole-card button with focus ring.

### 7.2 My Jobs (`MyJobs`, L2158)

**Current:** search placeholder says "Search tour, customer, **driver**, VIN…" — admin copy leaked into the driver app (a driver never searches drivers); 4 scrollable text tabs with gray numeral badges (4th badge dialect); "Assigned directly by admin" banner glued to card top; address 2nd line ("Hamburg") orphans under the timeline dot; sort icon unlabeled; no per-tab empty states.
**Target:** driver-appropriate search ("Search tour no. or city"); tabs = segmented control with §5 Badge counts; direct-assignment marker becomes a small `assigned` StatusPill inside the card meta row, not a banner; address truncates with ellipsis (full address in detail); per-tab empty states ("No active tours — find your next job in the Marketplace" with CTA switching tabs); skeletons per §6.3. **Tabs also switch by horizontal swipe** (paged `SwipeViews`, §4.4), not only by tapping the pills (2026-07, PR #17).

### 7.3 Job detail — locked (`JobLocked`) & unlocked (`JobUnlocked`)

**Current (good bones):** sticky footer actions, Route card with map links, execution-hint banner. Issues: pickup/delivery time values wrap mid-range ("09:00–12:00" split across lines) in half-width columns; "View on map" purple chips; PICKUP/DELIVERY TIME mono overlines; two purple primaries visible at once (Upload + Mark as performed); locked view relies on wordy paragraph to explain masking.
**Target:** times section becomes two stacked rows (label left / `Fr. 08.05.2026` + `09:00–12:00` mono right, never wrapping); "View on map" = ghost buttons with map-pin icon, primary color; exactly ONE primary per screen: `Mark as performed` (48px) in sticky footer — its color treatment (orange `--cta` vs restrained purple primary) is an **open client decision** (see §0/brand-tokens); `Report problem` = secondary outline, Upload = secondary inside its card; locked view masks address rows with a lock icon + one-line caption ("Full addresses visible after acceptance"); status pill in header per §5.

### 7.4 Tour documents (`JobTourDocuments`, `JobOfficialTourDocuments`)

**Current:** has an empty state (best in app); but "UPLOAD AVAILABLE" mono badge is a 5th status dialect; official docs list icon-only view/download buttons without labels; file rows show `v1` version tag in 11px mono; upload button is purple primary competing with footer CTA.
**Target:** upload affordance = dashed drop-area card (icon + "Add document or photo" + camera/file hint) — one tap opens source sheet (Camera / Photos / File); per-file rows: type icon, name `body-sm`, meta caption (`v1 · 21.04. 14:10`), overflow menu (View / Download / Replace); upload states queued→uploading (progress)→failed (retry)→done per §6.3; "UPLOAD AVAILABLE" becomes a plain caption under the section heading, not a badge.

### 7.5 Sheets (`AcceptanceModal`, `ReportProblemSheet`, `DailyLimitRequestSheet`, `SameDayOverlapSheet`)

**Current:** ReportProblemSheet radio-cards are fine but footer shows lone "Cancel" bottom-left (footer order differs from FilterSheet); AcceptanceModal mixes 5 font sizes and uses `window.confirm` as fallback; 4 div-buttons in ReportProblemSheet; reason textarea has a 10-char minimum with no live counter feedback in some paths.
**Target:** all four use the one sheet primitive (§5): title + optional step indicator, content, sticky footer `Cancel (ghost) | Primary (disabled until valid)`; acceptance = binding action → footer primary is CTA orange "Accept bindingly" with the daily-limit line above it; problem report: radio-cards → step 2 reason code select + textarea with live counter ("12 / 10 min characters") + evidence photo attach; all radios/cards are real `<button role="radio">` in a `radiogroup`.

### 7.6 Notifications (`DriverNotificationsPane`, L3042)

Per §6.2 — full-height page replaces the popover. Layout: day group headers (`caption`, "Today / Yesterday / 21.04."), rows = icon by category, title `body` (semibold if unread) + unread dot, snippet `caption` 1-line, timestamp caption right; tap deep-links (job/document/request); "Mark all read" text button in header; empty state "You're all caught up"; bell badge numeric per §5.

### 7.7 Profile (`ProfilePaneFull`, L3357) — flagship fix, currently the worst screen

**Current mess (measured + visual):** one 2085px scroll dumping 6 unrelated content types; 3 different section-title styles on one screen (`DAILY ACCEPTANCE LIMIT` bold mono vs `HELP & SUPPORT` small mono vs plain labels); required-field asterisks (`COMPANY *`) on **read-only** display data; email wraps mid-word ("jordan.blake@example.co m"); label column forces value column to wrap; toggles have labels _above_ instead of beside; a developer disclaimer ("Android supported in app flow. iOS requires home-screen installation…") rendered as a dashed UI box; raw native `<select>` for vehicle type while axle is a segmented control; 9 `window.confirm` calls; hotline + sign-out all inline on the same scroll.
**Target — restructure into a grouped settings screen:**

1. **Identity header** (not a card): avatar 56px, name `title`, `driver-id` mono caption, ACTIVE StatusPill.
2. **Daily limit card:** heading "Daily acceptance limit", progress bar `2/3 accepted today` (`--primary` fill, `--st-warn` at limit), caption with pickup-date context, secondary button "Request higher limit" → `DailyLimitRequestSheet`.
3. **Master data card:** heading + caption "Managed by operations — request changes below"; rows as _definition list_ (label caption above value `body`, full width — kills wrapping + asterisks; email/phone as tappable `mailto:`/`tel:` links); primary-ghost "Request changes".
4. **Notification preferences card:** switch rows (label + description left, switch right, 44px row); vehicle type + axle both checkbox-chip groups (same idiom as FilterSheet §6.1); postal-area chip input with add field (**digit-only**, 2026-07 PR #17); the iOS/Android note becomes a one-line `InlineAlert info` shown _only when push permission is unavailable_.
5. **Help & support → Infopoint Help tab**: dispatcher hotline as tappable card (`tel:`), email support (`mailto:`). No FAQ accordion in V1.
6. **Sign out:** destructive-outline button, own section, confirm sheet (not `window.confirm`).
   All section headings = `heading` sentence case; single card style; every confirm via sheet primitive.

**Update 2026-07 (Task 1 — Account & sign-in):** a driver-owned **credential card** now sits directly under the identity header, *above* the master-data card (`.account-signin-card`). Unlike master data (operations-managed, "request changes"), the sign-in email is **self-service** — the driver changes it without ops approval. Card = 🔑 title, an `.account-email-row` showing the current address with a **verified** state (`.account-email-verified`, small green dot + "Verified account" label — text always present) or a **pending** amber `.pill.assigned` badge while a change is in flight, and a full-width secondary "Change email address" button opening `ChangeEmailSheet`. The sheet is a single bottom sheet advancing **enter new address → confirm with 6-digit code → updated**: the new address only becomes active after the code sent to the *new* inbox is confirmed; the old inbox stays live until then and is notified on success (`emailChangedNotify*`). Verification code uses the `CodeInput` primitive (see driver-screen-spec). Compliance note: the verified badge references `var(--st-ok, #1f9d55)`, a semantic that is **not yet defined** in `:root` (falls back to a hardcoded green) — see brand-tokens.md.

### 7.8 Infopoint (`Infopoint`, L3729)

**Current:** two text tabs with gray numeral badge; document rows OK but icon-only download buttons unlabeled; meta line mixes sans + mono mid-line (`Operations · Global · v1.3` sans, `04.05. 09:10` mono); active tab keeps red "2" badge while you're on it; news items lack read/unread logic tie-in with the tab badge; 27 inline styles, 8 font sizes.
**Target:** segmented tabs with Badge counts (badge clears as items are read); document row = same row grammar as tour documents (§7.4) with labeled actions; news items: unread dot + semibold title, read = regular; meta = one caption line, dates via formatter; empty states per tab. **Tabs also switch by horizontal swipe** (paged `SwipeViews`, §4.4), not only by tapping the pills (2026-07, PR #17).

### 7.9 App chrome (`TabBar`, header, `PhoneStatusBar`)

Per §5: all 4 tab items labeled (Marketplace / My jobs / Info / Profile), `aria-current`, numeric badges; active state = neutral contrast marker (no purple capsule — board §H); welcome header (avatar, greeting, bell) only on Marketplace — other tabs use plain title header (current behavior is right, formalize it); the restrained KPI row (Available / Booked / Open documents) was implemented then **removed at client request 2026-07 (PR #17)** — the counts duplicate the My Jobs tab badges; re-add only on explicit client ask; `PhoneStatusBar` excluded from the design contract.

---

## 8. Prototype Remediation Worklist (phased, in-place)

**W1 — Tokens (`styles.css` only)**

1. ~~Delete purple fork~~ → **kept + documented** as the official brand scope (§2.1); purple hardcodes tokenized to `var(--primary…)`. ✅ 2026-07-11
2. Collapse 17 dark blocks → single `[data-theme="dark"]`; apply §4.1 contrast fixes.
3. Replace type tokens with the 7-size rem scale; add spacing/z-index custom props; map the 30 off-token hexes.
4. Fix switcher-bar dark contrast; neutral `--canvas`.

**W2 — Mechanical sweep (driver.jsx, then admin.jsx)**

5. Replace all inline `fontSize`/`marginTop`/spacing/color styles with token utility classes (`.stack-8/12/16`, `.text-caption`, …). Target: inline `style={{}}` ≈ 0 (dynamic coordinates only).
6. Convert `<div onClick>` → `<button>`; `aria-label` every icon-only control; label all tab items; focus-visible everywhere.

**W3 — Primitives & patterns (driver first)**

7. Sheet primitive (focus trap/ESC/footer order) + consolidate InlineAlert/banner/PendingNotice; migrate all 20 `window.confirm`.
8. Unified Badge + StatusPill everywhere; `formatters` module (date/time-window/money/PLZ).
9. `FilterSheet` per §6.1 + applied-chips row + filter count badge.
10. Notifications full-height page per §7.6.
11. EmptyState + Skeleton primitives; wire per §6.3 into every list.

**W4 — Screen rebuilds per §7**

12. Profile restructure (§7.7 — flagship) + Infopoint Help tab (contacts only).
13. My Jobs (§7.2), Job detail + documents (§7.3–7.4), sheets (§7.5), Infopoint (§7.8), Marketplace polish (§7.1).

**W5 — Admin alignment + validation**

14. Admin table: StatusPill reuse, docs progress badge, FilterBar per §6.1.
15. `manifest.webmanifest` + icons (installable demo); `theme-color` per scheme.
16. Extend `_audit-prototype.mjs` with design-consistency checks: fail on raw hex outside tokens, px font sizes, inline-style regression, unlabeled icon buttons, `window.confirm`. (Governance gate — the script already audits the PRD; now it guards the design contract.)
17. Visual QA (375/1440, both themes) + keyboard pass: marketplace→filter→accept, detail→report problem, notifications, profile.

**W6 — Design Direction Board remediation (2026-07-14 audit)** — reframes the remaining visual work around [`design-direction-board-audit.md`](design-direction-board-audit.md):

18. Typography source: Inter Tight loaded + `--font-sans`; weight normalization to ≤600; de-uppercase pills/table headers/labels/slide copy (audit #1–4). ✅ 2026-07-14
19. Navigation: neutral driver tab-bar surface + active marker; neutral admin sidebar active (audit #7–9). ✅ 2026-07-14
20. Surfaces: unified `--canvas` app background, neutral hover wash/shadows/toast, moderate radii, gray secondary-button outline (audit #6, 12–14, 27). ✅ 2026-07-14
21. Marketplace card: status pill + tour number from existing data; conditional metadata stays pending PRD (audit #15/17/19). ✅ 2026-07-14
22. Items intentionally **not** implemented pending client/PRD decisions: §0 open-decision list (fixed/floating nav, uppercase set, primary-button color, `--cta` orange, animated nav mark).
23. Client PDF received (same day): marketplace/My-Jobs cards rebuilt to the reference layout (route text line, pickup/delivery legs, footer meta + right price); important-vehicle-info tags implemented end-to-end (PRD/schema resolved, admin form controls, card + detail rendering); restrained header KPI row added. ✅ 2026-07-14

**Functionality guarantee:** every W-item is a presentation/markup change on top of the existing store logic (`store.js` untouched); flows, business rules, and i18n keys are preserved — copy changes go through `i18n.js` (EN+DE) only. Re-run `node project/_audit-prototype.mjs` + `_verify-seed.mjs` after each phase to prove PRD behavior is intact.

---

## 9. Accessibility Baseline (WCAG 2.1 AA)

1. Contrast ≥4.5:1 text / 3:1 UI+large in both themes (incl. every StatusPill pair).
2. `aria-label` on all icon-only controls; labels on all tab items.
3. Real buttons/links everywhere; admin rows = focusable row-links.
4. Sheets/dialogs: focus trap, ESC, return-focus, `aria-labelledby`.
5. Live regions: toasts `aria-live="polite"`, errors `role="alert"`, async containers `aria-busy`.
6. Keyboard pass per release: filter sheet, accept flow, notifications, jobs table.
7. `lang` switches with locale; `Intl` date/number formatting; layouts tested against ~30% longer German strings.

---

## Appendix A — Production Migration (Next.js 15 + Tailwind + shadcn/ui)

_For when the prototype design contract is implemented as the real driver PWA. Summary of the architecture review:_

- **Tokens:** the §4 vars map 1:1 to shadcn HSL convention (`--background/--surface/--foreground/--primary/--accent/--border` + `--status-*` pairs) in `globals.css`; Tailwind `extend` maps colors/radius/shadow/fonts; fonts via `next/font` (self-hosted — GDPR + offline), `next-themes` class strategy.
- **Component mapping:** `.btn`→shadcn Button+CVA · `Pill`→StatusPill on Badge · sheets/modals→shadcn Sheet/Dialog/AlertDialog (replaces the hand-rolled Portal, which has no focus trap) · admin panes→DataTable (TanStack) · toasts→sonner · icons→lucide-react (delete bespoke `Ic` map) · i18n.js→next-intl with `status.*` namespace shared by both surfaces.
- **App structure:** route groups `(driver)`/`(admin)` with two AppShells (BottomTabBar + safe areas / Sidebar + breadcrumb).
- **PWA layer:** `app/manifest.ts` (standalone, portrait, maskable icons, shortcuts "My Jobs"/"Upload document"); Serwist service worker — precache shell, `NetworkFirst` (3s timeout) for job lists with "offline, showing cached data" InlineAlert, `StaleWhileRevalidate` for detail/i18n, **BackgroundSync + IndexedDB outbox for document uploads** (idempotent via client UUID; iOS fallback: flush queue on `online`/foreground); `100dvh` not `100vh`; purge SW caches on logout; custom install prompt (`beforeinstallprompt` + iOS instructional sheet).
- **Migration order:** tokens → primitives (StatusPill first) → overlay layer → shells → driver composites/screens → admin → PWA layer → delete prototype CSS; CI gates: zero inline styles, zero raw hex, jest-axe, Lighthouse a11y = 100.

## Appendix B — Governance

- Prototype: `_audit-prototype.mjs` design checks (W5.16) run in CI/pre-commit.
- Production: ESLint `react/forbid-dom-props` (style), stylelint raw-hex/px bans, `eslint-plugin-jsx-a11y` strict, Playwright screenshot diffs (6 core screens × 2 themes × 375/1440px).
- Rule: a change that needs a new color/size adds a token _and_ updates this doc — or it doesn't merge.
- Definition of Done per screen: all async states, keyboard pass, both themes, DE strings, axe clean.

---

## 10. Vehicle Domain Restructure — Implementation Plan (2026-07-26, PRD v2.8)

Driven by the client confirmation **“Systemlogik Fahrzeugeingabe”**. Business/data spec: `prd.json` v2.8 + `docs/archive/2026-07/prd-changelog-since-2026-07-26.md`. Visual contract: [`design-direction-board-remediation.md`](design-direction-board-remediation.md) “Vehicle domain restructure (V1–V6)”. Previous-state audit: [`design-direction-board-audit.md`](design-direction-board-audit.md) “v1.3 addendum”.

### 10.1 Implementation sequencing (dependency-ordered)

| Step | Work | Depends on | Notes |
|---|---|---|---|
| 1 | **Domain layer** — canonical constants (`VEHICLE_TYPES`, `TRANSPORT_TYPES`, `REGISTRATION_STATUSES`), normalizers, `requiresRedLicencePlates` policy, `validateVehicleForm`, label resolvers, compatibility boundary (`normalizeVehicleDomain`) | — | Must land first: every later step imports from it. Nothing downstream may re-implement a rule. |
| 2 | **Persistence / seed + fixtures** — canonical seed values with all four matrix cases represented; approved vehicle types only | 1 | Do **not** write a destructive production migration — the two data blockers in §10.3 must be cleared first. |
| 3 | **i18n** — EN/DE keys for all three vehicle types, the four category labels, both characteristics and the derived notice; retire old keys only after confirming zero `t()` references | 1 | Parity check (`_audit-i18n.js`) gates the step. German labels verbatim from the client source. |
| 4 | **Shared component** — `DriverUI.RedPlatesRequiredNotice` in `driver-ui.jsx` | 1, 3 | **Must** live in the shared primitives module: `driver.jsx` and `admin.jsx` share one global lexical scope, so a same-named component declared in both silently resolves to whichever script loads last. |
| 5 | **Admin Backend UI** — vehicle entry rebuild + job detail + jobs table + save-path rejection handling | 1, 3, 4 | |
| 6 | **Driver PWA** — card, marketplace preview, booking dialog, complete order view, filter sheet, notification prefs, icon map | 1, 3, 4 | |
| 7 | **Downstream outputs** — CSV export, transport-order summary text, order-edit audit/diff field list | 1 | |
| 8 | **Tests + visual baselines** | 2–7 | Matrix + entry + approved-values-only + raw-JSX-leak guard + responsive; refresh visual baselines last. |
| 9 | **Docs sync** | 1–8 | PRD + changelog + context pack + schema + logical model + design docs + i18n index. |

### 10.2 Shared-component updates

| Component | Change |
|---|---|
| `DriverUI.RedPlatesRequiredNotice` (**new**, `driver-ui.jsx`) | The single derived-notice component for **both** apps. Four variants: `tag`, `banner`, `admin-banner`, `admin-pill`. Accepts a `job` **or** explicit `registrationStatus`/`transportType` (the live admin form state is not yet a job). Renders nothing unless *Deregistered + Own axle*. |
| `AuthStore` vehicle contract (**new exports**) | `VEHICLE_TYPES` · `TRANSPORT_TYPES` · `REGISTRATION_STATUSES` · `selectableVehicleTypes` · `normalizeVehicleType` · `isAcceptableVehicleTypeForWrite` · `normalizeTransportType` · `normalizeRegistrationStatus` · `isValidVin` · `isReadyToDriveApplicable` · `validateVehicleForm` · **`requiresRedLicencePlates`** / `jobRequiresRedLicencePlates` · `vehicleTypeLabel` / `transportTypeLabel` / `registrationStatusLabel` / `redPlatesRequiredLabel`. |
| `Ic` vehicle icons (`driver.jsx`) | `VehicleCar` / `VehicleLightTruck` kept, **`VehicleTruck` added**; **`VehicleSuv` / `VehicleVan` / `VehicleClassic` deleted** with their types. The map covers exactly the three approved types. |
| `VehicleFlagTags` (`driver.jsx`) | Gains `characteristicsOnly` so a detail view that already lists registration status as a row does not repeat it as a tag. |
| Chip / segmented / input primitives | **Reused unchanged** — `.chip.actionable`, `.seg`, `.input`, standard focus ring. Only ARIA roles were added (`radiogroup`/`radio` for single-select, `aria-pressed` for the independent characteristics). |
| Retired | `displayAxle` / `displayAxleAdmin` / `canonAxle` (three separate mapping tables) → the shared store resolvers. |

### 10.3 Migration dependencies

- **Safe and reversible now:** `axle_type` → `transport_type` (known 1:1 over every historical spelling); `PKW`/`Car` → `passenger_car`; drop `red_license_plates` **and** `red_license_plate_number` (no value is retained — back up first if production rows hold data); add `ready_to_drive default false`.
- **BLOCKED on client approval — two data questions before the schema can tighten:**
  1. `jobs.vehicle_type` becomes the `vehicle_type` **enum**. Any existing row holding SUV / Van / Transporter / Oldtimer / Classic / `LKW < 3,5t` has **no approved target value**, so the cast fails until the client supplies a mapping (or approves discarding those rows). Do not guess.
  2. `vehicle_registration_status` becomes **`NOT NULL`**. Rows with a null status have no approved default — choosing one would fabricate a red-plate decision.
- **No destructive migration is written until both are cleared.** The prototype already enforces approved-values-only because its store is seeded in memory; production data has not been surveyed against these blockers.
- Full field-by-field table + rollback behaviour: `docs/database/logical-model.md` → “Migration notes (backend)”.

### 10.4 Verification

**Desktop / mobile / tablet.** Per §9 and the existing viewport policy — no separate tablet-only layout is introduced (explicit non-goal).

| Viewport | Surfaces to verify |
|---|---|
| **Desktop 1440×1100** (Admin Backend) | Create/Edit Job vehicle section (all four category controls + derived banner), job detail, jobs table, assign/reassign dialogs, toast on `invalid_vehicle` |
| **Mobile 375** (Driver PWA, primary) | Marketplace card tag row, marketplace preview, booking dialog, complete order view, filter sheet, notification prefs |
| **Tablet (wider phone frame)** | Same driver surfaces — tag row wrap and banner reflow only; layout is fluid, not a distinct breakpoint |

**Long-value cases to exercise at every viewport:** longest vehicle-type labels (`Truck up to and including 7.5 t` / `LKW bis einschließlich 7,5 t`), long `manufacturer model` pairs (`Mercedes-Benz Atego 7.5 t`), the wrapping warning strings (`Red licence plates required` / `Rote Kennzeichen erforderlich` + the detail sentence), and a 17-character VIN. Required outcome: content wraps, the page body **never** scrolls horizontally, and the price keeps its right position on the card footer.

**Visual regression.** Affected baselines: admin job overview · job detail (draft + assigned) · new order form · edit order form · assign/reassign dialogs · admin toast · driver marketplace · marketplace locked detail · my jobs (active/performed/cancelled) · filter sheet · acceptance modal. Refresh **after** code is final (`npm run test:regression:visual:update`), both themes, and review each diff rather than blanket-accepting. The committed cross-machine `prototype-shell` baseline is intentionally left untouched.

**Accessibility.** Single-select groups expose `role="radiogroup"` + `role="radio"` + `aria-checked`; the independent characteristics use `aria-pressed` (they are toggles, not a radio set) — this is what makes duplicate/contradictory selection impossible **by component design** rather than by validation. The VIN error sets `aria-invalid` + `aria-describedby`. The derived notice uses `role="status"` so it is announced when the combination changes, and is always **text-labelled** (never colour-alone). Keyboard pass, both themes, DE strings and axe-clean per the §9 Definition of Done. All controls are real `<button>`/`<select>` elements — the previous vehicle-type chips were clickable `<span>`s.

**Downstream / document outputs.** CSV export gains `vehicleType`, `manufacturer`, `vehicleModel`, `licencePlate`, `vin`, `transportType`, `registrationStatus`, `electricVehicle`, `readyToDrive` and the derived `requiresRedLicencePlates` (replacing raw `vehicle`/`axle`). The transport-order summary text lists the four categories, both characteristics, and appends the red-plate requirement line **only** when derived true — and **never** a red-plate number. Any production PDF/email template rendering the old fields must be re-checked against this list.

---

## Changelog

- **v3.2 — 2026-07-23 (PR #17 — figma-comment adjustments).** Reflected from `driver.jsx`/`admin.jsx`/`styles.css` (merge `14526e9`): (1) **Swipe/paged tab navigation** — My Jobs and Infopoint tab bodies became a horizontal paged carousel (`SwipeViews`); a swipe pages between tabs while vertical scroll is preserved (§4.4, §7.2, §7.8; new `.swipe-*` CSS). Client-feedback request. (2) **Marketplace KPI row removed** at client request — Available / Booked / Open documents duplicated the My Jobs tab badges (§7.9; `.kpi-row`/`.kpi-chip` CSS + `kpi*` i18n now unused). (3) **Digit-only numeric inputs** — driver preferred-postal + Marketplace filter PLZ, and admin Create/Edit-Job postal/house-no/distance strip non-digits; phone fields allow a leading `+`; driver-offer allows one decimal separator; alternate-contact stays free text (§6.1, §7.7). Bug report. No token/DDB-contract changes.
- **v3.3 — 2026-07-26.** New §10 **Vehicle Domain Restructure** implementation plan for PRD v2.8 (client confirmation “Systemlogik Fahrzeugeingabe”): dependency-ordered sequencing, shared-component updates (new `DriverUI.RedPlatesRequiredNotice` + the `AuthStore` vehicle contract; SUV/Van/Classic icons removed, neutral legacy fallback added), migration dependencies incl. the **blocked** legacy vehicle-type mapping, and desktop/mobile/tablet + visual-regression + accessibility + downstream-output verification. No new tokens: the derived red-licence-plate notice reuses the existing `--st-warn` / `--st-warn-bg` semantic pair (recorded in brand-tokens.md).
- **v3.1 — 2026-07-21.** Post-remediation feature work reflected from `styles.css` (commits `3ef6597` Task 3, `1cdf1a7` Task 1): new §4.4 **Layout & scroll architecture** documenting the fixed-height app shell (pinned header, internally-scrolling driver/admin surfaces) and the sticky Create/Edit-Job form sidebars with the ≤1200px stack fallback; §7.7 Profile gains the driver-owned **Account & sign-in** credential card and self-service change-email flow. No token/behavior changes to the DDB remediation contract; the `--st-ok` verified-badge token is flagged as undefined in brand-tokens.md.
- **v3.0 — 2026-07-14.** Incorporated the client **Design Direction Board (AUTHEON GmbH, July 2026)**: authority hierarchy rewritten (§0 — PRD behavior / board visuals / prototype as compliant reference / docs as contract); Inter Tight replaces Plus Jakarta Sans as primary UI font; typography re-based on 400/500/600 with 700+ as exception-only; purple active-navigation capsule requirement removed and replaced by the client's black/white/gray navigation direction ("no dominant purple navigation"); marketplace-card content, compensation placement, route line, conditional registered/deregistered/red-plate metadata (PRD scope guard), restrained KPI/header, restrained gradients, minimal micro-animations, moderate radius + subtle elevation added via canonical sections in brand-tokens/driver-screen-spec; status colors confirmed text-labelled and restrained; W6 remediation phase added from `design-direction-board-audit.md`. Accessibility, tokenization, reusable-component, async-state and visual-regression work from v2.0 is preserved; dark theme remains an internal extension that must not redefine the client's light-theme direction.
- **v2.0 — 2026-07-10.** Original source-of-truth contract + prototype remediation plan (W1–W5).
