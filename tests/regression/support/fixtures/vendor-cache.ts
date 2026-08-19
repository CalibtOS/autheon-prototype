import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import type { Page } from '@playwright/test';

/**
 * Deterministic serving of the prototype's third-party runtime dependencies.
 *
 * The prototype is a bundler-less static app: six pages under `prototype/` and
 * `pwa/` load React, ReactDOM, Babel Standalone and pdf.js straight from
 * unpkg.com at runtime, and transpile JSX in the browser.
 *
 * That is fine for a human clicking around. It is not fine for a visual
 * regression suite:
 *
 *   - The four libraries are ~5.5 MB, re-fetched on every page load. A 53-test
 *     run made 150+ CDN requests / ~290 MB of traffic in a few minutes.
 *   - Partway through a full run unpkg throttles them. The scripts then fail to
 *     load, React never mounts, the page renders nothing, and the spec fails on
 *     `expect(page.locator('.story')).toHaveCount(...)` long before it reaches a
 *     screenshot assertion.
 *   - Running the same specs in isolation makes only a handful of requests and
 *     passes — which is why this looked like three unrelated flaky specs rather
 *     than one shared root cause.
 *   - A "canonical, deterministic" rendering environment cannot depend on a
 *     third-party network at all.
 *
 * So each pinned asset is fetched ONCE into a local cache and every subsequent
 * request is served from disk. The bytes are identical to the CDN's — the version
 * is pinned in the URL — so rendering is unchanged. This stabilises the test
 * environment; it does not alter application behaviour.
 *
 * The cache is gitignored, warmed into the image at Docker build time so a
 * container run needs no network, and warmed on demand for a local developer.
 */

// `import.meta` is unavailable: Playwright transpiles specs to CommonJS.
// `__dirname` is, and it points at this file's directory either way.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MANIFEST = path.join(REPO_ROOT, 'tests', 'regression', 'vendor-assets.json');

type VendorManifest = { cacheDir: string; assets: string[] };

const manifest: VendorManifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

export const VENDOR_ASSETS: readonly string[] = manifest.assets;
export const vendorCacheDir = path.resolve(REPO_ROOT, manifest.cacheDir);

/**
 * Stable on-disk name for a pinned URL.
 *
 * A pure string transform, duplicated verbatim in scripts/warm-vendor-cache.mjs
 * because that file is an ES module and this one is transpiled to CommonJS, so
 * they cannot import each other. Keep the two identical or the warmer will write
 * files the route handler cannot find.
 */
export function cacheFileName(url: string): string {
  return url.replace(/^https:\/\/unpkg\.com\//, '').replace(/[/@]/g, '__');
}

export function cachePathFor(url: string): string {
  return path.join(vendorCacheDir, cacheFileName(url));
}

function contentTypeFor(url: string): string {
  if (/\.m?js$/.test(url)) return 'application/javascript; charset=utf-8';
  if (url.endsWith('.css')) return 'text/css; charset=utf-8';
  if (url.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

/**
 * Download any missing pinned asset. Runs at most once per process.
 *
 * A failure is thrown rather than swallowed: continuing would produce a run whose
 * pages half-loaded, which is the exact failure mode this module removes.
 */
let warmPromise: Promise<void> | undefined;

export function ensureVendorCache(): Promise<void> {
  warmPromise ??= warmCache();
  return warmPromise;
}

async function warmCache(): Promise<void> {
  await fsp.mkdir(vendorCacheDir, { recursive: true });

  for (const url of VENDOR_ASSETS) {
    const target = cachePathFor(url);
    if (fs.existsSync(target)) continue;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error(
        `Could not warm the vendor cache entry for ${url}: ${(error as Error).message}\n` +
          'Run "npm run test:regression:vendor" once with network access.',
      );
    }

    if (!response.ok) {
      throw new Error(
        `Could not warm the vendor cache entry for ${url}: HTTP ${response.status} ${response.statusText}`,
      );
    }

    // Write via a temp file so a parallel worker never observes a partial asset.
    const temp = `${target}.${process.pid}.tmp`;
    await fsp.writeFile(temp, Buffer.from(await response.arrayBuffer()));
    await fsp.rename(temp, target);
  }
}

/**
 * Serve the pinned assets from the local cache for this page.
 *
 * An unpkg request that is NOT pinned is failed deliberately rather than passed
 * through: passing it would quietly reintroduce the non-determinism this removes,
 * whereas failing it surfaces the drift as an error naming the URL.
 */
export async function installVendorRoutes(page: Page): Promise<void> {
  await ensureVendorCache();

  const pinned = new Set(VENDOR_ASSETS);

  await page.route('https://unpkg.com/**', async (route) => {
    const url = route.request().url();

    if (!pinned.has(url)) {
      await route.fulfill({
        status: 502,
        contentType: 'text/plain; charset=utf-8',
        body:
          `Unpinned third-party request blocked by the visual regression suite: ${url}\n` +
          'Add it to tests/regression/vendor-assets.json.',
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: contentTypeFor(url),
      headers: { 'cache-control': 'public, max-age=31536000, immutable' },
      body: await fsp.readFile(cachePathFor(url)),
    });
  });
}
