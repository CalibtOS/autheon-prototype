import { test, expect } from '@playwright/test';
import path from 'node:path';

/**
 * Unit-level coverage for the Theme Editor's URL-param and export pure logic,
 * exercised in-browser via window.AutheonThemeEditor.__test (the TDD seam).
 */

const MODULE_PATH = path.resolve(
  process.cwd(),
  'prototype/project/theme-editor.js',
);

test.beforeEach(async ({ page }) => {
  await page.goto('about:blank');
  await page.addScriptTag({ path: MODULE_PATH });
  await page.waitForFunction(() => !!(window as any).AutheonThemeEditor?.__test);
});

test.describe('theme editor — URL param serialize/parse', () => {
  test('serializes nothing to an empty string', async ({ page }) => {
    const out = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.serializeOverrides({
        light: {},
        dark: {},
      }),
    );
    expect(out).toBe('');
  });

  test('serializes a single light override compactly', async ({ page }) => {
    const out = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.serializeOverrides({
        light: { '--brand-accent': '#FF0000' },
        dark: {},
      }),
    );
    expect(out).toBe('light:brand-accent=ff0000');
  });

  test('serializes both modes in stable registry order', async ({ page }) => {
    const out = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.serializeOverrides({
        // Deliberately inserted out of registry order:
        light: { '--brand-text': '#111111', '--brand-accent': '#FF0000' },
        dark: { '--brand-accent': '#8F5BFF' },
      }),
    );
    expect(out).toBe(
      'light:brand-accent=ff0000,brand-text=111111|dark:brand-accent=8f5bff',
    );
  });

  test('round-trips serialize → parse', async ({ page }) => {
    const result = await page.evaluate(() => {
      const t = (window as any).AutheonThemeEditor.__test;
      const overrides = {
        light: { '--brand-accent': '#FF0000', '--brand-text': '#111111' },
        dark: { '--brand-accent': '#8F5BFF' },
      };
      return t.parseThemeParam(t.serializeOverrides(overrides));
    });
    expect(result).toEqual({
      light: { '--brand-accent': '#FF0000', '--brand-text': '#111111' },
      dark: { '--brand-accent': '#8F5BFF' },
    });
  });

  test('ignores unknown variables, bad hex and bad modes', async ({ page }) => {
    const result = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.parseThemeParam(
        'light:brand-accent=ff0000,not-a-var=00ff00,brand-text=zzzzzz|bogus:brand-accent=123456',
      ),
    );
    // Only the one valid entry survives.
    expect(result).toEqual({ light: { '--brand-accent': '#FF0000' }, dark: {} });
  });

  test('is injection-safe — CSS/HTML payloads never become overrides', async ({
    page,
  }) => {
    const result = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.parseThemeParam(
        'light:brand-accent=red;}body{display:none},brand-surface=url(javascript:alert(1))',
      ),
    );
    expect(result).toEqual({ light: {}, dark: {} });
  });
});

test.describe('theme editor — export builders', () => {
  const VALUES = {
    '--brand-text': '#111111',
    '--brand-accent': '#FF0000',
  };

  test('buildThemeJson emits valid, ordered JSON scoped to the mode', async ({
    page,
  }) => {
    const json = await page.evaluate(
      (values) =>
        (window as any).AutheonThemeEditor.__test.buildThemeJson('light', values),
      VALUES,
    );
    const parsed = JSON.parse(json);
    expect(parsed.mode).toBe('light');
    expect(parsed.variables['--brand-accent']).toBe('#FF0000');
    expect(parsed.variables['--brand-text']).toBe('#111111');
    // Registry order: accent key appears before text key.
    expect(json.indexOf('--brand-accent')).toBeLessThan(json.indexOf('--brand-text'));
    // No unrelated runtime state leaked in.
    expect(json).not.toContain('launcher');
    expect(json).not.toContain('picker');
  });

  test('buildThemeMarkdown emits an escaped table with category, variable, value', async ({
    page,
  }) => {
    const md = await page.evaluate(
      (values) =>
        (window as any).AutheonThemeEditor.__test.buildThemeMarkdown('dark', values),
      VALUES,
    );
    expect(md).toContain('| Category | Variable | Value |');
    expect(md).toContain('`--brand-accent`');
    expect(md).toContain('`#FF0000`');
    expect(md).toContain('Brand'); // category label
  });

  test('escapeMarkdownCell neutralizes pipe characters', async ({ page }) => {
    const out = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.escapeMarkdownCell('a|b'),
    );
    expect(out).toBe('a\\|b');
  });

  test('JSON export distinguishes user overrides from the full snapshot', async ({
    page,
  }) => {
    const json = await page.evaluate(
      (values) =>
        (window as any).AutheonThemeEditor.__test.buildThemeJson('light', values, [
          '--brand-accent',
        ]),
      VALUES,
    );
    const parsed = JSON.parse(json);
    expect(parsed.modified).toEqual(['--brand-accent']);
    // The full visible snapshot is still present (defaults + overrides).
    expect(Object.keys(parsed.variables)).toContain('--brand-text');
  });

  test('Markdown export flags modified rows', async ({ page }) => {
    const md = await page.evaluate(
      (values) =>
        (window as any).AutheonThemeEditor.__test.buildThemeMarkdown('light', values, [
          '--brand-accent',
        ]),
      VALUES,
    );
    expect(md).toContain('| Modified |');
    expect(md).toMatch(/`--brand-accent`.*\byes\b/);
  });
});
