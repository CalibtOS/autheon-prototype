import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/**
 * Loads the transport-order toolkit for the Playwright specs.
 *
 * Playwright transpiles spec TypeScript to CommonJS, which cannot import the
 * ES-module CLI tools. So the specs load the same globalThis-attaching IIFEs
 * the browser and the generator load, through `vm` — the Node mirror of
 * `tools/pdf/document-module.mjs`. There is exactly one renderer, one fixture
 * set and one metadata writer behind all three callers.
 */

// `import.meta` is unavailable: Playwright transpiles specs to CommonJS.
// `__dirname` is, and it points at this file's directory either way.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const TOOLS = path.join(REPO_ROOT, 'tools', 'pdf');

/** Where `npm run pdf:fonts` caches the OFL Montserrat faces (git-ignored). */
export const FONT_DIR = path.join(TOOLS, '.fonts');

export type BuildResult = {
  ok: boolean;
  missing: string[];
  payload?: TransportOrderPayload;
  html?: string;
  checksum?: string;
};

export type TransportOrderPayload = {
  template: 'pkw' | 'lkw';
  title: { lead: string; accent: string };
  metaTitle: string;
  metaAuthor: string;
  tour: string;
  jobId: string;
  fileName: string;
};

export type RenderOptions = {
  fontCss?: string;
  logoSvgDataUri?: string;
  pageMarginBottom?: number;
};

export type TransportOrderModule = {
  MANDATORY_FIELDS: string[];
  LABELS: { pageCounter: { page: string; of: string } };
  selectTemplate: (vehicleType: unknown) => 'pkw' | 'lkw' | null;
  formatGermanDate: (value: unknown) => string;
  formatGermanTime: (value: unknown) => string;
  formatEurNet: (value: unknown) => string;
  sha256Hex: (input: string) => string;
  escapeHtml: (value: unknown) => string;
  buildPayload: (input: unknown) => BuildResult;
  renderHtml: (payload: TransportOrderPayload, options?: RenderOptions) => string;
  buildDocument: (input: unknown, options?: RenderOptions) => BuildResult;
};

export type Fixture = { key: string; label: string; input: unknown };

function loadOnce<T>(globalKey: string, file: string): T {
  const scope = globalThis as unknown as Record<string, unknown>;
  if (!scope[globalKey]) {
    vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
  }
  return scope[globalKey] as T;
}

export function loadTransportOrderModule(): TransportOrderModule {
  return loadOnce<TransportOrderModule>(
    'AutheonTransportOrderPdf',
    path.join(REPO_ROOT, 'prototype', 'project', 'transport-order-pdf.js'),
  );
}

export function loadFixtures(): Fixture[] {
  return loadOnce<{ FIXTURES: Fixture[] }>(
    'AutheonTransportOrderFixtures',
    path.join(TOOLS, 'fixtures.js'),
  ).FIXTURES;
}

export function loadSetPdfInfo(): (
  pdf: Buffer,
  info: Record<string, string>,
) => Buffer {
  return loadOnce<{
    setPdfInfo: (pdf: Buffer, info: Record<string, string>) => Buffer;
  }>('AutheonPdfInfo', path.join(TOOLS, 'pdf-info.js')).setPdfInfo;
}
