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

## Primary-screen header — `DriverScreenHeader` (shared)

> Client decision 2026-07-26 (Taner Özdemir / Ferhat Catak). **One** component renders the header of
> **all four** primary screens. Do not hand-roll a screen header; do not add per-screen top margins.
> Remediation: R28–R31 · Audit items 36–38.

**Component:** `DriverScreenHeader` in `driver.jsx`, rendering `.pwa-screen-header`.

```
DriverScreenHeader
  title              required — screen title (h1)
  subtitle           optional — one supporting line
  actions            optional — screen-specific header actions, rendered LEFT of the bell
  onOpenNotifications  handler from the shell; when present the bell renders
  notificationsOpen    drives aria-expanded
  unreadCount        presentation-only override — states gallery ONLY, never the app
  children           optional — extra header content below the title row (e.g. Infopoint sub-tabs)
```

### Structure

| Region | Contents |
|--------|----------|
| `.screen-header-row` | `.screen-header-titles` (h1 `.header-title` + `.header-subtitle`) on the left; `.header-controls` (screen `actions`, then the notification bell) on the right |
| `children` | Optional screen-specific header content beneath the title row |

### Per-screen configuration

| Screen | Component | Title key | Subtitle key | Header actions | Header children |
|--------|-----------|-----------|--------------|----------------|-----------------|
| Marketplace | `Portal` | `marketplace` | `exploreJobs` | — (sort/filter live in the results area) | — |
| My Orders | `MyJobs` | `myJobs` | `myJobsSubtitle` | — (search + sort live below the header) | — |
| Infopoint | `Infopoint` | `infopoint` | `infopointSubtitle` | — | — (sub-tabs are a sibling band *below* the header — see next section) |
| Profile | `ProfilePaneFull` | `profileTitle` | `profileSubtitle` | — | — |

All four carry the notification action. No screen currently passes `actions`; the slot exists so a
future screen action cannot reintroduce a bespoke header.

### Alignment rules

- **Titles start at the same visual height on all four screens.** Guaranteed by the single
  `padding: 16px 20px 14px` on `.pwa-screen-header` — verified by test, not by inspection.
- **The header's grey divider ends at the same height on all four screens** (client review
  2026-07-28). The header renders title + subtitle + `actions` only; anything a screen adds
  underneath — My orders' search row and tab pills, Infopoint's sub-tab pills — is a **sibling after
  the header**, never a header child. Putting sub-tabs *inside* `.pwa-screen-header` pushes that grey
  line ~65px lower on one screen and breaks the row of four. Verified by test.
- Screen-specific bands under the header (`.myjobs-tabs-slider`, `.infopoint-tabs-slider`) are
  full-bleed white with their own `border-bottom`, and repeat the header's 20px side padding (14px at
  ≤360px) so their first item lines up with the title above.
- Status bar / safe-area / notch offset is owned by `.phone-screen` (`pwa.css`: `padding-top:
  env(safe-area-inset-top)`), i.e. *above* the header. The header adds no device-chrome compensation.
- `.screen-header-row` uses `align-items: flex-start`, and `.screen-header-titles` has `min-width: 0`
  + `flex: 1`. Consequence: **screen actions never shift the title baseline**, and a long title wraps
  inside its own column instead of colliding with the bell.
- Subtitle length is free — a wrapping subtitle grows the header downward but never moves the title.

### Notification action

- Right-most item in `.header-controls` on every primary screen (same right edge on all four).
- Rendered as `class="header-btn header-bell-btn"` — the shared header icon-button treatment
  (border, radius, 40×40, surface, shadow) identical to sort and filter. See brand-tokens
  "Header icon buttons". `header-bell-btn` contributes only `position: relative` + the badge anchor.
- **Badge:** `Badge count={unread} variant="destructive"` anchored top-right, `aria-hidden`, caps at
  `99+`. Not the only unread signal.
- **Accessible name:** `driverNotifications`, with the count appended when unread > 0 →
  `"Notifications (3)"` / `"Benachrichtigungen (3)"`. Plus `aria-haspopup="dialog"` and
  `aria-expanded`. Focus-visible ring: `2px solid --primary`, `outline-offset: 2px`.
- **State:** the unread count comes from `store.getDriverNotificationUnreadCount()`; open/close state
  stays in the shell (`showNotifications`) and the destination is the existing
  `DriverNotificationsPane`. The header owns no notification state.

### Responsive

- One implementation for all widths — **no separate tablet design**. Verified 320 / 360 / 390 / 430 /
  768 / 1024 px, EN + DE, light + dark.
- ≤360px (`pwa.css`): header side padding 14px, title steps to 22px, row gap 8px. This is the only
  width-specific header adjustment, and it exists to protect long German titles from the bell.
- ≥720px the PWA caps the column at 720px; the header follows the column, it does not re-lay-out.

### Removed 2026-07-26 — do not reintroduce

The Marketplace **greeting/avatar block** is gone: the `JB` initials avatar, "Willkommen zurück," /
"Welcome back," and the driver name are **removed from the Marketplace header** and were deliberately
**not** moved to another screen. The `welcomeBack` i18n key is deleted. Removed CSS: `.pwa-header`,
`.header-top-row`, `.driver-welcome`, `.driver-avatar`, `.welcome-text`, `.welcome-sub`,
`.welcome-name`.

*The Profile identity block (avatar + name inside the Profile body) is unaffected and stays.*

## Marketplace results area

Client-agreed Marketplace structure (2026-07-26): bell top-right → title → **results count directly
below** → **filter controls around the results area**.

- `.portal-results-row`: "N results" left, `SortSelect` + filter button right (both `.header-btn`).
- Applied-filter chips (`.header-chips-row`) sit directly beneath that row.
- Both render outside the loading branch, so the controls do not vanish during the skeleton state.
### Applied-filter count badge

> The badge answers **"how many filters are narrowing this list?"** — it is **not** the number of
> matching Marketplace orders. The matching-order count is the separate "N results" caption to the
> left of the controls, and the filter panel's CTA (`showResults`) — do not conflate the three.

| Aspect | Specification |
|--------|---------------|
| **Location** | Upper-right of the Marketplace filter control (`.header-filter-btn`), offset `top/right: -5px`. Overlays the button; never displaces it. |
| **Component** | Shared `Badge` primitive (`variant="destructive"`) positioned by the shared `.header-btn > .header-btn-badge` rule — the same pairing the notification bell uses. Marketplace supplies only the count. |
| **Count source** | `getAppliedMarketplaceFilterCount(filters)` — a pure function of the **committed** filter object owned by the shell. One canonical derivation, shared with the applied-filter chip row. No separate count state exists. |
| **Counting semantics** | Counts a filter only when it restricts the result set. `startPlz` / `endPlz`: non-empty after trimming. `from` / `to`: each active bound counts separately (they are two independently removable chips). `vehicle` / `axle`: set **and** not the `"All"` default. Empty string, whitespace-only, `null` and `undefined` never count. Each key contributes at most 1. Unknown keys are ignored. Maximum reachable count is **6**. |
| **Excluded** | **Sorting** — never counted, and the sort control never carries a badge. **Search** — the Marketplace has no search field (search exists only on My Orders) and no requirement classifies it as a filter. **Result count** — the badge is never derived from how many orders came back. |
| **Multi-select** | Not applicable — the Marketplace has no multi-select filter. `vehicle` and `axle` are single-select. If one is introduced, the "count each value" vs "count the category once" rule must be decided by product before implementation. |
| **Zero count** | **No badge element is rendered at all** (`Badge` returns `null`). Nothing hidden-but-present, no reserved layout space, nothing for assistive tech to reach. The button also drops its applied/`active` fill. |
| **Update lifecycle** | Appears/updates on Apply; decreases when a chip is removed; disappears on Reset + Apply. Draft selections in the open panel do **not** move it — they are uncommitted; Cancel discards them. Immediate, derived on render; no effect-based synchronization. |
| **Relationship to the panel** | Independent of panel open/closed state. The whole point is that the count stays legible with the panel closed. Reopening the panel rehydrates it from the same committed filters, so the two can never disagree. |
| **Empty result set** | Filters matching zero orders still show their count — the badge is the explanation for the empty list, so it must not vanish with the results. |
| **Failed request** | The badge reflects filter state only; it is unaffected by request outcome. |
| **Accessible naming** | The count lives in the button's translated, **pluralized** accessible name via `tPlural("filtersApplied", count)` → "Filters, 3 applied" / "Filter, 3 aktiv". With no filters: `t("filters")` → "Filters" / "Filter". The badge is `aria-hidden` (decorative, never announced twice) and `pointer-events: none`. The control stays one focusable, clickable target with a visible `:focus-visible` ring and a 40×40 touch target. |
| **Responsive** | One implementation for all widths — no separate tablet layout. Verified 320 / 360 / 390 / 430 / 768 / 1024 px, EN + DE. Badge stays attached to the button, never crosses the viewport edge, sort and filter stay aligned, and showing it shifts neither control nor the screen title. |
| **Double digits** | `tabular-nums` + `min-width` growth handles 2-digit values; the primitive caps display at `99+`. Not reachable through the product UI (max 6), but covered by the states gallery so the primitive cannot regress. |
| **Persistence** | Follows Marketplace filter state exactly — it *is* that state. Filters live above the tab switch, so they survive navigating away and back; they reset on reload. No persistence was added for the badge, and none should be. |

**Date presets:** `Today` = marketplace fixture day `05.05.` (demo clock). `This week` = **Mon–Sun**
calendar week containing that fixture day (same rule as production FE against device-local today).
Audit item 43 resolved 2026-07-28.

- **KPI row:** currently **not implemented**. The `.kpi-row` / `.kpi-chip` CSS and the
  `kpiAvailableJobs` / `kpiBookedJobs` / `kpiOpenDocuments` i18n keys exist but are unreferenced —
  the row was dropped from `Portal` at some point after the 2026-07-14 remediation. Whether it
  returns (PDF §4 "reduzierter Dashboard-Charakter" marks KPIs as *may contain*) is an open client
  decision; see audit item 22.

---

## Screen inventory

| Screen | Component | Required states | Primary CTA |
|--------|-----------|-----------------|-------------|
| **Shared primary header** | `DriverScreenHeader` | no badge, unread single/multi digit (`99+` cap), long title/subtitle, with/without screen actions, narrow (320px), tablet column, keyboard focus | Notifications |
| Marketplace | `Portal` | default, filtered, empty, loading, blocked driver | Filter / open job |
| My Jobs | `MyJobs` | 4 tabs × empty / loading / populated (swipe between tabs) | Open job |
| Job detail (locked) | `JobLocked` | masked addresses, dashed route card | Accept (opens sheet) |
| Job detail (unlocked) | `JobUnlocked` | route, contacts, cancellation; **always** `Job details / My documents` tab pills | Mark performed (details) / Upload (docs, when allowed) |
| My documents tab (all statuses) | `MyDocRow` list in `JobUnlocked` | empty, populated, review states, remove; upload bar when `canDriverUploadTourDocument` | Upload document (fixed bottom bar) |
| Tour documents (legacy inline) | `JobTourDocuments` | retained helper; **not** mounted in unlocked detail — uploads live in My documents tab | — |
| Accept flow | `AcceptanceModal` | valid / invalid, daily limit hint | Accept bindingly (slide-to-confirm) |
| Mark performed flow | `MarkPerformedSheet` | confirm (slide), success empty, success + uploads | Slide to confirm → Done |
| Remove document | `RemoveDocModal` | confirm; blocked once in review | Remove (outline danger) |
| Report problem | `ReportProblemSheet` | 7 codes, min 10 chars, evidence | Submit |
| Notifications | `DriverNotificationsPane` | grouped by day, unread, empty, **ride** card collapsed / expanded (no category chip), unreachable target (reason only, no action), message + document + **profile** deep-link cards | Expand preview \| View order \| To my orders \| open message \| open document \| open profile |
| Profile | `ProfilePaneFull` | navigation list, active/completed probation, configured/unavailable help contacts | Request changes / Feedback mail / Report-error mail |
| Change email | Account nav row → `ChangeEmailSheet` | enter, confirm code (+resend), success, pending resume | Cancel \| Send code → Confirm change |
| Infopoint | `Infopoint` | docs + news + help tabs, empty (swipe between tabs) | Download / Help / open message |
| Infopoint message detail | `InfopointMessageDetail` | short message, long message (AGB-length), unread → read on entry | Back (arrow + left-edge swipe) |

---

## Buttons & interactions

- One primary CTA per screen. Binding-action color: the historical `--cta` orange rule is **pending client approval** (see brand-tokens `--cta` section); the current implementation uses restrained purple primaries. Do not extend orange usage until decided.
- **Secondary actions** (Cancel, Back, View terms, Open details): white surface with **fine gray outline** (`--line-2`) or restrained text/ghost button. Never heavy or colorful.
- Moderate button rounding (`--r-2`/`--r-3`); no pill-shaped primary buttons.
- Tap feedback: subtle opacity/scale/pressed states; micro-animations minimal, transform/opacity only, `prefers-reduced-motion` respected.
- **Slide-to-confirm** (binding acceptance, binding cancellation, **mark performed**): must clearly prevent accidental actions — full-width deliberate drag, locked until preconditions are met (e.g. 10-char reason), clear track label (sentence case), performant transform-only feedback. Shared control: `SlideToConfirm` (`driver.jsx`).
- **Swipe between in-screen tabs** (`SwipeViews`, `driver.jsx` — 2026-07, PR #17): My Jobs (Active / Performed / Cancelled / Empty run) and Infopoint (Documents / News / Help) are a paged carousel — a horizontal drag moves the track so the adjacent tab peeks in and snaps on release; the tab pills stay in sync and tapping still works. The gesture locks to one axis after ~10px so vertical list scrolling is preserved (`touch-action: pan-y`, per-pane `overflow-y`); transform-only, reduced-motion friendly. Not the bottom nav — that switches on tap only.
- **Digit-only numeric inputs** (2026-07, PR #17): the preferred postal-code input (profile push prefs) and the Marketplace filter PLZ fields strip non-digits on input (`inputMode="numeric"`). Mirrors the admin Create/Edit-Job numeric rules (postal code, house no., distance = digits; phone allows a leading `+`; money allows one decimal separator).

### Profile help mail actions

The **Help** group contains two independent list rows: **Feedback** and
**Report an error**. They use the same full-row hit target, icon alignment,
type scale, divider rhythm and trailing affordance as the other Profile
navigation rows, but they are actions rather than drill-down routes.

- Activating a row opens the device email client with `mailto:`; no Profile
  form page, modal or sheet is inserted first.
- Feedback and Report an error use different system-configured recipients and
  different localized subjects. Each subject includes the Partner ID.
- The URI contains recipient + subject only. Body, CC, BCC and attachments are
  absent, and both values are URL-encoded.
- The PWA never shows a sent/success state. It cannot know whether the user
  sends or abandons the draft in the external client.
- Long German labels wrap inside the row without clipping the icon or reducing
  the 44px minimum touch target. Keyboard activation and visible focus use the
  existing list-row behavior.

Admin System settings presents the backing values in one **Help contacts**
card. Its three rows are ordered Infopoint, Feedback, Report an error.
Infopoint has hotline + email; the other rows have email only. All rows use one
vertical spacing rhythm and one shared Discard changes / Save changes footer.
On narrow layouts fields stack within their row; the three purposes never
become a two-column card grid.

---

## Performed flow & My documents (Figma "Autheon RELOADED", 2026-07-15)

Source of truth: Figma file `CgaMrN7nmXS8xub0RxyzsJ` — nodes `8:2268` (details tab), `8:2387` (My documents tab), `8:2545` (remove confirmation), `8:2663`/`8:2567` (performed success, empty / with uploads).

- **Mark performed** opens `MarkPerformedSheet`: slide-to-confirm stage (tour summary card, protective copy, Cancel) → on slide, the store transition runs and the **success stage** appears: green disc check (`--st-accepted` disc, white check, `--st-accepted-bg` ring), "Tour performed successfully.", upload guidance with explicit skip option, dashed **Click to upload** dropzone (hint: `Max file size: 25 MB` when empty, file-type hint once uploads exist), document rows, Done. Activating the dropzone opens the document-type picker and then the **upload-source sheet** — see "Document upload — source selection" below. It never opens the camera.
- **Unlocked tour detail** gets tab pills under the header on **every** owned-tour status (assigned / accepted / performed / cancelled / empty-run): inactive = white pill, fine `--line` outline; active = `--ink` fill with `--paper` text (board §H contrast, no purple); My documents carries a count badge. Driver uploads are never inlined on the details tab.
- **My documents tab** ("Meine Dokumente"): clean rows — `FileTypeBadge` (40×48, `--muted-2` file shape with folded corner, uppercase extension), filename + size, document type right-aligned, review-status pill only when the document left the `uploaded` state, × remove. Fixed bottom action bar with `Upload document` when `canDriverUploadTourDocument` allows it (design-system `btn primary`, radius `--r-2` — **not** the Figma pill shape) + file-type hint. Upload reuses the grouped `TourDocCategoryModal` and then the shared **upload-source sheet** — identical behaviour to the tour-completion dropzone.
- **Remove document** (`RemoveDocModal`): red-tinted trash icon (`--st-cancelled-bg`/`--st-cancelled`), title/body copy, Cancel + Remove. Remove follows the app's **outline danger** convention (board §I) instead of Figma's filled red. Store rule: `removeDriverTourDocument` allows removal only while `reviewStatus === "uploaded"` — reviewed documents are audit-relevant and can only be replaced.
- **Marketplace preview Route card** (locked detail): city + 8px dot (`--primary` start, `--ink` end), dashed `--line-dash` connectors both sides of a centered distance (14/600) over estimated duration (12, muted), PLZ beneath each city. Marketplace **cards** keep the original arrow route line.
- Deliberate deviations from the Figma mocks: no `docx` in the accepted-types hint (store accepts PDF + images only), no simulated failed-upload/Retry row (prototype uploads resolve synchronously), review-status pills added to rows (PRD requires visible correction needs).
- **DE length hardening (2026-07-15):** the notifications pane header is two rows (title + close, then subtitle + mark-all-read) because "Benachrichtigungen" / "Alle als gelesen markieren" cannot share one row on phone widths; the detail tab-pill row degrades to horizontal scroll (never clips) for long DE labels at ≤360px.

---

## Authentication screens + the gate (PR #32, documented 2026-07-29)

> **The app opens on a login screen.** Every other screen in this document is reachable only after
> sign-in — on the framed client preview, on `/pwa/`, and in the Admin Backend. Documented
> retroactively: the screens shipped in PR #32 without their spec.

Primitives (`driver-ui.jsx`, on `DriverUI`) — **one** implementation for both surfaces:

| Primitive | Role |
|---|---|
| `LoginForm` | email + password, show/hide toggle, per-field and root error slots, forgot-password link |
| `AuthOtpInput` | 6 cells over one hidden input, so paste and keyboard navigation work |
| `ForgotPasswordFlow` | email → 6-digit code → new password, with a resend cooldown |
| `SetPasswordForm` | initial password from an invite link, plus an invalid-link state |

Screens: `DriverLoginScreen` · `DriverSetPasswordScreen` (`driver.jsx`), `AdminLoginScreen` ·
`AdminSetPasswordScreen` (`admin.jsx`).

### States to cover in QA

| Screen | States |
|---|---|
| Sign in | empty · invalid email · missing password · wrong credentials (root error) · password shown/hidden · submitting |
| Forgot password — email | empty · invalid email · submitted (always reports success — see below) |
| Forgot password — code | empty · partial · incorrect code · expired code · resend on cooldown · resend available |
| Set / reset password | empty · below minimum length · mismatch · complexity hint · invalid or missing invite link · success |

### Two rules that are security behaviour, not copy

- **No account enumeration.** A forgot-password request always reports success, even for an unknown
  email. Do not "improve" this into a "no such account" message.
- **Bounded codes.** 10-minute expiry (`PASSWORD_RESET_CODE_TTL_MS`), 30-second resend cooldown
  (`PASSWORD_RESET_RESEND_MS`), and an incorrect or expired code is rejected distinguishably.

### Two demo-only affordances — never ship these

- **The 6-digit code is displayed** in an info alert, because a static prototype cannot send email.
  Same convention as `ChangeEmailSheet`'s `demoCode`. Production delivery is a **Keycloak action
  email**; the code must never reach the client.
- **Any non-empty password authenticates.** There is nowhere here to store or verify a credential.

---

## Dialog standard (2026-07-29) — reference: "Accept tour"

> **One standard, both surfaces.** Shared primitive `DriverUI.Dialog` (`driver-ui.jsx`) + the
> `.dialog-*` CSS contract (`styles.css` "DIALOG STANDARD"). The console reaches the same primitive
> through `DriverUI.Dialog`. **Do not hand-roll a fixed backdrop + card for a new dialog.**

### The contract

| Aspect | Standard | Class |
|---|---|---|
| Backdrop | 45% `--scrim-ink` + 2px blur, flex-centred. **Console:** `position: fixed`, 24px padding (16px ≤420px) so a panel never touches the viewport edge. **Driver:** `position: absolute` — see "Scoped to the device" below | `.dialog-backdrop` (+ `--stacked` for a dialog opened from another dialog) |
| Panel | `--paper` on `--line`, **`var(--r-4)` rounding**, `--sh-3`, **24px padding**, bounded height `min(90vh, 760px)` | `.dialog-panel` |
| Widths | **480** default · **560** (`--md`) · **720** (`--lg`) · **360** (`--narrow`, short success messages) | `.dialog-panel--md` / `--lg` / `--narrow` |
| Eyebrow | optional uppercase context label, `--muted-2` | `.dialog-eyebrow` |
| Title | **centered**, 18px desktop / **22px phone**, 600, `-0.015em` — one type step above the description | `.dialog-title` |
| Description | **centered**, 13px, `--muted`, 1.55 | `.dialog-desc` |
| Content | **left-aligned**, internally scrollable, 14px gap | `.dialog-content` |
| Actions | canonical **Cancel \| Primary** `minmax(0,1fr) / minmax(0,1.6fr)` grid, 12px gap, **44px** min height; single action **spans the row**; 3+ actions wrap in a row with the same sizing; one column ≤420px | `.dialog-actions` (+ `--stack` / `--row`) |
| Status icon | **only when meaningful** — 52px disc, `--st-accepted` / `--st-assigned` / `--st-cancelled` families | `.dialog-icon` + `.dialog-icon-success` / `-warning` / `-danger` on the panel |

The action grammar is **`.sheet-foot`'s existing** 1:1.6 ratio and 44px floor, reused deliberately so
the two never drift.

### Scoped to the device, not the browser window

A driver dialog belongs to the **phone**, so `.phone-shell .dialog-backdrop` is
**`position: absolute`** (scoped to `.phone-screen`) with a 16px gutter, and
`.phone-shell .dialog-panel` drops the desktop max-width to `100%` / `max-height: 90%`. This is the
containment `.sheet-backdrop.center` always had, and it is load-bearing for the **framed client
preview**: with `position: fixed` the dialog centres on the whole browser page and spills out of the
phone mock, which is not how it appears on a device. The console keeps `position: fixed`, where the
viewport *is* the surface.

### Alignment — one structural rule, not an exception list

Title and description **centre**. `.dialog-content` stays **left-aligned**, because summaries,
key/value pairs, form fields, warnings and legal wording are unreadable centred. That is structural, so
no dialog decides for itself and there is no approval list of exceptions to maintain.

### Icons

Present only for **success / warning / destructive** status. Two byte-identical inline success SVGs
were deduplicated into one `DialogSuccessIcon`. No decorative icon exists, and removing one never
removed information — the title and description always carry the meaning.

**Success is the one tone that is not a disc (2026-07-30).** `DialogSuccessIcon` is now a standalone
56px checkmark with a gradient stroke over a soft radial bloom, and `.dialog-icon-success` drops the
52px disc. Warning and destructive **keep** their discs: a small `!` or `×` reads as an alert only
inside a container, so the disc is still load-bearing there. This is a success-only deviation from the
disc treatment, not the disc standard being retired.

The mark-performed success stage was the third success surface and still carried its own copy of the
old SVG; it now renders the same `DialogSuccessIcon`, so there is again **one** success glyph rather
than a shared primitive plus a divergent duplicate. Gradient stops come from tokens through CSS
classes (`var()` is not resolved inside an SVG presentation attribute), and the gradient id is scoped
per instance with `useId` so several marks can share one DOM without capturing each other's paint
server. The glyph stays `aria-hidden` — the title and description still carry the meaning.

### Bottom sheets are a separate spec

`FilterSheet`, `ReportProblemSheet`, `UploadSourcePicker` and the tour-completion upload stage stay
**bottom-anchored** with a drag-to-dismiss grabber and a leading-edge draggable header. They share only
the action grammar. Converting them to centred dialogs would change **interaction**, not visuals.

### Audit — every dialog, both surfaces

| Dialog | Type | Before | Now |
|---|---|---|---|
| **Accept tour** (`AcceptanceModal`) — *the reference* | operational summary + binding confirm | inline `padding: 24`, inline 24px `h2`, inline summary-card style, left title | the standard's own classes; **slide-to-confirm untouched**; actions stack full width (deviation 1) |
| Tour booked success | success | inline 26px padding, duplicated success SVG, 19px `h3` | `Dialog` + `DialogSuccessIcon`, `--narrow`; **discless gradient mark** (2026-07-30) |
| Report-problem submitted (`PendingNotice`) | success | identical duplicate of the above | `Dialog` + `DialogSuccessIcon`, `--narrow`; **discless gradient mark** (2026-07-30) |
| Probation limit reached | warning/info | `.confirm-sheet-panel` 22px, `Lbl` as title, flex-end single action | `Dialog`, single action spans the row |
| Same-day overlap | confirmation | `.confirm-sheet-panel`, flex-end actions | `Dialog`, eyebrow + centered title, canonical action grid |
| Remove document | destructive | own `.remove-doc-*` title/body/1fr-1fr actions | shared classes; **danger icon kept** (meaningful), canonical action grid |
| Tour-document category picker | selection | inline `padding: 20`, eyebrow used **as** the title | shared classes, real `.dialog-title` |
| Mark performed | confirm → success | slide stage + success stage | shared classes; **slide untouched**; success stage's duplicate SVG replaced by `DialogSuccessIcon` (2026-07-30) |
| Sign out / leave page (`ConfirmSheet`) | confirmation / 3-way | `Sheet centered`, left title | title centred via `.sheet.modal .sheet-head` |
| Document preview | content viewer | full-frame overlay, not a dialog | unchanged — deliberately not a dialog |
| Filter · Report problem · Upload source | bottom sheets | — | unchanged (separate spec) |
| **Console:** assign/reassign driver · cancel order | form / destructive | inline backdrop + `.card elev`, 480px, 22px, 18px left title, flex-end row | `Dialog` component |
| **Console:** account access · driver create/edit · admin create · master data (customers · addresses · Infopoint docs ×3 · news) · register tour document · accept invoice · view invoice · finance edit | form / confirmation / destructive / summary | 9 inline backdrops, `zIndex` 100–105, widths 440/480/520/560, padding 22, `h2` 17/18, flex-end rows, **42px** controls | shared `.dialog-*` classes: 16px rounding, 24px padding, documented widths, centered titles, canonical actions, **44px** controls |

### Audit finding beyond dialogs — `.btn.sm` corner radius

`.btn.sm` sets `border-radius: var(--r-1)` (**4px**) while every other button uses `--r-2` (8px), which
also contradicts the documented "moderate button rounding (`--r-2`/`--r-3`)" rule. It showed up as a
visibly sharper corner on the notification card's *View order* primary — reported from the running
prototype. **Fixed at the call site:** card-level and dialog-level primary actions use the full-size
`.btn` (which also clears the 44px floor), and `.notification-card-actions` matches the dialog
standard's 12px action gap. Tightening `--r-1` → `--r-2` on `.btn.sm` **globally** is a wider visual
change across many surfaces — recorded here, deliberately not taken in this pass.

**Verified** on the driver phone surface (401×869) and the console at desktop (1440) and tablet (834):
identical rounding, padding, centered title, title-over-description hierarchy, 44px controls and 12px
action gap; the action row inside the panel and the panel inside the viewport in every case.

---

## Marketplace empty states (2026-07-29)

> **Two states, one derivation.** Which empty state shows is decided by
> `getAppliedMarketplaceFilterCount(committedFilters) > 0` — the same canonical selector that drives
> the filter count badge and the chip row. Never a separate flag, so the empty state and the badge the
> driver is looking at cannot disagree.

| Condition | State | Class |
|---|---|---|
| ≥1 matching order | results list | — |
| Filters active, nothing matches | **existing** filter-related state: title `noJobsMatch`, description `noToursMatch`, *Filters* action opening the panel — **unchanged** | `.marketplace-empty-filtered` |
| No filters active, no open orders | **general** state: `marketplaceEmptyNoOrders` only — no description, **no action** | `.marketplace-empty-unfiltered` |

- Both use the shared `EmptyState` primitive; no new component and no new token.
- The general state deliberately has **no *Filters* action**. The message must not imply filtering
  caused the empty result, and a filter button implies exactly that.
- "No open orders" is a safe assertion, not a guess: the list is every `published` order with only the
  filter predicate applied, so at count 0 nothing is being excluded.
- Selection is derived per render from the committed filter object, so **apply / change / clear / reset**
  switch states with no extra wiring — and draft selections inside the open panel do not, matching the
  badge's committed-state rule.
- The stable classes exist so tests and reviewers can assert *which* state is showing without matching
  on copy.

**Terminology, unresolved.** The existing strings mix "jobs", "tours" and now "orders"
(`noJobsMatch` / `noToursMatch` / `marketplaceEmptyNoOrders`; DE says "Touren"). Nothing was renamed —
see the v2.22 changelog open question.

---

## Route stop identity — pickup / drop-off location name (2026-07-31)

> **A stop reads city → who → where.** After acceptance the driver needs to know *which company or
> person* is at each end of the route, not just the street.

Component: `JobUnlocked` (`driver.jsx`) — the single full-detail / committed order view, mounted by both
shells (`pwa/pwa-app.jsx`, framed prototype) only when `activeJob.mode === "unlocked"`.

| Element | Class | Notes |
|---------|-------|-------|
| City | `.city-name` | 15px / 600. Unchanged. |
| **Location name** | `.city-location-name` | **New.** 13px / 500, `--text`. The company or person responsible for this stop, between the city and the street. Wraps and breaks on overflow. |
| Street + postal code + city | `.city-address` | 12px muted. Unchanged; now also breaks on overflow. |
| Map action | `.map-link` | Unchanged; already `flex-shrink: 0`. |

**Source.** `job.startCompany` / `job.endCompany` — the denormalized display fields `syncDisplayFields`
mirrors from the order's own `pickup.name` / `delivery.name` **snapshot**. These are the same flat fields
the street/postal/city lines beside them already read, so the whole stop block comes from one tier.
Snapshot semantics are preserved: no live master-data lookup, so an order keeps the name it recorded
even after the address book changes.

**Never the customer.** There is no fallback to `customerName` / `customer`. The customer is the order's
counterparty and is often a different entity from the site at the kerb — the seed data shows customer
*Muller Automobile GmbH* against pickup stop *Muller Munich yard*. Substituting it would state something
the order does not record.

**Absent means gone.** `null`, `undefined`, empty and whitespace-only all drop the entire line — no
label, no placeholder, no dash, no reserved space. The line is unlabelled data, exactly like the street
line above it, so **no i18n key was added**.

**Visibility is unchanged.** See `driver_visibility_matrix` rows `pickup_location_name` /
`delivery_location_name` — the same tier the full address already had. The pre-acceptance marketplace
preview (`JobLocked`) uses a **different** route renderer (`.detail-route-city`: city + `PLZ` only, no
street), so the name cannot leak there; the notification **ride** preview carries no location name at all —
since v2.37 its projection is city-only for both stops, for a committed ride as well as an uncommitted one.

**Long names.** `.city-info` gained `flex: 1` + `min-width: 0` and the name breaks on overflow, so a long
company string wraps inside the stop column instead of stretching the flex row and pushing the map button
off the card.

---

## Infopoint messages — list + detail page (2026-07-29)

> **A message is a page, not an accordion.** Longer announcements (updated **AGB**, standing client
> instructions) are not readable inside an expandable row in a scrolling list, so the expandable card is
> gone.

Components: `Infopoint` → `InfopointMessageDetail` (`driver.jsx`), on the shared `DriverSubpageHeader`.

### Message list row (`.infopoint-news-row`)

| Element | Class | Notes |
|---------|-------|-------|
| Calendar icon + unread dot | `.infopoint-news-icon` (+`.unread`/`.read`), `.infopoint-news-unread-dot` | Unchanged treatment; the dot moved from an inline style to a class. |
| Title | `.infopoint-news-title` | 14px; 600 while unread, 500 once read. |
| Date | `.mono.infopoint-meta-datetime` | **Full stamp `DD.MM.YYYY + HH:MM` at 12.5px (2026-07-31, PRD v2.31, `[v2.31-infopoint-datetime]`).** Was the raw `publishedAt` string (`DD.MM. HH:MM`, no year) at 14px, which sat level with the 14px title. |
| Read state | `.infopoint-news-state` (+`.unread`) | *New* / *Read* as a small pill. **Colour is never the only signal** — the state is in words and in the row's accessible name (`"New: <title>"` / `"Read: <title>"`). |
| Forward chevron | `.infopoint-news-chev` (`Ic.Chev`) | Indicates navigation. Replaces the rotating `Ic.Down` accordion chevron. |

**Removed:** the 100-character body preview, the expanded body, the chevron rotation, and `aria-expanded`
on the row — the row navigates, it does not disclose.

### Detail page (`.infopoint-message-page`)

- **Replaces the whole Infopoint screen** — the shared screen header and the tab band are not rendered —
  so the message owns the full viewport. The bottom tab bar deliberately **stays**: this is a subpage
  inside the Infopoint tab, not a modal takeover like job detail.
- Header is the shared `DriverSubpageHeader`: back arrow upper-left (44×44 via `.driver-subpage-header`,
  above the shared 40px `.detail-back-btn` because it is the primary escape from a subpage), centred
  title (`infopointMessage` — "Message" / "Nachricht"), mirrored spacer, and the heading takes focus on
  entry so the new view is announced.
- Body card: `h2` title (`.infopoint-message-title`, wraps freely, `overflow-wrap: anywhere`), the date
  (`.infopoint-message-date` + `.infopoint-meta-datetime`, full `DD.MM.YYYY + HH:MM`), then the
  **complete** message (`.infopoint-message-body`) with
  `white-space: pre-line` so admin-typed paragraph breaks survive. **Never clamped, never truncated.**
- Opening marks the message read immediately; the list shows the new state on return. The open is also
  audited as a message view (see PRD v2.19).
- Back returns to the **complete** list with the News tab still selected.

### Left-edge swipe-back (optional, implemented)

`useEdgeSwipeBack` (`driver.jsx`), the iOS system gesture: a drag that **starts within 32px of the left
edge** and travels right follows the finger and commits past **72px**; abandoning it snaps back.

- **Progressive enhancement only.** The visible back arrow is always present and is the primary control;
  the gesture does nothing without touch.
- Axis-locked at 10px, the same threshold `SwipeViews` uses, so scrolling a long message is never
  hijacked.
- `touch-action: pan-y` on the page reserves the horizontal axis. Deliberately **not**
  `preventDefault()` — React's `touchmove` listener is passive, so the browser ignores it and logs a
  warning.
- Transform-only; the snap-back transition is suppressed while the finger is down and dropped entirely
  under `prefers-reduced-motion`.

---

## Notification cards — no categories, ride previews, contextual deep links (2026-08-04)

> **Supersedes the 2026-07-29 (v2.20) section.** Three things changed: the **category chip is gone**,
> the ride expansion shows **five values and nothing else**, and the **unavailable-order presentation
> and its *View more orders* action are removed**. What survived: two interaction models only — rides
> expand inline, everything else deep-links. A universal overlay or bottom sheet for every
> notification type is still explicitly **not** the model.

Components: `DriverNotificationsPane` → `DriverNotificationsList` → `NotificationRidePreview`
(`driver.jsx`; the component was `NotificationTourPreview`). Navigation and entitlement come from the
store (`notificationKind`, `resolveDriverNotificationTarget`, `driverNotificationJobPreview`,
`driverPushProjection`) — the view decides nothing about what a driver may see or reach.

### Card anatomy (every card, every type)

`.notification-card` owns the border, surface and unread treatment; `.notification-row` inside it stays the only
focusable element, so an expandable card is still one tab stop.

| Element | Class | Notes |
|---------|-------|-------|
| Unread dot / spacer | `.notification-row-dot` / `.notification-row-dot-spacer` | Unchanged. The spacer keeps read and unread cards aligned. |
| ~~Category chip~~ | ~~`.notification-row-cat`~~ | **REMOVED 2026-08-04.** No chip, no category tabs, no category filtering; `notifCategory*` and `notificationCategoryI18nKey()` are deleted. The card's text block now **starts** at the heading — no empty container is left behind, and no accessible name announces a category. |
| Event heading | `.notification-row-title` | 13px/600. First child of `.notification-row-body`. |
| Preview text | `.notification-row-text` | **Clamped to two lines** (`-webkit-line-clamp: 2`) so every card has a predictable height and the meta line is never pushed out of view. `white-space: pre-line` keeps the multi-line "order updated" body readable within the clamp. |
| Date / tour meta | `.notification-row-meta.mono` | Unchanged: `createdAt · tour`. |
| Right-hand control | `.notification-row-chevron` | `Ic.Down` rotated 180° when expanded (ride cards) or `Ic.Chev` pointing forward (deep-link cards). Vertically centred, `--muted-2`. |

### Ride cards — the one expandable type

Only rides expand: they are the single case where extra context genuinely helps before the driver
commits. Messages, documents and profile events have nothing to preview — they have a destination.

- The whole row is the toggle (`.notification-row-toggle`), carrying `aria-expanded` and `aria-controls` to the
  panel; the panel uses the `hidden` attribute so collapsed content is out of the a11y tree entirely.
- A screen-reader-only label states the action (`notifExpandPreview` / `notifCollapsePreview`).
- Expanding **never navigates.** The Notification Center stays open.
- One card is expanded at a time; expanding also marks the notification read.
- `.notification-card.expanded` takes a `--primary` border so the open card is identifiable without colour alone.

#### The five values, and only five

`.notification-preview` renders the ride id (`.notification-preview-tour`, unlabelled) then a `dl` of
exactly four rows:

| Row | Source | Rendered |
|-----|--------|----------|
| Ride id | `preview.tour` ← `job.tour` | Mono, no label. Display only — navigation uses `job.id`. |
| Pickup | `preview.pickupCity` | **City only.** No postal code, no street, no time window. |
| Delivery | `preview.deliveryCity` | City only. |
| Date | `preview.date` ← `job.pickup.date` | Full date `DD.MM.YYYY` via `F().formatDate()`. The ride's scheduled date **is its pickup date**. |
| Vehicle | `preview.vehicleName` | The app's **existing** vehicle display name — `AuthStore.vehicleDisplayName()`: manufacturer + model, falling back to the canonical vehicle-type label. **The same helper the Marketplace and My Jobs order cards call**, so one vehicle cannot read two ways. This is not a format invented for notifications; the v2.20 `type · manufacturer · model` composition was. |

**Removed with the metadata:** the status `Pill` in `.notification-preview-head`, the muted
`.notification-preview-sub` second lines (schedule, transport + registration status), the licence-plate
row, and `.notification-preview-hint` (*"…become visible after you accept"*). The hint went because the
projection is now **identical before and after acceptance** — there is nothing left to reveal, so
promising a reveal would be false. The red-plate notice stays absent: it keeps to its five canonical
surfaces (`DOMAIN.md`), and this preview is a summary, not a sixth execution surface.

**Visibility is a data property, not a styling one.** The panel can only render what
`store.driverNotificationJobPreview()` returned, and that projection is exactly
`{ jobId, tour, pickupCity, deliveryCity, date, vehicleName }`. Postal code, distance, price, customer,
street, location name, contacts, plate and VIN are **absent from the object** — so no CSS or markup
mistake can leak them, and no future edit can quietly re-add a field by rendering it.

**Action** (`.notification-card-actions`): exactly one primary, and **only when the ride can be
opened** — *View order* for a Marketplace order, *To my orders* for a committed ride. Design-system
`btn primary`; stretches to share the row and goes full width at ≤359px.

### Unreachable targets

`.notification-unavailable` in `--danger-ink` states the reason (*booked by another service partner* /
*withdrawn from the marketplace* / *cancelled* / *closed* / *gone* / *no longer permitted*).

*View order* is **removed, not disabled** — matching the repository's convention of hiding rather than
disabling unavailable actions. **No replacement action is offered:** the v2.20 *View more orders*
button (and `notifViewMoreOrders`) is **gone**, because a dead-end card must not grow a second journey
out of it. Reaching current work from a vanished Marketplace order is the job of push / deep-link
resolution, which falls back to the Marketplace. There is **no dedicated unavailable-order screen**.

A non-ride card whose target is gone is **not** a link: it renders static (`.notification-row-static`)
with `.notification-unavailable` underneath.

### Deep-link cards (Infopoint messages, documents, profile events)

- No accordion, no panel. The row itself is the link; the chevron points forward.
- An Infopoint card opens **that message's detail page**. A document card opens **that document's
  preview** on its tour. A **profile/account** card opens the Profile destination that holds its
  subject — master-data change sent/approved/rejected → the **Basic data** subpage; the sign-in email
  change → the Profile **landing page**, where the Account group and the email row live. No Profile
  subpage was invented for this, and no profile event is dumped on the landing page when a relevant
  subpage exists.
- Screen-reader labels: `notifOpenMessage` / `notifOpenDocument` / `notifOpenProfile`.
- Destinations are **stable keys** (`documentId`, `newsId`, `profileTarget`), never localized labels.
  `profileTarget: ""` legitimately means the landing page, so availability is decided by the driver
  session existing — not by the key being truthy.

### Origin-aware Back

**The reported defect:** Back after a notification deep link returned to the *target's* parent instead
of the menu page the Notification Center was opened from. It worked for rides only by accident — they
already carried `activeJob.fromTab` — while `onOpenNews` discarded the origin and profile events had no
destination at all.

- Each shell holds `notifOrigin`, set to the current tab when the bell is tapped. **Transient shell
  state only:** never persisted, never written to `user_notifications`, never inferred from
  notification text.
- It travels with the navigation: rides and documents through `activeJob.fromTab`; messages through
  `deepLinkNewsId` + `onReturnToOrigin`; Profile through `deepLinkSubpage` + `onReturnToOrigin`.
- `Infopoint` and `ProfilePaneFull` each track whether **the currently open** detail/subpage is the
  deep-linked one (`detailFromNotification` / `subpageFromNotification`). That flag — not the screen —
  decides the parent, which is why **ordinary navigation is unchanged**: Infopoint list → message →
  Back → list, My Jobs → ride → Back → My Jobs, Profile → subpage → Back → Profile.
- The origin is **consumed on use**, cleared when the pane is closed without navigating, and cleared by
  any deliberate tab navigation — so no later journey can inherit a stale one.
- The Profile **landing page** destination has no Back control by nature: the driver is already on the
  destination, with the tab bar visible.

**Browser/app Back is deliberately not wired.** The driver shells have no `pushState` history for
their own screens (only the admin app does, via its `returnSection` pattern), so the **visible** Back
control is the Back they support and the one made origin-aware here. Adding a driver history stack is
tracked as a separate open item; if it lands, the origin must move into history state so a `popstate`
Back honours it too.

### Push taps

`useNotificationDeepLink` (`driver.jsx`) reads `?notify=<notification id>` and both driver shells apply
the result identically through `resolveNotificationNavigation`. One handler covers cold start,
home-screen launch, background and a tap on an already-open instance (`popstate` / `hashchange`). Push
*delivery* is still simulated; there is no `push` / `notificationclick` handler in `pwa/sw.js`, and this
URL is the seam a real one would use.

| Push | Opens | Cold-start Back parent |
|------|-------|------------------------|
| **Marketplace availability** (generic) | The **Marketplace**, current data — *not* the pane, *not* a card expanded | Marketplace root |
| Marketplace ride, still available | Its Marketplace preview | Marketplace |
| Assigned / updated / historical ride | That ride's detail | My Jobs |
| Infopoint message | That message's detail page | Infopoint |
| Document | That document's preview on its tour | My Jobs |
| Profile / account | Its Profile destination | Profile |
| Missing, gone, unauthorized, malformed | Notification Center over the safe root | Marketplace |

A push launch has **no** originating menu page and **none is fabricated** — each target inherits the
parent the driver would have had by navigating there themselves.

**Generic Marketplace copy.** `store.driverPushProjection()` returns
`{ title, body, destination, generic }` for a Marketplace-availability event, with `body` =
*"New orders are available."* / *"Neue Aufträge sind verfügbar."* — **uninterpolated**, and the payload
has no field able to carry a job count, vehicle, route, city, price, distance or even the triggering
notification id. "The push names nothing specific" is therefore a property of the payload, not a
convention of the copy, and no stale claim can survive to the tap. The **in-app card keeps** its
pickup-city → delivery-city preview: those two values are inside the approved data set, and the driver
opened that list deliberately.

**On arrival** the Marketplace loads current availability through the existing load-on-open /
pull-to-refresh policy. A booked, withdrawn, cancelled or expired order is simply not listed — an
**empty Marketplace is a correct outcome**, shown through the existing empty state, never an error and
never a blank screen.

### Responsive

Phone-first inside the 392px frame. The preview `dl` is a 88px label column + value; at **≤359px** it stacks to one
column and the action button goes full width, so a long DE label never squeezes a value to two characters.
Values use `overflow-wrap: anywhere`, so a long city name wraps instead of widening the pane.


---

## Document upload — source selection (2026-07-27)

> **The general upload control must not open the camera directly. The camera is opened only after the driver
> chooses the photo-capture action.**

One shared implementation, `UploadSourcePicker` + `UploadSourceSheet` (`driver.jsx`), serves **every** Driver PWA
document-upload entry point. Do not add a second upload implementation.

### Entry points

| Entry point | Control | Component |
|-------------|---------|-----------|
| Tour-completion success modal | dashed **Click to upload** / *Zum Hochladen tippen* dropzone | `MarkPerformedSheet` |
| Tour detail → **Meine Dokumente** tab | fixed bottom `Upload document` bar (when upload allowed) | job-detail documents tab |

### Flow

1. Driver activates the upload control (tap, or keyboard Enter/Space — it is a real `<button>`).
2. `TourDocCategoryModal` asks for the **document type** (invoice, fuel receipt, toll receipt, delivery note,
   waiting-time evidence, other receipt, other proof). *Replace file* skips this step — the type is inherited.
3. The **upload-source bottom sheet** opens. Nothing device-side has happened yet.
4. The driver picks a source; the sheet closes and only then is the matching hidden input clicked.

### Source sheet

Bottom sheet on the standard `.sheet` surface (grabber, `--paper`, `--line`, ≤24px radius), title
`uploadSourceTitle` ("Add document" / "Dokument hinzufügen"), two full-width action rows, then Cancel.

| Action | Keys | Input |
|--------|------|-------|
| **Take photo** / *Foto aufnehmen* | `uploadSourcePhoto` + `uploadSourcePhotoDesc` ("Open the camera" / "Kamera öffnen") | `accept="image/jpeg,image/png,image/webp,image/gif"` (+ extensions), `capture="environment"` |
| **Choose file** / *Datei auswählen* | `uploadSourceFile` + `uploadSourceFileDesc` ("Select a PDF or image from your device" / "PDF oder Bild vom Gerät auswählen") | `accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"` (+ extensions), **no `capture`** |

Each row is icon + label + one-line description; the label carries the meaning, the icon never does. Rows are
`.touch-target` (≥44px), 10px apart, and visually distinct from the Cancel button.

### Camera behaviour

- **Mobile browser / PWA:** *Take photo* opens the camera-capable flow with the rear camera preferred;
  *Choose file* opens the device file picker and can select PDFs.
- **Desktop:** *Choose file* opens the normal desktop file picker. *Take photo* follows whatever the browser
  supports for `capture`; where direct capture is unavailable the browser falls back to its normal picker —
  the upload flow continues unchanged rather than erroring.
- No platform sniffing, no `navigator.mediaDevices` / `getUserMedia`: standards-based file inputs only.

### Supported file types and size

- Accepted everywhere: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
  *Take photo* is images-only — a PDF can never come from that action.
- Validation is MIME-first with an extension fallback (`isAllowedTourDocumentFile`, `store.js`) — never extension
  alone.
- **Maximum file size: 25 MB**, identical for captured photos, existing images and PDFs. Enforced in the store on
  every upload path (driver add, driver replace, admin attach/register, patch-with-file, empty-run evidence), not
  only in the picker's `accept`. The advertised hints (`performedUploadHintEmpty`, `myDocsUploadHint`) and the
  enforced limit must be changed together.
- **Single file per selection** — no `multiple` attribute. The source sheet simply reappears for the next document.

### PDF representation

A PDF is shown as a document, never as an image: `FileTypeBadge` renders the uppercase extension (`PDF`), with
filename, size and review state beside it. The badge is `aria-hidden`, so the kind is additionally exposed as text
(`docKindPdf` / `docKindImage` / `docKindFile`) for screen readers. PDFs are never placed in an `<img>`, and the
driver is never asked to photograph one. Opening a row uses the existing in-PWA `DocumentPreviewSheet`
(pdf.js canvas rendering).

### Cancellation

Dismissing the source sheet (Cancel, backdrop tap, Escape) or the OS picker is a **no-op**: no attachment row is
created, no error is shown, the screen is unchanged.

### Error states

Failures surface through the existing `InlineAlert` on the host screen, mapped from typed store reasons by
`tourDocUploadErrorMessage()` — unsupported type (`invoiceUploadInvalidType`), too large
(`invoiceUploadTooLarge`), restricted account, not-your-tour, tour-not-uploadable, not replaceable, not owner,
official document not replaceable. There is no generic "upload failed" string; the driver always gets the reason.

### Accessibility

- The upload control stays a focusable `<button>`; Enter/Space opens the source sheet.
- The sheet is `role="dialog" aria-modal="true"` labelled by `#upload-source-title`; focus moves to the first
  action on open, Escape closes it, and focus returns to the upload control on dismissal.
- Both actions have translated accessible names (text, not icon-only).
- Selected filename, file kind, size and review state are all readable text.
- Errors are announced through the existing `InlineAlert` mechanism.

### Mobile / desktop layout & stacking

Mobile-first bottom sheet with `padding-bottom: env(safe-area-inset-bottom)`. It renders inside the host screen's
overlay tree, so within the tour-completion modal it correctly paints **above** the modal panel (same pattern as
`TourDocCategoryModal`) instead of being trapped behind it. A double tap cannot open two pickers — the picker
guards re-entry while a native dialog is being opened.

---


## Account & sign-in (self-service email change, 2026-07; nav IA 2026-07-27)


Driver-owned sign-in email lives under the Profile **Account** group as a `ProfileNavRow` (`profileNavChangeEmail`, `Ic.Mail`, subline = current email or "Change pending"). It is **not** a drill-down subpage and **not** a standalone credential card. Master data stays "request changes" (ops approval); the **sign-in email is self-service** — verify-not-approve.

- **Nav row:** opens `ChangeEmailSheet` as a **centered modal** (`Sheet` + `centered`, same grammar as `ConfirmSheet` / Sign out) — not a bottom sheet.
- **Pending:** while a change is in flight the nav subline shows "Change pending"; reopening resumes the code step instead of starting a second flow.
- **`ChangeEmailSheet`** — three steps, title changes per step; sticky footer **Cancel (ghost) | Primary** at the shared `.sheet-foot` 1:1.6 ratio:
  1. **Enter** — `accountSigninHint`, current address (`.change-email-current`, `.mono`), new-address input, code notice. Footer: Cancel \| Send code.
  2. **Confirm** — `CodeInput` 6-box code, resend countdown → Resend code + "Change address" as primary-tinted underlined text links (`.change-email-text-link`, ≥44px) in one `.change-email-aux-row`, demo `InlineAlert`. Footer: Cancel \| Confirm change. Errors map to typed reasons (`invalid_email`, `same_email`, `duplicate_email`, `invalid_code`, `expired`, `restricted`).
  3. **Success** — `.change-email-success-check`, confirmation body, single full-width Done (`.sheet-foot > .btn:only-child`).
- **Model:** the new address only becomes active after the code sent to the **new** inbox is confirmed; the old inbox stays live until then and receives an `emailChangedNotify*` notification on success. No ops step.
- **i18n:** `profileNavChangeEmail`, `accountSignin*`, `accountEmail*`, `changeEmail*` (incl. `changeEmailCodeGroupLabel` / `changeEmailDigitLabel`), `emailChanged*` (EN+DE) — regenerate the index after changes.

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
| `.profile-nav-row`, `.profile-group` | Profile navigation list / Account group |
| `.change-email-current`, `.code-input-row`, `.code-input-box`, `.change-email-aux-row`, `.change-email-text-link`, `.change-email-success-check` | Change-email modal + `CodeInput` |
| `.swipe-viewport`, `.swipe-track`, `.swipe-pane`, `.swipe-pane-body` | Paged swipe tab views (`SwipeViews`) — My Jobs / Infopoint tab carousel |
| `.vehicle-flag`, `.vehicle-flag.electric`, `.vehicle-flag.readyToDrive`, `.vehicle-flag.registered/.deregistered` | Vehicle tag chips (registration status + characteristics) |
| `.vehicle-flag.red-plates-required`, `.red-plates-banner`, `-head`, `-detail` | Derived red-licence-plate notice — existing `--st-warn` / `--st-warn-bg` pair, no new token (see `brand-tokens.md`) |
| `.axle-chip` | Transport-type chip (class name predates the rename; the *concept* is transport type) |
| `.text-*`, `.stack-*`, `.row-*` | Typography / spacing utilities (see `styles.css` § TOKEN UTILITIES) |

### Formatters (`formatters.js`)

`window.AutheonFormatters`: `formatDate`, `formatTime`, `formatTimeWindow`, `formatMoney`, `formatPlz` — use Intl; do not duplicate in production.

### i18n

Driver keys reachable from `driver.jsx`, `driver-ui.jsx` and the shared vehicle-domain label resolvers in `store.js`: see [`driver-i18n-index.md`](driver-i18n-index.md) (regenerate with `node prototype/project/_export-driver-i18n.mjs`). Vehicle labels are **never** hardcoded in a component — `AuthStore.vehicleTypeLabel` / `transportTypeLabel` / `registrationStatusLabel` own the canonical value → key mapping for both apps.
