# Appendix: PRD task traceability (v2.38)

**Source:** [PRD requirements inventory](44cd3ce3-cad3-4363-82e7-cf89ac574419)  
**File:** `Autheon/docs/requirements/prd.json` (**v2.38** — multi active SP docs per category; amends T34)  
**Use:** ClickUp — put `PRD T{n}` on every card; park open questions in a “Needs client decision” list (do not invent answers in code).

## Task → plan epic map

| PRD | Epic name | Actor | Alignment epic |
|-----|-----------|-------|----------------|
| T1 | Domain Model & Data Foundation | platform | Foundation (done on BE Scope A) |
| T2 | Authentication & Access Control | both | H / F-5 / **F-6** |
| T3 | Admin User & Driver Management | admin | H |
| T4 | Customer & Address Master Data | admin | I-1 |
| T5 | Job Creation | admin | G-2 |
| T6 | Publishing & Direct Assignment | admin | G |
| T7 | Driver Marketplace | driver | E-1 + **L** (chrome) |
| T8 | Job Details, Visibility & Navigation | driver | E-2 |
| T9 | Job Acceptance | driver | E-3 + **E-6** (same-day) + **E-7** (probation sheet) |
| T10 | My Jobs | driver | D-2 + **L** |
| T11 | Operational Completion | driver | E-3 |
| T12 | Report Problem, Cancellation & Empty Run | driver | **A + D** |
| T13 | Admin Empty-Run Review & Cancellation Resolution | admin | G-3 |
| T14 | Admin Job Cancellation | admin | G-4 |
| T15 | Admin Job Overview | admin | G-1 + **M-1** |
| T16 | Admin Job Detail | admin | G + **G-7…G-9** |
| T17 | PDF Generation & Document Automation | system | G-6 |
| T18 | Information Center / Infopoint | both | F-4 / I-4 |
| T19 | Driver Profile & Notification Settings | driver | F-1 / F-2 |
| T20 | Driver Push & Admin Critical Alerts | both | F-3 / I-2 |
| T21 | Basic Financial Fields & Finance Scope Control | admin | G-5 / B |
| T22 | Audit Log & Status History | platform | I-3 |
| T23 | Error Handling & UX Feedback | both | **N** |
| T24 | Exports & Reporting Basics | admin | G-1 / I-3 |
| T25 | PWA Platform Requirements | driver | E / F / **L** + Axis V |
| T26 | QA & Automated Validation | QA | K (+ K-6 Axis V) |
| T27 | Tour Documents, Driver Invoices & Billing Reconciliation | both | B + tour docs |
| T28 | Distance Estimation & External Map Handoff | both | E-4 / G |
| T29 | Rollout & Migration Strategy | project | K / ops |
| T30 | Driver Probation Acceptance Limit | both | H-5 |
| T31 | Operational Policies (App Settings) | admin | I-5 |
| T32 | Order Cancellation & Empty-Run Workflow (Storno) SOT | both | **A + D + G-3/G-4** |
| T33 | Dispatch Notification Feed | admin | I-2 |
| T34 | Service Partner Documents & Onboarding Compliance | both | **C** (v2.38: multiple active docs per category — no category_taken) |

## Suggested ClickUp portfolio folders (from PRD)

1. **Foundation** — T1, T2, T29, T26  
2. **Admin master data & jobs** — T3–6, T15–16, T31  
3. **Driver marketplace & execution** — T7–11, T25, T30  
4. **Storno** — T12–14, **T32**  
5. **Documents & billing** — T27, T21, T24, **T34**  
6. **PDF & distance** — T17, T28  
7. **Comms** — T18–20, **T33**  
8. **Platform hygiene** — T22, T23  

## First FE/BE alignment priority (matches Waves 0–1)

| Priority | PRD | Plan epic | Why |
|----------|-----|-----------|-----|
| 1 | T12 + T32 | A, D | Hard BE break on reason codes |
| 2 | T13–14 | G-3, G-4 | Empty-run review + admin cancel vocab |
| 3 | T27 + T21 | B | Consolidated invoices missing in FE |
| 4 | T34 | C | SP documents missing in FE |
| 5 | T20 + T33 | F-3, I-2 | Notification presentation / feed |
| 6 | T2/T3/T30 | H | Access axes + probation |

## Open questions — do not invent

~30 still open in `production_open_questions` (7 resolved: #1, #2, #9, #10, #12, #33, #34).  
That is **planning-complete** (every OQ is Resolved or Deferred+impact). Answers land one at a time per [`oq-disposition.md`](./oq-disposition.md). Notable still Deferred: #7 cancel vs empty-run, PDF #22–28, feed #29–32.

## Deprecated — FE must not reintroduce

`return_requested`; operational `completed` as real status; `special_case` / `not_performable`; `daily_job_limit` + limit-increase MDR; coarse **Blocked**; notification category chips/tabs; `billing-invoice` code; Finance module dashboard; driver workflow emails except booked/assigned confirmation with order PDF (OQ-12); red-plate number storage; FAQ accordion in Help; native `alert`/`confirm` in admin.

## Matrices to attach on ClickUp epics

- `driver_visibility_matrix`  
- `notification_channels_matrix`  
- `client_status_mapping`  
- `marketplace_sync_policy`  
- `resolved_defaults` / `scope_alignment.v1_in_scope`
