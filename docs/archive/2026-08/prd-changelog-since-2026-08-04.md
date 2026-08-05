# PRD changelog: 2026-08-04 / 2026-08-05 (v2.31 → v2.32)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`

> **Scope of this file:** **PRD v2.32** — job attachment size limits and staged multi-file upload, synced into the prototype and the PRD after the product behaviour shipped (autheon-be / autheon-fe) and the prototype pack landed (PR #46). Baseline is **v2.31**.

---

## PRD v2.32 — Job attachment size limits and staged multi-file upload (2026-08-04 / 2026-08-05)

**Baseline:** PRD v2.31
**Source:** product pack `.scratch/2026-08-02-job-attachment-size-limits/` (be #163 / fe #43) and prototype pack `.scratch/2026-08-04-prototype-job-attachment-size-limits/` (prototype PR #46).
**Client sign-off note:** [`../../requirements/job-attachment-size-limits-sign-off.md`](../../requirements/job-attachment-size-limits-sign-off.md).
**Type:** requirement refinement + prototype sync. Replaces the single compiled-in 25 MB per-file cap with configurable limits, multi-file staged upload, and a second independent upload area for Report Problem evidence.

### 1. Previous behaviour (v2.31 / v2.10 upload rules)

| Concern | Before | Problem |
| --- | --- | --- |
| Per-file limit | One compiled-in **25 MB** on every upload path | Ops could not tighten or relax without a redeploy |
| Area total | None | A tour's documents could grow without bound |
| Selection | One file at a time per category | Drivers combined receipts into one photo or dropped extras |
| Feedback | Size errors after the upload attempt | Mobile data wasted; which file failed was unclear |
| Evidence | Report Problem evidence not size-checked the same way | Oversized evidence only failed after the report existed |
| Admin control | No Settings surface for upload limits | Limits lived in env / code constants |

### 2. What changed

#### 2.1 Two configured limits

Administrators set, in megabytes, on System settings:

- **Max. size per file** — default **25**
- **Max. total per upload area** — default **50**

Both take effect immediately for drivers in the same session. The total field **must not** be labelled "per tour" / "per job": one number drives two independent areas (see §2.3). Cross-field rule: total may not sit below the per-file limit.

Setting key (production / catalog): `driver.uploads.limits` → `{ maxFileMb, maxTotalMb }`.

#### 2.2 Platform ceiling

A named **platform ceiling** of **50 MB** is the hard backstop no upload of any kind may exceed (dispatch off-channel attach, driver personal licence/ID documents, and as the upper bound on the configurable per-file setting). The configurable per-file limit governs **tour documents** and **Report Problem evidence** only.

**Accepted consequence:** driver personal documents rise from 25 MB → 50 MB as a side effect of the ceiling split (same accepted product side effect).

#### 2.3 Two independent upload areas

| Upload area | What counts | Total |
| --- | --- | --- |
| Tour documents | Live driver uploads + admin **off-channel** attachments; **`replaced` history rows do not count**; generated transport orders never count (separate collection) | Own total against `maxTotalMb` |
| Report Problem evidence | Evidence on that report only | Own total against the **same** `maxTotalMb`, independent of tour documents |

Worst case per tour: **two full allowances**. The literal original "one combined total per tour" ask is deliberately not met — journey separation (see sign-off note).

Dispatch off-channel attach **counts** toward the tour-documents area but is **never refused** by that total, so a tour can sit over allowance with remaining shown as **zero** (never negative).

#### 2.4 Staged multi-select (driver)

After choosing a document category once, the driver selects several files, reviews name/size, sees per-file oversize marks and clamped used/remaining, removes rows, and uploads only when the selection fits (and while online). Successful files leave the list; store refusals stay with distinct copy for **file too large** vs **allowance exhausted**. Replace of a single reviewed file stays an immediate single-file path (no staging).

#### 2.5 Prototype-only: amounts per receipt in a batch

Invoice / fuel / toll batches still walk an amount form **per file** in the prototype (`netAmount` etc.). The product frontend has no amount metadata on attachments; when it gains some it either adopts this walk or supersedes it. Recorded in the sign-off note so it is not rediscovered as a product defect.

#### 2.6 Report Problem evidence precheck

Evidence is checked against the same per-file limit and its own area total **before** submit. Oversized files are marked on their row; over-total shows a distinct removal message; submit stays locked. The five-file cap is unchanged. No running usage figure on the composing report (selection in hand is the whole picture).

### 3. Supersedes

| Resolved default | Status |
| --- | --- |
| `document_upload_max_file_size_v1` (fixed 25 MB everywhere) | **SUPERSEDED** by `driver_upload_limits_v1` |
| Task 27 acceptance line that hard-codes "prototype: 25 MB" | Updated to configurable limits + platform ceiling |

`document_upload_source_selection_v1` remains, extended: after category + source, multi-select is allowed for tour documents; the source sheet still precedes the picker.

### 4. Prototype surfaces (after PR #46 + follow-ups)

- Store: `driverUploadLimits`, `PLATFORM_UPLOAD_CEILING_BYTES`, usage/remaining, distinct refusal reasons
- Admin: Driver upload limits card on System settings; audited `driver_upload_limits_changed`
- Driver: staged flow via shared upload path (My documents tab + mark-performed success); evidence prechecks on Report Problem
- Proof: `tests/regression/job-attachment-limits.unit.spec.ts` (+ integration where present)
- Vocabulary: [`prototype/project/DOMAIN.md`](../../../prototype/project/DOMAIN.md) and workspace `CONTEXT.md`

### 5. Explicit non-goals of this PRD bump

- Does not reopen the product/backend schema beyond documenting the setting and counting rules already shipped
- Does not claim the prototype amount-walk is production UI
- Does not fix pre-existing audit i18n baseline findings unrelated to this feature
