import { readFileSync } from "node:fs";
import { join } from "node:path";

import { test, expect } from "@playwright/test";

/**
 * Stale-cache guards for the /pwa service worker.
 *
 * The /pwa shell has no bundler, so cache busting is manual `?v=N` query
 * strings in `pwa/index.html`. That has drifted three times (i18n v38 vs v39,
 * store v3 vs v5, pwa.css v16 vs v17), each time leaving the app serving a
 * build nobody could find in the source tree.
 *
 * Two distinct failure modes, guarded separately:
 *
 *  1. FRESHNESS — the HTML is the version manifest: it names every `?v=` URL.
 *     If `sw.js` may answer it from the browser HTTP cache, every asset
 *     resolves to a stale URL and the whole app regresses even when the
 *     versions were bumped correctly. Every origin fetch in the worker must
 *     therefore be `cache: "no-store"`.
 *
 *  2. OFFLINE COMPLETENESS — `PRECACHE_URLS` must list the same versions the
 *     HTML references. Drift here does NOT serve stale bytes (a new `?v=` URL
 *     is a cache miss, so it goes to network); it silently shrinks the offline
 *     shell and warms URLs nobody requests.
 */

const PWA_DIR = join(__dirname, "..", "..", "pwa");

const indexHtml = readFileSync(join(PWA_DIR, "index.html"), "utf8");

/**
 * Comments in these files quote the very tokens being asserted (e.g. a comment
 * explaining `updateViaCache:"none"`), so matching raw source produced a guard
 * that passed after the real call was deleted. Strip comments before asserting.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

const swJs = stripComments(readFileSync(join(PWA_DIR, "sw.js"), "utf8"));
const installJs = stripComments(
  readFileSync(join(PWA_DIR, "pwa-install.js"), "utf8"),
);

/** Every versioned asset the HTML references, normalised to an absolute path. */
function versionedAssetsFrom(html: string): Map<string, string> {
  const found = new Map<string, string>();
  // Matches href/src attributes and the absolute paths inside the PLAIN / JSX
  // boot arrays. Basename + version is enough to compare the two lists.
  const re = /["']([^"']*?\/?([\w.-]+\.(?:css|js|jsx))\?v=(\d+))["']/g;
  for (const [, , file, version] of html.matchAll(re)) {
    found.set(file, version);
  }
  return found;
}

test.describe("@pwa-cache /pwa cache freshness", () => {
  test("service worker never answers an origin fetch from the HTTP cache", () => {
    // Navigation: the HTML must always be a true origin hit.
    expect(
      swJs,
      'networkFirstNavigation must fetch with cache:"no-store" — a navigation Request ' +
        'defaults to cache mode "default", which the HTTP cache can satisfy without ' +
        "reaching the origin, yielding stale HTML and therefore stale ?v= URLs",
    ).toMatch(/await fetch\(request,\s*\{\s*cache:\s*["']no-store["']\s*\}\)/);

    // Revalidation: the runtime cache must converge on the origin.
    // Anchored to fetchFromOrigin — a bare `fetch(request, {cache:"no-store"})`
    // pattern would also match the navigation call above and stay green after
    // this fix was reverted.
    expect(
      swJs,
      'fetchFromOrigin must request with cache:"no-store", otherwise the runtime ' +
        "cache can be refreshed from the HTTP cache and never converges on the origin",
    ).toMatch(
      /function fetchFromOrigin\([\s\S]{0,400}?fetch\(request,\s*\{\s*cache:\s*["']no-store["']\s*\}\)/,
    );
    expect(
      swJs,
      "staleWhileRevalidate must revalidate through fetchFromOrigin",
    ).toMatch(
      /async function staleWhileRevalidate\([\s\S]{0,400}?fetchFromOrigin\(request\)/,
    );

    // Precache: a fresh SHELL_CACHE must not be seeded with stale bytes.
    expect(
      swJs,
      'the install-time precache fetch must pass cache:"no-store"',
    ).toMatch(/fetch\(url,\s*\{[^}]*cache:\s*["']no-store["'][^}]*\}\)/);

    // No bare fetch(request) left in a caching path.
    const bareFetches = swJs.match(/fetch\(request\)(?!\s*[,;)])/g) ?? [];
    expect(
      bareFetches.length,
      "every caching-path fetch must be explicit about its cache mode; a bare " +
        "fetch(request) silently permits an HTTP-cache hit",
    ).toBeLessThanOrEqual(1); // the single documented opaque-request fallback
  });

  test("service worker script itself is never served from the HTTP cache", () => {
    // Must match the register() CALL, not a comment describing it.
    expect(
      installJs,
      'register() must pass updateViaCache:"none" so a new sw.js is always discovered',
    ).toMatch(
      /\.register\(\s*["'][^"']+["']\s*,\s*\{[^}]*updateViaCache:\s*["']none["']/,
    );
  });

  test("a new worker taking over mid-session reloads the page exactly once", () => {
    // sw.js skipWaiting()s and claims clients, so without this the document keeps
    // running the assets the new worker has already superseded.
    expect(installJs).toMatch(/hadController/);
    expect(
      installJs,
      "the update reload must be guarded so it cannot loop",
    ).toMatch(/if \(!hadController\) return;/);
  });

  test("PRECACHE_URLS versions match the versions index.html requests", () => {
    const htmlAssets = versionedAssetsFrom(indexHtml);
    const swAssets = versionedAssetsFrom(swJs);

    expect(
      htmlAssets.size,
      "sanity: index.html should reference several ?v= assets",
    ).toBeGreaterThan(5);

    const drift: string[] = [];
    for (const [file, htmlVersion] of htmlAssets) {
      const swVersion = swAssets.get(file);
      if (swVersion === undefined) continue; // not precached — a deliberate choice
      if (swVersion !== htmlVersion) {
        drift.push(
          `${file}: index.html asks v${htmlVersion}, sw.js precaches v${swVersion}`,
        );
      }
    }

    expect(
      drift,
      "PRECACHE_URLS drifted from index.html. Bump both together:\n  " +
        drift.join("\n  "),
    ).toEqual([]);

    // Anything precached but no longer referenced is dead weight.
    const orphans = [...swAssets.keys()].filter(
      (file) => !htmlAssets.has(file),
    );
    expect(
      orphans,
      "sw.js precaches assets index.html no longer references: " +
        orphans.join(", "),
    ).toEqual([]);
  });
});
