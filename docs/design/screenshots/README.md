# AUTHEON — Screenshot baseline & visual-regression plan

Validates the **Design Direction Board (July 2026)** direction against the rendered prototype. Companion evidence sets live in [`../audit-2026-07-14/`](../audit-2026-07-14/) (`before/` and `after/` of the board remediation).

## How to capture

1. Serve the prototype: `npm run dev` (http-server on `127.0.0.1:4173`)
2. Automated: `node prototype/project/_capture-design-audit.mjs <outDir>` (Chromium via Playwright; driver = phone frame in a 1440×1000 viewport, admin = 1440px full page, light + dark)
3. Manual: open `http://127.0.0.1:4173/prototype/project/AUTHEON%20Prototype.html`, switch Driver/Admin and Light/Dark via the top bar
4. Save PNGs as `{screen}-{theme}.png` (admin: `{screen}-{theme}-1440.png`)

Standard viewports/themes — every capture states both:

| Surface | Viewport | Themes |
|---------|----------|--------|
| Driver PWA | phone frame 392×800 (inside 1440×1000; production target 375px) | light + dark |
| Admin | 1440×1000 | light + dark |

## Required driver baselines (light theme unless noted)

| File name | How to reach | Validates |
|-----------|--------------|-----------|
| `marketplace-light.png` / `marketplace-dark.png` | Driver → Marketplace tab | default card content, white card on `#F5F5F7`, compensation right, filters/sort at top, bottom nav inactive+active |
| `marketplace-long-cities-light.png` | Marketplace with the longest seeded city names | truncation/wrapping of route lines |
| `marketplace-diff-dates-light.png` | Card whose pickup/delivery dates differ (e.g. 23.04. → 24.04.) | both dates + windows visible |
| `marketplace-metadata-light.png` | Card with important-vehicle-info tags set (seed tours 0847/0844: Registered · Deregistered + Red plates; My Jobs 0848: Registered + E-vehicle) | vehicle model, info tags, axle chip |
| `myjobs-status-light.png` | Any My Jobs card | tour number + status pill with text label (client decision 2026-07-14: marketplace cards carry neither) |
| `docview-light.png` | Job detail → transport-order view button | full-height in-app viewer rendering the seeded 2-page PDF |
| `filters-sheet-light.png` | Marketplace → filter button (top) | filter sheet, top-of-screen entry point |
| `header-kpi-light.png` | Marketplace header | restrained KPI chip row (Available / Booked / Open documents) |
| `job-locked-light.png` | Marketplace → tap published job | locked detail, masked data, secondary buttons |
| `job-unlocked-light.png` | My Jobs → active job | unlocked detail, contacts, docs, status pill |
| `slide-confirm-light.png` | Job locked → Accept | slide-to-confirm resting state |
| `myjobs-light.png` / `myjobs-dark.png` | My Jobs tab | status badges per card, tabs, search at top |
| `notifications-light.png` | Bell icon on Marketplace | full-height pane, day groups |
| `profile-light.png` | Profile tab | profile cards, switches, secondary buttons |
| `infopoint-light.png` | Infopoint tab | infopoint cards |
| `bottomnav-active-inactive-light.png` | Any tab (crop of tab bar) | active = contrast/darker text/neutral marker; **no dominant purple** |

## Required admin baselines

| File name | How to reach | Validates |
|-----------|--------------|-----------|
| `admin-overview-light-1440.png` / `admin-overview-dark-1440.png` | Admin → Jobs overview | job table/cards, sidebar active state (no purple fill), stat cards, status pills |
| `admin-job-detail-light-1440.png` | Overview → first row | detail card/form surfaces |
| `admin-modal-light-1440.png` | e.g. Assign driver dialog | modal surface, secondary buttons |

Dark captures are required wherever a screen has dark-specific styling; otherwise light + the two dark anchors (marketplace, admin overview) suffice — do not add redundant captures with no distinct validation value.

## Visual assertions (checked on every baseline refresh)

1. **Inter Tight visibly applied** (no Plus Jakarta Sans rendering; check `document.fonts` / rendered glyphs).
2. **No dominant purple navigation** — driver tab bar and admin sidebar actives are neutral; purple at most a subtle marker.
3. **White cards on light-gray canvas** (`#FFFFFF` on `#F5F5F7`).
4. **Moderate rounding** — cards ≤16px, sheets ≤24px, no pill-shaped buttons/cards.
5. **Fine outline or subtle shadow** on cards; no colored glows or deep shadows.
6. **No excessive bold** — headings ≤600; body 400; labels 500.
7. **No standard uppercase headings** — uppercase only in the approved meta-marker list (brand-tokens).
8. **Compensation visible and easy to compare** across marketplace cards (right/center-right, consistent format).
9. **Status never color-alone** — every pill carries a text label.

## Playwright integration

`tests/regression/*.visual.spec.ts` already snapshots most of these states EN/light at the desktop viewport (`npm run test:regression:visual`; update via `npm run test:regression:visual:update`). Production autheon-fe should add 375px-viewport diffs against these baselines. Screenshots remain optional for CI in the prototype repo.

## Open design decisions affecting baselines

- Fixed vs floating bottom navigation (currently floating) — re-baseline `bottomnav-*` when decided.
- Primary button color (dark per PDF button board vs purple per §2) — re-baseline detail/footer CTAs when decided.

Admin captures also include `admin-new-order-vehicle-light-1440.png` (job-creation Vehicle section with the important-vehicle-info controls).
