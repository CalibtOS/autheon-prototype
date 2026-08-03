# PRD changelog: 2026-07-30 / 2026-07-31 (v2.25 → v2.28)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`

> **Scope of this file:** the **v2.26** entry, plus later addenda folded under the current **v2.31** umbrella rather than taking their own version numbers. Baseline is **v2.25** (notification-open auditing removed from scope, 2026-07-29 — see [`prd-changelog-since-2026-07-29.md`](prd-changelog-since-2026-07-29.md)).

---

## PRD v2.26 — Automatic transport-order PDF generation from the approved client templates (2026-07-30)

**Baseline:** PRD v2.25
**Source:** work order "Adjust Automatic Order PDF Generation Using Approved Client Templates" ([Monday 12598918307](https://absolutweb-team.monday.com/boards/18417529138/pulses/12598918307)), refining **Task 17 — PDF Generation & Document Automation**.
**Controlled inputs:** `references/Maschinelle Auftragsvorlage_PKW.pdf`, `references/Maschinelle Auftragsvorlage_LKW.pdf`, `references/Technical_Specifications_EN.pdf`, `skills/pdf-generation/SKILL.md`.
**Full requirements mapping:** [`../../requirements/transport-order-pdf-traceability.md`](../../requirements/transport-order-pdf-traceability.md).

This is a **requirement refinement plus a prototype implementation**, not a new
feature area. Task 17 already required a generated transport-order PDF from
structured job data, auditing, one active version, and manual regeneration. What
it did not have was the client's approved visual template, the exact field
mapping, the versioning and snapshot rules, or the formatting contract. This
entry supplies all four and makes the prototype actually produce the document.

### 1. Previous behaviour (v2.25, as specified and as implemented)

Task 17's acceptance criteria described the document in terms of a "provided
draft Word template structure on disk" and listed its content in English
domain terms, including **distance** and VAT/tax totals. The layout, typography,
table structure, legal wording and footer were unspecified.

In the prototype:

| Concern | Before | Problem |
| --- | --- | --- |
| The document | One seeded 2-page sample PDF (`assets/transport-order-sample.pdf`) served for **every** order and every document type | The same file for a PKW and an LKW order, carrying no order data at all |
| Versioning | `job.pdfVersion`, a bare integer, incremented by `bumpPdf()` | No version record, no snapshot, no checksum, no history — an "earlier version" did not exist as an object |
| Active version | Implicit: whatever `pdfVersion` said | Nothing to be active *among* |
| Generation timing | `bumpPdf()` inside `acceptJob` / `assignJob` | Correct timing already, but it produced only a counter |
| Relevant change | — | An order edit never produced a new document |
| Partner notification | Generic `order_updated` on any driver-visible field change | Nothing tied to the binding paperwork changing |
| Audit | `pdf_regenerated` with "PDF version N" | No document id, revision, checksum, trigger or GTC reference |
| Authorization | `getTransportOrderPreview()` returned the sample to any caller | A driver could fetch another partner's order's PDF |
| Mandatory data | — | No concept of blocking an incomplete document |

### 2. What changed

#### 2.1 One renderer, two consumers

`prototype/project/transport-order-pdf.js` is the **only** implementation of the
document. It is loaded by both app shells (before `store.js`, which generates
documents through it during seeding) and, via `vm`, by the Node tooling in
`tools/pdf/`. The prototype's in-app document and the PDFs sent for client
review therefore cannot diverge — they are the same markup.

Strategy per the supplied PDF skill: **A — HTML/CSS → headless Chromium → PDF**.
The approved templates are visual references, not editable AcroForm files, and
nothing in them requires coordinate drawing or a binary overlay.

#### 2.2 Template selection

From the canonical backend value only, never from display text:

| `jobs.vehicle_type` | Template | Title |
| --- | --- | --- |
| `passenger_car` | PKW | `FAHRAUFTRAG PKW` |
| `truck_up_to_7_5_t` | LKW | `FAHRAUFTRAG LKW` |
| `truck_over_7_5_t` | LKW | `FAHRAUFTRAG LKW` |

A translated label (`'PKW'`, `'Passenger car'`) resolves to `null`, which is a
mandatory-data failure — never a silent default to PKW. The two approved
templates are byte-identical apart from the title, which is why one renderer
with a title variant is correct rather than two templates.

#### 2.3 The document is German

Every customer-facing string in the renderer is a hardcoded German literal and
`window.I18n` is deliberately not used. The document is a legal artefact for the
service partner; it must not follow the prototype's UI locale. The supplied
English technical specification is an implementation reference only.

#### 2.4 Geometry taken from the source files, not estimated

A4 portrait, 595.32 × 841.92 pt, measured off the templates' content streams:
25 mm text margins, body-text right edge 524.5 pt, table right edge 538.7 pt
(the source deliberately runs tables 14.2 pt wider than the text), column grid
155.3 / 121.1 / 191.5 pt, 16.0–16.1 pt **minimum** row heights, 16.4 pt block
gaps, footer band 67.8 → 528.1 pt × 36.6 pt over a 15.7 pt bottom margin, and
the full type scale (14.04 / 9.96 / 9 / 7 / 6 / 5.04 pt). All exposed as
`--geo-*` custom properties so a correction is a one-line change both consumers
inherit.

#### 2.5 Versioning and the active pointer

`store.transportOrderDocuments` is append-only. The only field mutated after
insert is `isActive`, flipped inside one synchronous block with no interleaved
`emit()`, so no reader can observe two active versions or none.

- **v1** on a saved, binding marketplace acceptance or direct assignment.
- **A relevant change** mints the next version; the previous one keeps its own
  checksum, timestamp, storage reference and snapshot.
- **Generation is idempotent** per `job.dataRevision`: a retry or a duplicate
  event returns the existing active document instead of a second version.
- **Manual regenerate** (`force`) always mints a new version, by design — the
  admin explicitly asked for one.
- **The booking-time partner snapshot is frozen at v1 and carried forward**, so
  a later profile edit changes no version, including new ones.

Every record carries: document id, job/tour id, version, active flag,
generation timestamp, data revision, trigger, partner snapshot, generating
actor, GTC document id + version, storage reference and SHA-256 checksum.

#### 2.6 The relevant-change set

Defined explicitly in code as `PDF_RELEVANT_FIELDS` — exactly the
`ORDER_EDIT_FIELDS` keys the document renders (34). Deliberately **excluded**:
`distanceKm`, `expenses`, internal `notes`, `category`, `electricVehicle`,
`readyToDrive`, `requiresRedLicencePlates`. Admin-only data therefore neither
mints a version nor reaches the partner notification. **The list requires client
confirmation** (open question below).

#### 2.7 Mandatory data blocks publication

`MANDATORY_FIELDS` is sourced, not invented: the repository's existing
`validateOrderDraft()` set, plus the recipient fields the technical
specification names, plus tour and booking instant. When anything is missing,
`buildPayload()` returns the missing list and **no HTML at all**; the store
publishes nothing, leaves any previous version active, and audits
`pdf_generation_failed` with the field list.

House number and admin telephone are listed by the specification but are not
required by existing validation, so they stay **optional** and collapse cleanly
rather than becoming invented mandatory rules.

#### 2.8 Optional and long content

An absent optional field removes its label **and** its content: the row
disappears, a half-empty split row merges via `colspan`, and a location with no
additional information drops the whole `Zusatzinformation:` block rather than
printing an empty labelled 48 pt box. Row heights are minimums, so long values
grow rows instead of clipping; long e-mail addresses wrap with
`overflow-wrap: anywhere`; `break-inside: avoid` keeps each ÜBERNAHME/ÜBERGABE
section whole. Multi-page output repeats the header and footer via
`table-header-group` / `table-footer-group` and shows a truthful
`Seite X von Y` from Chromium's own page counters in a reserved 13 pt strip —
applied only when the document actually spans pages, so single-page output keeps
the template's exact bottom margin.

#### 2.9 Audit, notification, authorization

- `pdf_generated` / `pdf_regenerated` now carry entity type + id, job, tour,
  document version, active version, data revision, checksum, trigger, GTC
  reference and the changed fields.
- New key: **`pdf_generation_failed`**.
- `pdf_viewed` / `pdf_downloaded` (v2.19, unchanged by v2.25) keep the acting
  driver and version, and now reference the real document id.
- A version > 1 notifies the assigned partner in-app with the tour and version
  only — no admin-only data. v1 is not announced twice, because the acceptance /
  assignment notification already covers it.
- **No workflow e-mail to the service partner**: the known driver-email conflict
  is unresolved, so only the approved in-app/push channels are used.
- `authorizeTransportOrderDocument()` is the single gate for preview and
  download. A driver actor must be committed to the order (assigned, accepted or
  performed); only the **active** document is served, and a refused request
  writes no content-access entry at all.

#### 2.10 The PWA distance is excluded

`references/Technical_Specifications_EN.pdf` §3: "The PWA distance is not
included in the PDF." The prototype implements the exclusion because `TASK.md`
is the higher-precedence source, and the change is isolated to two places (the
payload mapping and `PDF_RELEVANT_FIELDS`) so it can be reversed additively.

**This is not treated as settled.** Task 17's earlier acceptance text listed
distance as PDF content. The conflict is recorded verbatim in the task's own
acceptance list and as a production open question, and it must be confirmed in
writing before this work reaches production.

### 3. Schema impact

`generated_job_documents` is **extended**, not replaced: template key, document
title, file name, `booked_at`, `source_data_revision`, `generation_trigger`,
`service_partner_snapshot` jsonb, GTC id + version, `checksum_sha256`,
`source_checksum_sha256`, `changed_fields` jsonb, `generation_status`,
`generation_error`. Two constraints move guarantees into the database: a
**partial unique index** on `is_current` (one active document per job) and a
unique `(job_id, document_kind, source_data_revision)` (idempotent generation).

**No change** to `jobs`, `job_distance_estimates` or `audit_events` (one new
action key). **No change** to `drivers` — `street`, `house_number`,
`postal_code`, `city` and `country_code` already existed; the prototype's
driver seeds were brought into line with them, which is what the recipient
snapshot is built from. See
[`../../database/logical-model.md`](../../database/logical-model.md) and
[`../../database/schema.dbml`](../../database/schema.dbml).

### 4. Prototype boundaries

The repository is a static front end with no server and no storage, so:

- there are **no stored PDF bytes at runtime**. The viewer shows the
  print-ready A4 document; Download/Print hand it to Chromium's own PDF writer,
  so the user saves a genuine PDF with the approved layout and embedded fonts;
- the **client-review PDFs and every automated PDF assertion** come from
  `npm run pdf:generate`, which drives the same renderer through Playwright's
  Chromium `page.pdf()` and is fully correct, including the page counter;
- `checksumSha256` digests the **canonical document source** (payload +
  rendered markup), not the binary. A browser cannot hash bytes it never
  produces, and Chromium stamps a creation date. The generator additionally
  records the real binary SHA-256 per artefact in its manifest;
- **no font binary is committed.** Montserrat is referenced as static
  TrueType — never woff2, which Chromium degrades to Type3 outline glyphs and
  which would fail the "fully embedded" requirement — and cached git-ignored by
  `npm run pdf:fonts` for generation;
- the **AUTHEON wordmark is a typeset placeholder** pending the branding pack
  (context-pack OQ-4). `options.logoSvgDataUri` is the drop-in seam.

Details in
[`../../requirements/transport-order-pdf-traceability.md`](../../requirements/transport-order-pdf-traceability.md)
§4.

### 5. Open questions carried into production

1. **Distance conflict** — confirm in writing that the client technical
   specification supersedes Task 17's older distance requirement.
2. **Relevant-change list** — confirm the 34-field set, in particular whether
   `category` or the additional vehicle characteristics should force a new legal
   version even though the approved template does not render them.
3. **Mandatory-field failure behaviour** — confirm the admin-facing error,
   whether an alert is raised, and the retry policy. The prototype has no
   durable job queue and does not retry; one was not invented.
4. **Historical-version visibility** — admin/audit only, or also the assigned
   service partner?
5. **Optional vs mandatory** — should the partner house number and the order
   creator's telephone become mandatory? That would also make them mandatory on
   the partner and admin profile forms.
6. **Legal and branding sign-off** — legal paragraph, footer register data, GTC
   document id + version, logo asset, and the additional-information row label
   wording. The label **order** is fixed by the work order and is implemented
   and tested; only the wording is open.
7. **Production font assets** — vendor licensed Montserrat files into the
   application's own asset pipeline; a legal document must not depend on an
   external host at render time.

### 6. Not changed

Order statuses, the marketplace sync policy, the driver visibility matrix, the
notification channels matrix, the cancellation/Storno workflow, tour documents,
Infopoint documents, invoices, finances, permissions, and the `pdf_viewed` /
`pdf_downloaded` contract from v2.19/v2.25. The seeded sample PDF remains in
place for tour documents and Infopoint documents, which are uploads rather than
generated documents.

---

## v2.31 addendum — Driver success checkmark refined (2026-07-30)

**Numbering note:** this change was authored as “PRD v2.26” before rebasing onto `main`, where v2.26–v2.31 were already taken by unrelated entries. It is recorded here as an addendum under **v2.31** — the PRD version is deliberately *not* bumped — and the transport-order-PDF v2.26 entry above is unchanged.

**Baseline:** PRD v2.31
**Source:** work order "Refine the success checkmark visual", plus its approved reference image (the German *"Tour erfolgreich durchgeführt."* success screen).
**Type:** design refinement of an existing resolved default (`dialog_standard_v1`). Not a new feature, not a new task.
**Data model / API:** **UNCHANGED.** No field, selector, store method, endpoint, schema, DTO or migration is involved. Presentation only.

### 1. Previous behaviour (v2.25, as implemented)

Driver success states rendered a checkmark **inside a 52px circular disc**. Three surfaces existed, and they had already partly diverged:

| Surface | Component | Treatment before |
| --- | --- | --- |
| Tour booked success | `TourBookedSuccessSheet` | `Dialog` + shared `DialogSuccessIcon`, 26px glyph, `currentColor`, inside `.dialog-icon` — a 52px disc tinted `--st-accepted-bg` with an `--st-accepted` glyph |
| Report-problem / empty-run / SP-cancel success | `PendingNotice` | identical to the above |
| Mark-performed success stage | `MarkPerformedSheet` (`stage === "success"`) | **its own duplicate** of the same SVG (`strokeWidth` 2.4 instead of 2.2) inside `.performed-success-check` — a 52px disc **filled** solid `--st-accepted` with a white glyph **plus** an 8px `box-shadow` outer ring |

So the "one shared success icon" the v2.x dialog standardization introduced was in fact a shared primitive **plus** a divergent copy with a different disc treatment.

### 2. New behaviour

The success checkmark is a **standalone gradient mark with no circle, disc, badge or background container.**

- The glyph grows from **26px to 56px**, inside an **80px** box.
- Its stroke is painted by a **linear gradient** running diagonally from the mark's elbow to its long arm's tip: `--success-mark-from` → `--success-mark-mid` → `--success-mark-to`.
- A **soft radial bloom** sits behind the mark, `--success-glow` fading to `--success-glow-fade`.
- All three surfaces now render the **one** `DialogSuccessIcon`. The mark-performed stage's duplicate SVG, its filled disc and its 8px ring are all removed, so there is again a single success glyph rather than a primitive plus a copy.

**Confirmed system-wide, not local.** The work order pinned its comment to one screen (mark-performed). Whether to change only that screen or all success states was escalated during the affected-location gate and the client chose **all three**.

### 3. What deliberately did NOT change

- **The warning and destructive discs stay.** `dialog_standard_v1`'s 52px disc still applies to the `--st-assigned` (warning) and `--st-cancelled` (destructive) tones. Success is a content-driven deviation: a grown gradient checkmark carries the status on its own, whereas a small `!` or `×` reads as an alert only inside a container. The disc standard is **not** retired.
- **`--st-accepted` is neither reused for the mark nor re-toned.** The reference mark is a lighter, warmer green (`#54B765`) than the `#059669` Accepted status semantic. Reusing the status token would have moved the mark away from the approved reference; re-toning `--st-accepted` to match would have repainted every Accepted pill, badge and label on **both** surfaces. A narrowly scoped token family was added instead, and `--st-accepted` keeps its status meaning untouched.
- **Copy, workflow and behaviour.** All success titles/bodies and i18n keys, dialog workflow, status transitions, actions, dismissal, completion logic and the slide-to-confirm gesture are unchanged.
- **Accessibility.** The glyph remains `aria-hidden` and decorative; the title and description still carry the meaning, so nothing was added to the accessibility tree.
- **Admin Backend.** Untouched — it has no `.dialog-icon` or success-check usage at all.

### 4. Two conflicts between the work order's prose and the reference image

Both were escalated rather than silently resolved, and the **image won both**:

| Conflict | Work-order prose | Reference image (measured) | Decision |
| --- | --- | --- | --- |
| Gradient endpoints | "smoothest practical **black-to-green** gradient" | **No black anywhere.** Darkest sampled stroke pixel is `#54B765`; the ramp runs green → lighter green, deepest at the elbow, lightest at the long arm's tip | Follow the image. "Black-to-green" is **not** implemented. A literal black end would also have inverted or been lost on the dark theme, where `--brand-text` is `#FFFFFF` |
| Bloom behind the mark | "Do not add decorative circles, badges, discs, or **background containers**" | A soft green radial bloom **is** present, peaking around `#E0F8E8` | Keep the bloom, as an **edgeless** radial fade with no hard boundary, so it reads as light behind the mark rather than as the disc that was removed |

### 5. New tokens

Narrowly scoped to the success mark and its bloom. Sampled from the approved reference.

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--success-mark-from` | `#54B765` | inherits light | Stroke at the mark's elbow — deepest green |
| `--success-mark-mid` | `#6BC67B` | inherits light | Mid stop, keeps the ramp faithful to the reference |
| `--success-mark-to` | `#8FDE9C` | inherits light | Stroke at the long arm's tip — lightest green |
| `--success-glow` | `rgba(87,221,132,0.18)` | `rgba(87,221,132,0.22)` | Bloom centre. The **only** value re-tuned for dark: a tint that lifts on white needs more presence on `--paper` `#2C2C2E` |
| `--success-glow-fade` | `rgba(87,221,132,0)` | same | Same hue at zero alpha, so the fade never interpolates through grey |

The mark's greens carry over unchanged into dark theme — they are mid-greens that read on `#2C2C2E` as well as on white.

### 6. Implementation notes worth keeping

- **Gradient stops are applied through CSS classes**, not `stopColor` attributes: `var()` is **not** resolved inside an SVG presentation attribute, so tokens would silently fail there. Theming the mark therefore means changing tokens only, never the JSX.
- **The gradient id is scoped per instance with `useId`.** Several marks can share one DOM (a dialog over the mark-performed stage), and a duplicate id would make every instance resolve to the first paint server. React 18's ids contain colons, which are legal in an id but not in a `url(#…)` reference, so they are stripped.
- **The bloom is a `background`, not a pseudo-element.** `.performed-success-scroll` is an `overflow-y: auto` container; anything painted outside the box would be clipped at the scroll edge and could introduce a scrollbar. A background is bounded by the box and cannot.
- **Vertical rhythm is preserved** by trimming each surface's icon margin as the box grows, so the mark gets larger without the gap to the title growing with it.

### 7. Files changed

| File | Change |
| --- | --- |
| `prototype/project/driver.jsx` | `DialogSuccessIcon` rewritten as the 56px gradient mark with a `useId`-scoped gradient; `useId` added to the React destructure; the mark-performed stage's duplicate SVG replaced by `DialogSuccessIcon` |
| `prototype/project/styles.css` | New success-mark token family (light + dark); new "SUCCESS MARK" block; success tone removed from the disc modifiers; `.performed-success-check` reduced to its local centring |
| `docs/design/driver-screen-spec.md` | Icons section records the success-only deviation; three dialog-audit rows updated |
| `docs/design/brand-tokens.md` | Status-icon-disc row scoped to warning/destructive; new success-mark rows and token table |
| `docs/requirements/prd.json` | `version` gains the `[v2.31-success-mark]` entry (no version bump); new `success_mark_v1` resolved default; `dialog_standard_v1`'s icon sentence annotated as superseded **for the success tone only** (entry not rewritten) |
## v2.31 addendum — Full date and time in Infopoint messages and documents (2026-07-31)

**Numbering note:** authored as “PRD v2.27” before rebasing onto `main`, where that number was already taken. Recorded here as an addendum under **v2.31**; the PRD version is not bumped.

**Baseline:** PRD v2.31 + `[v2.31-success-mark]`
**Source:** work order "Show full date and time in Infopoint messages and documents".
**Type:** presentation refinement of Task 18 (Infopoint) — refines `infopoint_message_detail_page_v1`.
**Data model / API:** **UNCHANGED.** No field, endpoint, schema, DTO or migration.

### 1. Previous behaviour (v2.26)

All three Infopoint date lines interpolated the **raw stored string** directly in JSX:

| Surface | Rendered | Value |
| --- | --- | --- |
| Message list row | `{n.publishedAt}` | `24.05. 09:00` |
| Message detail page | `{item.publishedAt}` | `24.05. 09:00` |
| Document list row | `{d.updatedAt}` | `04.05. 09:10` |

So the driver saw a day and month with **no year**, and the lines bypassed `formatters.js` entirely — against that module's own stated contract, *"one formatter module, no ad hoc date strings in JSX."* At 14px the stamp also sat level with the 14px row title above it.

### 2. New behaviour (v2.27)

All three render `DD.MM.YYYY + HH:MM` — e.g. **`30.07.2026 + 13:05`** — through one new shared formatter, `AutheonFormatters.formatDateTime`.

**The `+` is a literal visible separator.** The work order writes it that way in both the required pattern (`DD.MM.YYYY + HH:MM`) and the worked example (`30.07.2026 + 13:05`), and the standing instruction is not to substitute a different product format when the task file is explicit. It is the formatter's default `separator` option, so changing it later is a one-line change at one site.

**Scope is deliberately narrow.** Exactly the three surfaces above. `DocumentPreviewSheet` renders **no** date and is untouched, and no other date anywhere in the application was changed.

### 3. Data-contract gap — reported, not worked around

Both canonical fields **already carry a real time**, so no time value is fabricated. But the store's `nowStamp()` writes them **without a year**:

```
nowStamp() -> `${dd}.${mm}. ${hh}:${mi}`   // "31.07. 14:05" — no year
```

The year therefore comes from the formatter's **pre-existing** `ASSUMED_YEAR = 2026`, the same convention `parseDottedDate` has always applied to a yearless dotted date (it was previously an inline `2026` literal; it is now a named constant shared by both parsers so they cannot disagree). This is an artefact of the **prototype seed format**, not a product rule — production stores real timestamps and the assumption disappears. **No per-record year is invented.**

### 4. Safety and correctness properties

- **No `Date` is ever constructed.** The output is assembled from parsed calendar *parts*, so timezone or DST conversion cannot shift the displayed calendar day — `31.12. 23:59` cannot roll to `01.01.`
- **Date-only values render as the date alone**, never inflated to a synthetic `00:00`.
- **A genuine stored `00:00` survives** and is displayed.
- **Missing, malformed or out-of-range values render an em dash** (`—`) and the raw value is **never** echoed to the screen. Verified against empty, `null`, `undefined`, non-date text, day `32`, month `13`, hour `25`, minute `70`, and a markup-shaped string.
- **Zero-padding and 24h** are enforced by the formatter, so `1.1. 0:05` renders `01.01.2026 + 00:05`.

### 5. Typography

Metadata drops one step, 14px → **12.5px** (`.infopoint-meta-datetime`), because the longer stamp previously sat level with the 14px row title it belongs under. `.mono` stays on the element, so tabular figures keep the stamps column-aligned down the list.

### 6. What deliberately did NOT change

- **Newest-first ordering.** It is **insertion order** (`newsItems.unshift`, seed order) and is never parsed from these strings, so a display-only change cannot affect it.
- Read/unread state, the unread tab badge, message navigation and the detail page.
- Document preview, download, share and print.
- All content-access audit behaviour, and document/message visibility rules.
- **Every i18n key.** The pattern is numeric and identical in EN and DE, so no translation was added and `driver-i18n-index.md` is unaffected.
- **Admin Backend**, which renders these fields through its own separate call sites.

### 7. Files changed

| File | Change |
| --- | --- |
| `prototype/project/formatters.js` | New `parseDottedDateTime` + `formatDateTime`; the `2026` year default extracted to a shared `ASSUMED_YEAR` constant (behaviour-preserving for `parseDottedDate`) |
| `prototype/project/driver.jsx` | The three Infopoint date sites now call `F().formatDateTime(...)` and carry `.infopoint-meta-datetime` |
| `prototype/project/styles.css` | New `.infopoint-meta-datetime` (12.5px muted) |
| `docs/design/driver-screen-spec.md` | Message-list Date row and detail-page body-card bullet record the new format and class |
| `docs/requirements/prd.json` | `version` gains the `[v2.31-infopoint-datetime]` entry (no version bump); new `infopoint_timestamp_format_v1` resolved default |
| `docs/product/autheon-context-pack.md` | Version trail gains the `v2.31-infopoint-datetime` entry |
## v2.31 addendum — Pickup and drop-off location names in committed order details (2026-07-31)

**Numbering note:** authored as “PRD v2.28” before rebasing onto `main`, where that number was already taken. Recorded here as an addendum under **v2.31**; the PRD version is not bumped.

**Baseline:** PRD v2.31 + `[v2.31-success-mark]` + `[v2.31-infopoint-datetime]`
**Source:** work order "Show pickup and drop-off location names in accepted-order details" (Figma comment `139-144#1849581318`; the written requirements are authoritative and were used, as the link could not be opened).
**Type:** presentation refinement of the committed order view. Refines `driver_visibility_matrix` by making an implied rule explicit.
**Data model / API:** **UNCHANGED.** The value already exists on the order. No field, request, column, endpoint or migration added.

### 1. Previous behaviour (v2.27)

The complete order view's route timeline showed, per stop, only **city** and **street + postal code + city**:

```
München
Ludwigstr. 12 · 80539 München        [View on map]
```

The driver could not tell **who** was at either end — which company or person to ask for on arrival — even though the order already recorded it.

### 2. New behaviour (v2.28)

The saved location name renders **between the city and the street address**, so a stop reads **city → who → where**:

```
München
Muller Munich yard                    <- new
Ludwigstr. 12 · 80539 München        [View on map]
```

Applied to both the pickup and the drop-off stop, in `JobUnlocked` — the single full-detail component, which both shells mount only when `activeJob.mode === "unlocked"` (reached after a successful acceptance, or from My orders). **Directly assigned orders reuse the same component and the same entitlement**, so they gain it automatically.

### 3. Canonical field — verified, not assumed

The work order expected something like `pickupName` / `deliveryName`. The **actual** repository names are:

| Layer | Field | Notes |
| --- | --- | --- |
| Snapshot on the order | `job.pickup.name`, `job.delivery.name` | `mkLocation()`, seeded from the address book's `label` |
| Denormalized display field | `job.startCompany`, `job.endCompany` | `syncDisplayFields`: `job.startCompany = pu.name \|\| ""` |

The renderer reads `startCompany` / `endCompany`, because the street, postal-code and city lines beside it already read the same flat display tier — so the whole stop block stays consistent. **Snapshot semantics are preserved:** the value is derived from the order's own recorded location, not a live master-data lookup, so an order keeps the name it was created with even after the address book changes.

### 4. Never the customer name

There is **no** fallback to `customerName` / `customer`. The customer is the order's counterparty and is frequently a different entity from the site at the kerb — the seed data makes this concrete:

| Order | `customerName` | Pickup stop | Drop-off stop |
| --- | --- | --- | --- |
| `A-2026-00847` | Muller Automobile GmbH | **Muller Munich yard** | **Autohaus Nord Berlin** |
| `A-2026-00844` | Muller Automobile GmbH | **Muller Hamburg** | **Hannover outlet** |
| `A-2026-00846` | Classic Cars AG | **Classic Cars Stuttgart** | **Classic Cars Munich showroom** |

Substituting the customer would assert something the order does not record. Each name is bound to its own stop, so pickup and delivery can never display each other's value.

### 5. Absent means gone

`null`, `undefined`, empty string and **whitespace-only** all drop the **entire line** — no label, no placeholder, no dash, no reserved space, no layout gap. Handled by one helper (`routeStopName`) that trims and returns `null`, so both stops share one definition of "absent". The line is unlabelled data, exactly like the street line above it, so **no i18n key was added**.

> Note for testing: all 17 seeded addresses carry a label, so **no seeded order exercises the hide path**. Reaching it requires an order created without a company name (via the admin order form, which allows it).

### 6. Visibility is unchanged — and now explicit

Two rows were **added** to `driver_visibility_matrix`, recording the tier the full address already had rather than granting anything new:

| Field | Before acceptance | After acceptance / assignment |
| --- | --- | --- |
| `pickup_location_name` | `false` | `true` |
| `delivery_location_name` | `false` | `true` |

No pre-acceptance surface can leak the name:

- **Marketplace preview (`JobLocked`)** uses a *different* route renderer — `.detail-route-city`, city + `PLZ` only, **no street at all**. `.city-location-name` appears nowhere in it.
- **Notification tour preview** already omitted `name` and `street` for a non-committed order at the **store projection** level (`driverNotificationJobPreview` → `restricted = !driverIsCommittedToJob(j)`), so there is nothing to render. Untouched.
- **Admin Backend** renders these fields through its own separate call sites. Untouched — `.city-address` and `.city-location-name` appear zero times in `admin.jsx`.

### 7. Long names

`.city-info` gained `flex: 1` + `min-width: 0`, and both the name and the address break on overflow. `.map-link` already had `flex-shrink: 0`. So a long company string wraps inside the stop column instead of stretching the flex row and pushing the map button off the card.

### 8. What deliberately did NOT change

City, postal code, street, house number, country, map actions, dates, time windows, navigation, and **contacts** — which are `contactPerson` (surfaced as `contactPickup.name` / `contactDelivery.name`), a genuinely different field from the location name and left exactly as it was.

### 9. Files changed

| File | Change |
| --- | --- |
| `prototype/project/driver.jsx` | New `routeStopName` helper; `pickupStopName` / `deliveryStopName` locals; a `.city-location-name` line in each of the two route-timeline stops |
| `prototype/project/styles.css` | New `.city-location-name`; `.city-info` given `flex: 1` + `min-width: 0`; `.city-address` given `overflow-wrap: anywhere` |
| `docs/design/driver-screen-spec.md` | New "Route stop identity" section |
| `docs/requirements/prd.json` | `version` gains the `[v2.31-stop-names]` entry (no version bump); new `route_stop_location_names_v1`; two new `driver_visibility_matrix` rows |
| `docs/product/autheon-context-pack.md` | Version trail gains the `v2.31-stop-names` entry |
