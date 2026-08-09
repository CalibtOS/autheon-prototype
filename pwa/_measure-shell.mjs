/**
 * Local geometry check — compare shell bottom to viewport.
 * Run: node pwa/_measure-shell.mjs
 */
import { chromium, devices } from 'playwright'

const url = process.env.PWA_URL || 'http://127.0.0.1:5511/pwa/'

async function measure(label, { standalone, safeAreaBottom }) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPhone 14 Pro'].userAgent,
  })
  const page = await context.newPage()
  await page.addInitScript(
    ({ standalone, safeAreaBottom }) => {
      if (standalone) {
        Object.defineProperty(window.navigator, 'standalone', {
          get: () => true,
        })
        try {
          window.matchMedia = new Proxy(window.matchMedia, {
            apply(target, thisArg, args) {
              if (String(args[0]).includes('display-mode')) {
                return {
                  matches: true,
                  media: args[0],
                  addListener() {},
                  removeListener() {},
                  addEventListener() {},
                  removeEventListener() {},
                  onchange: null,
                  dispatchEvent() {
                    return false
                  },
                }
              }
              return Reflect.apply(target, thisArg, args)
            },
          })
        } catch (_) {
          /* ignore */
        }
      }
      // Simulate iOS home-indicator inset via CSS env (Chromium supports override).
      document.documentElement.style.setProperty(
        '--test-sab',
        `${safeAreaBottom}px`,
      )
    },
    { standalone, safeAreaBottom },
  )

  // Emulate safe-area by injecting a stylesheet after load as well.
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.addStyleTag({
    content: `
      @supports (padding: env(safe-area-inset-bottom)) {
        :root {
          --safe-area-inset-bottom: ${safeAreaBottom}px;
        }
      }
      /* Chromium doesn't let us redefine env(); pad tabbar via test var fallback in measure. */
    `,
  })
  await page.waitForSelector('.phone-shell', { timeout: 120000 })
  await page.waitForTimeout(800)

  const demoBtn = page.getByRole('button', { name: /demo|Demo|Fill/i }).first()
  if (await demoBtn.count()) {
    await demoBtn.click()
    await page.locator('button[type="submit"]').first().click()
    await page.waitForSelector('.tabbar-container, .pwa-tabbar-slot', {
      timeout: 30000,
    })
    await page.waitForTimeout(400)
  }

  if (standalone) {
    await page.evaluate(() => {
      document.documentElement.classList.add('pwa-standalone')
      document.body.classList.add('pwa-standalone')
      document.querySelector('.pwa-mode-bar')?.remove()
    })
    await page.waitForTimeout(200)
  }

  const metrics = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const box = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        cls: (el.className || '').toString().slice(0, 60),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        height: Math.round(r.height),
        cssH: cs.height,
        maxH: cs.maxHeight,
        pos: cs.position,
      }
    }
    const ih = window.innerHeight
    const shell = q('.phone-shell')
    const phone = q('.phone')
    const screen = q('.phone-screen')
    const tab = q('.tabbar-container')
    const phoneCss = phone ? getComputedStyle(phone) : null
    return {
      viewportH: ih,
      standalone: document.documentElement.classList.contains('pwa-standalone'),
      phoneRawHeight: phoneCss?.height,
      phoneRawMaxHeight: phoneCss?.maxHeight,
      shell: box(shell),
      phone: box(phone),
      screen: box(screen),
      tab: box(tab),
      modeBar: box(q('.pwa-mode-bar')),
      gapShell: shell ? Math.round(ih - shell.getBoundingClientRect().bottom) : null,
      gapPhone: phone ? Math.round(ih - phone.getBoundingClientRect().bottom) : null,
      gapTab: tab ? Math.round(ih - tab.getBoundingClientRect().bottom) : null,
    }
  })

  console.log(`\n=== ${label} ===`)
  console.log(JSON.stringify(metrics, null, 2))
  const gap = metrics.gapPhone ?? metrics.gapShell
  let ok = true
  if (gap === null) {
    console.error('FAIL: shell nodes missing')
    ok = false
  } else if (Math.abs(gap) > 1) {
    console.error(`FAIL: bottom gap = ${gap}px (want 0)`)
    ok = false
  } else if (metrics.phoneRawMaxHeight && metrics.phoneRawMaxHeight !== 'none') {
    console.error(`FAIL: .phone max-height still capped: ${metrics.phoneRawMaxHeight}`)
    ok = false
  } else {
    console.log('PASS: shell reaches viewport bottom; phone max-height none')
  }
  await browser.close()
  return ok
}

const results = []
results.push(
  await measure('browser preview (mode bar)', {
    standalone: false,
    safeAreaBottom: 34,
  }),
)
results.push(
  await measure('standalone installed PWA', {
    standalone: true,
    safeAreaBottom: 34,
  }),
)

if (results.some((r) => !r)) process.exitCode = 1
else console.log('\nALL CASES PASSED')
