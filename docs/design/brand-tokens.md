# AUTHEON — Brand Tokens (Farbgebung & Typografie)

> **Status:** Canonical brand source — **Design Direction Board, AUTHEON GmbH, July 2026** (client visual authority) + client guide §3 (2026-07-10).
> **Audit:** [`design-direction-board-audit.md`](design-direction-board-audit.md)
> **Executable source:** [`../../prototype/project/styles.css`](../../prototype/project/styles.css) `:root` + `[data-theme="dark"]`
>
> Token classes in this file:
> **[CLIENT]** — mandated by the Design Direction Board. Values are exact; do not reinterpret.
> **[INTERNAL]** — prototype-internal semantics (status colors, CTA orange, tertiary grays). Not client-selected; keep only while they satisfy the client rules.
> **[DARK]** — internal dark-theme extension. The board neither requires nor forbids it; **light theme is the client reference** and dark values must never redefine light-theme direction.

---

## Typography

### Primary UI font — [CLIENT]

| Rule | Value |
|------|-------|
| Primary UI font (driver **and** admin) | **Inter Tight** |
| Body text | 400 |
| Labels, navigation, important UI text | 500 |
| Especially important elements | 600 — **selectively** |
| 700 / 800 / 900 | **Not** a hierarchy mechanism. Allowed only as an explicitly justified exception (none currently in use) |
| Hierarchy | size, spacing, weight (≤600), grouping — never boldness alone |
| UPPERCASE | **Not** the default treatment for headings or labels. Permitted only for sparing small meta labels / section markers where it genuinely helps (see retained list below). Headings are calm, factual sentence case |

Retained uppercase meta labels (pending client confirmation — see audit "Client decisions"): admin sidebar eyebrow/section markers, demo-chrome `MOCK DATA` tag. Everything else is sentence case.

> Historical note: Plus Jakarta Sans was the primary font until 2026-07-14; it is fully replaced by Inter Tight per the Design Direction Board and must not reappear as a primary-font reference.

### Data font — [INTERNAL]

**JetBrains Mono** is an internal supporting choice (not the client's typeface) for data identifiers only: tour numbers, PLZ, VIN, license plates, timestamps, monetary values. Never for labels, navigation, buttons, headings, or table headers.

---

## Light theme — brand palette [CLIENT]

| Token | Hex | German (source) | Usage |
|-------|-----|-----------------|-------|
| `--brand-accent` | `#6F29FF` | Primäre Akzentfarbe | Focus rings, selected markers, limited accents, appropriate primary actions **only** |
| `--brand-text` | `#111111` | Primäre Schriftfarbe | Body, headlines, numbers, important UI text |
| `--brand-text-secondary` | `#6E6E73` | Sekundäre Schriftfarbe | Meta, help, supplementary labels |
| `--brand-canvas` | `#F5F5F7` | App Hintergrund | App background |
| `--brand-surface` | `#FFFFFF` | Oberfläche | Cards, forms, modals, nav containers |
| `--brand-border` | `#E5E5EA` | Border / Divider | Dividers, frames, subtle boundaries |

### Accent rules [CLIENT]

- Use the purple accent **very sparingly**: focus, selected markers, limited accents, appropriate primary actions.
- **No purple as a large decorative surface.**
- **No dominant purple navigation** — neither a purple bottom-nav capsule (driver) nor a purple-filled sidebar item (admin). Active navigation uses black/white/gray contrast, darker text, filled icons, or a subtle marker; purple may appear only as a restrained marker that does not dominate.
- White cards and content surfaces must clearly separate from the light-gray canvas (fine border and/or very subtle shadow).
- Do not conflate the brand purple with workflow status colors.

## Semantic aliases (CSS)

These map 1:1 in `styles.css`:

| Alias | Light | Class | Role |
|-------|-------|-------|------|
| `--primary` | `#6F29FF` | [CLIENT] | Brand accent |
| `--primary-ink` | `#5A16D9` | [INTERNAL] | Hover / pressed accent |
| `--primary-rgb` | `111, 41, 255` | [CLIENT] | RGBA accents |
| `--text`, `--ink` | `#111111` | [CLIENT] | Primary text |
| `--muted` | `#6E6E73` | [CLIENT] | Secondary text |
| `--muted-2` | `#8E8E93` | [INTERNAL] | Tertiary / disabled — never body-size text (contrast) |
| `--canvas` | `#F5F5F7` | [CLIENT] | App background (driver **and** admin) |
| `--paper` | `#FFFFFF` | [CLIENT] | Elevated surface |
| `--paper-2` | `#F1F5F9` | [INTERNAL] | Inset panels only — not an app canvas |
| `--paper-3` | neutral ink tint | [INTERNAL] | Hover/selected wash — neutral, not purple-tinted |
| `--line` | `#E5E5EA` | [CLIENT] | Default border |
| `--cta` | `#EA580C` | [INTERNAL] | Binding actions — **status: under client review**, see below |

### Button hierarchy (client button board, PDF p.6)

Primär (filled) · Sekundär (white + fine gray outline) · Tertiär (text) · Deaktiviert · Mit-Icon variants. The board renders the **Primär button near-black**, while §2 permits `#6F29FF` for primary CTAs — the prototype keeps purple primaries until the client decides (**open decision: dark vs purple primary**). Secondary/tertiary/disabled treatments match the board.

### Header icon buttons — one shared treatment [INTERNAL]

Driver primary-screen header actions (sort, filter, **notification bell**) all render as
`.header-btn` in `styles.css`. That class is the **single** declaration of the treatment; a
header action must never re-declare border, radius, size, surface or shadow.

| Property | Token | Value |
|----------|-------|-------|
| Border | `--line` | `1px solid #E5E5EA` |
| Radius | `--r-3` | 12px |
| Surface | `--paper` | `#FFFFFF` |
| Elevation | `--sh-1` | `0 1px 2px rgba(15,23,42,0.06)` |
| Size | — | 40 × 40 (adequate touch target; the single literal, declared once) |
| Hover border | `--line-3` | brand text color |
| Active/applied | `--primary` | filled purple + white icon (restrained marker, not a surface) |
| Focus | `--primary` | `outline: 2px solid`, `outline-offset: 2px` |

Client requirement (Taner Özdemir, 2026-07-26): *"The button should have exactly the same border
as the sorting and filter function."* Satisfied structurally — the bell is
`class="header-btn header-bell-btn"`, where `header-bell-btn` contributes **only**
`position: relative` plus the unread-badge anchor. Asserted in
`tests/regression/driver-header.structural.spec.ts` by comparing computed styles.

> No new token was introduced for this: 12px was already `--r-3` (the previous hardcoded `12px`
> literal is now the token) and border/surface/shadow already had tokens. The 40px square is the
> only remaining literal and is declared exactly once.

The `.header-btn` radius is `--r-3` (12px), not the `--r-2` (8px) named in the *Controls* row of
"Surfaces, radius, elevation" below. That 12px predates this change
and is left as-is — it is a pre-existing deviation to reconcile with the client separately, and
harmonizing the bell to the *existing* sort/filter value is exactly what was asked for. Do not
"fix" one of the three buttons in isolation; they move together or not at all.

### Count badges on header icon buttons [INTERNAL]

Two controls carry a numeric count badge: the **notification bell** (unread notifications) and the
**Marketplace filter button** (applied filters). Both reuse the same shared `Badge` primitive
(`driver-ui.jsx`) and the same anchoring rule — there is **one** badge implementation, not one per
feature. Only the *count semantics* differ, and those live in the feature code.

**Visual primitive — `.ui-badge` + `.ui-badge-destructive`** (`styles.css`):

| Property | Token | Value |
|----------|-------|-------|
| Background | `--destructive` | `#DC2626` |
| Text | — | `#FFFFFF` (on-destructive; the only literal, inherited from the existing primitive) |
| Radius | `--r-pill` | `999px` |
| Typography | `--text-overline` + weight 600 + `tabular-nums` | 0.6875rem base, overridden to 10px when anchored |
| Min size | — | `min-width: 18px` / `height: 18px` (anchored variant: 16px) |
| Padding | — | `0 5px` (anchored variant: `0 4px`) |
| Overflow | — | caps at `99+` (in the `Badge` component, not CSS) |

**Anchoring — `.header-btn > .header-btn-badge`** (one rule, shared by bell and filter):

| Property | Token | Value |
|----------|-------|-------|
| Placement offset | — | `top: -5px; right: -5px` (upper-right of the 40×40 control) |
| Ring | `--paper` | `1.5px` border so the badge separates from the button surface |
| Ring when button is applied/active | `--primary` | the applied filter button is `--primary`-filled; the ring follows the surface it sits on |
| Hit testing | — | `pointer-events: none` — the badge never steals a tap from its button |

**Host control — `.header-btn`** (unchanged by this feature): border `--line`, radius `--r-3`,
surface `--paper`, elevation `--sh-1`, 40×40, focus `2px solid --primary` at `outline-offset: 2px`,
applied/active state `--primary` fill. See "Header icon buttons" above.

> **No new token was introduced.** Background, text, radius, typography and the focus ring all
> resolve to existing semantic tokens; the anchored size/offset values are declared exactly once in
> the shared `.header-btn-badge` rule rather than duplicated per feature. Zero count renders **no
> element at all** (the `Badge` component returns `null`), so there is nothing to hide and no
> reserved space.

### `--cta` orange — under review [INTERNAL]

The orange binding-action rule is a **prototype invention** (functional semantic), not a Design Direction Board color. Implementation is currently inconsistent (accept / mark-performed render as purple primaries; only the overlap-confirm uses orange). It is *compatible* with the board (functional, restrained, text-labelled) but requires explicit client approval as the binding-CTA treatment. Until decided: keep the token, do not extend its use, do not present it as client-selected.

---

## Surfaces, radius, elevation [CLIENT]

| Rule | Value |
|------|-------|
| Canvas | `#F5F5F7`; normal content (lists, details, docs, forms, modals, profile) on white surfaces |
| Controls | inputs, textareas, selects, OTP cells, and **all** button variants (primary / secondary / tertiary / destructive / icon, including full-width) use `--r-2` (8px). Do **not** apply screen-level `rounded-full` / `9999px` overrides on these controls. Pill radius (`--r-pill`) is reserved for chips, tags, status pills, and intentional selectors only |
| Card rounding | moderate — `--r-3` (12px) default, `--r-4` (16px) max for cards; sheets ≤ 24px; **no** 32px+ surfaces, no bubble/pill cards |
| Card separation | fine 1px `--line` border and/or very subtle shadow (`--sh-1`) |
| Elevation | shadows stay neutral (slate/black, low alpha) — no colored/purple glows, no deep floating shadows |
| Density | calm spacing (4pt scale) with good information density — compact for comparison, never cramped |

## Gradients & motion [CLIENT]

- Gradients are optional, **rare and subtle**: small header details, empty-state backgrounds, minor depth accents. Never the main visual language.
- Micro-animations are minimal and performant: `transform`/`opacity` only, 120–320ms, always honoring `prefers-reduced-motion`.
- Tap feedback: subtle opacity, scale, or pressed states.

---

## Dark theme — brand palette [DARK]

Internal extension; not part of the client board. Must stay internally consistent and must not drive light-theme decisions.

| Token | Hex |
|-------|-----|
| `--brand-accent` | `#8F5BFF` |
| `--brand-text` | `#FFFFFF` |
| `--brand-text-secondary` | `#AEAEB2` |
| `--brand-canvas` | `#1C1C1E` |
| `--brand-surface` | `#2C2C2E` |
| `--brand-border` | `#38383A` |

---

## Brand vs status (do not conflate)

| Layer | Purpose | Examples |
|-------|---------|----------|
| **Brand** (`--primary`, `--brand-*`) [CLIENT] | Product identity | Focus ring, selected chips/markers, restrained primary buttons |
| **Status** (`--st-*`) [INTERNAL] | Logistics workflow | Draft, Published, Assigned, Accepted, Special case, Performed, Cancelled |

### Status colors (frozen semantics) [INTERNAL]

Retained under the board's conditions: consistently tokenized, **always paired with a text label**, visually restrained (soft tinted backgrounds, no large status-colored surfaces), accessible contrast in both themes.

| Status | Token | Hex | Notes |
|--------|-------|-----|-------|
| Draft | `--st-draft` | `#64748B` | |
| Published | `--st-published` | `#2563EB` | Logistics blue — not brand accent |
| Assigned | `--st-assigned` | `#C2410C` | |
| Accepted | `--st-accepted` | `#059669` | |
| Special case | `--st-special-case` | `#9333EA` | Shifted from `#A855F7` to avoid brand collision |
| Performed | `--st-performed` | `#0F172A` | Tinted bg + dark text (no solid dark chip) |
| Cancelled | `--st-cancelled` | `#DC2626` | |
| Warn | `--st-warn` | `#EA580C` | |

Always pair status pills with a **text label** — never color-only. Pill text is sans, sentence case, caption-sized (uppercase mono pill text retired 2026-07-14).

### Derived red-licence-plate notice (2026-07-26) [INTERNAL]

The derived “**Rote Kennzeichen erforderlich**” / “Red licence plates required” notice (see `logical-model.md` → *Red licence plates*) uses the **existing** `Warn` semantic pair — **no new token was introduced**, per the rule that a suitable warning/attention pattern must be reused rather than duplicated:

| Purpose | Token | Notes |
|---------|-------|-------|
| Notice text / icon / border | `--st-warn` `#EA580C` | Existing Warn semantic. Carries attention meaning app-wide. |
| Notice background | `--st-warn-bg` `#FFEDD5` light · `#4A2B12` dark | Existing tinted pair — soft surface, no large saturated fill. |
| Supporting detail line | `--muted` | Explanatory sentence sits one level below the headline. |

Reused **existing** components and primitives across the five required surfaces — nothing bespoke was added:

| Surface | Treatment | Existing pattern reused |
|---------|-----------|-------------------------|
| Admin Backend (Create/Edit Job, job detail) | `.banner.banner-warn` | Existing admin banner, already backed by `--st-warn-bg` |
| Admin inline (compact) | `.pill.warn.no-dot` | Existing warn pill |
| Driver marketplace card | `.vehicle-flag.red-plates-required` | Existing `.vehicle-flag` chip geometry, re-tinted with the Warn pair |
| Driver preview / booking dialog / complete order view | `.red-plates-banner` | Same tinted-surface + fine-border recipe as `.banner-warn`, scoped to `.phone-shell` metrics |

Because the notice is always **text-labelled** it satisfies the never-color-only rule. Related input/selection states in the rebuilt vehicle form also reuse existing tokens only: **chip + selected state** via `.chip` / `.chip.actionable` / `.chip.on` (`--primary` selected fill), **segmented single-select** via `.seg` / `.seg button.on`, **inputs** via `.input` + `--line` borders, and **focus** via the standard `--primary` focus ring. The VIN length error re-uses `--st-warn` as inline field-error text rather than introducing an error-specific token.

**Wrapping:** unlike the other single-word `.vehicle-flag` chips, the red-plate chip sets `white-space: normal` so the long German string wraps inside a narrow card instead of overflowing.

### Success-mark gradient (2026-07-30) [CLIENT]

The driver success checkmark became a standalone gradient mark with no disc. The gradient greens are a
**narrowly scoped new family** rather than a reuse of `--st-accepted`, because the approved reference
mark is a lighter, warmer green than the `#059669` status semantic — reusing the status token would
have changed the mark away from the reference, and re-toning `--st-accepted` to match would have
repainted every Accepted pill, badge and label in both surfaces. These tokens therefore paint **only**
the mark and its bloom; `--st-accepted` keeps its status meaning untouched.

| Purpose | Token | Light | Dark | Notes |
|---------|-------|-------|------|-------|
| Stroke, vertex end | `--success-mark-from` | `#54B765` | inherits light | Deepest green, at the mark's elbow |
| Stroke, mid stop | `--success-mark-mid` | `#6BC67B` | inherits light | Keeps the ramp faithful to the reference |
| Stroke, tip end | `--success-mark-to` | `#8FDE9C` | inherits light | Lightest green, at the long arm's tip |
| Bloom centre | `--success-glow` | `rgba(87,221,132,0.18)` | `rgba(87,221,132,0.22)` | Only token re-tuned for dark — a tint that lifts on white needs more presence on `--paper` |
| Bloom fade | `--success-glow-fade` | `rgba(87,221,132,0)` | same | Same hue at zero alpha, so the fade never interpolates through grey |

All five values were sampled from the approved reference image. The mark is `aria-hidden` and always
accompanied by a success title and description, so it satisfies the never-color-only rule.

> **Gap — `--st-ok` (2026-07):** the driver Account & sign-in "Verified account" badge (`.account-email-verified`) references `var(--st-ok, #1f9d55)`, but **`--st-ok` is not defined** in `:root`/`[data-theme="dark"]` — it silently falls back to the hardcoded green `#1F9D55`, which is *not* the existing `--st-accepted #059669`. This is an off-token hex by the back door. Resolve by either **defining `--st-ok`** (light + dark, contrast-checked) as a first-class positive/confirmation semantic, or **reusing `--st-accepted`** for the badge. The badge is always text-labelled, so it satisfies the "never color-only" rule regardless.

---

## Component token map — authentication screens (PR #32, documented 2026-07-29)

The auth screens introduced **no new tokens** — every surface, border and state resolves to an existing
semantic alias, which is why they theme in light and dark without their own palette. Documented
retroactively.

| Element | CSS | Token(s) |
|---------|-----|----------|
| Screen ground | `.auth-screen` | `--canvas` |
| Admin shell / card | `.auth-shell-admin`, `.auth-card-admin` | `--paper` on `--line`, card radius + `--sh-*` |
| Logo row | `.auth-logo-row` | brand mark, no token of its own |
| Heading / subheading | `.auth-heading`, `.auth-subheading` | `--text` / `--muted` |
| Field group + label | `.auth-field-group`, `.field-label` | existing form treatment |
| Input | `.input` (shared) | `--paper` on `--line`, focus ring `--primary` |
| Password show/hide | `.auth-password-toggle` | `--muted-2`, hover `--text`, `:focus-visible` `--primary` |
| Field error | `.auth-field-error` | `--danger-ink` — the **defined** danger text token |
| Form-level error | `.auth-root-error` | `--danger-ink` on `--st-cancelled-bg` |
| Forgot-password link | `.auth-forgot-link` | `--primary`; disabled state reduces opacity rather than changing hue |
| One-time-code cell | `.auth-otp-cell` (+`.active`) | `--paper` on `--line`; active border `--primary`, mono type |
| Submit | `.btn primary` | shared button — no bespoke auth button |
| Demo code notice | `InlineAlert` tone `info` | existing alert tones |

**Colour is never the only signal:** errors are text, the active code cell is also indicated by caret
position, and the password toggle carries an accessible name (`authAdminLoginShowPassword` /
`...HidePassword` and the driver equivalents).

---

## Component token map — dialog standard (2026-07-29)

The system-wide dialog standard introduced **no new tokens**. Every value resolves to an existing
semantic alias or an existing documented measure, which is why one contract themes correctly in light
and dark on both surfaces.

| Element | CSS | Token(s) | Class |
|---------|-----|----------|-------|
| Scrim | `.dialog-backdrop` | `--scrim-ink` at 45% + 2px blur — identical to `.sheet-backdrop` | [INTERNAL] |
| Panel surface | `.dialog-panel` | `--paper` on 1px `--line`, `--sh-3` | [CLIENT] |
| Panel rounding | `.dialog-panel` | **`--r-4`** — the reference dialog's rounding. Replaces `--r-3` from `.card`, which the console dialogs had inherited | [CLIENT] |
| Panel padding | `.dialog-panel` | 24px (4pt scale) — replaces 20 / 22 / 26 | [CLIENT] |
| Eyebrow | `.dialog-eyebrow` | `--text-caption`, 600, `--muted-2`, uppercase | [INTERNAL] |
| Title | `.dialog-title` | `--text`, 18px / 22px on `.phone-shell`, 600, `-0.015em` | [CLIENT] |
| Description | `.dialog-desc` | `--muted`, 13px, 1.55 | [CLIENT] |
| Content | `.dialog-content` | inherits; 14px gap | [CLIENT] |
| Reference summary card | `.accept-tour-summary` | `--paper-2` on `--line`, `--r-2` — was an inline style on the reference dialog itself | [CLIENT] |
| Actions | `.dialog-actions` | the existing canonical `minmax(0,1fr)/minmax(0,1.6fr)` grid, 12px gap, 44px floor — shared with `.sheet-foot` | [CLIENT] |
| Status icon disc | `.dialog-icon` | 52px disc; tone from `--st-assigned-bg`/`--st-assigned` (warning) and `--st-cancelled-bg`/`--st-cancelled` (destructive) — the same treatment the remove-document dialog already used. **Success is no longer a disc** — see the success-mark row below | [CLIENT] |
| Success mark | `.dialog-icon-success`, `.performed-success-check` | 80px box, **no disc**, hosting a 56px gradient checkmark over a radial bloom. Stroke gradient `--success-mark-from` → `--success-mark-mid` → `--success-mark-to`; bloom `--success-glow` → `--success-glow-fade`. Added 2026-07-30 | [CLIENT] |
| Focus state | global `:where(button, [role="button"], a):focus-visible` | `--primary` 2px outline, 2px offset | [CLIENT] |

**No off-token colour and no new radius.** The one previously off-standard value — hand-rolled action
rows rendering **42px** controls, below the documented 44×44 floor — is corrected by the shared rule.

---

## Component token map — Infopoint message list + detail (2026-07-29)

Replacing the expandable message card with a dedicated detail page introduced **no new tokens**. The page reuses the
existing driver drill-down chrome, so it themes in light and dark without its own palette.

| Element | CSS | Token(s) | Class |
|---------|-----|----------|-------|
| List row | `.infopoint-news-row` | Unchanged: transparent on the `.infopoint-card` surface, `--line` divider between rows | [CLIENT] |
| Row icon disc — unread / read | `.infopoint-news-icon.unread` / `.read` | Unchanged: `--primary` at 8% with `--primary` glyph / `--paper-2` with `--muted-2` glyph | [CLIENT] |
| Unread dot | `.infopoint-news-unread-dot` | `--primary`, 8px, 1.5px `--paper` ring — same treatment as the notification dot. Moved from an inline style to a class; no visual change | [CLIENT] |
| Read-state pill — read | `.infopoint-news-state` | `--muted` on `--paper-2` inside `--line`, radius 999px | [CLIENT] |
| Read-state pill — unread | `.infopoint-news-state.unread` | `--primary` text on `--primary` at 8%, border `--primary` at 24% | [CLIENT] |
| Forward chevron | `.infopoint-news-chev` | `--muted-2` | [INTERNAL] |
| Detail page surface | `.infopoint-message-page` | `--canvas` (client canvas, board §E) — the same ground as `.pwa-detail-body`, so the page reads as a detail screen | [CLIENT] |
| Detail header | `.pwa-detail-header.driver-subpage-header` | Unchanged: `--paper` on a `--line` bottom border; back control `--canvas` disc with `--sh-1`, raised to 44×44 | [CLIENT] |
| Message title | `.infopoint-message-title` | `--text`, 18px/600 | [CLIENT] |
| Message date | `.infopoint-message-date` | `--muted` via `.text-muted-sm`, mono | [INTERNAL] |
| Message body | `.infopoint-message-body` | `--text`, 14px, line-height 1.6, `white-space: pre-line` | [CLIENT] |
| Card | `.detail-card.infopoint-message-card` | Existing `.detail-card`: `--paper`, radius 16px, `--line`, `--sh-1` | [CLIENT] |
| Swipe-back motion | `.infopoint-message-page` | Transform-only, 0.18s ease; `touch-action: pan-y`; dropped under `prefers-reduced-motion` | — |

**Read state does not depend on colour.** The pill carries the words *New* / *Read* (and the row's accessible name
repeats them), so the `--primary` tint is reinforcement, not the signal.

---

## Component token map — driver notification cards (2026-07-29)

The notification card rework (category chip, inline tour preview, deep-link rows, unavailable state) introduced
**no new tokens**. Every surface, border and text colour resolves to an existing semantic alias, which is why the
cards theme correctly in light and dark without their own palette.

| Element | CSS | Token(s) | Class |
|---------|-----|----------|-------|
| Card surface / border | `.notification-card` | `--paper` on 1px `--line`, radius `--r-2` | [CLIENT] |
| Card surface — unread | `.notification-card.unread` | `--paper-2` (the existing unread tint, moved from the row to the card so the row and the expanded panel read as one surface) | [CLIENT] |
| Card border — expanded | `.notification-card.expanded` | `--primary` | [CLIENT] |
| Unread dot | `.notification-row-dot` | `--primary`, 8px | [CLIENT] |
| Category chip | `.notification-row-cat` | `--muted` text on `--paper-2` inside `--line`; `--paper` fill on an unread card. Pill radius 999px — a chip, not a status pill, so it never borrows a `--st-*` colour | [CLIENT] |
| Event heading | `.notification-row-title` | `--text`, 13px/600 | [CLIENT] |
| Preview text (2-line clamp) | `.notification-row-text` | `--muted`, 12px | [CLIENT] |
| Date / tour meta | `.notification-row-meta` | `--muted-2`, `--text-caption`, mono | [INTERNAL] |
| Right-hand chevron | `.notification-row-chevron` | `--muted-2`; 180° rotation for the open accordion | [INTERNAL] |
| Expanded panel divider | `.notification-card-panel` | 1px `--line` top border | [INTERNAL] |
| Preview labels / values | `.notification-preview-row dt` / `dd` | `--muted` 11px/600 / `--text` 12px/500 | [CLIENT] |
| Preview sub-line (schedule, transport type) | `.notification-preview-sub` | `--muted-2`, 11px | [INTERNAL] |
| Order status inside the preview | `Pill` | Existing `--st-*` family via `AuthStore.statusCls()` — reused, never re-declared | [CLIENT] |
| Pre-acceptance visibility hint | `.notification-preview-hint` | `--muted`, 11px | [CLIENT] |
| Unavailable-order copy | `.notification-unavailable` | **`--danger-ink`** — the defined light/dark danger text token. Deliberately not `--st-rejected-fg`, which is **not defined** in the token set (same class of bug as audit item on `--st-ok`, `.pill.verified`) | [CLIENT] |
| Card actions | `.notification-card-actions .btn` | Design-system `btn primary sm` / `btn sm`; no bespoke button treatment | [CLIENT] |
| Focus state | global `:where(button, [role="button"], a):focus-visible` | `--primary` 2px outline, 2px offset | [CLIENT] |

**Colour is never the only signal.** The category is a text chip (no per-category hue), the expanded state is
carried by the chevron rotation and `aria-expanded` as well as the border, and an unavailable order is stated in
words, not only in `--danger-ink`.

---

## Component token map — driver document upload (2026-07-27)

The upload-source action sheet (*Foto aufnehmen* / *Datei auswählen*) introduced **no new tokens**. Every surface,
border, icon and state below resolves to an existing semantic alias, which is why the sheet themes correctly in
light and dark without its own palette.

| Element | CSS | Token(s) | Class |
|---------|-----|----------|-------|
| Upload dropzone border (tour completion) | `.performed-upload-drop` | `--line-dash` (1px dashed), radius `--r-3` | [INTERNAL] |
| Upload dropzone background | `.performed-upload-drop` | `--paper`; hover `--paper-2` | [CLIENT] |
| Upload dropzone icon disc | `.performed-upload-icn` | `--canvas` fill, `--text` glyph | [CLIENT] |
| Upload dropzone CTA / hint text | `.performed-upload-cta` / `.performed-upload-hint` | `--text` / `--muted-2` | [CLIENT] / [INTERNAL] |
| Action-sheet surface | `.sheet` + `.upload-source-sheet` | `--paper`, 1px `--line`, sheet radius 24px (≤ the 24px sheet cap) | [CLIENT] |
| Action-sheet scrim | `.sheet-backdrop` | `--scrim-ink` at 45% | [INTERNAL] |
| Action-sheet grabber | `.sheet .grabber` | `--line-3` | [INTERNAL] |
| Action-row spacing | `.upload-source-actions` | 10px gap, 14px/16px row padding (4pt scale), min touch target 44px via `.touch-target` | — |
| Action row surface / border | `.upload-source-action` | `--paper` on `--line`, radius 12px (`--r-3` equivalent); hover `--canvas` | [CLIENT] |
| Action icon disc (camera / file) | `.upload-source-icn` | `--canvas` fill, `--text` glyph — same treatment as the dropzone disc | [CLIENT] |
| Action label / description | `.upload-source-label` / `.upload-source-desc` | `--text` 600 / `--muted` | [CLIENT] |
| Selected-document row | `.mydoc-row` | `--paper` on `--line`; filename `--text`, size + kind `--muted` | [CLIENT] |
| PDF / document representation | `.doc-file-badge`, `Ic.Pdf` | Neutral badge on `--paper-2`, `currentColor` glyph — **never** an `<img>` thumbnail | [INTERNAL] |
| Focus state | global `:where(button, [role="button"], a):focus-visible` | `--primary` 2px outline, 2px offset, `--r-1` | [CLIENT] |
| Error state (unsupported type, too large) | `InlineAlert` tone `error` | `--st-cancelled` family | [INTERNAL] |
| Success state (upload accepted) | `InlineAlert` tone `success` | `--st-accepted` family | [INTERNAL] |
| Upload-progress state | — | **Not applicable in the prototype** — the store commits the attachment synchronously, so there is no determinate progress affordance to tokenize. If production adds one, reuse `--primary` on `--paper-3` (the existing `.limit-meter` treatment) rather than introducing a token. |

Safe-area: the sheet adds `padding-bottom: var(--phone-chrome-bottom)` (`env(safe-area-inset-bottom)`), matching the
other bottom-anchored driver surfaces.

---

## Do / Don't

**Do**

- Use Inter Tight 400/500/600; JetBrains Mono only for tour no., PLZ, VIN, timestamps, money
- Use `--primary` for focus rings, selected chips/markers, and restrained primary buttons
- Use white cards with fine `--line` borders on the `#F5F5F7` canvas
- Use `--st-published` blue only inside `.pill.published` and status indicators
- Keep gradients rare/subtle and animations transform/opacity with reduced-motion support

**Don't**

- Use 700+ weights or UPPERCASE as default hierarchy
- Use purple for active navigation fills, large surfaces, hover washes, or toasts
- Use brand purple for Published status pills
- Use `#2563EB` / `#3B82F6` for primary buttons or nav (legacy ops blue)
- Hard-code hex in JSX — use CSS variables and utility classes
- Present `--cta` orange or any `--st-*` / dark-theme value as client-selected

---

## PWA manifest [INTERNAL]

| Property | Light | Dark |
|----------|-------|------|
| `theme_color` | `#FFFFFF` (restrained chrome; changed from `#6F29FF` per board accent rules) | `#1C1C1E` |
| Icon background | `#6F29FF` (brand mark itself — acceptable as identity, not UI surface) | `#6F29FF` |
