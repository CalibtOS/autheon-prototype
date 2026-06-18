import fs from 'node:fs/promises';
import path from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import type { ConsoleProblem } from '../collectors/console-errors.ts';
import { buildFailureSummary } from './failure-summary.ts';
import { getPrototypeFrame } from '../helpers/selectors.ts';

export async function attachTextEvidence(
  testInfo: TestInfo,
  name: string,
  body: string,
  contentType = 'text/plain',
): Promise<void> {
  const filePath = testInfo.outputPath(name);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body, 'utf8');
  await testInfo.attach(name, { path: filePath, contentType });
}

export async function attachJsonEvidence(
  testInfo: TestInfo,
  name: string,
  value: unknown,
): Promise<void> {
  await attachTextEvidence(
    testInfo,
    name,
    `${JSON.stringify(value, null, 2)}\n`,
    'application/json',
  );
}

export async function attachCurrentURL(
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  await attachTextEvidence(testInfo, 'current-url.txt', `${page.url()}\n`);
}

export async function attachPrototypeHTML(
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  let html = '';
  try {
    const frame = await getPrototypeFrame(page);
    html = await frame.content();
  } catch {
    html = await page.content();
  }

  await attachTextEvidence(testInfo, 'prototype-frame.html', html, 'text/html');
}

export async function attachFailureScreenshot(
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  const filePath = testInfo.outputPath('failure-screenshot-full-page.png');
  await page.screenshot({ path: filePath, fullPage: true });
  await testInfo.attach('failure-screenshot-full-page.png', {
    path: filePath,
    contentType: 'image/png',
  });
}

export async function attachFailureEvidence(
  page: Page,
  testInfo: TestInfo,
  consoleErrors: ConsoleProblem[],
): Promise<void> {
  await attachCurrentURL(page, testInfo);
  await attachJsonEvidence(testInfo, 'console-errors.json', consoleErrors);
  await attachPrototypeHTML(page, testInfo);
  await attachFailureScreenshot(page, testInfo);
  await attachTextEvidence(
    testInfo,
    '00-failure-summary.md',
    buildFailureSummary(testInfo, page.url(), consoleErrors),
    'text/markdown',
  );
}
