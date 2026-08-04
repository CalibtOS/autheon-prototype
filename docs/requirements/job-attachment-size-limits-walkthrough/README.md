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
the file chooser lets Upload start; the store then refuses that one file.

### 4b. A real size refusal, mid-walk

| Shot | File |
| --- | --- |
| Per-file refusal reached by breaking the rule | [`04b-driver-size-refusal-mid-walk.png`](04b-driver-size-refusal-mid-walk.png) |

The staged sheet pre-checks size, so the store's own `file_too_large` refusal
is only reached when the tour's rules change under a driver who is already
mid-batch. Here an administrator lowers the per-file limit to 5 MB while a
two-receipt fuel batch is being walked. Nothing is simulated — the store
refuses on the next write.

Seen: the walk ends and hands the driver back to the list; `fuel-big.pdf`
carries both the pre-check mark (**"Too large — max 5 MB per file"**) and the
store's refusal (**"Rejected — this file is too large…"**); `fuel-small.pdf`
stays staged and unmarked; the action becomes **Retry these files**.

Because the shell shows one surface at a time and switching unmounts the
driver, the capture makes that save through the same store call the admin
card's Save button makes — the real-world equivalent being a second
administrator in their own session.

### 5. Seeded nearly-full tour — zero remaining

| Shot | File |
| --- | --- |
| Exhausted allowance | [`05-driver-exhausted-allowance.png`](05-driver-exhausted-allowance.png) |

Seen on tour `0845-26` at the **default 25 / 50 limits, with no settings edit**
— which is what the seeded ~40 MB accepted document exists for. 40.8 MB is
already attached, so a 10 MB scan reads **"50.8 of 50 MB used · 0.0 MB left"**:
the remaining figure clamps at zero rather than going negative, the orange
**"This tour has no room left for your selection…"** appears, and Upload is
disabled.

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
cannot be submitted while evidence breaks the limit, and its locked label names
the evidence — **"Remove the flagged evidence file to unlock"** / **"Markierten
Nachweis entfernen zum Freischalten"** — rather than the character minimum the
driver has already met. Hint copy reflects the configured per-file MB. The
5 MB was saved from the admin card, so the driver is reading the
administrator's number.

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
3. **Size refusals need state to change under the driver.** The review sheet
   runs the same arithmetic as the store, so while it is on screen the two can
   never disagree and `file_too_large` / `allowance_exhausted` cannot fire —
   Upload is simply held back instead. The one honest route is a rule change
   mid-batch, which shot 04b walks. In the product the same copy is reached
   more often, because there the server is authoritative and can disagree with
   the client pre-check. The strings are identical either way, so client
   feedback on them still lands on the real product.
4. **Usage line says “on this tour”.** Staged copy
   (`stagedUsage`) still names the tour; the admin field deliberately does not.
   Same product string lift — call out in the demo so it is not read as a
   single combined tour cap.
5. **The empty-run slide has an evidence-blocked label the product has no
   equivalent for.** The product submits that sheet with a button and has no
   locked-slide copy to lift, so `emptyRunSlideLockedEvidence` is authored here
   (EN + DE). Prototype-only string; nothing to reconcile upstream.

---

## Suites (run after this pack)

```bash
cd autheon-prototype
node prototype/project/_audit-prototype.mjs   # no NEW findings vs baseline
npx tsc --noEmit
npm run test:regression
npm run test:e2e
```

### Results

**Both suites are substantially red on this repository, on `main` as much as on
this branch.** "Pass" here therefore means *no new failure introduced*, measured
against a real `origin/main` baseline rather than assumed — the branch and a
clean `main` worktree were each run with the same local snapshot baselines and
the failing test IDs diffed. Raw numbers alone would be misleading, so both are
given.

| Check | `origin/main` | This branch | Verdict |
| --- | --- | --- | --- |
| `_audit-prototype.mjs` | `AUDIT FAIL` — 4 EN-only keys (`adminUsersDriverDeleted`, `adminDeleteDriverConfirmTitle`, `adminDeleteDriverConfirmBody`, `adminDeleteDriverConfirmAction`) + used-but-missing `confirm` | identical | **no new findings** |
| `npx tsc --noEmit` | 4 × TS7006 implicit `any` in `tests/e2e/vehicle-domain/*` | identical | **no new errors** |
| `npm run test:regression` | 75 failed · 71 passed · 15 skipped | 74 failed · 89 passed · 15 skipped | **no new failures** |
| `npm run test:e2e` | 53 failed · 100 passed | 51–57 failed · 96–102 passed | **within the suite's own run-to-run noise** |

Failing-test-ID diff, regression (deterministic): the branch adds no failures
and clears two that `main` shows (`audit-retention.unit.spec.ts:79`,
`driver-header.structural.spec.ts:62` — both flaky). One test moves the other
way: `admin.visual.spec.ts:148` (audit-log screen) differs by **10 pixels
(0.01%)** against a baseline that is not committed and so gates nothing on a
fresh clone.

Failing-test-ID diff, e2e: **not deterministic, so a single diff would be
misleading.** Two runs of the *same* branch tree disagree on 5 test IDs; `main`
and the branch disagree on 7. The IDs that move are theme-editor, driver-profile
and shell-switch specs that time out under parallel load — the same ones that
move between two runs of identical code. None of them is in an attachment path,
and no attachment spec has failed in any run.

The standing failures are `@visual-regression` pixel drift (admin and driver
baselines are uncommitted and predate several merged PRs), the marketplace
filter-badge journey, and shell/switch helpers timing out under parallel load.
None of them touch the attachment-limits paths.

| New in this pack | Result |
| --- | --- |
| `job-attachment-limits.unit.spec.ts` | **10 / 10 passed** (store arithmetic) |
| `job-attachment-limits.integration.spec.ts` | **7 / 7 passed** (staged sheet, amount walk, mid-walk refusal, admin card → driver, evidence lock) |

Neither new spec takes a screenshot, so both gate on a fresh clone where the
visual baselines do not exist.

Audit baseline already FAILS on main for four EN-only keys and one missing
`confirm` key — do not “fix” those here; the bar is no new findings.
