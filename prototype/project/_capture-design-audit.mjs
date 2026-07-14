/**
 * Design Direction Board audit — screenshot capture.
 * Usage: node capture.mjs <outDir>
 * Captures driver (phone element, light+dark) and admin (1440px, light+dark).
 */
import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const OUT = process.argv[2];
if (!OUT) throw new Error("outDir required");
fs.mkdirSync(OUT, { recursive: true });

const URL = "http://127.0.0.1:4173/prototype/project/AUTHEON%20Prototype.html";

const DISABLE_ANIM = `
*, *::before, *::after {
  animation-duration: 0.001s !important;
  animation-delay: 0s !important;
  transition-duration: 0.001s !important;
  transition-delay: 0s !important;
  scroll-behavior: auto !important;
}`;

async function newPage(browser, { theme, width = 1440, height = 1000 }) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem("autheon-theme", t), theme);
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".app-header", { timeout: 20000 });
  await page.addStyleTag({ content: DISABLE_ANIM });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800); // skeleton -> content
  return { ctx, page };
}

async function shotPhone(page, file) {
  const phone = page.locator(".phone");
  await phone.waitFor({ state: "visible" });
  await phone.screenshot({ path: path.join(OUT, file) });
  console.log("saved", file);
}

async function shotFull(page, file) {
  await page.screenshot({ path: path.join(OUT, file) });
  console.log("saved", file);
}

const browser = await chromium.launch();

for (const theme of ["light", "dark"]) {
  const { ctx, page } = await newPage(browser, { theme });

  // Driver marketplace
  await shotPhone(page, `driver-marketplace-${theme}.png`);

  // Job locked (tap first card)
  await page.locator(".jobcard-btn").first().click();
  await page.waitForTimeout(500);
  await shotPhone(page, `driver-job-locked-${theme}.png`);

  if (theme === "light") {
    // Acceptance modal w/ slide-to-confirm
    await page.locator(".pwa-detail-bottom .btn.primary").click();
    await page.waitForTimeout(400);
    await shotPhone(page, `driver-slide-confirm-${theme}.png`);
    await page.keyboard.press("Escape");
    await page.locator(".sheet-backdrop").click({ position: { x: 10, y: 10 } }).catch(() => {});
    await page.waitForTimeout(300);
  }

  // Back to marketplace
  await page.locator(".detail-back-btn").click();
  await page.waitForTimeout(400);

  // My Jobs
  await page.locator(".tabbar-capsule button").nth(1).click();
  await page.waitForTimeout(500);
  await shotPhone(page, `driver-myjobs-${theme}.png`);

  if (theme === "light") {
    // Job unlocked (first active job)
    await page.locator(".jobcard-btn").first().click();
    await page.waitForTimeout(500);
    await shotPhone(page, `driver-job-unlocked-${theme}.png`);
    await page.locator(".detail-back-btn").click();
    await page.waitForTimeout(400);

    // Infopoint + Profile
    await page.locator(".tabbar-capsule button").nth(2).click();
    await page.waitForTimeout(400);
    await shotPhone(page, `driver-infopoint-${theme}.png`);
    await page.locator(".tabbar-capsule button").nth(3).click();
    await page.waitForTimeout(400);
    await shotPhone(page, `driver-profile-${theme}.png`);

    // Filter sheet on marketplace
    await page.locator(".tabbar-capsule button").nth(0).click();
    await page.waitForTimeout(400);
    await page.locator(".header-controls .header-btn").last().click();
    await page.waitForTimeout(400);
    await shotPhone(page, `driver-filter-sheet-${theme}.png`);
  }

  // Admin
  await page.getByRole("button", { name: /Admin Backend/i }).click();
  await page.waitForTimeout(800);
  await shotFull(page, `admin-overview-${theme}-1440.png`);

  if (theme === "light") {
    // Admin job detail
    await page.locator(".tbl tr.row").first().click();
    await page.waitForTimeout(600);
    await shotFull(page, `admin-job-detail-${theme}-1440.png`);
  }

  await ctx.close();
}

await browser.close();
console.log("done");
