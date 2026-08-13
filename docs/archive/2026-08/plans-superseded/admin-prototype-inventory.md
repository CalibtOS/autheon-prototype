# Appendix: Admin prototype inventory (signed-off)

**Source agents:** [Prototype admin screen inventory](014cfa63-864b-43bd-94c0-654d17808fec)  
**Authority:** `Autheon/prototype/project/admin.jsx`, `store.js`, `i18n.js`, shell `AdminApp` in `AUTHEON Prototype.html`  
**Use:** ClickUp task descriptions — attach `Prototype ref` = component name below.

## Nav (section ids)

| Section id | Product label (EN) | FE target today | Epic |
|------------|--------------------|-----------------|------|
| `overview` | Jobs | `/jobs` | G |
| `detail` / `new` | Job detail / New-Edit | `/jobs/:id`, create/edit | G |
| `notifications` | Notification feed | `/notifications` | I-2 |
| `drivers` | Service Partners (+ MDR tab) | `/drivers` | H, C |
| `staff` | Staff | `/users` | H-4 |
| `customercenter` | Customer Center | `/customers` + `/addresses` | I-1 |
| `infopoint` | Infopoint | `/infopoint` | I-4 |
| `invoices` | **Tour documents** (center: docs + consolidated) | `/tour-documents` **partial** | B |
| `audit` | Audit log | `/audit-log` | I-3 |
| `features` | Settings | `/settings` | I-5 |

## Must-build panes (production)

| Component | Must-match behaviors | Store / API shape |
|-----------|----------------------|-------------------|
| `Overview` + `RowActionsMenu` | Status tiles/umbrellas; comfort/dense; filters persist; unavailable actions **hidden** | `countsByStatus`, export CSV, duplicate, cancel, delete draft |
| `AdminDetail` + footer | Sections 01–07; draft/publish/assign/reassign/cancel rules; marketplace accepted **not** reassignable | `canAdminEditOrder`, `REASSIGNABLE_STATUSES` |
| `EmptyRunReviewPanel` | Only when empty-run reported/terminal; **exactly** Recognised / Not recognised | `reviewEmptyRun(id, recognised\|not_recognised)` |
| `AdminCancelJobModal` | Admin cancel reasons (**see codes below**); driver message min; cutoff override | `cancelJob` admin actor |
| `AssignDriverDialog` | assign / reassign modes; empty active drivers | `getAssignableDrivers` |
| `JobFinancePanel` | Amounts + paymentStatus + tour-doc review + link to consolidated | accept/reject/correction |
| `InternalNotesPanel` | Admin-only notes | `addInternalNote` |
| `NewOrder` | Vehicle Systemlogik; Save draft / Assign / Publish; validation jump links | form → publish/assign |
| `ServicePartnersCenterPane` | Tabs: partners \| changerequests | deep-link MDR |
| `DriversPane` | Access axes; probation release; stage docs on create | operational/account/invite |
| `ServicePartnerProfileModal` | Tabs: overview, masterdata, **documents**, orders, changerequests, notes, audit | driver-documents APIs |
| `MasterDataRequestsPane` | open/approved/rejected/all; page size 20; approve/reject | one-open-request |
| `TourBillingCenterPane` | Tabs: documents \| **invoices (consolidated)** | billing deep-link |
| `TourBillingPane` | Group by tour; admin multi-upload; review actions | tour docs |
| `ConsolidatedInvoicesPane` | Create from performed tours; mismatch warn; review statuses | `/consolidated-invoices` |
| `CustomerCenterPane` / `CustomersPane` / `AddressesPane` | CRUD; delete blocked if in use | customers + locations |
| `NotificationFeedPane` | All/Unread/Read; severity/source; deep links | Task 33 feed |
| `StaffPane` | Create-only modal; last-admin / self guards | accountAccess |
| `InfopointPane` | Docs + News; show/hide; notify flags | Infopoint admin |
| `AuditPane` | Filters; CSV export; **retention purge** (age-based) | audit APIs |
| `SettingsPane` User + System | Policies, inactivity **policy**, help contacts, upload limits | `app_settings` — **no Prototype tab** |

## Enums (admin truth)

| Domain | Codes |
|--------|-------|
| Empty-run reasons (display) | `not_operational`, `not_roadworthy`, `not_present`, `not_released`, `key_docs_missing`, `other` |
| Empty-run decision | `recognised` \| `not_recognised` |
| **SP cancel** (driver-origin banner) | `appointment_not_kept`, `booked_accidentally`, `org_not_possible`, `other` |
| **Admin cancel** (modal) | `driver_unavailable`, `vehicle_not_available`, `customer_cancelled`, `appointment_not_possible`, `incorrect_order_data`, `vehicle_not_roadworthy`, `other` |
| Access | `enabled` \| `disabled`; invite `pending` \| `failed` \| `accepted` |
| Payment | Invoice Missing / Received / Paid |
| Consolidated status | `in_review`, `correction_required`, `rejected`, `completed` |
| Driver doc categories | `business_registration`, `licence_front`, `licence_back`, `id_front`, `id_back`, `other` |
| Tour doc types | `invoice`, `fuel_receipt`, `toll_receipt`, `delivery_note`, `waiting_time_evidence`, `other_proof`, `other_receipt` |

### Contract watch (ClickUp / BE)

Admin cancel reason set ≠ SP cancel set. FE/BE must keep **two vocabularies**. Do not collapse into SP Storno codes.

`special_case` must **not** appear in admin UI (empty-run path is signed-off).

## DO NOT SHIP

Theme editor; Driver↔Admin switcher; PWA viewport chrome; Settings **Prototype** tab; feature-flag toy UI; **Run now** inactivity sweep button; login demo fill; `?screen=set-password` debug; seed `isNew` cosmetics; hardcoded “A. Bauer”; toast-only password change; in-memory demo calendars as product behavior.

## FE gap summary (for Epic mapping)

| Gap | Epic |
|-----|------|
| Tour Billing 2nd tab consolidated invoices | B |
| SP profile Documents tab | C |
| Notification feed fidelity / deep links | I-2 |
| Admin cancel codes + cutoff UX | G-4 |
| Empty-run panel already wired — fidelity only | G-3 |
| Settings: ship System policies; drop Prototype tab | I-5 |

## Exact clone

Admin registry **A01–A25** + side-by-side protocol: [`exact-screen-clone-gate.md`](./exact-screen-clone-gate.md).  
FE must be a screen-for-screen clone of this inventory (not feature-parity only).

