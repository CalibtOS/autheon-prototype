# AUTHEON — Project Context Pack

> **What this file is:** the "project layer" for meeting analysis. The AI reads it *before* analysing any AUTHEON meeting transcript, so it already knows the product, the people, the vocabulary, what is decided, what is deferred, and what is genuinely still open. It exists so the AI can tell **new** from **already-decided** instead of re-explaining the product every time.
>
> **Source of truth:** `docs/requirements/prd.json` — **PRD v2.0** (2026-07-10).
> **Update rule:** refresh this file only when the PRD version bumps (v2.0 → v2.1). Everything below is a *distilled mirror* of the PRD, not a replacement for it.

---

## 0. How the AI should use this pack

- Treat the reader as someone who **already knows AUTHEON**. Do **not** re-explain what a driver, tour, or booking is.
- Cross-check every point in a transcript against Sections 4–9 below **before** labelling it.
- Never raise an "open question" that Section 8 or Section 9 already answers.
- Map findings to the **Task index (Section 7)** and the **Open questions (Section 6, OQ-1…OQ-18)** by their IDs.

---

## 1. What AUTHEON is (one paragraph — do not re-explain this to the reader)

AUTHEON is a **vehicle-transport / vehicle-relocation dispatch platform (Version 1)**. It replaces a manual, Excel-and-email dispatch process. Admins/dispatchers create **transport orders (tours)** that move a vehicle from a **pickup** location to a separate **delivery** location. Tours reach drivers two ways: the **marketplace** (drivers self-accept published jobs) or **direct assignment** (admin assigns a specific driver). Acceptance is **binding**. Drivers use a **PWA**; admins use a web backend. V1 hands navigation to external map apps (no internal GPS), uses push notifications for drivers (no workflow emails to drivers), and email alerts for admins. The client does **not** want the product named "AUTHEON" in the final UI (display name is configurable).

- **Platform type:** vehicle transport / relocation operations platform
- **Primary users:** Admin / Dispatcher · Driver
- **Core object:** transport order / tour / official transport-order PDF
- **Prototype:** `prototype/project` (single-page HTML/React demo) is the **UI/UX source of truth**; canonical spec is `prd.json`.

---

## 2. Who's who (fix mis-transcribed names using this)

**CalibtOS — the software agency building the platform (internal):**
- **Ferhat Catak** — CEO / dev lead / meeting facilitator. *(Fireflies often mis-hears this as "Fed up".)*
- **Youssef Elkondakly** — QA / analyst / stands in for the requirements engineer. Runs this meeting-analysis process.
- Dev team (internal): **Omar** (senior; built the CI / Copilot security setup), **Mahmoud, Mohamed Yasser, Ismail, Karim, Marawan, Mohamed Ayman**.

**AUTHEON — the client (the vehicle-transport company commissioning the platform):**
- **Taner Özdemir** — client stakeholder.
- **Carolina Offermanns** — client stakeholder.

**Agency / design partners (external):**
- **Till Toenges** — technical / product feasibility input.
- **Felix** — agency side.

**Attribution rule:** statements from Taner or Carolina are **client requirements/preferences**. Statements from Ferhat, Youssef, or the dev team are **internal proposals/decisions**. Statements from Till/Felix are **agency/feasibility input**. Label them accordingly.

**Common transcription fixes:** "Fed up" → **Ferhat** · "Fireplace / Firelights / IFList / Five flies" → **Fireflies** (the transcription tool) · "Calypso / Calyptus" → **CalibtOS** · "Ocean" → likely **AUTHEON** · "SharePoint action" → likely **Share action** (Web Share) · "bwa" → **PWA**. *(Mark as unclear if context does not confirm.)*

---

## 3. Product vocabulary (shared language — use these exact terms)

**The two job flows**
- **Marketplace flow:** Draft → Published → Accepted → Performed.
- **Direct assignment flow:** Draft → Assigned → Performed.
- Published and Assigned are **mutually exclusive** in Phase 1. A Published job must be reverted to **Draft** before it can be reassigned or direct-assigned.

**Operational job statuses:** Draft · Published · Accepted · Assigned · Performed · Cancelled · Special Case.
**Document review statuses:** Missing · Uploaded · Under Review · Accepted · Rejected · Correction Required.
**Settlement states:** Not Started · Pending · Processed · Paid · Needs Clarification · Closed.
**Driver statuses:** Active · Blocked · Inactive · Archived · Soft Deleted.

**Key meanings that meetings keep touching**
- **Performed** = the vehicle transfer is operationally done. It does **not** mean documents/invoices/settlement are complete (those are tracked separately).
- **Report Problem** (driver) has two paths: **Cancel Order** and **Report Order as Not Performable**.
- **Not Performable → Special Case** (needs admin decision). Special Case does **not** auto-cancel the order.
- **Special-case "administrative close"** = mark Performed + settlement Closed. It is **not** the same as cancelling.
- **Acceptance is binding.** Assigned jobs cannot be directly rejected by the driver.
- **Probation acceptance limit** (v1.9, replaces the old per-day quota): a new driver may book up to **N initial jobs (default 3)** and must reach **N Performed jobs** before being **released**; after release there is no further V1 booking limit. It blocks **self-accept only** — admin **direct assignment is exempt** (admin may assign extra jobs even while the driver is on probation). Performed jobs count toward release whether self-accepted or admin-assigned. No rolling daily quota and no driver limit-increase request. Admin may **manually release** a driver from probation. **UI (v2.0):** a probation status/progress card — **not** a limit meter or "request higher limit" action — shown while on probation and **hidden after release**.
- **Driver ID** (v2.0) = **system-assigned, immutable, never reused** (a monotonic sequence; retired/blocked/archived IDs are not reassigned). Assigned automatically at creation, **not** entered by admin. Exact format (prefix/padding/year/start) is client-defined (OQ-16).
- **Time windows** (v2.0) = **same-day per leg** (window start/end on one calendar day; **no cross-midnight**). Pickup and delivery legs may still fall on **different dates**.

---

## 4. DECIDED & IN SCOPE for V1 (label these CONFIRMED, not new)

If a meeting raises any of these, it is **already decided** — cite it and mark **no action** (unless the meeting *changes* it).

**In-scope capabilities**
- Operational order creation with customer + separate pickup/delivery locations; shared address master data with optional save.
- Marketplace + driver PWA for simple A→B tours.
- Binding acceptance and direct assignment with driver picker; reassignment on active tours (Assigned/Accepted/Special Case), audited.
- Report Problem → Cancel Order + Not-Performable special-case flows.
- External map-app navigation handoff. Pull-to-refresh / load-on-open sync.
- Simple driver push notifications + postal-code prefix preferences. Admin email alerts for critical events.
- Information Center / Infopoint (short one-way news + general documents).
- Driver management with Blocked / Inactive / Archived states + access reset. Audit log + status history.
- PDF generation from structured order data. Rollout from zero (no historical Excel migration).
- Admin permanent-delete for **Draft only**. Admin Jobs overview as the primary "New job" entry (no separate sidebar item).
- Driver profile **change-request** workflow (admin queue, one open request per driver).
- Tour-linked document upload on **active** tours (not restricted to post-Performed).
- One-time driver **probation acceptance limit** (configurable initial allowance / Performed release threshold, default 3) with **manual admin release**; admin direct assignment exempt; same-day overlap **confirmation prompt** retained. **UI (v2.0):** probation status card, no limit meter / "request higher limit"; hidden after release.
- **Automatic, immutable, never-reused sequential driver IDs** (v2.0; system-assigned at creation, format client-defined).
- **Same-day per-leg time-window validation** (v2.0; no cross-midnight window; legs may differ in date).
- Admin-attached self-created documents at job creation/editing.
- Admin cancellation with **required driver-facing reason message**; operational cutoff policies in `app_settings`.
- In-PWA **preview** of permitted PDFs/images, with download and (where supported) **share/print** system actions.
- Infopoint **General Documents: separate View / Download actions** where layout allows (v2.0; fallback to download-only or Download-inside-View on constrained mobile layouts).

**Locked defaults worth knowing (from `resolved_defaults`)**
- Auth: **Keycloak** selected (roles: admin, driver). Cancel Order slide requires **min 10-char** explanation. `push_on_direct_assign = false`.
- PDF generated **on acceptance/direct-assignment**, not on publish. Only the active PDF must be visible; regeneration audited.
- **App display name configurable** (default "Transport Portal" until client provides final name).
- Phone-first PWA; iPad best-effort. Audit-log action keys in English; UI localized EN/DE.
- Customer field on create form = **required select from master data** (no free-text).
- Vehicle CSV = **glossary/reference only**, not import data. Vehicle color/photos **not required** in V1.
- 7 cancellation reason codes: `driver_unavailable`, `vehicle_not_available`, `customer_cancelled`, `appointment_not_possible`, `incorrect_order_data`, `vehicle_not_roadworthy`, `other`.

---

## 5. OUT OF SCOPE / FUTURE (label these DEFERRED, not new)

**Explicitly out of V1:** chat/messaging between admin and drivers · GPS/live tracking · internal map module · driver rating/ranking · automated driver-job matching · full finance dashboard / advanced analytics · accounting-system integration · vehicle-condition documentation · historical Excel migration · CSV mass import · complex A→B→A / A→B→C tour chains · rich newsletter editor · full multilingual/legal-copy rollout · external customer-import / PDF recognition · credit-note generation · scanner/AI/OCR document-quality scoring · Partner-Policy content management (V1 deep-links external terms).

**Future scope (roadmap, not V1):** full backend notification centre · full finance dashboard · accounting integration · vehicle-condition protocol · CSV mass import · historical migration · complex tour chains · cross-border country filtering · rich newsletter · **geocoding / lat-long capture** · **sophisticated scheduling (time-span overlap, geolocation, travel-time acceptance blocking)** · credit-note workflow · scanner/AI document validation · vehicle-type icons on marketplace cards (unless separately approved) · explicit "by-latest" scheduling mode (unless client confirms needed) · **service-partner company model with multiple sub-drivers / structured company management** (V1 keeps individual driver profiles; → V2, F-08).

---

## 6. GENUINELY OPEN questions (OQ-1…OQ-18 — match against these; do not re-raise if already answered in §4/§8/§9)

| ID | Open question | From |
|----|---------------|------|
| OQ-1 | Keycloak email settings for invites/resets: sender domain, templates, link expiry, required actions, SMTP owner. | production |
| OQ-2 | Which map/distance API vendor + acceptable ongoing usage budget. | production |
| OQ-3 | Production file retention, encryption at rest, malware scanning, DSGVO handling for uploads. | production |
| OQ-4 | Final production **branding pack**: display name, logo, **exact hex palette**, font, icon rules + legal/UI copy. *Direction advanced 2026-07-10 — minimalist/premium, black/white/grey, restrained purple accent, Montserrat Regular 400; final pack still pending (client → Monday).* | production |
| OQ-5 | Production UI labels for special-case administrative **close** vs **cancel** (avoid ambiguous "Close"). | production |
| OQ-6 | **Granular driver blocking** (block marketplace/accept but still allow doc/invoice corrections on existing tours) vs coarse "Blocked". | 2026-06-29 |
| OQ-7 | Is **zugelassen / nicht zugelassen** (registered / not registered) a required V1 job/vehicle field, or deferred? | 2026-06-29 |
| OQ-8 | Final **manual direct-assignment** policy: when allowed, whether exception-only, and what external proof must be stored. | 2026-06-29 |
| OQ-9 | ✅ **RESOLVED 2026-07-10** (see §8): probation limits **self-accept only**; admin direct assignment is **exempt** (may assign during probation; Performed jobs count toward release regardless of source). | 2026-06-29 |
| OQ-10 | Do marketplace **cards** show pickup/delivery windows, or only dates/regions (full windows in detail)? | 2026-06-25 |
| OQ-11 | Are date + time-window from/to + flexibility warnings enough for V1, or is an explicit **by-latest** mode required? | 2026-06-25 |
| OQ-12 | Are pickup-date and delivery-date filters **independent** ranges or **linked** as one schedule filter? | 2026-06-25 |
| OQ-13 | Final marketplace **sort** labels, order, and defaults. | 2026-06-25 |
| OQ-14 | ⚠️ **CONFLICT** — allow an optional **driver workflow email after booking** (possibly with the order PDF/documents attached), or keep driver workflow email **prohibited** (PWA/push only)? Contradicts the standing no-driver-email rule; unchanged until decided. | post-v1.8 |
| OQ-15 | **Inactive service-partner handling**: after what inactivity period should a driver be warned / contacted / blocked / set inactive / archived, and should it be automatic or admin-reviewed? | post-v1.8 |
| OQ-16 | Exact **automatic driver ID format**: prefix, numeric length, padding, optional year component, starting sequence. | 2026-07-10 |
| OQ-17 | ⚠️ **Report Problem timing/paths** (core V1 risk): for active tours, when is **Cancel Order** allowed vs **Not Performable** required, and does availability change before/after **pickup** and before/after **delivery**? | 2026-07-10 |
| OQ-18 | Final production **domain, legal/market clearance, and hosting** (likely `.com` + Hetzner if approved). | 2026-07-10 |

---

## 7. Task index (map findings to these — cite Task # + title, do not paste task bodies)

| # | Task | # | Task |
|---|------|---|------|
| 1 | Domain Model & Data Foundation | 17 | PDF Generation & Document Automation |
| 2 | Authentication & Access Control | 18 | Information Center / Infopoint |
| 3 | Admin User & Driver Management | 19 | Driver Profile & Notification Settings |
| 4 | Customer & Address Master Data | 20 | Driver Push Notifications & Admin Critical Alerts |
| 5 | Job Creation | 21 | Basic Financial Fields & Finance Scope Control |
| 6 | Publishing & Direct Assignment | 22 | Audit Log & Status History |
| 7 | Driver Marketplace | 23 | Error Handling & UX Feedback |
| 8 | Job Details, Visibility & Navigation | 24 | Exports & Reporting Basics |
| 9 | Job Acceptance | 25 | PWA Platform Requirements |
| 10 | My Jobs | 26 | QA & Automated Validation |
| 11 | Operational Completion | 27 | Tour Documents, Driver Invoices & Billing Reconciliation |
| 12 | Report Problem, Cancellation & Special Case | 28 | Distance Estimation & External Map Handoff |
| 13 | Admin Special Case & Cancellation Resolution | 29 | Rollout & Migration Strategy |
| 14 | Admin Job Cancellation | 30 | Driver Probation Acceptance Limit |
| 15 | Admin Job Overview | 31 | Operational Policies (App Settings) |
| 16 | Admin Job Detail | | |

---

## 8. Recently RESOLVED client feedback (these are ANSWERED — do not re-open)

- Admins **can** create/edit all driver fields (status, block, archive, access reset).
- Frontend is **phone-first PWA**, best-effort on tablets (not a separate tablet build).
- Audit-log action keys **English**; UI localized **EN/DE**.
- Product name **AUTHEON must not appear** in the UI; display name configurable.
- Document upload available **before completion as well as after Performed**.
- Admin car photo **not required**; admin may attach self-created docs at creation.
- Driver timeslot blocking → V1 uses a **one-time probation limit** (default 3 Performed jobs to release), not a per-day quota and not geo/time blocking. *(Changed from the earlier daily-limit model in v1.9.)*
- **Admin direct assignment is exempt from probation** — admin may assign extra jobs even while a driver is on probation; Performed jobs count toward release regardless of source (OQ-9, 2026-07-10).
- Permitted documents **preview in-PWA** (preferred over a separate browser tab), with download + **share/print** where the device supports it (F-03).
- Driver-facing probation UI = **probation status card** (no limit meter, no "request higher limit"), **hidden after release** (v2.0).
- Driver IDs are **system-assigned, immutable, never reused** — assigned automatically at creation, not entered by admin (v2.0; exact format still OQ-16).
- Tour **time windows are same-day per leg** (no cross-midnight); pickup/delivery legs may still be on different dates (v2.0).
- Infopoint **General Documents** show **separate View / Download** actions where layout allows, with a download-only / Download-inside-View fallback (v2.0).
- Admin may attach **additional documents** at job creation/editing.
- Manual **lat/long** entry → **not V1** (future geocoding).
- Admin cancel of an assigned tour → **requires reason code + driver-facing message**.
- Cancel/schedule-change **cutoff window** → yes, via `app_settings operational.policies` (default 1 h before pickup).
- **Credit-note** generation → **not V1** (future).
- **Scanner / AI document-quality** checks → **not V1** (malware scan + manual review only).
- Order notes do **not** auto-inherit customer/address master-data notes.
- German **postal-prefix** filtering is **inclusive** (prefix 4 matches 40, 41…).
- Partner Policy / driver terms → V1 **deep-links external** static content.

---

## 9. Key global business rules (the ones meetings most often touch)

- One job = **either** marketplace **or** direct-assignment flow (not both).
- Admin may revert **Published → Draft** directly (removes from marketplace, enables edit/re-publish/assign).
- Admin may **permanently delete Draft only**; other statuses use cancel/revert/special-case.
- Driver **acceptance is atomic** — only one driver can accept a Published job.
- Before acceptance, marketplace shows **reduced data** (rough region, distance, dates/windows, vehicle type, axle type, offer/price). Full detail only after acceptance/assignment.
- After acceptance, a driver **cannot casually return** a tour — must use **Report Problem** (⚠️ exact Cancel Order vs Not Performable **timing/availability** across pickup/delivery is **under decision** — see OQ-17).
- **Not Performable → Special Case**; admin decides continue / republish / administrative-close / cancel.
- **Performed ≠ documents/settlement complete.** Document review + settlement are separate state machines.
- Drivers get **no workflow emails**; PWA + push only (⚠️ an optional post-booking driver email is **under decision** — see OQ-14; rule unchanged until then). Admins get **email alerts** for critical events.
- System must **preserve manual admin control** for edge cases — never hard-block operations just because a rare flow wasn't predicted.
- V1 = **simple A→B only**; chains represented as separate orders.
- Cancellation records **actor** (driver / admin / customer), reason code, optional text, timestamp, user.
- Every operational transition writes **status history** (prev, new, time, user, comment, evidence ref).

---

## 10. Known risks (connect findings to these when relevant)

Legal wording in the transport-order PDF needs legal review · atomic acceptance must be transaction-safe (double-assignment risk) · rigid software can block rare edge cases (mitigate with Special Case + admin override) · auto-saving one-time addresses bloats master data · document rejection creates a correction loop (make it visible) · finance dashboard is scope-creep risk (keep out of base V1) · PWA push differs Android vs iOS · audit log can bury urgent events (use email alerts) · map/distance API cost + route ambiguity (cache + manual override) · vehicle-condition docs = separate large project (future) · rollout hard for less tech-friendly drivers (start with tech-friendly + keep fallback) · admin-backend state changes must go through controlled business logic · legacy CSV may have errors (glossary only) · **branding unresolved** (client rejects "AUTHEON" as the UI name).
