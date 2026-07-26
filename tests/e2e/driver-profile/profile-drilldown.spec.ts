import { expect, test } from '../../regression/support/fixtures/prototype-test.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { openDriverTab, prepareDriverVisual } from '../../regression/support/helpers/visual.ts';

const TAB_PROFILE = /Profile|Profil/i;

/**
 * Functional coverage for the restructured Profile screen:
 * navigation-list main page + drill-down subpages (state-based routing).
 */
test.describe('driver profile drill-down @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await prepareDriverVisual(page);
    await openDriverTab(page, TAB_PROFILE);
  });

  test('main page shows identity, summary, groups and app-version', async ({ page }) => {
    const frame = prototypeFrame(page);
    await expect(frame.getByRole('heading', { level: 1, name: /^Profile$/ })).toBeVisible();
    await expect(frame.getByText('Jordan Blake')).toBeVisible();
    await expect(frame.getByText('Partner ID: AU-41-0228')).toBeVisible();
    await expect(frame.getByText('Account status')).toBeVisible();
    await expect(frame.getByText('Member since')).toBeVisible();
    await expect(frame.getByText('14.03.2024')).toBeVisible();
    // Group labels — exact, so "Account & sign-in" card heading isn't matched too
    await expect(frame.getByRole('heading', { name: 'Account', exact: true })).toBeVisible();
    await expect(frame.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(frame.getByRole('heading', { name: 'Help', exact: true })).toBeVisible();
    // App-version, discreet near the bottom
    await expect(frame.getByText(/App version 1\.2\.0/)).toBeVisible();
  });

  const rows: Array<{ label: RegExp; heading: RegExp }> = [
    { label: /^Basic data/, heading: /^Basic data$/ },
    { label: /^Change password$/, heading: /^Change password$/ },
    { label: /^Notification settings$/, heading: /^Notification settings$/ },
    { label: /^Appearance and language$/, heading: /^Appearance and language$/ },
    { label: /^Feedback$/, heading: /^Feedback$/ },
    { label: /^Report an error$/, heading: /^Report an error$/ },
  ];

  for (const { label, heading } of rows) {
    test(`row "${label.source}" opens its subpage and Back returns`, async ({ page }) => {
      const frame = prototypeFrame(page);
      await frame.getByRole('button', { name: label }).click();
      await expect(frame.getByRole('heading', { name: heading })).toBeVisible();
      // In-page back returns to the main list.
      await frame.locator('.detail-back-btn').click();
      await expect(frame.getByRole('heading', { level: 1, name: /^Profile$/ })).toBeVisible();
    });
  }

  test('Basic data subpage exposes the existing "Request a change" flow', async ({ page }) => {
    const frame = prototypeFrame(page);
    await frame.getByRole('button', { name: /^Basic data/ }).click();
    await expect(frame.getByText('Read-only master data')).toBeVisible();
    await expect(frame.getByRole('button', { name: /Request changes/ })).toBeVisible();
  });

  test('Notification subpage keeps the push notification controls', async ({ page }) => {
    const frame = prototypeFrame(page);
    await frame.getByRole('button', { name: /^Notification settings$/ }).click();
    await expect(frame.getByText('Enable push notifications')).toBeVisible();
    await expect(frame.getByRole('checkbox').first()).toBeChecked();
  });

  test('Appearance subpage language dropdown switches to German', async ({ page }) => {
    const frame = prototypeFrame(page);
    await frame.getByRole('button', { name: /^Appearance and language$/ }).click();
    const select = frame.locator('#profile-language-select');
    await expect(select).toBeVisible();
    await select.selectOption('de');
    // Whole screen re-localises: subpage heading + back label become German.
    await expect(frame.getByRole('heading', { name: /Darstellung und Sprache/ })).toBeVisible();
    await frame.locator('.detail-back-btn').click();
    await expect(frame.getByRole('heading', { level: 1, name: /^Profil$/ })).toBeVisible();
    await expect(frame.getByText('Dabei seit')).toBeVisible();
  });

  test('Appearance subpage exposes the persisted theme control in the framed preview', async ({
    page,
  }) => {
    const frame = prototypeFrame(page);
    await frame.getByRole('button', { name: /^Appearance and language$/ }).click();

    const language = frame.locator('#profile-language-select');
    const theme = frame.getByRole('group', { name: /^Theme$/ });
    await expect(language).toBeVisible();
    await expect(theme).toBeVisible();

    const languageBox = await language.boundingBox();
    const themeBox = await theme.boundingBox();
    expect(themeBox!.y).toBeGreaterThan(languageBox!.y + languageBox!.height);

    await theme.getByRole('button', { name: /^Dark$/ }).click();
    await expect(frame.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect
      .poll(() =>
        frame.locator('html').evaluate(() => localStorage.getItem('autheon-theme')),
      )
      .toBe('dark');
  });

  test('Sign out row opens the confirmation sheet', async ({ page }) => {
    const frame = prototypeFrame(page);
    await frame.getByRole('button', { name: /^Sign out$/ }).click();
    await expect(frame.locator('[role="dialog"]')).toBeVisible();
  });
});

test.describe('standalone driver PWA profile appearance @smoke', () => {
  test('keeps language and theme functional without horizontal overflow', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('autheon-locale')) {
        localStorage.setItem('autheon-locale', 'en');
      }
      if (!localStorage.getItem('autheon-theme')) {
        localStorage.setItem('autheon-theme', 'light');
      }
    });
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('/pwa/?tab=profile', { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { level: 1, name: /^Profile$/ }),
    ).toBeVisible({ timeout: 30_000 });
    await page
      .getByRole('button', { name: /^Appearance and language$/ })
      .click();

    const language = page.locator('#profile-language-select');
    const theme = page.getByRole('group', { name: /^Theme$/ });
    await expect(language).toBeVisible();
    await expect(language.locator('option')).toHaveText(['Deutsch', 'English']);
    await expect(theme).toBeVisible();

    await theme.getByRole('button', { name: /^Dark$/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('autheon-theme')))
      .toBe('dark');
    await expect
      .poll(() =>
        page.locator('meta[name="theme-color"]').evaluateAll((metas) =>
          metas.map((meta) => meta.getAttribute('content')),
        ),
      )
      .toEqual(['#1C1C1E', '#1C1C1E']);
    await expect(
      page.locator('meta[name="apple-mobile-web-app-status-bar-style"]'),
    ).toHaveAttribute('content', 'black-translucent');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { level: 1, name: /^Profile$/ }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page
      .getByRole('button', { name: /^Appearance and language$/ })
      .click();
    await expect(
      page.getByRole('button', { name: /^Dark$/, pressed: true }),
    ).toBeVisible();

    await language.selectOption('de');
    await expect(
      page.getByRole('heading', { name: /^Darstellung und Sprache$/ }),
    ).toBeVisible();
    await expect(page.getByRole('group', { name: /^Design$/ })).toBeVisible();

    for (const viewport of [
      { width: 320, height: 740 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      const hasOverflow = await page.locator('.phone-screen').evaluate(
        (screen) => screen.scrollWidth > screen.clientWidth,
      );
      expect(hasOverflow).toBe(false);
    }
  });

  /**
   * A state-based drill-down changes the view without a route, so focus and
   * scroll have to be moved deliberately: entering a subpage focuses its heading
   * (announcing the new view), leaving restores the list offset and re-focuses
   * the row that opened it. Also asserts the back control meets the documented
   * >=44x44 touch floor.
   */
  test('drill-down moves focus and restores list position on back', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('autheon-locale', 'en');
      localStorage.setItem('autheon-theme', 'light');
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pwa/?tab=profile', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.profile-nav-row').first()).toBeVisible({
      timeout: 30_000,
    });

    // Scroll the list down so a lost position would be obvious. The row is
    // brought into view first, so Playwright's click cannot auto-scroll the
    // container afterwards and invalidate the offset captured here.
    const row = page.locator('[data-profile-row="reportError"]');
    await row.scrollIntoViewIfNeeded();
    const before = await page
      .locator('.scroll-body')
      .evaluate((el) => el.scrollTop);
    expect(before).toBeGreaterThan(0);

    await row.click();

    // Focus lands on the subpage heading, not <body>.
    await expect(page.locator('.detail-header-title')).toBeFocused();
    // Both views share one `.scroll-body` node, so the subpage must be reset to
    // its own top rather than inheriting the list's offset.
    await expect
      .poll(() => page.locator('.scroll-body').evaluate((el) => el.scrollTop))
      .toBe(0);

    const back = page.locator('.detail-back-btn');
    const backBox = await back.evaluate((el: HTMLElement) => [
      el.offsetWidth,
      el.offsetHeight,
    ]);
    expect(backBox[0]).toBeGreaterThanOrEqual(44);
    expect(backBox[1]).toBeGreaterThanOrEqual(44);
    await expect(back).toHaveAttribute('aria-label', 'Profile');

    await back.click();

    // Returning re-focuses the originating row and keeps the list offset.
    await expect(
      page.locator('[data-profile-row="reportError"]'),
    ).toBeFocused();
    await expect
      .poll(() =>
        page.locator('.scroll-body').evaluate((el) => el.scrollTop),
      )
      .toBe(before);
  });

  /**
   * The Sign out sheet reuses the canonical `.sheet-foot` Cancel|Confirm grid.
   * A bare `1fr` (= minmax(auto, 1fr)) let the nowrap label floor its column, so
   * DE at 320px rendered 1:1.3 instead of 1:1.6. Locks the ratio, the 44px touch
   * target, and the absence of clipping in both locales at the tightest width.
   */
  for (const locale of ['en', 'de'] as const) {
    test(`sign out sheet keeps the canonical 1:1.6 footer ratio (${locale} @ 320px)`, async ({
      page,
    }) => {
      await page.addInitScript((loc) => {
        localStorage.setItem('autheon-locale', loc);
        localStorage.setItem('autheon-theme', 'light');
      }, locale);
      await page.setViewportSize({ width: 320, height: 740 });
      await page.goto('/pwa/?tab=profile', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('.profile-summary-action')).toBeVisible({
        timeout: 30_000,
      });
      await page.locator('.profile-summary-action').click();

      const foot = page.locator('.sheet-foot');
      await expect(foot).toBeVisible();

      // offsetWidth/Height read the layout box, so the 0.22s `modalIn` scale
      // animation cannot skew the measurement the way getBoundingClientRect does.
      const metrics = await foot.evaluate((el) => {
        const buttons = [...el.querySelectorAll<HTMLElement>('.btn')];
        return {
          widths: buttons.map((b) => b.offsetWidth),
          heights: buttons.map((b) => b.offsetHeight),
          clipped: buttons.map((b) => b.scrollWidth > b.clientWidth + 1),
          overflows: el.scrollWidth > el.clientWidth + 1,
        };
      });

      expect(metrics.widths).toHaveLength(2);
      // Cancel left : destructive confirm right, at the shared 1 : 1.6 ratio.
      expect(metrics.widths[1] / metrics.widths[0]).toBeCloseTo(1.6, 1);
      for (const height of metrics.heights) {
        expect(height).toBeGreaterThanOrEqual(44);
      }
      expect(metrics.clipped).toEqual([false, false]);
      expect(metrics.overflows).toBe(false);
    });
  }
});
