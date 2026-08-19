#!/usr/bin/env node
/**
 * Warm (and drift-check) the visual suite's third-party vendor cache.
 *
 *   node scripts/warm-vendor-cache.mjs           Download any missing asset, then check
 *   node scripts/warm-vendor-cache.mjs --check   Drift-check only, download nothing
 *
 * The prototype pages load React, ReactDOM, Babel Standalone and pdf.js from
 * unpkg.com at runtime (~5.5 MB per page load). The visual suite serves them from
 * a local cache instead, so a run never depends on a third-party network. See
 * tests/regression/support/fixtures/vendor-cache.ts for the full reasoning.
 *
 * Runs at Docker build time so a container run needs no network.
 */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(repoRoot, 'tests', 'regression', 'vendor-assets.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

const assets = manifest.assets;
const cacheDir = path.resolve(repoRoot, manifest.cacheDir);

/**
 * Duplicated verbatim from vendor-cache.ts.
 *
 * That file is transpiled to CommonJS by Playwright and this one is an ES module,
 * so they cannot import each other. Keep the two identical, or the warmer writes
 * files the route handler cannot find.
 */
function cacheFileName(url) {
  return url.replace(/^https:\/\/unpkg\.com\//, '').replace(/[/@]/g, '__');
}

const args = process.argv.slice(2);

if (!args.includes('--check')) await warm();
await checkForDrift();

async function warm() {
  await fs.mkdir(cacheDir, { recursive: true });
  console.log(`[vendor-cache] Cache directory: ${rel(cacheDir)}`);

  let total = 0;
  let downloaded = 0;

  for (const url of assets) {
    const target = path.join(cacheDir, cacheFileName(url));

    if (!fsSync.existsSync(target)) {
      const response = await fetch(url).catch((error) => {
        throw new Error(`[vendor-cache] Fetch failed for ${url}: ${error.message}`);
      });
      if (!response.ok) {
        throw new Error(
          `[vendor-cache] Fetch failed for ${url}: HTTP ${response.status} ${response.statusText}`,
        );
      }
      const temp = `${target}.${process.pid}.tmp`;
      await fs.writeFile(temp, Buffer.from(await response.arrayBuffer()));
      await fs.rename(temp, target);
      downloaded += 1;
    }

    const { size } = await fs.stat(target);
    total += size;
    console.log(`[vendor-cache]   ${formatBytes(size).padStart(9)}  ${url}`);
  }

  console.log(
    `[vendor-cache] ${assets.length} pinned asset(s) cached (${downloaded} downloaded), ${formatBytes(total)} total.`,
  );
}

/**
 * Fail if a prototype page requests an unpkg asset that is not pinned.
 *
 * Without this the list and the pages drift: a new page could add a CDN script,
 * the route handler would block it as unpinned, and the resulting failure would
 * look like a broken spec rather than a missing cache entry.
 */
async function checkForDrift() {
  const referenced = new Set();

  for (const dir of ['prototype', 'pwa']) {
    const root = path.join(repoRoot, dir);
    if (!fsSync.existsSync(root)) continue;
    for (const file of await walk(root)) {
      if (!/\.(html|js|jsx|mjs)$/.test(file)) continue;
      const source = await fs.readFile(file, 'utf8');
      for (const [match] of source.matchAll(/https:\/\/unpkg\.com\/[^"'\s)]+/g)) {
        referenced.add(match);
      }
    }
  }

  const pinned = new Set(assets);
  const unpinned = [...referenced].filter((url) => !pinned.has(url)).sort();

  for (const url of [...pinned].filter((url) => !referenced.has(url)).sort()) {
    console.log(`[vendor-cache] NOTE pinned but no longer referenced: ${url}`);
  }

  if (unpinned.length > 0) {
    console.error(
      `[vendor-cache] ${unpinned.length} unpinned third-party asset(s) are requested by the prototype:`,
    );
    for (const url of unpinned) console.error(`[vendor-cache]   - ${url}`);
    console.error(
      `[vendor-cache] Add them to ${rel(manifestPath)}, or the visual suite will block them ` +
        'and those pages will render nothing.',
    );
    process.exit(1);
  }

  console.log(
    `[vendor-cache] All ${referenced.size} referenced unpkg asset(s) are pinned and cached.`,
  );
}

async function walk(root) {
  const found = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else found.push(full);
  }
  return found;
}

function rel(target) {
  return path.relative(repoRoot, target).split(path.sep).join('/');
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}
