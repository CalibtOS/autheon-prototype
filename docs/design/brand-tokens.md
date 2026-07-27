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

> **Gap — `--st-ok` (2026-07):** the driver Account & sign-in "Verified account" badge (`.account-email-verified`) references `var(--st-ok, #1f9d55)`, but **`--st-ok` is not defined** in `:root`/`[data-theme="dark"]` — it silently falls back to the hardcoded green `#1F9D55`, which is *not* the existing `--st-accepted #059669`. This is an off-token hex by the back door. Resolve by either **defining `--st-ok`** (light + dark, contrast-checked) as a first-class positive/confirmation semantic, or **reusing `--st-accepted`** for the badge. The badge is always text-labelled, so it satisfies the "never color-only" rule regardless.

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
