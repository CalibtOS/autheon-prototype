# PRD changelog: 2026-07-30 (v2.25 → v2.26)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`

> **Scope of this file:** the single **v2.26** entry. Baseline is **v2.25** (notification-open auditing removed from scope, 2026-07-29 — see [`prd-changelog-since-2026-07-29.md`](prd-changelog-since-2026-07-29.md)).

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
