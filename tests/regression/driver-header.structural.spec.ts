import { test, expect } from './support/fixtures/prototype-test.ts';
import { prototypeFrame } from './support/helpers/selectors.ts';
import { openDriverTab, prepareDriverVisual } from './support/helpers/visual.ts';

/**
 * Shared primary-screen header regression (client decision 2026-07-26).
 *
 * Guards the four things the client actually asked for:
 *  1. the Marketplace greeting block (avatar + "Welcome back, <name>") is gone,
 *  2. every primary screen's title starts at the same height,
 *  3. the notification action exists in that header on every primary screen —
 *     including My orders, where it did not exist before,
 *  4. the notification button carries the SAME border treatment as the sort and
 *     filter controls.
 *
 * It also pins the accessibility contract and the pre-existing notification
 * behaviour (badge + count + opening the notifications pane).
 */

const TAB = {
  marketplace: /Marketplace|Marktplatz/i,
  myJobs: /My jobs|Meine Aufträge|Meine Jobs/i,
  info: /Infopoint/i,
  profile: /Profile|Profil/i,
} as const;

const SCREENS = [
  { key: 'marketplace', tab: TAB.marketplace, title: /^Marketplace$/ },
  { key: 'myJobs', tab: TAB.myJobs, title: /^My jobs$/ },
  { key: 'info', tab: TAB.info, title: /^Infopoint$/ },
  { key: 'profile', tab: TAB.profile, title: /^Profile$/ },
] as const;

const NOTIFICATIONS = /Notifications|Benachrichtigungen/i;

function screenHeader(page: import('@playwright/test').Page) {
  return prototypeFrame(page).locator('.pwa-screen-header');
}

function headerBell(page: import('@playwright/test').Page) {
  return screenHeader(page).locator('.header-bell-btn');
}

/** The visual properties the client asked to be identical across header icon buttons. */
async function iconButtonTreatment(locator: import('@playwright/test').Locator) {
  return locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      borderWidth: s.borderTopWidth,
      borderStyle: s.borderTopStyle,
      borderColor: s.borderTopColor,
      borderRadius: s.borderTopLeftRadius,
      background: s.backgroundColor,
      boxShadow: s.boxShadow,
      width: s.width,
      height: s.height,
    };
  });
}

test.describe('driver shared screen header', () => {
  test('Marketplace no longer renders the greeting block', async ({ page }) => {
    await prepareDriverVisual(page);

    const frame = prototypeFrame(page);
    await expect(frame.getByText(/Welcome back|Willkommen zurück/i)).toHaveCount(0);
    // The greeting name and its "JB" initials avatar are gone from the header.
    await expect(screenHeader(page).getByText(/Jordan Blake/)).toHaveCount(0);
    await expect(frame.locator('.driver-avatar')).toHaveCount(0);
    await expect(frame.locator('.driver-welcome')).toHaveCount(0);
    // The old Marketplace-only header wrapper is gone too.
    await expect(frame.locator('.pwa-header')).toHaveCount(0);
  });

  test('Marketplace title uses the standard screen-header position', async ({ page }) => {
    await prepareDriverVisual(page);

    const header = screenHeader(page);
    await expect(header).toHaveCount(1);
    await expect(header.getByRole('heading', { level: 1 })).toHaveText('Marketplace');
    await expect(header.locator('.header-subtitle')).toHaveText('Explore available jobs');
  });

  test('all four primary screen titles align at the same height', async ({ page }) => {
    await prepareDriverVisual(page);

    const tops: Record<string, number> = {};

    for (const screen of SCREENS) {
      await openDriverTab(page, screen.tab);

      const title = screenHeader(page).getByRole('heading', { level: 1 });
      await expect(title).toHaveText(screen.title);

      const box = await title.boundingBox();
      expect(box, `${screen.key} title must be laid out`).not.toBeNull();
      tops[screen.key] = Math.round(box!.y);
    }

    const values = Object.values(tops);
    expect(
      new Set(values).size,
      `titles must share one baseline, got ${JSON.stringify(tops)}`,
    ).toBe(1);
  });

  test('notification action is in the header of every primary screen', async ({ page }) => {
    await prepareDriverVisual(page);

    for (const screen of SCREENS) {
      await openDriverTab(page, screen.tab);

      const bell = headerBell(page);
      await expect(bell, `${screen.key} must expose the notification action`).toHaveCount(1);
      await expect(bell).toBeVisible();

      // Translated accessible name, carrying the unread count as text so the
      // badge is not the only unread indication.
      await expect(bell).toHaveAttribute('aria-label', /Notifications \(\d+\)|Notifications/);
      await expect(bell).toHaveAttribute('aria-haspopup', 'dialog');

      // Touch target stays adequate.
      const box = await bell.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(40);
      expect(box!.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('notification action sits in the same right-side header position on every screen', async ({
    page,
  }) => {
    await prepareDriverVisual(page);

    const rightEdges: number[] = [];
    for (const screen of SCREENS) {
      await openDriverTab(page, screen.tab);
      const box = await headerBell(page).boundingBox();
      rightEdges.push(Math.round(box!.x + box!.width));
    }

    expect(new Set(rightEdges).size, `bell right edges: ${rightEdges}`).toBe(1);
  });

  test('notification button matches the sort and filter border treatment', async ({ page }) => {
    await prepareDriverVisual(page);

    // Sort + filter live in the Marketplace results row.
    const resultsRow = prototypeFrame(page).locator('.portal-results-row');
    const sort = resultsRow.locator('.sort-trigger');
    const filter = resultsRow.getByRole('button', { name: /^Filters?$/i });
    await expect(sort).toBeVisible();
    await expect(filter).toBeVisible();

    const expected = await iconButtonTreatment(sort);
    expect(await iconButtonTreatment(filter)).toEqual(expected);

    // Same treatment for the bell — on every screen, not just Marketplace.
    for (const screen of SCREENS) {
      await openDriverTab(page, screen.tab);
      expect(
        await iconButtonTreatment(headerBell(page)),
        `${screen.key} bell must match sort/filter`,
      ).toEqual(expected);
    }
  });

  test('unread badge and count survive on the shared header', async ({ page }) => {
    await prepareDriverVisual(page);

    const bell = headerBell(page);
    const badge = bell.locator('.bell-badge');

    await expect(badge).toBeVisible();
    const count = Number((await badge.textContent())?.trim());
    expect(count).toBeGreaterThan(0);
    // Decorative — the count is already in the button's accessible name.
    await expect(badge).toHaveAttribute('aria-hidden', 'true');
    await expect(bell).toHaveAttribute('aria-label', `Notifications (${count})`);

    // Same count on the other screens: one store-backed source, not per-screen state.
    for (const screen of SCREENS.slice(1)) {
      await openDriverTab(page, screen.tab);
      await expect(headerBell(page)).toHaveAttribute('aria-label', `Notifications (${count})`);
    }
  });

  test('notification action opens the notifications pane from every primary screen', async ({
    page,
  }) => {
    await prepareDriverVisual(page);

    for (const screen of SCREENS) {
      await openDriverTab(page, screen.tab);

      const bell = headerBell(page);
      await expect(bell).toHaveAttribute('aria-expanded', 'false');
      await bell.click();

      await expect(
        prototypeFrame(page).getByRole('heading', { name: NOTIFICATIONS }),
        `${screen.key} must open the notifications pane`,
      ).toBeVisible();

      await prototypeFrame(page).locator('.notifications-close-btn').click();
      await expect(prototypeFrame(page).locator('.notifications-dropdown')).toHaveCount(0);
      await expect(headerBell(page)).toBeVisible();
    }
  });

  test('Marketplace keeps its sort and filter behaviour in the results area', async ({ page }) => {
    await prepareDriverVisual(page);

    const resultsRow = prototypeFrame(page).locator('.portal-results-row');
    await expect(resultsRow.getByText(/\d+ results/)).toBeVisible();

    await resultsRow.getByRole('button', { name: /^Filters?$/i }).click();
    await expect(
      prototypeFrame(page).getByRole('heading', { name: /^Filters?$/i }),
    ).toBeVisible();
  });

  test('header keeps focus-visible affordance on the notification button', async ({ page }) => {
    await prepareDriverVisual(page);
    await openDriverTab(page, TAB.profile);

    const bell = headerBell(page);

    // Reach the bell by keyboard, not `focus()` — Chromium only matches
    // `:focus-visible` when the focus did not come from a pointer.
    let reached = false;
    for (let i = 0; i < 40 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      reached = await bell.evaluate((el) => el === el.ownerDocument.activeElement);
    }
    expect(reached, 'notification button must be keyboard reachable').toBe(true);

    const focus = await bell.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        focusVisible: el.matches(':focus-visible'),
        outlineWidth: s.outlineWidth,
        outlineStyle: s.outlineStyle,
      };
    });
    expect(focus.focusVisible).toBe(true);
    expect(focus.outlineStyle).not.toBe('none');
    expect(parseFloat(focus.outlineWidth)).toBeGreaterThan(0);
  });
});
