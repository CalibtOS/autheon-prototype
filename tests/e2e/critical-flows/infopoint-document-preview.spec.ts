import type { Page } from '@playwright/test';
import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';

async function openAuthenticatedPwa(page: Page, locale: 'en' | 'de' = 'en') {
  await page.addInitScript((nextLocale) => {
    localStorage.setItem('autheon-locale', nextLocale);
    localStorage.setItem('autheon-theme', 'light');
  }, locale);

  await page.goto('/pwa/', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', {
      name: /Fill demo credentials|Demo-Zugangsdaten/i,
    })
    .click();
  await page.getByRole('button', { name: /^Login$|^Anmelden$/i }).click();
  await expect(
    page.getByRole('heading', { name: /Marketplace|Marktplatz/i }),
  ).toBeVisible();
}

async function openInfopointDocumentPreview(page: Page) {
  await page
    .locator('.tabbar-capsule')
    .getByRole('button', { name: /Infopoint/i })
    .click();
  await page
    .getByRole('button', {
      name: /^(View|Ansehen): General work instructions$/i,
    })
    .click();
  await expect(page.locator('.docview-panel')).toBeVisible();
}

/**
 * The installed Driver PWA has two shell modes:
 * normal primary screens keep the global tab bar, while an opened Infopoint
 * document becomes a focused full-screen view. These checks assert the shell
 * structure and reachable actions; real iOS safe-area rendering still needs
 * manual device validation.
 */
test.describe('Infopoint document preview focused PWA mode @critical', () => {
  test('hides global navigation and lets the document action bar own the bottom edge', async ({
    page,
  }) => {
    await openAuthenticatedPwa(page, 'en');

    await test.step('normal Infopoint keeps the global navigation', async () => {
      await page
        .locator('.tabbar-capsule')
        .getByRole('button', { name: /Infopoint/i })
        .click();
      await expect(page.locator('.pwa-tabbar-slot')).toBeVisible();
      await expect(
        page.locator('.tabbar-item.active', { hasText: /Infopoint/i }),
      ).toBeVisible();
    });

    await test.step('opened document enters focused mode', async () => {
      await page
        .getByRole('button', { name: /^View: General work instructions$/i })
        .click();
      await expect(page.locator('.docview-panel')).toBeVisible();
      await expect(page.locator('.pwa-tabbar-slot')).toHaveCount(0);
    });

    const actions = page.locator('.docview-actions');
    const download = actions.getByRole('button', { name: /Download/i });

    await test.step('all three document actions remain visible and reachable', async () => {
      await expect(download).toBeVisible();
      await expect(actions.getByRole('button', { name: /Share/i })).toBeVisible();
      await expect(actions.getByRole('button', { name: /Print/i })).toBeVisible();
      await expect(actions.getByRole('button')).toHaveCount(3);
      await expect(actions.locator('.docview-action-icon svg')).toHaveCount(3);

      const hit = await download.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const top = el.ownerDocument.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        return {
          insideDownload: el.contains(top),
          hitClass: (top as HTMLElement | null)?.className?.toString() ?? null,
        };
      });

      expect(hit.hitClass).not.toContain('tabbar');
      expect(hit.insideDownload).toBe(true);
      await download.click({ trial: true, timeout: 5_000 });
    });

    await test.step('viewer reclaims the tabbar slot with no bottom ghost region', async () => {
      const geometry = await page.evaluate(() => {
        const phone = document.querySelector('.phone')?.getBoundingClientRect();
        const panel = document
          .querySelector('.docview-panel')
          ?.getBoundingClientRect();
        const body = document
          .querySelector('.docview-body')
          ?.getBoundingClientRect();
        const bar = document
          .querySelector('.docview-actions')
          ?.getBoundingClientRect();
        return {
          phoneBottom: phone?.bottom ?? null,
          panelBottom: panel?.bottom ?? null,
          bodyBottom: body?.bottom ?? null,
          barTop: bar?.top ?? null,
          barBottom: bar?.bottom ?? null,
        };
      });

      expect(geometry.panelBottom).toBeCloseTo(geometry.phoneBottom!, 0);
      expect(geometry.barBottom).toBeCloseTo(geometry.panelBottom!, 0);
      expect(geometry.bodyBottom).toBeLessThanOrEqual(geometry.barTop! + 1);
    });

    await test.step('document scrolls to the end above the action bar', async () => {
      await page.locator('.docview-page').last().waitFor({
        state: 'visible',
        timeout: 20_000,
      });

      const scrollState = await page.evaluate(() => {
        const scroller = document.querySelector('.docview-pages');
        const pages = Array.from(document.querySelectorAll('.docview-page'));
        const lastPage = pages.at(-1);
        const actions = document
          .querySelector('.docview-actions')
          ?.getBoundingClientRect();
        if (!scroller || !lastPage || !actions) return null;

        scroller.scrollTop = scroller.scrollHeight;

        const lastRect = lastPage.getBoundingClientRect();
        return {
          atEnd:
            Math.ceil(scroller.scrollTop + scroller.clientHeight) >=
            scroller.scrollHeight - 1,
          lastPageBottom: lastRect.bottom,
          actionsTop: actions.top,
        };
      });

      expect(scrollState).not.toBeNull();
      expect(scrollState!.atEnd).toBe(true);
      expect(scrollState!.lastPageBottom).toBeLessThanOrEqual(
        scrollState!.actionsTop + 1,
      );
    });

    await test.step('close restores Infopoint and the global navigation', async () => {
      await page.locator('.docview-head').getByRole('button').click();
      await expect(page.locator('.docview-panel')).toHaveCount(0);
      await expect(page.locator('.pwa-tabbar-slot')).toBeVisible();
      await expect(
        page.locator('.tabbar-item.active', { hasText: /Infopoint/i }),
      ).toBeVisible();
    });
  });

  test('normal primary headers start at the PWA frame top', async ({ page }) => {
    await openAuthenticatedPwa(page, 'en');

    for (const tabName of [/Marketplace/i, /My jobs/i, /Infopoint/i, /Profile/i]) {
      await page.locator('.tabbar-capsule').getByRole('button', { name: tabName }).click();
      const geometry = await page.evaluate(() => {
        const screen = document
          .querySelector('.phone-screen')
          ?.getBoundingClientRect();
        const header = document
          .querySelector('.pwa-screen-header')
          ?.getBoundingClientRect();
        return {
          screenTop: screen?.top ?? null,
          headerTop: header?.top ?? null,
        };
      });

      expect(geometry.headerTop).toBeCloseTo(geometry.screenTop!, 0);
    }
  });

  test('German document action labels fit the full-width action bar', async ({
    page,
  }) => {
    await openAuthenticatedPwa(page, 'de');
    await openInfopointDocumentPreview(page);

    const actions = page.locator('.docview-actions');
    await expect(actions.getByRole('button', { name: /Herunterladen/i })).toBeVisible();
    await expect(actions.getByRole('button', { name: /Teilen/i })).toBeVisible();
    await expect(actions.getByRole('button', { name: /Drucken/i })).toBeVisible();

    const overflows = await actions.evaluate((el) => {
      const barOverflows = el.scrollWidth > el.clientWidth + 1;
      const labelOverflows = Array.from(
        el.querySelectorAll('.docview-action-label'),
      ).some((label) => label.scrollWidth > label.clientWidth + 1);
      return barOverflows || labelOverflows;
    });

    expect(overflows).toBe(false);
  });
});
