/* Autheon /pwa service worker — installable shell + stale-while-revalidate assets */
const CACHE_VERSION = "autheon-pwa-v12";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  "/pwa/",
  "/pwa/index.html",
  "/pwa/manifest.webmanifest",
  "/pwa/manifest.json",
  "/pwa/pwa.css?v=6",
  "/pwa/pwa-app.jsx?v=11",
  "/pwa/pwa-install.js?v=3",
  "/pwa/splash.js?v=2",
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
  "/prototype/project/styles.css?v=23",
  "/prototype/project/feature-flags.js",
  "/prototype/project/i18n.js?v=27",
  "/prototype/project/formatters.js",
  "/prototype/project/inputFormatters.js",
  "/prototype/project/store.js",
  "/prototype/project/driver-ui.jsx",
  "/prototype/project/driver.jsx?v=10",
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
            const response = await fetch(url, { credentials: "omit", mode: "cors" });
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

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
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

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
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
