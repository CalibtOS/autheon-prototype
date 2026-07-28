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
├─ Host preflight (advisory) ......... baseline manifest verify + coverage audit
│                                       continue-on-error: fails fast and cheaply,
│                                       but the in-container preflight is the gate
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
│           │  ├─ PREFLIGHT  baseline manifest + checksums + PNG validity
│           │  │             + platform guard + coverage registry validation
│           │  │             BLOCKING. Playwright does not start if this fails.
│           │  ├─ playwright test tests/regression --grep <profile> \
│           │  │             --project chromium --retries=0
│           │  ├─ classify   visual difference | missing baseline | execution failure
│           │  ├─ coverage   expected vs produced; missing captures; orphans
│           │  ├─ gate       one canonical verdict object
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
└─ Apply visual regression gate ..... LAST STEP. exit 1 iff blocking.
```

### Why the gate is last

Every step before it runs with `if: always()` and none of them exits non-zero. An
early `exit 1` would skip artifact upload, so the diagnostics that explain the
failure would never leave the runner — which is exactly what made the original run
hard to diagnose.

---

## Gate policy

| Classification | Blocking? | Rationale |
| --- | --- | --- |
| Confirmed visual difference | **No** (default) | The comparison worked and baselines exist. This is a review item, not a broken build. |
| Confirmed visual difference, strict mode | Yes | `VISUAL_REGRESSION_STRICT=true`, or the `strict` dispatch input. |
| Missing approved baseline | **Yes** | Nothing was compared. A green build here would be a lie. |
| Missing expected capture | **Yes** | The test died before its assertion. Reported as an execution failure. |
| Execution failure | **Yes** | Broken test or broken app. |
| Browser / server startup failure | **Yes** | Infrastructure. |
| Baseline retrieval failure | **Yes** | Includes checksum mismatch and corrupt PNG. |
| Corrupt or absent `summary.json` | **Yes** | Without the canonical result there is nothing to classify. |
| Invalid coverage registry | **Yes** | If the expected list cannot be trusted, neither can the coverage number. |
| Failed report generation with no usable result | **Yes** | |
| Incomplete shard | **Yes** | A missing shard summary is detected, not averaged away. |
| Explicitly excluded scenario | No | Only when `exclusionReason` is documented. |
| Notification failure | **No** | Reported separately. Never overwrites the regression classification. |

Missing baselines are **not** downgraded to warnings. That was the correct verdict
in the original failing run and it stays.

### One result model

`summary.json` is the canonical machine-readable result. The workflow gate, the
job summary, the annotations, the email, the PDF, the coverage report, and the
artifact metadata all read from it. Nothing re-derives the verdict from raw
counters, so they cannot disagree.

`summary.gate` holds the decision:

```json
{
  "blocking": true,
  "strict": false,
  "exitCode": 1,
  "policy": { "visual-difference": "non-blocking", "missing-baseline": "blocking", "...": "..." },
  "reasons": [ { "classification": "missing-baseline", "blocking": true, "detail": "..." } ]
}
```

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
