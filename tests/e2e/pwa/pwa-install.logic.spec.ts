import { expect, test } from '@playwright/test';
import path from 'node:path';

const MODULE_PATH = path.resolve(process.cwd(), 'pwa/pwa-install.js');

test.describe('pwa install bridge logic', () => {
  test('loads as valid JavaScript and exposes a promptInstall function', async ({
    page,
  }) => {
    await page.goto('about:blank');
    await page.addScriptTag({ path: MODULE_PATH });

    const state = await page.evaluate(() => {
      const api = (window as any).AutheonPwa;
      return {
        hasApi: !!api,
        promptInstallType: typeof api?.promptInstall,
        subscribeType: typeof api?.subscribe,
      };
    });

    expect(state).toEqual({
      hasApi: true,
      promptInstallType: 'function',
      subscribeType: 'function',
    });
  });
});
