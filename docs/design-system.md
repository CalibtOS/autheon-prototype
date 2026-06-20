# AUTHEON — Design System Guide

> **Status:** Current prototype reference. The executable source is [`../prototype/project/styles.css`](../prototype/project/styles.css); this guide records the reusable decisions for production work.

## Foundations

| Foundation | Current decision |
| --- | --- |
| Fonts | Plus Jakarta Sans for interface text; JetBrains Mono for identifiers, dates, and numeric metadata. |
| Type scale | Display `clamp(1.55rem, 1.1rem + 1vw, 2rem)`; title `1.12rem`; body `0.92rem`; micro `0.76rem`. |
| Radius | `4px`, `8px`, `12px`, `16px`, and fully rounded pills. |
| Elevation | Three levels: subtle border lift, raised card, and modal overlay. |
| Layout | Mobile-first driver view inside a phone shell; desktop admin sidebar plus content region. |
| Themes | Light and dark themes use the same semantic tokens; do not hard-code theme-specific component colors. |

## Semantic color tokens

Use the token names from `styles.css`, rather than literal hex values in new components.

| Use | Tokens |
| --- | --- |
| Brand and action | `--primary`, `--primary-ink`, `--cta` |
| Surfaces | `--canvas`, `--paper`, `--paper-2`, `--paper-3` |
| Text | `--text`, `--ink`, `--ink-2`, `--ink-3`, `--muted`, `--muted-2` |
| Borders | `--line`, `--line-2`, `--line-3`, `--line-dash` |
| Status | `--st-draft`, `--st-published`, `--st-assigned`, `--st-accepted`, `--st-special-case`, `--st-performed`, `--st-cancelled`, `--st-warn` and their paired background tokens |

Operational status colors are meaningful and must remain consistent: Draft gray, Published blue, Assigned orange, Accepted green, Special Case purple, Performed dark neutral, and Cancelled red. Do not use color as the sole status indicator; retain the text label and pill.

## Components

| Component | Required variants and behavior |
| --- | --- |
| Button | Default, primary, CTA, ghost, danger, icon, small, extra-small, and full-width. Disabled controls remain visible but cannot imply availability. |
| Input | Shared input/select/textarea styling; labelled fields; primary focus ring; clear validation feedback. |
| Status pill | Text label plus status color; use `Pill`/`.pill` semantics for every operational state. |
| Card | Standard bordered surface; `flat` for embedded content and `elev` for raised emphasis. |
| Tabs and segmented controls | Use for mutually exclusive local views such as job history and Infopoint content; expose the active state. |
| Modal and sheet | Bottom sheet for driver actions; centered modal for desktop confirmation or focused editing; preserve a clear heading, body, and action area. |
| Navigation | Persistent driver tab bar; admin sidebar with active state and counts where operationally useful. |
| Toast | Short confirmation or error feedback only; critical workflow decisions require persistent, inspectable state. |

## Interaction and accessibility baseline

- Every interactive element needs a visible keyboard focus state. The prototype includes focus-visible styling for navigation and table rows; extend this to all custom controls.
- Respect `prefers-reduced-motion`; motion must not be required to understand a state change.
- Use semantic buttons for actions, explicit labels for fields, and text alongside icons.
- Maintain sufficient contrast in both themes and verify status pills against their corresponding surfaces.
- Keep binding actions deliberate: acceptance and cancellation use a guarded confirmation flow, not a single destructive tap.

## Responsive behavior

- Driver workflows are phone-first. Preserve the persistent tab bar and bottom action affordances on narrow screens.
- Admin workflows are desktop-first. Tables, filters, and detail panels must remain usable at standard laptop widths; prioritize readable operational data over decorative density.
- Do not create a separate tablet-only information architecture. Tablet support is responsive best effort in Version 1.

## Content and localization

- All user-facing strings are maintained in `prototype/project/i18n.js` for EN/DE.
- Use configurable product naming; do not hard-code AUTHEON as the visible application name.
- Use the current operational vocabulary: **Report Problem**, **Special Case**, **Performed**, and **Tour documents**. Do not reintroduce the obsolete return-request terminology.

## Implementation rule

Before adding a component, reuse an existing token and component pattern from `styles.css`. If a new pattern is required, add a semantic token/variant and document it here; do not introduce one-off inline styling as a design-system substitute.
