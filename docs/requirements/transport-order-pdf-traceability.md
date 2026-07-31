# Transport-order PDF — requirements traceability

**Task:** Adjust Automatic Order PDF Generation Using Approved Client Templates
**Monday item:** [12598918307](https://absolutweb-team.monday.com/boards/18417529138/pulses/12598918307)
**PRD task:** 17 — PDF Generation & Document Automation (audit rules: Task 22)
**Date:** 2026-07-30

Canonical requirement source stays [`prd.json`](prd.json); this file records the
mapping from each source requirement to the code, the test that proves it, and
the conflicts that are **not** resolved.

---

## 1. Controlled inputs and source precedence

Precedence used throughout, per the work order:

1. `TASK.md` — explicit decisions in the work order.
2. `references/Technical_Specifications_EN.pdf` and the two approved templates.
3. `prd.json` + `docs/product/autheon-context-pack.md` for platform rules this
   task does not change.
4. Existing implementation behaviour, only where it does not conflict.

| Input | Status |
| --- | --- |
| `TASK.md` | read in full |
| `references/Maschinelle Auftragsvorlage_PKW.pdf` | rendered + geometry extracted |
| `references/Maschinelle Auftragsvorlage_LKW.pdf` | rendered + geometry extracted; identical to PKW except the title |
| `references/Technical_Specifications_EN.pdf` | read in full (3 pages) |
| `skills/pdf-generation/SKILL.md` | followed — Strategy A (HTML/CSS → Chromium → PDF) |
| `docs/requirements/prd.json` | Tasks 17 + 22, `notification_channels_matrix`, `driver_visibility_matrix` |
| `docs/product/autheon-context-pack.md` | OQ-4 (branding pack) |
| `Machine-Generated Order Template - Filled Example Order.pdf` | **not present in this bundle** |
| `Machine-Generated Order Template - Comments.pdf` | **not present in this bundle** |

> **The `references/` PDFs are not committed to this repository.** They arrived
> with the work order and are cited above and in code comments as the
> authoritative visual source. Their rendered pages *are* committed under
> `visual-regression-artifacts/reference-templates/`, so the side-by-side review
> below is reproducible without them; only `npm run pdf:refs` (re-rasterising the
> originals) needs the bundle present. Likewise `skills/pdf-generation/`, whose
> Strategy A this implementation follows.

The two absent PDFs do not block the work — `TASK.md` states their requirements
were consolidated into the work order — but two consequences are recorded as
blockers below: the additional-information **row labels** (B5) and the exact
placement rule for the red `Abgemeldet` notice, which was implemented from the
`TASK.md` wording ("in the official licence-plate field").

### Extracted template geometry

A4 portrait, 595.32 × 841.92 pt. Measured off the content streams, not guessed:

| Element | Measurement |
| --- | --- |
| Text left margin | 70.8 pt (25 mm) |
| Body-text right edge | 524.5 pt (25 mm symmetric) |
| Table right edge | 538.7 pt (tables run 14.2 pt wider than the text) |
| Table columns | label 155.3 pt · value-1 121.1 pt · value-2 191.5 pt |
| Footer band | x 67.8 → 528.1 pt, 36.6 pt tall, bottom margin 15.7 pt |
| Logo | 146.1 × 16.9 pt, top 29.7 pt from the page edge, right-aligned to the text edge |
| Type sizes | title 14.04 pt · labels/values 9 pt · closing 9.96 pt · sender + legal + footer-strong 6 pt · footer + section subtitle 5.04 pt · additional-information content 7 pt |
| Row height | 16.0–16.1 pt (a **minimum**, never fixed) |
| Block gap | 16.4 pt between tables |

Reproduce with:

```bash
npm run pdf:refs      # reference templates -> PNG
npm run pdf:generate  # fixtures -> real PDFs + manifest
npm run pdf:render    # generated PDFs -> PNG for side-by-side review
```

The two Word artefacts at x < 30 pt (short rules at y 544 and y 422, inside the
left margin) are comment anchors from the commented template, not design
elements, and are deliberately **not** reproduced.

---

## 2. Traceability matrix

Status legend: **implemented** · **existing** (already satisfied, extended) ·
**blocked** · **n/a**.

### Generation timing and versioning

| # | Requirement | Source | Code | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Generate only after a saved, binding marketplace acceptance | TASK "Generation", Spec §1 | `store.js` `acceptJob()` → `generateTransportOrderPdf(trigger:"marketplace_acceptance")` | integration: *marketplace acceptance creates an immutable v1* | implemented |
| 2 | Generate only after a saved, binding direct assignment | TASK "Generation", Spec §1 | `store.js` `assignJob()` → `generateTransportOrderPdf(trigger:"direct_assignment")` | integration: *direct assignment creates an immutable v1…* | implemented |
| 3 | A rolled-back/refused booking creates no PDF | Master prompt §10 | generation is called after the commit, never before | integration: same test, `afterRefusal === 0` | implemented |
| 4 | Never trigger from UI render, download, or a draft | Skill §7, TASK | `PDF_BINDING_STATUSES`; `downloadPdf()` only reads | integration: *a still-published marketplace order has no document…* | implemented |
| 5 | First document is `v1`, an immutable booking snapshot | TASK, Spec §1 | `transportOrderDocuments` records, frozen `payload` | integration tests 1, 2 | implemented |
| 6 | A relevant change creates a NEW version, never overwrites | TASK, Spec §1 | `finalizeOrderEdit()` → `pdfRelevantChanges()` → `bumpJobDataRevision()` | integration: *a relevant change adds one version…* | implemented |
| 7 | Previous versions stay available in the audit history | TASK, Spec §1 | append-only array; `getTransportOrderDocuments()`, `getTransportOrderDocumentHtml()` | integration: *only the active version is exposed…* | implemented |
| 8 | Exactly one clearly marked current version | TASK, Spec §1 | `isActive` flipped inside one synchronous block, no interleaved `emit()` | integration: *manual regenerate…* (`activeCount === 1`) | implemented |
| 9 | Generation is idempotent per job revision; retries do not duplicate | Master prompt §4 | revision check in `generateTransportOrderPdf()` | integration: *repeating a trigger at the same data revision…* | implemented |
| 10 | Admin manual regenerate retained | PRD Task 17 | `regeneratePdf()` with `force: true` | integration: *manual regenerate mints a new version…* | implemented |

### Template selection

| # | Requirement | Source | Code | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| 11 | `passenger_car` → PKW template, `FAHRAUFTRAG PKW` | TASK, Spec §2 | `TEMPLATE_BY_VEHICLE_TYPE`, `TEMPLATE_TITLE` | unit: *maps every canonical vehicle type…*, *renders the exact client-defined title…* | implemented |
| 12 | Both truck categories → LKW template, `FAHRAUFTRAG LKW` | TASK, Spec §2 | same map, both keys → `lkw` | unit + content tests | implemented |
| 13 | Selection from the backend value, never display text | TASK, Master prompt | `selectTemplate()` returns `null` for labels | unit: `'PKW'`/`'Passenger car'` → `null` | implemented |

### Field mapping

| # | Requirement | Source | Code | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| 14 | Booking-time service-partner snapshot (company, person, street, house no., postcode, city, country) | TASK, Spec §2 | `servicePartnerSnapshot()`, frozen at v1 and carried forward | integration: *the booking-time partner snapshot survives a later profile edit* | implemented |
| 15 | Structured partner address fields exist | derived | `seedDrivers()` gained `street/houseNumber/postalCode/city/country` | same test | implemented |
| 16 | Booking date in `Europe/Berlin` | TASK, Spec §2 | `formatGermanDate()` + `job.bookedAt` (a real instant, via `nowIso()`) | unit: *formats dates as DD.MM.YYYY in Europe/Berlin* | implemented |
| 17 | Tour number, one identifier everywhere | TASK, Spec §2 | `payload.tour`, `fileName`, `metaTitle`, audit `tour` | integration: *filename, displayed tour, metadata title and audit entry share one identifier* | implemented |
| 18 | Transport type exactly `Eigenachse` / `Fremdachse` | TASK, Spec §2 | `TRANSPORT_TYPE_LABEL` | content test regex | implemented |
| 19 | Full customer name | TASK, Spec §2 | `payload.meta.kunde` | content tests | implemented |
| 20 | Order creator initials/name + telephone | TASK, Spec §2 | `payload.meta.auftragserstellung`; `seedAdmins()` gained `initials` + `phone` | content tests | implemented |
| 21 | Manufacturer + model | TASK, Spec §2 | `vehicle.makeModel` | content tests | implemented |
| 22 | Official licence plate + VIN | TASK, Spec §2 | `vehicle.plate`, `vehicle.vin` | content tests | implemented |
| 23 | Registration status with exactly one `X` | TASK, Spec §2 | `checkbox()` vector, one marked | unit: *selects exactly one registration checkbox…* | implemented |
| 24 | Red `Abgemeldet` in the licence-plate field when deregistered | TASK | `.plate-cell .dereg` (`#c00000`) | content: *a deregistered vehicle marks the second box and shows the red notice* (asserts computed colour **and** that it sits inside `.plate-cell`) | implemented |
| 25 | Pickup/delivery address, contact, date, time window, phone, e-mail, notes | TASK, Spec §2 | `locationSection()`, `locationBlock()` | content tests | implemented |
| 26 | Additional information order: note → additional contact → driver note | TASK | `additionalInfo()` | unit: *orders additional information exactly as the work order requires* | implemented |
| 27 | Booking date **and** time | TASK, Spec §2 | `payload.booking.date` / `.time` | content test regexes | implemented |
| 28 | Net service-partner compensation | TASK, Spec §2 | `payload.booking.compensation` from `job.driverOffer` | content test regex | implemented |
| 29 | **PWA distance excluded** | TASK, Spec §3 | `job.distanceKm` never mapped; excluded from `PDF_RELEVANT_FIELDS` | unit: *never emits the PWA distance*; content: no `\d+ km` | implemented — **conflict, see B1** |

### Formatting, typography, visual system

| # | Requirement | Source | Code | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| 30 | Date `DD.MM.YYYY` | TASK | `formatGermanDate()` | unit (incl. zero-padding, day-boundary rollover) | implemented |
| 31 | Time `HH:MM Uhr` | TASK | `formatGermanTime()` | unit (incl. both DST boundaries) | implemented |
| 32 | Compensation `100,00 EUR Netto` | TASK | `formatEurNet()` — hand-built, no locale dependency | unit (spec value, thousands, rounding, rejection of empty) | implemented |
| 33 | No server-locale-sensitive defaults | Master prompt §5 | `Intl…formatToParts` with explicit `timeZone`; manual number assembly | unit tests are locale-independent by construction | implemented |
| 34 | Umlauts, special characters, long e-mails, international addresses | TASK, Spec §3 | UTF-8 throughout, `overflow-wrap: anywhere` on e-mail/notes | content: *umlauts, special characters and international addresses render as glyphs* | implemented |
| 35 | A4 proportions, margins, spacing, table lines, footer, legal text | TASK | `--geo-*` custom properties in `renderHtml()` | `@visual-regression` snapshots + manual side-by-side against the reference PNGs | implemented |
| 36 | Montserrat 400 + 700, fully embedded | TASK, Spec §3 | `DEFAULT_FONT_CSS` (TrueType, never woff2); `--font-dir` inlines data URIs | content: *both Montserrat weights are embedded as real TrueType programmes* (asserts no `Type3`, ≥2 `/FontFile2`) | implemented — **B3** |
| 37 | Logo + checkboxes as stable embedded vector objects | TASK, Spec §3 | `checkbox()` inline SVG; `wordmark()` | content tests, visual snapshots | checkbox **implemented**; logo **blocked, B5** |
| 38 | Titles generally 9 pt; additional information 7 pt | TASK | `body { font-size: 9pt }`, `.info-body { font-size: 7pt }` | visual snapshots | implemented |
| 39 | Restrained, non-table-heavy appearance | TASK | hairline 0.5 pt borders; recipient block and meta grid are borderless | visual snapshots | implemented |
| 40 | Metadata title `Fahrauftrag <Tour-Nr.>`, author `AUTHEON GmbH` | TASK, Spec §3 | `metaTitle`/`metaAuthor`; `tools/pdf/pdf-info.js` writes `/Author` via an incremental update | content: *single-page fixtures are exactly A4 portrait with the required metadata* | implemented |
| 41 | No editable placeholders | TASK | no form elements emitted at all | unit: *leaves no unresolved template tokens or editable form fields*; content: no `/AcroForm`, no `/Widget` | implemented |
| 42 | Document stays German regardless of UI locale | Master prompt | `transport-order-pdf.js` never calls `window.I18n` | content: no English domain terms; `<html lang="de">` | implemented |

### Missing and long content

| # | Requirement | Source | Code | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| 43 | Validate mandatory data before publishing | TASK, Spec §4 | `MANDATORY_FIELDS` + `buildPayload()` returns `{ok:false, missing}` and **no HTML** | unit: *rejects every missing mandatory field…*; integration: *missing mandatory data blocks publication…* | implemented |
| 44 | Absent optional field hides label **and** content | TASK, Spec §4 | row/section omission + `colspan` merge for half-empty split rows | unit: *omits an absent optional field…*; content: *optional fields collapse without leaving an empty labelled cell* | implemented |
| 45 | Dynamic wrapping, no fixed row heights | TASK, Spec §4 | `height` on cells acts as a minimum; `overflow-wrap: anywhere` | content: *long content wraps and paginates without clipping or overlap* (scrollHeight/scrollWidth audit) | implemented |
| 46 | Keep related sections together | TASK, Spec §4 | `.keep-together`, `break-inside: avoid` on `section.loc` and every table row | same test (`locSections === 2` on both pages) | implemented |
| 47 | Multi-page allowed; repeat header + footer | TASK, Spec §4 | `<thead>`/`<tfoot>` as `table-header-group`/`table-footer-group` | content: *multi-page output carries a truthful Seite X von Y on every page* (header + footer asserted on both pages) | implemented |
| 48 | Show `Seite X von Y` | TASK, Spec §4 | Chromium `footerTemplate` `.pageNumber`/`.totalPages` in a reserved 13 pt strip; two-pass so single-page output keeps the exact template margin | same test, read back out of the PDF with pdf.js | implemented |
| 49 | No clipping, overlap, orphaned labels or broken glyphs | TASK | see 44–47 | content: overflow audit, header-collision geometry test, glyph test | implemented |

### Persistence, audit, notification, access control

| # | Requirement | Source | Code | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| 50 | Record generation timestamp, data revision, partner snapshot, generating admin, GTC id + version, PDF version, SHA-256 | TASK, Spec §1 | the version record in `generateTransportOrderPdf()` | integration test 1 asserts every field | implemented |
| 51 | Stable document id, job/tour id, active flag, storage reference, status | Master prompt §4 | same record | integration tests | implemented |
| 52 | Generation/regeneration audited with job, document, active version, revision, actor, timestamp, checksum, changed fields | TASK, Master prompt §9 | `log("pdf_generated"/"pdf_regenerated", …, extra)` | integration: *generation and regeneration are audited with every required identifier* | implemented |
| 53 | `pdf_viewed` / `pdf_downloaded` keep the driver + version (Task 22) | PRD Task 22 | unchanged `logContentAccess()`; now carries the real document id and version | integration: *pdf_viewed and pdf_downloaded record the acting driver and document version* | existing, extended |
| 54 | Notify the assigned partner when a relevant change creates a new active PDF | TASK, Spec §1 | `pushDriverNotification({type:"order_updated", documentId})` for version > 1 | integration: *a new active version notifies the assigned partner…* | implemented |
| 55 | Notification must not reveal admin-only data | Master prompt §9 | notification body carries only tour + version | same test asserts the internal note and the admin figure are absent | implemented |
| 56 | No workflow e-mail to the service partner | Master prompt (driver-email conflict) | only in-app/push used; `queueAdminEmailAlert` is admin-directed and untouched | code review; no new e-mail call sites | existing |
| 57 | Server-side authorization for preview/download | TASK, Master prompt §9 | `authorizeTransportOrderDocument()` — the single gate | integration: *a driver cannot reach another partner's transport order* | implemented |
| 58 | Only the active PDF in the normal driver flow | TASK, PRD Task 17 | `getTransportOrderPreview()` serves the active document only | integration: *only the active version is exposed…* | implemented |
| 59 | Downloadable through the existing permitted document flow | TASK | driver PDF card + `DocumentPreviewSheet`; admin card + `AdminTransportOrderPreview` | integration + manual run | implemented — see **deviation D1** |
| 60 | Reuse existing audit keys, document entities, channels, storage abstractions | Master prompt | `log()`, `logContentAccess()`, `pushDriverNotification()`, `SAMPLE_PDF_URL` untouched for other document types | code review | implemented |
| 61 | Relevant-change set defined explicitly in code | Master prompt §8 | `PDF_RELEVANT_FIELDS` | integration: *an irrelevant change creates no version…* | implemented — **needs confirmation, B2** |
| 62 | Internal notes / admin-only financials never regenerate or leak | Master prompt §8 | `notes` and `expenses` excluded from the set | same test | implemented |

---

## 3. Open blockers

These are unresolved after inspecting the repository. Nothing below is
"resolved by implementation" — each needs a decision before merge/release.

### B1 — PRD conflict: the PWA distance

`prd.json` Task 17 acceptance still requires the PDF to include "…vehicle
transfer description, **distance**, net price and VAT/tax totals…".
`references/Technical_Specifications_EN.pdf` §3 states "The PWA distance is not
included in the PDF." `TASK.md` repeats the exclusion and lists the conflict as
its own open question 1.

**Implemented:** the exclusion, because `TASK.md` is the highest-precedence
source. The change is deliberately **isolated**: the distance is simply never
mapped into the payload (one commented omission in `buildPayload()`) and
`distanceKm` is absent from `PDF_RELEVANT_FIELDS`. Re-including it would be an
additive change in those two places.

**Not done:** Task 17's acceptance text has **not** been rewritten to drop the
distance, and the conflict has not been silently reconciled. `prd.json` now
carries the conflict explicitly as a production open question.

**Decision required:** written client confirmation that the technical
specification supersedes the older Task 17 distance requirement.

### B2 — The relevant-change field list

The specification requires a new version on a "relevant change" but never
enumerates the fields. `PDF_RELEVANT_FIELDS` is derived from the approved
templates' field mapping: everything the document renders, and nothing else.

Included (34 keys): customer; all pickup and delivery address/contact/date/
window/phone/e-mail/note fields; vehicle type, manufacturer, model, plate, VIN,
transport type, registration status; driver offer; driver-visible note.

Deliberately excluded: `distanceKm` (B1), `expenses`, internal `notes`,
`category`, `electricVehicle`, `readyToDrive`, `requiresRedLicencePlates`.

**Decision required:** client confirmation of this list, in particular whether
`category` and the additional vehicle characteristics should force a new legal
version even though the approved template does not render them.

### B3 — Font assets

The approved templates embed Montserrat Regular and Montserrat Bold. The
repository intentionally ships **no font binaries** (`README copy.md`: "font
files are intentionally not included"), and this task must not commit unverified
ones.

**Implemented:** two paths, no committed binary.
* Runtime/preview: `DEFAULT_FONT_CSS` references the canonical OFL Montserrat
  **static TrueType** faces on Google's font host. TrueType, not woff2, is
  essential — handed a woff2 face, Chromium/Skia writes Type3 outline glyphs
  instead of an embedded font, which fails both "fully embedded" and text
  extraction. There is an automated test for exactly that.
* Generation/tests: `npm run pdf:fonts` caches the same faces into the
  git-ignored `tools/pdf/.fonts/` with their source URL and SHA-256 recorded in
  `SOURCES.json`; the generator inlines them as data URIs and **refuses to run**
  without them.

**Decision required:** production must vendor licensed Montserrat files into
the application's own asset pipeline (`--font-dir` / `options.fontCss` is the
seam). Depending on an external host at render time is not acceptable for a
legal document, and offline determinism requires local files.

### B4 — Historical-version visibility and unclassified mandatory fields

Two related unknowns:

1. `TASK.md` open question 4: are earlier versions visible only to admin/audit
   users, or also to the assigned service partner? **Implemented:** only the
   active version in the driver flow (the current PRD rule); historical versions
   are reachable through admin-side `getTransportOrderDocuments()` /
   `getTransportOrderDocumentHtml()`.
2. The specification lists the partner **house number** and the order creator's
   **telephone number** as PDF content, but the repository's existing address
   and admin validation does not require either. They are therefore treated as
   **optional** (label and content collapse) rather than inventing a new
   mandatory rule.

**Decision required:** confirm (1) and confirm whether (2) should become
mandatory — which would also make them mandatory on the partner and admin
profile forms.

### B5 — Legal and branding sign-off

Not approved, and not marked as approved anywhere:

* the standard legal paragraph and the footer register data, read verbatim off
  the approved templates;
* the referenced GTC/AGB document — the prototype declares a single
  `GTC_DOCUMENT = { documentId: "AGB-SP", version: "2026-01" }` because the
  repository has no versioned GTC entity; production needs a real one;
* the **logo**. The commented template was not supplied and the repository has
  no AUTHEON wordmark asset, so `wordmark()` typesets "AUTHEON" in the document
  font at the measured 146.1 × 16.9 pt box. This is a **placeholder**, not the
  client's logotype. `options.logoSvgDataUri` is the drop-in seam. This is the
  same pending item as context-pack **OQ-4** (branding pack);
* the additional-information row labels (`Hinweis`, `Weiterer Ansprechpartner`,
  `Hinweis für den Fahrer`). `TASK.md` fixes their **order**, which is enforced
  and tested; the label **wording** comes from the commented template, which is
  absent from this bundle.

### B6 — Mandatory-field / generation-failure behaviour

`TASK.md` open question 3. **Implemented** behaviour, which is the smallest
architecture-consistent choice and is explicitly documented rather than assumed
correct:

* the binding booking is committed first and is never rolled back by a PDF
  failure;
* nothing is published — no version record, no active-pointer change;
* any previously active version stays active;
* the failure is written to the audit log as `pdf_generation_failed` with the
  list of missing fields, so it is visible rather than silent;
* the admin regenerate action returns `{ok:false, reason:"missing_mandatory",
  missing:[…]}`.

**Decision required:** the user-facing admin error, whether an alert should be
raised, and the retry policy. There is deliberately **no** automatic retry and
**no** durable job queue — the prototype has no such infrastructure, and
inventing one was out of scope.

---

## 4. Prototype deviations (deliberate, and what production must do)

### D1 — There are no stored PDF bytes at runtime

This repository is a **static front end**: no server, no build step, no
storage. Two consequences, both by design:

* **In-app view** renders the print-ready A4 document (real data, real layout,
  embedded Montserrat) in the existing document viewer.
* **Download / Print** hands that document to Chromium's own PDF writer
  (`printDocumentHtml()`), so the user saves a genuine PDF with the approved
  layout. The `Seite X von Y` counter is a Chromium *print-margin* feature and
  is not available on this path; the browser prints its own headers instead.
* The **client-review artefacts and all automated PDF assertions** come from
  `npm run pdf:generate`, which drives the same renderer through Playwright's
  Chromium `page.pdf()` and *is* fully correct, including the page counter.

Production owns: object storage, the stored binary, and a
`storageRef` that resolves to it. The record already carries the field.

### D2 — The checksum covers the canonical document source, not the binary

`checksumSha256` is the SHA-256 of `JSON.stringify(payload) + "\n" + html` —
the deterministic source of the document. A browser cannot hash bytes it never
produces, and Chromium's PDF output embeds a creation timestamp, so a binary
hash taken client-side would not be reproducible.

The generator additionally records the real SHA-256 of every PDF it writes, as
`pdfChecksumSha256` in
[`../../visual-regression-artifacts/transport-order-pdf/manifest.json`](../../visual-regression-artifacts/transport-order-pdf/manifest.json),
alongside `sourceChecksumSha256`. Production must hash the stored binary and
keep the source digest as the revision fingerprint.

A consequence worth knowing: a **forced** regenerate with unchanged data
produces a new version with the **same** checksum. That is correct — identical
content, identical digest — and it is what proves the content did not change.

### D3 — PDF bytes are not bit-reproducible

Chromium stamps `/CreationDate`. Visual regression therefore runs on the
rendered page (deterministic: fixed fixtures, fixed booking instant, no
timestamp is drawn in the document), not on PDF bytes. No masking is needed.

### D4 — Seeded demo data

`seedTransportOrderDocuments()` backfills `v1` for the seeded orders that are
already in a binding state by running the **real** generation path, so the demo
data can never describe a record shape the code cannot produce. Those seeding
entries are removed from the audit log so the admin console starts clean.

---

## 5. How to verify

```bash
npm run pdf:fonts        # once — caches the OFL Montserrat faces (git-ignored)
npm run pdf:verify       # generate + rasterise + run all three PDF spec files
npm run pdf:refs         # rasterise the reference templates for comparison
npm run typecheck
```

Review artefacts land in
[`../../visual-regression-artifacts/transport-order-pdf/`](../../visual-regression-artifacts/transport-order-pdf/)
(PDF + the exact HTML that produced it + `manifest.json`) and
`.../transport-order-pdf/png/` for the rendered pages. Reference renders are in
`.../reference-templates/`.

Test files:

| File | Covers |
| --- | --- |
| `tests/regression/transport-order-pdf.unit.spec.ts` | pure functions: template mapping, formatters, DST, checkbox, optional/mandatory, checksum, escaping, distance exclusion |
| `tests/regression/transport-order-pdf.integration.spec.ts` | domain: timing, versioning, active pointer, idempotency, audit, notification, authorization, snapshot immutability |
| `tests/regression/transport-order-pdf.visual.spec.ts` | real PDFs: A4 box, metadata, embedded fonts, page counters, wrapping, glyphs, plus `@visual-regression` snapshots |

**Visual comparison is required, not optional.** A passing text assertion cannot
see a clipped cell, an overlapped header or a substituted font.
