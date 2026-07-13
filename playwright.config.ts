import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

for (const fileName of ['.env.testing', '.env.e2e', '.env']) {
  loadDotenv({
    path: path.resolve(process.cwd(), fileName),
    override: false,
  });
}

const localBaseURL = `http://127.0.0.1:${Number(process.env.E2E_PORT || 4173)}`;
const baseURL = process.env.E2E_BASE_URL || process.env.APP_BASE_URL || localBaseURL;
const shouldStartWebServer = !process.env.E2E_BASE_URL && !process.env.APP_BASE_URL;

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
    },
    toMatchAriaSnapshot: {
      pathTemplate:
        '{testDir}/{testFileDir}/snapshots/{testFileName}-snapshots/{arg}{ext}',
    },
  },

  reporter: [
    ['line'],
    ['junit', { outputFile: 'test-results/results.xml' }],
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
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1100 },
      },
    },
  ],

  ...(shouldStartWebServer
    ? {
        webServer: {
          command: 'npm run dev',
          url: localBaseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }
    : {}),
});
