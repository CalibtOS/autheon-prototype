# Investigating a Visual Regression Failure — Traces and Artifacts

How to get from a red check to the actual cause.

---

## First five minutes of investigation

Do these in order. Most failures are identified before step 5.

**1. Read the job summary — do not download anything yet.**

Open the failed run on GitHub. The **Summary** page shows the classification
table. The single most important field is **Classification**:

| Classification | What it means | Where to go next |
| --- | --- | --- |
| `missing-baseline` | An active scenario has no approved baseline. Nothing was compared. | Step 2, then the baselines guide. Do **not** hunt for a UI bug. |
| `execution-failure` | A test crashed, or an expected snapshot was never captured. | Step 3. This is a broken test or a broken app, not a pixel change. |
| `visual-difference-non-blocking` | Comparison worked; pixels changed. CI is green. | Step 4. |
| `visual-difference-blocking` | Same, but strict mode is on. | Step 4. |
| `infrastructure-failure` | No `summary.json` was produced at all. | Step 6. |
| `corrupt-summary` | `summary.json` exists but is unusable. | Step 6. |

**2. If it is `missing-baseline`, you are already done diagnosing.** The summary
lists exactly which snapshot IDs lack an approved baseline. The fix is the
baseline approval process, not debugging. See
[`visual-regression-baselines.md`](./visual-regression-baselines.md).

**3. If it is `execution-failure`, read the annotations.** Each one names the
failing test and its first error line. A `missing-capture` failure means the test
died before reaching its `toHaveScreenshot()` — the error above it is the real
cause. Continue to step 5 for the trace.

**4. If it is a visual difference, look at the counts before the images.** The
summary table gives changed pixels and ratio per snapshot. A ratio around
`0.01–0.03` across *every* text-bearing screen is the signature of a font or
platform mismatch, not a design change. One snapshot with a large ratio and a
tight changed region is a real, local UI change.

**5. Download the artifact and open the trace.** See below.

**6. For an infrastructure failure, the artifact will not help.** Open the
**Run visual regression pipeline** step log directly and look for a Docker build
failure, an image pull failure, or a container that never started.

---

## Downloading the artifact

### Web interface

1. Open the workflow run.
2. Scroll to the **Artifacts** section at the bottom of the summary page.
3. Download one of:
   - **`visual-regression-artifacts`** — summary, reports, and the full tar.gz.
     Always present.
   - **`visual-regression-playwright-report`** — the expanded HTML report and
     `test-results/` including traces. Absent when the preflight blocked the run
     before Playwright started.
   - **`visual-regression-baseline-candidates`** — only from the baseline
     workflow.
4. Unzip it.

### GitHub CLI

```bash
# List artifacts for a run.
gh api "repos/CalibtOS/autheon-prototype/actions/runs/<run-id>/artifacts" \
  --jq '.artifacts[] | "\(.name)  \(.size_in_bytes) bytes"'

# Download one, or all.
gh run download <run-id> --name visual-regression-artifacts --dir ./vr
gh run download <run-id> --dir ./vr

# Then extract the inner archive, which holds the traces and the HTML report.
tar -xzf ./vr/autheon-visual-regression-artifact.tar.gz -C ./vr
```

The run id is the last path segment of the run URL, and it is printed in the
notification email next to the ready-made `gh run download` command.

---

## Artifact directory structure

```text
visual-regression-artifact/
  README.md                                 orientation
  visual-regression-summary/
    summary.json                            CANONICAL machine-readable result
    summary.md                              human summary
    manifest.json                           archive metadata + SHA-256 + gate
    coverage.json                           coverage result for this run
    visual-coverage.manifest.json           the registry this run used
    baseline-manifest.json                  the baseline provenance it verified
    notification-email.json                 the email payload that was built
    notification-email.html                 rendered email preview
    notification-status.json                delivery outcome + classified cause
    visual-regression-report.pdf            compact review report
  playwright-report/
    index.html                              HTML report: expected/actual/diff,
    data/                                   side-by-side and slider views
    trace/
  test-results/
    results.json                            Playwright JSON report
    results.xml                             JUnit XML
    <suite>-<test>-<project>/
      <snapshot>-expected.png               approved baseline
      <snapshot>-actual.png                 what this run rendered
      <snapshot>-diff.png                   highlighted difference
      trace.zip                             full trace
      video.webm                            retained on failure
      test-failed-1.png                     failure screenshot
      error-context.md                      page snapshot at failure
  approved-baseline/
    tests/regression/snapshots/             copy of the approved set, for review
```

`summary.json` is the single source of truth. The gate, the job summary, the
email, the PDF, and the coverage report are all rendered from it — so they cannot
disagree with each other.

---

## Opening a trace

```bash
npx playwright show-trace ./vr/visual-regression-artifact/test-results/<test-dir>/trace.zip
```

This opens the Trace Viewer locally in a browser. No network access to the CI
runner is needed; the trace is fully self-contained.

### What is in the Trace Viewer, and where

| You want | Where to look |
| --- | --- |
| **Action timeline** | The filmstrip and timeline across the top. Each action is a segment; click one to jump to that moment. |
| **Screenshots** | The filmstrip thumbnails. Hover to scrub; the large pane shows the frame at the selected action. |
| **DOM snapshots** | Select an action, then the **Before** / **Action** / **After** tabs in the main pane. This is a live, inspectable DOM — right-click → Inspect works. |
| **Network requests** | The **Network** tab. Status, timing, headers, and sizes for every request in the trace window. |
| **Console messages** | The **Console** tab. Page `console.*` output and uncaught page errors, interleaved with actions. |
| **Source location** | The **Source** tab. Highlights the spec line that ran the selected action. |
| **Errors** | The failing action is marked red in the timeline. The **Errors** tab (or **Call** tab for the selected action) shows the full assertion message and stack. |
| **Locator used** | The **Call** tab shows the resolved selector and its arguments. |
| **Metadata** | The **Metadata** tab: browser and version, viewport, project name, and the test's own attachments. |

### Reading a screenshot assertion failure

A `toHaveScreenshot()` failure names three files in its error message:

```
Expected: .../<snapshot>-expected.png     the approved baseline
Received: .../<snapshot>-actual.png       what this run rendered
    Diff: .../<snapshot>-diff.png         changed pixels highlighted
```

All three are in the same `test-results/<test-dir>/` folder and are also attached
to the test in the HTML report.

---

## Comparing expected / actual / diff

The HTML report is better than opening the PNGs directly, because it has aligned
comparison modes:

```bash
npx playwright show-report ./vr/visual-regression-artifact/playwright-report
```

Click the failed test, then the screenshot attachment. The report offers:

- **Diff** — changed pixels highlighted.
- **Actual** — this run only.
- **Expected** — the approved baseline only.
- **Side by side** — both at once. Best for spotting a layout shift.
- **Slider** — drag a divider across the two. Best for subtle colour and spacing
  changes that the diff view exaggerates.

### Identifying which scenario failed

Every snapshot ID maps to exactly one registry entry. Look it up:

```bash
node -e "
  const r = require('./tests/regression/visual-coverage.manifest.json');
  const id = process.argv[1];
  console.log(JSON.stringify(
    { ...r.defaults, ...r.scenarios.find(s => s.snapshotId === id) }, null, 2));
" 'admin-overview.png'
```

That prints the surface, screen, scenario, state, role, locale, theme, viewport,
screenshot mode, required interactions, masks, and owner — enough to know what
the snapshot is *supposed* to show without reading the spec.

---

## Reproducing the exact failure locally

The pinned Docker image is the canonical environment. A macOS run will not
reproduce a Linux pixel diff, which is why the wrapper refuses to compare against
Linux baselines on a non-Linux host.

```bash
# Same image, same browser build, same fonts, same baselines as CI.
npm run test:regression:ci

# Narrow to the smoke set while iterating.
npm run test:regression:ci -- --profile smoke

# Keep a trace and video for EVERY scenario, not just failures.
npm run test:regression:ci -- --profile diagnostic --diagnostic

# Skip the image rebuild when only test code changed.
npm run test:regression:ci -- --no-build

# Never send mail while iterating.
REGRESSION_NOTIFICATION_DRY_RUN=true npm run test:regression:ci
```

Artifacts land in `visual-regression-artifacts/docker-ci/`, laid out exactly as
in CI.

### Narrowing to one test

```bash
VISUAL_REGRESSION_CI_ARGS='--grep "job overview screen"' npm run test:regression:ci
```

### When Docker is unavailable

You can still exercise the framework end to end against your own platform's
scratch baselines. This validates the *pipeline*, not the pixels, and every
report is labeled non-canonical:

```bash
export VISUAL_REGRESSION_APPROVED_PLATFORM=darwin
node scripts/visual-baseline-manifest.mjs --write      # writes baseline-manifest.darwin.json
node scripts/visual-regression-ci.mjs -- --profile smoke
```

Never approve a baseline produced this way. Only `linux` baselines rendered in
the Docker image are approvable.

---

## Trace retention policy

| Setting | Default | Diagnostic mode |
| --- | --- | --- |
| `trace` | `retain-on-failure` | `on` (every test) |
| `screenshot` | `only-on-failure` | `on` |
| `video` | `retain-on-failure` | `on` |

The default keeps full evidence for exactly the tests that need investigating.
Diagnostic mode makes the artifact roughly an order of magnitude larger, so it is
opt-in: the `diagnostic` input on **Visual Regression**, or
`VISUAL_REGRESSION_DIAGNOSTIC=true`.

Visual retries are `0` on purpose. A screenshot mismatch is deterministic:
retrying reproduces the identical diff while tripling runtime and log noise.
Functional E2E projects keep their own retry policy.
