# Epics N / D / B / C — Binary acceptance criteria (expanded)

**Authority:** prototype wins → PRD v2.38 → DBML/BE.  
**Binding codes:** cancel = `SpCancellationReason`; empty-run = `EmptyRunReason`. Explanation **MIN 30**; evidence **empty-run only ≤5**; cancel = **no** evidence UI.  
**CI statuses:** `in_review` | `correction_required` | `rejected` | `completed`.  
**SP docs (T34 v2.38):** multiple active docs per category; **no** `category_taken`.  
**Axis V:** D14/D15 (Report Problem), D13 (My Jobs), D17/D19 (upload/RemoveDoc), A21–A23 (Tour Billing), A15/A16 (SP profile/Documents).  
**Template:** happy path · empty/error/validation · Axis M · authz negative · EN+DE · journey · OQ Deferred+impact (no invented client answers).  
**Card body:** Goal · Authority · Acceptance · DoD on every N/D/B/C card ([`clickup-apply.md`](../clickup-apply.md)).

Pass/fail only. ☐ = unchecked.

---

# Epic N — Error handling & dialog standard (PRD T23)

**PRD:** T23 (+ T26 dialog samples)  
**Prototype:** `DriverUI.Dialog` / Confirm / toast; `resolved_defaults.dialog_standard_v1`  
**Axis V:** anti-pattern “native `alert`/`confirm`” = FAIL; shared chrome across admin+driver  
**Axis M:** `resolved_defaults.dialog_standard_v1`  
**Depends on:** none (Wave 0.5∥A) · **Blocks:** “done” claims for any surface using dialogs  
**Journey:** cross-cutting (all critical paths that confirm/fail)

### Shared N gates (apply to N-2…N-5)

| # | AC | Pass? |
|---|----|-------|
| N.G1 | Shared primitives match `dialog_standard_v1`: centered title, left-aligned content, Cancel\|Primary action grid, 44px min action height | ☐ |
| N.G2 | Bottom sheets remain separate component (share action grammar only) | ☐ |
| N.G3 | Warning/destructive tones use 52px status disc; success uses `success_mark_v1` (discless) | ☐ |
| N.G4 | EN+DE strings for dialog titles/bodies/actions from prototype `i18n.js` (no raw keys) | ☐ |
| N.G5 | Authz/API failures never use native dialogs; mapped to shared toast/banner/inline | ☐ |

---

## N-1 — Inventory FE alert/confirm/toast usage

**Goal:** Complete list of native dialog call sites so N-3 can migrate them.  
**Authority:** PRD T23 · `apps/web` + admin.  
**Owner:** Yasser.  
**DoD:** Inventory attached on the card; every site classified.

| # | AC | Pass? |
|---|----|-------|
| N-1.1 | Inventory lists every `window.alert` / `window.confirm` / `prompt` call site in `apps/web` + `apps/admin` (path + caller) | ☐ |
| N-1.2 | Inventory classifies each site: Confirm / Error toast / Inline field / Banner / N/A (test-only) | ☐ |
| N-1.3 | Inventory marks product-path vs test/dev-only; zero product-path sites left unmarked | ☐ |
| N-1.4 | Output attached to ClickUp N-1; used as migration checklist for N-3 | ☐ |

---

## N-2 — Shared Dialog / Confirm / toast primitives 1:1 proto DriverUI

| # | AC | Pass? |
|---|----|-------|
| N-2.1 | Happy: `Dialog` widths 480/560/720; panel `var(--r-4)` + 24px pad; scrollable `.dialog-content`; actions never clipped | ☐ |
| N-2.2 | Happy: Confirm uses Cancel \| Primary grid (minmax 0,1fr / 1.6fr), 12px gap | ☐ |
| N-2.3 | Empty: Dialog with no description still centers title; no empty icon disc for non-status dialogs | ☐ |
| N-2.4 | Error: toast/error primitive shows recoverable message + optional retry affordance where proto has it | ☐ |
| N-2.5 | Authz negative: unauthenticated call does not open privileged confirm; redirects/login gate unchanged | ☐ |
| N-2.6 | EN+DE: shared action labels (`cancel`, `confirm`, `close`, toast dismiss) resolve in both locales | ☐ |
| N-2.7 | Axis V: side-by-side vs `driver-ui.jsx` Dialog/Confirm — PASS screenshot pair | ☐ |

---

## N-3 — Migrate admin+driver off native alert/confirm

| # | AC | Pass? |
|---|----|-------|
| N-3.1 | Happy: every N-1 product-path confirm uses shared Confirm/Dialog | ☐ |
| N-3.2 | Error: failed mutations show shared toast/banner (not `alert`) | ☐ |
| N-3.3 | Validation: form blocks still use inline field errors (N-4), not native dialogs | ☐ |
| N-3.4 | Authz negative: 401/403 paths use shared error UX; no `alert(error.message)` | ☐ |
| N-3.5 | Grep gate: zero `window.alert`/`confirm`/`prompt` in product source (tests may mock) | ☐ |
| N-3.6 | EN+DE: migrated strings keep both locales; no EN-only leftovers on migrated sites | ☐ |
| N-3.7 | Journey: sample accept / cancel / CI review / SP reject confirms all use shared primitives | ☐ |

---

## N-4 — Error banner / inline field error patterns

| # | AC | Pass? |
|---|----|-------|
| N-4.1 | Happy: T23 already-taken / access-denied / probation-limit / casual-return→Report Problem surfaces use shared patterns (not ad-hoc) | ☐ |
| N-4.2 | Empty: empty list/error-empty states use prototype empty copy (not blank crash) | ☐ |
| N-4.3 | Validation: admin form invalid fields identify field + message; date/time conscious-confirm where rules allow | ☐ |
| N-4.4 | Error: rejected document shows correction-needed + rejection reason to driver | ☐ |
| N-4.5 | Authz negative: `operationalAccess=disabled` marketplace actions show eligibility message (T23) | ☐ |
| N-4.6 | EN+DE: T23 user-visible error strings present in both locales | ☐ |
| N-4.7 | Axis M: patterns documented against `dialog_standard_v1` + T23 AC list | ☐ |

---

## N-5 — QA checklist for dialog standard (T26 samples)

| # | AC | Pass? |
|---|----|-------|
| N-5.1 | Checklist samples ≥1 Confirm, ≥1 destructive Confirm, ≥1 toast, ≥1 inline validation, ≥1 banner per surface (admin+driver) | ☐ |
| N-5.2 | Axis V anti-pattern row: native alert/confirm = FAIL verified absent | ☐ |
| N-5.3 | EN+DE spot-check on sampled dialogs (title + primary action) | ☐ |
| N-5.4 | Authz negative sample: forbidden action → shared error, no native dialog | ☐ |
| N-5.5 | Evidence: Proto \| FE screenshot pairs attached for sampled dialogs | ☐ |

### Epic N — OQ blockers

| OQ | Disposition | Impact on N |
|----|-------------|-------------|
| #5 Production branding | **Deferred** | Token/brand chrome may shift; do not invent brand palette — keep proto tokens until client decides |
| #1 T&C link target | **Resolved 2026-08-12** | Use `DriverTermsDisclosure` (in-app sheet; hosted URL only if `VITE_DRIVER_TERMS_URL` set). N does not invent URL |

---

# Epic D — Driver Storno & job lifecycle fidelity

**PRD:** T12 (+ T13 review via G-3; T26 Storno tests)  
**Prototype:** `ReportProblemSheet`, `PendingNotice`, `MyJobs` buckets, upload evidence stack  
**Depends on:** Epic A (codes) · prefers Epic L chrome stable  
**Axis V:** **D14** `ReportProblemSheet`, **D15** `PendingNotice`, **D13** My Jobs, **D17** upload stack (evidence), **D19** if remove overlaps B-10  
**Axis M:** `client_status_mapping`, `driver_visibility_matrix` (locked fields on cancelled/empty-run), `notification_channels_matrix` (Storno events — FE display only here)  
**Journey:** Critical path #2 cancel · #3 empty-run → admin recognise/not-recognise  
**Enums:** `SpCancellationReason` = `appointment_not_kept` \| `booked_accidentally` \| `org_not_possible` \| `other`; `EmptyRunReason` = `not_operational` \| `not_roadworthy` \| `not_present` \| `not_released` \| `key_docs_missing` \| `other`

---

## D-1 — Report problem UX parity (copy, MIN 30, evidence)

| # | AC | Pass? |
|---|----|-------|
| D-1.1 | Happy cancel: two-path sheet; Cancel uses 4 `SpCancellationReason` radios; default `appointment_not_kept`; slide disabled until `trim(explanation).length >= 30`; char counter; binding warning + T&C link; POST → `cancelled_by_sp` | ☐ |
| D-1.2 | Happy empty-run: 6 `EmptyRunReason`; default `not_operational`; MIN 30 description; optional evidence ≤5; slide → `empty_run_reported`; **no** auto-cancel | ☐ |
| D-1.3 | Empty: cancel path has **zero** evidence controls; empty-run with 0 files still submits | ☐ |
| D-1.4 | Validation: <30 chars keeps slide disabled; >5 evidence shows proto too-many; oversized files refused with proto copy | ☐ |
| D-1.5 | Error: BE 400 on legacy codes; network fail → shared toast (Epic N), sheet recoverable | ☐ |
| D-1.6 | Authz negative: other driver’s job / not booked / terminal / pending empty-run → ⚠ entry hidden or BE 403; FE matches `canServicePartnerReport` | ☐ |
| D-1.7 | EN+DE: reason labels + warnings match `i18n.js` (`reportProblem*`, `emptyRunReason*`); no raw machine ids | ☐ |
| D-1.8 | Axis V **D14/D15**: after submit, `PendingNotice` chrome/copy matches proto; screenshots PASS | ☐ |
| D-1.9 | Journey link: feeds admin empty-run review (G-3) and My Jobs buckets (D-2) | ☐ |

---

## D-2 — My Jobs umbrella (D13)

**Rule:** Do **not** mark D-2 Done until **D-2a…D-2f** are all Done. Depends on Epic A + L-4 chrome.

| # | AC | Pass? |
|---|----|-------|
| D-2.0 | Umbrella: every child D-2a…D-2f Done; Axis V **D13** PASS | ☐ |

### D-2a — Bucket membership

| # | AC | Pass? |
|---|----|-------|
| D-2a.1 | Four buckets match proto labels (Active, Performed, Cancelled, Empty-run review / Review) | ☐ |
| D-2a.2 | `cancelled_by_sp` / `cancelled_by_autheon` → Cancelled; `empty_run_reported` → Empty-run review; terminals recognised/not-recognised per proto | ☐ |
| D-2a.3 | Authz: driver never sees another partner’s jobs | ☐ |
| D-2a.4 | Journey: post-Storno job lands correct bucket after agreed invalidate | ☐ |

### D-2b — Control band below shared header

| # | AC | Pass? |
|---|----|-------|
| D-2b.1 | Search / sort / pills sit **below** shared header (L-1/L-4) — never in header | ☐ |
| D-2b.2 | Pill ↔ page sync; EN+DE captions | ☐ |

### D-2c — My-jobs JobCard

| # | AC | Pass? |
|---|----|-------|
| D-2c.1 | Card shows tour# + status chip (`client_status_mapping`); **opposite** of marketplace card (marketplace has no tour#) | ☐ |
| D-2c.2 | Assigned banner + correction chip per proto when applicable | ☐ |

### D-2d — Empty / search-miss / soft-cap / loading

| # | AC | Pass? |
|---|----|-------|
| D-2d.1 | Per-bucket empty copy EN+DE matches proto | ☐ |
| D-2d.2 | Search-miss + soft-cap + skeleton/loading match proto; fetch fail → shared error + retry | ☐ |

### D-2e — SwipeViews axis-lock + pill sync

| # | AC | Pass? |
|---|----|-------|
| D-2e.1 | Horizontal swipe changes bucket; vertical scroll preserved (axis lock) | ☐ |
| D-2e.2 | Swipe updates pills; pills update page | ☐ |

### D-2f — D13 screenshot sign-off

| # | AC | Pass? |
|---|----|-------|
| D-2f.1 | Proto\|FE screenshots: 4 buckets × empty + populated | ☐ |
| D-2f.2 | Depends D-2a…e green | ☐ |

---

## D-3 — Cancelled job reason label rendering (new codes)

| # | AC | Pass? |
|---|----|-------|
| D-3.1 | Happy: cancelled detail shows SP reason via `SpCancellationReason` EN/DE labels | ☐ |
| D-3.2 | Happy: Autheon cancel shows admin reason vocabulary + driver-facing message (not collapsed into SP codes) | ☐ |
| D-3.3 | Empty/error: missing reason falls back to safe “—” / proto unknown — **never** crashes; unknown code never shown raw unless both locales missing (then fail AC) | ☐ |
| D-3.4 | Authz negative: cancelled detail still gated to assigned partner | ☐ |
| D-3.5 | EN+DE: all four SP cancel + admin cancel labels present | ☐ |

---

## D-4 — Evidence upload source sheet phases vs prototype

| # | AC | Pass? |
|---|----|-------|
| D-4.1 | Happy empty-run evidence: source choice (Take photo / Choose file) → staging → attach; same shared upload component as tour docs | ☐ |
| D-4.2 | Validation: max 5 files; per-file size limits; distinct too-many / too-large / total-exceeded copy | ☐ |
| D-4.3 | Empty: skip evidence entirely; Confirm still works | ☐ |
| D-4.4 | Error: upload failure removes/marks failed item; submit blocked only if unresolved required (evidence never required) | ☐ |
| D-4.5 | Authz negative: cannot attach evidence to another driver’s report | ☐ |
| D-4.6 | Axis V **D17**: phase order matches proto upload stack (category/source/staging as applicable to evidence) | ☐ |
| D-4.7 | EN+DE: `reportProblemEvidence*` keys both locales | ☐ |

---

## D-5 — E2E full Storno vertical (driver → admin)

| # | AC | Pass? |
|---|----|-------|
| D-5.1 | Happy cancel E2E: each of 4 cancel reasons → `cancelled_by_sp`; admin alert/feed receives event | ☐ |
| D-5.2 | Happy empty-run E2E: report + 0…5 evidence → admin Recognised / Not recognised → terminal; no reactivate; not counted performed | ☐ |
| D-5.3 | Negative: legacy reason codes rejected; <30 explanation blocked client-side | ☐ |
| D-5.4 | Authz negative: driver B cannot report on driver A’s job | ☐ |
| D-5.5 | Journey: critical paths #2 and #3 green on staging vs live BE | ☐ |
| D-5.6 | EN+DE: smoke once per locale on cancel + empty-run sheets | ☐ |

### Epic D — OQ blockers

| OQ | Disposition | Impact on D |
|----|-------------|-------------|
| #1 T&C link target | **Resolved 2026-08-12** | Cancel/accept use `DriverTermsDisclosure` (in-app sheet; `VITE_DRIVER_TERMS_URL` when legal supplies it). Do not invent the URL |
| #7 Cancel vs empty-run phase gates | **Deferred** | When ⚠ shows / which statuses allow each path — follow prototype `canServicePartnerReport` until client confirms alternate gates; do not invent stricter/looser gates |
| #4 Retention / malware / DSGVO | **Deferred** | Evidence malware scanning / retention copy not invented; use existing upload-asset pipeline; production security policy TBD |

---

# Epic B — Admin Tour Billing + tour-doc metadata

**PRD:** Phase 12 consolidated invoices + tour documents; payment/finance gates  
**Prototype:** `TourBillingCenterPane`, `TourBillingPane`, `ConsolidatedInvoicesPane`, amount/metadata sheets, `RemoveDocModal`  
**BE:** `/api/v1/consolidated-invoices*`; tour-doc upload/accept; `financeModule` gate on complete/payment  
**FE today:** `/tour-documents` tab-1 only  
**Axis V:** **A21** center (2 tabs), **A22** documents tab, **A23** consolidated invoices; driver **D17** amount sheet (B-9), **D19** `RemoveDocModal` (B-10)  
**Axis M:** design field matrix (B-7); CI status enum; notification events for invoice upload/review (display only)  
**Journey:** Critical path #4 tour docs · #5 CI create→review→`payment_status` paid

---

## B-1 — Shared DTOs/Zod for consolidated invoices

| # | AC | Pass? |
|---|----|-------|
| B-1.1 | Happy: Zod/DTO status enum exactly `in_review` \| `correction_required` \| `rejected` \| `completed` | ☐ |
| B-1.2 | Happy: create/list/review response shapes match BE DTOs (linked job ids, amounts, supplier fields as BE returns) | ☐ |
| B-1.3 | Error: unknown status fails parse (no silent coerce to inventeds) | ☐ |
| B-1.4 | Authz: types are admin-only consumers; not imported into driver feature APIs | ☐ |
| B-1.5 | EN+DE: status label maps exist for UI chips (keys ready for B-3+) | ☐ |

---

## B-2 — Repository + hooks (list/create/review)

| # | AC | Pass? |
|---|----|-------|
| B-2.1 | Happy: Page → feature hook → Repository → apiClient only (no raw fetch in UI) | ☐ |
| B-2.2 | Happy: list/create/review methods wired to BE paths | ☐ |
| B-2.3 | Error: 4xx/5xx mapped to typed errors for toast/banner | ☐ |
| B-2.4 | Authz negative: driver token calling admin billing endpoints → 403; FE never ships driver billing hooks | ☐ |
| B-2.5 | Empty: list returns `[]` → UI empty state hook-ready | ☐ |

---

## B-3 — Tour Billing center shell with 2 tabs

| # | AC | Pass? |
|---|----|-------|
| B-3.1 | Happy: nav opens center with tabs Documents \| Consolidated invoices; labels match proto (`navTourBilling` / invoice tab) | ☐ |
| B-3.2 | Happy: tab switch preserves IA; no third invented tab | ☐ |
| B-3.3 | Empty: each tab empty-state matches proto | ☐ |
| B-3.4 | Authz negative: non-admin role cannot route to Tour Billing | ☐ |
| B-3.5 | Axis V **A21**: side-by-side chrome PASS (2-tab shell) | ☐ |
| B-3.6 | EN+DE: tab titles both locales | ☐ |

---

## B-3a — TourBillingPane documents tab 1:1 (A22)

**Goal:** The Documents tab inside Tour Billing matches prototype `TourBillingPane` (existing tour-docs surface, not a redesign).  
**Authority:** proto `TourBillingPane` · Axis V **A22** · PRD T27 · B-3 shell.  
**Owner:** Yasser.  
**DoD:** A22 clone PASS; CI tab remains B-4/B-5.

| # | AC | Pass? |
|---|----|-------|
| B-3a.1 | Documents tab lists/uploads/reviews tour docs 1:1 proto pane | ☐ |
| B-3a.2 | No consolidated-invoice controls on this tab | ☐ |
| B-3a.3 | Amount/metadata fields follow B-7/B-8/B-9 — do not invent extra columns | ☐ |
| B-3a.4 | Axis V **A22** clone PASS | ☐ |
| B-3a.5 | EN+DE labels match proto | ☐ |

---

## B-4 — Consolidated invoice create + mismatch UX

| # | AC | Pass? |
|---|----|-------|
| B-4.1 | Happy: create with linked completed tours → status `in_review`; copy matches `ConsolidatedInvoicesPane` | ☐ |
| B-4.2 | Validation: mismatch / incomplete selection blocked with proto validation copy (amounts/jobs) | ☐ |
| B-4.3 | Empty: create form with no eligible jobs shows empty/disabled CTA per proto | ☐ |
| B-4.4 | Error: BE validation errors surfaced via shared dialog/toast (Epic N) | ☐ |
| B-4.5 | Authz negative: create forbidden without admin billing permission → 403 handled | ☐ |
| B-4.6 | Axis V **A23**: create UI 1:1 proto | ☐ |
| B-4.7 | EN+DE: `ciCreate*` / list strings both locales | ☐ |
| B-4.8 | Journey: created invoice appears in list for B-5 review | ☐ |

---

## B-5 — Review decisions + financeModule gate

| # | AC | Pass? |
|---|----|-------|
| B-5.1 | Happy: complete → `completed`; reject → `rejected`; require correction → `correction_required`; reason required for reject/correction | ☐ |
| B-5.2 | Happy: complete with finance on can drive jobs `payment_status` paid per BE rules | ☐ |
| B-5.3 | Error: complete when `financeModule` off → BE 422; FE shows clear gate message (allowed production delta) | ☐ |
| B-5.4 | Authz negative: reviewer without rights → 403; no status mutation | ☐ |
| B-5.5 | Empty: review dialog without reason keeps primary disabled (reject/correction) | ☐ |
| B-5.6 | EN+DE: decision labels + finance-off message both locales | ☐ |
| B-5.7 | Axis V **A23**: review action chrome matches proto | ☐ |

---

## B-6 — E2E create → review → payment_status paid

| # | AC | Pass? |
|---|----|-------|
| B-6.1 | Happy path green on live BE with financeModule on | ☐ |
| B-6.2 | Negative: financeModule off → complete blocked; reject still allowed (BE contract) | ☐ |
| B-6.3 | Authz negative: non-admin cannot complete flow | ☐ |
| B-6.4 | Journey: critical path #5 PASS | ☐ |
| B-6.5 | Status matrix: all four CI statuses observed at least once in suite | ☐ |

---

## B-7 — Design: tour-doc amount & invoice metadata field matrix

| # | AC | Pass? |
|---|----|-------|
| B-7.1 | Matrix lists every proto amount/accept metadata field (supplier #, dates, period, amount, …) vs FE/BE | ☐ |
| B-7.2 | Matrix marks Required / Optional / Admin-only / Driver-upload | ☐ |
| B-7.3 | Gaps tagged Open (needs BE) vs FE-only; no silent field invention | ☐ |
| B-7.4 | Axis M artifact attached to B-8/B-9 ClickUp | ☐ |
| B-7.5 | EN+DE label column filled from `i18n.js` | ☐ |

---

## B-8 — Shared + BE: persist tour-doc metadata on upload/accept

| # | AC | Pass? |
|---|----|-------|
| B-8.1 | Happy: upload/accept DTO persists matrix fields; GET returns them | ☐ |
| B-8.2 | Validation: server rejects invalid amounts/dates per BE rules | ☐ |
| B-8.3 | Empty: optional fields may be null; required fields 400 if missing | ☐ |
| B-8.4 | Authz negative: driver cannot write admin-only meta; admin accept meta allowed where proto shows it | ☐ |
| B-8.5 | No dual-write to retired tables; audit on upload/accept meta changes | ☐ |

---

## B-9 — FE amount/metadata sheet (driver upload + admin accept if proto)

| # | AC | Pass? |
|---|----|-------|
| B-9.1 | Happy driver: staging → category → metadata/amount → upload; no HTTP in components | ☐ |
| B-9.2 | Happy admin accept: meta fields shown only if proto accept sheet has them | ☐ |
| B-9.3 | Validation: client mirrors B-7 required rules; MIN/format errors inline | ☐ |
| B-9.4 | Empty: optional meta skipped; upload still succeeds | ☐ |
| B-9.5 | Error: BE reject → shared toast; staged files retained per proto | ☐ |
| B-9.6 | Authz negative: other driver’s job docs inaccessible | ☐ |
| B-9.7 | Axis V **D17** (+ A22 where admin): screenshots PASS | ☐ |
| B-9.8 | EN+DE: amount/metadata sheet strings both locales | ☐ |

---

## B-10 — Remove tour document modal

| # | AC | Pass? |
|---|----|-------|
| B-10.1 | Happy: `RemoveDocModal` confirm → BE delete/replace per rules; list updates | ☐ |
| B-10.2 | Empty/error: cancel dismisses with no mutation; BE fail → toast, doc remains | ☐ |
| B-10.3 | Authz negative: cannot remove another driver’s doc / forbidden types stay read-only | ☐ |
| B-10.4 | Axis V **D19**: modal chrome 1:1 proto | ☐ |
| B-10.5 | EN+DE: remove confirm copy both locales | ☐ |
| B-10.6 | Uses Epic N Confirm (no native confirm) | ☐ |

### Epic B — OQ blockers

| OQ | Disposition | Impact on B |
|----|-------------|-------------|
| #17–21 (esp. expected tour-doc types) | **Deferred** | B-7 matrix must not invent “expected types” beyond proto/PRD `min_document_types_v1`; client confirmation may extend list later |
| #4 Retention / encryption / malware | **Deferred** | Storage/malware policy for invoices/docs — use existing secure upload; do not invent scanning UX |
| #5 Production branding | **Deferred** | Tour Billing chrome stays proto tokens |
| #22–28 PDF cluster | **Deferred** | Does **not** block B CI/docs; blocks T17/G-6 only — listed so B does not pull PDF scope |

---

# Epic C — Admin Service Partner Documents (T34 v2.38)

**PRD:** T34  
**Prototype:** `ServicePartnerProfileModal` Documents tab (`SP_PROFILE_TABS`)  
**BE:** `driver-documents.controller` — multi-active per category; **no** `category_taken`  
**Statuses (SP vocab):** `uploaded` \| `accepted` \| `rejected` \| `replaced` — **not** tour-doc `correction_required` / missing / under-review merge  
**Categories:** `business_registration`, `licence_front`, `licence_back`, `id_front`, `id_back`, `other`  
**Axis V:** **A15** profile modal, **A16** Documents tab  
**Axis M:** partner-scoped docs ≠ tour docs; audit view/download  
**Journey:** Critical path #6 upload → admin accept/reject → replace

---

## C-1 — Shared driver-document enums/DTOs

| # | AC | Pass? |
|---|----|-------|
| C-1.1 | Happy: categories + review statuses match DBML/BE; no `category_taken` error code in FE unions | ☐ |
| C-1.2 | Happy: DTOs are partner-scoped (driver/sp id); **reject** any job-id field in create types | ☐ |
| C-1.3 | Error: tour-doc statuses not merged into SP enum | ☐ |
| C-1.4 | Authz: shared types usable by admin + owning driver only | ☐ |
| C-1.5 | EN+DE: category + status label maps ready | ☐ |

---

## C-2 — Repository + hooks upload/list/review/replace

| # | AC | Pass? |
|---|----|-------|
| C-2.1 | Happy: architecture order Repository → hooks; upload/list/review/replace/download covered | ☐ |
| C-2.2 | Happy: second upload same category **succeeds** (multi-active) | ☐ |
| C-2.3 | Error: accept/reject on non-`uploaded` → BE refuse; FE surfaces error | ☐ |
| C-2.4 | Authz negative: driver A hooks cannot list driver B docs (403) | ☐ |
| C-2.5 | Empty: list `[]` supported | ☐ |

---

## C-3 — Documents tab UI 1:1 prototype

| # | AC | Pass? |
|---|----|-------|
| C-3.1 | Happy: Documents tab lists category, file meta, uploader, time, status, validity, version | ☐ |
| C-3.2 | Happy: after upload, **all** categories remain available; multi-file into selected category | ☐ |
| C-3.3 | Happy: accept/reject (reject reason required); replace inserts version+1 `uploaded`, previous `replaced` | ☐ |
| C-3.4 | Empty: empty tab copy; expiry display derived (accepted stays accepted if date past) | ☐ |
| C-3.5 | Validation: file types/size = tour-doc rules (PDF/images; configured max, ≤50MB ceiling) | ☐ |
| C-3.6 | Error: no `category_taken` UX; no hiding occupied categories | ☐ |
| C-3.7 | Authz negative: blocked partner (`operationalAccess` disabled) cannot self-upload; admin can upload on behalf | ☐ |
| C-3.8 | Axis V **A16** (+ A15 host): side-by-side PASS | ☐ |
| C-3.9 | EN+DE: tab + actions + rejection reason display both locales | ☐ |
| C-3.10 | Profile summary open-review count live | ☐ |

---

## C-4 — Wire create-driver onboarding docs if still in prototype create flow

| # | AC | Pass? |
|---|----|-------|
| C-4.1 | Happy: **only if** proto create-partner still shows docs — same multi-active + multi-file rules as C-3 | ☐ |
| C-4.2 | If proto removed create-flow docs: task = N/A with screenshot proof; no invented onboarding wizard | ☐ |
| C-4.3 | Validation/authz: same as C-3; no `category_taken` | ☐ |
| C-4.4 | EN+DE: create-flow strings both locales when present | ☐ |
| C-4.5 | Axis V: create dialog docs section matches current proto (not archived v2.36 one-active UI) | ☐ |

---

## C-5 — E2E upload → admin accept/reject → replace

| # | AC | Pass? |
|---|----|-------|
| C-5.1 | Happy: upload → accept; upload → reject+reason visible to partner; replace chain versions preserved | ☐ |
| C-5.2 | Happy: two active docs same category both listed (v2.38) | ☐ |
| C-5.3 | Negative: job-id on create rejected; decide on non-uploaded refused | ☐ |
| C-5.4 | Authz negative: cross-partner read/download denied; audit distinguishes actor | ☐ |
| C-5.5 | Journey: critical path #6 green | ☐ |
| C-5.6 | EN+DE: one locale smoke on Documents tab | ☐ |

### Epic C — OQ blockers

| OQ | Disposition | Impact on C |
|----|-------------|-------------|
| #4 Retention / encryption / malware / DSGVO | **Deferred** | Private storage + malware policy TBD; reuse platform upload-asset; do not invent OCR/quality scoring (OOS) |
| #5 Production branding | **Deferred** | Tab chrome stays proto |
| #6 Driver ID format | **Deferred** | Display-only if ID shown on profile; upload flows do not invent ID format |

---

# Cross-epic checklist (expand-before-build)

| # | Gate | N | D | B | C |
|---|------|---|---|---|---|
| X1 | Happy path + prototype component refs | ☐ | ☐ | ☐ | ☐ |
| X2 | Empty / error / validation rows | ☐ | ☐ | ☐ | ☐ |
| X3 | Axis M refs noted | ☐ | ☐ | ☐ | ☐ |
| X4 | Authz negative rows | ☐ | ☐ | ☐ | ☐ |
| X5 | EN+DE | ☐ | ☐ | ☐ | ☐ |
| X6 | Journey link (Axis J / critical paths) | ☐ | ☐ | ☐ | ☐ |
| X7 | OQs Deferred+impact only (no invented answers) | ☐ | ☐ | ☐ | ☐ |
| X8 | Axis V IDs cited (D14/D15, D13, D17/D19, A21–A23, A16) | ☐ | ☐ | ☐ | ☐ |

---

# Explicit non-AC / out of scope here

- Admin empty-run review chrome → Epic G-3 (D-5 only requires vertical green)  
- Admin cancel vocabulary UI → G-4 / A-6 (keep separate from `SpCancellationReason`)  
- Marketplace / accept sheets → Epic E  
- PDF transport-order → G-6 (blocked on OQ #22–28)  
- Native redesign “improvements,” theme editor, seed clocks  
- Reintroducing `category_taken` / one-active-per-category / merging SP↔tour doc status vocabularies  

---

*Appendix for Autheon production alignment. Prototype signed-off UI + PRD v2.38 + BE/DBML machine contracts bind all rows.*
