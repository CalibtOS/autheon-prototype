import { test, expect } from '@playwright/test';
import path from 'node:path';

/**
 * Unit-level coverage for the Theme Editor's pure logic. The module exposes its
 * side-effect-free helpers on `window.AutheonThemeEditor.__test`; we load the
 * script standalone on about:blank and exercise them in the browser via
 * page.evaluate. No prototype app is needed — this is the TDD seam.
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

test.describe('theme editor — hex normalization & validation', () => {
  test('normalizes 6-digit hex to uppercase with leading #', async ({ page }) => {
    const out = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.normalizeHex('1a2b3c'),
    );
    expect(out).toBe('#1A2B3C');
  });

  test('accepts a leading # and trims surrounding whitespace', async ({ page }) => {
    const out = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.normalizeHex('  #abcdef  '),
    );
    expect(out).toBe('#ABCDEF');
  });

  test('expands 3-digit shorthand', async ({ page }) => {
    const out = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.normalizeHex('fff'),
    );
    expect(out).toBe('#FFFFFF');
  });

  test('expands 3-digit shorthand preserving channels', async ({ page }) => {
    const out = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.normalizeHex('#0af'),
    );
    expect(out).toBe('#00AAFF');
  });

  test('rejects invalid values by returning null', async ({ page }) => {
    const results = await page.evaluate(() => {
      const n = (window as any).AutheonThemeEditor.__test.normalizeHex;
      return ['', '   ', 'xyz', '#12', '#12345', '#1234567', 'red', '#gggggg'].map(
        (v) => n(v),
      );
    });
    expect(results.every((r) => r === null)).toBe(true);
  });

  test('isValidHex mirrors normalizeHex acceptance', async ({ page }) => {
    const out = await page.evaluate(() => {
      const v = (window as any).AutheonThemeEditor.__test.isValidHex;
      return { good: v('#1A2B3C'), short: v('abc'), bad: v('nope') };
    });
    expect(out).toEqual({ good: true, short: true, bad: false });
  });
});

test.describe('theme editor — launcher position clamping', () => {
  test('keeps an in-bounds position unchanged', async ({ page }) => {
    const out = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.clampPosition(
        { x: 100, y: 100 },
        { vw: 1000, vh: 800, size: 48, margin: 16 },
      ),
    );
    expect(out).toEqual({ x: 100, y: 100 });
  });

  test('clamps an off-screen position back inside the viewport + margin', async ({
    page,
  }) => {
    const out = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.clampPosition(
        { x: 5000, y: -300 },
        { vw: 1000, vh: 800, size: 48, margin: 16 },
      ),
    );
    // Max x = vw - size - margin = 1000 - 48 - 16 = 936; Min y = margin = 16
    expect(out).toEqual({ x: 936, y: 16 });
  });
});

test.describe('theme editor — WCAG contrast', () => {
  test('black on white is 21:1', async ({ page }) => {
    const ratio = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.contrastRatio('#000000', '#FFFFFF'),
    );
    expect(Math.round(ratio)).toBe(21);
  });

  test('identical colors are 1:1', async ({ page }) => {
    const ratio = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.contrastRatio('#3366CC', '#3366CC'),
    );
    expect(Math.round(ratio)).toBe(1);
  });

  test('flags a low-contrast pair below the 4.5 AA threshold', async ({ page }) => {
    const out = await page.evaluate(() => {
      const t = (window as any).AutheonThemeEditor.__test;
      return t.meetsContrast('#777777', '#888888', 4.5);
    });
    expect(out).toBe(false);
  });
});

test.describe('theme editor — override CSS generation', () => {
  test('emits per-mode :root rules only for set overrides', async ({ page }) => {
    const css = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.buildOverrideCss({
        light: { '--brand-accent': '#FF0000' },
        dark: { '--brand-accent': '#00FF00', '--brand-text': '#FFFFFF' },
      }),
    );
    expect(css).toContain(':root[data-theme="light"]');
    expect(css).toContain('--brand-accent: #FF0000');
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain('--brand-accent: #00FF00');
    expect(css).toContain('--brand-text: #FFFFFF');
  });

  test('produces empty output when there are no overrides', async ({ page }) => {
    const css = await page.evaluate(() =>
      (window as any).AutheonThemeEditor.__test.buildOverrideCss({
        light: {},
        dark: {},
      }),
    );
    expect(css.trim()).toBe('');
  });
});
