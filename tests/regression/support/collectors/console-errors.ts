import type { ConsoleMessage, Page } from '@playwright/test';

export type ConsoleProblem = {
  source: 'console' | 'pageerror';
  type: string;
  text: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  stack?: string;
};

export type ConsoleErrorCollector = {
  errors: () => ConsoleProblem[];
  dispose: () => void;
};

const KNOWN_LOCAL_DEV_ERROR_PATTERNS: RegExp[] = [];

function toConsoleProblem(message: ConsoleMessage): ConsoleProblem {
  const location = message.location();

  return {
    source: 'console',
    type: message.type(),
    text: message.text(),
    url: location.url || undefined,
    lineNumber: location.lineNumber || undefined,
    columnNumber: location.columnNumber || undefined,
  };
}

export function startConsoleErrorCollector(page: Page): ConsoleErrorCollector {
  const errors: ConsoleProblem[] = [];

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() !== 'error') return;
    errors.push(toConsoleProblem(message));
  };

  const onPageError = (error: Error) => {
    errors.push({
      source: 'pageerror',
      type: 'pageerror',
      text: error.message,
      stack: error.stack,
    });
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  return {
    errors: () => errors.slice(),
    dispose: () => {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
    },
  };
}

export function unexpectedConsoleErrors(
  errors: ConsoleProblem[],
): ConsoleProblem[] {
  return errors.filter(
    (error) =>
      !KNOWN_LOCAL_DEV_ERROR_PATTERNS.some((pattern) => pattern.test(error.text)),
  );
}

