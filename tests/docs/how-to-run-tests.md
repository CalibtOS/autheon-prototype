# How To Run AUTHEON Prototype Tests

## Install

```bash
npm install
```

## Install Playwright browsers

```bash
npm run test:install-browsers
```

This installs Chromium for the current Playwright project.

## Local dev server

```bash
npm run dev
```

The static prototype is served from the repository root at:

```text
http://127.0.0.1:4173
```

Playwright starts this server automatically when neither `E2E_BASE_URL` nor `APP_BASE_URL` is set.

## Base URL configuration

Base URL priority:

1. `E2E_BASE_URL`
2. `APP_BASE_URL`
3. `http://127.0.0.1:4173`

Use `E2E_BASE_URL` for CI or preview environments.

## Test commands

List tests:

```bash
npm exec playwright test --list
```

Run smoke tests:

```bash
npm run test:smoke
```

Run E2E tests:

```bash
npm run test:e2e
```

Run regression tests:

```bash
npm run test:regression
```

Run the full visual regression pipeline (Docker/Linux, the canonical CI command):

```bash
npm run test:regression:ci
```

This builds the Docker image, runs the visual suite inside it, and creates
`visual-regression-artifacts/docker-ci/…` with the Playwright HTML report,
`test-results`, approved baseline copy, `visual-regression-summary/summary.md` /
`summary.json`, the PDF report, and one `.tar.gz` archive. Visual screenshot
differences are reported as non-blocking findings; missing baselines or
technical test failures fail the command.

### Canonical visual environment: Docker/Linux

Baselines are platform-specific (`*-chromium-darwin.png`, `*-chromium-linux.png`)
because macOS and Linux rasterize fonts differently — the same page produces
1–3% pixel differences across OSes with zero UI changes. CI visual regression
therefore runs in Docker/Linux and compares only against approved
`*-chromium-linux.png` baselines that were themselves rendered in that same
Docker image. Darwin baselines are never renamed or aliased to Linux baselines.

Baseline lifecycle:

```text
First-time platform setup:
  npm run test:regression:baseline   # generate CANDIDATES
  review visual-regression-artifacts/docker-ci/baseline-candidates/
  npm run test:regression:baseline:approve  # promote into tests/regression/snapshots
  git commit the snapshot changes                  # approval is final only when committed

Normal CI run:
  npm run test:regression:ci         # compare against approved Linux baselines

Intentional UI change:
  review expected/actual/diff in the report, then regenerate candidates,
  approve, and commit — never update baselines automatically in CI.

Incorrect UI change:
  fix the code; the baseline stays unchanged.
```

The candidate/approve split keeps four artifact types separate: approved
baselines (committed snapshots), baseline candidates
(`baseline-candidates/` in the artifact dir), actual screenshots
(`test-results/**-actual.png`), and diff images (`test-results/**-diff.png`).

For local development on macOS, run the visual suite through Docker
(`npm run test:regression:ci`) so every comparison uses the one
canonical rendering environment. Native `npm run test:regression:visual` runs
on a Mac compare against `*-chromium-darwin.png` baselines and are only
meaningful if that legacy Darwin baseline set is kept up to date.

Run the local Docker-based CI simulation:

```bash
REGRESSION_NOTIFICATION_DRY_RUN=true npm run test:regression:ci
```

This builds `autheon-visual-regression-ci:local`, installs dependencies with
`npm ci` inside the image, runs the visual CI wrapper
(`scripts/visual-regression-ci.mjs`; visual suite retries default to 0 —
screenshot mismatches are deterministic, so retrying them only repeats the
identical failure; override with `VISUAL_REGRESSION_RETRIES`), sends or dry-runs
the notification email, and preserves artifacts on the host under:

```text
visual-regression-artifacts/docker-ci/
```

Real SMTP email requires environment variables:

```text
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
REGRESSION_NOTIFICATION_EMAIL
```

`REGRESSION_NOTIFICATION_EMAIL` defaults to
`youssef.elkondakly@calibtos.com`. Use
`REGRESSION_NOTIFICATION_DRY_RUN=true` to validate the notification path without
sending mail; the generated email payload is written to
`visual-regression-summary/notification-email.json`, and the rendered HTML is
written to `visual-regression-summary/notification-email.html`.

Warning and failure notifications are report-style emails. For each visual
difference, the HTML email embeds the expected, actual, and diff screenshots
with CID-backed inline image attachments so email clients such as Gmail can
render the comparison without relying on local filesystem URLs. When visual
differences, missing baselines, or execution failures exist, the notifier also
generates and attaches:

```text
visual-regression-summary/visual-regression-report.pdf
```

The PDF contains an executive summary and full-size expected, actual, and diff
pages for every visual difference. The full `.tar.gz` artifact is not attached
by default because it includes Playwright report data, traces, and videos and
can grow large. To attach it only when it is below a size limit, set:

```text
REGRESSION_ATTACH_ARCHIVE=true
REGRESSION_ARCHIVE_ATTACHMENT_MAX_MB=10
```

The local runner loads `.env` automatically on the host and passes only the
allowed SMTP/visual-regression variables into Docker with `--env`. `.env` is
excluded from git and the Docker build context, so secrets are not baked into
the image.

Notification delivery failures are reported in the terminal but do not fail the
CI simulation by default. Set `REGRESSION_NOTIFICATION_REQUIRED=true` if a clean
or warning-only run should fail when email cannot be sent.

The Dockerfile uses `node:24-bookworm-slim` by default and installs only
Chromium. If Docker Hub access is unavailable locally, point
`VISUAL_REGRESSION_DOCKER_BASE_IMAGE` at a compatible internal mirror.

Safe local validation commands:

```bash
# Warning path: known visual differences should exit 0 and dry-run a warning email.
REGRESSION_NOTIFICATION_DRY_RUN=true npm run test:regression:ci

# Failure path: missing test dir simulates a real execution failure and exits non-zero.
REGRESSION_NOTIFICATION_DRY_RUN=true \
VISUAL_REGRESSION_TEST_DIR=tests/regression/__missing__ \
npm run test:regression:ci
```

Update regression baselines after approved UI/accessibility changes:

```bash
# Canonical Docker/Linux visual baselines (candidates -> review -> approve -> commit):
npm run test:regression:baseline
npm run test:regression:baseline:approve

# Local-platform (non-visual or Darwin) baselines:
npm run test:regression:update
```

Open the HTML report:

```bash
npm run test:report
```

Debug locally:

```bash
npm run test:e2e:ui
npm run test:e2e:headed
npm run test:e2e:debug
```

## Smoke vs E2E vs regression

Smoke tests are fast PR safety checks. They prove the app shell loads and critical header controls still work.

E2E tests prove real user-facing workflows. The first E2E flow proves Admin publishing a draft tour affects Driver PWA marketplace state.

Regression tests detect unexpected approved-behavior changes. The first regression layer uses visual, ARIA, structural, and console/page-error signals.

Evidence artifacts help debugging. Screenshots, HTML, current URL, failure summary, and console errors are attached on failures.

## Baseline update warning

Do not update snapshots automatically in CI.

Only run `npm run test:regression:update` after reviewing the visual or ARIA diff and deciding the changed behavior is expected. Snapshot updates approve the new expected behavior.

## Known prototype limitations

- No real authentication exists, so there is no auth setup project or committed storage state.
- App state is seeded in memory and resets on page reload.
- The root app is rendered inside an iframe.
- The app uses CDN-hosted React, ReactDOM, Babel, and Google fonts.
- There is no route-based navigation.
- Some clickable UI is not semantically exposed as buttons or links.
- Locale and theme are persisted in localStorage only.
- Visual regression masks the dynamic Driver marketplace open-tours/date line.

## Recommended next flows to automate

1. Admin assigns draft tour `0839-26` to `Jordan Blake`; Driver My jobs shows the assignment.
2. Driver accepts published tour `0847-26`; Admin overview and notification feed reflect the accepted tour.
3. Driver reports a special case; Admin special-case panel can resolve it.
4. Admin publishes an Infopoint message; Driver Infopoint shows it in EN and DE.
5. Driver submits a profile change request; Admin profile change requests can approve or reject it.
