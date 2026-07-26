import { test, expect } from '../../regression/support/fixtures/prototype-test.ts';
import {
  switchLanguage,
  switchTheme,
  switchToDriverPWA,
} from '../../regression/support/helpers/header-controls.ts';
import { prototypeFrame } from '../../regression/support/helpers/selectors.ts';
import { gotoPrototype } from '../../regression/support/helpers/stable-page.ts';
import { openDriverTab, waitForOpenDialog } from '../../regression/support/helpers/visual.ts';

/**
 * The document preview is a full-frame overlay, but the bottom tab bar is a
 * later sibling inside .phone-screen and ties it on z-index. When the preview
 * rendered inline in the Infopoint pane, the nav painted over the
 * Download/Share/Print row and swallowed its taps — the actions were visible
 * in screenshots but completely unusable.
 *
 * Job detail unmounts the tab bar, so it never showed the bug; Infopoint is
 * the regression surface. These assertions pin the functional symptom (can the
 * user actually reach Download?) rather than pixels.
 */
test.describe('Infopoint document preview actions @critical', () => {
  test('Download stays reachable and is not covered by the bottom tab bar', async ({
    page,
  }) => {
    await gotoPrototype(page);
    await switchLanguage(page, 'EN');
    await switchTheme(page, 'light');
    await switchToDriverPWA(page);

    const frame = prototypeFrame(page);

    await test.step('open a document preview from the Infopoint documents tab', async () => {
      await openDriverTab(page, /Infopoint/i);
      await frame
        .getByRole('button', { name: /^View: General work instructions$/i })
        .click();
      await waitForOpenDialog(page);
      await expect(frame.locator('.docview-panel')).toBeVisible();
    });

    const download = frame.locator('.docview-actions').getByRole('button', {
      name: /Download/i,
    });

    await test.step('the tab bar does not sit on top of the actions row', async () => {
      await expect(download).toBeVisible();

      // Playwright's own actionability check catches interception, but assert
      // the hit-test explicitly so a failure names the culprit instead of
      // timing out on an opaque "element intercepts pointer events".
      const topmost = await download.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const hit = el.ownerDocument.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        return {
          insideDownload: el.contains(hit),
          hitClass: (hit as HTMLElement | null)?.className?.toString() ?? null,
        };
      });

      expect(topmost.hitClass).not.toContain('tabbar');
      expect(topmost.insideDownload).toBe(true);
    });

    await test.step('Download is actually clickable', async () => {
      // Fails on pointer interception rather than silently passing.
      await download.click({ trial: true, timeout: 5_000 });
    });
  });
});
