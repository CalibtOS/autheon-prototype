# Job attachment size limits — client sign-off

**Date:** 2026-08-04
**Prototype branch:** `feat/job-attachment-size-limits`
**Mirrors:** product work in `autheon-be` / `autheon-fe` on the same branch name
**Product-side companion:**
[`.scratch/2026-08-02-job-attachment-size-limits/spec.md`](../../../.scratch/2026-08-02-job-attachment-size-limits/spec.md)
(read the two together — this note records what the prototype asks the client to
sign off; that spec is the product contract it mirrors)

**Status:** implemented in the prototype; three departures below need explicit
client sign-off so they are not rediscovered as defects.

---

## What was built

The static prototype now shows the shipped product behaviour for driver upload
limits, without inventing a server:

- **Store** (`store.js`) holds `driverUploadLimits` (`maxFileMb: 25`,
  `maxTotalMb: 50` by default), a named **platform ceiling** of 50 MB, usage for
  a tour's documents upload area (`tourDocumentsUsageBytes` —
  live driver uploads and admin **off-channel** rows, excluding `replaced`
  history), remaining allowance clamped at zero, and
  `assertAttachmentAllowed` / `assertTourDocumentAttachment` with two refusal
  reasons (`file_too_large`, `allowance_exhausted`). Admin off-channel attach
  counts toward the documents area but is never refused by it. Driver personal
  documents (licence / ID) sit on the platform ceiling alone.
- **Admin** System settings gains a Driver upload limits card
  (`DriverUploadLimitsForm`) — both fields in megabytes, dirty-gated validation,
  cross-field rule that the total cannot sit below the per-file limit, immediate
  effect via `setDriverUploadLimits`, audited as `driver_upload_limits_changed`.
- **Driver** tour-document upload is one staged multi-select flow at every site
  (tour detail, documents tab, post-Performed): category once, batch review with
  sizes and remaining allowance, upload disabled while the selection breaks a
  limit, successful files leave the list, refused files stay with a reason.
  Invoice / fuel / toll batches then walk an **amount form per receipt**.
  **Report Problem** evidence is a separate upload area that reads the same two
  configured numbers and starts at zero for a report still being composed.
- Seed tour `A-2026-00845` carries a ~40 MB accepted document so a nearly full
  allowance is demoable without editing settings first.
- The platform ceiling and the area-total bound are enforced in
  `setDriverUploadLimits` itself, not only in the admin form: a configured
  per-file limit can never be raised above the ceiling, so the backstop keeps
  its meaning whoever writes the value.
- Proof:
  `tests/regression/job-attachment-limits.unit.spec.ts` for the arithmetic
  (drives `window.AuthStore` in the page realm) and
  `tests/regression/job-attachment-limits.integration.spec.ts` for the screens
  — the staged sheet's marks and gating, the amount walk, a real mid-walk size
  refusal, the admin card reaching the driver without a reload, and the
  evidence lock. Neither takes a screenshot, so both gate on a fresh clone.

Vocabulary follows [`DOMAIN.md`](../../prototype/project/DOMAIN.md): **tour
document**, **upload area**, **allowance**, **platform ceiling**,
**off-channel**, **Report Problem**.

---

## Sign-off items

### 1. Two independent upload areas

A tour's documents and each problem report's evidence hold **separate totals**,
reading the **same** configured `maxFileMb` / `maxTotalMb`. Worst case per tour
is therefore two full allowances (documents + evidence).

The literal original requirement — one combined total per tour — is
**deliberately not met**.

**Reasoning:** journey separation. Attaching Report Problem evidence must not
shrink the room left for invoices and receipts on the same tour; the two flows
are different tasks for the driver, and coupling their budgets would surprise
them mid-journey.

**Where it shows:** `assertAttachmentAllowed` is shared; documents usage is
scoped by `jobId`, evidence usage for a composing report starts at zero and is
checked only against the selection in hand (`ReportProblemSheet` in
`driver.jsx`). Admin helper text names both areas.

### 2. The label wording that forces

The admin field **must not** say "per tour" (or "per job"). It is labelled
**"Max. total per upload area (MB)"**, with hint copy that the total is counted
separately for a tour's documents and for each problem report's evidence
(`settings.system.uploadLimitsMaxTotalLabel` /
`uploadLimitsMaxTotalHint` in `i18n.js`, lifted from the product console
locales).

**Reasoning:** one configured number drives two areas. A label that said "per
tour" would promise a single combined cap while the store enforces two. If that
wording is rejected, the **two-area decision (item 1) is what has to change** —
in the product as well as here — not merely the string.

### 3. Amounts collected per receipt inside a batch

After the driver confirms a staged batch of invoice / fuel / toll receipts, the
prototype walks an amount form **per file** (net / tax / gross, plus the
category's date fields), naming the position in the walk. Abandoning mid-walk
keeps every file already written and leaves the rest staged so Upload resumes.
Amount math that does not add up stays inside the form and never marks the file
as an upload refusal.

**Reasoning / divergence:** this interaction exists **only in the prototype**.
The product frontend has no amount metadata on attachments at all. When it
gains some, it either adopts this walk or supersedes it — that choice should
trace to a client conversation recorded here, not be reinvented later.

---

## Accepted consequences

Recorded so they are not treated as regressions:

1. **Driver personal documents rise 25 MB → 50 MB.** The old compiled-in 25 MB
   constant became the named platform ceiling of 50 MB (aligned with the
   product / nginx backstop). Personal licence and ID uploads sit on that
   ceiling alone, so they inherit the rise as a side effect of the ceiling
   split — same accepted side effect the product documents for staff surfaces.
2. **Dispatch can push a tour past its allowance.** Admin off-channel attach is
   counted in `tourDocumentsUsageBytes` but never refused by
   `assertTourDocumentAttachment`. The driver then sees remaining allowance
   clamped at **zero**, never a negative figure, and cannot add more of their
   own until something live is removed or replaced with a smaller file.
3. **The store's own size refusals are near-unreachable from the staged
   sheet.** The sheet runs the same arithmetic as the store, so the two cannot
   disagree while it is on screen — Upload is held back instead of a refusal
   being raised. `file_too_large` / `allowance_exhausted` therefore surface
   only when the rules change under a driver who is already mid-batch (an
   administrator saving a lower limit during the amount walk), which the
   walkthrough shows. In the product the same copy is reached more often
   because the server is authoritative there. The strings are the product's, so
   wording feedback still lands upstream either way.
4. **One prototype-only string.** `emptyRunSlideLockedEvidence` — the product's
   empty-run sheet submits with a button and has no locked-slide copy to lift.
   Written here in EN and DE so the slide names the evidence rather than the
   character minimum a driver has already satisfied.

---

## How to verify the record still matches the code

```bash
cd autheon-prototype
node prototype/project/_audit-prototype.mjs
# optional store-level suite (needs a running prototype or Playwright webServer):
# npx playwright test tests/regression/job-attachment-limits.unit.spec.ts
```

Admin path: Settings → Driver upload limits — confirm the total label says
"per upload area" and the hint names tour documents and problem-report
evidence. Driver path: tour documents staged batch + Report Problem evidence
on the same tour — each area reads the configured total independently.
