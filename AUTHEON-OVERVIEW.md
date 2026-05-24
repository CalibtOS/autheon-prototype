# AUTHEON — Product Overview & Designer Onboarding Guide

> **Version:** PRD v1.6 (prototype) — canonical spec: `AUTHEON/prd_updated_v2.json`  
> **Audience:** UX/UI Designer onboarding  
> **Companion files:** [Sitemap.md](Sitemap.md) · [DOMAIN.md](AUTHEON/autheon-extracted/autheon/project/DOMAIN.md) (status & terminology glossary)  
> **Prototype:** `AUTHEON/autheon-extracted/autheon/project` (single-page HTML/React Babel demo)

---

## 1. What is AUTHEON?

AUTHEON is a **vehicle transport operations platform** that replaces manual, spreadsheet-driven dispatch with a contract-driven digital workflow.

**The core problem it solves:**  
Fleet owners and dealers (customers) need vehicles relocated between locations — picked up at one address and delivered to another. Today, this is coordinated via phone calls, emails, and Excel sheets. AUTHEON digitalises the entire process: from job creation, through driver acceptance, to invoice reconciliation.

**What it is NOT (Phase 1):**  

- Not a maps/GPS tracking app  
- Not a chat tool  
- Not an accounting system  
- Not a customer-facing booking portal  
- Not an automated matching engine

---

## 2. The Two Products in One Shell

AUTHEON ships as **two distinct surfaces** within a single shell (shared top bar with surface toggle, language switch, and theme switch):


| Surface           | Audience                       | Device                       | Purpose                                                                          |
| ----------------- | ------------------------------ | ---------------------------- | -------------------------------------------------------------------------------- |
| **Driver PWA**    | Service partners / drivers     | Mobile-first (iOS & Android) | Browse jobs, accept tours, track own work, upload invoices                       |
| **Admin Backend** | Dispatchers / operations staff | Desktop                      | Create/manage jobs, assign drivers, handle returns, track finances, manage users |


Both surfaces share one auth domain, one design system, and one data model.

---

## 3. Users & Roles

### 3.1 Admin / Dispatcher

Internal AUTHEON staff. Full control over the platform.

**Can do:**

- Create, edit, publish, assign, and cancel jobs
- Manage drivers (activate, block, deactivate, reset passwords)
- Manage admin accounts
- Manage customer master data (reusable pickup/delivery addresses, contacts)
- Approve or reject return requests
- View and download all partner invoice documents
- Register invoices received through off-channel means (email, post)
- Edit financial fields per job (revenue, driver compensation, expenses, payment status)
- View and export the full audit log
- Upload/manage operational documents visible to drivers
- Control feature flags (e.g. toggle notification preference UI for drivers)
- Regenerate transport-order PDFs
- Export job data as CSV/Excel

**Cannot do:**

- Complete a job (only the driver can)
- Accept a job from the marketplace (only the driver can)

---

### 3.2 Driver / Service Partner

Company-affiliated driver. Restricted view and limited actions.

**Can do:**

- Browse the marketplace (published jobs only, with reduced/anonymised data)
- Filter marketplace by postal code, date, vehicle type, axle
- Accept a published job (binding — deliberate slide-to-confirm gesture)
- View full job details after acceptance (addresses, contacts, VIN, plate, PDF)
- Mark a job as completed
- Request a return (before the deadline: 23:59 the day before the job date)
- Upload an invoice document against a specific job
- View their own profile (read-only)
- Configure notification preferences (if feature flag is ON)
- Access the Info hub (operational documents, legal, emergency contacts)

**Cannot do:**

- See other drivers' jobs
- Reject a directly assigned job outright
- Cancel a job themselves (only escalation/return request is available)
- Edit their own master dataSee sensitive fi
- elds before accepting a marketplace job
- Upload invoices without linking to a specific job

---

### 3.3 Driver Status Types

A driver account can be in one of three states:


| Status          | Effect                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------- |
| **Active**      | Full platform access                                                                                |
| **Blocked**     | Cannot access marketplace or active jobs (may still view historical completed/cancelled jobs — TBC) |
| **Deactivated** | Account fully disabled                                                                              |


---

## 4. The Job (Tour) — The Core Object

Every transport task is a **Job** (also called a **Tour**). Each job has a unique auto-generated tour number in the format `NNNN-YY` (e.g. `0847-26`, representing job #847 in year 2026).

### 4.1 Key Job Data Fields

**Operational:**

- Tour number, category, customer
- Pickup: company, address, contact, phone, date/time window
- Delivery: company, address, contact, phone, date/time window
- Distance (km)
- Vehicle: type, make/model, license plate, VIN
- Axle type: Own axle (vehicle driven on its own wheels) or Third-party axle (transported on a truck)
- Driver-visible notes, internal notes

**Financial (admin-only):**

- Revenue / price, driver compensation, expenses
- Net amount, VAT (19%), gross total
- Invoice received (system-derived or admin override)
- Invoice number, payment status

**System:**

- Status, status history (full timeline)
- Assigned driver
- Generated PDF reference
- Audit trail entries

---

## 5. Job Lifecycle — The State Machine

There are **two distinct paths** a job can follow. They are **mutually exclusive** in Phase 1.

```
                   ┌──── Admin creates ────┐
                   │                       ▼
              [DRAFT]  ──── Publish ────► [PUBLISHED]
                │                             │
                │                      Driver accepts (binding)
                │                             │
                │                             ▼
                │                        [ACCEPTED]
                │
                └──── Direct assign ──► [ASSIGNED]
                                             │
                        (both paths converge here)
                                             │
                          ┌── Driver marks completed ──► [COMPLETED] ✓ terminal
                          │
                          └── Driver requests return ──► [RETURN REQUESTED]
                                                               │
                                    Admin approves ──► back to [DRAFT] (driver removed)
                                    Admin rejects  ──► back to [ACCEPTED] or [ASSIGNED]

       Admin can cancel from [ACCEPTED], [ASSIGNED], or [RETURN REQUESTED] ──► [CANCELLED] ✓ terminal
```

### Path A: Marketplace (Published)

1. Admin creates job → **Draft**
2. Admin publishes → **Published** (visible in Driver Portal as anonymised card)
3. Driver accepts (atomic — only one driver wins) → **Accepted**
4. Driver completes → **Completed**

### Path B: Direct Assignment

1. Admin creates job → **Draft**
2. Admin assigns a specific driver → **Assigned** (never appears in marketplace)
3. Driver completes → **Completed**

### Key Phase 1 Rules

- **Published → Assigned is blocked.** If a published job needs to be reassigned, it must return to Draft first.
- **Acceptance is binding.** A driver who accepts cannot simply cancel — they must use the return request flow.
- **Directly assigned jobs cannot be rejected.** The driver can only submit a return request.
- **Return window closes at 23:59 the day before the job date.** After this, return requests are disabled.
- **Approved return = job back to Draft.** Driver assignment is cleared, job can be re-published or reassigned.
- **Only admins can cancel** jobs that are in Accepted or Assigned state.

---

## 6. Pre-Acceptance Data Visibility (Key UX Rule)

This is a critical design constraint that affects every job detail screen:


| Field                          | Before acceptance | After acceptance |
| ------------------------------ | ----------------- | ---------------- |
| Route summary (postcodes only) | Visible           | Visible          |
| Distance, date/time window     | Visible           | Visible          |
| Vehicle type, axle type        | Visible           | Visible          |
| Price / payout                 | Visible           | Visible          |
| **Full pickup address**        | **Hidden**        | **Visible**      |
| **Full delivery address**      | **Hidden**        | **Visible**      |
| **Contact names & phones**     | **Hidden**        | **Visible**      |
| **License plate & VIN**        | **Hidden**        | **Visible**      |
| **Operational notes**          | **Hidden**        | **Visible**      |
| **Transport-order PDF**        | **Hidden**        | **Visible**      |


The locked section must show a clear message explaining that details unlock after acceptance.

---

## 7. Admin Workflow — Step by Step

### Creating a Job

1. Click **New Job** → opens creation form (German form in prototype: "Neuer Auftrag")
2. Fill in sections: Customer → Route → Schedule → Vehicle → Contacts → Compensation → Notes
3. System auto-assigns tour number
4. **Save as Draft** (can be edited freely)
5. Either:
  - **Publish to Marketplace** (job appears in Driver Portal as anonymised card)
  - **Assign Driver…** (job goes directly to the selected driver)

### Managing Returns

1. Admin sees jobs with `RETURN REQUESTED` badge (in overview and via filter)
2. Opens job detail → section 07 shows driver's return reason
3. Chooses:
  - **Approve → Draft:** removes driver, job returns to Draft for re-dispatch
  - **Reject · keep status:** job stays in current state (driver keeps the assignment)
4. Optionally adds decision notes

### Financial Reconciliation

Admins track finances in two separate but linked views:

**Finance View** (`/admin/finance`):  
Per-job ledger with revenue, compensation, expenses, invoice number, payment status.

**Partner Invoices View** (`/admin/partner-invoices`):  
Queue of all invoice documents submitted by drivers (or registered off-channel).

**Invoice Received Logic (auto-reconciliation rule):**

- `Invoice Received = TRUE` if:
  - Admin manually set `adminInvoiceOverride = true`, OR
  - At least one partner invoice document for this job is marked as **processed** by admin
- `Invoice Received = FALSE` if:
  - Admin manually set `adminInvoiceOverride = false` (dispute/override path), OR
  - No processed upload exists and no manual override

Changing a processed flag, deleting an upload, or re-linking an upload triggers automatic reconciliation across all affected jobs.

---

## 8. Driver Workflow — Step by Step

### Finding and Accepting a Job

1. Open **Marketplace** tab → browse job cards (reduced data only)
2. Apply filters (postal code, date range, vehicle type, axle)
3. Tap a card → **Marketplace Preview** (still limited data; locked section visible)
4. Tap **Accept tour** → **Binding Acceptance Sheet** appears
5. Read warning + return-window rules
6. **Slide to confirm** → acceptance is atomic (if job was taken by another driver, clear error message shown)
7. Job moves to **My Jobs → Active tab** with full details now unlocked

### During the Job

- View full addresses, contacts, vehicle details, PDF
- Upload invoice document (linked to this specific job)
- If something goes wrong: **Request Return** (before deadline) or just mark completed

### Completing a Job

- Tap **Mark completed** → job moves to **Completed tab**
- Action bar disappears (read-only state)

### Return Request

- Available only before 23:59 the day before the job date
- Requires written explanation
- Options: return request, pickup not possible, accident/breakdown
- Creates `RETURN REQUESTED` state → admin decides
- Driver sees `Awaiting dispatch` state while pending

---

## 9. Invoice & Billing Flow

### Driver Side

- On the job execution detail screen, there is an **"Invoice for this tour"** card
- Driver uploads PDF or image (JPEG, PNG, WebP, GIF)
- Upload is **always tied to a specific job** — no unattached uploads
- Demo stores metadata only (filename, type, timestamp); production stores actual file

### Admin Side

- **Partner Invoices inbox** shows all submitted documents with: file name, invoice ID, partner (driver), linked tour, upload timestamp, processed flag
- Admin can mark uploads as **processed**
- Admin can **register off-channel invoices** (for documents sent by email/post outside the PWA) via modal — links to a tour, optionally auto-sets invoice number and marks invoice received
- When processed flag changes → reconciliation runs on linked job(s)

---

## 10. Transport-Order PDF

Each accepted job generates an **official transport-order PDF** based on the AUTHEON template. This is the driver's formal job instruction document.

**Contains:**

- Tour number, issue date, category
- Driver name and customer/principal
- Vehicle description (with axle-based transfer wording)
- Distance, net price + VAT
- Pickup section: address, contact, phone, time window, additional instructions
- Delivery section: same
- License plate + VIN
- General operational clauses: pre-trip inspection, fuel rules, direct route, incident reporting, invoice submission SLA (7 calendar days), weather-appropriate tires, safety clothing, binding effect statement

**Rules:**

- PDF generated on direct assignment or marketplace acceptance (not before)
- Only the currently active PDF is shown to users
- Admin can manually regenerate after data changes (logged in audit)
- Legal wording requires review before production launch
- Driver can view and download from job execution detail

---

## 11. Audit Log

Every significant action is automatically recorded with: timestamp, action type, actor (admin name or "System"), entity (tour ID / user), and metadata.

**Logged actions include:**

- Job created, changed, published, directly assigned, accepted, completed, cancelled
- Return requested, approved, rejected
- Driver/user activated, blocked, deactivated
- Document uploaded, replaced
- PDF generated, regenerated
- Partner invoice upload registered, updated, deleted
- Financial field updates
- Audit log exported (the export action itself is logged)
- Feature flag changes

Admin can view the log in the console and **download it as CSV** (admin-only action, itself logged).

---

## 12. Feature Flags

The admin **Features** panel (`/admin/features`) controls optional driver-facing functionality:


| Flag                       | Effect                                                          |
| -------------------------- | --------------------------------------------------------------- |
| `notification_preferences` | Shows/hides the notification preferences card in Driver Profile |


More flags can be added without a new release. All changes are logged in the audit trail.

---

## 13. Platform Architecture Summary (for Designers)

```
AUTHEON Platform
│
├── Driver PWA  (mobile, React)
│   ├── Marketplace  — browse + accept published jobs
│   ├── My Jobs      — active, completed, cancelled tabs
│   ├── Info         — operational documents hub
│   └── Profile      — read-only data + notification prefs
│
├── Admin Backend  (desktop, React)
│   ├── Jobs         — overview table + detail + new job form
│   ├── Users        — drivers + admin accounts
│   ├── Customers    — master data for reusable locations/contacts
│   ├── Documents    — manage Info hub content
│   ├── Partner Invoices — uploaded billing documents inbox
│   ├── Finance      — per-job financial ledger
│   ├── Audit Log    — full action history + CSV export
│   └── Features     — feature flag toggles
│
└── Shared Layer
    ├── Auth (roles: Admin, Driver)
    ├── Design system (tokens, badges, modals, states)
    ├── PDF service (transport-order generation)
    ├── Notifications (push, matched by driver prefs)
    └── Reconciliation (invoice-received auto-sync)
```

---

## 14. Screen Inventory (Design Coverage)

### Driver PWA Screens


| Screen                   | Path                          | Status gated?                       |
| ------------------------ | ----------------------------- | ----------------------------------- |
| Marketplace list         | `/marketplace`                | Shows Published only                |
| Filter sheet             | (bottom sheet on Marketplace) | —                                   |
| Marketplace preview      | `/marketplace/:tour`          | Pre-acceptance view                 |
| Binding acceptance sheet | (modal on Preview)            | —                                   |
| My Jobs list             | `/jobs`                       | Active / Completed / Cancelled tabs |
| Job execution detail     | `/jobs/:tour`                 | 6 status variants (see below)       |
| Info hub                 | `/info`                       | —                                   |
| Document viewer          | `/info/:doc`                  | —                                   |
| Profile                  | `/profile`                    | With/without notification flag      |


**Execution detail has 6 distinct action states (critical for Figma):**


| State                       | Left action                       | Right action                |
| --------------------------- | --------------------------------- | --------------------------- |
| Accepted · return open      | `Request return` (secondary)      | `Mark completed` (primary)  |
| Accepted · return closed    | `Return window closed` (disabled) | `Mark completed` (primary)  |
| Assigned (mirrors Accepted) | Same as above                     | Same as above               |
| Return Requested            | `Awaiting dispatch` (disabled)    | `Mark completed` (disabled) |
| Completed                   | No action bar                     | —                           |
| Cancelled                   | No action bar                     | —                           |


---

### Admin Screens


| Screen               | Path                      |
| -------------------- | ------------------------- |
| Jobs overview        | `/admin/jobs`             |
| Job detail           | `/admin/jobs/:tour`       |
| New job form         | `/admin/jobs/new`         |
| Users & drivers      | `/admin/users`            |
| Customer master data | `/admin/customers`        |
| Documents            | `/admin/documents`        |
| Partner invoices     | `/admin/partner-invoices` |
| Finance tracking     | `/admin/finance`          |
| Audit log            | `/admin/audit`            |
| Feature flags        | `/admin/features`         |


**Job detail has 7 status variants (bottom action bar changes per status):**


| Status           | Available actions                                           |
| ---------------- | ----------------------------------------------------------- |
| Draft            | Publish to marketplace · Assign driver · Delete draft       |
| Published        | (No action — helper text only: return to Draft to reassign) |
| Assigned         | Cancel job                                                  |
| Accepted         | Cancel job                                                  |
| Return Requested | Approve → Draft · Reject · keep status · Cancel job         |
| Completed        | (Terminal — no actions)                                     |
| Cancelled        | (Terminal — no actions)                                     |


---

### Shared / System Dialogs


| Dialog                                     | Triggered by                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| Binding tour acceptance (slide-to-confirm) | Driver taps "Accept tour"                                                        |
| Driver sign-out confirmation               | Driver taps "Sign out"                                                           |
| Admin: cancel job confirmation             | Admin taps "Cancel job…"                                                         |
| Admin: register off-channel invoice        | Admin clicks button in Partner invoices                                          |
| Admin: edit tour finances                  | Admin clicks "Edit" in Finance table                                             |
| Admin: assign driver                       | Admin clicks "Assign driver…" on Draft job                                       |
| Admin: regenerate PDF confirmation         | Admin clicks "Regenerate" on job detail                                          |
| Admin: new driver / new admin              | Admin clicks "+ New driver" / "+ New admin" (Phase 2 dialog; toast in prototype) |


---

## 15. Shared Lexicon


| Term                                   | Meaning                                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Tour / Job**                         | Single transport order. Used interchangeably. Short ID: `0NNN-YY`, long ID: `A-YYYY-00NNN`         |
| **Driver / Partner / Service partner** | Company-affiliated driver who accepts and executes tours                                           |
| **Dispatcher / Admin**                 | Internal AUTHEON user who creates and manages jobs                                                 |
| **Customer / Auftraggeber**            | Fleet owner or dealer who originates the transport need (e.g. Müller Automobile GmbH)              |
| **Own axle**                           | Driver pilots the vehicle on its own wheels to the destination                                     |
| **Third-party axle**                   | Vehicle is loaded on a transporter (driver drives the truck, not the transported vehicle)          |
| **Return window**                      | Period when a driver can hand a job back to dispatch. Closes at 23:59 the day before the job date  |
| **Marketplace**                        | Driver Portal where published jobs appear as anonymised cards                                      |
| **Direct assignment**                  | Admin assigns job to a specific driver; job bypasses marketplace                                   |
| **Invoice Received**                   | Financial flag per job — auto-derived from processed uploads or set manually by admin              |
| **adminInvoiceOverride**               | Admin's explicit manual lock on invoice-received state (overrides auto-derivation)                 |
| **Phase 1**                            | Current product scope. Published → Assigned without Draft is blocked. No GPS, no chat, no ERP sync |


---

## 16. Key Design Constraints for Phase 1

1. **No re-assignment from Published.** If a published job needs a specific driver, admin must approve a return or cancel + recreate.
2. **Atomic acceptance.** The Accept API uses a transaction lock — only one driver can win. UX must handle the race condition gracefully ("Job already taken").
3. **Return deadline is server-enforced.** The UI must reflect this: button disabled + reason shown once deadline passes.
4. **Pre-acceptance data masking is server-side.** Never rely on UI-only hiding for sensitive fields — the API enforces it.
5. **No file binary in prototype.** Partner invoice uploads store only metadata (filename, MIME, size, timestamp) in the demo. Design for the real upload UX.
6. **Invoice reconciliation is automatic.** Changing a processed flag on an upload immediately recalculates `invoiceReceived` on the linked job. The Finance and Partner Invoices views must stay visually consistent.
7. **PDF is generated on commitment, not on publish.** Access is still restricted until acceptance.
8. **Legal wording in PDF is not final.** Layout is based on the draft Word template; copy needs legal sign-off before production.

---

## 17. Out of Scope (Phase 1)

These are confirmed exclusions — do not design for them:

- Chat / messaging between admin and drivers
- GPS or live tracking
- Driver rating / ranking
- Automated job-driver matching
- Advanced BI dashboards / margin automation
- ERP or accounting system integration
- Full multilingual rollout (EN/DE prototype demo exists; product-wide i18n is a separate decision)
- External customer import or PDF recognition
- Driver-initiated job cancellation

---

## 18. Open Design Questions (Pending Client Confirmation)

These affect UX decisions — flag them when designing:

1. **Return deadline timezone** — which timezone is "23:59 the day before"?
2. **Return deadline date source** — is it based on pickup date, delivery date, or operational start date?
3. **Historical jobs for blocked/deactivated drivers** — can they still see their completed/cancelled history?
4. **Cancelled jobs tab** — separate tab in My Jobs, or part of a general "historical" view?
5. **Direct assignment notification** — should the assigned driver receive a push notification?
6. **Tax calculation in PDF** — confirm VAT rates and calculation rules
7. **Vehicle category list** — is the vehicle CSV master data or a one-time import?
8. **File retention & DSGVO** — production file handling, encryption at rest, malware scanning for invoice uploads

---

## 19. Risk Areas to Watch as Designer


| Risk                             | UX Implication                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Atomic acceptance race condition | "Already taken" error must be clear and non-disruptive                               |
| Return deadline disputes         | Deadline display must be unambiguous (date + time + timezone)                        |
| Pre-acceptance data leakage      | Never show sensitive fields in locked state, even as placeholder text                |
| PDF legal wording                | Add "subject to legal review" note in design annotations                             |
| iOS push notification onboarding | Requires home-screen install + permission flow — design the full onboarding sequence |
| High-volume admin job table      | Pagination, density controls, and filters must work at 200+ jobs                     |
| Invoice reconciliation feedback  | Admin must see the connection between processed uploads and invoice-received state   |


---

*This document is a designer onboarding reference synthesised from PRD v1.3. For screen-level navigation detail, see [Sitemap.md](Sitemap.md). For the prototype, open `AUTHEON/autheon-extracted/autheon/project`.*