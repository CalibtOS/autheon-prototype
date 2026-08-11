# AUTHEON — Design Direction Board Compliance Audit

> **Status:** v1.6 — 2026-07-27. Audit of the prototype implementation against the client **Design Direction Board — AUTHEON GmbH, July 2026** (DDB). See the **v1.1 addendum** (the original PDF arrived after the v1.0 audit and closed several items), the **v1.2 addendum** (post-remediation feature components), the **v1.3 addendum** (vehicle-entry audit), the **v1.4 addendum** (primary-screen header consistency, items 36–38, from the 2026-07-26 client Figma review), the **v1.5 addendum** (Marketplace applied-filter visibility, items 39–43), and the **v1.6 addendum** (document-upload source selection, U1–U4).
> **Source:** v1.0 used the DDB requirement extract (sections A–J); v1.1 verified against the original client PDF, now in the repository at [`../../Design Direction Board.pdf`](../../Design%20Direction%20Board.pdf) (7 pages, DE, by Taner Özdemir / Carolina Offermanns).
> **Authority:** `docs/requirements/prd.json` = behavior · DDB = client visual direction · this audit = gap record. See [`ui-ux-production-plan.md`](ui-ux-production-plan.md) §0.
> **Evidence:** Code references are `path:line` against the pre-remediation state (commit `cae3a8a` working tree). Rendered evidence in [`audit-2026-07-14/before/`](audit-2026-07-14/before/) — driver captured as the 392×800 phone frame inside a 1440×1000 viewport (the prototype's demo frame; production target is 375px), admin at 1440×1000. Light + dark themes.

---

## Audit matrix

Statuses: `COVERED` · `PARTIAL` · `MISSING` · `CONFLICT` · `NOT VERIFIABLE` · `NOT APPLICABLE` · `SUPERSEDED`

| ID | Requirement | Surface | Status | Evidence | Gap / conflict | Recommended action | Documentation target |
|----|-------------|---------|--------|----------|----------------|--------------------|----------------------|
| 1 | Inter Tight loaded and applied as primary UI font | Driver + Admin | **MISSING** | `prototype/project/AUTHEON Prototype.html:19` loads Plus Jakarta Sans + JetBrains Mono; `styles.css:78` `--font-sans: "Plus Jakarta Sans", …` | Inter Tight is nowhere loaded or referenced | Swap Google Fonts request and `--font-sans` to Inter Tight (400/500/600/700); keep JetBrains Mono as internal data font | brand-tokens.md, driver-screen-spec.md, ui-ux-production-plan.md |
| 2 | No remaining Plus Jakarta Sans as primary font | Docs + code | **CONFLICT** | `styles.css:78`; HTML:19; `brand-tokens.md:80`; `driver-screen-spec.md:72`; `ui-ux-production-plan.md:11, 282` (`plus-jakarta` preset) | Docs *mandate* Plus Jakarta Sans; DDB mandates Inter Tight | Replace in code; reclassify doc references as historical | all five docs |
| 3 | Font weights: 400 body / 500 labels / 600 selective; no 700+ as default hierarchy | Driver + Admin | **CONFLICT** | `styles.css:4031,4037` (`.text-display`/`.text-title` = 700); `.route .city:706`, `.city-name:777`, `.time-val:806`, `.vehicle-desc:844`, `.header-title:1100`, `.detail-section-title:1202`, `.sheet-head h2:1719`, `.page-title:2668`, `.stat .num:2586` all 700; `admin.jsx` 33 inline `fontWeight: 700` (e.g. 3568, 4445); `driver.jsx` 7 incl. `fontWeight: 750` at 4218 | 700 is the de-facto title/number weight everywhere; `ui-ux-production-plan.md` §4.2 codifies 700 for display/title | Normalize CSS + inline weights to 600 max; document 700+ as exception-only | brand-tokens.md, driver-screen-spec.md, ui-ux-production-plan.md |
| 4 | No default-uppercase headings/labels; uppercase only for sparing small meta labels | Driver + Admin | **PARTIAL** | Headings are sentence case ✓. Still uppercase: `.pill` (`styles.css:453`, mono 10.5px), `.tbl th:2618`, `.bottom-price-info .label:1345`, `.price-label:1669`, `.contact-role:1503`, `.cancellation-card-title:3283`, `.category-group-label:3359`, `.list-end:2820`, `.toast .sub:2773`, `.label.pill-muted:2933`, `.sort-dropdown-head:4406`, admin `.nav-eyebrow:2391`/`.nav-section:2413`, `.mdr-compare-header:3059`, `.mdr-field-badge:3021`, `admin.jsx:154,1395`; i18n `slideToConfirm: "SLIDE TO CONFIRM →"`, `slideAccepted: "ACCEPTED"` (`i18n.js:1091-1092, 2301-2302`) | Status pills, table headers, price labels and the slide-to-confirm instruction are uppercase by default | De-uppercase pills, table headers, price/contact labels, slide copy; retain uppercase only for the small nav eyebrow/section markers (client to confirm, see open decisions) | brand-tokens.md, driver-screen-spec.md, driver-i18n-index.md (regenerated) |
| 5 | Brand palette `#6F29FF / #111111 / #6E6E73 / #F5F5F7 / #FFFFFF` | Both | **COVERED** | `styles.css:5-12` exact values; `brand-tokens.md:13-18` | — | Keep | brand-tokens.md |
| 6 | No hard-coded colors outside tokens | Both | **PARTIAL** | Off-token: tab-bar `#1c2533`/`#0e121a` (`styles.css:874,881,934,938`), slide thumb `#4b5563`/`#1f2937` (2108,2132), doc icons `#e5e7eb/#4b5563/#374151/#d1d5db` (3626-3637), warn `rgba(234,179,8,…)` (`driver.jsx:3003-3004`), toast action `#fff/#000` (HTML:869-871), `#065f46/#6ee7b7/#fca5a5` banners (3118-3130) | ~15 hex values bypass tokens, incl. the whole tab-bar surface | Tokenize or remove with the nav/toast remediation | ui-ux-production-plan.md |
| 7 | Purple used very sparingly; no large decorative purple surfaces | Both | **PARTIAL** | Dominant: `.tabbar-item.active:903` (filled purple), admin `.nav-item.on:2438` (filled purple), `.toast:2735` (purple surface), `.driver-avatar:1044` (filled purple), `.chip.on:537` + purple glow `:1769`, `--sh-2:73` purple-tinted shadow, `--paper-3:22` purple-tinted hover wash on all surfaces. Restrained ✓: focus rings, links, selected sort item, slide fill | Purple functions as the default active/hover/feedback color rather than a sparse accent | Neutralize nav actives, toast, avatar, hover wash, shadows; keep focus/selected markers | brand-tokens.md, driver-screen-spec.md, ui-ux-production-plan.md |
| 8 | Bottom navigation appearance (not dominantly purple; clear, app-like) | Driver | **CONFLICT** | `.tabbar-capsule:870-879` — floating dark-navy `#1c2533` pill with deep shadow (`0 12px 30px`); active item filled `--primary` purple (`:903-908`); `before/driver-marketplace-light.png` | Dominant purple active item on a dark bubble bar contradicts DDB H (black/white/gray contrast) | White surface bar, fine border, subtle shadow; active = darker text + filled icon + neutral marker | driver-screen-spec.md, ui-ux-production-plan.md |
| 9 | No purple active-navigation capsule | Driver + Admin + docs | **CONFLICT** | `styles.css:903` and `styles.css:2438-2442`; mandated by `driver-screen-spec.md:19` ("Active tab uses `--primary` capsule") and `ui-ux-production-plan.md` §5 TabBar / §7.9 | Docs *require* what the DDB prohibits | Remove the requirement from both docs; implement neutral active states | driver-screen-spec.md, ui-ux-production-plan.md |
| 10 | Status badges always include text | Both | **COVERED** | `Pill` renders label always (`driver.jsx:11-15`); `driver-ui.jsx:13-18`; admin table uses same pills (`before/admin-overview-light-1440.png`) | — | Keep; covered by brand-tokens "never color-only" rule | brand-tokens.md |
| 11 | Status colors restrained; no large status-colored surfaces | Both | **PARTIAL** | Soft tinted pill backgrounds ✓ (`styles.css:48-53`); but `.pill.performed:490` is a solid near-black chip with white text; `.jobcard-banner-assigned:3535` is a full-width tinted banner glued to the card | Performed chip is the one heavy fill; assigned banner is borderline | Soften performed pill to tinted bg + dark text (dark-theme pair); keep banner (labelled, informative) | brand-tokens.md |
| 12 | Light-gray canvas `#F5F5F7` with white cards | Both | **PARTIAL** | Driver marketplace ✓ (`--canvas:19`, cards `--paper`); but detail body + scroll surfaces use `--paper-2 #f1f5f9` (`styles.css:1178,4495`) and admin shell uses `--paper-2` (`:2374`) instead of the client canvas | Two near-identical grays compete as "canvas" | Use `--canvas` for app canvases; reserve `--paper-2` for inset panels | brand-tokens.md, ui-ux-production-plan.md |
| 13 | Moderate card radius | Both | **PARTIAL** | `.card`/`.jobcard-btn` = 12px ✓ (`styles.css:564,4526`); but `.phone-shell .jobcard` 24px (`:727`), phone-shell sheet 32px (`:1699`), `.lg-cta` + bottom action buttons 9999px pills (`:1355`, `driver.jsx:2356,2373`) | 24–32px rounding and pill-shaped primary buttons read "bubble-like" | Cap cards at 16px, sheets at 24px, buttons at `--r-3` | driver-screen-spec.md |
| 14 | Fine borders / very subtle shadows | Both | **PARTIAL** | 1px `--line` borders + `--sh-1` ✓; but `--sh-2` is a purple-tinted 40px glow (`styles.css:73-74`), tab bar carries `0 12px 30px` (`:876`), selected chips carry purple glows (`:1769`) | Hover/selection elevation is decorative | Neutralize `--sh-2`, drop chip glow, soften nav shadow | brand-tokens.md |
| 15 | Marketplace card shows route, PLZ+city, dates, windows, vehicle, axle, status, compensation, vehicle flags | Driver | **PARTIAL** | `JobCard` (`driver.jsx:770-829`): cities+PLZ ✓, distance ✓, pickup/delivery date+window ✓, vehicle+model ✓, axle ✓, compensation pill right ✓ (`before/driver-marketplace-light.png`) | No operational status on the marketplace card (only implicit "published"); no tour number; registered/deregistered/EV/red-plates have **no domain data** (see #19) | Add status pill (+ tour no.) to marketplace card from existing `job.status`; vehicle flags stay conditional pending PRD | driver-screen-spec.md |
| 16 | Pickup and delivery dates + time windows visible | Driver | **COVERED** | `renderTimeDate` (`driver.jsx:753-765`) right-aligned per stop; "Flexible" fallback | — | Keep | driver-screen-spec.md |
| 17 | Operational status visible on job cards | Driver | **PARTIAL** | My Jobs cards: pill per status (`driver.jsx:2573-2596`) ✓; Marketplace cards: none | Marketplace card carries no status label | Same fix as #15 | driver-screen-spec.md |
| 18 | Compensation prominent, factual, right/center-right | Driver | **COVERED** | `.jobcard-price-pill` bottom-right (`styles.css:853-860`, `driver.jsx:821-826`); detail bottom bar €-value 24px (`:1348-1352`); wording is plain amounts, no promotional copy (`i18n.js:46,104`) | — | Keep; codify placement rule | driver-screen-spec.md |
| 19 | Registered/deregistered, electric vehicle, red license plates shown where data exists | Driver + data | **NOT VERIFIABLE** | `store.js` has no `registered`/`deregistered`/`electric`/`red plate` fields (grep verified); PRD tracks registered/deregistered as an open V1 question | No backing data → conditional UI cannot render; must not invent fields | Keep out of implementation; document as conditional-pending-PRD in specs; axle type is covered | driver-screen-spec.md, ui-ux-production-plan.md |
| 20 | Route immediately readable (e.g. `Düsseldorf → Hamburg`) | Driver | **COVERED** | Vertical two-stop timeline with city names 14px semibold (`driver.jsx:786-800`); detail route row start→end (`:1401-1421`); acceptance modal `80339 → 10115` | — | Keep | driver-screen-spec.md |
| 21 | Compact but not cramped information density | Driver | **COVERED** | Card grid + 16px padding + calm gaps (`styles.css:729-860`); rendered evidence shows 2 full cards per viewport | — | Keep | driver-screen-spec.md |
| 22 | Restrained header KPIs (available / booked / open docs) | Driver | **PARTIAL** | Header = avatar, greeting, bell, title, sort/filter (`driver.jsx:988-1081`); results count only (`:1100-1104`). No KPI row — DDB marks KPIs as *may contain* | Header is restrained (not excessive); the optional KPI row is simply absent | No change without client ask; record as optional enhancement | driver-screen-spec.md |
| 23 | Filter and sorting controls at top of Marketplace | Driver | **COVERED** | `SortSelect` + filter button in header (`driver.jsx:1034-1059`); applied-filter chips row under header (`:1063-1080`) | — | Keep | driver-screen-spec.md |
| 24 | Bottom-nav IA: Marketplace / My Jobs / Infopoint / Profile | Driver | **COVERED** | `TabBar` items (`driver.jsx:717-722`) | — | Keep | driver-screen-spec.md |
| 25 | Fixed vs floating bottom navigation | Driver | **SUPERSEDED 2026-08-11** | Current implementation is a floating capsule (`styles.css:863-869`); DDB explicitly leaves fixed-vs-floating unresolved | Resolved after this audit by commits `7a79808` and `dceed6d` for installed `/pwa` | Normal Driver screens keep the floating rounded capsule inside the edge-to-edge bottom safe-area/page surface; document-focused views hide the global tab bar. See remediation F15. | driver-screen-spec.md, ui-ux-production-plan.md, screenshots README |
| 26 | Button variants clear, premium, functional | Both | **COVERED** | `.btn` + `primary/cta/ghost/danger/icon/sm/xs` (`styles.css:322-403`); 44px icon targets | — | Keep | driver-screen-spec.md |
| 27 | Secondary buttons: white + fine gray outline or restrained text button | Both | **PARTIAL** | `.btn` is white ✓ but outlined with `--line-3` = `#111111` **black** (`styles.css:329` + `:30`); primary CTAs are 9999px pills (`:1355`) | Black outline is heavier than the DDB's fine gray; pill radius immoderate | Border → `--line-2` gray; radius → moderate | driver-screen-spec.md, brand-tokens.md |
| 28 | Slide-to-confirm deliberate, clear, performant | Driver | **COVERED** | Full-width drag with threshold (`driver.jsx:1512-1547`), locked state until 10-char reason for cancellation (`:2758-2808`), transform-only animation, reduced-motion off-switch (`styles.css:2309-2315`); `before/driver-slide-confirm-light.png` | Track copy is uppercase (see #4) | Keep mechanism; fix copy casing | driver-screen-spec.md |
| 29 | Micro-animations minimal and performant (transform/opacity) | Driver | **PARTIAL** | Transitions are transform/opacity ✓; but the active Marketplace tab runs an **infinite** self-tracing logo animation (`styles.css:956-1011`), plus idle shimmer + arrow nudge on slide-to-confirm (`:2234-2253`) | Persistent decorative motion in primary nav exceeds "minimal"; reduced-motion users are exempted | Flag for client/design review (recent deliberate addition); do not silently remove | ui-ux-production-plan.md |
| 30 | `prefers-reduced-motion` respected | Both | **COVERED** | Global kill switch (`styles.css:150-158`) + targeted disables (`:1012-1019, 2309-2315`) | — | Keep | ui-ux-production-plan.md |
| 31 | Gradients rare and subtle | Both | **COVERED** | Only: sheet-head paper→paper-2 wash (`styles.css:2050`), skeleton shimmer (`:4342`), dashed placeholder stripes (`:1964`) | — | Keep; codify restraint rule | brand-tokens.md |
| 32 | Driver/admin visual consistency | Both | **PARTIAL** | Shared `:root` tokens ✓; but admin speaks a mono-uppercase dialect (table headers `:2613-2628`, nav eyebrows, meta lines) the driver app no longer uses; both share the purple-active-nav violation | Two typographic dialects, one shared violation | Align admin meta/table typography with driver sentence-case rules | ui-ux-production-plan.md |
| 33 | Light and dark theme consistency | Both | **COVERED** | Single `[data-theme="dark"]` token block (`styles.css:108-148`); `before/driver-marketplace-dark.png`, `before/admin-overview-dark-1440.png` render consistently | Dark theme is an internal extension — not DDB-specified | Keep; document as internal extension | brand-tokens.md |
| 34 | Color-supported statuses accessible (contrast, not color-alone) | Both | **PARTIAL** | Text-always pills ✓; but pill text is 10.5px mono uppercase (`styles.css:451-453`) — small for the tinted-bg contrast pairs; `--muted-2 #8e8e93` on white ≈ 3.4:1 used for tertiary text (`:36`) | Small status type + borderline tertiary gray | Larger sans pill text; keep `--muted-2` out of body-size text | ui-ux-production-plan.md |
| 35 | Decorative effects never reduce scanability | Both | **PARTIAL** | Info hierarchy is scannable (rendered evidence); residual risks: infinite nav logo animation (#29), purple toast surface (`:2735`), purple hover wash on tables/cards (`--paper-3`) | Motion + tinted hovers are the remaining noise | Covered by #7/#29 actions | ui-ux-production-plan.md |

---

## Coverage summary

| Status | Count | Items |
|--------|-------|-------|
| COVERED | 13 | 5, 10, 16, 18, 20, 21, 23, 24, 26, 28, 30, 31, 33 |
| PARTIAL | 15 | 4, 6, 7, 11, 12, 13, 14, 15, 17, 22, 27, 29, 32, 34, 35 |
| MISSING | 1 | 1 |
| CONFLICT | 4 | 2, 3, 8, 9 |
| NOT VERIFIABLE | 2 | 19, 25 |

The audit distinguishes: requirements truly covered in implementation (table above, COVERED rows verified in rendered output); requirements stated only in documentation (none — the docs currently *contradict* the DDB rather than over-claim it); partial coverage (PARTIAL rows); direct contradictions (CONFLICT rows 2/3/8/9 — the docs and code mandate Plus Jakarta Sans, 700-weight titles and a purple active-nav capsule); and requirements blocked on client/PRD decisions (NOT VERIFIABLE rows 19/25).

### Highest-priority visual corrections

1. **Typography source** — load and apply Inter Tight; retire Plus Jakarta Sans as primary (items 1–2).
2. **Navigation actives** — remove the purple active capsule in driver tab bar and admin sidebar; neutral dark-navy bar surface → white with fine border (items 7–9).
3. **Weight hierarchy** — normalize 700/750 titles and numbers to a 400/500/600 system (item 3).
4. **Uppercase sweep** — status pills, admin table headers, price/contact labels, slide-to-confirm copy to sentence case; keep only justified small meta markers (item 4).
5. **Marketplace card status** — add the operational status label to marketplace job cards (items 15/17), using existing `job.status` only.

---

## Client decisions still required

Do **not** treat these as confirmed requirements (list updated in v1.1):

1. **Exact permitted uppercase meta labels.** PDF §3: uppercase "kann … sehr zurückhaltend … geprüft werden". Proposed retained set: admin sidebar eyebrow/section markers and the demo `MOCK DATA` chrome tag. Client to confirm.
2. **Primary button color — dark vs purple** *(new in v1.1)*. The PDF button board (p.6) shows the Primär button filled near-black, while §2 allows `#6F29FF` for "primäre CTAs". The prototype keeps purple primaries; confirm whether primaries should switch to the dark treatment from the button board.
3. **Orange `--cta` binding-action treatment.** Prototype-internal functional semantic, inconsistently applied ("Mark performed"/"Accept tour" are purple primaries; only the overlap-confirm uses orange). Client must approve orange as the binding-CTA color — or the `--cta` rule is retired.
4. **Animated Autheon mark in the active nav tab.** Deliberate recent addition (`cae3a8a`); infinite decorative motion sits outside DDB "minimal micro-animations". Kept pending client review.

**Resolved 2026-07-14** (moved out of this list): registered/deregistered + electric-vehicle + red-plates are V1 optional job fields (`prd.json` `vehicle_important_info_v1`); header KPIs implemented per PDF §4.

---

## v1.1 addendum — original PDF received (2026-07-14, same day)

The client PDF confirmed the extract and added three concrete references the extract only paraphrased: an **example marketplace card** (p.5–6: route text line `Düsseldorf → Hamburg` with PLZ beneath, two-column Übernahme/Übergabe legs with pin icons, footer `vehicle | E-Fahrzeug ⚡ | Eigenachse chip | €320` right), a **button board** (p.6: Primär filled dark / Sekundär white+outline / Tertiär text / Deaktiviert / Mit-Icon variants), and §4 wording that the header **soll** (should) get a reduced dashboard character with small KPIs.

Status changes vs the v1.0 matrix (implementation evidence in [`design-direction-board-remediation.md`](design-direction-board-remediation.md) R17–R21):

| ID | Was | Now | What changed |
|----|-----|-----|--------------|
| 15 | PARTIAL | **COVERED** | Marketplace card rebuilt to the client reference layout (`driver.jsx` `JobCardBody`); status pill + tour retained per §4 |
| 17 | PARTIAL | **COVERED** | Status pill on marketplace and My-Jobs cards |
| 19 | NOT VERIFIABLE | **COVERED** | Registered/deregistered + electric-vehicle + red-plates resolved as optional V1 job fields (client direction 2026-07-14; `prd.json` → `resolved_defaults.vehicle_important_info_v1`, `schema.dbml` jobs columns + enum); rendered as text-labelled tags on cards/detail, editable in the admin job form Vehicle section |
| 20 | COVERED | **COVERED+** | Route now the literal `City → City` text line from the PDF |
| 22 | PARTIAL | **COVERED → later REMOVED** | Restrained KPI row implemented (Available / Booked / Open documents), then removed at client request (2026-07, PR #17) — the counts duplicate the My Jobs tab badges. DDB marks KPIs as *may contain*, so absence stays compliant |

New finding from the PDF: the **button board renders the primary button dark/near-black**, while §2 explicitly allows purple for "primäre CTAs". The prototype keeps purple primaries (allowed by §2); black-vs-purple primary buttons is recorded as a new client decision below.

**Same-evening client review (remediation R22–R27):** axle type fully localized (EN/DE); **marketplace cards drop tour number + status by client decision** (all marketplace cards are Published — a recorded deviation from §4's status-in-lists wording; My Jobs keeps both); card footer split into a calm model+price line plus a wrapping tag row; detail vehicle-info reordered into a labelled chip block; document viewing replaced with a full-height in-app viewer rendering a seeded real 2-page PDF (item 35 scanability risk closed for documents); conditional plate capture added (registered → plate required, deregistered → no plate, red plates → §16 FZV `06`-series number required) — mirrored in `prd.json`/`schema.dbml`/`logical-model.md`/changelog without a PRD version change.

## v1.2 addendum — post-remediation feature components (2026-07)

Feature commits landed after the v1.1 remediation (`3ef6597` sticky sidebars + fixed-height shell; `1cdf1a7` driver self-service email change). Screened against the DDB the same way; implementation is tracked in [`design-direction-board-remediation.md`](design-direction-board-remediation.md) "Feature changes since remediation" (F1–F4).

| Area | DDB dimension | Status | Notes |
|------|---------------|--------|-------|
| Fixed-height app shell + sticky Create/Edit-Job sidebars (F1–F2) | Layout only — no color/type/motion impact | **COVERED (n/a to visuals)** | Header pinned, surfaces scroll internally; sticky sidebars cap height and drop out ≤1200px so nothing overlaps or scrolls horizontally. Documented in `ui-ux-production-plan.md` §4.4 |
| Account & sign-in verified badge (F3) | #10/#34 status text-labelled, not color-alone | **COVERED** | Dot + "Verified account" label always present; pending state is a text-labelled `.pill.assigned` |
| Change-email code input (F4) | #4 mono only for data identifiers | **COVERED** | 6-box `CodeInput` uses `--font-mono` for a one-time code (a data identifier, like PLZ/timestamps) — consistent with the mono-usage rule |
| Change-email sheet radii/focus (F4) | #13 moderate radius · #14 subtle elevation · focus ring | **COVERED** | `--r-2` boxes, brand focus ring `rgba(var(--primary-rgb),…)`; success disc is a restrained brand tint, not a large purple surface |
| Swipe tab navigation + digit-only inputs + KPI-row removal (F5, PR #17 `14526e9`) | #22 restrained KPIs · #29 minimal motion · #30 reduced-motion | **COVERED / n/a to visuals** | My Jobs + Infopoint tabs became a paged swipe carousel (`SwipeViews`) — transform-only, reduced-motion safe (within #29/#30); the marketplace KPI row was **removed** (reverses item 22's "COVERED" — counts duplicated the My Jobs badges); numeric inputs (postal / house-no / distance / phone / money) restricted to digits. No color/type/token impact |

**New gap:** the verified badge references `var(--st-ok, #1f9d55)` — `--st-ok` is **not defined** in the token set, so it falls back to a hardcoded green (an off-token hex, cf. audit item #6). Recommended action: define `--st-ok` (light + dark, contrast-checked) or reuse `--st-accepted`. Recorded in [`brand-tokens.md`](brand-tokens.md) status section. All other new rules stay within tokens.

## v1.3 addendum — vehicle-entry audit (2026-07-26)

Audit of the vehicle-entry and vehicle-display surfaces **as they stood before** the client confirmation “Systemlogik Fahrzeugeingabe”. Remediation is tracked in [`design-direction-board-remediation.md`](design-direction-board-remediation.md) “Vehicle domain restructure (V1–V6)”.

### Fragmented previous vehicle-input structure

| # | Finding | Why it was a problem |
|---|---------|----------------------|
| A1 | **Vehicle type mixed weight classes and body styles** in one five-option chip row: `SUV`, `PKW`, `Transporter`, `LKW < 3,5t`, `Oldtimer`. Body style (SUV, Transporter, Oldtimer) and weight class (`LKW < 3,5t`) were presented as peers of one another. | No consistent classification axis, so no option set could be complete or mutually exclusive by construction. |
| A2 | **Admin and driver offered different vehicle-type vocabularies.** Admin: `SUV / PKW / Transporter / LKW < 3,5t / Oldtimer`. Driver filters: `SUV / PKW / Van / Light truck <3.5t`. `Transporter`↔`Van` and `LKW < 3,5t`↔`Light truck <3.5t` were the same concept under two stored spellings. | A driver filter could silently fail to match an admin-created job. The icon mapper had to hard-code both vocabularies. |
| A3 | **Manufacturer and model were concatenated on save** (`[brand, model].join(" ")` → one `vehicleModel` string), then re-loaded into the *manufacturer* field on edit with the model field left blank. | Lossy round-trip: editing a job silently moved the model text into the manufacturer field. |
| A4 | **Manufacturer was free text** with a `datalist` hint, so the catalogue was advisory only. | Uncontrolled values in a field intended to be a controlled list. |
| A5 | **Registration status and red plates were fused into one four-way segmented control** (`Not specified / Registered / Deregistered / Red plates`), where picking *Red plates* wrote two different fields at once (`registrationStatus = deregistered` **and** `redPlates = true`). | A legal/operational requirement was disguised as a registration status. Two independent concepts could not be set independently. |
| A6 | **Transport type was labelled “Axle” / “Axle configuration”** (`axle`, `axleConfiguration`, `orderFieldAxle` = “Axle / transport type”) and stored under four spellings (`driven on own wheels`, `third-party axle`, `Eigenachse`, `Fremdachse`) requiring per-screen mapping tables in both `admin.jsx` and `driver.jsx`. | The same concept had two names in one label key, and every display site re-implemented its own value mapping. |
| A7 | **VIN validation was advisory**: a notice appeared below 17 characters and the order saved anyway. | A data-quality rule stated as a hint rather than a constraint. |
| A8 | The whole group sat under one soft heading, **“Important vehicle info”**, described in-product as “optional announcement metadata”. | Required operational data read as optional garnish. |

### Incorrect red-licence-plate interaction

| # | Finding | Why it was wrong |
|---|---------|------------------|
| B1 | Red plates were a **manually selected option**. | The requirement is fully determined by registration status + transport type. Leaving it to the operator permitted states that contradict the business rule (e.g. red plates on a registered vehicle, or omitted on a deregistered own-axle transfer). |
| B2 | A **red-plate number input** (`redPlateNumber`) was required whenever the flag was set, with §16 FZV formatting guidance. | Red plates are brought by the executing service partner; the number is irrelevant to AUTHEON order creation and should never have been collected. |
| B3 | Selecting “Red plates” **replaced the official licence-plate field** with explanatory copy and **cleared the stored plate** (`plate: registrationStatus === "deregistered" ? "" : form.plate`). | Destructive. A known previous / de-stamped official plate is still useful information, and the two plates are unrelated objects. |
| B4 | The captured red-plate number was **displayed to the driver** in the complete order view as a dedicated `.plate-badge.plate-red` row. | Presented irrelevant data with the visual weight of the real vehicle plate. |
| B5 | No warning appeared for **deregistered + own axle** unless the operator had manually ticked “Red plates”. | The one case that genuinely requires red plates could ship with no notice at all. |

### Inconsistent downstream display of vehicle classifications

| # | Finding | Where |
|---|---------|-------|
| C1 | **Three independent label-mapping tables** for the same axle values — `displayAxle` (driver), `displayAxleAdmin` (admin), `canonAxle` (filter comparison) — each with its own key set. | `driver.jsx`, `admin.jsx` |
| C2 | **Admin jobs table special-cased one vehicle type** (`j.vehicle === "Transporter" ? t("adminVehicleTrp") : j.vehicle`) and otherwise printed the **raw stored value**, untranslated. | `admin.jsx` job overview |
| C3 | **Admin job detail printed raw `job.vehicle`**, so the same job showed “PKW” in admin and a translated label in the driver PWA. | `admin.jsx` job detail |
| C4 | The **vehicle-info tag block was conditional on there being any tag at all**, so transport type — always present — was shown as a bare chip on cards but omitted from the detail tag group. | `driver.jsx` card vs detail |
| C5 | **Registration status appeared twice** in detail views once an explicit row existed: as a key/value row *and* inside the characteristics tag row. | `driver.jsx` preview + complete order view |
| C6 | **CSV export and the transport-order summary emitted raw internal values** (`vehicle`, `axle`) with no manufacturer, registration status or characteristics columns. | `store.js` `exportJobsCsv`, `transportOrderText` |
| C7 | **Icon mapping covered five body styles** (SUV, Van, Light truck, Classic, Car) across both vocabularies, with `VehicleCar` as a silent catch-all — so an unknown value rendered as a passenger car. | `driver.jsx` `vehicleTypeIcon` |

### Method

Static read of `admin.jsx` (vehicle section + job detail + jobs table), `driver.jsx` (card, preview, booking dialog, complete order view, filter sheet, profile prefs, icon map), `store.js` (job factory, seed, form round-trip, write path, order-edit field list, exports), `i18n.js` (EN/DE vehicle keys) and `styles.css`; cross-checked against `prd.json` v2.6, `schema.dbml` and `logical-model.md`. Rendered verification via Playwright against the framed prototype.

## v1.4 addendum — primary-screen header consistency (2026-07-26)

Client review of the shared Figma link (Taner Özdemir / Ferhat Catak). Two inconsistencies were
raised that the earlier audits had not treated as findings, because each screen was assessed on its
own rather than **across** the four primary screens.

**Visual evidence supplied by the client** (in-repo, gitignored per the design-image rule — see
[`screenshots/README.md`](screenshots/README.md)): `Screenshot 2026-07-26 at 19.49.49.png` (zoom on
the Marketplace greeting block: `JB` avatar + "Willkommen zurück," + "Jordan Blake") and
`Screenshot 2026-07-26 at 19.50.17.png` (all four primary screens side by side, with a green rule
across the aligned My-Orders / Infopoint / Profil titles and a red underline marking "Marktplatz"
sitting lower).

| ID | Requirement | Surface | Status | Evidence | Gap / conflict | Recommended action | Documentation target |
|----|-------------|---------|--------|----------|----------------|--------------------|----------------------|
| 36 | Primary-screen headers start at the same visual height across menu items | Driver | **CONFLICT** (pre-remediation) | Marketplace used its own `.pwa-header` wrapper with a greeting row above the title (`driver.jsx:1209-1247`, `styles.css:1149-1194`); My Orders (`:3417`) and Profile (`:5039`) used `.pwa-screen-header`; **Infopoint hardcoded a third header inline** (`:5476-5503`, `fontSize:24` / `marginTop:4` vs `.header-subtitle`'s `margin-top:2px`) | The greeting block pushed the Marketplace title ~52px below the other three; three separate header implementations meant no single place enforced alignment | Remove the greeting block; extract ONE `DriverScreenHeader` used by all four screens | driver-screen-spec.md, ui-ux-production-plan.md |
| 37 | Notification action available on all primary screens | Driver | **MISSING** (pre-remediation) | Bell existed only inside the Marketplace header (`driver.jsx:1226-1246`); `MyJobs`, `Infopoint`, `ProfilePaneFull` received no `onOpenNotifications` prop from either shell | A driver on My Orders / Infopoint / Profile had no way to reach notifications except by returning to Marketplace | Move the bell into the shared header and pass the existing shell handler to all four screens | driver-screen-spec.md |
| 38 | Header icon buttons share one border treatment | Driver | **CONFLICT** (pre-remediation) | Bell was `.header-bell-btn`: 40×40 **circle**, `background: var(--canvas)`, `border: 0`, **no** shadow (`styles.css:1195-1207`). Sort + filter were `.header-btn`: 40×40, `border-radius: 12px`, `background: var(--paper)`, `1px solid var(--line)`, `box-shadow: var(--sh-1)` (`:1242-1254`) | Two visually different icon-button treatments sat in the same header row — the client called this out directly ("exactly the same border as the sorting and filter function") | Make the bell reuse `.header-btn`; keep a bell-only class solely for the badge anchor | brand-tokens.md, driver-screen-spec.md |

Consequential note on **item 22** (restrained header KPIs): the v1.1 addendum recorded the KPI row
as COVERED, but the KPI row is **no longer in the code** — `driver.jsx` has no `.kpi-row`, and
`kpiAvailableJobs` / `kpiBookedJobs` / `kpiOpenDocuments` are unreferenced by `t()` (they dropped
out of the regenerated `driver-i18n-index.md`). Only the orphaned `.kpi-row` / `.kpi-chip` CSS
(`styles.css:952-977`) and a `pwa.css` ≤360px wrap rule remain. This regression predates the
2026-07-26 change and was **not** introduced by it; item 22 should revert to PARTIAL pending a
client decision on whether the KPI row returns. Not actioned here — outside the client's ask.

Remediation for 36–38 is tracked as R28–R31 in
[`design-direction-board-remediation.md`](design-direction-board-remediation.md).

## v1.5 addendum — Marketplace applied-filter visibility (2026-07-27)

Usability review of the Marketplace filtering flow.

**The issue.** A driver could open the filter panel, apply filters, and close the panel. With the
panel closed, the Marketplace gave no numeric indication of *how many* filters were constraining the
list. A driver returning to the tab — or landing on a short list — could reasonably read the result
set as "there is little work available" rather than "you have narrowed this yourself". The applied
state was inferable only from the chip row and the button's filled state, neither of which answers
"how many".

**Evidence.** The task-supplied reference for this item describes the numeric badge on the filter
control. *(Note: the screenshot referenced in the 2026-07-27 task text was not attached to that
request; the two images available in the thread are the 2026-07-26 header-review captures, neither
of which shows a filter badge. The written requirement, the existing prototype behaviour and the
gallery capture below were used as the reference instead. Flagged rather than assumed.)* Current
rendered evidence: `tests/regression/snapshots/marketplace-filter-states.visual.spec.ts-snapshots/`
and `driver-marketplace-filter-{1,3}-*.png`.

| ID | Requirement | Surface | Status | Evidence | Gap / conflict | Recommended action | Documentation target |
|----|-------------|---------|--------|----------|----------------|--------------------|----------------------|
| 39 | Applied-filter count visible on the closed Marketplace filter control | Driver | **COVERED** | Badge implemented on `.header-filter-btn`; count from `getAppliedMarketplaceFilterCount(filters)` (`driver.jsx`) | Pre-existing prototype implementation already resolved the core usability issue — the badge, the applied-state fill and the chip row were all present | Keep; hardened during this pass (see 40–42) | driver-screen-spec.md, brand-tokens.md |
| 40 | Count badge reuses the shared badge primitive and tokens | Driver | **CONFLICT** (pre-remediation) | Filter badge rendered a raw `<span class="tabbar-badge">` — the *tab-bar* badge, with hardcoded `9999px`, `#ffffff` and mono 9px — while the notification bell used the shared `Badge` primitive | Two badge implementations in one screen; the filter badge had no `99+` cap and no `pointer-events: none`, so it could swallow taps meant for its own button | Reuse `Badge` + one shared `.header-btn-badge` anchor | brand-tokens.md, remediation R32 |
| 41 | Applied-filter count is a testable, canonical derivation | Driver | **PARTIAL** (pre-remediation) | Count was `activeChips.length`, an array assembled inline in `Portal`'s render body | Correct and non-duplicated, but not extractable, not unit-testable, and easy to fork if a second consumer appeared | Extract `getAppliedMarketplaceFilters` / `getAppliedMarketplaceFilterCount` next to the shared filter predicate | remediation R32, ui-ux-production-plan.md |
| 42 | Accessible name states the applied-filter count in a translated, pluralized form | Driver | **PARTIAL** (pre-remediation) | `aria-label` was the concatenation `` `${t("filters")} (${count})` `` → "Filters (4)" | A parenthesised numeral is not a sentence, and the pattern hardcodes English/German-agnostic word order that translation cannot fix | Add `filtersApplied_one/_other` and a `tPlural` resolver | driver-i18n-index.md, remediation R32 |
| 43 | Every counted filter actually restricts the result set | Driver | **COVERED** | `from: "This week"` now filters to the **Mon–Sun** calendar week containing the marketplace fixture today (`05.05.` / 2026-05-05). `Today` uses the same fixture day. Production FE uses the same Mon–Sun rule against device-local today. | Counted preset now restricts results | Keep; covered by `marketplace-filter-count.unit.spec.ts` date-preset cases | prd.json (filter semantics), driver-screen-spec.md |

Remediation for 40–42 is tracked as **R32** in
[`design-direction-board-remediation.md`](design-direction-board-remediation.md). Item 43 is covered
(Mon–Sun week decision, 2026-07-28).

## v1.6 addendum — document-upload source selection (2026-07-27)

**Task evidence:** stakeholder comment on the Driver PWA tour-completion screen, supplied as a screenshot of the
success modal — *"Tour erfolgreich durchgeführt."* → dashed dropzone *"Zum Hochladen tippen"* / *"Max. Dateigröße:
25 MB"*. The reporter's point: a service partner whose invoice is already a PDF on the phone cannot attach it.

**UX problem found (pre-2026-07-27 behaviour):**

These are **interaction-semantics** findings. The DDB matrix (items 1–35) covers typography, color, surfaces and
motion, so most of them have no matching matrix row; the DDB column below is filled in only where a matrix item
genuinely applies.

| # | Finding | DDB dimension | Severity |
|---|---------|---------------|----------|
| U1 | The generic document-upload action **immediately opened the device camera**. Every driver upload control ended in one hidden input carrying `capture="environment"`, so tapping the dropzone was a camera intent, not a "choose a document" intent | — (no matrix item; interaction semantics) | **High** — the control's label (*Zum Hochladen tippen* / "Click to upload") did not describe what it did |
| U2 | The driver **could not intentionally choose** between capturing a new image and selecting an existing file. There was no intermediate step at all — document type was picked, then the camera opened | item 26 (button variants must read as clear, functional actions — here there was no action to read) | **High** |
| U3 | **PDFs already stored on the device were unreachable** through the expected flow, even though `application/pdf` was in the `accept` list and the backend contract accepted PDFs. The `capture` intent overrides the picker on mobile, so the OS document browser never appeared | item 35 (effects/behaviour must never reduce scanability — forcing a photo of a PDF degrades exactly the artefact dispatch has to read) | **High** |
| U4 | The dropzone advertised *Max. Dateigröße: 25 MB* but **no upload path validated size**. Displayed rule ≠ enforced rule | — (no matrix item; stated-vs-enforced rule mismatch) | **Medium** |

Affected entry points (all sharing the one input pattern): tour-completion success modal, tour-detail **Tour
documents** card (including *Replace file*), and the performed-tour **Meine Dokumente** tab.

No color, type, motion or token violation was involved — this is an **interaction-semantics** finding, not a
visual one. Remediation is tracked as **F8** in
[`design-direction-board-remediation.md`](design-direction-board-remediation.md).


## Method notes

- Rendered checks: Chromium via Playwright (`prototype/project/_capture-design-audit.mjs`), driver phone frame light+dark, admin 1440px light+dark. Screenshot set in [`audit-2026-07-14/before/`](audit-2026-07-14/before/).
- Static checks: full read of `styles.css`, `driver.jsx`, `driver-ui.jsx`, i18n scan, targeted greps over `admin.jsx` (7.6k lines) and `store.js` for uppercase, `fontWeight`, hex literals, and vehicle-metadata fields.
- Nothing in the prototype was modified during this audit; remediation is tracked separately in [`design-direction-board-remediation.md`](design-direction-board-remediation.md).
