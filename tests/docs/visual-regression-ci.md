# Visual Regression CI — Architecture and Gate Policy

Companion documents:
[baselines](./visual-regression-baselines.md) ·
[coverage](./visual-regression-coverage.md) ·
[notifications](./visual-regression-notifications.md) ·
[traces](./visual-regression-traces.md)

---

## Flow

```text
GitHub event (pull_request / push / workflow_dispatch / schedule)
│
├─ actions/checkout@v4 (fetch-depth: 0)
│     pull_request -> refs/pull/N/merge  (PR code as it would look on main)
│     Full history so merge-base, base SHA, and the baseline revision resolve.
│
├─ Resolve revisions ................. base SHA, head SHA, merge SHA, PR number
│                                       -> exported as GITHUB_* env
├─ setup-node 24 + npm ci ............ launcher only (dotenv); no browsers on host
│
├─ Host report (informational) ....... baseline manifest verify + coverage audit
│                                       Both exit 0 by design. Puts the numbers in
│                                       the log early; decides nothing.
│
├─ npm run test:regression:ci ........ raw exit code captured; job NOT aborted
│  │
│  └─ scripts/run-visual-regression-docker-ci.mjs   (host launcher)
│     ├─ docker build -f docker/visual-regression-ci.Dockerfile
│     │     node:24-bookworm-slim + npm ci + playwright install chromium
│     ├─ mount visual-regression-artifacts/docker-ci -> /app/visual-regression-artifacts
│     ├─ forward allow-listed env only (SMTP_*, VISUAL_*, REGRESSION_*, GITHUB_*)
│     │     .git is excluded from the build context, so provenance is passed in
│     └─ docker run
│        │
│        └─ scripts/docker-visual-regression-ci-entrypoint.mjs   (in container)
│           ├─ mode=test     -> scripts/visual-regression-ci.mjs
│           │  ├─ PRECHECK   baseline manifest + checksums + PNG validity
│           │  │             + platform guard + coverage registry validation
│           │  │             RECORDS findings; does NOT decide whether the run
│           │  │             happens. Execution stops only when comparison is
│           │  │             technically impossible (wrong renderer, no baselines
│           │  │             at all, missing spec dir) — and even then the summary,
│           │  │             artifacts and notification are still produced.
│           │  ├─ playwright test tests/regression --grep <profile> \
│           │  │             --project chromium --retries=0
│           │  ├─ classify   VISUAL_CHANGES | CAPTURE_FAILURE | BASELINE_MISSING |
│           │  │             COVERAGE_MISMATCH | INFRASTRUCTURE_FAILURE
│           │  ├─ coverage   expected vs produced; missing captures; orphans
│           │  ├─ gate       one canonical verdict object (non-blocking by default)
│           │  ├─ write      summary.json / summary.md / coverage.json /
│           │  │             manifest.json + copies of both input manifests
│           │  ├─ annotate   GitHub annotations + step summary
│           │  └─ archive    tar.gz: report + test-results + traces + baselines
│           │
│           └─ scripts/notify-visual-regression.mjs
│              ├─ SMTP preflight (names only, never values)
│              ├─ PDF report + inline expected/actual/diff (cid:)
│              ├─ transporter.verify() then sendMail()
│              └─ write notification status back into summary.json
│           
│           mode=baseline -> render candidates only; approve nothing
│
├─ Classify result .................. scripts/visual-regression-gate.mjs
│                                      if: always(); never exits non-zero
│                                      -> job summary, annotations, step outputs
│
├─ Upload artifacts ................. if: always()
│     visual-regression-artifacts .......... if-no-files-found: error
│     visual-regression-playwright-report .. if-no-files-found: warn
│     visual-regression-baseline-candidates  if-no-files-found: ignore
│
├─ Report notification status ....... annotation only; never changes the verdict
│
└─ Apply visual regression gate ..... LAST STEP. exit 0 unless an explicit
                                       strict policy was opted into.
```

### Why the gate is last

Every step before it runs with `if: always()` and none of them exits non-zero. An
early `exit 1` would skip artifact upload, so the diagnostics that explain the
finding would never leave the runner — which is exactly what made the original run
hard to diagnose.

---

## What this system is

It answers exactly one question:

> Did the UI visually change compared with the last **approved** baseline?

It is an **observability / review system, not a deployment gate**. A
visual-regression problem must never block the application pipeline. The goal is
`NON-BLOCKING`, not `INVISIBLE`: every finding is reported loudly — annotations,
job summary, email, artifact — while the pipeline continues.

## Classification model

Defined once in [`scripts/lib/visual-classification.mjs`](../../scripts/lib/visual-classification.mjs).
Nothing else derives a verdict.

| Category | Meaning | Comparison performed? | Blocking? |
| --- | --- | --- | --- |
| `VISUAL_CHANGES` | A comparison ran and the pixels differ | yes | **No** (default) |
| `CAPTURE_FAILURE` | The spec never reached its screenshot assertion | **no** | **No** |
| `BASELINE_MISSING` | No approved image exists to compare against | **no** | **No** |
| `COVERAGE_MISMATCH` | Registry / specs / baselines disagree | n/a | **No** |
| `INFRASTRUCTURE_FAILURE` | The engine itself could not run reliably | **no** | **No** |

Multiple categories legitimately coexist. "3 visual differences, 2 specs that
failed before capture, 1 missing baseline" is a valid result and is reported as
all three, not forced into one misleading reason.

The two blocking policies are **opt-in only**:

| Setting | Effect |
| --- | --- |
| `VISUAL_REGRESSION_STRICT=true` | `VISUAL_CHANGES` becomes blocking |
| `VISUAL_REGRESSION_FAIL_ON_INFRASTRUCTURE=true` | `INFRASTRUCTURE_FAILURE` becomes blocking |

### Why CAPTURE_FAILURE is separate from VISUAL_CHANGES

If a spec does

```ts
await page.getByRole('button', { name: 'Rename' }).click()
```

and the product has since renamed that control to **Edit Document**, the test
fails before it ever asks for a screenshot. That is **not** a visual change —
no pixels were compared. Reporting it as one would send a reviewer hunting for a
design regression that does not exist. It is a `CAPTURE_FAILURE`, and the report
says so explicitly:

```text
Snapshot:            driver-profile.png
Spec:                tests/regression/driver.visual.spec.ts
Reason:              Profile button not found
Visual comparison:   NOT PERFORMED
```

Coverage for that screen is unavailable until the spec is repaired.

### Why BASELINE_MISSING is separate

Without an expected image there is nothing to compare against. A current
screenshot may exist, but nothing can be concluded from it. Current screenshots
are **never** promoted into the approved baseline automatically — approval stays a
deliberate human action.

### Derived state

| State | When |
| --- | --- |
| `CLEAN` | everything expected was compared, nothing changed |
| `VISUAL_CHANGES` | changes found, everything else complete |
| `INCOMPLETE` | some snapshots could not be compared |
| `INCOMPLETE_WITH_VISUAL_CHANGES` | both of the above |
| `INFRASTRUCTURE_FAILURE` | the engine could not run reliably (wins outright) |

### One result model

`summary.json` is the canonical machine-readable result. The workflow gate, the
job summary, the annotations, the email, the PDF, the coverage report, and the
artifact metadata all read from it. Nothing re-derives the verdict from raw
counters or from a raw Playwright exit code, so they cannot disagree.

```json
{
  "state": "INCOMPLETE_WITH_VISUAL_CHANGES",
  "categories": ["VISUAL_CHANGES", "BASELINE_MISSING"],
  "comparison": { "expected": 52, "captured": 52, "compared": 43, "unchanged": 40, "changed": 3 },
  "visualDifferences":     [ { "snapshot": "...", "spec": "...", "expected": "...", "actual": "...", "diff": "..." } ],
  "captureFailures":       [ { "snapshot": "...", "spec": "...", "error": "...", "comparisonPerformed": false } ],
  "missingBaselines":      [ { "snapshot": "...", "comparisonPerformed": false } ],
  "coverageProblems":      [ { "snapshot": "...", "kind": "orphan-baseline", "reason": "..." } ],
  "infrastructureFailures": [],
  "gate": { "blocking": false, "strict": false, "exitCode": 0, "policy": { }, "reasons": [ ] }
}
```

`executionFailures` is retained as a deprecated compatibility union of
`captureFailures + infrastructureFailures`. Prefer the specific fields.

### The raw Playwright exit code is input, not the verdict

```text
Playwright raw execution result
        ↓
visual result classifier        <- decides meaning
        ↓
summary.json                    <- single source of truth
        ↓
gate / report / notification    <- read only
```

`REGRESSION_CI_EXIT_CODE` is deliberately no longer read by the notifier. It
previously fed a second verdict, which let a non-zero exit relabel a non-blocking
visual difference as an execution failure.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run test:regression` | Full regression suite, chromium, locally |
| `npm run test:regression:visual` | Visual specs only, no CI wrapper |
| `npm run test:regression:ci` | **The pipeline.** Docker/Linux, classify, archive, notify |
| `npm run test:regression:full` | Pipeline, `full` profile (the default) |
| `npm run test:regression:smoke` | Pipeline, `smoke` profile |
| `npm run test:regression:diagnostic` | Pipeline with traces/video for every scenario |
| `npm run test:regression:baseline` | Render baseline candidates (approves nothing) |
| `npm run test:regression:baseline:approve` | Promote reviewed candidates + regenerate the manifest |
| `npm run test:regression:baseline:manifest` | Regenerate the provenance record |
| `npm run test:regression:baseline:verify` | Verify approved images against the manifest |
| `npm run test:regression:coverage` | Coverage audit: gaps, orphans, duplicates |
| `npm run test:regression:notify-check` | SMTP smoke check (verify-only) |

`package.json` stays a thin command surface; all orchestration lives in
`scripts/`. The previous `test:regression:visual:*` names are kept as aliases so
nothing that already calls them breaks:

| Legacy name | Now equivalent to |
| --- | --- |
| `test:regression:visual:docker-ci` | `test:regression:ci` |
| `test:regression:visual:baseline:docker` | `test:regression:baseline` |
| `test:regression:visual:baseline:approve` | `test:regression:baseline:approve` |
| `test:regression:visual:ci` | in-container wrapper (unchanged; called directly by the entrypoint) |
| `test:regression:visual:notify` | notifier (unchanged) |

`test:regression:visual:update` was removed. It wrote Darwin PNGs on macOS, which
CI never uses, so it looked like a baseline update while producing nothing usable.
Use `test:regression:baseline` + `:approve`.

### Reproduce the CI flow locally

Byte-for-byte the same engine, image, and classification CI runs:

```bash
# Full pipeline in the canonical Docker/Linux environment, no email sent.
REGRESSION_NOTIFICATION_DRY_RUN=true npm run test:regression:ci

# Read the canonical result.
cat visual-regression-artifacts/docker-ci/visual-regression-summary/summary.json | jq '.state, .categories, .comparison, .gate.blocking'

# Human-readable version, and the rendered email that would have been sent.
cat  visual-regression-artifacts/docker-ci/visual-regression-summary/summary.md
open visual-regression-artifacts/docker-ci/visual-regression-summary/notification-email.html

# Static coverage audit only (no browser, no Docker, exits 0).
npm run test:regression:coverage
```

Reuse an already-built image with `-- --no-build`.

---

## CI-provider independence

All of the intelligence lives in `scripts/`. The CI provider only supplies an
environment and moves files.

| Layer | Knows about GitHub? |
| --- | --- |
| `scripts/lib/visual-classification.mjs` | no |
| `scripts/lib/visual-coverage.mjs` | no |
| `scripts/lib/visual-baseline.mjs` | no |
| `scripts/visual-regression-ci.mjs` (engine) | only reads optional `GITHUB_*` as **metadata** |
| `scripts/notify-visual-regression.mjs` | no |
| `scripts/run-visual-regression-docker-ci.mjs` | no |
| `scripts/visual-regression-gate.mjs` | **yes** — writes GitHub outputs/annotations |
| `.github/workflows/visual-regression.yml` | **yes** — orchestration only |

GitHub-specific values reach the engine as optional environment metadata
(`GITHUB_HEAD_SHA`, `GITHUB_BASE_SHA`, `GITHUB_PR_NUMBER`, `GITHUB_RUN_ID`, …).
When absent, the engine falls back to local `git` and reports `n/a`. Nothing
branches on the provider.

### What Jenkins will need (not implemented yet)

Unchanged — the entire engine:

```text
docker/visual-regression-ci.Dockerfile
scripts/lib/*.mjs
scripts/visual-regression-ci.mjs
scripts/run-visual-regression-docker-ci.mjs
scripts/docker-visual-regression-ci-entrypoint.mjs
scripts/notify-visual-regression.mjs
scripts/visual-coverage-audit.mjs
scripts/visual-baseline-manifest.mjs
tests/regression/**  (specs, registry, approved baselines)
summary.json contract
```

To be written:

1. A `Jenkinsfile` doing only: checkout (full history) → `npm ci` →
   `npm run test:regression:ci` → archive artifacts.
2. A replacement for `scripts/visual-regression-gate.mjs`, which is the one
   GitHub-coupled script. Split it, or add a `--format=jenkins` output mode: the
   *reading* of `summary.json` is already provider-neutral; only
   `setOutput`/`annotate`/`GITHUB_STEP_SUMMARY` are GitHub-specific.
3. Provenance env mapping — Jenkins exposes `GIT_COMMIT`, `CHANGE_ID`,
   `BUILD_NUMBER`, `BUILD_URL` instead of `GITHUB_*`. `gitMetadata()` already
   reads `GIT_BRANCH` and `GIT_COMMIT`, so this is a small addition.
4. Credentials: `SMTP_PASSWORD` moves from GitHub Secrets to Jenkins credentials.

Deliberately avoided so this stays portable: no `actions/*` dependency inside
`scripts/`, no reliance on GitHub artifact URLs for correctness (the email names
the artifact and the download command), and no provider-specific exit-code
semantics — the gate reads `summary.gate.blocking` and nothing else.

---

## Workflows

Notification configuration: `SMTP_PASSWORD` is the only GitHub Secret; the mail
host, account, sender, and recipient are committed values with a fallback in
`scripts/lib/smtp-preflight.mjs`. See
[notifications](./visual-regression-notifications.md) §2.

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| **Visual Regression** | `pull_request` (→ main), `push` (main), `workflow_dispatch`, nightly `schedule` | The pipeline and the gate |
| **Visual Regression Baseline** | `workflow_dispatch` only | Render candidates for review. Read-only token; cannot approve. |
| **Visual Regression Notification Check** | `workflow_dispatch` only | Verify SMTP config without running the suite |

All three declare `permissions: contents: read`.

Dispatch inputs on **Visual Regression**: `strict`, `profile`, `diagnostic`.

---

## Rendering-environment fingerprint

The canonical environment must be identical for the run and for the baselines it
compares against, or text rasterization shifts and every text-bearing screen
reports a difference no developer caused. Two gaps are actively guarded:

### CPU architecture

Playwright's `{platform}` token in `snapshotPathTemplate` is only `linux`. It does
**not** distinguish `linux/amd64` from `linux/arm64`, but Chromium rasterizes text
differently on the two — so an Apple Silicon laptop and a standard CI runner
produce different pixels for the same commit while writing to the same filename.

- `baseline-manifest.json` records `architecture`.
- A run whose `process.arch` differs from the baseline manifest's reports an
  `INFRASTRUCTURE_FAILURE` (non-blocking) instead of ~50 false visual changes.
- `VISUAL_REGRESSION_DOCKER_PLATFORM` pins the image (e.g. `linux/amd64`) so every
  machine renders identically. Unset = host-native, which is faster locally but
  only comparable to baselines approved on that same architecture.

### Base image digest

`node:24-bookworm-slim` is a **floating tag**. Rebuilding the image weeks later can
pull a different `fontconfig`/`freetype` and shift text rendering globally.

- The host launcher resolves the built image ID and passes it in as
  `VISUAL_REGRESSION_IMAGE_DIGEST`; it is recorded in the manifest and the summary.
- A digest difference between the run and the approved set is reported as a
  `COVERAGE_MISMATCH` (`image-digest-drift`).

**Diagnostic rule of thumb.** If a run reports that nearly every compared snapshot
changed, `unchanged` is ~0, dimensions are unchanged, and the changed region spans
the whole page — that is environment drift, not a UI regression. Check the two
findings above before reviewing 40 diff images.

Pinning the base image by digest would make this fully reproducible, at the cost of
re-approving the whole baseline set whenever the pin moves. That is a deliberate
product decision and is intentionally **not** applied automatically.

---

## Determinism

Pinned by `docker/visual-regression-ci.Dockerfile`: OS (Debian bookworm), Node
24, the Playwright version from `package-lock.json`, the Chromium build Playwright
downloads, and the installed font set.

Pinned by `playwright.config.ts` (`deterministicRendering`): `timezoneId`,
`locale`, `colorScheme`, `reducedMotion`, `deviceScaleFactor`, and an explicit
viewport per project.

Pinned by the test helpers: an injected stylesheet that collapses animations and
transitions; a wait for `document.fonts.ready`; explicit waits for the shell,
surface, and main heading; `mask` on the only live region (the marketplace date);
and a document-title assertion that the base URL really serves AUTHEON — because
`webServer.reuseExistingServer` will otherwise silently adopt an unrelated process
already listening on the dev port and compare AUTHEON baselines against a
different application.

Data is deterministic because the prototype re-seeds a fixed in-memory store on
every page load. That is also why empty/loading/error states are a declared
coverage gap: there is no fixture override hook.

> Editing `deterministicRendering` changes rendering and invalidates the approved
> baselines. Treat it as a baseline refresh.

---

## Artifacts

See [traces](./visual-regression-traces.md) for the full directory tree and how
to open a trace.

| Artifact | `if-no-files-found` | Why |
| --- | --- | --- |
| `visual-regression-artifacts` | `error` | Mandatory. A failed run with no summary cannot be interpreted. |
| `visual-regression-playwright-report` | `warn` | Legitimately absent when the preflight blocked before Playwright ran. |
| `visual-regression-baseline-candidates` | `ignore` | Only produced in baseline mode. |

Retention: 30 days for results, 14 for candidates.

### Artifact URL in the email

The notifier runs **inside** the pipeline, before `actions/upload-artifact` has
created the artifact, so an artifact-specific download URL is not knowable at send
time. The email therefore links the **run**, names the artifact, and includes the
exact `gh run download <run-id> --name <artifact>` command. No artifact ID is
hardcoded — a stale ID from a previous run would 404.
