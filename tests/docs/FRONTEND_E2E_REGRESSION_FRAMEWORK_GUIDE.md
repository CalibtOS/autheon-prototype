# Frontend E2E And Regression Testing Framework Guide

This is a portable implementation guide for setting up a professional
Playwright-based frontend testing framework in a new project.

It is project-agnostic. Replace placeholders such as `[PROJECT_NAME]`,
`[BASE_URL]`, `[LOGIN_PATH]`, `[DASHBOARD_PATH]`, `[ROLE_NAME]`, and
`[CI_PROVIDER]` with the target project's real values.

The framework is designed for:

- real E2E user flows
- fast PR smoke tests
- regression signals for UI, accessibility, console, browser network, HAR, API
  shape, scoped DOM, and performance guardrails
- evidence-first debugging with screenshots, trace, video, DOM, console,
  network summaries, raw HAR, normalized snapshots, and comparison JSON
- CI readiness for Jenkins or any other pipeline

## 1. Framework Goal

The framework should answer two different questions:

```text
E2E:        Can the user still complete an important flow?
Regression: Did important user-facing or browser behavior change unexpectedly?
```

The purpose is not to screenshot every page or automate every business journey
on day one. The purpose is to create a small but professional foundation that
can grow safely.

Core philosophy:

```text
Raw evidence is for debugging.
Normalized snapshots are for regression comparison.
Budgets are for performance guardrails.
Smoke tests are for PR safety.
Nightly tests are for deeper coverage.
```

Use this mental model:

| Type              | Purpose                           | Example                                 |
| ----------------- | --------------------------------- | --------------------------------------- |
| E2E test          | Prove a real user flow works      | login, create order, invite user        |
| Smoke test        | Fast critical safety check        | app loads, login page reachable         |
| Regression signal | Detect approved behavior changing | screenshot, ARIA, console, HAR snippet  |
| Evidence artifact | Help debug failures               | trace, video, DOM, raw HAR, logs        |
| Baseline          | Approved comparison target        | `.png`, `.aria.yml`, normalized `.json` |
| Budget            | Threshold, not exact equality     | max route time, max transfer size       |

Keep this distinction strict:

```text
Capture mechanism produces evidence.
Normalization produces a stable regression signal.
testInfo.attach publishes evidence into the report.
```

## 2. Recommended Folder Structure

Recommended structure for a new Playwright frontend project:

```text
tests/
  e2e/
    smoke/
      app-loads.spec.ts
    auth/
      login.spec.ts
      logout.spec.ts
    critical-flows/
      checkout.spec.ts
      create-record.spec.ts
    nightly/
      full-business-flow.spec.ts

  helpers/
    captcha-solver.ts
    click-until.ts
    form.ts
    inbox/
      zoho-inbox.ts
    totp/
      totp-helper.ts
      test-totp.ts

  regression/
    homepage.visual.spec.ts
    homepage.accessibility.spec.ts
    public-pages.spec.ts

    lab/
      README.md
      signals/
        explicit-assertions.spec.ts
        accessibility-regression.spec.ts
        visual-regression.spec.ts
        console-regression.spec.ts
        browser-network-regression.spec.ts
        har-snippet-regression.spec.ts
        scoped-dom-snapshot.spec.ts
        performance-budget.spec.ts
        snapshots/
          accessibility-regression.spec.ts-snapshots/
          visual-regression.spec.ts-snapshots/
          console-regression.spec.ts-snapshots/
          browser-network-regression.spec.ts-snapshots/
          har-snippet-regression.spec.ts-snapshots/

    support/
      README.md
      fixtures/
        auth-fixtures.ts
      collectors/
        console-errors.ts
        network-summary.ts
        performance-metrics.ts
      evidence/
        attachments.ts
        checkpoint.ts
      network/
        network-recorder.ts
        network-normalizer.ts
        network-comparator.ts
        network-baseline.ts
        har-snippet.ts
      console/
        console-recorder.ts
        console-normalizer.ts
        console-comparator.ts
        console-baseline.ts
      snapshots/
        visual-masks.ts
        dom-sanitizer.ts
      utils/
        stable-page.ts
        unique-data.ts
      regression-test.ts

    snapshots/
      homepage.visual.spec.ts-snapshots/
      homepage.accessibility.spec.ts-snapshots/
      public-pages.spec.ts-snapshots/

  setup/
    auth.setup.ts

  fixtures/
    users.ts
    roles.ts

  test-data/
    builders.ts
    cleanup.ts

  config/
    env.ts
```

### Folder Responsibilities

| Folder                       | What belongs there                                                      | What should not belong there                         |
| ---------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| `tests/e2e`                  | Real user journeys and business outcomes                                | Visual baselines, low-level browser evidence helpers |
| `tests/e2e/smoke`            | Fast PR safety checks                                                   | Long flows, third-party dependencies                 |
| `tests/e2e/critical-flows`   | Stable high-value flows                                                 | Experimental or flaky journeys                       |
| `tests/e2e/nightly`          | Slow, broad, external, or multi-role coverage                           | Fast PR blockers                                     |
| `tests/helpers`              | Cross-flow automation helpers reusable across projects                  | Regression baselines or one-off spec assertions      |
| `tests/regression`           | Product regression specs and approved baselines                         | Full business journeys                               |
| `tests/regression/lab`       | Learning/demo specs for regression signal types                         | Product-specific deep flows                          |
| `tests/regression/support`   | Reusable regression fixtures, collectors, evidence helpers, normalizers | One-off test logic                                   |
| `tests/regression/snapshots` | Approved product regression baselines                                   | Raw evidence from test runs                          |
| `tests/setup`                | Setup projects such as storage state generation                         | Business assertions                                  |
| `tests/fixtures`             | Users, roles, static fixtures                                           | Secrets or real credentials                          |
| `tests/test-data`            | Data builders and cleanup utilities                                     | Hidden shared state                                  |
| `tests/config`               | Env parsing and typed config                                            | Hardcoded project secrets                            |

### Naming Rules

Use names that describe the signal or flow:

```text
login.spec.ts
checkout.spec.ts
homepage.visual.spec.ts
console-regression.spec.ts
browser-network-regression.spec.ts
har-snippet-regression.spec.ts
```

Recommended suffixes:

| Suffix                                      | Use for                            |
| ------------------------------------------- | ---------------------------------- |
| `.spec.ts`                                  | Playwright test specs              |
| `.visual.spec.ts`                           | Visual baselines                   |
| `.accessibility.spec.ts` or `.aria.spec.ts` | ARIA/accessibility baselines       |
| `.structural.spec.ts`                       | Stable structure/navigation checks |
| `.auth-regression.spec.ts`                  | Authenticated regression tests     |

Create a new folder only when it separates a real responsibility. Avoid deep
nesting just to look organized.

## 3. Playwright Config Guide

A professional `playwright.config.ts` should define:

- where tests live
- how base URLs are loaded
- which projects run
- which artifacts are retained
- reporter outputs
- retry and worker behavior
- snapshot path strategy
- local dev server behavior
- CI behavior

### Recommended Config Template

```ts
import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '.env.testing') })
dotenv.config({ path: path.resolve(__dirname, '.env.e2e') })
dotenv.config({ path: path.resolve(__dirname, '.env') })

const BASE_URL = process.env.APP_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',

  snapshotPathTemplate:
    '{testDir}/{testFileDir}/snapshots/{testFileName}-snapshots/{arg}-{projectName}-{platform}{ext}',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toMatchAriaSnapshot: {
      pathTemplate: '{testDir}/{testFileDir}/snapshots/{testFileName}-snapshots/{arg}{ext}'
    }
  },

  reporter: [
    ['line'],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['html', { outputFolder: 'playwright-report', open: process.env.CI ? 'never' : 'on-failure' }]
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000
  },

  projects: [
    {
      name: 'auth setup',
      testMatch: /setup\/auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'chromium',
      testIgnore: [/setup\/.*\.ts/, /.*\.auth-regression\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'authenticated-regression',
      testMatch: [/regression\/.*\.auth-regression\.spec\.ts/],
      dependencies: ['auth setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json'
      }
    }
  ],

  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'pnpm dev',
          url: BASE_URL,
          reuseExistingServer: true,
          timeout: 120_000
        }
      })
})
```

### Config Decisions

| Setting                | Recommendation                          | Why                                                                    |
| ---------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| `testDir`              | `./tests`                               | Allows `e2e`, `regression`, and `setup` projects under one root        |
| `outputDir`            | `test-results`                          | Keeps screenshots, traces, videos, HAR, and JSON evidence in one place |
| `baseURL`              | From `APP_BASE_URL` or `E2E_BASE_URL`   | Makes local, preview, and CI runs portable                             |
| `trace`                | `retain-on-failure`                     | Best default for evidence without huge storage                         |
| `screenshot`           | `only-on-failure`                       | Keeps reports useful and small                                         |
| `video`                | `retain-on-failure`                     | Useful for long E2E flows and CI debugging                             |
| `reporter`             | `line`, `junit`, `html`                 | Terminal visibility, CI test result parsing, human report              |
| `timeout`              | 60 seconds                              | Good global ceiling for frontend flows                                 |
| `expect.timeout`       | 10 seconds                              | Lets web-first assertions wait for UI state                            |
| `retries`              | `2` in CI, `0` locally                  | Avoid hiding failures locally; collect more evidence in CI             |
| `workers`              | `1` in CI when state is shared          | Reduces flakes against shared envs                                     |
| `snapshotPathTemplate` | Dedicated snapshot folders              | Avoids clutter beside specs                                            |
| `webServer`            | Local only unless `E2E_BASE_URL` exists | CI often uses deployed/preview/container URL                           |

Add Firefox/WebKit projects only when the product needs cross-browser coverage.
Start with Chromium until the base framework is stable.

## 4. Package Scripts Guide

Recommended scripts:

```json
{
  "test:e2e": "playwright test tests/e2e --project=chromium",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:trace": "playwright show-trace",
  "test:smoke": "playwright test --grep \"@smoke|@public-regression\" --project=chromium",
  "test:regression": "playwright test tests/regression",
  "test:regression:update": "playwright test tests/regression --update-snapshots",
  "test:regression:visual:ci": "node scripts/visual-regression-ci.mjs",
  "test:regression:visual:ci:strict": "node scripts/visual-regression-ci.mjs --strict",
  "test:regression:lab": "playwright test tests/regression/lab",
  "test:regression:lab:update": "playwright test tests/regression/lab --update-snapshots",
  "test:regression:network": "playwright test tests/regression/lab/signals/browser-network-regression.spec.ts",
  "test:regression:har": "playwright test tests/regression/lab/signals/har-snippet-regression.spec.ts",
  "test:regression:console": "playwright test tests/regression/lab/signals/console-regression.spec.ts",
  "test:nightly": "playwright test tests/e2e --grep @nightly --pass-with-no-tests --project=chromium",
  "test:report": "playwright show-report"
}
```

| Script                       | Purpose                              | Local/CI                     | When to use                                     |
| ---------------------------- | ------------------------------------ | ---------------------------- | ----------------------------------------------- |
| `test:e2e`                   | Run E2E specs in Chromium            | Local and CI                 | Main E2E validation                             |
| `test:e2e:ui`                | Open Playwright UI mode              | Local                        | Explore, debug, author tests                    |
| `test:e2e:headed`            | Run headed browser                   | Local                        | See browser behavior                            |
| `test:e2e:debug`             | Debug with inspector                 | Local                        | Step through a failing test                     |
| `test:e2e:trace`             | Open a trace file                    | Local and CI artifact review | Inspect `trace.zip`                             |
| `test:smoke`                 | Fast smoke/public-regression gate    | PR CI and local              | PR safety check                                 |
| `test:regression`            | Run regression suite                 | CI and local                 | Compare approved UI/browser behavior            |
| `test:regression:update`     | Update approved regression baselines | Local only                   | After approved UI/behavior change               |
| `test:regression:visual:ci`  | Run visual CI wrapper and archive    | CI and local artifact checks | Warn on visual diffs; fail execution failures    |
| `test:regression:visual:ci:strict` | Run visual CI wrapper as a gate  | CI only when policy requires | Fail on visual diffs too                         |
| `test:regression:lab`        | Run signal lab                       | Local and optional CI        | Validate framework signal examples              |
| `test:regression:lab:update` | Update lab baselines                 | Local only                   | After approved lab baseline change              |
| `test:regression:network`    | Run browser network signal           | Local and CI if stable       | Investigate network behavior                    |
| `test:regression:har`        | Run HAR snippet signal               | Local and CI if stable       | Capture raw HAR plus compare normalized snippet |
| `test:regression:console`    | Run console behavior signal          | Local and CI if stable       | Catch console behavior changes                  |
| `test:nightly`               | Run slower/deeper tagged flows       | Nightly CI                   | Broad coverage not suited for every PR          |
| `test:report`                | Open HTML report                     | Local and artifact review    | Inspect failures and attachments                |

Useful optional additions:

```json
{
  "test:install-browsers": "playwright install --with-deps",
  "test:list": "playwright test --list",
  "test:regression:visual": "playwright test tests/regression --grep @visual-regression",
  "test:regression:har:update": "playwright test tests/regression/lab/signals/har-snippet-regression.spec.ts --update-snapshots"
}
```

Do not make update scripts run in CI. Baselines should be updated intentionally
by a person after reviewing diffs.

## 5. Jenkins And CI Guide

A professional QA pipeline should:

1. check out the requested branch
2. install dependencies
3. install Playwright browsers
4. build or start the app
5. wait for the app to be healthy
6. run smoke tests first
7. run E2E or regression suites according to pipeline type
8. always collect reports and artifacts
9. publish JUnit XML
10. publish HTML report, traces, videos, screenshots, HAR files, and JSON evidence
11. clean up containers and test environments

### Visual Regression CI Wrapper

Playwright correctly treats `toHaveScreenshot()` differences as failed test
expectations. CI/CD often needs a different policy:

```text
Functional or technical test failure -> CI failure
Missing approved baseline -> CI failure
Visual difference with expected/actual/diff evidence -> CI warning
Visual difference in strict mode -> CI failure
```

Use a small wrapper script around the visual suite instead of changing local
Playwright assertions. The wrapper should:

1. run the visual regression tests with the normal Playwright reporters
2. read `test-results/results.json`
3. classify screenshot mismatches separately from execution failures
4. write a human summary and a machine-readable JSON summary
5. append the human summary to `GITHUB_STEP_SUMMARY` when available
6. print concise terminal log lines for Jenkins and other CI logs
7. package one archive file for the CI artifact store
8. exit `0` for non-strict visual differences, but non-zero for execution
   failures or missing baselines

Recommended archive shape:

```text
visual-regression-artifact/
  README.md
  visual-regression-summary/
    summary.md
    summary.json
    manifest.json
  playwright-report/
    index.html
    data/
    trace/
  test-results/
    results.xml
    results.json
    ...
  approved-baseline/
    tests/regression/snapshots/
```

Keep the Playwright folders intact inside the archive. This preserves the HTML
report's expected/current/diff, side-by-side, and slider views after the archive
is extracted.

For AUTHEON, the CI wrapper is:

```bash
npm run test:regression:visual:ci
```

It writes:

```text
visual-regression-artifacts/autheon-visual-regression-artifact.tar.gz
visual-regression-artifacts/visual-regression-summary/summary.md
visual-regression-artifacts/visual-regression-summary/summary.json
visual-regression-artifacts/visual-regression-summary/manifest.json
```

The wrapper does not update approved snapshots. Approval still happens only by
running the update command after human review and committing the changed
baseline files.

### Local Docker CI Simulation

For local Jenkins-like validation, wrap the visual CI command in a disposable
Docker environment:

```bash
REGRESSION_NOTIFICATION_DRY_RUN=true npm run test:regression:visual:docker-ci
```

The local Docker runner:

1. builds `docker/visual-regression-ci.Dockerfile`
2. installs dependencies inside the image with `npm ci`
3. mounts the host artifact directory to `/app/visual-regression-artifacts`
4. runs `npm run test:regression:visual:ci`
5. sends or dry-runs notification email from `summary.json`
6. exits with the visual CI wrapper's effective exit code

The default host artifact directory is:

```text
visual-regression-artifacts/docker-ci/
```

Override it with:

```bash
VISUAL_REGRESSION_DOCKER_ARTIFACT_DIR=/absolute/or/repo-relative/path \
REGRESSION_NOTIFICATION_DRY_RUN=true \
npm run test:regression:visual:docker-ci
```

The Dockerfile defaults to `node:24-bookworm-slim` and installs only Chromium
with Playwright. If local Docker Hub access is unavailable, use an internal
mirror or a compatible cached base image:

```bash
VISUAL_REGRESSION_DOCKER_BASE_IMAGE=registry.example.com/node:24-bookworm-slim \
REGRESSION_NOTIFICATION_DRY_RUN=true \
npm run test:regression:visual:docker-ci
```

Docker runs Linux, while this prototype currently has committed
`*-chromium-darwin.png` visual baselines. For local simulation only, the
container aliases those approved Darwin PNGs to Linux snapshot names inside the
disposable container workspace before Playwright runs. This does not modify host
baselines and does not approve Linux baselines. Disable the aliasing with
`VISUAL_BASELINE_SKIP_PLATFORM_ALIAS=true` when validating a real Linux-approved
baseline set.

Notification environment:

```text
SMTP_HOST                         required to send real email
SMTP_PORT                         optional, default 587
SMTP_SECURE                       optional true/false, default false
SMTP_USER                         required to send real email
SMTP_PASSWORD                     required to send real email
SMTP_FROM                         optional, defaults to SMTP_USER
REGRESSION_NOTIFICATION_EMAIL     recipient, default youssef.elkondakly@calibtos.com
REGRESSION_NOTIFICATION_DRY_RUN   true writes notification-email.json without SMTP
REGRESSION_NOTIFY_ON_SUCCESS      true sends success emails too
REGRESSION_NOTIFICATION_REQUIRED  true makes notification send failure fail clean/warning runs
```

Do not store SMTP credentials in the repository. Supply them through your shell,
`.env` for local runs, or the CI secret manager. The local Docker runner loads
`.env` on the host and passes only allowed variables into Docker with `--env`;
`.env` is excluded from git and the Docker build context, so secrets are not
baked into the image.

Notification failure policy: notification failures are non-blocking by default.
The regression result remains authoritative because a mail outage should not
turn a non-blocking visual warning into a broken test run. If the team wants
notification delivery to be a hard requirement, set
`REGRESSION_NOTIFICATION_REQUIRED=true`.

Safe validation commands:

```bash
# Warning path: known visual differences should exit 0 and dry-run a warning email.
REGRESSION_NOTIFICATION_DRY_RUN=true npm run test:regression:visual:docker-ci

# Failure path: missing test dir simulates execution failure without editing specs.
REGRESSION_NOTIFICATION_DRY_RUN=true \
VISUAL_REGRESSION_TEST_DIR=tests/regression/__missing__ \
npm run test:regression:visual:docker-ci
```

### Persistent Visual Baseline

CI runners are temporary. Every visual run must start from an approved previous
baseline through one of these mechanisms:

```text
Preferred for this prototype: committed snapshots under tests/regression/snapshots
Alternative for larger products: restore a previously approved baseline artifact before running Playwright
```

Do not restore the current run's `actual` screenshots as the next baseline.
Only a reviewed and approved baseline archive may be restored into
`tests/regression/snapshots`.

Example restore step when using an externally approved baseline archive:

```bash
tar -xzf approved-visual-baseline.tar.gz -C .
test -d tests/regression/snapshots
```

The visual CI wrapper should fail before comparison if no approved visual
baseline is available.

Visual baselines are browser and platform specific when the snapshot path uses
`{projectName}` and `{platform}`. Run CI on the same OS/browser used for the
approved baseline, or create and approve a separate baseline for the CI platform
before enabling that runner. For example, a repository with
`*-chromium-darwin.png` baselines needs a macOS Chromium visual job unless
Linux Chromium baselines have also been approved.

### Jenkins Stage Template

```groovy
pipeline {
  agent any

  options {
    timeout(time: 60, unit: 'MINUTES')
  }

  environment {
    CI = 'true'
    E2E_BASE_URL = 'http://qa-app:3000'
    PLAYWRIGHT_HTML_OUTPUT_DIR = 'playwright-report'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'corepack enable || true'
        sh 'pnpm install --frozen-lockfile'
      }
    }

    stage('Install Playwright Browsers') {
      steps {
        sh 'pnpm exec playwright install --with-deps'
      }
    }

    stage('Build Or Start App') {
      steps {
        sh 'pnpm build'
        sh './ci/start-qa-app.sh'
      }
    }

    stage('Health Check') {
      steps {
        sh 'curl --fail --retry 30 --retry-delay 2 "$E2E_BASE_URL"'
      }
    }

    stage('Smoke Tests') {
      steps {
        sh 'pnpm test:smoke'
      }
    }

    stage('Regression Tests') {
      steps {
        sh 'pnpm test:regression'
      }
    }

    stage('Visual Regression Evidence') {
      steps {
        sh 'npm run test:regression:visual:ci'
      }
    }

    stage('Nightly Tests') {
      when {
        expression { env.RUN_NIGHTLY == 'true' }
      }
      steps {
        sh 'pnpm test:nightly'
      }
    }
  }

  post {
    always {
      sh 'mkdir -p "$WORKSPACE/playwright-report" "$WORKSPACE/test-results"'
      sh 'cp -r playwright-report/. "$WORKSPACE/playwright-report/" 2>/dev/null || true'
      sh 'cp -r test-results/. "$WORKSPACE/test-results/" 2>/dev/null || true'

      junit testResults: 'test-results/*.xml', allowEmptyResults: true

      archiveArtifacts(
        artifacts: 'playwright-report/**, test-results/**, visual-regression-artifacts/*.tar.gz',
        allowEmptyArchive: true
      )

      sh './ci/stop-qa-app.sh || true'
    }
  }
}
```

### Jenkins Artifact Rules

Always archive:

```text
playwright-report/**
test-results/**
visual-regression-artifacts/*.tar.gz
```

Those folders should contain:

- HTML report
- JUnit XML
- screenshots
- traces
- videos
- `00-failure-summary.md`
- DOM snapshots
- accessibility snapshots
- console errors
- network summaries
- raw HAR files
- normalized current/expected/comparison JSON

The single visual archive should contain the same Playwright report and
`test-results` structure plus `visual-regression-summary/summary.md` and
`visual-regression-summary/summary.json`. CI systems can upload only the archive
when they need one portable artifact, or upload both the expanded folders and
the archive when their report viewer supports direct HTML publishing.

### Failure Diagnostics

On failure, the pipeline should tell reviewers:

```text
Open the Playwright HTML report.
For visual diffs, open visual-regression-summary/summary.md first.
Open the failed test folder in test-results.
Read 00-failure-summary.md first.
Open trace.zip for action/network/timing detail.
Open raw HAR only when network forensics are needed.
```

### CI Secrets

Use CI credentials/secrets for:

- `E2E_BASE_URL`
- test account emails/passwords
- API tokens used only for test setup
- service credentials for safe QA environments

Never echo credentials, cookies, tokens, or raw auth headers into Jenkins logs.

## 6. E2E Test Design Rules

E2E tests should read like user journeys and assert business outcomes.

Selector priority:

1. `getByRole()` with accessible name
2. `getByLabel()`
3. `getByText()` for stable user-facing copy
4. `getByPlaceholder()` when stable
5. `getByTestId()` when the project has a test ID policy
6. scoped `locator()` for complex regions
7. XPath only as a last resort

Good:

```ts
await page.getByRole('button', { name: /save/i }).click()
await page.getByLabel(/email/i).fill(user.email)
await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
```

Risky:

```ts
await page.locator('.css-1abcxyz > div:nth-child(3)').click()
```

### E2E Test Template

```ts
import { test, expect } from '@playwright/test'

test.describe('Checkout @critical-flow', () => {
  test('customer can complete checkout', async ({ page }) => {
    await test.step('open product page', async () => {
      await page.goto('/products/example')
      await expect(page.getByRole('heading', { name: /example product/i })).toBeVisible()
    })

    await test.step('add product to cart', async () => {
      await page.getByRole('button', { name: /add to cart/i }).click()
      await expect(page.getByText(/added to cart/i)).toBeVisible()
    })

    await test.step('complete checkout', async () => {
      await page.getByRole('link', { name: /cart/i }).click()
      await page.getByRole('button', { name: /checkout/i }).click()
      await expect(page.getByText(/order confirmed/i)).toBeVisible()
    })
  })
})
```

Rules:

- test flows, not implementation details
- keep smoke tests small
- use stable test data
- do not depend on production data
- use storage state for authenticated suites when login is not the subject
- use page objects only when they remove real duplication
- prefer readable specs over clever abstractions

## 6A. Reusable Automation Helpers

Reusable helpers are not regression baselines. They are small automation tools
that make E2E flows practical across projects: forms, repeated clicks, inbox
verification, MFA codes, and authorized CAPTCHA handling.

The ATC project currently keeps these helpers in `tests/helpers`. For a new
project, keep the same folder if the suite is small, or split by domain when the
helper layer grows:

```text
tests/
  helpers/
    form.ts
    click-until.ts
    captcha-solver.ts
    inbox/
      zoho-inbox.ts
    totp/
      totp-helper.ts
      test-totp.ts
```

Use this rule:

```text
tests/helpers = reusable automation mechanics
tests/e2e = user journeys
tests/regression/support = regression evidence, collectors, normalizers, baselines
```

### Helper Inventory

| Helper                         | Portable purpose                                          | Typical flows                         | Important rule                                              |
| ------------------------------ | --------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| `form.ts`                      | Click a field, fill it, and verify the value              | login, register, checkout, settings   | Prefer role/label locators before CSS                       |
| `click-until.ts`               | Retry an action until the expected UI effect happens      | flaky wizards, drawers, menus         | Always use a bounded timeout and a real success condition   |
| `captcha-solver.ts`            | Solve or bypass CAPTCHA in an authorized test environment | third-party login, protected register | Prefer test bypass/test keys; never hardcode provider keys  |
| `zohoInbox.ts` or `inbox/*.ts` | Read activation or verification email programmatically    | register, password reset, invite flow | Use CI secrets and isolate the mailbox                      |
| `totp-helper.ts`               | Generate current MFA/TOTP codes from a Base32 secret      | 2FA login, sensitive settings         | Read the secret from env and avoid submitting near rollover |
| `test-totp.ts`                 | Manual diagnostic script for confirming TOTP config       | local setup debugging                 | Keep it out of CI and never commit a real secret            |

### Form Helper: Click Then Fill

The ATC `tests/helpers/form.ts` helper uses the automation style of clicking the
field before filling it:

```ts
await clickAndFill(page, {
  name: /email/i,
  value: user.email
})
```

This is useful because many frontend libraries attach behavior to focus events:
floating labels, masked inputs, validation state, autofill logic, and custom
select/textbox wrappers.

Recommended portable shape:

```ts
import { expect, type Page } from '@playwright/test'

interface ClickAndFillOptions {
  name: string | RegExp
  value: string
  exact?: boolean
  timeout?: number
}

export async function clickAndFill(
  page: Page,
  { name, value, exact, timeout = 10_000 }: ClickAndFillOptions
): Promise<void> {
  const field = page.getByRole('textbox', { name, exact }).or(page.getByLabel(name, { exact })).first()

  await expect(field).toBeVisible({ timeout })
  await expect(field).toBeEditable({ timeout })
  await field.click()
  await field.fill(value)
  await expect(field).toHaveValue(value, { timeout })
}
```

Use it for normal text fields. Do not force every component through this helper
when the field is a combobox, date picker, rich editor, or custom upload control.
Those deserve their own focused helpers.

### Click-Until Helper

`clickUntil` is for a specific problem: the click technically happens, but the UI
sometimes does not react. A normal `locator.click()` passes, yet the wizard,
menu, drawer, or navigation remains unchanged.

The professional pattern is:

```text
click -> check expected effect -> retry only if the effect did not happen
```

Example:

```ts
await clickUntil(
  page,
  page.getByRole('button', { name: /next/i }),
  page.getByRole('button', { name: /schedule or send/i }),
  {
    description: 'campaign wizard Next button',
    timeoutMs: 30_000,
    clickPattern: [1, 2]
  }
)
```

Good stop conditions:

- a locator becomes visible
- a dialog becomes hidden
- an element detaches from the DOM
- the URL contains or matches the expected route
- a custom predicate returns true

Rules:

- keep it bounded with `timeoutMs`
- include a `description` so timeout errors are readable
- prefer a user-visible success condition
- use `forceAfterAttempt` only when you understand why normal actionability is
  not enough
- do not use this helper to hide a deterministic product bug

### CAPTCHA Helper

CAPTCHA is a test-environment problem before it is an automation problem. The
best professional options are:

1. Disable CAPTCHA in QA/E2E using a server-side test flag.
2. Use official test keys if the provider supports them.
3. Use a solver only for authorized environments where no test bypass exists.

The ATC helper uses CapMonster-style create-task and poll-result behavior for
reCAPTCHA v2. When copying it into a new project, parameterize the project
details instead of hardcoding them:

```ts
const token = await solveCaptcha({
  providerApiKey: process.env.CAPMONSTER_API_KEY!,
  websiteURL: page.url(),
  websiteKey: recaptchaSiteKey,
  userAgent: await page.evaluate(() => navigator.userAgent)
})
```

Portable solver rules:

- read provider keys from env or CI secrets
- never commit solver API keys, CAPTCHA tokens, or real third-party secrets
- make CAPTCHA solving opt-in, for example `E2E_CAPTCHA_SOLVER=capmonster`
- skip tests clearly when the required provider secret is missing
- do not log the solved token
- attach only safe metadata such as provider name, attempts, and elapsed time
- never use a solver against systems where you do not have explicit permission

### Inbox Helper For Registration Flows

Registration, password reset, and invite flows often require reading an email.
ATC has a Zoho IMAP helper that can:

- load mailbox config from `.env.zoho.local`, `.env.testing`, `.env.e2e`, or
  `.env`
- connect using `ZOHO_IMAP_HOST`, `ZOHO_IMAP_PORT`, `ZOHO_IMAP_USER`, and
  `ZOHO_IMAP_PASS`
- search recent messages
- filter by recipient and sender
- extract links
- prefer activation/verification links by keyword
- wait until an activation link appears

Example E2E usage:

```ts
const activationLink = await waitForActivationLink(user.email, {
  attempts: 60,
  intervalMs: 1_000,
  fromEmail: process.env.E2E_ACTIVATION_FROM_EMAIL
})

await page.goto(activationLink)
await expect(page.getByRole('heading', { name: /account activated/i })).toBeVisible()
```

For a portable framework, place provider-specific implementations behind a small
interface:

```ts
export interface InboxClient {
  waitForLink(options: {
    toEmail: string
    fromEmail?: string
    subjectIncludes?: string | RegExp
    linkPattern?: RegExp
    attempts?: number
    intervalMs?: number
  }): Promise<string>
}
```

Then Zoho, Mailtrap, Mailosaur, Gmail, or a fake local inbox can implement the
same contract.

Inbox rules:

- use a dedicated QA mailbox or catch-all test domain
- keep mailbox credentials in CI secrets
- restrict searches by recipient, sender, subject, and recent time window
- avoid using personal or production mailboxes
- be careful with deleting or marking messages read when tests run in parallel
- print safe diagnostics only: subject, sender, date, recipient match, and link
  count are usually enough

### TOTP Helper For MFA

TOTP lets an E2E test pass MFA without manual interaction when the test user has
a known Base32 authenticator secret.

Portable usage:

```ts
import { generateTotpCode, msUntilNextToken } from '../helpers/totp/totp-helper'

const secret = process.env.E2E_TOTP_SECRET
if (!secret) {
  test.skip(true, 'E2E_TOTP_SECRET is required for MFA login tests')
}

if (msUntilNextToken() < 3_000) {
  await page.waitForTimeout(msUntilNextToken() + 500)
}

await clickAndFill(page, {
  name: /authentication code|verification code/i,
  value: generateTotpCode(secret)
})
```

Rules:

- keep TOTP secrets in env or CI secrets
- use seeded QA users dedicated to automation
- avoid submitting a code in the last few seconds of its 30-second window
- keep `test-totp.ts` as a local diagnostic script only
- never commit a real TOTP secret inside `test-totp.ts`

### When To Add A New Helper

Add a helper when the same automation mechanic appears in three or more specs,
or when the mechanic has risk that should be handled consistently, such as MFA,
email polling, file upload, payment test cards, or complex table filtering.

Do not add a helper just to hide one line of Playwright. The helper should make
the test more reliable or easier to read.

## 7. Regression Testing Strategy

Regression testing is a separate professional layer.

```text
E2E test = did the user flow work?
Regression signal = did important behavior change unexpectedly?
Evidence artifact = what do we inspect when it fails?
```

Recommended regression signals:

| Signal                      | What it catches                                         | Baseline type                               |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------- |
| Visual screenshot           | layout, color, spacing, missing UI                      | `.png`                                      |
| ARIA/accessibility snapshot | role/name/locator contract changes                      | `.aria.yml`                                 |
| Explicit assertions         | important visible controls and text                     | code assertions                             |
| Console behavior            | new/removed/changed console output                      | normalized `.json`                          |
| Browser network behavior    | changed browser-triggered requests                      | normalized `.json`                          |
| HAR entries                 | DevTools-like request archive normalized for comparison | normalized `.json` plus raw `.har` evidence |
| API contract                | direct endpoint status/shape                            | code assertions                             |
| Scoped DOM snapshot         | stable component markup                                 | sanitized `.html`                           |
| Performance budget          | timing/size guardrail                                   | thresholds                                  |

Do not compare full raw DOM or full raw HAR as your main regression signal.
Attach them as evidence; compare normalized stable data.

## 8. HAR-Based Regression Framework

HAR regression is useful when you want DevTools-like network evidence and a
stable regression signal from that evidence.

Correct architecture:

```text
browser.newContext({ recordHar }) creates raw HAR.
testInfo.outputPath() chooses where to save it.
context.close() finalizes the HAR file.
testInfo.attach() publishes raw HAR to the report.
The HAR parser creates normalized entries.
Filters select the entries that matter.
The comparable snapshot removes volatile fields.
The comparator checks baseline, status policy, forbidden endpoints, and budgets.
```

### Why Raw HAR Should Not Be Compared Directly

Raw HAR can contain:

```text
startedDateTime
serverIPAddress
connection
_connectionId
Date response header
raw cookies
Authorization
dynamic query values
exact timings
raw response bodies
cache details
generated asset names
third-party tracking calls
```

These are useful for investigation but noisy or sensitive as baselines.

Stable fields to keep:

```text
method
hostPattern
routePattern
queryKeys
status
statusText
mimeType
resourceType
requestGroup
isFirstParty
flowName
screenName
actionName
checkpointName
```

Timing and size are budgets, not equality baselines:

```text
timeMs
waitMs
receiveMs
contentSizeBytes
transferSizeBytes
```

Budget semantics:

```text
undefined budget = disabled
number > 0 = enabled
0 should not be used as a fallback
```

Using `0` as a fallback accidentally means every real request violates the
budget. Leave a budget undefined when you do not want to enforce it.

### HAR Capture With Auth

If the route needs login:

1. create a login context
2. login normally
3. save storage state to `testInfo.outputPath()`
4. close login context
5. create a fresh HAR-recording context with that storage state
6. navigate to the target route
7. close the context so HAR is written
8. attach the raw HAR
9. parse and compare normalized entries

Example:

```ts
import { expect, test } from '@playwright/test'
import { attachExistingEvidenceFile } from '../support/evidence/attachments'
import { createHarEntriesSnapshotFromFile, compareHarSnippetToBaseline } from '../support/network/har-snippet'

test('dashboard HAR entries after login @har-regression', async ({ browser }, testInfo) => {
  const checkpoint = {
    flowName: 'authenticated-dashboard',
    screenName: 'dashboard',
    actionName: 'page-load',
    checkpointName: 'dashboard-loaded-after-login'
  }

  const storageStatePath = testInfo.outputPath('authenticated-storage-state.json')
  const harPath = testInfo.outputPath('dashboard-page-load-full.har')

  const loginContext = await browser.newContext({ serviceWorkers: 'block' })
  const loginPage = await loginContext.newPage()

  await loginPage.goto('/login')
  await loginPage.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!)
  await loginPage.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD!)
  await loginPage.getByRole('button', { name: /log in|sign in/i }).click()
  await loginPage.waitForURL(/dashboard/)

  await loginContext.storageState({ path: storageStatePath })
  await loginContext.close()

  const harContext = await browser.newContext({
    storageState: storageStatePath,
    serviceWorkers: 'block',
    recordHar: {
      path: harPath,
      mode: 'full',
      content: 'embed'
    }
  })

  const page = await harContext.newPage()

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/dashboard/)
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined)

  await harContext.close()

  await attachExistingEvidenceFile(testInfo, 'dashboard-page-load-full.har', harPath, 'application/json')

  const currentHarSnapshot = await createHarEntriesSnapshotFromFile(harPath, {
    checkpoint,
    firstPartyHostnames: ['localhost:3000', '127.0.0.1:3000', 'api.example.com'],
    ignoreThirdParty: true,
    includeRoutePatterns: [/^\/dashboard$/, /^\/api\//],
    excludeMethods: ['OPTIONS'],
    excludeRequestGroups: ['preflight', 'static-asset', 'media'],
    includeQueryKeys: true
  })

  await compareHarSnippetToBaseline(testInfo, currentHarSnapshot, 'dashboard.har-entries.json', {
    allowExtraRequests: false,
    allowedStatusGroups: [2, 3],
    routeBudgets: [
      {
        routePattern: /^\/dashboard$/,
        maxTimeMs: 5000,
        maxWaitMs: 4000
      },
      {
        routePattern: /^\/api\//,
        maxTimeMs: 4000,
        maxWaitMs: 3000
      }
    ],
    forbiddenRoutePatterns: [/^\/api\/debug/, /^\/api\/test-only/]
  })
})
```

### Reusable HAR Helper Design

Recommended helper API:

```ts
type HarCheckpoint = {
  flowName: string
  screenName: string
  actionName: string
  checkpointName: string
}

type HarEntriesSnapshot = {
  allEntries: NormalizedHarEntry[]
  filteredEntries: NormalizedHarEntry[]
}

async function createHarEntriesSnapshotFromFile(
  harPath: string,
  options: HarNormalizationOptions
): Promise<HarEntriesSnapshot>

function createNormalizedHarEntries(har: HarFile, options: HarNormalizationOptions): NormalizedHarEntry[]

function filterHarEntries(entries: NormalizedHarEntry[], options: HarNormalizationOptions): NormalizedHarEntry[]

async function compareHarSnippetToBaseline(
  testInfo: TestInfo,
  currentSnapshot: HarEntriesSnapshot,
  snapshotName: string,
  options: HarComparisonOptions
): Promise<void>
```

### HAR Filters

Use whitelists to include what matters:

```ts
includeRoutePatterns: [/^\/dashboard$/, /^\/api\//]
includeMethods: ['GET', 'POST']
includeRequestGroups: ['document', 'api']
```

Use blacklist-as-ignore to remove known noise:

```ts
excludeMethods: ['OPTIONS']
excludeRequestGroups: ['preflight', 'static-asset', 'media']
excludeRoutePatterns: [/^\/_next\//, /^\/assets\//]
```

Use blacklist-as-failure for calls that should never happen:

```ts
forbiddenRoutePatterns: [/^\/api\/debug/, /^\/api\/test-only/]
```

Attach:

```text
raw HAR
all normalized entries
filtered normalized entries
comparable current entries
expected baseline
comparison result
```

## 9. Browser Network Regression

HAR and browser network event recording are related but not the same.

```text
HAR = archived network evidence
page.on('request/response') = live network observation
testInfo.attach = report attachment, not capture
normalized snapshot = the actual regression layer
```

| Need                     | Use                         |
| ------------------------ | --------------------------- |
| Stable PR network signal | browser network recorder    |
| DevTools-like evidence   | HAR                         |
| Forensic investigation   | HAR                         |
| Small clean baseline     | browser network recorder    |
| Full network archive     | HAR                         |
| Request/response policy  | either, after normalization |

Browser network recorder shape:

```ts
const recorder = startNetworkRecorder(page, {
  flowName: 'public-login',
  screenName: 'login',
  actionName: 'page-load',
  checkpointName: 'login-page-loaded'
})

await page.goto('/login')
await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible()
recorder.stop()

await recorder.attach(testInfo, 'browser-network-raw-evidence.json')

const normalized = normalizeNetworkEntries(recorder.entries(), {
  ignoreThirdParty: true,
  includeResourceTypes: ['document'],
  normalizeQueryParams: true
})

await compareNetworkBehaviorToBaseline(testInfo, normalized, 'login-page-load.network.json', {
  strictOrder: false,
  allowExtraRequests: true,
  allowedStatusGroups: [2, 3],
  maxDurationMs: 15000
})
```

## 10. Console Regression

There are two useful console layers:

```text
Console error gate = fail if unexpected errors appear.
Console behavior regression = compare normalized console output to a baseline.
```

Recommended collection:

```ts
page.on('console', message => {
  // capture type, text, URL, line, column
})

page.on('pageerror', error => {
  // capture uncaught page exceptions
})
```

Normalize before comparing:

- strip localhost port
- replace hashes/chunks with placeholders
- remove line numbers by default
- aggregate repeated messages with `count`
- optionally exclude justified local dev warnings

Use an allowlist carefully:

```ts
const LOCAL_DEV_CONSOLE_ALLOWLIST = [/known dev-only warning/]
```

Do not allowlist real production errors just to make tests green.

## 11. Evidence Attachments

Use `testInfo.attach()` to publish evidence to the HTML report.

Professional failure evidence should include:

```text
00-failure-summary.md
current-url.txt
test-failed-1.png
failure-screenshot-full-page.png
trace.zip
video.webm
error-context.md
dom.html
accessibility-snapshot.json
console-errors.json
network-summary.json
raw HAR files
normalized current entries
expected baseline
comparison diff/result
```

Attachment helper pattern:

```ts
import fs from 'fs/promises'
import path from 'path'
import type { TestInfo } from '@playwright/test'

export async function attachJsonEvidence(testInfo: TestInfo, name: string, value: unknown) {
  const filePath = testInfo.outputPath(name)

  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')

  await testInfo.attach(name, {
    path: filePath,
    contentType: 'application/json'
  })
}
```

Rule:

```text
Capture mechanism produces evidence.
testInfo.attach publishes evidence into the report.
```

`testInfo` does not create HAR. It saves, locates, and attaches artifacts.

## 12. Baseline Update Workflow

Run normally first:

```bash
pnpm test:regression
```

Run the CI visual wrapper when you need the same artifact and non-blocking
classification policy used in pipelines:

```bash
npm run test:regression:visual:ci
```

If a baseline fails:

1. open the HTML report
2. read `visual-regression-summary/summary.md` when the CI wrapper was used
3. read `00-failure-summary.md` for execution failures
4. inspect expected/current/diff evidence
5. decide whether the change is expected
6. update snapshots only if approved
7. review the Git diff
8. commit the updated baseline with a clear reason

Update commands:

```bash
pnpm test:regression:update
pnpm test:regression:lab:update
pnpm exec playwright test tests/regression/lab/signals/har-snippet-regression.spec.ts --update-snapshots
```

If your package manager passes arguments differently, use:

```bash
pnpm test:regression:har -- --update-snapshots
```

Never blindly update snapshots. A snapshot update is an approval of changed
behavior.

Do not let CI run update commands automatically. Current-run `actual`
screenshots may be archived as evidence, but they are not approved baselines
until a person reviews the diff and commits or publishes the new baseline
through the project's approval process.

## 13. Tags And Test Categories

Recommended tags:

```text
@smoke
@public-regression
@authenticated-regression
@network-regression
@har-regression
@visual-regression
@console-regression
@nightly
@flaky-investigation
```

Suggested CI mapping:

| Tag                         | PR CI         | Nightly CI  | Notes                            |
| --------------------------- | ------------- | ----------- | -------------------------------- |
| `@smoke`                    | yes           | yes         | Must be fast and reliable        |
| `@public-regression`        | yes           | yes         | Good PR safety layer             |
| `@authenticated-regression` | maybe         | yes         | Use when auth state is stable    |
| `@network-regression`       | maybe         | yes         | Start scoped and normalized      |
| `@har-regression`           | maybe         | yes         | Archive raw HAR only when useful |
| `@visual-regression`        | maybe         | yes         | Needs OS/browser baseline policy |
| `@console-regression`       | yes if stable | yes         | Good normalized signal           |
| `@nightly`                  | no            | yes         | Slow/deep/external flows         |
| `@flaky-investigation`      | no            | no blocking | Temporary investigation only     |

## 14. Test Data And Authentication

Use storage state when login is stable and reused:

```ts
// tests/setup/auth.setup.ts
import { test as setup, expect } from '@playwright/test'

setup('create storage state for [ROLE_NAME]', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!)
  await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD!)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await expect(page.getByRole('navigation')).toBeVisible()
  await page.context().storageState({ path: 'tests/.auth/user.json' })
})
```

Rules:

- keep credentials in env vars
- never commit storage state
- never commit TOTP secrets, inbox passwords, CAPTCHA provider keys, or solved
  CAPTCHA tokens
- use seeded users in QA
- use inbox helpers for registration, password reset, and invite flows
- use TOTP helpers for MFA users
- generate unique data names
- clean up records when needed
- avoid production data
- isolate multi-role tests

Example env file:

```dotenv
E2E_BASE_URL=http://localhost:3000
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
E2E_USER_EMAIL=
E2E_USER_PASSWORD=
E2E_TOTP_SECRET=
ZOHO_IMAP_USER=
ZOHO_IMAP_PASS=
ZOHO_IMAP_HOST=imappro.zoho.eu
E2E_ACTIVATION_FROM_EMAIL=
CAPMONSTER_API_KEY=
E2E_TEST_PREFIX=E2E
```

## 15. Flakiness Control

Prefer deterministic waits:

```ts
await expect(page.getByRole('button', { name: /save/i })).toBeEnabled()
await page.getByRole('button', { name: /save/i }).click()
await expect(page.getByText(/saved/i)).toBeVisible()
```

Avoid:

```ts
await page.waitForTimeout(5000)
```

Use `networkidle` carefully. Many SPAs keep background requests open or make
periodic calls. Prefer visible UI state, URL state, or a specific response when
possible.

Retry policy:

- local retries: `0`
- CI retries: `1` or `2`
- never use retries to ignore a known deterministic bug
- inspect traces from the first failing run

Flaky test triage:

| Symptom                        | Likely cause                    | Fix                          |
| ------------------------------ | ------------------------------- | ---------------------------- |
| element not found              | weak selector or wrong state    | assert page/region first     |
| timeout on navigation          | app/env issue or wrong URL wait | wait for correct URL pattern |
| passes headed, fails headless  | timing or viewport assumption   | use web-first assertions     |
| fails in CI only               | data/env/worker issue           | reduce workers, isolate data |
| screenshot mismatch only in CI | OS/browser baseline mismatch    | generate CI baselines        |

## 16. Implementation Checklist For A New Project

1. Inspect package manager, app framework, existing tests, env files, CI, auth,
   and docs.
2. Install Playwright if missing.
3. Create or update `playwright.config.ts`.
4. Add package scripts.
5. Create folder structure.
6. Add reusable automation helpers: `clickAndFill`, `clickUntil`, inbox, TOTP,
   and CAPTCHA only when authorized.
7. Add env loader and `.env.testing.example`.
8. Create first smoke test.
9. Create first E2E user flow.
10. Create regression fixture and evidence helper.
11. Create first visual or ARIA regression signal.
12. Create first console regression signal.
13. Create first browser network regression signal.
14. Create first HAR regression signal.
15. Configure CI.
16. Publish reports and artifacts.
17. Define baseline update process.
18. Define PR vs nightly strategy.

Validation commands:

```bash
pnpm exec playwright test --list
pnpm test:smoke
pnpm test:regression
pnpm test:report
```

## 17. Final Deliverables

### Minimum Framework Setup

Use this when starting from zero:

- Playwright installed
- `playwright.config.ts`
- `tests/e2e/smoke/app-loads.spec.ts`
- `tests/config/env.ts`
- reusable form helper and env loader
- package scripts
- HTML report and failure artifacts
- basic CI smoke stage

### Professional Framework Setup

Add:

- auth setup project with storage state
- role fixtures
- critical E2E flows
- reusable helper layer for forms, repeated clicks, inbox, MFA/TOTP, and
  authorized CAPTCHA handling
- regression folder
- snapshot path strategy
- failure evidence helper
- console error gate
- public regression tests
- Jenkins artifact publishing

### Advanced Regression Lab Setup

Add:

- visual screenshot baseline
- ARIA/accessibility baseline
- console behavior baseline
- browser network baseline
- HAR entries baseline
- scoped DOM snapshot
- performance budgets
- normalized expected/current/comparison attachments

### Common Mistakes

- comparing raw HAR directly
- comparing full DOM as the main baseline
- updating snapshots blindly
- using production data
- hardcoding credentials
- hardcoding TOTP secrets, inbox passwords, or CAPTCHA provider keys
- forgetting the reusable helper layer and re-solving the same automation
  mechanics in every spec
- relying on generated CSS classes
- using fixed waits everywhere
- running slow nightly flows as PR blockers too early
- keeping raw evidence but no normalized comparison
- attaching evidence only in memory instead of writing files to `test-results`
- treating `testInfo` as a capture mechanism instead of report/artifact plumbing

### How To Onboard A New Project In One Day

Morning:

1. inspect project, scripts, CI, routes, auth, env
2. add Playwright config and scripts
3. add smoke test
4. run `playwright test --list`

Midday:

5. add auth strategy
6. add first stable E2E flow
7. add failure evidence helper
8. publish HTML report locally

Afternoon:

9. add first regression signal
10. add first HAR/network signal if useful
11. wire Jenkins or CI smoke stage
12. document baseline update process
13. define PR vs nightly split

Done criteria:

- smoke test passes
- one E2E flow passes
- one regression signal passes
- reports and artifacts are readable
- CI can run at least smoke tests
- docs explain env, auth, selectors, data, and baseline updates
