# AUTHEON — Driver PWA Screen Specification

> **Status:** Driver PWA visual/UX contract, aligned with the **Design Direction Board (July 2026)** — the client visual authority.
> **Prototype:** [`../../prototype/project/driver.jsx`](../../prototype/project/driver.jsx) (implementation reference — must comply with PRD + board)
> **Brand:** [`brand-tokens.md`](brand-tokens.md) (canonical tokens, typography, accent rules)
> **PRD:** [`../requirements/prd.json`](../requirements/prd.json) (behavior authority)
> **Audit:** [`design-direction-board-audit.md`](design-direction-board-audit.md)

---

## Visual foundations (canonical: brand-tokens.md — summarized here)

- **Inter Tight** is the primary UI font; hierarchy via **400 body / 500 labels·nav / 600 selective emphasis**. No 700+ defaults.
- **No default uppercase headings.** Sentence case everywhere; uppercase only for the sparing meta markers listed in brand-tokens.
- **Purple restrained**: focus, selected markers, limited accents, appropriate primary actions. Never dominant, never large surfaces.
- Light-gray canvas `#F5F5F7`, white content surfaces, moderate rounding (cards 12–16px, sheets ≤24px), fine borders, very subtle neutral shadows, calm spacing with high-quality information density.
- Gradients rare/subtle; micro-interactions minimal (`transform`/`opacity`, reduced-motion respected).

---

## Navigation (bottom tabs)

| Tab ID | Label (i18n) | Component | Route target (production) |
|--------|--------------|-----------|---------------------------|
| `portal` | `marketplace` | `Portal` | `/marketplace` |
| `mine` | `myJobs` | `MyJobs` | `/jobs` |
| `info` | `infopoint` | `Infopoint` | `/infopoint` |
| `profile` | `profile` | `ProfilePaneFull` | `/profile` |

Rules (Design Direction Board §H):

- Bottom navigation; all tabs show **icon + label**; badge uses the unified `Badge` component.
- **Active state = contrast, not purple**: darker text, filled/heavier icon, and a subtle neutral marker (light-gray capsule). **A dominant purple active capsule is prohibited**; purple may appear only as a restrained marker that does not dominate the bar.
- Bar surface: white (`--paper`), fine `--line` border, subtle shadow — not a dark or purple slab.
- **Fixed vs floating is an unresolved client decision.** The prototype currently floats the bar above the content; do not lock either option without client sign-off.
- Search, filters, notifications, and settings live in the **upper** screen area; filter + sorting controls sit at the **top of the Marketplace**.
- No additional navigation levels.

---

## Marketplace job card (client reference layout — DDB p.5–6)

Implemented as `JobCardBody` (`driver.jsx`), shared by Marketplace and My Jobs:

1. **Header row (My Jobs only)** — `Tour #…` (muted) + text-labelled status pill. **Client decision 2026-07-14:** marketplace cards hide tour number and status (every marketplace card is Published, so the pill carried no information); both stay on My Jobs cards where status varies.
2. **Route line** — `München → Berlin` as a plain text line (17px/600), PLZ beneath each city, distance small and muted under the arrow.
3. **Legs** — two columns *Pickup / Delivery*: purple pin icon + 500-weight label, then `date · window` (`Flexible` fallback) in tabular figures.
4. **Footer** — vehicle icon + model left, **price right** (19px/600, factual) — always one calm line.
5. **Tag row** — wrapping chip row beneath the footer: **important vehicle info tags** (icon + text) and the **axle chip**, all in the same `--canvas` chip treatment so any combination wraps cleanly on 375px. Axle labels are localized (`Own axle`/`Eigenachse`, `Third-party axle`/`Fremdachse`).

| Slot | Content | Source |
|------|---------|--------|
| Route | Pickup city + PLZ → delivery city + PLZ | `startCity/startPlz/endCity/endPlz` |
| Schedule | Pickup date + window, delivery date + window | `pickup/delivery` |
| Vehicle | Model (icon carries type), axle chip | `vehicleModel/vehicle/axle` |
| Status | Text-labelled pill (`Published` on marketplace) | `status` |
| Compensation | Driver offer, right-placed, premium/factual | `driverOffer` |
| Important vehicle info | `Registered` / `Deregistered` / `E-vehicle` / `Red plates` — icon + text tags, rendered only when set | `registrationStatus/electricVehicle/redPlates` |

**Vehicle info fields (resolved 2026-07-14):** `registrationStatus` (`registered`\|`deregistered`\|null), `electricVehicle`, `redPlates`, `redPlateNumber` per `prd.json` → `resolved_defaults.vehicle_important_info_v1` (client DDB §5 + direction). Set in the admin job form Vehicle section with conditional rules: regular plate required when registered/unspecified, hidden+cleared when deregistered, red-plate number (§ 16 FZV `K-06 1234` format) required when the red-plates flag is set. Shown as chips on cards; in the detail Vehicle card the flags render as an ordered block (label line, chip row beneath), the plate row hides when no plate exists, and a red-styled `Red plate no.` row appears when set (unlocked view only). Text label always present — the icon supports, it never replaces the label.

**In-app document viewer:** `DocumentPreviewSheet` is a full-height in-phone page rendering the seeded real 2-page PDF (`prototype/project/assets/transport-order-sample.pdf`) via pdf.js canvases (iframe fallback), with functional Download/Share/Print. All transport-order, tour-document, and Infopoint views/downloads serve this PDF — production streams the real file to the same surface.

Card presentation: white surface on `#F5F5F7`, moderate rounding, fine outline and/or very subtle shadow, calm spacing with useful density; small supporting icons only where they aid comprehension; cards (not a desktop table) are the marketplace idiom.

---

## Header & KPIs

- Marketplace header: greeting/avatar, notifications bell, screen title, sort + filter controls, applied-filter chips. Restrained — orientation without dashboard weight.
- **KPI row (implemented per PDF §4 — "reduzierter Dashboard-Charakter"):** three quiet chips — Available (published jobs), Booked (own assigned/accepted), Open documents (tours needing document correction). `--canvas` chips, 12px labels, 600-weight numbers; never dominant.

---

## Screen inventory

| Screen | Component | Required states | Primary CTA |
|--------|-----------|-----------------|-------------|
| Marketplace | `Portal` | default, filtered, empty, loading, blocked driver | Filter / open job |
| My Jobs | `MyJobs` | 4 tabs × empty / loading / populated | Open job |
| Job detail (locked) | `JobLocked` | masked addresses | Accept (opens sheet) |
| Job detail (unlocked) | `JobUnlocked` | route, contacts, docs, cancellation | Mark performed |
| Tour documents | `JobTourDocuments` | empty, uploading, failed, review | Upload |
| Accept flow | `AcceptanceModal` | valid / invalid, daily limit hint | Accept bindingly (slide-to-confirm) |
| Report problem | `ReportProblemSheet` | 7 codes, min 10 chars, evidence | Submit |
| Notifications | `DriverNotificationsPane` | grouped by day, unread, empty | Deep link |
| Profile | `ProfilePaneFull` | view, edit MDR, pending | Request changes |
| Infopoint | `Infopoint` | docs + news + help tabs, empty | Download / Help |

---

## Buttons & interactions

- One primary CTA per screen. Binding-action color: the historical `--cta` orange rule is **pending client approval** (see brand-tokens `--cta` section); the current implementation uses restrained purple primaries. Do not extend orange usage until decided.
- **Secondary actions** (Cancel, Back, View terms, Open details): white surface with **fine gray outline** (`--line-2`) or restrained text/ghost button. Never heavy or colorful.
- Moderate button rounding (`--r-2`/`--r-3`); no pill-shaped primary buttons.
- Tap feedback: subtle opacity/scale/pressed states; micro-animations minimal, transform/opacity only, `prefers-reduced-motion` respected.
- **Slide-to-confirm** (binding acceptance, binding cancellation): must clearly prevent accidental booking — full-width deliberate drag, locked until preconditions are met (e.g. 10-char reason), clear track label (sentence case), performant transform-only feedback.

---

## Per-screen Definition of Done

- Light + dark theme (`data-theme`) — dark is an internal extension, light is the client reference
- Empty + skeleton + error states where lists/details load async
- EN + DE via `i18n.js` keys only
- No inline `style={{}}` except dynamic width/position
- Keyboard: all actions reachable; icon buttons have `aria-label`
- Typography: no 700+ weights, no uppercase headings (per brand-tokens)
- Status: text label always present; color never the only indicator

---

## Primitives (reuse everywhere)

| Primitive | CSS / component | Notes |
|-----------|-----------------|-------|
| `StatusPill` | `.pill` + `--st-*` | Dot + sentence-case sans label; never color-only |
| `Badge` | `.ui-badge` | Numeric; 99+ cap; `--destructive` for action-required |
| `Sheet` | `.sheet` + `Sheet` component | Focus trap, ESC, footer Cancel \| Primary |
| `EmptyState` | `.empty-state` | Icon + title + optional action |
| `Skeleton` | `.skeleton-*` | Mirrors final layout |
| `InlineAlert` | `.inline-alert` | Persistent context errors/info |
| `ConfirmSheet` | `ConfirmSheet` | Destructive / binding confirmations |

---

## autheon-fe handoff (design-only)

| Prototype | Production target | autheon-fe (foundation) |
|-----------|-------------------|------------------------|
| `--brand-accent` `#6F29FF` | `brand-600` / `brand-500` | aligned |
| `--brand-text` `#111111` | `text-primary` | aligned |
| `--brand-canvas` `#F5F5F7` | `surface-muted` | aligned |
| **Inter Tight** | `font-sans` | **update required** — replace the `plus-jakarta` preset with an Inter Tight preset |
| `--st-*` status tokens | `status-*` Tailwind namespace | aligned |
| `--cta` `#EA580C` | `cta` / `cta-hover` | pending client decision (see brand-tokens) |
| 7-step type scale | `text-display` … `text-overline` | aligned; weights re-mapped to 400/500/600 |
| 4pt spacing | `spacing` 1–9 | aligned |
| Light + dark `[data-theme]` | `ThemeProvider` + shared CSS | aligned (web + admin) |
| Bottom tab IA | `(driver)` route group + `BottomTabBar` | **Step 2** — fixed-vs-floating unresolved |

Implementation of autheon-fe driver routes is a **separate plan**; this spec is the visual/UX contract.

---

## Component catalog (`driver-ui.jsx`)

Loaded before `driver.jsx` in `AUTHEON Prototype.html`. Access via `window.DriverUI`.

| Export | Props | Variants / behavior |
|--------|-------|---------------------|
| `StatusPill` | `status`, `children`, `className?` | Maps to `.pill.{status}`; dot + label |
| `Badge` | `count`, `variant?` (`primary` \| `destructive`) | Hidden when `count ≤ 0`; caps at 99+ |
| `EmptyState` | `title?`, `description?`, `actionLabel?`, `onAction?` | Centered empty list pattern |
| `SkeletonJobCard` | — | Single card-shaped placeholder |
| `SkeletonList` | `count?` (default 3) | Stack of job card skeletons; `aria-busy` |
| `Sheet` | `open`, `onClose`, `title?`, `footer?`, `centered?`, `className?` | ESC dismiss; backdrop click closes; sticky footer slot |
| `ConfirmSheet` | `open`, `title`, `message`, `confirmLabel?`, `cancelLabel?`, `onConfirm`, `onCancel`, `destructive?` | Centered; Cancel ghost + Confirm cta/danger |
| `SortSelect` | `value`, `onChange`, `options`, `label?`, `size?` (`md` \| `lg`) | Icon trigger + branded dropdown list (checkmark on active); no native OS picker |
| `AdminConfirmBridge` | — | Mount once in HTML; exposes `window.requestAdminConfirm()` |

### CSS companions

| Class | Use |
|-------|-----|
| `.empty-state`, `.skeleton-*` | Empty / loading |
| `.ui-badge`, `.ui-badge-destructive` | Numeric badges |
| `.sheet`, `.sheet-backdrop`, `.sheet-foot` | Sheet layout |
| `.inline-alert`, `.app-banner` | Persistent feedback |
| `.text-*`, `.stack-*`, `.row-*` | Typography / spacing utilities (see `styles.css` § TOKEN UTILITIES) |

### Formatters (`formatters.js`)

`window.AutheonFormatters`: `formatDate`, `formatTime`, `formatTimeWindow`, `formatMoney`, `formatPlz` — use Intl; do not duplicate in production.

### i18n

Driver keys used in `driver.jsx`: see [`driver-i18n-index.md`](driver-i18n-index.md) (regenerate with `node prototype/project/_export-driver-i18n.mjs`).
