import type { TestInfo } from '@playwright/test';
import type { ConsoleProblem } from '../collectors/console-errors.ts';

export function buildFailureSummary(
  testInfo: TestInfo,
  currentURL: string,
  consoleErrors: ConsoleProblem[],
): string {
  const lines = [
    `# Failure summary: ${testInfo.title}`,
    '',
    `- Status: ${testInfo.status || 'unknown'}`,
    `- Expected status: ${testInfo.expectedStatus}`,
    `- Project: ${testInfo.project.name}`,
    `- Retry: ${testInfo.retry}`,
    `- Current URL: ${currentURL}`,
    `- Console/page errors: ${consoleErrors.length}`,
  ];

  if (testInfo.error) {
    lines.push(
      '',
      '## Error',
      '',
      '```text',
      testInfo.error.message || String(testInfo.error),
      '```',
    );
  }

  if (consoleErrors.length > 0) {
    lines.push('', '## Console/Page Errors', '');
    for (const error of consoleErrors) {
      lines.push(
        `- ${error.source}:${error.type} ${error.text}` +
          (error.url ? ` (${error.url})` : ''),
      );
    }
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}
