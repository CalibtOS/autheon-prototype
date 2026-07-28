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

**Known defect (open):** `from: "This week"` is offered as a preset and **is counted**, but
`jobMatchesDriverFilters` implements no `"This week"` branch, so it does not restrict results. See
audit item 43 — resolving it requires a product decision on week boundaries.

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
| Job detail (unlocked) | `JobUnlocked` | route, contacts, docs, cancellation; performed → `Job details / My documents` tab pills | Mark performed |
| Tour documents (active tours) | `JobTourDocuments` | empty, uploading, review | Upload |
| My documents tab (performed) | `MyDocRow` list in `JobUnlocked` | empty, populated, review states, remove | Upload document (fixed bottom bar) |
| Accept flow | `AcceptanceModal` | valid / invalid, daily limit hint | Accept bindingly (slide-to-confirm) |
| Mark performed flow | `MarkPerformedSheet` | confirm (slide), success empty, success + uploads | Slide to confirm → Done |
| Remove document | `RemoveDocModal` | confirm; blocked once in review | Remove (outline danger) |
| Report problem | `ReportProblemSheet` | 7 codes, min 10 chars, evidence | Submit |
| Notifications | `DriverNotificationsPane` | grouped by day, unread, empty | Deep link |
| Profile | `ProfilePaneFull` | view, edit MDR, pending | Request changes |
| Change email | Account nav row → `ChangeEmailSheet` | enter, confirm code (+resend), success, pending resume | Cancel \| Send code → Confirm change |
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

- **Mark performed** opens `MarkPerformedSheet`: slide-to-confirm stage (tour summary card, protective copy, Cancel) → on slide, the store transition runs and the **success stage** appears: green disc check (`--st-accepted` disc, white check, `--st-accepted-bg` ring), "Tour performed successfully.", upload guidance with explicit skip option, dashed **Click to upload** dropzone (hint: `Max file size: 25 MB` when empty, file-type hint once uploads exist), document rows, Done. Activating the dropzone opens the document-type picker and then the **upload-source sheet** — see "Document upload — source selection" below. It never opens the camera.
- **Performed tour detail** gets tab pills under the header: inactive = white pill, fine `--line` outline; active = `--ink` fill with `--paper` text (board §H contrast, no purple); My documents carries a count badge.
- **My documents tab** ("Meine Dokumente"): clean rows — `FileTypeBadge` (40×48, `--muted-2` file shape with folded corner, uppercase extension), filename + size, document type right-aligned, review-status pill only when the document left the `uploaded` state, × remove. Fixed bottom action bar with `Upload document` (design-system `btn primary`, radius `--r-2` — **not** the Figma pill shape) + file-type hint. Upload reuses the grouped `TourDocCategoryModal` and then the shared **upload-source sheet** — identical behaviour to the tour-completion dropzone.
- **Remove document** (`RemoveDocModal`): red-tinted trash icon (`--st-cancelled-bg`/`--st-cancelled`), title/body copy, Cancel + Remove. Remove follows the app's **outline danger** convention (board §I) instead of Figma's filled red. Store rule: `removeDriverTourDocument` allows removal only while `reviewStatus === "uploaded"` — reviewed documents are audit-relevant and can only be replaced.
- **Marketplace preview Route card** (locked detail): city + 8px dot (`--primary` start, `--ink` end), dashed `--line-dash` connectors both sides of a centered distance (14/600) over estimated duration (12, muted), PLZ beneath each city. Marketplace **cards** keep the original arrow route line.
- Deliberate deviations from the Figma mocks: no `docx` in the accepted-types hint (store accepts PDF + images only), no simulated failed-upload/Retry row (prototype uploads resolve synchronously), review-status pills added to rows (PRD requires visible correction needs).
- **DE length hardening (2026-07-15):** the notifications pane header is two rows (title + close, then subtitle + mark-all-read) because "Benachrichtigungen" / "Alle als gelesen markieren" cannot share one row on phone widths; the detail tab-pill row degrades to horizontal scroll (never clips) for long DE labels at ≤360px.

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
| Tour detail → **Tour documents** card | `Upload document / receipt` button, and **Replace file** on an existing row | `JobTourDocuments` |
| Performed tour → **Meine Dokumente** tab | fixed bottom `Upload document` bar | job-detail documents tab |

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
