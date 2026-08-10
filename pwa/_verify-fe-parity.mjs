/**
 * FE-parity check — assert /pwa resolves the same shell/scroll/tabbar geometry
 * as apps/web DriverShell.tsx + DriverScrollBody + packages/ui TabBar.
 *
 * Run: node pwa/_verify-fe-parity.mjs   (needs a static server on :5511)
 */
import { chromium } from 'playwright'

const url = process.env.PWA_URL || 'http://127.0.0.1:5511/pwa/'

/** Expected values per FE tier. sab/sat = 0 in desktop Chromium. */
const TIERS = [
  {
    label: 'compact phone 320x568  (FE max-[360px])',
    vp: { width: 320, height: 568 },
    scroll: { top: 10, left: 12, right: 12, bottom: 84 },
    tabbar: { left: 10, right: 10, bottom: 20 },
    capsule: { top: 4, bottom: 4, left: 4, right: 4 },
  },
  {
    label: 'phone 375x812        (FE base <400)',
    vp: { width: 375, height: 812 },
    scroll: { top: 12, left: 14, right: 14, bottom: 92 },
    tabbar: { left: 12, right: 12, bottom: 20 },
    capsule: { top: 6, bottom: 6, left: 8, right: 8 },
  },
  {
    label: 'phone 430x932        (FE min-[400px])',
    vp: { width: 430, height: 932 },
    scroll: { top: 16, left: 18, right: 18, bottom: 92 },
    tabbar: { left: 16, right: 16, bottom: 20 },
    capsule: { top: 6, bottom: 6, left: 8, right: 8 },
  },
  {
    label: 'tablet 1024x1366     (FE min-[768px])',
    vp: { width: 1024, height: 1366 },
    scroll: { top: 20, left: 20, right: 20, bottom: 100 },
    tabbar: { left: 20, right: 20, bottom: 21.6 },
    capsule: { top: 8, bottom: 8, left: 10, right: 10 },
  },
  {
    label: 'short landscape 844x390 (FE landscape/max-h-500)',
    vp: { width: 844, height: 390 },
    scroll: { top: 8, left: 20, right: 20, bottom: 100 },
    tabbar: { left: 20, right: 20, bottom: 8 },
    capsule: { top: 8, bottom: 8, left: 10, right: 10 },
  },
]

const px = (v) => Math.round(parseFloat(v) * 10) / 10

async function measure(page, vp) {
  await page.setViewportSize(vp)
  await page.waitForTimeout(350)
  return page.evaluate(() => {
    const pad = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const cs = getComputedStyle(el)
      return {
        top: cs.paddingTop,
        bottom: cs.paddingBottom,
        left: cs.paddingLeft,
        right: cs.paddingRight,
      }
    }
    const phone = document.querySelector('.phone')
    const shell = document.querySelector('.phone-shell')
    return {
      innerH: window.innerHeight,
      scroll: pad('.scroll-body'),
      tabbar: pad('.tabbar-container'),
      capsule: pad('.tabbar-capsule'),
      screenPadTop: getComputedStyle(document.querySelector('.phone-screen')).paddingTop,
      framePadX: phone
        ? [getComputedStyle(phone).paddingLeft, getComputedStyle(phone).paddingRight]
        : null,
      shellH: shell ? getComputedStyle(shell).height : null,
      // shell must reach the viewport bottom — the original "capped" bug
      gapPhone: phone ? Math.round(window.innerHeight - phone.getBoundingClientRect().bottom) : null,
    }
  })
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
await page.waitForSelector('.phone-shell', { timeout: 120000 })
await page.waitForTimeout(2000)

// Reach a primary screen so .scroll-body / .tabbar-container exist.
const demo = page.getByRole('button', { name: /demo|Demo|Fill/i }).first()
if (await demo.count()) {
  await demo.click()
  await page.locator('button[type="submit"]').first().click()
  await page.waitForSelector('.tabbar-container', { timeout: 30000 })
  await page.waitForTimeout(600)
}

let failures = 0
for (const tier of TIERS) {
  const m = await measure(page, tier.vp)
  const checks = []
  const cmp = (name, got, want) => {
    const ok = Math.abs(px(got) - want) <= 0.6
    if (!ok) failures++
    checks.push(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${px(got)} (want ${want})`)
  }
  for (const side of ['top', 'left', 'right', 'bottom']) {
    cmp(`scroll.${side}`, m.scroll[side], tier.scroll[side])
  }
  for (const side of ['left', 'right', 'bottom']) {
    cmp(`tabbar.${side}`, m.tabbar[side], tier.tabbar[side])
  }
  for (const side of ['top', 'left']) {
    cmp(`capsule.${side}`, m.capsule[side], tier.capsule[side])
  }
  const gapOk = m.gapPhone === 0
  if (!gapOk) failures++
  checks.push(`${gapOk ? 'ok  ' : 'FAIL'} frame reaches viewport bottom: gap ${m.gapPhone}px`)

  console.log(`\n=== ${tier.label} ===`)
  console.log(`    shell height ${m.shellH}, frame padX ${m.framePadX?.join(' / ')}`)
  checks.forEach((c) => console.log('    ' + c))
}

await browser.close()
if (failures) {
  console.error(`\n${failures} MISMATCH(ES) vs FE spec`)
  process.exitCode = 1
} else {
  console.log('\nALL TIERS MATCH FE (DriverShell / DriverScrollBody / TabBar)')
}
