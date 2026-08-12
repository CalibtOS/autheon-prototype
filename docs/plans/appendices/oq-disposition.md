# Open-question disposition (planning-complete)

**Rule:** Engineering must **not invent** answers. Each OQ is `Resolved` (client answer recorded) or `Deferred` with **named wave/AC impact**.  
**Source:** `prd.json` → `production_open_questions` (37).  
**Status date:** 2026-08-11 — planning disposition only.

| ID | Topic (short) | Disposition | Blocks Done on | Interim build rule |
|----|---------------|-------------|----------------|--------------------|
| #1 | T&C / cancellation-conditions URL | **Resolved 2026-08-12** | — | German hybrid: in-app Fahrerbedingungen sheet on accept/cancel; when legal supplies it, `VITE_DRIVER_TERMS_URL` opens hosted AGB (HTML/PDF). Do **not** invent the URL or legal text. Infopoint keeps Fahrerbedingungen. |
| #2 | Keycloak invite/reset SMTP | **Resolved 2026-08-12** | — | **AUTHEON mail for all** emails: invite, reset, booked/assigned PDF, admin alerts. Do **not** send via Keycloak SMTP. From-address / templates / link expiry = ops env (`SMTP_*`), not invented. |
| #3 | Map/distance vendor + budget | **Deferred** | E-4 paid SDK; G distance recalc extras | Use OS/maps URL handoff like proto |
| #4 | Retention / encryption / malware / DSGVO | **Deferred** | I-3 purge semantics; B/C upload security claims | Use existing upload-asset pipeline; no invented scanners |
| #5 | Production branding package | **Deferred** | Cosmetics only | Keep prototype tokens until brand pack |
| #6 | Exact driver ID format | **Deferred** | H create display format | BE generates; UI shows whatever API returns |
| #7 | Cancel vs empty-run phase gates (active tours) | **Deferred** | G-4 / D-1 edge gates | Follow prototype `canServicePartnerReport` until client confirms |
| #8 | Production domain / hosting | **Deferred** | T29 ops | Out of FE fidelity waves |
| #9 | Marketplace restriction model | **Resolved** | — | Granular axes — do not reopen |
| #10 | Vehicle Systemlogik | **Resolved** (superseded by client PDF) | — | Use `vehicle_domain_v2` |
| #11 | Manual direct-assignment policy | **Deferred** | G-7 edge | Implement proto assign/reassign; contested policy edges wait |
| #12 | Driver booking email conflict | **Resolved 2026-08-12** | — | Drivers **do** get workflow email on marketplace **booked** and admin **assigned**; email **must attach the transport-order PDF**. Push/in-app stay. Mail via AUTHEON SMTP (OQ #2). PDF attach blocked on G-6 / #22–28. |
| #13 | Marketplace cards: windows vs dates | **Deferred** | E-1 card meta rows | Match current prototype card anatomy |
| #14 | By-latest scheduling vs windows | **Deferred** | G-2 schedule fields contested | Match current proto form |
| #15 | Independent vs linked date filters | **Deferred** | E-1 filter independence | Match current proto FilterSheet |
| #16 | Marketplace sort labels/defaults | **Deferred** | E-1 sort defaults | Match current proto SortSelect |
| #17 | Server re-impl of admin proto rules | **Deferred** | J-2 only if FE cannot adapt | Prefer FE to live BE; log gaps in J-1 |
| #18 | Real Keycloak/session for drivers | **Deferred** | F-5 production cutover | Already Keycloak-oriented; no demo OTP UI |
| #19 | Durable server-side audit | **Deferred** | I-3 if BE incomplete | Use live audit APIs; no in-memory FE audit |
| #20 | Real Infopoint/push transport | **Deferred** | F-3 / I-4 delivery guarantees | Wire APIs; push ops TBD |
| #21 | EXPECTED_TOUR_DOC_TYPES / missing rules | **Deferred** | B-7 expected-types rows | Do not invent beyond proto/PRD min types |
| #22 | PDF distance in/out of PDF | **Deferred** | **G-6 / T17 Done** | Do not invent; PDF content blocked |
| #23 | PDF relevant-change fields | **Deferred** | **G-6 Done** | Blocked |
| #24 | PDF mandatory-field failure UX | **Deferred** | **G-6 Done** | Blocked |
| #25 | PDF historical-version visibility | **Deferred** | **G-6 Done** | Blocked |
| #26 | PDF optional vs mandatory fields | **Deferred** | **G-6 Done** | Blocked |
| #27 | PDF legal/branding sign-off | **Deferred** | **G-6 Done** | Blocked |
| #28 | PDF font assets licensing | **Deferred** | **G-6 Done** | Blocked |
| #29 | Dispatch feed spec provenance | **Deferred** | I-2 contested rows | Match prototype feed UI |
| #30 | Feed severity/mark-read BE fields | **Deferred** | F-3 / I-2 / J8 extras | Use fields BE exposes; no invented columns |
| #31 | 90-day inactivity “activity” definition | **Deferred** | Feed §6 rule | No invented login event; Keycloak traffic TBD |
| #32 | Event-name matrix vs code drift | **Deferred** | F-3 / I-2 mapping | Align aliases; do not invent new types |
| #33 | Notification category taxonomy | **Resolved** | — | No category chips |
| #34 | Profile deep-link destination | **Resolved** | — | Closed for MDR |
| #35 | Driver PWA browser history / pushState | **Deferred** | Optional nav polish | Ship in-app Back; no invented history stack |
| #36 | No probation notification event | **Deferred** | H-5/E-7 notif side | Sheet ships; do not invent push event |
| #37 | `job_assigned` / `document_correction_required` type-map | **Deferred** | F-3 mapping | Follow BE/shared enums; flag gaps in J-1 |

## Summary

| State | Count |
|-------|------:|
| Resolved | 7 (#1, #2, #9, #10, #12, #33, #34) |
| Deferred + impact named | 30 |
| Invented by eng | **0** |

## Wave impact (planning)

| Wave | Can start without client OQ answers? | Hard blocks inside wave |
|------|--------------------------------------|-------------------------|
| 0 A / 0.5 L / N | **Yes** | — |
| 1 B+C | **Yes** (interim rules above) | #21 soft on expected types |
| 2 D + G-3/4 | **Yes** | #7 still interim for cancel vs empty-run gates |
| 3–4 E–I | **Yes** matching current proto | Contested E-1 rows / feed extras / G-6 |
| G-6 PDF | **No** for Done | **#22–28** must Resolve or waive |
| K release | Journeys except PDF content | PDF journey content blocked |

*This appendix is the planning-complete disposition. ClickUp “Needs decision” cards should mirror these rows (K-5).*
