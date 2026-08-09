import { expect, test, type Page } from '@playwright/test';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { prepareDriverVisual } from '../../regression/support/helpers/visual.ts';

/**
 * PROTOTYPE/DEMO-ONLY control: previews the already-booked conflict dialog from
 * beside the booking-success dialog.
 *
 * It exists because the prototype runs on ONE in-memory driver identity, so a
 * client cannot reproduce two partners racing for the same order. The control
 * simulates nothing — the assertions below therefore care as much about what it
 * does NOT do (no re-acceptance, no state change, no audit entry) as about what
 * it renders. The real `not_available` acceptance-failure path is unchanged and
 * is not exercised here.
 *
 * Both prototype entry points are covered: the framed client preview (inside the
 * prototype iframe) and the standalone Driver PWA at /pwa (no iframe).
 */

// The /pwa surface registers a service worker that precaches the shell. Across
// tests in one origin it can serve a previously cached bundle, which makes the
// first render non-deterministic. Blocking it keeps every test on the files
// actually on disk — the SW itself is covered by its own spec.
test.use({ serviceWorkers: 'block' });

const EN = {
  demoName: 'Demo: Already booked',
  title: 'Order already booked',
  desc: 'This order is no longer available — another service partner has booked it.',
  action: 'Back to Marketplace',
};
const DE = {
  demoName: 'Demo: Bereits gebucht',
  title: 'Auftrag bereits gebucht',
  desc: 'Dieser Auftrag ist nicht mehr verfügbar — ein anderer Servicepartner hat ihn gebucht.',
  action: 'Zum Marktplatz',
};

/** A surface = how to reach the app's DOM and its locators on each entry point. */
type Surface = {
  label: string;
  /** Locator root. */
  ui: (page: Page) => ReturnType<typeof prototypeFrame> | Page;
  /** Evaluation context (the iframe's frame, or the page). */
  ctx: (page: Page) => Promise<{ evaluate: Page['evaluate'] }>;
  open: (page: Page) => Promise<void>;
};

const FRAMED: Surface = {
  label: 'framed prototype',
  ui: (page) => prototypeFrame(page),
  ctx: async (page) => {
    const handle = await page.locator('iframe[title="AUTHEON Prototype"]').elementHandle();
    const frame = await handle?.contentFrame();
    if (!frame) throw new Error('prototype iframe not found');
    return frame as unknown as { evaluate: Page['evaluate'] };
  },
  open: async (page) => {
    await prepareDriverVisual(page);
  },
};

const STANDALONE: Surface = {
  label: 'standalone driver PWA',
  ui: (page) => page,
  ctx: async (page) => page,
  // Navigation only — /pwa opens on the login gate, so the Marketplace does not
  // exist until `enableBooking` authenticates.
  open: async (page) => {
    await page.goto('/pwa/', { waitUntil: 'networkidle' });
  },
};

/**
 * Puts the driver in a state where a NEW booking is possible.
 *
 * The seeded demo driver sits at the probation acceptance limit, so acceptance
 * would be refused before the success dialog could ever appear. Clearing it uses
 * the existing admin `releaseDriverFromProbation` action rather than reaching
 * into internals — this is test setup for the real flow, not part of the demo.
 */
async function enableBooking(ctx: { evaluate: Page['evaluate'] }): Promise<void> {
  // The prototype transpiles its JSX in the browser, so `networkidle` can be
  // reached before the store exists and the shell mounts. Wait for the store
  // rather than assuming it, otherwise setup races the boot.
  await ctx.evaluate(async () => {
    const ready = async () => {
      for (let i = 0; i < 100; i += 1) {
        if ((window as any).AuthStore?.getCurrentDriver) return (window as any).AuthStore;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error('AuthStore never became available');
    };
    const store = await ready();
    if (!store.isDriverAuthenticated()) {
      store.loginDriver({ email: 'driver.one@demo.local', password: 'password' });
    }
    const driver = store.getCurrentDriver();
    if (!driver.probationClearedAt) store.releaseDriverFromProbation(driver.id);
  });
}

/**
 * Authenticates, clears probation, and waits for the Marketplace to render.
 *
 * Signing in goes through the real login UI when the gate is showing. Setting
 * the session directly on the store races the shell's first mount — the session
 * lands before the app subscribes and the gate stays on screen — which made this
 * setup intermittently fail. Clicking is what a driver does and cannot race.
 */
async function readyToBook(page: Page, surface: Surface): Promise<void> {
  const ui = surface.ui(page);
  const loginButton = ui.getByRole('button', { name: /^Login$/ });
  await expect(ui.locator('.jobcard-btn').first().or(loginButton.first())).toBeVisible({
    timeout: 30_000,
  });
  if (await loginButton.count()) {
    await ui.getByRole('button', { name: /Fill demo credentials/i }).click();
    await loginButton.first().click();
  }
  await enableBooking(await surface.ctx(page));
  await expect(ui.locator('.jobcard-btn').first()).toBeVisible({ timeout: 30_000 });
}

/** Books the first Marketplace order through the REAL flow, untouched by this task. */
async function bookFirstOrder(page: Page, surface: Surface): Promise<void> {
  const ui = surface.ui(page);
  await ui.locator('.jobcard-btn').first().click();
  await expect(ui.locator('.lg-cta').first()).toBeVisible();
  await ui.locator('.lg-cta').first().click();

  // Binding acceptance is a slide gesture, deliberately not a button. Let the
  // dialog finish mounting before measuring — a box read while it is still
  // appearing puts the drag on the wrong coordinates and the gesture silently
  // does nothing.
  const thumbLocator = ui.locator('.slide-confirm .thumb').first();
  await expect(thumbLocator).toBeVisible();
  await page.waitForTimeout(400);
  const track = await ui.locator('.slide-confirm').first().boundingBox();
  const thumb = await thumbLocator.boundingBox();
  if (!track || !thumb) throw new Error('slide-to-confirm control not found');
  const y = thumb.y + thumb.height / 2;
  await page.mouse.move(thumb.x + thumb.width / 2, y);
  await page.mouse.down();
  for (let step = 1; step <= 30; step += 1) {
    await page.mouse.move(thumb.x + thumb.width / 2 + ((track.width - 56) * step) / 30 + 8, y);
  }
  // The control marks itself `done` at the threshold and commits on a timer.
  await expect(ui.locator('.slide-confirm.done')).toHaveCount(1);
  await page.waitForTimeout(600);
  await page.mouse.up();

  // Acceptance commits on a short timer after the gesture completes, so wait for
  // whichever dialog it produces before deciding what to do next. `count()` does
  // not auto-wait, and checking it immediately would silently skip the overlap
  // step and leave the booking unfinished.
  const overlapConfirm = ui.locator('.dialog-actions .btn.cta');
  await expect(ui.locator('.dialog-icon-success, .dialog-actions .btn.cta')).toBeVisible();

  // Pre-existing extra confirmation: the seeded order overlaps a same-day tour.
  if (await overlapConfirm.count()) await overlapConfirm.click();

  await expect(ui.locator('.dialog-icon-success')).toBeVisible();
}

/** Everything the preview must leave untouched. */
function readState(ctx: { evaluate: Page['evaluate'] }) {
  return ctx.evaluate(() => {
    const store = (window as any).AuthStore;
    return {
      auditEntries: store.getAuditLog().length,
      notifications: store.getDriverNotifications().length,
      jobStatuses: store.getJobs().map((j: any) => `${j.id}:${j.status}`).join(','),
      assignedDrivers: store.getJobs().map((j: any) => `${j.id}:${j.driver ?? ''}`).join(','),
      acceptedIds: [...(store.driver?.acceptedIds ?? [])].sort().join(','),
      pdfVersions: store.getJobs().map((j: any) => `${j.id}:${j.pdfVersion}`).join(','),
      transportOrderDocs: (store.getTransportOrderDocuments?.() ?? []).length,
      probation: JSON.stringify(store.getDriverProbationSummary?.() ?? null),
    };
  });
}

for (const surface of [FRAMED, STANDALONE]) {
  test.describe(`already-booked demo preview — ${surface.label} @smoke`, () => {
    test.beforeEach(async ({ page }) => {
      await surface.open(page);
      await readyToBook(page, surface);
    });

    test('demo control appears beside the success dialog, outside its action row', async ({
      page,
    }) => {
      const ui = surface.ui(page);
      const ctx = await surface.ctx(page);
      await bookFirstOrder(page, surface);

      const demo = ui.locator('.demo-control-btn');
      await expect(demo).toHaveCount(1);
      await expect(demo).toHaveAccessibleName(EN.demoName);
      // Outside the panel entirely — it must never join the real action row.
      await expect(ui.locator('.dialog-aside .demo-control-btn')).toHaveCount(1);
      await expect(ui.locator('.dialog-actions .demo-control-btn')).toHaveCount(0);
      // A real button, at the 44px touch-target floor, with a visible Demo mark.
      expect(await demo.evaluate((el) => el.tagName)).toBe('BUTTON');
      // Computed min-height for the same reason as the dialog action above.
      const demoMinHeight = await demo.evaluate((el) =>
        parseFloat(getComputedStyle(el).minHeight),
      );
      expect(demoMinHeight).toBeGreaterThanOrEqual(44);
      await expect(ui.locator('.demo-control-badge')).toHaveText('Demo');

      // Never covers the dialog, never widens the page.
      const layout = await ctx.evaluate(() => {
        const panel = document.querySelector('.dialog-panel')!.getBoundingClientRect();
        const aside = document.querySelector('.dialog-aside')!.getBoundingClientRect();
        const root = document.documentElement;
        return {
          clearOfPanel: aside.top >= panel.bottom - 1,
          horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
        };
      });
      expect(layout.clearOfPanel).toBe(true);
      expect(layout.horizontalOverflow).toBe(false);
    });

    test('the demo control is not present anywhere else in the app', async ({ page }) => {
      const ui = surface.ui(page);
      // Marketplace, before any booking.
      await expect(ui.locator('.demo-control-btn')).toHaveCount(0);
      await ui.locator('.jobcard-btn').first().click();
      await expect(ui.locator('.demo-control-btn')).toHaveCount(0);
    });

    test('selecting it replaces the success dialog with the already-booked dialog', async ({
      page,
    }) => {
      const ui = surface.ui(page);
      const ctx = await surface.ctx(page);
      await bookFirstOrder(page, surface);

      // Activated by KEYBOARD, which also proves it is reachable and operable.
      await ctx.evaluate(() => (document.querySelector('.demo-control-btn') as HTMLElement).focus());
      await page.keyboard.press('Enter');

      const conflict = ui.locator('[role="alertdialog"]');
      await expect(conflict).toBeVisible();
      await expect(conflict.locator('.dialog-title')).toHaveText(EN.title);
      await expect(conflict.locator('.dialog-desc')).toHaveText(EN.desc);
      await expect(conflict.locator('.dialog-actions .btn')).toHaveText(EN.action);

      // Never two modals, and the success dialog + demo control are both gone.
      await expect(ui.locator('.dialog-icon-success')).toHaveCount(0);
      await expect(ui.locator('.demo-control-btn')).toHaveCount(0);
      expect(
        await ctx.evaluate(
          () => document.querySelectorAll('[role="dialog"],[role="alertdialog"]').length,
        ),
      ).toBe(1);

      // Warning treatment, accessible associations, decorative icon.
      await expect(ui.locator('.dialog-icon-warning')).toHaveCount(1);
      await expect(conflict).toHaveAttribute('aria-labelledby', /.+/);
      await expect(conflict).toHaveAttribute('aria-describedby', /.+/);
      await expect(ui.locator('.dialog-icon')).toHaveAttribute('aria-hidden', 'true');
      // Touch target is asserted from the COMPUTED style, not the bounding box:
      // the dialog mounts with a `modalIn` scale animation (0.96 -> 1), so a box
      // measured mid-animation reports ~43.2px for a 44px control. The computed
      // min-height is the actual standard and does not move.
      const actionMinHeight = await conflict
        .locator('.dialog-actions .btn')
        .evaluate((el) => parseFloat(getComputedStyle(el).minHeight));
      expect(actionMinHeight).toBeGreaterThanOrEqual(44);
    });

    test('the preview changes no job, audit, PDF, notification or probation state', async ({
      page,
    }) => {
      const ui = surface.ui(page);
      const ctx = await surface.ctx(page);
      await bookFirstOrder(page, surface);

      // Snapshot AFTER the real booking, so only the preview is under test.
      const before = await readState(ctx);
      await ui.locator('.demo-control-btn').click();
      await expect(ui.locator('[role="alertdialog"]')).toBeVisible();
      const after = await readState(ctx);

      expect(after).toEqual(before);
    });

    test('Back to Marketplace closes everything and opens the Marketplace', async ({ page }) => {
      const ui = surface.ui(page);
      const ctx = await surface.ctx(page);
      await bookFirstOrder(page, surface);
      await ui.locator('.demo-control-btn').click();
      await ui.locator('[role="alertdialog"] .dialog-actions .btn').click();

      await expect(ui.locator('.header-title')).toHaveText(/Marketplace|Marktplatz/);
      expect(
        await ctx.evaluate(
          () => document.querySelectorAll('[role="dialog"],[role="alertdialog"]').length,
        ),
      ).toBe(0);
    });

    test('German copy is used throughout', async ({ page }) => {
      const ui = surface.ui(page);
      const ctx = await surface.ctx(page);
      await bookFirstOrder(page, surface);

      await ctx.evaluate(() => (window as any).I18n.setLocale('de'));
      await expect(ui.locator('.demo-control-btn')).toHaveAccessibleName(DE.demoName);

      await ui.locator('.demo-control-btn').click();
      const conflict = ui.locator('[role="alertdialog"]');
      await expect(conflict.locator('.dialog-title')).toHaveText(DE.title);
      await expect(conflict.locator('.dialog-desc')).toHaveText(DE.desc);
      await expect(conflict.locator('.dialog-actions .btn')).toHaveText(DE.action);
    });

    test('no native browser dialog is introduced', async ({ page }) => {
      let native = 0;
      page.on('dialog', async (d) => {
        native += 1;
        await d.dismiss();
      });
      const ui = surface.ui(page);
      await bookFirstOrder(page, surface);
      await ui.locator('.demo-control-btn').click();
      await expect(ui.locator('[role="alertdialog"]')).toBeVisible();
      expect(native).toBe(0);
    });
  });
}

test.describe('already-booked demo preview — responsive @smoke', () => {
  for (const width of [320, 360, 390, 430, 768]) {
    test(`fits without overlap or overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await STANDALONE.open(page);
      await readyToBook(page, STANDALONE);
      await bookFirstOrder(page, STANDALONE);

      const layout = await page.evaluate(() => {
        const panel = document.querySelector('.dialog-panel')!.getBoundingClientRect();
        const aside = document.querySelector('.dialog-aside')!.getBoundingClientRect();
        const screen = document.querySelector('.phone-screen')!.getBoundingClientRect();
        const root = document.documentElement;
        return {
          clearOfPanel: aside.top >= panel.bottom - 1,
          insideScreen:
            aside.left >= screen.left - 1 &&
            aside.right <= screen.right + 1 &&
            aside.bottom <= screen.bottom + 1,
          horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
        };
      });
      expect(layout.clearOfPanel).toBe(true);
      expect(layout.insideScreen).toBe(true);
      expect(layout.horizontalOverflow).toBe(false);
    });
  }
});
