import { test, expect } from '@playwright/test';
import path from 'node:path';

/** Unit coverage for the visibility-gate + shortcut pure logic (TDD seam). */

const MODULE_PATH = path.resolve(
  process.cwd(),
  'prototype/project/theme-editor.js',
);

test.beforeEach(async ({ page }) => {
  await page.goto('about:blank');
  await page.addScriptTag({ path: MODULE_PATH });
  await page.waitForFunction(() => !!(window as any).AutheonThemeEditor?.__test);
});

test.describe('theme editor — themecolorchanger visibility gate', () => {
  test('true only for the exact value 1, regardless of param order', async ({
    page,
  }) => {
    const out = await page.evaluate(() => {
      const w = (window as any).AutheonThemeEditor.__test.wantsVisible;
      return {
        one: w('?themecolorchanger=1'),
        withOthers: w('?a=b&themecolorchanger=1&c=d'),
        ordered: w('?themecolorchanger=1&tab=mine'),
      };
    });
    expect(out).toEqual({ one: true, withOthers: true, ordered: true });
  });

  test('false for missing / invalid values', async ({ page }) => {
    const out = await page.evaluate(() => {
      const w = (window as any).AutheonThemeEditor.__test.wantsVisible;
      return ['', '?x=y', '?themecolorchanger=0', '?themecolorchanger=false', '?themecolorchanger=2', '?themecolorchanger=on', '?themecolorchanger='].map(
        (s) => w(s),
      );
    });
    expect(out.every((v) => v === false)).toBe(true);
  });
});

test.describe('theme editor — toggle shortcut match', () => {
  test('matches Ctrl/Cmd + Alt + Shift + T (by code)', async ({ page }) => {
    const out = await page.evaluate(() => {
      const m = (window as any).AutheonThemeEditor.__test.isToggleShortcut;
      return {
        ctrl: m({ shiftKey: true, altKey: true, ctrlKey: true, metaKey: false, code: 'KeyT' }),
        meta: m({ shiftKey: true, altKey: true, ctrlKey: false, metaKey: true, code: 'KeyT' }),
      };
    });
    expect(out).toEqual({ ctrl: true, meta: true });
  });

  test('does not match when a required modifier or the key is absent', async ({
    page,
  }) => {
    const out = await page.evaluate(() => {
      const m = (window as any).AutheonThemeEditor.__test.isToggleShortcut;
      return [
        m({ shiftKey: false, altKey: true, ctrlKey: true, metaKey: false, code: 'KeyT' }),
        m({ shiftKey: true, altKey: false, ctrlKey: true, metaKey: false, code: 'KeyT' }),
        m({ shiftKey: true, altKey: true, ctrlKey: false, metaKey: false, code: 'KeyT' }),
        m({ shiftKey: true, altKey: true, ctrlKey: true, metaKey: false, code: 'KeyK' }),
      ];
    });
    expect(out.every((v) => v === false)).toBe(true);
  });
});

test.describe('theme editor — platform-aware shortcut label', () => {
  test('uses symbols on macOS and words elsewhere', async ({ page }) => {
    const out = await page.evaluate(() => {
      const l = (window as any).AutheonThemeEditor.__test.shortcutLabel;
      return { mac: l(true), other: l(false) };
    });
    expect(out.mac).toContain('⌘');
    expect(out.mac).toContain('⌥');
    expect(out.mac.toUpperCase()).toContain('T');
    expect(out.other).toBe('Ctrl + Alt + Shift + T');
  });
});
