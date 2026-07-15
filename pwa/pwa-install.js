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
    swControlling: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
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
    async promptInstall: function () {
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

    navigator.serviceWorker
      .register("/pwa/sw.js", { scope: "/pwa/" })
      .then(function (reg) {
        state.swReady = true;
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
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
      .catch(function () {
        state.swReady = false;
        notify();
      });

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      state.swControlling = true;
      notify();
    });
  }

  // Register as soon as this script runs (after splash), do not wait for full load.
  registerServiceWorker();
})();
