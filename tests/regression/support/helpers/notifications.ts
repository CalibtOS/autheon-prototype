import { expect, type Page } from '@playwright/test';
import { prototypeFrame } from './selectors.ts';

/**
 * Shared vocabulary for the Driver PWA Notification Center.
 *
 * Everything here addresses the app the way a driver does — the bell, a card
 * picked by its heading, the visible Back control — rather than by internal
 * state. That matters for this feature specifically: store-level target
 * resolution passing is NOT evidence that the rendered navigation works, so
 * these specs drive the real UI and read the real screen.
 */

/** Seeded notification ids (see `seedDriverNotifications` in store.js). */
export const NOTIF = {
  /** Marketplace availability, target still published. */
  marketplace: 'DN-SEED-MARKET-001',
  /** Marketplace availability whose order went back to draft — target gone. */
  marketplaceGone: 'DN-SEED-MARKET-GONE',
  /** Direct assignment; driver is committed, so the full ride detail opens. */
  assignedRide: 'DN-SEED-ASSIGNED-001',
  /** Order updated after booking. */
  rideUpdated: 'DN-SEED-ORDER-UPDATED',
  infopointMessage: 'DN-SEED-NEWS-001',
  document: 'DN-SEED-001',
  profileChange: 'DN-SEED-ACCOUNT-001',
} as const;

/** Card headings, used to pick a card the way a driver reads the list. */
export const CARD = {
  marketplace: /New matching order/i,
  assignedRide: /New order assigned/i,
  rideUpdated: /updated/i,
  infopointMessage: /public transport strike/i,
  document: /Document rejected/i,
  profileChange: /Profile change approved/i,
} as const;

/** Bottom-tab order in `TabBar` (driver.jsx). */
const TAB_INDEX = { portal: 0, mine: 1, info: 2, profile: 3 } as const;
export type DriverTab = keyof typeof TAB_INDEX;

/** Primary-screen headings, used to assert which menu page is showing. */
const TAB_HEADING: Record<DriverTab, RegExp> = {
  portal: /^Marketplace$|^Marktplatz$/i,
  mine: /My jobs|Meine Aufträge/i,
  info: /^Infopoint$/i,
  profile: /^Profile$|^Profil$/i,
};

/** Navigates via the bottom tab bar, exactly as a driver would. */
export async function tapTab(page: Page, tab: DriverTab): Promise<void> {
  await prototypeFrame(page).locator('.tabbar-item').nth(TAB_INDEX[tab]).click();
  await expect(
    prototypeFrame(page).getByRole('heading', { name: TAB_HEADING[tab] }),
  ).toBeVisible();
}

/** Asserts the given primary menu page is the one on screen. */
export async function expectOnTab(page: Page, tab: DriverTab): Promise<void> {
  await expect(
    prototypeFrame(page).getByRole('heading', { name: TAB_HEADING[tab] }),
    `expected to be on the ${tab} menu page`,
  ).toBeVisible();
}

export async function openNotificationCenter(page: Page): Promise<void> {
  await prototypeFrame(page)
    .getByRole('button', { name: /Notifications|Benachrichtigungen/i })
    .first()
    .click();
  await expect(prototypeFrame(page).locator('.notifications-dropdown')).toBeVisible();
}

/** One notification card, located by its visible heading. */
export function card(page: Page, heading: RegExp) {
  return prototypeFrame(page).locator('.notification-card').filter({ hasText: heading });
}

/** Taps a deep-link card (message, document, profile) — the row itself is the link. */
export async function tapDeepLinkCard(page: Page, heading: RegExp): Promise<void> {
  await card(page, heading).locator('button.notification-row').first().click();
}

/** Expands a ride card in place. Never navigates. */
export async function expandRideCard(page: Page, heading: RegExp): Promise<void> {
  const toggle = card(page, heading).locator('.notification-row-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

/** Taps the single contextual action inside an expanded ride card. */
export async function tapRideAction(page: Page, heading: RegExp): Promise<void> {
  await card(page, heading).locator('.notification-card-actions .btn').click();
}

/** The visible Back control on any driver detail/subpage header. */
export async function tapVisibleBack(page: Page): Promise<void> {
  await prototypeFrame(page).locator('.detail-back-btn').first().click();
}

/** Reads the label/value pairs rendered in the expanded ride preview. */
export async function ridePreviewRows(
  page: Page,
  heading: RegExp,
): Promise<Array<[string, string]>> {
  return card(page, heading)
    .locator('.notification-preview-row')
    .evaluateAll((rows) =>
      rows.map((row) => [
        row.querySelector('dt')?.textContent?.trim() ?? '',
        row.querySelector('dd')?.textContent?.trim() ?? '',
      ]),
    ) as Promise<Array<[string, string]>>;
}

/**
 * The installed-PWA surface at /pwa renders directly in the page — no iframe —
 * so these helpers use plain page locators rather than `prototypeFrame`.
 */
async function authenticatePwa(page: Page): Promise<void> {
  await page.evaluate(() => {
    const store = (window as any).AuthStore;
    if (store && !store.isDriverAuthenticated()) {
      store.loginDriver({ email: 'driver.one@demo.local', password: 'password' });
    }
  });
}

/** Boots the standalone /pwa surface, authenticated, with no deep link. */
export async function gotoPwa(page: Page): Promise<void> {
  await page.goto('/pwa/', { waitUntil: 'networkidle' });
  await authenticatePwa(page);
  await expect(page.locator('.tabbar-item').first()).toBeVisible();
}

/**
 * Applies a push deep link the way a tap on a real push does: the launch URL
 * carries `?notify=<id>`.
 *
 * `mode` covers the three launch states one handler has to serve. `cold` is a
 * full navigation to the notify URL — the prototype store is in-memory and
 * re-seeded per load, so this really is a fresh process. `open` and
 * `background` re-navigate an ALREADY-RUNNING client, which is what a tap on a
 * live or backgrounded instance does; `popstate` is the signal the app listens
 * for in that case.
 */
export async function pushTap(
  page: Page,
  notificationId: string,
  mode: 'cold' | 'open' | 'background' = 'cold',
): Promise<void> {
  if (mode === 'cold') {
    await page.goto(`/pwa/?notify=${notificationId}`, { waitUntil: 'networkidle' });
    // The store is in-memory and re-seeds per load, so a cold launch arrives at
    // the login gate first. Authenticating mounts the driver shell, which reads
    // `?notify=` off the launch URL on mount — the same path a home-screen or
    // closed-app launch takes.
    await authenticatePwa(page);
    // Wait for the shell to settle on the deep link's destination. Not the tab
    // bar specifically: a ride or document target opens a detail view, and the
    // shell hides the tab bar while one is open.
    await page.waitForFunction(
      () =>
        !!document.querySelector('.detail-header-title') ||
        !!document.querySelector('.notifications-dropdown') ||
        !!document.querySelector('.tabbar-item'),
    );
    return;
  }
  await gotoPwa(page);
  if (mode === 'background') {
    // Approximates a backgrounded client: hidden, then re-focused by the tap.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
  await page.evaluate((id) => {
    window.history.pushState({}, '', `/pwa/?notify=${id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, notificationId);
}

/** Heading of whatever screen the /pwa surface is currently showing. */
export async function pwaHeading(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      document.querySelector('.detail-header-title')?.textContent?.trim() ||
      document.querySelector('.header-title')?.textContent?.trim() ||
      '',
  );
}
