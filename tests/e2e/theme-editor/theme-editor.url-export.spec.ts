import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { gotoPrototype } from '../../regression/support/helpers/stable-page.ts';
import {
  ACCENT_VAR,
  accentHex,
  launcher,
  openEditor,
  openExport,
  panel,
  readClipboard,
  readVar,
  setAccent,
} from '../../regression/support/helpers/theme-editor.ts';

/**
 * E2E for the shareable-URL and export features. The editor runs inside the
 * prototype iframe but writes the `theme` param to the TOP-LEVEL URL, so
 * assertions on page.url() (the browser-bar URL) verify real shareability.
 * Shared automation lives in support/helpers/theme-editor.
 */

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test.describe('Theme Editor — URL query parameters', () => {
  test('applies a valid theme param on load', async ({ page }) => {
    await gotoPrototype(page, '/?theme=light:brand-accent=00ff00');
    await expect(launcher(page)).toBeVisible();
    expect(await readVar(page, ACCENT_VAR)).toBe('#00FF00');
  });

  test('a colour edit syncs into the shareable (top-level) URL', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await openEditor(page);
    await setAccent(page, 'ff0000');

    expect(page.url()).toContain('theme=');
    expect(decodeURIComponent(page.url())).toContain('brand-accent=ff0000');
  });

  test('URL config survives a reload', async ({ page }) => {
    await gotoPrototype(page, '/?theme=light:brand-accent=00ccff');
    expect(await readVar(page, ACCENT_VAR)).toBe('#00CCFF');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(launcher(page)).toBeVisible();
    expect(await readVar(page, ACCENT_VAR)).toBe('#00CCFF');
  });

  test('ignores invalid params and falls back safely', async ({ page }) => {
    const clean = await (async () => {
      await gotoPrototype(page);
      return readVar(page, ACCENT_VAR);
    })();
    await gotoPrototype(page, '/?theme=not-valid:::garbage%7Cboom');
    await expect(launcher(page)).toBeVisible();
    expect(await readVar(page, ACCENT_VAR)).toBe(clean);
  });

  test('preserves unrelated query params when syncing', async ({ page }) => {
    await gotoPrototype(page, '/?tab=mine');
    await openEditor(page);
    await setAccent(page, '112233');

    const url = decodeURIComponent(page.url());
    expect(url).toContain('tab=mine');
    expect(url).toContain('brand-accent=112233');
  });

  test('reset clears the theme param from the URL', async ({ page }) => {
    await gotoPrototype(page, '/?theme=light:brand-accent=abcdef');
    await openEditor(page);
    const frame = prototypeFrame(page);
    await frame.getByRole('button', { name: 'Reset to defaults' }).click();
    await frame.getByRole('button', { name: 'Reset colours' }).click();

    await expect(panel(page)).toBeVisible();
    expect(page.url()).not.toContain('theme=');
  });
});

test.describe('Theme Editor — export', () => {
  test('Copy JSON puts a parseable, matching snapshot on the clipboard', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await openEditor(page);
    await setAccent(page, 'FF8800');
    await openExport(page);
    await prototypeFrame(page).getByRole('button', { name: 'Copy JSON' }).click();

    const text = await readClipboard(page);
    const parsed = JSON.parse(text);
    expect(parsed.mode).toBe('light');
    expect(parsed.variables[ACCENT_VAR]).toBe('#FF8800');
    // Matches what is actually visible.
    expect(await readVar(page, ACCENT_VAR)).toBe('#FF8800');
  });

  test('Copy Markdown produces a table', async ({ page }) => {
    await gotoPrototype(page);
    await openEditor(page);
    await openExport(page);
    await prototypeFrame(page).getByRole('button', { name: 'Copy Markdown' }).click();

    const text = await readClipboard(page);
    expect(text).toContain('| Category | Variable | Value |');
    expect(text).toContain('`--brand-accent`');
  });

  test('Copy shareable link copies a URL carrying the config', async ({ page }) => {
    await gotoPrototype(page);
    await openEditor(page);
    await setAccent(page, '00AA55');
    await openExport(page);
    await prototypeFrame(page)
      .getByRole('button', { name: 'Copy shareable link' })
      .click();

    const text = decodeURIComponent(await readClipboard(page));
    expect(text).toContain('theme=');
    expect(text).toContain('brand-accent=00aa55');
  });

  test('Download JSON offers a clearly named file', async ({ page }) => {
    await gotoPrototype(page);
    await openEditor(page);
    await openExport(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      prototypeFrame(page).getByRole('button', { name: 'Download JSON' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('autheon-theme-light.json');
  });
});

test.describe('Theme Editor — top-level (non-iframe) host', () => {
  // The standalone /pwa/ and a directly-opened prototype run the editor in the
  // top-level document (hostWindow === window), a different branch from the
  // iframed client-preview. Loading the prototype page directly exercises that
  // branch deterministically (the /pwa/ splash + CDN boot make it flaky in CI).
  const PROTOTYPE_PAGE = '/prototype/project/AUTHEON%20Prototype.html';

  test('applies a URL param and syncs edits to its own URL', async ({ page }) => {
    await page.goto(PROTOTYPE_PAGE + '?theme=light:brand-accent=00ff00', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('#root .app')).toBeVisible();

    const topLauncher = page.getByRole('button', { name: 'Open Theme Editor' });
    await expect(topLauncher).toBeVisible();

    const readAccent = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--brand-accent')
          .trim()
          .toUpperCase(),
      );
    // URL config applied directly on the top-level host.
    expect(await readAccent()).toBe('#00FF00');

    // Editing writes the theme param back to this window's own URL.
    await topLauncher.click();
    await expect(page.getByRole('dialog', { name: 'Theme Editor' })).toBeVisible();
    const hex = page.getByLabel('Hex value for Accent', { exact: true });
    await hex.fill('ff0000');
    await hex.press('Enter');

    expect(await readAccent()).toBe('#FF0000');
    expect(decodeURIComponent(page.url())).toContain('brand-accent=ff0000');
  });
});
