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
4. **Footer** — vehicle-type icon + `manufacturer model` left, **price right** (19px/600, factual) — always one calm line. Falls back to the vehicle-type label when no manufacturer/model is recorded.
5. **Tag row** — wrapping chip row beneath the footer, in this fixed order: **registration-status tag** → **characteristic tags** → **transport-type chip** → **derived red-licence-plate notice**. All share the `--canvas` chip treatment (the red-plate notice re-tints it with the Warn pair) so any combination wraps cleanly at 375px.

| Slot | Content | Source |
|------|---------|--------|
| Route | Pickup city + PLZ → delivery city + PLZ | `startCity/startPlz/endCity/endPlz` |
| Schedule | Pickup date + window, delivery date + window | `pickup/delivery` |
| Vehicle | `manufacturer model` (icon carries the type), transport-type chip | `manufacturer/vehicleModel/vehicleType/transportType` |
| Status | Text-labelled pill (`Published` on marketplace) | `status` |
| Compensation | Driver offer, right-placed, premium/factual | `driverOffer` |
| Registration status | `Registered` / `Deregistered` — icon + text tag | `registrationStatus` |
| Additional characteristics | `Electric vehicle` / `Ready to drive` — icon + text tags, only when set | `electricVehicle/readyToDrive` |
| Red licence plates | Derived notice, only when *Deregistered + Own axle* | `AuthStore.jobRequiresRedLicencePlates(job)` |

### Vehicle domain (client confirmation “Systemlogik Fahrzeugeingabe”, 2026-07-26)

Supersedes the 2026-07-14/15 “important vehicle info” spec. **Four explicit categories** plus independent characteristics — never one flat multi-select tag collection. Canonical values, cardinalities and the derived rule: `docs/database/logical-model.md` → *Vehicle domain*.

**Presentation order of vehicle information** (identical in the marketplace preview and the complete order view, so the two read as the same object):

1. **Vehicle type** — `Passenger car` / `Truck up to and including 7.5 t` / `Truck over 7.5 t`
2. **Manufacturer**
3. **Model**
4. *(unlocked only)* **Official licence plate** — `.plate-badge`, shown whenever a plate exists **including for a deregistered vehicle** (a de-stamped plate is still recorded)
5. *(unlocked only)* **VIN** — mono
6. **Transport type** — `Own axle` / `Third-party axle`
7. **Registration status** — `Registered` / `Deregistered`
8. **Additional vehicle characteristics** — label line, then a chip row (`Electric vehicle`, `Ready to drive`); the block is omitted when neither is set
9. **Derived red-licence-plate notice** — last, so it reads as a consequence of 6 + 7

Registration status appears **once** per detail surface (as its own row, not repeated in the characteristics chips). On cards, where there are no rows, it appears as a tag.

**Derived red-licence-plate notice — visibility and prominence.** Shown **when and only when** `registrationStatus === deregistered && transportType === own_axle`, from the single shared component `DriverUI.RedPlatesRequiredNotice` (never re-derived per screen). Copy: `redPlatesRequired` = “Red licence plates required” / “**Rote Kennzeichen erforderlich**”, plus the `redPlatesRequiredDetail` sentence.

| Surface | Variant | Prominence |
|---|---|---|
| Marketplace / My Jobs card | `tag` chip | Last chip in the tag row; Warn tint makes it the only coloured chip present |
| Marketplace preview | `banner` | Full-width tinted banner directly under the Vehicle card — above the Accept CTA |
| Booking dialog | `banner` | **Clearly highlighted**, between the tour summary and the binding slide-to-confirm, so it cannot be committed past unseen |
| Complete order view (after booking) | `banner` | Under the Vehicle card; **remains visible after booking** — it is an execution requirement, not a temporary marketplace message |

It survives refetch, reload and the booking transition because it is derived on every render rather than stored. It is never client-writable.

**“Ready to drive” applicability (final UX decision, 2026-07-26).** `readyToDrive` is decision-relevant for **third-party-axle** transport. The admin control is **always rendered and always enabled**; when transport type is *Third-party axle* an emphasised applicability note appears beneath the chips (`vehicleReadyToDriveApplicability`). The value is **never auto-cleared, defaulted away or rewritten** when the transport type or any other control changes — so temporarily switching transport type cannot silently lose a stored value. It is **not mandatory**. The repository's established "hide the non-applicable field" pattern was **deliberately not applied** here: it existed only for the licence plate, and that exact destructive behaviour is what this confirmation removes. On driver surfaces the tag is shown whenever set, regardless of transport type.

**Approved vehicle types only.** The three types above are the complete set. `SUV`, `Van`, `Transporter`, `Oldtimer`, `Classic` and the older `Light truck <3.5t` / `LKW < 3,5t` band are **not storable** and never appear: the icon map covers exactly the three approved types, the filter sheet and notification preferences offer only those three, and there is no "(legacy)" label state or fallback icon.

**Responsive behaviour for long values and warning text.**

- The red-plate chip is the only `.vehicle-flag` with `white-space: normal`, so “Rote Kennzeichen erforderlich” **wraps** inside a 375px card instead of overflowing; the banner detail sentence wraps freely at `line-height 1.45`.
- Long vehicle-type labels (“Truck up to and including 7.5 t”, “LKW bis einschließlich 7,5 t”) and long `manufacturer model` pairs (e.g. `Mercedes-Benz Atego 7.5 t`) sit in the footer's flexible left slot; the price keeps its right position, and the tag row wraps to further lines rather than scrolling horizontally.
- In detail key/value rows the value column is right-aligned and wraps; VIN keeps `word-break` so a 17-character string never forces horizontal scroll.
- The tag row wraps at every supported width (375px mobile → wider tablet), and the page body must never scroll horizontally.

Text label always present — icons support, never replace, the label.

**In-app document viewer:** `DocumentPreviewSheet` is a full-height in-phone page rendering the seeded real 2-page PDF (`prototype/project/assets/transport-order-sample.pdf`) via pdf.js canvases (iframe fallback), with functional Download/Share/Print. All transport-order, tour-document, and Infopoint views/downloads serve this PDF — production streams the real file to the same surface.

Card presentation: white surface on `#F5F5F7`, moderate rounding, fine outline and/or very subtle shadow, calm spacing with useful density; small supporting icons only where they aid comprehension; cards (not a desktop table) are the marketplace idiom.

---

## Header & KPIs

- Marketplace header: greeting/avatar, notifications bell, screen title, sort + filter controls, applied-filter chips. Restrained — orientation without dashboard weight.
- **KPI row — removed at client request (2026-07, PR #17).** The three quiet chips (Available / Booked / Open documents, per PDF §4 "reduzierter Dashboard-Charakter") were implemented but then removed: the same counts already surface as tab badges in **My Jobs**, so the marketplace row only duplicated them. The `.kpi-row`/`.kpi-chip` CSS and `kpiAvailableJobs`/`kpiBookedJobs`/`kpiOpenDocuments` i18n keys remain in place but unused — re-introduce only on explicit client ask.

---

## Screen inventory

| Screen | Component | Required states | Primary CTA |
|--------|-----------|-----------------|-------------|
| Marketplace | `Portal` | default, filtered, empty, loading, blocked driver | Filter / open job |
| My Jobs | `MyJobs` | 4 tabs × empty / loading / populated (swipe between tabs) | Open job |
| Job detail (locked) | `JobLocked` | masked addresses, dashed route card | Accept (opens sheet) |
| Job detail (unlocked) | `JobUnlocked` | route, contacts, docs, cancellation; performed → `Job details / My documents` tab pills | Mark performed |
| Tour documents (active tours) | `JobTourDocuments` | empty, uploading, review | Upload |
| My documents tab (performed) | `MyDocRow` list in `JobUnlocked` | empty, populated, review states, remove | Upload document (fixed bottom bar) |
| Accept flow | `AcceptanceModal` | valid / invalid, daily limit hint | Accept bindingly (slide-to-confirm) |
| Mark performed flow | `MarkPerformedSheet` | confirm (slide), success empty, success + uploads | Slide to confirm → Done |
| Remove document | `RemoveDocModal` | confirm; blocked once in review | Remove (outline danger) |
| Report problem | `ReportProblemSheet` | 7 codes, min 10 chars, evidence | Submit |
| Notifications | `DriverNotificationsPane` | grouped by day, unread, empty | Deep link |
| Profile | `ProfilePaneFull` | view, edit MDR, pending | Request changes |
| Account & sign-in | `account-signin-card` in `ProfilePaneFull` | verified, pending-change | Change email address |
| Change email | `ChangeEmailSheet` | enter address, confirm code (+resend), success, error states | Send code → Confirm change |
| Infopoint | `Infopoint` | docs + news + help tabs, empty (swipe between tabs) | Download / Help |

---

## Buttons & interactions

- One primary CTA per screen. Binding-action color: the historical `--cta` orange rule is **pending client approval** (see brand-tokens `--cta` section); the current implementation uses restrained purple primaries. Do not extend orange usage until decided.
- **Secondary actions** (Cancel, Back, View terms, Open details): white surface with **fine gray outline** (`--line-2`) or restrained text/ghost button. Never heavy or colorful.
- Moderate button rounding (`--r-2`/`--r-3`); no pill-shaped primary buttons.
- Tap feedback: subtle opacity/scale/pressed states; micro-animations minimal, transform/opacity only, `prefers-reduced-motion` respected.
- **Slide-to-confirm** (binding acceptance, binding cancellation, **mark performed**): must clearly prevent accidental actions — full-width deliberate drag, locked until preconditions are met (e.g. 10-char reason), clear track label (sentence case), performant transform-only feedback. Shared control: `SlideToConfirm` (`driver.jsx`).
- **Swipe between in-screen tabs** (`SwipeViews`, `driver.jsx` — 2026-07, PR #17): My Jobs (Active / Performed / Cancelled / Empty run) and Infopoint (Documents / News / Help) are a paged carousel — a horizontal drag moves the track so the adjacent tab peeks in and snaps on release; the tab pills stay in sync and tapping still works. The gesture locks to one axis after ~10px so vertical list scrolling is preserved (`touch-action: pan-y`, per-pane `overflow-y`); transform-only, reduced-motion friendly. Not the bottom nav — that switches on tap only.
- **Digit-only numeric inputs** (2026-07, PR #17): the preferred postal-code input (profile push prefs) and the Marketplace filter PLZ fields strip non-digits on input (`inputMode="numeric"`). Mirrors the admin Create/Edit-Job numeric rules (postal code, house no., distance = digits; phone allows a leading `+`; money allows one decimal separator).

---

## Performed flow & My documents (Figma "Autheon RELOADED", 2026-07-15)

Source of truth: Figma file `CgaMrN7nmXS8xub0RxyzsJ` — nodes `8:2268` (details tab), `8:2387` (My documents tab), `8:2545` (remove confirmation), `8:2663`/`8:2567` (performed success, empty / with uploads).

- **Mark performed** opens `MarkPerformedSheet`: slide-to-confirm stage (tour summary card, protective copy, Cancel) → on slide, the store transition runs and the **success stage** appears: green disc check (`--st-accepted` disc, white check, `--st-accepted-bg` ring), "Tour performed successfully.", upload guidance with explicit skip option, dashed **Click to upload** dropzone (hint: `Max file size: 25 MB` when empty, file-type hint once uploads exist), document rows, Done.
- **Performed tour detail** gets tab pills under the header: inactive = white pill, fine `--line` outline; active = `--ink` fill with `--paper` text (board §H contrast, no purple); My documents carries a count badge.
- **My documents tab**: clean rows — `FileTypeBadge` (40×48, `--muted-2` file shape with folded corner, uppercase extension), filename + size, document type right-aligned, review-status pill only when the document left the `uploaded` state, × remove. Fixed bottom action bar with `Upload document` (design-system `btn primary`, radius `--r-2` — **not** the Figma pill shape) + file-type hint. Upload reuses the grouped `TourDocCategoryModal`.
- **Remove document** (`RemoveDocModal`): red-tinted trash icon (`--st-cancelled-bg`/`--st-cancelled`), title/body copy, Cancel + Remove. Remove follows the app's **outline danger** convention (board §I) instead of Figma's filled red. Store rule: `removeDriverTourDocument` allows removal only while `reviewStatus === "uploaded"` — reviewed documents are audit-relevant and can only be replaced.
- **Marketplace preview Route card** (locked detail): city + 8px dot (`--primary` start, `--ink` end), dashed `--line-dash` connectors both sides of a centered distance (14/600) over estimated duration (12, muted), PLZ beneath each city. Marketplace **cards** keep the original arrow route line.
- Deliberate deviations from the Figma mocks: no `docx` in the accepted-types hint (store accepts PDF + images only), no simulated failed-upload/Retry row (prototype uploads resolve synchronously), review-status pills added to rows (PRD requires visible correction needs).
- **DE length hardening (2026-07-15):** the notifications pane header is two rows (title + close, then subtitle + mark-all-read) because "Benachrichtigungen" / "Alle als gelesen markieren" cannot share one row on phone widths; the detail tab-pill row degrades to horizontal scroll (never clips) for long DE labels at ≤360px.

---

## Account & sign-in (self-service email change, 2026-07)

Driver-owned credential card inside `ProfilePaneFull`, placed directly under the identity header and **above** the operations-managed master-data card. Master data is "request changes" (ops approval); the **sign-in email is self-service** — the driver changes it themselves, verify-not-approve.

- **Card (`.account-signin-card`):** 🔑 `.account-signin-title` + `.account-signin-key`, an `.account-email-row` (label + `.account-email-value`) showing the current `.account-email-address` and its state, then a full-width secondary `Change email address` button (`.btn.block`) opening `ChangeEmailSheet`.
- **Email state (never color-only):** `.account-email-verified` — small green dot + "Verified account" text label — for the confirmed address; while a change is in flight, an amber `.pill.assigned` `.account-email-badge` ("Change pending") replaces it. The green uses `var(--st-ok, #1f9d55)` (see brand-tokens: token currently undefined, falls back).
- **`ChangeEmailSheet`** — one sheet advancing through three steps, title changes per step:
  1. **Enter** — current address (`.change-email-current`, address in `.mono`), new-address input, code notice. CTA `Send code`.
  2. **Confirm** — `CodeInput` 6-box code (`.code-input-row` / `.code-input-box`), `.change-email-resend-row` with a live `Resend in mm:ss` countdown → `Resend code`, a demo `InlineAlert` echoing the code, `Change address` (back) + `Confirm change`. Errors map to typed reasons (`invalid_email`, `same_email`, `duplicate_email`, `invalid_code`, `expired`, `restricted`).
  3. **Success** — `.change-email-success-check` (brand-tint disc + ✓), confirmation body, `Done`.
- **Model:** the new address only becomes active after the code sent to the **new** inbox is confirmed; the old inbox stays live until then and receives an `emailChangedNotify*` notification on success. No ops step.
- **i18n:** `accountSignin*`, `accountEmail*`, `changeEmail*`, `emailChanged*` (EN+DE) — regenerate the index after changes.

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
| `CodeInput` | `.code-input-row` + `.code-input-box` | 6-box one-time-code entry; mono digits (data identifier), auto-advance/backspace, `inputMode="numeric"`, `autoComplete="one-time-code"`, per-box `aria-label` |

---

## autheon-fe handoff (design-only)

| Prototype | Production target | autheon-fe (foundation) |
|-----------|-------------------|------------------------|
| `--brand-accent` `#6F29FF` | `brand-600` / `brand-500` | aligned |
| `--brand-text` `#111111` | `text-primary` | aligned |
| `--brand-canvas` `#F5F5F7` | `surface-muted` | aligned |
| **Inter Tight** | `font-sans` | aligned — Inter Tight preset shipped (`packages/config`), loaded in both apps |
| `--st-*` status tokens | `status-*` Tailwind namespace | aligned |
| `--cta` `#EA580C` | `cta` / `cta-hover` | pending client decision (see brand-tokens) |
| 7-step type scale | `text-display` … `text-overline` | aligned; weights re-mapped to 400/500/600 |
| 4pt spacing | `spacing` 1–9 | aligned |
| Light + dark `[data-theme]` | `ThemeProvider` + shared CSS | aligned (web + admin) |
| Bottom tab IA | `(driver)` route group + `BottomTabBar` | `BottomTabBar` + `DriverShell` shipped (neutral active, no purple capsule); floating default, `variant` flag — fixed-vs-floating still an open client decision |

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
| `RedPlatesRequiredNotice` | `job?` **or** `registrationStatus` + `transportType`; `variant` (`tag` \| `banner` \| `admin-banner` \| `admin-pill`) | **The one** derived red-licence-plate notice, shared by the Driver PWA and the Admin Backend. Consults `AuthStore.requiresRedLicencePlates` and renders nothing unless *Deregistered + Own axle*. Lives in `driver-ui.jsx` so the two apps cannot drift or redeclare it in the shared global scope. Accepts the live admin form state (which is not yet a job) via the explicit props. |

### CSS companions

| Class | Use |
|-------|-----|
| `.empty-state`, `.skeleton-*` | Empty / loading |
| `.ui-badge`, `.ui-badge-destructive` | Numeric badges |
| `.sheet`, `.sheet-backdrop`, `.sheet-foot` | Sheet layout |
| `.inline-alert`, `.app-banner` | Persistent feedback |
| `.account-signin-card`, `.account-signin-title/-key`, `.account-email-row/-value/-address/-verified`, `.account-email-badge` | Account & sign-in credential card |
| `.change-email-current`, `.code-input-row`, `.code-input-box`, `.change-email-resend-row`, `.change-email-success-check` | Change-email sheet + `CodeInput` |
| `.swipe-viewport`, `.swipe-track`, `.swipe-pane`, `.swipe-pane-body` | Paged swipe tab views (`SwipeViews`) — My Jobs / Infopoint tab carousel |
| `.vehicle-flag`, `.vehicle-flag.electric`, `.vehicle-flag.readyToDrive`, `.vehicle-flag.registered/.deregistered` | Vehicle tag chips (registration status + characteristics) |
| `.vehicle-flag.red-plates-required`, `.red-plates-banner`, `-head`, `-detail` | Derived red-licence-plate notice — existing `--st-warn` / `--st-warn-bg` pair, no new token (see `brand-tokens.md`) |
| `.axle-chip` | Transport-type chip (class name predates the rename; the *concept* is transport type) |
| `.text-*`, `.stack-*`, `.row-*` | Typography / spacing utilities (see `styles.css` § TOKEN UTILITIES) |

### Formatters (`formatters.js`)

`window.AutheonFormatters`: `formatDate`, `formatTime`, `formatTimeWindow`, `formatMoney`, `formatPlz` — use Intl; do not duplicate in production.

### i18n

Driver keys reachable from `driver.jsx`, `driver-ui.jsx` and the shared vehicle-domain label resolvers in `store.js`: see [`driver-i18n-index.md`](driver-i18n-index.md) (regenerate with `node prototype/project/_export-driver-i18n.mjs`). Vehicle labels are **never** hardcoded in a component — `AuthStore.vehicleTypeLabel` / `transportTypeLabel` / `registrationStatusLabel` own the canonical value → key mapping for both apps.
