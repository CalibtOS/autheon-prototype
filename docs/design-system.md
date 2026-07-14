# AUTHEON — Design System Guide

> **Status:** Current prototype reference.  
> **Brand (canonical):** [`design/brand-tokens.md`](design/brand-tokens.md) — client Farbgebung §3  
> **Driver screens:** [`design/driver-screen-spec.md`](design/driver-screen-spec.md)  
> **Executable CSS:** [`../prototype/project/styles.css`](../prototype/project/styles.css)

## Foundations

| Foundation | Decision |
| --- | --- |
| Brand | Client Farbgebung — accent `#6F29FF`, canvas `#F5F5F7`, text `#111111` / `#6E6E73` |
| Fonts | Inter Tight (UI — Design Direction Board 07/2026); JetBrains Mono (identifiers, dates, money only) |
| Type scale | 7 rem sizes: display, title, heading, body (16px min), body-sm, caption, overline |
| Spacing | 4pt scale: 4, 8, 12, 16, 20, 24, 32, 40, 48 |
| Radius | `--r-1` 4px … `--r-4` 16px, `--r-pill` |
| Themes | Light + dark via `[data-theme]`; same semantic token names |

## Semantic tokens

See [`brand-tokens.md`](design/brand-tokens.md) for full tables.

| Use | Tokens |
| --- | --- |
| Brand / interaction | `--primary`, `--primary-ink`, `--cta` |
| Surfaces | `--canvas`, `--paper`, `--paper-2`, `--paper-3` |
| Text | `--text`, `--ink`, `--muted`, `--muted-2` |
| Borders | `--line`, `--line-2`, `--line-3` |
| Status (logistics) | `--st-*` + `-bg` pairs — **not** brand accent |

**Rule:** Published status uses logistics blue `#2563EB` in pills. Brand purple is for navigation, CTAs, and selection — never for status fills.

## Components

| Component | Variants / behavior |
| --- | --- |
| Button | default, primary, cta, ghost, danger, destructive-outline, icon; min 44×44px touch |
| Input | Labelled; focus ring `--primary`; validation inline |
| StatusPill | Text + dot; `.pill.{status}` |
| Badge | `.ui-badge` — numeric, unified across bell/tabs/sidebar |
| Card | `.card`, `.section-card` — 16px padding mobile |
| Sheet / Dialog | Bottom sheet (driver); sticky footer Cancel \| Primary |
| TabBar | 4 items, icon + label, `aria-current="page"` |
| Toast | Transient confirmations only |
| EmptyState / Skeleton | Required on every list screen |

## Accessibility

- WCAG 2.1 AA contrast in both themes
- Real `<button>` / `<a>` for all actions; no `<div onClick>`
- `aria-label` on icon-only controls
- Sheets: focus trap, ESC, `aria-labelledby`
- `prefers-reduced-motion` respected globally

## Implementation rule

Reuse tokens and components from `styles.css`. New colors or sizes require a token + update to `brand-tokens.md` — or they do not merge.
