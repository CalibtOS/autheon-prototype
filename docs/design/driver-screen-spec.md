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

## Marketplace job card (required content)

Where the underlying data exists, each card makes directly visible:

| Slot | Content | Source |
|------|---------|--------|
| Route | Pickup city + PLZ ↕ delivery city + PLZ, immediately readable (`München → Berlin` reading order) | `startCity/startPlz/endCity/endPlz` |
| Schedule | Pickup date + time window, delivery date + time window (`Flexible` fallback) | `pickup/delivery` |
| Vehicle | Vehicle type + model, axle type | `vehicle/vehicleModel/axle` |
| Status | Operational status as a **text-labelled** pill (marketplace cards: `Published`) | `status` |
| Compensation | Driver offer, prominent, factual (no promotional styling), placed **right / center-right** | `driverOffer` |
| Conditional flags | Registered/deregistered, electric vehicle, red license plates — **only if the domain model provides the data** | — (see scope guard) |

**Scope guard:** the PRD tracks registered/deregistered as an open V1 question. Do not add backend fields, persistence, filters, or acceptance criteria for these flags; they are conditional UI metadata pending the PRD decision. There is no red-license-plate domain field — treat as conditional vehicle/order metadata only when supported by existing data.

Card presentation: white surface on `#F5F5F7`, moderate rounding, fine outline and/or very subtle shadow, calm spacing with useful density; small supporting icons allowed where they aid comprehension; cards (not a desktop table) are the marketplace idiom.

---

## Header & KPIs

- Marketplace header: greeting/avatar, notifications bell, screen title, sort + filter controls, applied-filter chips. Restrained — orientation without dashboard weight.
- The board *permits* (does not require) small KPIs (available jobs, booked jobs, open supporting documents). Currently not implemented; add only on client request and keep them small and quiet.

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
