# Job attachment size limits — client walkthrough

**Date:** 2026-08-04  
**Branch:** `feat/job-attachment-size-limits`  
**Companion sign-off:** [`../job-attachment-size-limits-sign-off.md`](../job-attachment-size-limits-sign-off.md)

These screenshots were captured from the running prototype
(`npm run dev` → `http://127.0.0.1:4173`), driving
`/prototype/project/AUTHEON%20Prototype.html` via the framed page with
page-context scripting. Every claim below was walked in a real browser — not
asserted from code alone.

Regenerate with:

```bash
cd autheon-prototype
npm run dev   # if not already on :4173
node docs/requirements/job-attachment-size-limits-walkthrough/_capture.mjs
```

---

## Walk order

### 1. Admin — Driver upload limits card

| Shot | File |
| --- | --- |
| Default card (25 / 50) | [`01-admin-upload-limits-card.png`](01-admin-upload-limits-card.png) |
| Cross-field error (total 5 &lt; per-file 10) | [`01b-admin-cross-field-error.png`](01b-admin-cross-field-error.png) |
| Same error in German | [`01b-de-admin-cross-field-error.png`](01b-de-admin-cross-field-error.png) |
| Both limits lowered and saved (10 / 20) | [`01c-admin-limits-saved.png`](01c-admin-limits-saved.png) |

Seen: label **"Max. total per upload area (MB)"** (not “per tour”); hint names
tour documents and problem-report evidence separately; Save stays disabled while
the cross-field rule fails; German copy is complete (no English leak).

### 2. Driver — mixed batch with an oversized file

| Shot | File |
| --- | --- |
| EN review sheet | [`02-driver-mixed-batch-oversized.png`](02-driver-mixed-batch-oversized.png) |
| DE review sheet | [`02-de-driver-mixed-batch-oversized.png`](02-de-driver-mixed-batch-oversized.png) |

Seen: category once for the batch; each file with size; `oversized-scan.pdf`
marked **"Too large — max 10 MB per file…"** / German equivalent; used /
remaining figure; Upload disabled.

### 3. Removal re-enables Upload

| Shot | File |
| --- | --- |
| Oversized file removed | [`03-driver-after-remove-upload-enabled.png`](03-driver-after-remove-upload-enabled.png) |

Seen: remaining two files only; Upload enabled (primary).

### 4. Partial refusal — refused file stays, action becomes Retry

| Shot | File |
| --- | --- |
| After upload of a mixed good+bad batch | [`04-driver-partial-refusal-retry.png`](04-driver-partial-refusal-retry.png) |

Seen: `ok-proof.pdf` left the list (accepted); `notes.txt` stayed with
**"Rejected — this file type is not accepted…"**; primary action became
**"Retry these files"**.

How this path was reached in the prototype: the staged sheet type-checks only
via the native picker’s `accept` list, so feeding an unsupported MIME through
the file chooser lets Upload start; the store then refuses that one file. A
size-limit mid-batch refusal is harder to show live because the review sheet
disables Upload whenever any staged file is already oversized or the projected
total does not fit (see Divergences).

### 5. Seeded nearly-full tour — zero remaining

| Shot | File |
| --- | --- |
| Exhausted allowance | [`05-driver-exhausted-allowance.png`](05-driver-exhausted-allowance.png) |

Seen on tour `0845-26` (seed ~40 MB accepted document): remaining figure
**0.0 MB** (never negative); orange **"This tour has no room left for your
selection…"**; Upload disabled. For the shot, `maxTotalMb` was set to the
current used megabytes so the seeded near-full tour sits at zero remaining
without a further dispatch attach.

### 6. Amount walk across a batch of receipts

| Shot | File |
| --- | --- |
| EN — position label | [`06-driver-amount-walk.png`](06-driver-amount-walk.png) |
| DE — position label | [`06-de-driver-amount-walk.png`](06-de-driver-amount-walk.png) |

Seen: after confirming a three-file fuel-receipt batch, **"Receipt 1 of 3"** /
**"Beleg 1 von 3"** on the amount form; net / tax / gross fields. Prototype-only
interaction (see sign-off item 3).

### 7. Report Problem — evidence blocked at submit

| Shot | File |
| --- | --- |
| EN | [`07-driver-evidence-blocked.png`](07-driver-evidence-blocked.png) |
| DE | [`07-de-driver-evidence-blocked.png`](07-de-driver-evidence-blocked.png) |

Seen: empty-run path; evidence file marked **"File is too large. Max file size:
5 MB."** / German equivalent; slide confirm stays **disabled** so the report
cannot be submitted while evidence breaks the limit. Hint copy reflects the
configured per-file MB.

---

## Language spot-check

New surfaces were opened in both EN and DE. No missing keys and no English
chrome on the German screens for: admin upload-limits card (incl. cross-field
error), staged review (oversized mark + usage line), amount-walk position
label, and Report Problem evidence oversize. (Free-text the driver types into
the problem-report description is not translated — that is user content.)

---

## Divergences vs shipped product frontend

Recorded so the demo conversation matches
[`job-attachment-size-limits-sign-off.md`](../job-attachment-size-limits-sign-off.md):

1. **Two independent upload areas** — documents vs Report Problem evidence —
   already the product rule; the admin label **"per upload area"** is what
   forces that honesty. Shown in shots 01 / 01b / 07.
2. **Per-receipt amount walk** exists **only in the prototype** (shots 06).
   Product attachments carry no amount metadata today.
3. **Mid-batch size refusal is hard to demo live.** The prototype disables
   Upload on the review sheet while any staged file is oversized or the
   projected total does not fit, so the store’s per-file
   `file_too_large` / `allowance_exhausted` refusal path is rarely reached from
   an honest click. Shot 04 therefore uses an unsupported type (store
   `invalid_type`) to show the same UI contract: refused file stays with a
   reason; primary action becomes Retry. The product sheet may surface
   server-side size refusals more often because transport can disagree with the
   client precheck.
4. **Evidence-blocked slide label.** When evidence breaks a limit but the
   explanation already has ≥30 characters, the slide is correctly disabled, yet
   its locked label still reads the character-minimum copy
   (“Enter at least 30 characters to unlock” /
   “Mind. 30 Zeichen eingeben…”). Submit is held; the wording is misleading.
   Worth aligning with the product empty-run sheet if it already has a distinct
   evidence-blocked string.
5. **Usage line says “on this tour”.** Staged copy
   (`stagedUsage`) still names the tour; the admin field deliberately does not.
   Same product string lift — call out in the demo so it is not read as a
   single combined tour cap.

---

## Suites (run after this pack)

```bash
cd autheon-prototype
node prototype/project/_audit-prototype.mjs   # no NEW findings vs baseline
npx tsc --noEmit
npm run test:regression
npm run test:e2e
```

### Results on 2026-08-04 (this walkthrough)

| Check | Result |
| --- | --- |
| `_audit-prototype.mjs` | **No new findings.** Same baseline FAIL as main: 4 EN-only keys (`adminUsersDriverDeleted`, `adminDeleteDriverConfirmTitle`, `adminDeleteDriverConfirmBody`, `adminDeleteDriverConfirmAction`) and used-but-missing `confirm`. |
| `npx tsc --noEmit` | **Fails (pre-existing on `origin/main`).** Implicit `any` on `page` helpers in `tests/e2e/vehicle-domain/*` — not introduced by this pack. |
| `job-attachment-limits.unit.spec.ts` | **9 / 9 passed.** |
| `npm run test:regression` | **69 passed, 15 skipped, 74 failed.** Failures are almost entirely `@visual-regression` pixel diffs (admin baselines are not committed / drift; driver visual baselines also drifted) plus marketplace filter-badge integration and a few shell structural/ARIA checks. None of the job-attachment store specs failed. |
| `npm run test:e2e` | **101 passed, 52 failed.** Failures cluster in vehicle-domain UI specs, marketplace filter-badge journey, and a handful of shell/switch helpers timing out under parallel load — not in the attachment-limits paths exercised by this pack. |

Audit baseline already FAILS on main for four EN-only keys and one missing
`confirm` key — do not “fix” those here; the bar is no new findings.
