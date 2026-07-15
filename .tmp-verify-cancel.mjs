import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT = '/private/tmp/claude-501/-Users-youssefelkondakly-calibtos-autheon-autheon-prototype/8a33cf15-3d92-4c63-a7d9-34c9edf8f657/scratchpad/cancel-qa';
fs.mkdirSync(OUT, { recursive: true });
const PWA = 'http://127.0.0.1:4199/pwa/';
const browser = await chromium.launch();

async function driveCancel(w, h, name) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => { localStorage.setItem('autheon-locale', 'en'); localStorage.setItem('autheon-theme', 'light'); });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(PWA);
  await page.waitForTimeout(3800);
  // My Jobs -> active job -> Report problem
  await page.locator('.tabbar-item').nth(1).click();
  await page.waitForTimeout(600);
  await page.locator('.jobcard-btn').first().click();
  await page.waitForTimeout(700);
  await page.locator('.phone-screen button', { hasText: /Report problem/i }).first().click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}-1-sheet.png` });
  // choose Cancel order path
  await page.locator('.radio-card, button.radio-card').first().click();
  await page.waitForTimeout(400);
  // pick first reason
  const reason = page.locator('select.input');
  if (await reason.count()) await reason.first().selectOption({ index: 1 });
  else await page.locator('.radio-card, button.radio-card').nth(1).click();
  await page.waitForTimeout(300);
  // reason text
  await page.locator('textarea').first().fill('Vehicle cannot be picked up today, customer closed.');
  await page.waitForTimeout(400);
  // slide to confirm inside report sheet
  const track = page.locator('.slide-confirm').last();
  const thumb = track.locator('.thumb');
  const tb = await track.boundingBox();
  const hb = await thumb.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(tb.x + tb.width - 8, hb.y + hb.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/${name}-2-alert.png` });
  await ctx.close();
}
await driveCancel(390, 844, 'phone390');
await driveCancel(820, 1180, 'tablet820');
await browser.close();
console.log('cancel flow captured');
