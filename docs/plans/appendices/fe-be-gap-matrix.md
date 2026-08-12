# Appendix: FE ↔ Prototype ↔ BE gap matrix

**Source:** [FE vs prototype gap matrix](80853db8-96bb-494d-be9d-f927771e9b3e)  
**Use:** ClickUp backlog prioritization + architecture gates.

## Architecture constraints (every task)

**FE:** Page → feature `api/` → Repository → `apiClient`. No HTTP in pages/components. New endpoints: `@shared` → `I*` → data repo → container → feature api → UI.  
**BE:** Presentation → Application → Domain; contracts in `@autheon/shared` first.  
**Critical drift:** FE `packages/shared` SHA behind BE `shared` (BE has Storno/CI/driver-doc enums; FE shared does not). Sync submodule **before** UI work (plan task A-1 / gap A1).

## Matrix

| Prototype surface | FE | BE | Break | Owner | Effort | Plan epic |
|-------------------|----|----|-------|-------|--------|-----------|
| Jobs overview / create / detail | present | present | none | — | — | G |
| Empty-run review | present | present | none | — | — | G-3 |
| Notifications feed | present | present | none | — | — | I-2 |
| Service Partners + MDR | present | present | none | — | — | H |
| Staff | present | present | none | — | — | H-4 |
| Customer Center + Addresses | present | present | none | — | — | I-1 |
| Infopoint admin | present | present | none | — | — | I-4 |
| Tour Billing — documents | present | present | none | — | — | B |
| Tour Billing — **consolidated invoices** | **missing** | present | soft | Full-stack | L | **B** |
| Audit | present | present | none | — | — | I-3 |
| Settings user/system | present | present | none | — | — | I-5 |
| Settings Prototype/flags tab | missing (correct) | feature-flags API | soft | Product | M | D (decide) |
| Marketplace / My Jobs / accept / perform | present | present | none | — | — | E / D |
| **Report problem** | partial | present | **hard** | Full-stack | M | **A** |
| Infopoint / profile / auth / notifs | present | present | none | — | — | F |
| Tour doc upload | present | present | soft | FE | M | C / tour docs |
| Tour doc **amount/metadata** sheet | **missing** | partial DTO | soft | Full-stack | L | **B-7…B-9** |
| SP profile Documents | **missing** | present | soft | Full-stack | L | **C** |
| Driver PWA chrome (header/bell/bands) | old generation | N/A | **hard UI / Axis V FAIL** | FE | M | **L** (D03–D05) |
| Admin sidebar order / CC title hierarchy | soft mismatch | N/A | soft | FE | S | **M** (A02, A19) |
| Dialog / native alert usage | partial | N/A | soft | FE | M | **N** |
| Same-day overlap / probation sheets | missing tasks→now tasked | present | soft | FE | M | **E-6, E-7** |
| Assign / notes / VIN / schedule dialogs | partial→now tasked | present | soft | FE | M | **G-7…G-10** |
| Admin auth screens | orphan→**F-6** | present | soft | FE | M | **F-6** |
| Orphan web `features/invoices` | orphan | N/A | none | FE | S | E hygiene |
| Shared submodule | stale | ahead | **hard** | Full-stack | M | **A** |

\*Tour-doc amount/metadata promoted to Epic B tasks B-7…B-9 (loop tick).

## Priority order (from matrix)

1. Sync FE shared → BE shared  
2. Fix ReportProblemSheet codes (+ MIN 30 / evidence rules)  
3. Consolidated invoices UI  
4. SP Documents tab  
5. Tour-doc amount/metadata sheet  
6. Hygiene (orphan invoices feature) + Product decision on finance flags  

## ClickUp titles (matrix agent short list)

1. `[Shared] Sync FE packages/shared submodule to BE shared`  
2. `[FE][Hard break] ReportProblemSheet: SpCancellationReason / EmptyRunReason`  
3. `[QA] E2E problem report cancel + empty-run`  
4. `[Design] Tour Billing center: documents + consolidated invoices`  
5. `[FE] Consolidated invoices feature (repo → api → tab)`  
6. `[BE] CI create/review + upload prerequisites`  
7. `[Design] Driver tour-doc amount/metadata field matrix`  
8. `[BE] Document upload metadata in shared DTO + persistence`  
9. `[FE] Tour document amount/metadata in upload flow`  
10. `[Product] Finance feature-flag: ship / fold / drop`  
11. `[FE] Platform feature-flags wiring (if shipped)`  
12. `[BE] Inventory unused-by-FE APIs`  
13. `[FE] Remove orphan apps/web invoices template`  
14. `[QA] Proto/FE/BE gap matrix + shared SHA drift guard`  
