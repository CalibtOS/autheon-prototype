# AUTHEON — Sitemap (Driver PWA + Admin Backend)

> Product: **AUTHEON — Vehicle Transport Platform**  
> Version analyzed: **v1.0 · Client preview (MOCK DATA)**  
> Two distinct surfaces share one design system, one auth domain, and one shell:
>
> - **Driver PWA** (mobile-first, for company-employed drivers / service partners)
> - **Admin Backend / Console** (desktop, for dispatchers)
>
> Global shell (always visible at the top): `AUTHEON` logo + tagline · **Driver PWA / Admin Backend** segmented switch · **EN / DE** language toggle · **Light / Dark** theme toggle · build tag (`v1.0 · Client preview`) · `MOCK DATA` badge.
>
> Skip from the visualization (Phase-2 / production only): Sign in, Sign out confirmation, real PDF download, real file upload, push registration, password reset dialog, "new driver" dialog, "new admin" dialog — these are placeholders/toasts in the prototype.

---

## 0. Global system

### 0.1 Shell / Chrome (shared)

- Top bar
  - Brand: `▲ AUTHEON · Vehicle Transport Platform`
  - Surface switch: `Driver PWA` ↔ `Admin Backend`
  - Language switch: `EN` ↔ `DE` (full bilingual copy; mobile nav becomes `MARKTPLATZ / MEINE TOUREN / INFO / PROFIL`; admin "New job" form is fully German "Neuer Auftrag")
  - Theme switch: `Light` ↔ `Dark`
  - Build info: `v1.0 · Client preview`
  - Data badge: `MOCK DATA`
- Sub-bar caption (mode-dependent)
  - Driver PWA: `DRIVER PWA · RESPONSIVE PREVIEW · TAP TO INTERACT`
  - Admin: top breadcrumb area

### 0.2 Cross-cutting design tokens

- Status badges (used both in admin tables and driver job cards): `Draft`, `Published`, `Assigned`, `Accepted`, `Return requested`, `Return`, `Completed`, `Cancelled`, plus secondary `Open` (return open).
- Toasts (e.g. "New driver form — Demo: production flow will open the driver creation dialog").
- Confirm sheets / modals (binding tour acceptance, finance edit, off-channel invoice, cancel job).

---

## 1. Driver PWA (mobile, in iPhone-frame preview)

Persistent **bottom tab bar** with four destinations:

1. Marketplace
2. My Jobs
3. Info
4. Profile

Phone status bar mock (9:41 · 5G · battery) is part of every screen.

### 1.1 Marketplace tab

- **Marketplace list** (`/marketplace`)
  - Header: title `Marketplace`, subtitle `N OPEN TOURS · SAT 16 MAY`
  - Primary control: `Filters` button (opens **Filter sheet**)
  - Result row: `N RESULTS` · sort toggle `Date ↑` / `Date ↓`
  - **Tour card** (repeating)
    - Origin city + postcode `· Pickup`
    - Destination city + postcode `· Destination · NNN km`
    - Price (e.g. `€ 165.00`)
    - Axle pill: `OWN AXLE` / `THIRD-PARTY AXLE`
    - Date chip + time-window chip (or `Flexible`)
    - Vehicle line: e.g. `PKW · VW Polo`
  - Empty state: list shrinks as tours are accepted (counter updates)
- **Filter sheet (bottom-sheet modal)**
  - Header: `Filters` · `Reset` · `×`
  - Postal code / area: `Pickup e.g. 80339` + `Delivery e.g. 10115`
  - Date window: `From`, `Until` + quick chips `Today` / `This week` / `Weekend`
  - Vehicle type chips: `SUV` `PKW` `Van` `Light truck <3.5t`
  - Axle configuration segmented: `All` / `Own axle` / `Third-party axle`
  - Footer buttons: `Cancel` · `Show N results`
- **Marketplace preview** (`/marketplace/:tour`) – opened by tapping a card
  - Back chevron + title `Marketplace preview`
  - **Route summary**: pickup postcode → destination postcode, City → City · NN km
  - Grid tiles: `Date`, `Time window`, `Vehicle` (type + model), `Axle`
  - `Payout € NNN.NN`
  - **Unlocked-after-acceptance** info card (Full pickup/delivery addresses, On-site contacts & phones, License plate & VIN, Operational instructions & PDF)
  - Footer buttons: `Back` · `Accept tour`
- **Binding acceptance sheet** (modal triggered by `Accept tour`)
  - Eyebrow `BINDING ACCEPTANCE`, title `Accept this tour?`
  - Tour summary card (Tour #ID, route, date, vehicle, axle, payout)
  - Body copy explaining return-window rule (deadline = end of day before job date)
  - Inline link: `View partner policy`
  - **Slide-to-confirm** control (`›››  Slide to confirm →`)
  - `Cancel` button
  - On confirm → marketplace count decreases by 1, navigation jumps to **My Jobs · Execution detail** for the new tour, status `ACCEPTED · ACTIVE`.

### 1.2 My Jobs tab

- **My jobs list** (`/jobs`)
  - Title `My jobs`
  - Tab strip with counts: `Active (N)` · `Completed (N)` · `Cancelled (N)`
  - **Job card** (per tour)
    - Status pill: `ACTIVE` (green) · `ASSIGNED` (amber) · `ACCEPTED` (green) · `RETURN` / `RETURN REQUESTED` (lavender) · `COMPLETED` (black) · `CANCELLED` (red)
    - Tour ID right-aligned (`#0846-26`)
    - Origin + postcode `· Pickup`
    - Destination + postcode `· Destination · NN km`
    - Price right-aligned
    - Footer line: `DD.MM. · HH:MM–HH:MM · Vehicle type`
- **Execution detail** (`/jobs/:tour`)
  - Back chevron + breadcrumb `Tour #NNNN-YY · MY JOBS · EXECUTION DETAIL`
  - Status row: `● ACCEPTED · ACTIVE` (variants below) — right side shows long tour code `A-2026-00NNN`
  - **Pickup** block: company line + street, postcode city
  - **Delivery** block: company line + street, postcode city
  - **Vehicle**: model · type
    - License plate (badge style) · VIN
  - **Contacts** grid: `Pickup` (name + phone) · `Delivery` (name + phone) — dashes when not provided
  - **Transport order (PDF)**: filename + `DEMO ASSET · V1` · `View` (opens in browser tab) · `↓` (download)
  - **Invoice for this tour** card
    - Explanatory copy (PDF or images JPEG/PNG/WebP/GIF; demo stores only name + metadata)
    - `+ Upload invoice` button (opens native file picker in production)
    - Empty state: `NO UPLOADS YET.`
  - **Operational instructions** (e.g. `No driver-facing add-ons.`)
  - **Dispatch notes** (free text or `—`)
  - **Payout** row: `NN km · Own axle / Third-party axle` + `€ NNN.NN`
  - **Return deadline** banner (only when applicable): `Return deadline · end of day before job date (Fri DD MMM, 23:59) · closed`
  - **Bottom action bar** (state-dependent — this is THE state machine to draw in Figma):
    - `ACCEPTED · ACTIVE` (return still open): `Request return` (left, secondary) · `Mark completed` (right, primary)
    - `ACCEPTED · ACTIVE` (return closed): `Return window closed` (left, disabled) · `Mark completed` (right, primary)
    - `ASSIGNED`: same pair as Accepted (mirror behavior)
    - `RETURN REQUESTED`: `Awaiting dispatch` (left, disabled) · `Mark completed` (right, disabled)
    - `COMPLETED`: action bar hidden / read-only; closed return-deadline note remains
    - `CANCELLED`: action bar hidden
  - Side-effects on `Mark completed`: card moves from Active tab → Completed tab; Active count −1, Completed count +1.

### 1.3 Info tab

- **Info hub** (`/info`)
  - Title `Info`
  - Document rows (each: title, category, scope, version, chevron) — visibility & version mirror the admin Documents page:
    - General work instructions · Operations · Global · v1.2
    - Partner terms · Legal · Global · v3.0
    - Emergency contacts · Safety · Global · v1.0
    - Privacy policy · Legal · Global · v2.1
    - Imprint · Legal · Global · v1.0
  - Bottom callout box: `Emergency dispatch: Mon–Fri 07:00–22:00 CET. Incidents, delays, and anomalies must be reported immediately.`
- **Document viewer** (target screen for each row — production only; in the prototype the rows are non-interactive placeholders. Represent in Figma as: header with title + version chip, scrollable PDF/HTML body, back chevron).

### 1.4 Profile tab

- **Profile** (`/profile`)
  - Title `Profile`
  - Identity row: avatar (`JB`), name `Jordan Blake`, `partner-id: AU-41-0228 · Active`
  - **Read-only master data** card
    - Company, Address, Email, Phone, Account status
    - Footnote: `Master-data changes must be requested through AUTHEON dispatch.`
  - **Notification preferences** card *(visible only when admin feature flag `notification_preferences` is ON)*
    - `Pickup postal area` (text input, 2-digit prefix style, e.g. `80`)
    - `Vehicle type` select / chips (`All`, `PKW`, `SUV`, `Van`, `Light truck <3.5t`)
    - `Axle` segmented (`All`, `Own axle`, `Third-party axle`)
    - `Push notifications enabled` toggle
    - iOS note: "Android supported in app flow. iOS requires home-screen installation, compatible iOS version, and permission."
  - `Sign out` button (production-only confirm dialog: "Demo sign out: authentication will be implemented in production.")

---

## 2. Admin Backend / Console (desktop)

### 2.1 Layout

- Left **sidebar** (`ADMIN CONSOLE · AUTHEON`)
  - `NAVIGATE` heading
  - Items (with badges where applicable):
    1. Jobs `(12)`
    2. New job
    3. Users
    4. Customers
    5. Documents
    6. Partner invoices `(0)`
    7. Finance
    8. Audit log
    9. Features
  - Sidebar footer: signed-in user card (`AB · Anna Bauer · DISPATCHER`) + sign-out icon button
- Main content header: breadcrumb (`Jobs / Tour No. 0847-26`) + page-level actions (right-aligned, e.g. `↓ Export CSV / XLSX`, `＋ New job`).

### 2.2 Jobs — Overview (`/admin/jobs`)

- Page title `Job overview` · right meta `12 / 12`
- **Status KPI cards** (one per status, count + share-of-jobs):
  - DRAFT, PUBLISHED, ASSIGNED, ACCEPTED, RETURN REQUESTED, COMPLETED, CANCELLED
- `**▶ What do statuses mean?`** expandable explainer with full legend:
  - Phase 1 rules paragraph
  - Side note: "Driver account Active/Blocked and finance payment labels are separate from tour lifecycle status."
  - One row per status (badge + description): Draft, Published, Assigned, Accepted, Return requested, Completed, Cancelled
- **Toolbar**
  - Search: `Search tour, customer, driver, …`
  - `▼ Filters` (toggles the quick-filter row)
  - `Status: all`
  - `Return requested` shortcut
  - Density switch: `Comfort` / `Dense`
  - Sort: `↕ TOUR NO. ↓`
- **Quick filters row** (expanded): `Draft` `Published` `Assigned` `Accepted` `Return requested` `Completed` `Cancelled` · `Reset`
- **Jobs table** — columns: `Tour`, `Customer`, `Origin` (postcode), `Destination` (postcode), `Appointment` (`DD.MM. · HH-HH` or `· flex`), `Vehicle`, `Driver` (name or `—`), `Status` (badge), `Return` (`OPEN` / `—`)
- **Pagination**: `Showing 1–12 of 12 · Page 1 / 1` · `Rows per page` (25 / 50 / 100) · `‹ 1 2 3 … 1 ›`

### 2.3 Jobs — Detail (`/admin/jobs/:tour`)

Header

- Breadcrumb `Jobs / Tour No. 0847-26`
- Small row: `Tour 0847-26  · ● STATUS-BADGE`
- H1: Customer name (e.g. `Müller Automobile GmbH`)
- Subtitle: `Origin postcode City → Destination postcode City · NN km · Day, DD.MM.YYYY · HH:MM–HH:MM`

Right rail (sticky widget column)

- **PAYOUT** card: amount + `OWN AXLE / THIRD-PARTY AXLE · LUMP SUM`
- **ASSIGNED DRIVER** card: dropdown/input — `— none —` or driver name (e.g. `Jordan Blake`)
- **METADATA** card: Created, Last updated, Source (e.g. `Manual · Admin form`)
- **STATUS HISTORY** card: chronological list of status changes with timestamps and actor (e.g. `Published · 23.04. 11:02 · A. Bauer`, `Draft · 23.04. 09:14 · A. Bauer`)

Main content sections (numbered 01–07; 07 appears only for return-requested)

- `01 Route` — Pickup address, Delivery address, Distance (km), Schedule (date + window)
- `02 Vehicle` — Type, Details (make/model), Plate, FIN/VIN
- `03 Contacts` — Pickup (name + tel link), Delivery (name + tel link)
- `04 Transport order (PDF)` — filename, issued timestamp, `V1 · DEMO FILE`, buttons `👁 View` · `↓ Download` · `↻ Regenerate`
- `05 Notes` — `Internal notes` (admin-only) + `Driver-visible notes`
- `06 Finance` (`ADMIN-ONLY · PHASE 1`)
  - Fields: Revenue / Price, Driver compensation, Expenses, Net · VAT 19%, Gross
  - Payment status select: `Invoice Missing` / `Invoice Received` / `Unpaid` / `Paid`
  - Invoice number input
  - Checkbox: `Invoice received`
  - Partner invoices (invoice ID) list — empty state `No partner invoice for this tour yet`
  - Footnote about 7-day invoice submission rule
- `07 Return requested` *(only when status = Return requested)*
  - Right side badge `● RETURN REQUESTED`
  - Driver name · `Request formal return`
  - Quoted return reason from driver
  - Buttons: `Approve → Draft` · `Reject · keep status`
  - `Decision notes (optional)` textarea (`Reason shown in internal history…`)

Bottom action bar (state-dependent)

- Eyebrow `ACTIONS · <STATUS>` + helper text (e.g. `Phase 1: you cannot assign from Published. Return the tour to Draft first (approve a return or recreate the tour).`)
- Right side primary actions per status:
  - `DRAFT` → `Publish to marketplace` + `Assign driver…` + `Delete draft`
  - `PUBLISHED` → (no positive action; helper text only)
  - `ASSIGNED` → `Cancel job…`
  - `ACCEPTED` → `Cancel job…`
  - `RETURN REQUESTED` → return decisions in section 07 + `Cancel job…`
  - `COMPLETED` → no action (terminal)
  - `CANCELLED` → no action (terminal)

### 2.4 Jobs — New job (`/admin/jobs/new`)

- Title eyebrow `NEUER FAHRAUFTRAG`, H1 `Neuer Auftrag` *(form ships in German; localize behavior identical in EN)*
- Right rail
  - `TOUR-NR` card (auto-assigned: `0848-26`)
  - `LIVE-ZUSAMMENFASSUNG` → `Auftrag-Vorschau` (live preview with Tour, Kunde, Route, Termin, Vergütung)
  - `VALIDIERUNG` widget: `N Pflichtfelder offen` + progress (`0 / 11 KOMPLETT`)
- Left sub-nav `FORM-ABSCHNITTE`: 01 Kunde · 02 Route · 03 Termin · 04 Fahrzeug · 05 Kontakte · 06 Vergütung · 07 Notizen
- **Sections**
  - `01 Kunde / Auftraggeber` — select existing or `+ Aus Master-Daten` (new); empty-state callout `Noch kein Kunde gewählt.`
  - `02 Route` — Startadresse (street + PLZ + city), Zieladresse, Distanz (km)
  - `03 Termin / Zeitfenster` — Datum, Zeitfenster von, Zeitfenster bis
  - `04 Fahrzeug` — Fahrzeugtyp chips (`SUV / PKW / Transporter / LKW < 3,5t / Oldtimer`); Marke; Modell; Kennzeichen; FIN (17-stellig); Achse segmented `Eigenachse / Fremdachse`
  - `05 Kontakte` — Übernahme contact (name + phone) · Übergabe contact (name + phone)
  - `06 Vergütung` — Preis (€)
  - `07 Notizen` — Freitext "Hinweise für den Fahrer…" + `+ Standard-Formulierung` snippet inserter
- Footer bar
  - Helper text: "Required fields must be complete for marketplace publish and direct assignment."
  - Buttons: `Cancel` · `Save draft` · `Assign driver…` (disabled until valid) · `Publish to marketplace` (disabled until valid — primary)

### 2.5 Users (`/admin/users`)

- Title `Users & drivers`, subtitle "Client-side management demo for service partners, admin users, account status, and password resets."
- **Service partners** card
  - Header: `Service partners` + `+ New driver` (toast in prototype, dialog in production)
  - Table: Name (+ company + email), Partner ID (e.g. `AU-41-0228`), Status (`● ACTIVE` / `● BLOCKED`), Actions (`Block` / `Activate` toggle, `Deactivate`, `Reset`)
- **Admin accounts** card
  - Header + `+ New admin`
  - Per admin: name, role + email, status badge, `Trigger password reset` button
  - Example users: Anna Bauer (Dispatcher), Lukas Reimann (Operations Lead), driver list incl. Jordan Blake (Active) and Mira Vogt (Blocked)

### 2.6 Customers (`/admin/customers`)

- Title `Customer master data`
- Table: Customer (name + tag e.g. `DEALER GROUP` / `FLEET CUSTOMER`), Reusable pickup, Reusable delivery, Contact (name + phone)
- Right side **Add customer** card: Name input + `Create` button + footnote "Historical PDFs are not changed unless a job PDF is explicitly regenerated."

### 2.7 Documents (`/admin/documents`)

- Title `Documents`, subtitle "Upload, replace, hide, or show driver Info documents and legal PDFs (prototype)."
- Table: Document (title + updated timestamp), Category (`Operations / Legal / Safety`), Scope (`Global`), Version (`v1.2` …), Visible (`● SHOWN` / `● HIDDEN`), Actions (`Replace`, `Hide` / `Show`)
- Rows mirror the Driver PWA Info hub: General work instructions, Partner terms, Emergency contacts, Privacy policy, Imprint
- Replace action → file upload (production)

### 2.8 Partner invoices (`/admin/partner-invoices`)

- Title `Partner invoices`, intro: "Driver-submitted invoice references (PDF or images). Which tour an upload belongs to is set only by the driver when uploading from that tour; dispatch cannot reassign it here. Prototype: file names and metadata only — no binary upload."
- Primary button: `Register off-channel invoice`
- Table columns: `File`, `Invoice ID`, `Partner`, `Tour / Job`, `Uploaded`, `Source`, `Processed`
- Empty state: `NO UPLOADS YET.`
- **Register off-channel invoice modal**
  - Intro: "Use when a partner sends a document outside the PWA (e.g. bundled invoice by email). Metadata only in this prototype."
  - Tour / Job dropdown (lists all tours)
  - Partner (Driver) dropdown
  - Document reference / filename input
  - MIME type input (optional)
  - Internal notes textarea
  - Checkbox `Set tour invoice number to this ID and mark invoice received` (default ON)
  - Buttons: `Cancel` · `Add to inbox`

### 2.9 Finance (`/admin/finance`)

- Title `Finance tracking`
- KPI cards: `REVENUE € NNNN ● TRACKED` · `UNPAID / MISSING NN ● MANUAL`
- Table: Tour, Customer, Revenue, Driver comp., Expenses, Invoice (status + invoice number, e.g. `Missing / no number` or `Received / INV-NF-2188`), Payment (`● UNPAID` / `● PAID`), `Edit` button per row
- **Edit tour finances modal** (per row)
  - Title `Edit tour finances` · subtitle `Tour-ID · CUSTOMER`
  - Fields: Revenue / Price (€), Driver compensation (€), Expenses (€), VAT rate (%), Net · VAT 19% (€), Gross (€), Payment status (select: Unpaid/Paid/Invoice Missing/Invoice Received), Invoice number, `Invoice received` checkbox
  - Footnote: 7-day invoice submission rule
  - Buttons: `Cancel` · `Save`

### 2.10 Audit log (`/admin/audit`)

- Title `Audit log` + primary button `↓ Download audit log (CSV)`
- Table columns: `Time`, `Action` (e.g. `job_cancelled`, `prototype_loaded`), `Actor` (admin name or `System`), `Entity` (tour ID / app name), `Metadata` (free text)

### 2.11 Features (`/admin/features`)

- Title `Feature flags`, intro: "Toggle features on/off. Changes are reflected immediately in the driver app."
- Each flag row: title, description, status pill (`● ON` / `● OFF`), toggle checkbox
- Flags present in v1.0:
  - **Notification preferences** — "Lets drivers configure push & email preferences from their profile tab." → when ON, Driver PWA Profile shows the Notification preferences card (§ 1.4).

---

## 3. Confirm & system dialogs (cross-surface)

These are shared modals/sheets — model them once in the Figma library and link from the screens above.

- **Driver: binding tour acceptance** (slide-to-confirm, partner-policy link, cancel)
- **Driver: sign-out** (`Demo sign out: authentication will be implemented in production.` · OK)
- **Admin: cancel job…** confirmation (action label `Cancel job…`, leads to status `CANCELLED`, removes assignment)
- **Admin: register off-channel invoice** (see § 2.8)
- **Admin: edit tour finances** (see § 2.9)
- **Admin: assign driver…** (Phase-1 inline dropdown on Draft / via direct dispatch; modal in production)
- **Admin: new driver / new admin** (Phase-2 dialog; placeholder toast in prototype)
- **Admin: regenerate transport-order PDF** (confirmation that historical PDFs persist unless explicitly regenerated)

---

## 4. State machine (canvas this near the Jobs section)

```
                 ┌──── create ─────┐
                 │                 ▼
              Draft  ─── publish ─► Published
                │        ─── direct assign ──► Assigned
                │                                  │
                │                          driver accept (marketplace path)
                │                                  ▼
                │                              Accepted
                │                                  │
                │              ┌──── mark completed ──► Completed (terminal)
                │              │
                │              └── request return (before deadline) ─► Return requested
                │                                                          │
                │  ◄────────── approve → Draft (assignment cleared) ───────┤
                │                                                          │
                │  ◄── reject · keep status (restores Assigned/Accepted) ──┘
                │
                └─ admin cancel from Assigned / Accepted / Return requested ─► Cancelled (terminal)
```

Mirror states in the **Driver PWA · My Jobs**: `Assigned`, `Accepted/Active`, `Return requested` (driver pill `RETURN`), `Completed`, `Cancelled`. Driver action availability is gated by the **return-window deadline** (= 23:59 the day before job date).

---

## 5. Shared lexicon (for Figma annotations)

- **Tour / Job** — single transport order (interchangeable in copy; internal ID `0NNN-YY`, long ID `A-YYYY-00NNN`).
- **Partner / Service partner / Driver** — the company-affiliated driver who can pick tours.
- **Dispatcher / Admin** — internal AUTHEON user (e.g. Anna Bauer · Dispatcher).
- **Customer / Auftraggeber** — fleet/dealer that originates the tour (e.g. Müller Automobile GmbH).
- **Axle** — `Own axle` (driver drives the vehicle on its own wheels) vs `Third-party axle` (loaded on a transporter).
- **Return window** — period during which a partner can hand a tour back to dispatch (closes 23:59 the day before job date).
- **Phase 1** — current product scope; e.g. cannot re-assign from Published without round-tripping through Draft.

---

## 6. Figma visualization hints

Suggested top-level frames on the Figma canvas (left → right):

1. **System & tokens** — color palette (incl. status colors), typography scale, badge/chip styles, button states, mobile vs desktop grid.
2. **Driver PWA flow** — Marketplace → Filters → Preview → Binding acceptance → My Jobs (per status) → Execution detail (per status) → Info hub → Profile (with & without notification flag).
3. **State machine** — the diagram in § 4, visualized as a node graph, color-coded with the same status pills.
4. **Admin Console flow** — Jobs overview → Job detail (Draft / Published / Assigned / Accepted / Return requested / Completed

