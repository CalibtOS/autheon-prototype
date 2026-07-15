/**
 * Autheon /pwa — service worker registration + install bridge.
 * Exposes window.AutheonPwa for the React shell (install CTA / standalone mode).
 */
(function () {
  "use strict";

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
    const ua = window.navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  const listeners = new Set();
  const state = {
    isStandalone: isStandalone(),
    isIos: isIos(),
    canInstall: false,
    installed: false,
    deferredPrompt: null,
  };

  function notify() {
    listeners.forEach((fn) => {
      try {
        fn({ ...state });
      } catch (_) {
        /* ignore subscriber errors */
      }
    });
  }

  function applyStandaloneClass() {
    const root = document.documentElement;
    if (state.isStandalone) root.classList.add("pwa-standalone");
    else root.classList.remove("pwa-standalone");
    if (state.isStandalone) document.body && document.body.classList.add("pwa-standalone");
  }

  applyStandaloneClass();

  window.AutheonPwa = {
    getState() {
      return { ...state };
    },
    subscribe(fn) {
      listeners.add(fn);
      try {
        fn({ ...state });
      } catch (_) {}
      return () => listeners.delete(fn);
    },
    async promptInstall() {
      if (!state.deferredPrompt) return { ok: false, reason: "unavailable" };
      const promptEvent = state.deferredPrompt;
      state.deferredPrompt = null;
      state.canInstall = false;
      notify();
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === "accepted") {
        state.installed = true;
        notify();
        return { ok: true };
      }
      return { ok: false, reason: "dismissed" };
    },
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    state.canInstall = true;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    state.installed = true;
    state.canInstall = false;
    state.deferredPrompt = null;
    state.isStandalone = true;
    applyStandaloneClass();
    notify();
  });

  try {
    window.matchMedia("(display-mode: standalone)").addEventListener("change", (event) => {
      state.isStandalone = event.matches || window.navigator.standalone === true;
      applyStandaloneClass();
      notify();
    });
  } catch (_) {
    /* older browsers */
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/pwa/sw.js", { scope: "/pwa/" })
        .then((reg) => {
          if (reg && reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
          reg.update().catch(() => {});
        })
        .catch(() => {
          /* Registration can fail on file:// — ignore quietly. */
        });
    });
  }
})();
