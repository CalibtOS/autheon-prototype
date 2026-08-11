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
4b. **Navigation appearance (board §H).** Bottom nav on white surface; active items via black/white/gray contrast, darker text, filled icon, or a subtle neutral marker. **No dominant purple navigation** in driver tab bar or admin sidebar. Normal installed Driver PWA screens use a floating rounded capsule inside the edge-to-edge bottom safe-area/page surface; document-focused views hide it.
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
| `TabBar`                                                                                          | `<nav>`; ALL items show icon + label (not just active); `aria-current="page"`; numeric Badge (not red dot); safe-area `env(safe-area-inset-bottom)`; **white bar surface, fine border, subtle shadow; active item = darker text + filled icon + subtle neutral marker — no purple capsule (board §H)**. Normal installed Driver PWA screens keep the visible nav as a floating rounded capsule inside the edge-to-edge bottom safe-area/page surface; document-focused views hide it. |
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

**Status 2026-07-27 — source sheet implemented (W7).** The "one tap opens source sheet" part of the target above is now live and is the *only* way the camera can be reached. `UploadSourcePicker` + `UploadSourceSheet` (`driver.jsx`) present **Take photo** (`capture="environment"`, images only) and **Choose file** (plain OS picker, `application/pdf` + supported images, no `capture`) after the document-type step, for all three driver upload entry points including *Replace file*. Full interaction contract in [`driver-screen-spec.md`](driver-screen-spec.md) → "Document upload — source selection". Still open from the target above: overflow menu on file rows, and the queued→uploading→failed→retry state machine (the prototype store commits synchronously, so there is no async upload to stage).

### 7.5 Sheets (`AcceptanceModal`, `ReportProblemSheet`, `DailyLimitRequestSheet`, `SameDayOverlapSheet`)

**Current:** ReportProblemSheet radio-cards are fine but footer shows lone "Cancel" bottom-left (footer order differs from FilterSheet); AcceptanceModal mixes 5 font sizes and uses `window.confirm` as fallback; 4 div-buttons in ReportProblemSheet; reason textarea has a 10-char minimum with no live counter feedback in some paths.
**Target:** all four use the one sheet primitive (§5): title + optional step indicator, content, sticky footer `Cancel (ghost) | Primary (disabled until valid)`; acceptance = binding action → footer primary is CTA orange "Accept bindingly" with the daily-limit line above it; problem report: radio-cards → step 2 reason code select + textarea with live counter ("12 / 10 min characters") + evidence photo attach; all radios/cards are real `<button role="radio">` in a `radiogroup`.

### 7.6 Notifications (`DriverNotificationsPane`, L3042)

Per §6.2 — full-height page replaces the popover. Layout: day group headers (`caption`, "Today / Yesterday / 21.04."), rows = icon by category, title `body` (semibold if unread) + unread dot, snippet `caption` 1-line, timestamp caption right; tap deep-links (job/document/request); "Mark all read" text button in header; empty state "You're all caught up"; bell badge numeric per §5.

**Superseded in part 2026-07-29 — see §7.12.** The card anatomy, the interaction model and the deep-link behaviour are now specified there: category is a **text chip**, not an icon; the snippet is clamped to **two** lines; tour events expand **inline** instead of only deep-linking; and message/document notifications deep-link to the exact entity. Day grouping, the unread dot, *Mark all read*, the empty state and the bell badge are unchanged.

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

**Update 2026-07 (Task 1 — Account & sign-in; nav IA 2026-07-27):** sign-in email is a Profile **Account** nav row (`profileNavChangeEmail`, `Ic.Mail`) opening a **centered** `ChangeEmailSheet` with Cancel|Primary footer (same grammar as Sign out). Enter → confirm-with-code → success; pending resume on reopen; `accountSigninHint` in the enter step; localized `CodeInput` aria. Probation card sits under identity on the main Profile list. (Supersedes the earlier standalone `.account-signin-card` + bottom-sheet description.)

**Update 2026-07-30 - configurable help mail actions:** the Profile Help
rows **Feedback** and **Report an error** no longer navigate to form stubs.
They are full-row external actions that open separate `mailto:` URIs using
independent system-configured recipients and localized Partner-ID subjects.
The mail draft contains no body, CC, BCC or attachment and the PWA shows no
false sent state. Admin System settings owns the configuration in one **Help
contacts** card: Infopoint (hotline + email), Feedback (email), Report an error
(email), vertically stacked with one shared Discard/Save footer. This reuses
the existing list-row, field and action-footer grammars; no new token or base
component is introduced.

### 7.8 Infopoint (`Infopoint`, L3729)

**Current:** two text tabs with gray numeral badge; document rows OK but icon-only download buttons unlabeled; meta line mixes sans + mono mid-line (`Operations · Global · v1.3` sans, `04.05. 09:10` mono); active tab keeps red "2" badge while you're on it; news items lack read/unread logic tie-in with the tab badge; 27 inline styles, 8 font sizes.
**Target:** segmented tabs with Badge counts (badge clears as items are read); document row = same row grammar as tour documents (§7.4) with labeled actions; news items: unread dot + semibold title, read = regular; meta = one caption line, dates via formatter; empty states per tab. **Tabs also switch by horizontal swipe** (paged `SwipeViews`, §4.4), not only by tapping the pills (2026-07, PR #17).
**Superseded in part 2026-07-29 — see §7.13.** News messages are no longer expandable cards: the list row carries title + date + read state only, and the body moved to a dedicated detail page.
**Implemented 2026-08-11 for installed `/pwa` documents (`7a79808` + `dceed6d`).** Opening an Infopoint document enters a focused full-screen document-preview mode: the global Marketplace / My jobs / Infopoint / Profile tab bar is hidden, its reserved bottom region is removed, the PDF area is the only flexible scroller, and the full-width Download / Share / Print action bar owns the bottom safe area. Closing the document restores the Infopoint tab and the normal floating nav capsule.

### 7.9 App chrome (`TabBar`, header, `PhoneStatusBar`)

Per §5: all 4 tab items labeled (Marketplace / My jobs / Info / Profile), `aria-current`, numeric badges; active state = neutral contrast marker (no purple capsule — board §H); optional restrained KPI row only on client request; `PhoneStatusBar` excluded from the design contract.

Installed `/pwa` shell rule (2026-08-11): normal primary screens fill the top safe-area/status region with the screen-header surface while keeping header content inset below system UI. At the bottom, the page/safe-area surface reaches the physical bottom, but the visible tab bar remains a floating rounded capsule; `.pwa-tabbar-slot` is transparent and positional, and `.tabbar-capsule` owns the visual chrome. Document-focused screens hide the global tab bar entirely.

**Screen header — superseded 2026-07-26.** The previous rule ("welcome header (avatar, greeting, bell) only on Marketplace — other tabs use plain title header") is **withdrawn by client decision**. All four primary screens now use **one shared header component**, `DriverScreenHeader`, and the notification action is part of it on every screen. See §7.10 and [`driver-screen-spec.md`](driver-screen-spec.md) "Primary-screen header".

### 7.10 Shared primary-screen header (`DriverScreenHeader`) — implemented 2026-07-26

**Client decision (Taner Özdemir / Ferhat Catak, Figma review):** remove the Marketplace greeting field, move the Marketplace heading up, align the header of every menu item at the same height, make the notification action available on all primary screens (explicitly including My Orders), and give the notification button exactly the same border as the sorting and filter controls.

**Was:** three divergent header implementations — Marketplace's own `.pwa-header` with a greeting row above the title, `.pwa-screen-header` on My Orders + Profile, and a third hardcoded inline-style header on Infopoint. The greeting pushed the Marketplace title ~52px below the other three. The bell existed only on Marketplace and was a borderless circle next to two bordered square controls.

**Now:** one `DriverScreenHeader` (+ `NotificationBellButton`) in `driver.jsx` rendering the pre-existing `.pwa-screen-header`. Title/subtitle left, `.header-controls` right (optional screen `actions`, then the bell). A single `padding` declaration is what enforces the shared title height — per-screen top margins are prohibited. Screen actions cannot shift the title baseline (`align-items: flex-start` + `min-width: 0` on the title column). The bell reuses `.header-btn`, so border/radius/size/surface/shadow have exactly one definition shared with sort and filter.

**State ownership is unchanged:** unread count from `store.getDriverNotificationUnreadCount()`, open/close in the shell (`showNotifications`), destination the existing `DriverNotificationsPane`. Both shells (`AUTHEON Prototype.html`, `pwa/pwa-app.jsx`) pass the same existing handler to all four screens. No new notification state, store method, or route.

**Marketplace results area** follows the client's agreed structure: results count directly below the header, with sort + filter and the applied-filter chips in that results area rather than the header.

**Verification performed**

| Dimension | What was done |
|---|---|
| States catalogue | `prototype/project/driver-header-states.html` — a states gallery mounting the real component in 13 states (no badge · single/multi-digit unread · `99+` cap · each of the four screen titles · screen actions + bell together · long title/subtitle · 320px · 720px column · keyboard focus). **The repo has no Storybook and no bundler** (static React + Babel-standalone over CDN scripts), so this page is the story catalogue in the repo's own idiom; it imports the component rather than re-implementing markup, so it cannot drift. |
| Component/integration tests | `tests/regression/driver-header.structural.spec.ts` — 10 cases: greeting absent · Marketplace title in the standard position · one shared title baseline across all four · bell present on every screen · shared right-edge position · **computed** border-treatment parity vs sort *and* filter · badge + count preserved and `aria-hidden` · pane opens from every screen · Marketplace sort/filter still functional · focus-visible ring. |
| Visual regression | `tests/regression/driver-header-states.visual.spec.ts` (gallery + focus state) and refreshed Driver baselines for Marketplace, My Orders (all 4 tabs), Infopoint, Profile, plus the filter sheet and daily-limit sheet whose backgrounds are those screens. Captured on the existing single desktop viewport (`1440×1100`, EN + light) — the Driver suite's established configuration. Unrelated baselines were deliberately not regenerated. |
| Responsive | 320 / 360 / 390 / 430 / 768 / 1024 px, EN + DE, light + dark. Titles share one offset at every width; no title↔bell collision (min gap 8px at ≤360px); no horizontal document scroll. Single implementation — no separate tablet design. |
| Accessibility | Translated accessible name carrying the unread count as text (badge is not the only signal); badge `aria-hidden`; `aria-haspopup="dialog"` + `aria-expanded` preserved; 40×40 touch target; keyboard-reachable with a visible focus ring. Scoped the `.header-btn` transition (was `all`, which animated the focus outline). |

**Follow-ups — recorded, not silently absorbed into this task**

1. **Marketplace KPI row is absent** though the remediation log marks it COVERED. Orphaned `.kpi-row`/`.kpi-chip` CSS and three unreferenced `kpi*` i18n keys remain. Needs a client decision on whether the row returns; audit item 22 should revert to PARTIAL.
2. **`driver-daily-limit-sheet` visual test is dead** — it targets a "Request higher limit" button removed with the legacy limit-request UI (PRD v2.1); neither the button nor its i18n keys exist. The test can never pass. Deleting it (and its baseline) is a test-ownership decision.
3. **Pre-existing stale visual baselines** on job-detail sheets (`driver-acceptance-modal`, `driver-report-problem-sheet`) and `prototype-shell` reflect PRD v2.4–v2.6 copy changes, not this work. Left untouched.
4. **`.header-btn` uses `--r-3` (12px)** while the Controls rule in brand-tokens specifies `--r-2` (8px) for all button variants. Pre-existing; harmonizing means moving sort, filter and the bell together, with client sign-off.

---

### 7.11 Marketplace applied-filter count badge — audited + hardened 2026-07-27

**Prototype audit outcome.** The feature was already implemented and behaviourally correct: the badge
existed on the filter control, the count was derived from the **committed** filter object (not the
panel's draft), it was hidden at zero, it survived closing the panel, and it was already independent
of sorting and of the result count. **No separate badge-count state existed** and there was no
effect-based synchronization — the architecture was already `applied state → derived count → badge`.
Four implementation defects were corrected, and the feature's complete absence of test coverage was
addressed. See remediation **R32** and audit items **39–43**.

| Corrected | From | To |
|---|---|---|
| Badge primitive | raw `<span class="tabbar-badge">` (the *tab-bar* badge: hardcoded `9999px`, `#ffffff`, mono 9px, no cap, no `pointer-events`) | shared `Badge` primitive + one shared `.header-btn-badge` anchor rule |
| Count derivation | `activeChips.length` assembled inline in `Portal`'s render | pure `getAppliedMarketplaceFilterCount` / `getAppliedMarketplaceFilters`, co-located with `jobMatchesDriverFilters` |
| Control | markup inline in `Portal` | extracted `MarketplaceFilterButton`, mounted by both `Portal` and the states gallery |
| Accessible name | concatenated `` `${t("filters")} (${count})` `` | `tPlural("filtersApplied", count)` → "Filters, 3 applied" / "Filter, 3 aktiv" |

**Production component alignment.** Maps to shadcn Button + a `CountBadge` on Badge (see Appendix A).
The count selector is framework-agnostic and ports unchanged; in the production app it becomes a
plain selector over whichever store holds Marketplace filters (per Appendix A, `nuqs`/URL state is
the natural home so filters survive reload and are shareable — at which point the badge follows for
free, with **no** badge-specific persistence). Keep the derived-count rule: never introduce a
`filterBadgeCount` state, never source the count from the API response, never fold sort into it.

**Shared badge primitive reuse.** One primitive (`Badge`) and one anchoring rule
(`.header-btn > .header-btn-badge`) serve both the notification bell and the filter button. The
visual is shared; the semantics are not — notification behaviour was deliberately **not** copied into
the filter control.

**Verification performed**

| Dimension | What was done |
|---|---|
| Unit | `tests/regression/marketplace-filter-count.unit.spec.ts` — 12 cases driving the pure selector directly (empty/null/undefined, non-restrictive defaults, single-selects, text, both range bounds, sort excluded, search excluded, unknown keys ignored, no double counting, cleared → 0, purity/no-mutation, chips-and-count agree). The repo has no JS unit runner, so the pure function is exercised in the page realm via Playwright — no DOM, no store. |
| Component/integration | `tests/regression/marketplace-filter-badge.integration.spec.ts` — 19 cases: zero → no element, appears on Apply, increments, decrements on chip removal, disappears on Reset+Apply, **draft does not move the badge**, panel-closed indication, reopen stays in sync, sort isolation, **zero results still badged**, badge not focusable + `pointer-events: none` + click-through, focus ring, DE pluralized label, and layout stability (sort/filter/title do not move). |
| E2E | `tests/e2e/critical-flows/marketplace-filter-badge.spec.ts` — full journey plus a reload case. Result counts asserted only as relative changes; the fixture guarantees no exact totals. |
| Storybook | No Storybook exists (no bundler). `prototype/project/driver-marketplace-filter-states.html` is the story catalogue: 14 stories mounting the **real** component — 0 / non-restrictive-only / 1 / 3 / max-6 / focus, the primitive at 0-1-9-12-128, anchored double-digit and `99+`, and Marketplace compositions (no filters, 3 filters + chips, filters with zero results, 320px, 720px). |
| Visual regression | `tests/regression/marketplace-filter-states.visual.spec.ts` (gallery + focus) and two new Marketplace baselines, `driver-marketplace-filter-1` / `-3`. The zero-filter Marketplace baseline was re-run and **still matches**, confirming the badge adds nothing when the count is 0. No unrelated baselines regenerated. |
| Mobile/tablet | 320 / 360 / 390 / 430 / 768 / 1024 px, EN + DE. Badge attached, inside the viewport, sort+filter aligned, 40×40 target, no horizontal scroll. |
| Accessibility | Pluralized translated accessible name carries the count; badge `aria-hidden` + `pointer-events: none`; zero focusable descendants; visible focus ring; the badge is never the only indication. |
| Data model | **None touched.** Derived from existing in-memory frontend filter state. |

**Follow-up — recorded, not absorbed**

1. ~~**Audit item 43 — `from: "This week"` counts but does not filter.**~~ **Resolved 2026-07-28.**
   Decision: Mon–Sun calendar week containing marketplace fixture today (`05.05.`). Prototype
   `jobMatchesDriverFilters` implements `Today` + `This week`; production FE already matched that
   rule against device-local today.

#### 7.11.1 Empty states split by filter state — 2026-07-29

v2.9 established that active filters and their count **stay visible when the result set is empty**, so
that an empty Marketplace is *explained*. The explanation was wrong whenever there was nothing to
explain: the filter-related empty state rendered unconditionally, so an empty marketplace claimed the
driver's filters had hidden the work and pointed them at a panel with nothing set.

Now two states, selected from the **same** canonical selector that feeds the badge and the chip row —
`getAppliedMarketplaceFilterCount(committedFilters) > 0`. No `hasFilters` state, no effect, so the
empty state cannot contradict the badge on screen. Filters active → the existing state, unchanged. No
filters → a general availability message with **no** *Filters* action, because offering one implies the
very thing the message must not.

Keep the derived rule in production: never introduce an empty-state flag, and never decide the copy
from the API's result count alone — it cannot distinguish "nothing published" from "nothing matched".
The API should return the filter echo alongside the page so the client picks the state from the request
it actually made. PRD **v2.22**; remediation **F11**; spec in
[`driver-screen-spec.md`](driver-screen-spec.md) "Marketplace empty states".

### 7.12 Type-aware notification previews and contextual deep links — implemented 2026-07-29

**Problem.** Notification cards carried no category, so a profile decision and an order change looked
identical while scanning. They carried no context, so the only way to learn what a tour notification
was about was to leave the Notification Center. And navigation was coarse: an Infopoint notification
reached the Infopoint **tab**, not the message; a document rejection reached nothing at all; a
notification about a Marketplace order that had since been booked by someone else still offered to
open it. There was no push-tap routing of any kind. PRD **v2.20** / Task 20; remediation **F9**.

**Interaction model — two, and only two.**

| Family | Model | Primary action |
|---|---|---|
| Tour (`new_published_job`, `order_updated`, `cancelled_by_autheon`, `empty_run_recognised`, `empty_run_not_recognised`) | inline expandable preview, control on the right; expanding never leaves the pane | *View order* (marketplace) / *To my orders* (committed tour) |
| Infopoint message | deep-link to **that message** — no accordion | — (whole row) |
| Document outcome (`document_accepted`, `document_rejected`) | deep-link to **that document's preview** — no accordion | — (whole row) |
| Account (`master_data_change_*`, `email_changed`) | informational | — |

A universal overlay or bottom sheet for every notification type was explicitly **rejected** and is not
implemented.

**Visibility is enforced by omission.** The preview renders only what
`store.driverNotificationJobPreview()` returns, and for an order the driver has not committed to that
projection has **no** `customerName`, no `plate`, no `vin`, and no `name`/`street`/`contactPerson` on
either leg — the keys are absent from the object, not hidden with CSS. A styling regression therefore
cannot leak a protected field. Enforce the same shape server-side in production: the API response for
a pre-acceptance notification preview must not contain those fields (`driver_visibility_matrix`).

**Entitlement and availability are resolved, never assumed.** One store authority,
`resolveDriverNotificationTarget()`, answers *what does this notification open* and *may it still be
opened* for both the list and a push tap, so the two can never diverge. A tour the driver has not
committed to must still be `published`; a document requires a committed tour. An unavailable target
states the reason, **loses** its action (removed, not disabled — the repo's convention) and offers
*View more orders*. In production this is authorization: re-check it in the API, not only in the client.

**Navigation resolves through ids** — order id, message id, document id. Never the title, body or tour
number: those are display text, are localized, and can be edited or reused.

**Push taps.** `useNotificationDeepLink()` consumes `?notify=<notification id>` and both driver shells
apply the resolved intent identically. A tour push opens its card already expanded; an Infopoint push
opens the message; a document push opens the document — never the generic overview. One handler covers
cold start, home-screen launch, and a tap on an already-open or backgrounded instance
(`popstate`/`hashchange`), because a real service-worker `notificationclick` either opens a window on
that URL or focuses an existing client and navigates it. **Push delivery itself is still simulated** —
what exists is the resolution + navigation seam and the URL contract a real integration plugs into.

**Coverage closed against the existing matrix, without touching push.** `document_accepted` (already
`driver_in_app: true`, never implemented) now creates its notification, and newly published matching
Marketplace orders now appear in-app (`driver_in_app` false → true). The `driver_push` column, the
postal-area matching rule and the direct-assign default are **byte-identical** — the in-app row is
created for exactly the set that already receives the push, so no driver becomes newly eligible.

**Production component alignment.** The card maps to a shadcn Collapsible inside a Card, with the
category as a Badge (`variant="secondary"`) and the actions as Buttons (Appendix A). The store-side
pieces are framework-agnostic and port unchanged: the type→category/kind table, the target resolver,
and the stripped preview projection all become plain selectors over the notifications slice. Keep the
derived rules: never persist the category or the interaction model, and never trust a client-side
availability check as the only gate.

**Data model.** `user_notifications` gains nullable `target_entity_type` + `target_entity_id` and two
indexes — a stable non-tour deep-link target that `job_id` could not express. `deep_link` stays as the
client route, derived from those ids rather than authoritative. Category and interaction model are
deliberately **not** stored. See [`../database/logical-model.md`](../database/logical-model.md)
"Notification targeting".

**Responsive.** Phone-first. The preview `dl` is a 88px label column + value; at ≤359px it stacks to
one column and the actions go full width, so long DE labels never squeeze a value. Values wrap with
`overflow-wrap: anywhere`.

**Accessibility.** The row is the toggle and the only tab stop, carrying `aria-expanded` +
`aria-controls`; the collapsed panel uses the `hidden` attribute so it is out of the a11y tree; a
screen-reader-only label states *Show/Hide tour details* because the chevron is decorative; colour is
never the only signal (category is a text chip, the expanded state is also in the chevron rotation and
`aria-expanded`, and an unavailable order is stated in words).

**Open — recorded, not absorbed.** The final category taxonomy and event mapping, the approved visual
design for both card states, the deep-link destination for profile approval/rejection, whether profile
approval and document acceptance should gain push, and whether *View more orders* should be
conditional on other orders existing. All six are client decisions; none were invented here. See the
v2.20 changelog.

### 7.13 Infopoint message detail page — implemented 2026-07-29

**Problem.** News rows were accordions: title, date, body truncated to 100 characters, tap to
expand the full text **inside the row**. The seeded strike announcement is already 221
characters over three paragraphs, and the client's real cases — updated **AGB**, standing
instructions — are far longer. Expanded inside a scrolling list the body pushed every
following message far down, gave the reader no stable position, and lost their place on
collapse. PRD **v2.21** / Task 18; remediation **F10**.

**List row is now a navigation row, not a disclosure.** Title + date + read state, and
nothing else. The 100-character preview, the expanded body, the rotating chevron and
`aria-expanded` are gone; a forward chevron replaces them. Read state is carried by the
existing unread dot **plus** a small `NEW` badge on unread rows **plus** the row's accessible
name (`"New: <title>"` / `"Read: <title>"`) — so it never depends on colour, and a read row
carries no badge, because three rows all labelled *Read* is noise rather than information.

**Detail page** replaces the Infopoint screen header *and* its tab band, so the message owns
the full viewport: back arrow upper-left, message title as the page heading, date, then the
**complete** body with `white-space: pre-line` (admin-typed paragraph breaks survive) and
`overflow-wrap: anywhere`. Never clamped, never truncated. Back returns to the **complete**
list with the News tab still selected. The bottom tab bar deliberately **stays** — this is a
subpage inside the Infopoint tab, not a modal takeover like job detail.

**Generalized, not duplicated.** The drill-down header became `DriverSubpageHeader`
(previously `ProfileSubpageHeader`; CSS scope `.profile-subpage-header` →
`.driver-subpage-header`, rules and Profile visuals byte-identical). The Infopoint detail page
therefore inherits the 44px back control — deliberately above the shared 40px
`.detail-back-btn`, because it is the primary escape from a subpage — the centred title, and
focus moving to the heading on entry. No second drill-down pattern exists.

**Left-edge swipe-back** (`useEdgeSwipeBack`) is implemented as the optional nice-to-have: a
drag starting within 32px of the left edge, committing past 72px, axis-locked at the same 10px
threshold `SwipeViews` uses. It is **progressive enhancement** — the visible back arrow is
always present and primary, and the gesture is inert without touch. `touch-action: pan-y`
reserves the horizontal axis; **not** `preventDefault()`, which React's passive `touchmove`
listener ignores while logging a console warning. Transform-only, suppressed while the finger
is down, dropped under `prefers-reduced-motion`.

**Production component alignment.** A route, not a Collapsible: in the production app the
message detail is its own page under the Infopoint route, which gets browser/OS back for free
and makes the URL shareable — at which point the custom edge gesture becomes redundant and
should be dropped rather than ported. Keep the two invariants: the list must not fetch or
render message bodies, and opening must mark read + audit the view in one server action.

**Data model.** None. `infopoint_news` already stores subject, text and publication date;
`infopoint_news_reads` already stores the read receipt. `schema.dbml` and `logical-model.md`
are untouched.

**Open — recorded, not absorbed.** Whether the left-edge gesture should be iOS-only or offered
on every touch platform. It is currently offered wherever touch exists, since restricting it
would mean user-agent sniffing for a purely additive gesture that always has a visible button
beside it.

### 7.14 System-wide dialog standard — implemented 2026-07-29

**Problem.** "Dialog" was not a component. The console repeated the *same* inline fixed backdrop
plus `.card elev` panel **nine times** — `zIndex` 100–105, widths 440/480/520/560, padding 22,
`h2` 17/18, flex-end action rows, controls rendering **42px** against a documented 44px floor —
while the driver app mixed padding 20/22/24/26, `h2` 19/20/24, four different action layouts,
and carried two byte-identical inline success-disc SVGs. Every title was left-aligned. PRD
**v2.23**; supports Task 9, extends Task 26; remediation **F12**.

**One primitive, both surfaces.** `DriverUI.Dialog` (`driver-ui.jsx`) is now the dialog for the
Driver PWA *and* the console — the same route `AdminConfirmBridge` already used to reuse
`ConfirmSheet`, so this is an existing pattern extended rather than a new one. Backing it is one
`.dialog-*` CSS contract: `--r-4` rounding, 24px padding, three documented widths (480/560/720),
a centered title one type step above a centered muted description, left-aligned internally
scrolling content, and the **canonical Cancel | Primary 1:1.6 grid at 44px** — deliberately
`.sheet-foot`'s existing grammar, so the two can never disagree.

**A driver dialog is scoped to the device, not the browser window.**
`.phone-shell .dialog-backdrop` is `position: absolute` inside `.phone-screen` (the containment
`.sheet-backdrop.center` always had), and the panel drops its desktop max-width. This matters
beyond the prototype's phone mock: it is the difference between "a dialog over the app" and "a
dialog over the page". The console keeps `position: fixed`, where the viewport *is* the surface.
In production the equivalent is mounting the driver dialog inside the app shell's portal root
rather than `document.body`.

**Bounded height is the anti-clipping mechanism.** `min(90vh, 760px)` on the panel plus
`overflow-y: auto` on `.dialog-content` is what keeps the action row on screen for a long form,
rather than letting content push it out of the viewport. Keep that pairing in production; a
dialog that grows unbounded will clip its actions on the first long-content case.

**Alignment is structural, not an exception list.** Titles and descriptions centre;
`.dialog-content` stays left-aligned because prose, key/value summaries, legal wording and form
fields are unreadable centred. That answers "which dialogs are exceptions" without an approval
list to maintain — and means a new dialog cannot get it wrong by default.

**Icons carry status or they do not exist.** Success / warning / destructive only. Two duplicated
inline SVGs collapsed into one component. No decorative icon remains, and no removed icon carried
information the title and description did not.

> **Narrowed 2026-07-30 (PRD v2.31, `[v2.31-success-mark]`).** The shared 52px disc keyed to the `--st-*` families now
> covers **warning and destructive only**. Success became a **discless standalone gradient mark**
> (56px glyph in an 80px box, over a soft edgeless bloom) painted by its own narrowly scoped
> `--success-mark-*` / `--success-glow*` tokens rather than `--st-accepted`. A third success surface
> — the mark-performed stage — still held a duplicate of the SVG and now shares the one component
> too, so "collapsed into one" is finally true of all three. The deviation is success-only and
> content-driven: a grown gradient checkmark carries the status alone, while a small `!` or `×`
> reads as an alert only inside its container.

**Deliberate confirmation survives standardization.** The Accept-tour **slide-to-confirm** is
untouched; that dialog stacks its actions full width precisely because a slide control cannot
share a row with a button. Never substitute a button for it.

**Production component alignment.** Maps to shadcn `AlertDialog` (destructive/confirmation) and
`Dialog` (forms/summaries) with `DialogHeader`/`DialogFooter`. Port the contract, not the CSS:
centered `DialogTitle` + `DialogDescription`, left-aligned body, one footer component owning the
1:1.6 ratio and the 44px floor, and `role="alertdialog"` for destructive confirmations. Resist
per-screen footer layouts — that is exactly how nine console dialogs drifted.

**Bottom sheets stay a separate spec.** Bottom-anchored, drag-to-dismiss, leading-edge draggable
header; they share only the action grammar. Folding them in would change interaction, not
appearance, which is outside this task's visual scope (open question 3).

**Verified** at 401×869 (driver phone), 834×1112 (tablet) and 1440×900 (desktop): identical
rounding, padding, centered title, title-over-description hierarchy, 44px controls, 12px action
gap, action row inside the panel, panel inside the viewport. *Measurement trap worth keeping:
the panel entry animation starts at `scale(0.96)`, so a bounding rect read mid-animation reports
42px for a 44px control — measure computed style or wait for the animation.*

**Open — recorded, not absorbed.** Whether the client approves these specific token values as
the standard, and whether bottom sheets should be folded in. See the v2.23 changelog.

### 7.15 Authentication screens + the gate — shipped in PR #32, documented 2026-07-29

**Recorded retroactively.** PR #32 (`c7a087e`, `2116024`, `8e0182e`) added a login gate, eight
screens, four shared primitives, fifteen store methods, ten audit actions and 107 i18n keys per
locale — with no documentation. This section closes that gap; it changes no behaviour.

**Why it matters beyond "a missing doc":** the change is not additive at the edges. **Every screen
in §7.1–§7.14 now sits behind a sign-in gate** on all three surfaces (framed preview, `/pwa/`,
console). A reader working from §7 alone would not have known the app opens on a login screen.

**One implementation, both surfaces** — the repository's established pattern (as with
`ConfirmSheet` and `Dialog`): `LoginForm`, `AuthOtpInput`, `ForgotPasswordFlow` and
`SetPasswordForm` live in `driver-ui.jsx` and are consumed by `DriverLoginScreen` /
`DriverSetPasswordScreen` and `AdminLoginScreen` / `AdminSetPasswordScreen`. Do not fork a
second login form for the console.

**Two behaviours to carry into production:**

- **No account enumeration.** `requestPasswordReset` reports success even for an unknown email.
  Turning this into "no account found" is a user-enumeration vulnerability, not a UX improvement.
- **Bounded recovery codes.** 10-minute expiry, 30-second resend cooldown, and an incorrect or
  expired code is rejected distinguishably rather than silently accepted.

**Two affordances that must NOT ship:**

- **The 6-digit code is rendered in the UI**, because a static prototype cannot send email (same
  convention as `ChangeEmailSheet`'s `demoCode`). Production delivery is a **Keycloak action
  email** — the code must never reach the client.
- **Any non-empty password authenticates.** There is nowhere here to store or verify a credential.

**Production component alignment.** The real app delegates to **Keycloak** (PRD Task 2), so the
login form becomes a Keycloak-hosted page or an OIDC redirect, and forgot-password / set-password
become Keycloak action links. What ports is the *shape*: one shared form component, per-field plus
root error slots, an OTP input that is one hidden field behind six cells (paste-friendly), and a
password toggle with an accessible name. **Session stays in memory only** — the prototype mirrors
the frontend's access-token handling deliberately; do not move it to `localStorage`.

**Data model.** None, and none is needed: Keycloak owns credentials and sessions, so there is no
session table and no password-reset table. Only the ten new audit action keys are recorded. See
[`../database/logical-model.md`](../database/logical-model.md).

**Open — recorded, not absorbed.** The exact production login ceremony (Task 2 defers it to
Keycloak realm configuration), and whether the driver recovery flow should use a 6-digit code at
all or hand off entirely to a Keycloak action link. The prototype shows a code because it cannot
delegate to Keycloak — an implementation constraint, not a product decision.

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

**W7 — Document-upload source selection (2026-07-27)** — closes the audit v1.6 addendum (U1–U4) / remediation **F8**:

24. **Audit of the camera-only behaviour.** Traced every driver `input[type=file]`: three upload controls
    (`MarkPerformedSheet`, `JobTourDocuments`, job-detail *Meine Dokumente*) shared one hidden input carrying
    `capture="environment"`, so the generic upload action *was* a camera intent. `accept` already listed
    `application/pdf`, but `capture` wins on mobile, so stored PDFs were unreachable. No `navigator.mediaDevices` /
    `getUserMedia` anywhere. ✅ 2026-07-27
25. **Action-sheet component.** No generic driver action-sheet primitive existed (`Sheet` in `driver-ui.jsx` is a
    head/body/foot form sheet; `TourDocCategoryModal` is a centred list modal). Added a purpose-built bottom sheet,
    `UploadSourceSheet`, on the existing `.sheet` surface and tokens — no new tokens, no new primitive competing
    with `Sheet`. ✅ 2026-07-27
26. **Photo capture separated from file selection.** Two hidden inputs inside one shared `UploadSourcePicker`:
    photo (`capture="environment"`, supported image MIME types only) and file (no `capture`,
    `application/pdf` + supported image MIME types). The camera is only ever clicked from the explicit photo
    action. ✅ 2026-07-27
27. **PDF support end to end.** Front-end accept list, store validation and the document row already handled PDFs;
    the row shows an extension badge + filename + accessible kind label (`docKindPdf`) and never an `<img>`.
    Preview continues through the pdf.js `DocumentPreviewSheet`. ✅ 2026-07-27
28. **Backend MIME-validation audit + size parity.** `isAllowedTourDocumentFile` (`store.js`, the prototype's
    server-side gate) validates MIME first with an extension fallback and already accepted `application/pdf` — no
    contract change was needed. It had **no size check** despite the advertised 25 MB, so a shared
    `exceedsTourDocumentSizeLimit` guard was added to every upload path (driver add/replace, admin
    attach/register, patch-with-file, empty-run evidence) and mapped to `invoiceUploadTooLarge`. ✅ 2026-07-27
29. **Shared-component reuse.** One picker for all three entry points and for *Replace file*; the two previous
    per-screen hidden inputs and the separate replace input were removed rather than duplicated. ✅ 2026-07-27
30. **Responsive + accessibility.** Bottom sheet with safe-area padding, ≥44px rows, text labels beside icons,
    `role="dialog" aria-modal="true"`, focus to the first action on open, Escape/backdrop dismissal, focus return
    to the upload control, correct stacking above the tour-completion modal, and a re-entry guard so a double tap
    cannot open two pickers. ✅ 2026-07-27
31. **Documentation synchronised** the same day: `driver-screen-spec.md` (new "Document upload — source
    selection"), `brand-tokens.md` (component token map), `design-direction-board-audit.md` (v1.3 addendum),
    `design-direction-board-remediation.md` (F8 + status table), `driver-i18n-index.md` (regenerated + upload key
    group), `prd.json` v2.8, PRD changelog `2026-07-27`, and `docs/product/autheon-context-pack.md`. ✅ 2026-07-27

*No testing workstream is attached to W7 — automated tests, E2E specs and visual-regression baselines were
explicitly out of scope for this change. Note that W7 is the first W-item to touch `store.js` (the 25 MB guard),
so the functionality guarantee below is qualified: the change is additive validation only and alters no flow,
status transition or i18n key.*

**Functionality guarantee:** every W-item is a presentation/markup change on top of the existing store logic (`store.js` untouched — except the additive W7 size guard); flows, business rules, and i18n keys are preserved — copy changes go through `i18n.js` (EN+DE) only. Re-run `node project/_audit-prototype.mjs` + `_verify-seed.mjs` after each phase to prove PRD behavior is intact.

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
- **App structure:** route groups `(driver)`/`(admin)` with two AppShells. Driver AppShell owns top safe-area fill through the screen header, bottom safe-area fill through the page/shell surface plus a floating `BottomTabBar` capsule, and a document-focused mode that hides the global tab bar; Admin AppShell owns Sidebar + breadcrumb.
- **PWA layer:** `app/manifest.ts` (standalone, portrait, maskable icons, shortcuts "My Jobs"/"Upload document"); Serwist service worker — precache shell, `NetworkFirst` (3s timeout) for job lists with "offline, showing cached data" InlineAlert, `StaleWhileRevalidate` for detail/i18n, **BackgroundSync + IndexedDB outbox for document uploads** (idempotent via client UUID; iOS fallback: flush queue on `online`/foreground); `100dvh` not `100vh`; `env(safe-area-inset-*)` owned by one shell layer at a time; purge SW caches on logout; custom install prompt (`beforeinstallprompt` + iOS instructional sheet).
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

- **v4.1 - 2026-08-11 (iOS PWA document-preview + shell safe-area catch-up).** Reflected commits `7a79808` and `dceed6d`: Infopoint document preview in the installed `/pwa` shell is now a focused full-screen mode that hides the global bottom tab bar, removes the reserved nav region, keeps the PDF as the only flexible scroller, and lets the full-width Download / Share / Print bar own the bottom safe area. The primary screen header now fills the top safe-area/status region while keeping content inset, and normal Driver screens preserve the floating rounded tabbar capsule inside an edge-to-edge bottom safe-area/page surface. This records the implementation in §5, §7.8, §7.9, Appendix A, `driver-screen-spec.md`, and remediation F15.

- **v4.0 - 2026-08-02 (Profile help contacts documentation catch-up).** Recorded the already-merged `feat/help-contacts-mailto` behavior: separate Feedback and Report-an-error Profile list actions open recipient-specific `mailto:` drafts with localized Partner-ID subjects and no body/CC/BCC/attachments; the removed stub forms do not fake submission. Admin System settings groups Infopoint, Feedback and Report an error into one vertically stacked Help contacts card with a shared Discard/Save footer. Canonical behavior lives in `prd.json`; implementation evidence lives in `prd-prototype-validation.md`; screen structure lives in `driver-screen-spec.md`; visual history is remediation F14. **No new tokens, routes, submission endpoint or data-model change.**

- **v3.5 — 2026-07-27 (document-upload source selection).** Stakeholder report on the tour-completion upload screen: the upload control opened the device camera directly, so an invoice already saved as a PDF on the phone could not be attached. Reflected from `driver.jsx`/`styles.css`/`store.js`/`i18n.js`: (1) **Upload-source action sheet** — after the document-type step the driver picks *Foto aufnehmen* (camera capture, images only, `capture="environment"`) or *Datei auswählen* (plain OS picker, `application/pdf` + supported images, no `capture`); the generic upload control never opens the camera (§7.4 status note, new `.upload-source-*` CSS, new `uploadSource*` / `docKind*` i18n). (2) **One shared `UploadSourcePicker`** for all three driver upload entry points and for *Replace file* — the per-screen hidden inputs were removed, not duplicated. (3) **25 MB enforced** on every store upload path, matching the limit the UI already advertised (`invoiceUploadTooLarge`). New workstream **W7** (items 24–31); closes audit v1.6 addendum U1–U4 / remediation F8. No token, DDB-contract, schema or status-model change.
- **v3.9 — 2026-07-29.** Authentication screens documented retroactively (new §7.15). PR #32 shipped a login **gate** in front of both surfaces plus eight screens, four shared primitives (`LoginForm`, `AuthOtpInput`, `ForgotPasswordFlow`, `SetPasswordForm`), fifteen store methods, ten audit actions and 107 i18n keys per locale — with no documentation. Every screen in §7.1–§7.14 now sits behind sign-in. Recorded: no-account-enumeration and bounded recovery codes as **production** behaviours; the displayed 6-digit code and "any non-empty password" as **demo-only** and not shippable. Documented in brand-tokens ("Component token map — authentication screens", no new tokens), remediation F13, driver-screen-spec ("Authentication screens + the gate"), driver-i18n-index (auth key contract), sitemap (auth entry rows). **prd.json, PRD changelog and the context pack updated** (v2.24). **No data-model change** — Keycloak owns credentials and sessions, so no session or reset table exists by design. Open: production login ceremony, and code-vs-Keycloak-link for driver recovery.
- **v3.8 — 2026-07-29.** System-wide dialog standard (new §7.14). One shared `DriverUI.Dialog` primitive for **both** surfaces plus one `.dialog-*` contract replaces nine hand-rolled console backdrops and five hand-rolled driver modals: `--r-4` rounding, 24px padding, documented widths, centered title above a centered muted description, left-aligned scrollable content, and the canonical Cancel | Primary 1:1.6 action grid — which also fixes hand-rolled rows rendering **42px** controls below the 44px floor. Icons reduced to meaningful status only (two duplicated success SVGs deduplicated). **Slide-to-confirm untouched**; no logic, validation, permission, label or legal wording changed. Bottom sheets deliberately remain a separate spec. Documented in brand-tokens ("Component token map — dialog standard", no new tokens), remediation F12, driver-screen-spec ("Dialog standard" + a per-dialog audit table). **prd.json, PRD changelog and the context pack updated.** **No data-model change.** Open: client sign-off on the token values, and bottom sheets.
- **v3.7 — 2026-07-29.** Marketplace empty states split by filter state (new §7.11.1). The filter-related empty state no longer renders when no filter is active; a general *There are currently no open orders.* state takes its place, with no description and deliberately no *Filters* action. Selection comes from the canonical `getAppliedMarketplaceFilterCount`, the same derivation as the badge and chip row, so the two can never disagree, and apply/change/clear/reset switch states with no extra wiring. The filtered state's copy, description and action are unchanged. Documented in remediation F11 and driver-screen-spec ("Marketplace empty states"); **brand-tokens untouched** — the shared `EmptyState` primitive is reused, no new token or component. **prd.json, PRD changelog and the context pack updated.** **No data-model change.** Open: approved wording for the general message, and "orders" vs "tours" terminology across the driver surface.
- **v3.6 — 2026-07-29.** Infopoint message detail page (new §7.13; §7.8 superseded in part). The expandable news card is replaced by a dedicated page: the list row keeps title + date + read state (unread dot + `NEW` badge + accessible name; no badge on read rows) and drops the 100-char preview, the expanded body and `aria-expanded`; the detail page replaces the Infopoint header and tab band and shows the complete body with preserved paragraph breaks, never clamped. Drill-down header **generalized** `ProfileSubpageHeader` → `DriverSubpageHeader` (CSS scope renamed; Profile visuals unchanged), so the 44px back control, centred title and focus-on-entry are shared. Optional left-edge swipe-back implemented as progressive enhancement (`touch-action: pan-y`, transform-only, reduced-motion safe) and never replaces the button. v2.20's message deep links now land on this page. Documented in brand-tokens ("Component token map — Infopoint message list + detail", no new tokens), remediation F10, driver-screen-spec ("Infopoint messages"), driver-i18n-index. **prd.json, PRD changelog and the context pack updated.** **No data-model change.** Open: iOS-only vs all-touch for the gesture.
- **v3.5 — 2026-07-29.** Type-aware notification previews and contextual deep links (new §7.12; §7.6 superseded in part). Notification cards gain a category chip, a two-line-clamped snippet and two — and only two — interaction models: inline expandable tour previews with one contextual action, and direct deep links for Infopoint messages and documents. Protected tour fields are stripped from the preview payload rather than hidden; target availability and entitlement are resolved through one store authority shared with push taps; unavailable Marketplace orders state the reason, lose *View order* and offer *View more orders*. Push taps consume `?notify=<id>` on both driver shells (delivery still simulated). Coverage gaps closed: `document_accepted` notification implemented, newly published matching orders now in-app — **push eligibility untouched**. Documented in brand-tokens ("Component token map — driver notification cards", no new tokens), remediation F9, driver-screen-spec ("Notification cards"), driver-i18n-index. **prd.json, PRD changelog and the context pack updated** — this is a confirmed functional requirement. **Data model changed:** `user_notifications` `target_entity_type` + `target_entity_id` + two indexes. Open: six client decisions listed in §7.12.
- **v3.4 — 2026-07-27.** Marketplace applied-filter count badge audited and hardened (new §7.11). The feature was already implemented and behaviourally correct (committed-state derived, hidden at zero, sort- and result-count independent, no duplicated state); this pass replaced the bespoke `.tabbar-badge` span with the shared `Badge` primitive on one shared `.header-btn-badge` anchor, extracted the canonical pure selectors `getAppliedMarketplaceFilterCount` / `getAppliedMarketplaceFilters` and the `MarketplaceFilterButton` component, and replaced the concatenated `aria-label` with pluralized `filtersApplied_one/_other` resolved by a new `tPlural` i18n helper. Added the feature's first coverage: 12 unit, 19 integration, 2 E2E, a 14-story states gallery and 4 new visual baselines. Documented in brand-tokens ("Count badges on header icon buttons"), audit v1.5 (items 39–43), remediation R32, driver-screen-spec ("Applied-filter count badge"), driver-i18n-index ("Marketplace filter keys" + pluralization). **prd.json, PRD changelog and the context pack updated** — this is a confirmed functional Marketplace requirement. **No data-model change.** Open: audit item 43 (`"This week"` preset counts but does not filter).
- **v3.3 — 2026-07-26.** Primary-screen header consolidation (client decision, Figma review): new §7.10 **Shared primary-screen header** documenting `DriverScreenHeader`; the §7.9 rule limiting the welcome header + bell to Marketplace is **withdrawn**. Marketplace greeting/avatar block removed (not relocated); `welcomeBack` i18n key deleted; all four primary screen titles aligned by one shared padding declaration; notification action added to My Orders, Infopoint and Profile reusing the existing shell handler and store count; notification button reuses the `.header-btn` treatment so its border/radius/size/surface/shadow are identical to sort and filter (`12px` literal replaced with `--r-3`); Marketplace sort/filter + filter chips moved into the results area per the client's agreed Marketplace structure; `.header-btn` gains a `:focus-visible` ring and a scoped transition. New: header states gallery + two test specs. Documented in brand-tokens ("Header icon buttons"), audit v1.3 addendum (items 36–38), remediation R28–R31, driver-screen-spec ("Primary-screen header"), driver-i18n-index (header key contract). **No PRD or context-pack change** — none of these were normative product requirements. No data-model change.

- **v3.2 — 2026-07-23 (PR #17 — figma-comment adjustments).** Reflected from `driver.jsx`/`admin.jsx`/`styles.css` (merge `14526e9`): (1) **Swipe/paged tab navigation** — My Jobs and Infopoint tab bodies became a horizontal paged carousel (`SwipeViews`); a swipe pages between tabs while vertical scroll is preserved (§4.4, §7.2, §7.8; new `.swipe-*` CSS). Client-feedback request. (2) **Marketplace KPI row removed** at client request — Available / Booked / Open documents duplicated the My Jobs tab badges (§7.9; `.kpi-row`/`.kpi-chip` CSS + `kpi*` i18n now unused). (3) **Digit-only numeric inputs** — driver preferred-postal + Marketplace filter PLZ, and admin Create/Edit-Job postal/house-no/distance strip non-digits; phone fields allow a leading `+`; driver-offer allows one decimal separator; alternate-contact stays free text (§6.1, §7.7). Bug report. No token/DDB-contract changes.
- **v3.3 — 2026-07-26.** New §10 **Vehicle Domain Restructure** implementation plan for PRD v2.8 (client confirmation “Systemlogik Fahrzeugeingabe”): dependency-ordered sequencing, shared-component updates (new `DriverUI.RedPlatesRequiredNotice` + the `AuthStore` vehicle contract; SUV/Van/Classic icons removed, neutral legacy fallback added), migration dependencies incl. the **blocked** legacy vehicle-type mapping, and desktop/mobile/tablet + visual-regression + accessibility + downstream-output verification. No new tokens: the derived red-licence-plate notice reuses the existing `--st-warn` / `--st-warn-bg` semantic pair (recorded in brand-tokens.md).
- **v3.1 — 2026-07-21.** Post-remediation feature work reflected from `styles.css` (commits `3ef6597` Task 3, `1cdf1a7` Task 1): new §4.4 **Layout & scroll architecture** documenting the fixed-height app shell (pinned header, internally-scrolling driver/admin surfaces) and the sticky Create/Edit-Job form sidebars with the ≤1200px stack fallback; §7.7 Profile gains the driver-owned **Account & sign-in** credential card and self-service change-email flow. No token/behavior changes to the DDB remediation contract; the `--st-ok` verified-badge token is flagged as undefined in brand-tokens.md.
- **v3.0 — 2026-07-14.** Incorporated the client **Design Direction Board (AUTHEON GmbH, July 2026)**: authority hierarchy rewritten (§0 — PRD behavior / board visuals / prototype as compliant reference / docs as contract); Inter Tight replaces Plus Jakarta Sans as primary UI font; typography re-based on 400/500/600 with 700+ as exception-only; purple active-navigation capsule requirement removed and replaced by the client's black/white/gray navigation direction ("no dominant purple navigation"); marketplace-card content, compensation placement, route line, conditional registered/deregistered/red-plate metadata (PRD scope guard), restrained KPI/header, restrained gradients, minimal micro-animations, moderate radius + subtle elevation added via canonical sections in brand-tokens/driver-screen-spec; status colors confirmed text-labelled and restrained; W6 remediation phase added from `design-direction-board-audit.md`. Accessibility, tokenization, reusable-component, async-state and visual-regression work from v2.0 is preserved; dark theme remains an internal extension that must not redefine the client's light-theme direction.
- **v2.0 — 2026-07-10.** Original source-of-truth contract + prototype remediation plan (W1–W5).
