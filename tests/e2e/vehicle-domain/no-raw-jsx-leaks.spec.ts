import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import { switchToAdminBackend, switchToDriverPWA, switchLanguage, switchTheme } from '../../regression/support/helpers/header-controls.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { gotoPrototype } from '../../regression/support/helpers/stable-page.ts';

const LEAK_PATTERNS = [
  /vehicleCharacteristicFlags\(/,
  /vehicleInfoFlags\(/,
  /\)\s*:\s*null\}/,
  /\{t\("/,
  /AuthStore\./,
  /\bjob\.(vehicleType|transportType|registrationStatus|manufacturer)\b/,
];

async function assertNoLeak(page, label: string) {
  const text = await page.frames()[1].evaluate(() => document.body.innerText);
  for (const p of LEAK_PATTERNS) {
    expect(text, `${label}: raw expression text leaked (${p})`).not.toMatch(p);
  }
}

test('no raw JSX leaks on driver vehicle surfaces', async ({ page }) => {
  await gotoPrototype(page);
  await switchLanguage(page, 'EN');
  await switchTheme(page, 'light');
  await switchToDriverPWA(page);
  const f = prototypeFrame(page);

  await assertNoLeak(page, 'marketplace list');

  await f.getByText('Polo').first().click();
  await expect(f.getByRole('heading', { name: /Marketplace preview/i })).toBeVisible();
  await expect(f.getByText('Additional vehicle characteristics')).toBeVisible();
  await assertNoLeak(page, 'marketplace preview');

  await f.getByRole('button', { name: /Accept tour/i }).click();
  await expect(f.getByRole('heading', { name: /Accept this tour/i })).toBeVisible();
  await assertNoLeak(page, 'booking dialog');
});

test('no raw JSX leaks in the complete order view after booking', async ({ page }) => {
  await gotoPrototype(page);
  await switchLanguage(page, 'EN');
  await switchTheme(page, 'light');
  await switchToDriverPWA(page);
  const f = prototypeFrame(page);

  await f.getByRole('button', { name: /My jobs/i }).first().click();
  await f.getByText('A4').first().click();
  await expect(f.getByText('Additional vehicle characteristics')).toBeVisible();
  await assertNoLeak(page, 'complete order view');
});

test('no raw JSX leaks on admin vehicle surfaces', async ({ page }) => {
  await gotoPrototype(page);
  await switchLanguage(page, 'EN');
  await switchTheme(page, 'light');
  await switchToAdminBackend(page);
  const f = prototypeFrame(page);
  await assertNoLeak(page, 'admin jobs overview');

  await f.getByText('0845-26', { exact: true }).click();
  await expect(f.getByText('Official licence plate').first()).toBeVisible();
  await assertNoLeak(page, 'admin job detail');

  await f.getByRole('button', { name: /Edit|Back to jobs|Jobs/i }).first().click().catch(() => {});
  await gotoPrototype(page);
  await switchToAdminBackend(page);
  await f.getByRole('button', { name: /New job/i }).click();
  await expect(f.locator('#new-order-manufacturer')).toBeVisible();
  await assertNoLeak(page, 'admin new order form');
});
