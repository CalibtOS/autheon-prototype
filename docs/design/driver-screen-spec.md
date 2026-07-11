# AUTHEON — Driver PWA Screen Specification

> **Status:** Design source of truth for driver PWA implementation.  
> **Prototype:** [`../../prototype/project/driver.jsx`](../../prototype/project/driver.jsx)  
> **Brand:** [`brand-tokens.md`](brand-tokens.md)  
> **PRD:** [`../requirements/prd.json`](../requirements/prd.json) (behavior authority)

---

## Navigation (bottom tabs)

| Tab ID | Label (i18n) | Component | Route target (production) |
|--------|--------------|-----------|---------------------------|
| `portal` | `marketplace` | `Portal` | `/marketplace` |
| `mine` | `myJobs` | `MyJobs` | `/jobs` |
| `info` | `infopoint` | `Infopoint` | `/infopoint` |
| `profile` | `profile` | `ProfilePaneFull` | `/profile` |

All tabs show **icon + label**. Active tab uses `--primary` capsule. Badge uses unified `Badge` component.

---

## Screen inventory

| Screen | Component | Required states | Primary CTA |
|--------|-----------|-----------------|-------------|
| Marketplace | `Portal` | default, filtered, empty, loading, blocked driver | Filter / open job |
| My Jobs | `MyJobs` | 4 tabs × empty / loading / populated | Open job |
| Job detail (locked) | `JobLocked` | masked addresses | Accept (opens sheet) |
| Job detail (unlocked) | `JobUnlocked` | route, contacts, docs, cancellation | Mark performed (CTA orange) |
| Tour documents | `JobTourDocuments` | empty, uploading, failed, review | Upload |
| Accept flow | `AcceptanceModal` | valid / invalid, daily limit hint | Accept bindingly |
| Report problem | `ReportProblemSheet` | 7 codes, min 10 chars, evidence | Submit |
| Notifications | `DriverNotificationsPane` | grouped by day, unread, empty | Deep link |
| Profile | `ProfilePaneFull` | view, edit MDR, pending | Request changes |
| Infopoint | `Infopoint` | docs + news + help tabs, empty | Download / FAQ |

---

## Per-screen Definition of Done

- Light + dark theme (`data-theme`)
- Empty + skeleton + error states where lists/details load async
- EN + DE via `i18n.js` keys only
- No inline `style={{}}` except dynamic width/position
- Keyboard: all actions reachable; icon buttons have `aria-label`
- One primary CTA per screen (binding actions use `--cta` orange)

---

## Primitives (reuse everywhere)

| Primitive | CSS / component | Notes |
|-----------|-----------------|-------|
| `StatusPill` | `.pill` + `--st-*` | Dot + label; never color-only |
| `Badge` | `.ui-badge` | Numeric; 99+ cap; `--destructive` for action-required |
| `Sheet` | `.sheet` + `Sheet` component | Focus trap, ESC, footer Cancel \| Primary |
| `EmptyState` | `.empty-state` | Icon + title + optional action |
| `Skeleton` | `.skeleton-*` | Mirrors final layout |
| `InlineAlert` | `.inline-alert` | Persistent context errors/info |
| `ConfirmSheet` | `ConfirmSheet` | Destructive / binding confirmations |

---

## autheon-fe handoff (design-only)

| Prototype | Production target | autheon-fe today |
|-----------|-------------------|------------------|
| `--brand-accent` `#6F29FF` | `brand-600` | `#2563eb` — **replace** |
| `--brand-text` `#111111` | `text-primary` | `#1f2226` — align |
| `--brand-canvas` `#F5F5F7` | `surface-muted` | `#f9fafb` — align |
| Plus Jakarta Sans | `font-sans` | Inter — **replace** |
| `--st-*` status tokens | `status-*` Tailwind namespace | partial `state.*` |
| Bottom tab IA | `(driver)` route group + `BottomTabBar` | Dashboard/Invoices scaffold |

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
| `SortSelect` | `value`, `onChange`, `options`, `label?`, `size?` (`md` \| `lg`) | Icon trigger + branded bottom sheet list (checkmark on active); no native OS picker |
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

