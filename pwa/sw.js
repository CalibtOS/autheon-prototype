/* Autheon /pwa service worker — installable shell + stale-while-revalidate assets */
const CACHE_VERSION = "autheon-pwa-v49";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  "/pwa/",
  "/pwa/index.html",
  "/pwa/manifest.webmanifest",
  "/pwa/manifest.json",
  "/pwa/pwa.css?v=21",
  "/pwa/pwa-app.jsx?v=16",
  "/pwa/pwa-install.js?v=5",
  "/pwa/app-height.js?v=1",
  "/pwa/splash.js?v=3",
  "/pwa/favicon.svg",
  "/pwa/apple-touch-icon.png",
  "/pwa/apple-touch-icon-precomposed.png",
  "/pwa/icons/icon-180.png",
  "/pwa/icons/icon-192.png",
  "/pwa/icons/icon-512.png",
  "/pwa/icons/icon-192-maskable.png",
  "/pwa/icons/icon-512-maskable.png",
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
  "/prototype/project/styles.css?v=46",
  "/prototype/project/feature-flags.js?v=1",
  "/prototype/project/i18n.js?v=48",
  "/prototype/project/formatters.js?v=1",
  "/prototype/project/inputFormatters.js?v=1",
  "/prototype/project/store.js?v=12",
  "/prototype/project/driver-ui.jsx?v=2",
  "/prototype/project/driver.jsx?v=36",
  "https://unpkg.com/react@18.3.1/umd/react.development.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js",
  "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            // no-store: precache from the origin, never from the HTTP cache —
            // otherwise a fresh SHELL_CACHE can be seeded with stale bytes.
            const response = await fetch(url, {
              credentials: "omit",
              mode: "cors",
              cache: "no-store",
            });
            if (response && (response.ok || response.type === "opaque")) {
              await cache.put(url, response);
            }
          } catch (_) {
            /* Skip individual failures so install still completes. */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("autheon-pwa-") &&
              key !== SHELL_CACHE &&
              key !== RUNTIME_CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" &&
      (request.headers.get("accept") || "").includes("text/html"))
  );
}

function isCacheableGet(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return (
    url.origin === self.location.origin ||
    url.hostname === "unpkg.com" ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  );
}

/*
  Revalidation MUST bypass the browser HTTP cache. A bare `fetch(request)` uses
  cache mode "default", so a still-fresh HTTP cache entry satisfies it without
  reaching the origin — the runtime cache would then never converge on the
  deployed asset. `no-store` makes every revalidation a true origin hit.
*/
function fetchFromOrigin(request) {
  // Cross-origin no-cors (unpkg / fonts) stays opaque; no-store is still valid.
  return fetch(request, { cache: "no-store" }).catch(() =>
    // Some engines reject no-store on opaque requests — fall back to a plain hit
    // rather than losing the asset entirely.
    fetch(request),
  );
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetchFromOrigin(request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => {});
    return cached;
  }

  const network = await networkPromise;
  if (network) return network;
  return (
    (await cache.match(request)) ||
    new Response("Offline", { status: 503, statusText: "Offline" })
  );
}

/*
  The HTML is the version manifest: it names every `?v=` asset URL. If it is
  stale, every asset resolves to a stale URL and the whole app regresses —
  so this must be a genuine origin hit, never an HTTP-cache hit.
*/
async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) {
      cache.put("/pwa/", response.clone());
      cache.put("/pwa/index.html", response.clone());
    }
    return response;
  } catch (_) {
    return (
      (await cache.match("/pwa/index.html")) ||
      (await cache.match("/pwa/")) ||
      (await cache.match(request)) ||
      new Response("AUTHEON Driver is offline. Reconnect to continue.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isCacheableGet(request)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});
