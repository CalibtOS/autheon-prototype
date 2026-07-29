import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

for (const fileName of ['.env.testing', '.env.e2e', '.env']) {
  loadDotenv({
    path: path.resolve(process.cwd(), fileName),
    override: false,
  });
}

const localPort = Number(process.env.E2E_PORT || 4173);
const localBaseURL = `http://127.0.0.1:${localPort}`;
const baseURL = process.env.E2E_BASE_URL || process.env.APP_BASE_URL || localBaseURL;
const shouldStartWebServer = !process.env.E2E_BASE_URL && !process.env.APP_BASE_URL;

const isTruthy = (value: string | undefined): boolean =>
  ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());

/**
 * Diagnostic mode: retain a trace and a video for EVERY scenario, pass or fail.
 *
 * Off by default because recording ~47 traces and videos per run makes the
 * artifact an order of magnitude larger for no benefit on a green run. Turn it
 * on for deep debugging via the workflow_dispatch `diagnostic` input or
 * VISUAL_REGRESSION_DIAGNOSTIC=true.
 */
const diagnosticMode = isTruthy(process.env.VISUAL_REGRESSION_DIAGNOSTIC);

/**
 * Rendering inputs pinned so a screenshot depends only on the application.
 *
 * Anything left unpinned here becomes a source of false diffs when a runner
 * image, a host locale, or a CI timezone changes. The OS, browser build, and
 * font set are pinned separately by docker/visual-regression-ci.Dockerfile —
 * these are the settings Playwright itself controls.
 *
 * Changing any value in this block changes rendering and therefore invalidates
 * the approved baselines. Treat an edit here as a baseline refresh: run the
 * "Visual Regression Baseline" workflow, review, approve, and commit.
 */
const deterministicRendering = {
  // Fixed so any Intl/date formatting renders identically regardless of runner.
  timezoneId: 'Europe/Berlin',
  locale: 'en-US',
  // The app drives its own theme through a data-theme attribute; pinning the OS
  // preference stops a runner default from leaking into media queries.
  colorScheme: 'light' as const,
  // Belt and braces with the animation-disabling stylesheet the visual helper
  // injects: this also suppresses animations the stylesheet cannot reach.
  reducedMotion: 'reduce' as const,
  deviceScaleFactor: 1,
} as const;

/**
 * Viewport projects.
 *
 * `chromium` is the canonical presentation viewport and owns every approved
 * baseline today. The rest are the targets for the registered-but-unimplemented
 * coverage in tests/regression/visual-coverage.manifest.json (the /pwa/ route
 * and the large-desktop admin layout). They are wired to `matrix.visual.spec.ts`,
 * which does not exist yet, so they deliberately match zero tests. That keeps the
 * registry's viewport -> project mapping real and validated by the coverage
 * audit, without adding snapshots nobody has approved.
 */
const plannedMatrixSpec = /matrix\.visual\.spec\.ts/;

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
    toHaveScreenshot: {
      animations: 'disabled',
      // Wait for the rendered result to stop changing between frames instead of
      // sleeping. A fixed sleep is either too short (flake) or too long (slow).
      scale: 'css',
    },
    toMatchAriaSnapshot: {
      pathTemplate:
        '{testDir}/{testFileDir}/snapshots/{testFileName}-snapshots/{arg}{ext}',
    },
  },

  reporter: [
    ['line'],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    [
      'html',
      {
        outputFolder: 'playwright-report',
        open: 'never',
      },
    ],
  ],

  use: {
    baseURL,
    // Evidence policy. `retain-on-failure` keeps a full trace (actions, DOM
    // snapshots, network, console, source) for exactly the tests that need
    // investigating; diagnostic mode keeps everything.
    trace: diagnosticMode ? 'on' : 'retain-on-failure',
    // In addition to the explicit visual snapshots, not instead of them.
    screenshot: diagnosticMode ? 'on' : 'only-on-failure',
    video: diagnosticMode ? 'on' : 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ...deterministicRendering,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...deterministicRendering,
        viewport: { width: 1440, height: 1100 },
      },
    },

    // ---- Registered viewport matrix (no approved baselines yet) ----
    {
      name: 'pwa-phone-320',
      testMatch: plannedMatrixSpec,
      use: {
        ...devices['Desktop Chrome'],
        ...deterministicRendering,
        viewport: { width: 320, height: 568 },
        isMobile: false,
        hasTouch: true,
      },
    },
    {
      name: 'pwa-phone-390',
      testMatch: plannedMatrixSpec,
      use: {
        ...devices['Desktop Chrome'],
        ...deterministicRendering,
        viewport: { width: 390, height: 844 },
        isMobile: false,
        hasTouch: true,
      },
    },
    {
      name: 'pwa-phone-430',
      testMatch: plannedMatrixSpec,
      use: {
        ...devices['Desktop Chrome'],
        ...deterministicRendering,
        viewport: { width: 430, height: 932 },
        isMobile: false,
        hasTouch: true,
      },
    },
    {
      name: 'pwa-tablet-834',
      testMatch: plannedMatrixSpec,
      use: {
        ...devices['Desktop Chrome'],
        ...deterministicRendering,
        viewport: { width: 834, height: 1112 },
        isMobile: false,
        hasTouch: true,
      },
    },
    {
      name: 'admin-desktop-1920',
      testMatch: plannedMatrixSpec,
      use: {
        ...devices['Desktop Chrome'],
        ...deterministicRendering,
        viewport: { width: 1920, height: 1200 },
      },
    },
  ],

  ...(shouldStartWebServer
    ? {
        webServer: {
          // Pass the port through explicitly. `npm run dev` hardcodes 4173, so
          // an E2E_PORT override used to change only the URL Playwright waited
          // on, leaving it polling a port nothing was listening to.
          command: `npx http-server . -a 127.0.0.1 -p ${localPort} -c-1`,
          url: localBaseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }
    : {}),
});
