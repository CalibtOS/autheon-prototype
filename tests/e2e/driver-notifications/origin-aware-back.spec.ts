import { expect, test } from '../../regression/support/fixtures/prototype-test.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { prepareDriverVisual } from '../../regression/support/helpers/visual.ts';
import {
  CARD,
  card,
  expandRideCard,
  expectOnTab,
  openNotificationCenter,
  tapDeepLinkCard,
  tapRideAction,
  tapTab,
  tapVisibleBack,
  type DriverTab,
} from '../../regression/support/helpers/notifications.ts';

/**
 * Origin-aware Back.
 *
 * The reported bug: Back after a notification deep link returned to the
 * target's own parent instead of the menu page the Notification Center was
 * opened from. It happened to work for rides — they carry `fromTab` — and failed
 * for Infopoint messages, which threw the origin away. These tests pin BOTH
 * halves of the fix: notification journeys return to their origin, and ordinary
 * navigation keeps the parent it always had.
 *
 * Driven entirely through the rendered UI. Store-level target resolution passing
 * is not evidence that Back works.
 */

/** Closes the document preview sheet that a document deep link opens over the tour. */
async function closeDocumentPreview(page: import('@playwright/test').Page): Promise<void> {
  const sheet = prototypeFrame(page).locator('.docview-panel');
  if (await sheet.count()) {
    await sheet.locator('button').first().click();
    await expect(sheet).toHaveCount(0);
  }
}

test.describe('notification-origin Back @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await prepareDriverVisual(page);
  });

  const messageOrigins: DriverTab[] = ['portal', 'mine', 'info', 'profile'];
  for (const origin of messageOrigins) {
    test(`${origin} → Notification Center → Infopoint message → Back → ${origin}`, async ({
      page,
    }) => {
      if (origin !== 'portal') await tapTab(page, origin);
      await openNotificationCenter(page);
      await tapDeepLinkCard(page, CARD.infopointMessage);

      await expect(prototypeFrame(page).locator('.infopoint-message-body')).toBeVisible();
      await tapVisibleBack(page);
      await expectOnTab(page, origin);
    });
  }

  const profileOrigins: DriverTab[] = ['portal', 'mine', 'info'];
  for (const origin of profileOrigins) {
    test(`${origin} → Notification Center → Profile subpage → Back → ${origin}`, async ({
      page,
    }) => {
      if (origin !== 'portal') await tapTab(page, origin);
      await openNotificationCenter(page);
      await tapDeepLinkCard(page, CARD.profileChange);

      await expect(
        prototypeFrame(page).locator('.driver-subpage-header .detail-header-title'),
      ).toHaveText(/^Basic data$/);
      await tapVisibleBack(page);
      await expectOnTab(page, origin);
    });
  }

  const documentOrigins: DriverTab[] = ['info', 'profile', 'mine'];
  for (const origin of documentOrigins) {
    test(`${origin} → Notification Center → document → Back → ${origin}`, async ({ page }) => {
      await tapTab(page, origin);
      await openNotificationCenter(page);
      await tapDeepLinkCard(page, CARD.document);

      await expect(prototypeFrame(page).locator('.detail-header-title')).toContainText('0842-26');
      await closeDocumentPreview(page);
      await tapVisibleBack(page);
      await expectOnTab(page, origin);
    });
  }

  const rideOrigins: DriverTab[] = ['profile', 'info', 'portal'];
  for (const origin of rideOrigins) {
    test(`${origin} → Notification Center → ride detail → Back → ${origin}`, async ({ page }) => {
      if (origin !== 'portal') await tapTab(page, origin);
      await openNotificationCenter(page);
      await expandRideCard(page, CARD.assignedRide);
      await tapRideAction(page, CARD.assignedRide);

      await expect(prototypeFrame(page).locator('.detail-header-title')).toContainText('0848-26');
      await tapVisibleBack(page);
      await expectOnTab(page, origin);
    });
  }
});

test.describe('ordinary navigation keeps its existing parent @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await prepareDriverVisual(page);
  });

  test('Infopoint list → message → Back → Infopoint list', async ({ page }) => {
    const frame = prototypeFrame(page);
    await tapTab(page, 'info');
    await frame.locator('.myjobs-tab-pill').filter({ hasText: /messages|Nachrichten/i }).click();
    await frame.locator('.infopoint-news-row').first().click();

    await expect(frame.locator('.infopoint-message-body')).toBeVisible();
    await tapVisibleBack(page);
    // Back to the complete list, News tab still selected.
    await expectOnTab(page, 'info');
    await expect(frame.locator('.infopoint-news-row')).not.toHaveCount(0);
  });

  test('Profile → subpage → Back → Profile landing', async ({ page }) => {
    const frame = prototypeFrame(page);
    await tapTab(page, 'profile');
    await frame.locator('.profile-nav-row').first().click();

    await expect(frame.locator('.driver-subpage-header')).toBeVisible();
    await tapVisibleBack(page);
    await expectOnTab(page, 'profile');
  });

  test('My Jobs → ride detail → Back → My Jobs', async ({ page }) => {
    const frame = prototypeFrame(page);
    await tapTab(page, 'mine');
    await frame.locator('.jobcard-btn').first().click();

    await expect(frame.locator('.detail-header-title')).toBeVisible();
    await tapVisibleBack(page);
    await expectOnTab(page, 'mine');
  });
});

test.describe('notification origin does not leak @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await prepareDriverVisual(page);
  });

  test('a consumed origin is not reused by a later ordinary navigation', async ({ page }) => {
    const frame = prototypeFrame(page);
    // Journey 1: Marketplace → NC → message → Back → Marketplace.
    await openNotificationCenter(page);
    await tapDeepLinkCard(page, CARD.infopointMessage);
    await tapVisibleBack(page);
    await expectOnTab(page, 'portal');

    // Journey 2 is ordinary: Infopoint list → message → Back must reach the
    // LIST, not the Marketplace origin left over from journey 1.
    await tapTab(page, 'info');
    await frame.locator('.myjobs-tab-pill').filter({ hasText: /messages|Nachrichten/i }).click();
    await frame.locator('.infopoint-news-row').first().click();
    await tapVisibleBack(page);
    await expectOnTab(page, 'info');
    await expect(frame.locator('.infopoint-news-row')).not.toHaveCount(0);
  });

  test('opening and closing the pane without navigating clears the origin', async ({ page }) => {
    const frame = prototypeFrame(page);
    await tapTab(page, 'mine');
    await openNotificationCenter(page);
    await frame.locator('.notifications-close-btn').click();

    // A subsequent ordinary drill-down must behave normally.
    await frame.locator('.jobcard-btn').first().click();
    await tapVisibleBack(page);
    await expectOnTab(page, 'mine');
  });

  test('repeated notification journeys each return to their own origin', async ({ page }) => {
    // Journey 1 from My Jobs.
    await tapTab(page, 'mine');
    await openNotificationCenter(page);
    await tapDeepLinkCard(page, CARD.infopointMessage);
    await tapVisibleBack(page);
    await expectOnTab(page, 'mine');

    // Journey 2 from Profile must return to Profile, not to My Jobs.
    await tapTab(page, 'profile');
    await openNotificationCenter(page);
    await tapDeepLinkCard(page, CARD.infopointMessage);
    await tapVisibleBack(page);
    await expectOnTab(page, 'profile');
  });

  test('a ride reached from the Marketplace list still returns to the Marketplace', async ({
    page,
  }) => {
    // Ordinary marketplace navigation is untouched by the origin mechanism.
    const frame = prototypeFrame(page);
    await frame.locator('.jobcard-btn').first().click();
    await expect(
      frame.getByRole('heading', { name: /Marketplace preview|Marktplatz-Vorschau/i }),
    ).toBeVisible();
    await tapVisibleBack(page);
    await expectOnTab(page, 'portal');
  });
});
