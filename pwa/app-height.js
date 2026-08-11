/**
 * --app-height: the shell height the installed Driver PWA should actually lay
 * out against.
 * ===========================================================================
 *
 * On an iOS standalone cold launch, the layout viewport and the painted surface
 * disagree. Measured on iPhone 13 / iOS 26.5 (also reproduces on the iPhone 16e
 * simulator — both 390x844):
 *
 *     window.innerHeight = 797   <- layout viewport (844 - 47 status bar)
 *     window.screenY     = 0     <- frame starts at the physical top
 *     screen.height      = 844   <- what the web view actually PAINTS
 *
 * So `height: 100dvh` lays out 797px of content across an 844px surface, and
 * the bottom 47px is simply never painted by the app. The visible symptom is
 * the floating nav capsule sitting ~81px above the physical bottom edge
 * (47px unpainted + a 34px home-indicator pad that is measured against the
 * wrong reference). Rotating to landscape and back "fixed" it only because
 * WebKit then re-frames the web view so innerHeight matches the surface.
 *
 * The fix is the height, not the insets: once the shell is laid out at the true
 * painted height, `env(safe-area-inset-top)` (frame is under the status bar)
 * and `env(safe-area-inset-bottom)` (shell now reaches the home indicator) are
 * both already correct, so no env() rule in pwa.css needs to change.
 *
 * NOTHING HERE IS KEYED TO A DEVICE OR A SCREEN SIZE. The override applies only
 * when the viewport shortfall is actually attributable to the safe area:
 *
 *   - not standalone          -> Safari's URL bar owns the shortfall; skip.
 *   - shortfall <= 1px        -> frame already matches the surface; skip.
 *   - shortfall > top+bottom  -> keyboard, Split View, resized window; skip.
 *
 * In every skipped case the property is removed and pwa.css falls back to
 * `100dvh`, i.e. exactly the behaviour of not having this script at all.
 *
 * Load synchronously in <head> so the first paint uses the corrected height.
 */
(function () {
  "use strict";

  var root = document.documentElement;

  // Sub-pixel and Display-Zoom rounding slack, in CSS px.
  var TOLERANCE = 2;

  /** The safe-area insets the UA is currently reporting, in CSS px. */
  function readEnvInsets() {
    var probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;" +
      "pointer-events:none;contain:strict;" +
      "padding-top:env(safe-area-inset-top,0px);" +
      "padding-bottom:env(safe-area-inset-bottom,0px);";
    root.appendChild(probe);
    var cs = getComputedStyle(probe);
    var insets = {
      top: parseFloat(cs.paddingTop) || 0,
      bottom: parseFloat(cs.paddingBottom) || 0,
    };
    probe.remove();
    return insets;
  }

  function isStandalone() {
    return Boolean(
      (window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches) ||
        window.navigator.standalone === true,
    );
  }

  /**
   * Height of the surface the web view paints, along the CURRENT axis. Derived
   * from the long/short edges rather than screen.height as-reported, because
   * iOS does not reliably swap screen.width/height on rotation. Returns 0 when
   * the UA gives us nothing usable.
   */
  function paintedHeight() {
    var w = (window.screen && Number(window.screen.width)) || 0;
    var h = (window.screen && Number(window.screen.height)) || 0;
    if (!(w > 0) || !(h > 0)) return 0;
    var portrait = window.innerWidth <= window.innerHeight;
    return portrait ? Math.max(w, h) : Math.min(w, h);
  }

  /**
   * @returns {{height:number|null, reason:string, shortfall:number}}
   *   `height` is null when no override should apply.
   */
  function resolve() {
    var surface = paintedHeight();
    var shortfall = surface - window.innerHeight;

    if (!isStandalone()) return { height: null, reason: "browser", shortfall: shortfall };
    if (!surface) return { height: null, reason: "no-screen-metrics", shortfall: 0 };
    if (shortfall <= TOLERANCE) {
      return { height: null, reason: "viewport-matches-surface", shortfall: shortfall };
    }

    // Only a shortfall the insets can account for is safe-area related.
    // Anything larger is other chrome and must not stretch the shell.
    var env = readEnvInsets();
    if (shortfall > env.top + env.bottom + TOLERANCE) {
      return { height: null, reason: "shortfall-unexplained", shortfall: shortfall };
    }

    return { height: surface, reason: "stretched-to-surface", shortfall: shortfall };
  }

  var lastApplied = null;

  function sync() {
    var result = resolve();

    if (result.height === null) {
      if (lastApplied !== null) {
        root.style.removeProperty("--app-height");
        lastApplied = null;
      }
    } else if (result.height !== lastApplied) {
      root.style.setProperty("--app-height", result.height + "px");
      lastApplied = result.height;
    }

    // Readable in Web Inspector on a real device: <html data-app-height="...">
    root.setAttribute("data-app-height", result.reason);
    return result;
  }

  sync();

  // iOS re-frames the web view after a cold standalone launch and on every
  // rotation; `sync` is idempotent, so re-running on each of these simply
  // converges. Writing --app-height does not change innerHeight (the shell is
  // overflow:hidden), so there is no resize feedback loop.
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", sync);
  window.addEventListener("pageshow", sync);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", sync);
  }

  // For on-device debugging from Web Inspector.
  window.AutheonAppHeight = {
    sync: sync,
    report: function () {
      var env = readEnvInsets();
      return {
        innerHeight: window.innerHeight,
        paintedHeight: paintedHeight(),
        screenY: window.screenY,
        env: env,
        standalone: isStandalone(),
        applied: lastApplied,
        resolved: resolve(),
      };
    },
  };
})();
