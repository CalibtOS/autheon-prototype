# AUTHEON — Brand Tokens (Farbgebung)

> **Status:** Canonical brand source — client guide §3 (2026-07-10).  
> **Reference image:** [`assets/farbgebung.png`](assets/farbgebung.png)  
> **Executable source:** [`../../prototype/project/styles.css`](../../prototype/project/styles.css) `:root` + `[data-theme="dark"]`

---

## Light theme — brand palette

| Token | Hex | German (source) | Usage |
|-------|-----|-----------------|-------|
| `--brand-accent` | `#6F29FF` | Primäre Akzentfarbe | Accents, active states, focus rings, primary CTAs, selected markers **only** |
| `--brand-text` | `#111111` | Primäre Schriftfarbe | Body, headlines, numbers, important UI text |
| `--brand-text-secondary` | `#6E6E73` | Sekundäre Schriftfarbe | Meta, help, supplementary labels |
| `--brand-canvas` | `#F5F5F7` | App Hintergrund | App background |
| `--brand-surface` | `#FFFFFF` | Oberfläche | Cards, forms, modals, nav containers |
| `--brand-border` | `#E5E5EA` | Border / Divider | Dividers, frames, subtle boundaries |

## Semantic aliases (CSS)

These map 1:1 in `styles.css`:

| Alias | Light | Role |
|-------|-------|------|
| `--primary` | `#6F29FF` | Brand accent |
| `--primary-ink` | `#5A16D9` | Hover / pressed accent |
| `--primary-rgb` | `111, 41, 255` | RGBA shadows |
| `--text`, `--ink` | `#111111` | Primary text |
| `--muted` | `#6E6E73` | Secondary text |
| `--muted-2` | `#8E8E93` | Tertiary / disabled (light) |
| `--canvas` | `#F5F5F7` | Page background |
| `--paper` | `#FFFFFF` | Elevated surface |
| `--line` | `#E5E5EA` | Default border |
| `--cta` | `#EA580C` | Binding actions (accept, mark performed) |

## Dark theme — brand palette

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
| **Brand** (`--primary`, `--brand-*`) | Product identity | Tab active, primary buttons, filter chips selected, focus ring |
| **Status** (`--st-*`) | Logistics workflow | Draft, Published, Assigned, Accepted, Special case, Performed, Cancelled |

### Status colors (frozen semantics)

| Status | Token | Hex | Notes |
|--------|-------|-----|-------|
| Draft | `--st-draft` | `#64748B` | |
| Published | `--st-published` | `#2563EB` | **Logistics blue** — not brand accent |
| Assigned | `--st-assigned` | `#C2410C` | |
| Accepted | `--st-accepted` | `#059669` | |
| Special case | `--st-special-case` | `#9333EA` | Shifted from `#A855F7` to avoid brand collision |
| Performed | `--st-performed` | `#0F172A` | Inverts in dark |
| Cancelled | `--st-cancelled` | `#DC2626` | |
| Warn | `--st-warn` | `#EA580C` | |

Always pair status pills with a **text label** — never color-only.

---

## Do / Don't

**Do**
- Use `--primary` for nav active state, primary buttons, selected chips, focus rings
- Use `--st-published` blue only inside `.pill.published` and status indicators
- Use `--cta` orange for binding driver actions (accept bindingly, mark performed)
- Use Plus Jakarta Sans for UI; JetBrains Mono for tour no., PLZ, VIN, timestamps, money

**Don't**
- Use brand purple for Published status pills
- Use `#2563EB` / `#3B82F6` for primary buttons or nav (legacy ops blue)
- Hard-code hex in JSX — use CSS variables and utility classes
- Use brand accent for non-interactive decoration at large areas

---

## PWA manifest

| Property | Light | Dark |
|----------|-------|------|
| `theme_color` | `#6F29FF` | `#1C1C1E` |
| Icon background | `#6F29FF` | `#6F29FF` |
