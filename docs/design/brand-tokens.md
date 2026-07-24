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
