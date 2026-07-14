# AUTHEON — Design Direction Board Prototype Remediation

> **Status:** v1.1 — 2026-07-14. Implementation pass following [`design-direction-board-audit.md`](design-direction-board-audit.md); rows R17–R21 added the same day after the client PDF arrived (reference card layout, important-vehicle-info fields, header KPIs).
> **Scope:** R1–R16 are presentation-only. R18/R19 additionally add the **client-directed optional vehicle-info fields** (`registrationStatus`, `electricVehicle`, `redPlates`) to the prototype store seeds/form mapping, mirrored in `prd.json` (`resolved_defaults.vehicle_important_info_v1`), `schema.dbml`, and `logical-model.md`. Workflows, statuses, permissions, and all other PRD behavior untouched — verified by `_audit-prototype.mjs` (AUDIT PASS) and `_verify-seed.mjs` (all checks passed) after every change.
> **Evidence:** [`audit-2026-07-14/before/`](audit-2026-07-14/before/) vs [`audit-2026-07-14/after/`](audit-2026-07-14/after/) — driver = phone frame (392×800) light+dark, admin = 1440px light+dark, captured with `prototype/project/_capture-design-audit.mjs`.

## Change log

| Change ID | Screen | File(s) changed | DDB requirement | Before issue | After adjustment | Evidence screenshot | Notes |
|---|---|---|---|---|---|---|---|
| R1 | All | `AUTHEON Prototype.html:19`, `styles.css` `--font-sans` | §D Inter Tight primary font | Plus Jakarta Sans loaded/applied everywhere | Inter Tight 400/500/600/700 loaded; `--font-sans` swapped; JetBrains Mono retained for data identifiers only | every `after/*` capture | 800-weight no longer requested |
| R2 | All | `styles.css` (global), `driver.jsx`, `admin.jsx` | §D 400/500/600 hierarchy | 700 default for titles, city names, prices, stats; one 750 | All `font-weight: 700` / inline `fontWeight: 700` → 600; unread-news 750→600/500 | `after/driver-marketplace-light.png`, `after/admin-overview-light-1440.png` | Calm hierarchy; 600 is the ceiling |
| R3 | All | `styles.css` `.pill` | §C/§D status labels not uppercase mono | 10.5px mono UPPERCASE pills | 12px Inter Tight sentence-case pills, dot + label kept | `after/admin-overview-light-1440.png` | Larger text also helps contrast (audit #34) |
| R4 | Admin | `styles.css` `.tbl th`, `admin.jsx` (2 inline meta lines) | §D no uppercase table headers/meta | Mono uppercase table headers, dispatcher role, offer meta | Sentence-case sans 12px/500 | `after/admin-overview-light-1440.png`, `after/admin-job-detail-light-1440.png` | Sidebar eyebrow/section markers deliberately retained uppercase (sparing-use list) |
| R5 | Driver | `styles.css` `.tabbar-*` | §H no dominant purple nav; white bar; neutral active | Dark-navy floating capsule (`#1c2533`), deep shadow, purple-filled active item | White `--paper` bar, fine `--line` border, subtle shadow; active = light-gray capsule + dark text + filled icon; badge border follows surface | `after/driver-marketplace-light.png` + dark | Floating geometry preserved — open client decision |
| R6 | Admin | `styles.css` `.nav-item.on` | §B/§H no purple sidebar active | Purple-filled active nav item | Neutral `--paper-2` fill + darker 600 text (dark: white 9% wash) | `after/admin-overview-light-1440.png` | |
| R7 | Marketplace | `driver.jsx` `JobCard` | §F operational status + identity on card | No status or tour number on marketplace cards | Header row: `Tour #… ` + text-labelled `Published` pill (existing `job.status` only) | `after/driver-marketplace-light.png` | No new data invented; registered/deregistered/EV/red-plates remain pending PRD |
| R8 | All | `styles.css` `--paper-3`, `--sh-2`, chip glow, `.toast` | §B purple very sparse; §E subtle neutral elevation | Purple-tinted hover wash on all surfaces, purple-glow hover shadow, purple chip glow, purple toast surface | Neutral gray wash `rgba(17,17,17,0.04)`, slate shadows, glow removed, toast on neutral `#111` chrome surface | `after/admin-overview-light-1440.png` | Focus rings, selected chips, slide fill keep purple (allowed accents) |
| R9 | Driver | `styles.css` `.driver-avatar` | §B no purple decorative fills | Solid purple avatar disc | 12% brand tint + purple initials (restrained accent) | `after/driver-marketplace-light.png` | |
| R10 | Driver | `styles.css` `.phone-shell .jobcard`, `.phone-shell .sheet`, `.lg-cta`, `driver.jsx` bottom buttons | §E moderate rounding; §I no pill buttons | 24px cards, 32px sheets, 9999px primary buttons | Cards ≤16px, sheets 24px, action buttons `--r-3` | `after/driver-job-unlocked-light.png`, `after/driver-filter-sheet-light.png` | Small price chip stays pill-shaped (chip idiom) |
| R11 | Both | `styles.css` `.btn` | §I secondary = white + fine gray outline | Secondary buttons outlined in `#111` black | Border → `--line-2` fine gray | `after/driver-job-unlocked-light.png` | |
| R12 | Both | `styles.css` `.pill.performed` (+ dark pair) | §C restrained status colors | Solid near-black chip, white text | Tinted slate bg + dark text; dark-theme pair added | `after/admin-overview-light-1440.png` | |
| R13 | Driver | `i18n.js` `slideToConfirm`/`slideAccepted` (EN+DE) | §D no uppercase CTA copy | "SLIDE TO CONFIRM →" / "ACCEPTED" (+DE) | "Slide to confirm →" / "Accepted" (+DE) | `after/driver-slide-confirm-light.png` | Only justified casing change; index regenerated |
| R14 | Both | `styles.css` `.scroll-body`, `.pwa-detail-body`, `.admin` | §E canvas `#F5F5F7` | Detail/list/admin canvases used `#f1f5f9` | Unified on `--canvas` `#F5F5F7`; `--paper-2` reserved for inset panels | `after/driver-job-unlocked-light.png`, `after/admin-overview-light-1440.png` | |
| R15 | Driver (PWA chrome) | `AUTHEON Prototype.html` meta, `manifest.webmanifest` | §B no large purple surfaces | `theme_color #6F29FF` painted browser/OS chrome purple | Light `theme_color` → `#FFFFFF` (dark stays `#1C1C1E`) | — (OS-level) | Brand purple stays in the app icon itself |
| R16 | Driver | `styles.css` labels (`.bottom-price-info .label`, `.price-label`, `.contact-role`, `.cancellation-card-title`, `.category-group-label`, `.list-end`, `.toast .sub`, `.sort-dropdown-head`, `.mdr-*`, `.dash-area`, `.label.pill-muted`, disabled slide track), `driver.jsx` correction chip | §D uppercase/mono only for data | Assorted uppercase/mono micro-labels | Sentence-case sans captions, weight 500 | `after/driver-job-locked-light.png`, `after/driver-profile-light.png` | Retained uppercase set: admin nav eyebrow/section, tiny "New" tag, demo chrome tags |
| R17 | Marketplace + My Jobs | `driver.jsx` (`JobCardBody`), `styles.css` | PDF p.5–6 reference card; §5 route text line | Vertical timeline card with times column | Client reference layout: `City → City` route line with PLZ beneath, distance under the arrow, two-column Pickup/Delivery legs (pin icon + `date · window`), footer `vehicle \| info tags \| axle chip \| price right` | `after/driver-marketplace-light.png`, `after/driver-myjobs-light.png` (+dark) | One shared body for both lists; old timeline CSS removed |
| R18 | Marketplace, My Jobs, job detail, admin detail | `store.js`, `driver.jsx`, `admin.jsx`, `i18n.js` | §5 "Wichtige Info (Zugelassen / Abgemeldet / E-Fahrzeug / Rote Kennzeichen)" | No vehicle-info data or display anywhere | `registrationStatus`/`electricVehicle`/`redPlates` job fields (seeded on 0847/0844/0848); icon+text tags on cards (E-vehicle icon purple per reference), kv row in driver vehicle detail, pill row in admin detail | `after/driver-marketplace-light.png`, `after/driver-myjobs-light.png` | Resolved via `prd.json` `vehicle_important_info_v1` + `schema.dbml`; text label always present |
| R19 | Admin job creation | `admin.jsx` (Vehicle section 04), `i18n.js` | §5 + client direction: announce vehicle info at creation | No way to capture vehicle info | "Important vehicle info" block: Not specified / Registered / Deregistered segmented control + E-vehicle and Red plates toggle chips + helper hint; flows through `saveDraft`/`jobToDraftForm` | `after/admin-new-order-vehicle-light-1440.png` | Optional — never blocks Save Draft/Publish/Assign |
| R20 | Marketplace header | `driver.jsx` (Portal), `styles.css` `.kpi-row/.kpi-chip`, `i18n.js` | PDF §4 reduced dashboard character | No KPIs | Quiet chip row: Available / Booked / Open documents (`--canvas` chips, 600 numbers) | `after/driver-marketplace-light.png` | Counts derived from existing store data |
| R21 | Evidence tooling | `prototype/project/_capture-design-audit.mjs` | Evidence coverage | — | Capture script extended with the admin job-creation Vehicle-section shot | `after/admin-new-order-vehicle-light-1440.png` | — |

## UI/UX quality checklist (per adjusted screen)

Checked against the rendered `after/` captures:

| Check | Marketplace | My Jobs | Job locked | Job unlocked | Filter sheet | Slide-confirm | Profile | Infopoint | Admin overview | Admin detail |
|---|---|---|---|---|---|---|---|---|---|---|
| Serious, modern, premium, business-oriented | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Key order info quickly scannable | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | n/a | ✅ | ✅ |
| Typography calm, not overly bold | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| No default uppercase headings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (retained eyebrows flagged) | ✅ |
| Purple sparse, not dominant | ✅ | ✅ | ✅ | ✅ (primary CTA pending decision) | ✅ (selected chips = allowed markers) | ✅ | ✅ | ✅ | ✅ | ✅ |
| White cards on light-gray canvas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Card radius moderate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Card shadow/border subtle | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Compensation easy to compare | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | n/a | n/a | ✅ | ✅ |
| Status has text, never color-alone | ✅ | ✅ | ✅ | ✅ | n/a | n/a | ✅ | n/a | ✅ | ✅ |
| Bottom nav not dominantly purple | ✅ | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ | n/a | n/a |
| Filter/sort near top of marketplace | ✅ | ✅ (search+sort top) | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | n/a |
| Buttons restrained and functional | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tap/motion effects subtle | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (nav logo animation flagged for review) | ✅ | ✅ | ✅ | ✅ |
| Compact but not cramped | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Touch targets usable (≥40–44px) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | n/a |
| Dark theme internally consistent | ✅ | ✅ | ✅ | — (light only captured) | — | — | — | — | ✅ | — |

## Intentionally NOT changed (client / PRD decisions)

*(Updated 2026-07-14 after the client PDF arrived: former items "registered/deregistered tags" and "header KPI row" are now implemented — see R18–R20.)*

1. **Fixed vs floating bottom nav** — floating geometry preserved, restyled only (PDF §6: to be decided together in the first looks).
2. **Primary button color** — the PDF button board (p.6) shows a near-black Primär button; §2 allows purple for primary CTAs. Purple kept until the client decides.
3. **Orange `--cta` binding treatment vs purple primaries** — inconsistent state documented in brand-tokens; not unified without client approval.
4. **Animated Autheon mark** in the active nav tab — deliberate recent addition; infinite decorative motion flagged (audit #29) but kept pending review. It adapts to the new neutral active colors and stops under `prefers-reduced-motion`.
5. **Retained uppercase set** (admin nav eyebrow/section, "New" tag, demo chrome) — pending client confirmation of the permitted list.

## Remaining visual risks

- Playwright visual baselines must be refreshed (`npm run test:regression:visual:update`) — every intentional change above shifts pixels.
- Inter Tight is slightly narrower than Plus Jakarta Sans; German strings should be spot-checked for now-loose layouts (no truncation observed in the captured screens).
- `--st-warn` on `--st-warn-bg` contrast in light theme remains borderline (pre-existing; production plan §4.1).
- Admin screens beyond overview/detail (billing, master data, infopoint panes) received the token-level fixes but were not individually re-captured; a full admin visual pass is recommended before client demo.
