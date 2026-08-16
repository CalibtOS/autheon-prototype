# Open-question disposition (planning-complete)

**Rule:** Engineering must **not invent** answers. Each OQ is `Resolved` (client answer recorded) or `Deferred` with **named wave/AC impact**.  
**Source:** `prd.json` → `production_open_questions` (37).  
**Status date:** 2026-08-16 — **all 37 Resolved**; ClickUp OQ cards mirrored (apply frozen).

| ID | Topic (short) | Disposition | Blocks Done on | Interim build rule |
|----|---------------|-------------|----------------|--------------------|
| #1 | T&C / cancellation-conditions URL | **Resolved 2026-08-12** | — | German hybrid: in-app Fahrerbedingungen sheet on accept/cancel; when legal supplies it, `VITE_DRIVER_TERMS_URL` opens hosted AGB (HTML/PDF). Do **not** invent the URL or legal text. Infopoint keeps Fahrerbedingungen. |
| #2 | Keycloak invite/reset SMTP | **Resolved 2026-08-12** | — | **AUTHEON mail for all** emails: invite, reset, booked/assigned PDF, admin alerts. Do **not** send via Keycloak SMTP. From-address / templates / link expiry = ops env (`SMTP_*`), not invented. |
| #3 | Map/distance vendor + budget | **Resolved 2026-08-14** | — | **E-4 maps CTA:** V1 = proto-style **Google Maps search URL** handoff only — no paid in-app maps SDK. **Distance km:** server-owned via existing BE routing adapter (GraphHopper when enabled); FE never calls a routing vendor. Paid FE SDK / alternate map product = out of scope until a later client decision. |
| #4 | Retention / encryption / malware / DSGVO | **Resolved 2026-08-14** | — | V1 = **pipeline-as-is**: use existing BE upload-asset pipeline (storage + configured retention/encryption). **No** malware-scanner product claim and **no** invented DSGVO/purge policy text in V1 Done. Soft purge/DSGVO wording may land later via ops/legal without blocking upload clone. |
| #5 | Production branding package | **Resolved 2026-08-14** | — | V1 = **proto-tokens**: ship signed-off prototype display name/logo/palette/font/icon rules until Corporate Design pack lands. Brand swap = later cosmetics pass. Does **not** invent final hex/logo/legal copy. PDF legal/branding for G-6 follows **#27**. |
| #6 | Exact driver ID format | **Resolved 2026-08-14** | — | V1 = **be-as-is**: `AU-41-` + 4-digit zero-padded monotonic sequence (`AU-41-0001`…). Matches BE `DriverCodeAssignmentService`. Immutable after create; never reused. FE displays API `driverCode` only — do not invent another scheme. |
| #7 | Cancel vs empty-run phase gates (active tours) | **Resolved 2026-08-14** | — | V1 = signed-off proto: Cancel + Empty-run only when status `assigned` \| `accepted` (`canServicePartnerReport`). No pickup/delivery phase gates in FE/BE. Driver chooses path inside Report Problem. Hidden when terminal or `empty_run_reported`. |
| #8 | Production domain / hosting | **Resolved 2026-08-14** | — | V1 = **ops-later**: FE/BE prototype clone is **unblocked**. Final domain, legal/market clearance, and hosting provider stay ops/deploy env (`VITE_*` / hosting config) — do **not** invent a public hostname in product copy. **T29 Done** waits on ops pack. |
| #9 | Marketplace restriction model | **Resolved** | — | Granular axes — do not reopen |
| #10 | Vehicle Systemlogik | **Resolved** (superseded by client PDF) | — | Use `vehicle_domain_v2` |
| #11 | Manual direct-assignment policy | **Resolved 2026-08-14** | — | V1 = signed-off proto: admin **assign + reassign** via `AssignDriverDialog` with driver picker + **confirmation note**. Not exception-only. Do **not** invent phone/email proof vault or extra policy gates. |
| #12 | Driver booking email conflict | **Resolved 2026-08-12** | — | Drivers **do** get workflow email on marketplace **booked** and admin **assigned**; email **must attach the transport-order PDF**. Push/in-app stay. Mail via AUTHEON SMTP (OQ #2). PDF attach Done gated on G-6 generate path (#22–28 Resolved). |
| #13 | Marketplace cards: windows vs dates | **Resolved 2026-08-14** | — | List cards show pickup/delivery **date · window** (or Flexible) per proto `legWhen`. Full schedule remains in detail. Not dates/regions-only on cards. |
| #14 | By-latest scheduling vs windows | **Resolved 2026-08-14** | — | V1 scheduling = **date + time-window from/to + flexibility** only (proto form). No explicit by-latest date/time mode. |
| #15 | Independent vs linked date filters | **Resolved 2026-08-14** | — | Marketplace FilterSheet uses **one linked schedule filter** (`from` / `to` + presets) — not independent pickup vs delivery date ranges. Match proto. |
| #16 | Marketplace sort labels/defaults | **Resolved 2026-08-14** | — | Proto SortSelect: `date_desc` · `date_asc` · `price_desc` · `price_asc` · `dist_desc` · `dist_asc`; default **`date_desc`**; labels from i18n. |
| #17 | Server re-impl of admin proto rules | **Resolved 2026-08-14** | — | V1 = **j1-gap-gated**: FE adapts to live BE. BE re-impl of a proto FE validation gate only when **J-1** marks MISSING/WRONG → then **J-2**. Do **not** invent a blanket backlog to port every 15-phase `AuthStore` helper. J-2/J-3 stay not-started until J-1 confirms a gap. |
| #18 | Real Keycloak/session for drivers | **Resolved 2026-08-14** | — | V1 = **keycloak-as-planned** (Task 2): Keycloak login events populate `driver.lastLoginAt` / `admin.lastLoginAt`. Account **Active** only after activation or first successful login — against real login events. No demo OTP UI; no fake last-login. **F-5 Done** = wired to that. |
| #19 | Durable server-side audit | **Resolved 2026-08-14** | — | V1 = **live-audit-apis**: I-3 Done wires to existing durable BE audit APIs. **No** in-memory FE audit trail. If J-1 finds durability MISSING/WRONG → J-2; do not invent a second audit store. |
| #20 | Real Infopoint/push transport | **Resolved 2026-08-14** | — | V1 = **as-built channels**: **in-app + email + Web Push (VAPID)** wired to `notification_channels_matrix` via existing BE (`PUSH_ENABLED` / `WebPushSenderAdapter`). Do **not** invent FCM/APNs unless native store apps are later scoped. F-3 / I-4 Done = those three channels working — no separate “push ops TBD” gate. |
| #21 | EXPECTED_TOUR_DOC_TYPES / missing rules | **Resolved 2026-08-14** | — | V1 = **fixed-pair**: admin “Missing” checklist = **`delivery_note` + `invoice` only** (proto). Full upload catalog stays (`min_document_types_v1` / BE `DocumentType`). No per-customer or per-transport-type expected-list config in V1. |
| #22 | PDF distance in/out of PDF | **Resolved 2026-08-14** | — | Tech Spec + proto win: **exclude** PWA `distanceKm` from transport-order PDF payload and `PDF_RELEVANT_FIELDS`. Distance remains PWA-only. Reversible later if client reverses. |
| #23 | PDF relevant-change fields | **Resolved 2026-08-14** | — | Keep implemented set: only template-rendered fields (~34 keys) mint a new immutable PDF + partner notify. Excluded: `distanceKm`, expenses, internal notes, `category`, `electricVehicle`, `readyToDrive`, `requiresRedLicencePlates` — these do **not** force a new legal version. |
| #24 | PDF mandatory-field failure UX | **Resolved 2026-08-14** | — | After binding booking saved: keep booking; publish no broken PDF; keep previous active version if any; audit `pdf_generation_failed`; admin sees generation-failed error. **V1 adds auto-retry** (not in proto): up to **3** attempts with short backoff, then same fail path. No durable out-of-process job queue beyond those in-request retries. |
| #25 | PDF historical-version visibility | **Resolved 2026-08-14** | — | Driver/SP sees **active** transport-order PDF only. Earlier versions visible on **admin/audit** surface only (proto). |
| #26 | PDF optional vs mandatory fields | **Resolved 2026-08-14** | — | SP house number + order-creator telephone stay **optional** for V1. PDF collapses cleanly when missing. Do **not** add new mandatory validation on partner/admin profile forms for these. |
| #27 | PDF legal/branding sign-off | **Resolved 2026-08-14** · **Amended 2026-08-16** | — | V1 PDF content = **client pack on G-6b** (ClickUp `869ebyppk` / client-req `869ebf84g` Drive templates + Monday AC). Ismail implements PKW/LKW fill from live job data; layout/legal/footer from **client-supplied** artefacts — do **not** invent copy. Proto / stub placeholders only for fields still missing from the pack. App chrome still **#5 proto-tokens**. Does **not** block G-6 FE Done; G-6b owns template fidelity. |
| #28 | PDF font assets licensing | **Resolved 2026-08-14** | — | V1 = **pdfkit-defaults**: production generate uses the **existing BE PdfKit built-in fonts** (`LocalTransportOrderPdfGeneratorAdapter`) — no Montserrat vendoring, no Google Fonts / external host at render, no new font pipeline. Exact Montserrat embed = later polish when worth the BE change. **Does not block G-6 Done.** |
| #29 | Dispatch feed spec provenance | **Resolved 2026-08-14** | — | `docs/requirements/dispatch-notification-feed-spec.md` (reconstruction) is **binding** for admin feed (Task 33 / I-2) until a verbatim original replaces it. Build I-2 against that doc + proto UI; do not invent beyond those two. |
| #30 | Feed severity/mark-read BE fields | **Resolved 2026-08-14** | — | **BE required** before admin Open/Processed clone: add `severity`, `status`, `processedAt`, `processedBy` on UserNotification (or equivalent) + **mark-processed** endpoint. FE I-2 drives proto behaviour only after BE lands. Ismail owns BE; Karim owns FE chrome. Log in J-1 as PLANNED if not yet in BE. |
| #31 | 90-day inactivity “activity” definition | **Resolved 2026-08-14** | — | Activity = **last authenticated API request** → `users.last_activity_at` (write-throttled), as already implemented (`DriverActivityInterceptor` + inactivity sweep). **Not** Keycloak login events; **not** a dedicated heartbeat endpoint. Feed §6 / dormancy use that clock. |
| #32 | Event-name matrix vs code drift | **Resolved 2026-08-14** | — | **Code / `@shared` event names win.** Align `notification_channels_matrix` + FE maps to emitted BE names (e.g. `order_cancelled_by_sp`, `tour_document_reuploaded`). Aliases only if needed for transition. Do not invent new event types. Flag leftovers in J-1. |
| #33 | Notification category taxonomy | **Resolved** | — | No category chips |
| #34 | Profile deep-link destination | **Resolved** | — | Closed for MDR |
| #35 | Driver PWA browser history / pushState | **Resolved 2026-08-14** | — | V1 Done = **in-app Back** only (match proto chrome). Browser `pushState`/`popstate` history wiring is **out of scope** for V1 — do not invent a history stack. Optional polish later. |
| #36 | No probation notification event | **Resolved 2026-08-14** | — | V1 = **profile-card-only**: probation release/status reach the driver via Profile probation card + E-7 limit sheet only. **No** push/in-app probation notification event, matrix row, or i18n copy. Do not invent. Optional later if client supplies type/channels/copy. |
| #37 | `job_assigned` / `document_correction_required` type-map | **Resolved 2026-08-14** | — | Production notification-type registry **must** cover every channel-matrix event (incl. `job_assigned`, `document_correction_required`) with correct deep-link + i18n. Missing type **fails loudly** — no silent degrade to untyped/plain card. Aligns with #32 code-wins. |

## Summary

| State | Count |
|-------|------:|
| Resolved | **37** (#1–37) |
| Deferred + impact named | **0** |
| Invented by eng | **0** |

## Wave impact (planning)

| Wave | Can start without client OQ answers? | Hard blocks inside wave |
|------|--------------------------------------|-------------------------|
| 0 A / 0.5 L / N | **Yes** | — |
| 1 B+C | **Yes** | #21 Resolved — Missing = delivery_note + invoice |
| 2 D + G-3/4 | **Yes** | #7 Resolved — proto status gates only |
| 3–4 E–I | **Yes** matching current proto | Contested E-1 rows / feed extras / G-6 |
| G-6 PDF | **Yes** — #22–28 Resolved | FE = **G-6** (Omar); BE templates = **G-6b** (Ismail, client pack); fonts = #28 PdfKit defaults unless PR embeds Montserrat |
| K release | Journeys unblocked on OQ side | Build G-6 / F-7 PDF attach against Resolved rules |

*This appendix is the planning-complete disposition. ClickUp OQ cards already mirror these rows.*

---

## How the next OQ answer lands (one at a time)

Do this **before** asking the next question. Engineering still must not invent.

1. Set this table: `Disposition` → **Resolved** + date + the rule (replace the interim build rule).
2. If it is a product rule, add/update `prd.json` → `resolved_defaults` (same words).
3. Update the **Blocks Done on** tasks: unblock AC rows, or keep blocked if the answer still gates them.
4. ClickUp: OQ card → `completed`; comment on the named build cards (when API allows).
5. Stop. Do not start coding a different interpretation than the recorded rule.

**All 37 OQs Resolved** (2026-08-14). No Deferred rows. G-6 / F-7 PDF attach are unblocked on the open-question side — implement against the recorded rules.

### Recommended answer order (highest unblock)

| Next | Why |
|------|-----|
| — | None — disposition complete |

Skip / “I don’t know” would keep a row **Deferred**; none remain.
