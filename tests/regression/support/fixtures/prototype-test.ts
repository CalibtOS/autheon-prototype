import { expect, test as base } from '@playwright/test';
import {
  startConsoleErrorCollector,
  unexpectedConsoleErrors,
  type ConsoleErrorCollector,
} from '../collectors/console-errors.ts';
import { attachFailureEvidence, attachJsonEvidence } from '../evidence/attachments.ts';

type PrototypeFixtures = {
  consoleErrors: ConsoleErrorCollector;
};

export const test = base.extend<PrototypeFixtures>({
  consoleErrors: async ({ page }, use, testInfo) => {
    const collector = startConsoleErrorCollector(page);
    let thrown: Error | undefined;

    await use(collector);

    const allErrors = collector.errors();
    const unexpected = unexpectedConsoleErrors(allErrors);

    if (allErrors.length > 0) {
      await attachJsonEvidence(testInfo, 'console-errors.json', allErrors);
    }

    if (unexpected.length > 0) {
      thrown = new Error(
        `Unexpected browser console/page errors:\n${unexpected
          .map((error) => `- ${error.source}:${error.type} ${error.text}`)
          .join('\n')}`,
      );
    }

    if (testInfo.status !== testInfo.expectedStatus || thrown) {
      await attachFailureEvidence(page, testInfo, allErrors);
    }

    collector.dispose();

    if (thrown) {
      throw thrown;
    }
  },
});

export { expect };
