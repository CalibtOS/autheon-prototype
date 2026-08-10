/**
 * Autheon /pwa — service worker registration + install bridge.
 * Exposes window.AutheonPwa for the React shell (install CTA / standalone mode).
 *
 * Chrome often withholds beforeinstallprompt until a controlling SW exists.
 * We register early, claim clients, and reload once after first activation.
 */
(function () {
  "use strict";

  var RELOAD_FLAG = "autheon-pwa-sw-reloaded";
  // Counts mid-session reloads triggered by a NEW worker taking over, so a
  // flapping deploy can never spin the tab. Distinct from RELOAD_FLAG, which is
  // the one-time first-visit reload that unlocks Chrome installability.
  var UPDATE_RELOAD_FLAG = "autheon-pwa-sw-update-reloads";

  function isStandalone() {
    try {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches ||
        window.navigator.standalone === true
      );
    } catch (_) {
      return false;
    }
  }

  function isIos() {
    var ua = window.navigator.userAgent || "";
    return (
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }

  function isChromium() {
    var ua = window.navigator.userAgent || "";
    return /Chrome|Chromium|Edg|CriOS|EdgiOS/i.test(ua) && !/OPR\//i.test(ua);
  }

  var listeners = new Set();
  var state = {
    isStandalone: isStandalone(),
    isIos: isIos(),
    isChromium: isChromium(),
    canInstall: false,
    installed: false,
    swReady: false,
    swControlling: !!(
      navigator.serviceWorker && navigator.serviceWorker.controller
    ),
    swError: null,
    installBlockedHint: false,
    deferredPrompt: null,
  };

  function notify() {
    listeners.forEach(function (fn) {
      try {
        fn(Object.assign({}, state));
      } catch (_) {
        /* ignore subscriber errors */
      }
    });
  }

  function applyStandaloneClass() {
    var root = document.documentElement;
    if (state.isStandalone) root.classList.add("pwa-standalone");
    else root.classList.remove("pwa-standalone");
    if (state.isStandalone && document.body) {
      document.body.classList.add("pwa-standalone");
    }
  }

  applyStandaloneClass();

  /** Best-effort portrait lock (mirrors FE lockPortraitOrientation). Manifest also declares portrait-primary. */
  function lockPortraitOrientation() {
    try {
      var orientation = screen.orientation;
      if (!orientation || typeof orientation.lock !== "function") return;
      var result = orientation.lock("portrait");
      if (result && typeof result.then === "function") {
        result.then(
          function () {},
          function () {
            /* NotAllowedError / unsupported — ignore */
          },
        );
      }
    } catch (_) {
      /* no-op */
    }
  }
  lockPortraitOrientation();

  window.AutheonPwa = {
    getState: function () {
      return Object.assign({}, state);
    },
    subscribe: function (fn) {
      listeners.add(fn);
      try {
        fn(Object.assign({}, state));
      } catch (_) {}
      return function () {
        listeners.delete(fn);
      };
    },
    promptInstall: async function () {
      if (!state.deferredPrompt) {
        return { ok: false, reason: "unavailable" };
      }
      var promptEvent = state.deferredPrompt;
      state.deferredPrompt = null;
      state.canInstall = false;
      notify();
      try {
        promptEvent.prompt();
        var choice = await promptEvent.userChoice;
        if (choice && choice.outcome === "accepted") {
          state.installed = true;
          notify();
          return { ok: true };
        }
        return { ok: false, reason: "dismissed" };
      } catch (_) {
        return { ok: false, reason: "error" };
      }
    },
  };

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    state.deferredPrompt = event;
    state.canInstall = true;
    notify();
  });

  window.addEventListener("appinstalled", function () {
    state.installed = true;
    state.canInstall = false;
    state.deferredPrompt = null;
    state.isStandalone = true;
    applyStandaloneClass();
    notify();
  });

  try {
    window
      .matchMedia("(display-mode: standalone)")
      .addEventListener("change", function (event) {
        state.isStandalone =
          event.matches || window.navigator.standalone === true;
        applyStandaloneClass();
        notify();
      });
  } catch (_) {
    /* older browsers */
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || state.isStandalone) {
      state.swReady = true;
      notify();
      return;
    }

    // A controller already present means any later controllerchange is an
    // UPDATE (not first activation) — the page is then running assets the new
    // worker has already superseded. Captured before register() so the check
    // cannot race activation.
    var hadController = !!navigator.serviceWorker.controller;

    navigator.serviceWorker
      // updateViaCache:"none" — never let the HTTP cache answer for sw.js or
      // anything it imports, so a new worker is always discovered.
      .register("/pwa/sw.js", { scope: "/pwa/", updateViaCache: "none" })
      .then(function (reg) {
        state.swReady = true;
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // Long-lived installed sessions otherwise only check for a new worker
        // on a cold start. Re-check whenever the app regains focus.
        document.addEventListener("visibilitychange", function () {
          if (!document.hidden) {
            reg.update().catch(function () {
              /* offline — retry on the next foreground */
            });
          }
        });
        if (reg.installing) {
          reg.installing.addEventListener("statechange", function () {
            if (
              reg.installing &&
              reg.installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              /* updated SW waiting — optional */
            }
          });
        }
        return navigator.serviceWorker.ready.then(function () {
          state.swControlling = !!navigator.serviceWorker.controller;
          notify();

          // First visit: SW is ready but does not control this tab yet.
          // One controlled reload unlocks Chrome's installability / BIP.
          if (
            !navigator.serviceWorker.controller &&
            !sessionStorage.getItem(RELOAD_FLAG)
          ) {
            sessionStorage.setItem(RELOAD_FLAG, "1");
            window.location.reload();
          }
        });
      })
      .catch(function (err) {
        state.swReady = false;
        state.swError = (err && err.message) || "register-failed";
        // HTTP Basic Auth (Cloudflare) commonly blocks SW registration / PWA install.
        if (window.location.protocol === "https:") {
          state.installBlockedHint = true;
        }
        notify();
      });

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      state.swControlling = true;
      notify();

      // sw.js skipWaiting()s + claims on activate, so a new worker takes over
      // mid-session while this document still holds the superseded HTML/CSS/JSX
      // it booted with. Reload once so the page matches the worker serving it.
      // Guarded by hadController: on a first visit there is nothing stale yet
      // (that path is handled by RELOAD_FLAG above), so no reload loop.
      if (!hadController) return;
      try {
        // Belt-and-braces cap in case a pathological deploy flaps sw.js bytes.
        var n = parseInt(sessionStorage.getItem(UPDATE_RELOAD_FLAG) || "0", 10);
        if (n >= 3) return;
        sessionStorage.setItem(UPDATE_RELOAD_FLAG, String(n + 1));
      } catch (_) {
        /* private mode — a single reload is still safe */
      }
      window.location.reload();
    });

    // If SW is fine but Chrome never offers install on a hosted HTTPS origin,
    // surface the Cloudflare Basic Auth limitation (localhost works; password gate does not).
    window.setTimeout(function () {
      if (
        state.isStandalone ||
        state.canInstall ||
        state.isIos ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        return;
      }
      if (window.location.protocol === "https:") {
        state.installBlockedHint = true;
        notify();
      }
    }, 4000);
  }

  // Register as soon as this script runs (after splash), do not wait for full load.
  registerServiceWorker();
})();
