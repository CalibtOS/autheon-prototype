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

Run visual regression in CI artifact mode:

```bash
npm run test:regression:visual:ci
```

This creates `visual-regression-artifacts/autheon-visual-regression-artifact.tar.gz`
with the Playwright HTML report, `test-results`, approved baseline copy, and
`visual-regression-summary/summary.md` / `summary.json`. Visual screenshot
differences are reported as non-blocking findings; missing baselines or
technical test failures still fail the command.

The committed screenshot baselines currently use the `chromium-darwin` platform
suffix. Run visual CI on the same platform or approve a separate baseline set
for the CI runner platform.

Update regression baselines after approved UI/accessibility changes:

```bash
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
