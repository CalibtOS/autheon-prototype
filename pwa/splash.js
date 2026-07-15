/**
 * Autheon /pwa splash — production build of the "logo to journey" animation
 * (design source: autheon-driver-pwa-splash-v4-logo-journey.html).
 *
 * Injected as a fixed overlay before the React CDN bundles load, so it is the
 * loading state of the marketplace: the official logo draws itself, flips into
 * road geometry, and releases a car that travels out of the screen. When the
 * timeline finishes the overlay dispatches `autheon-splash-complete` on
 * window, fades out and removes itself.
 *
 * The splash is intentionally dark in both app themes — it is a branded
 * moment, not a themed surface. All selectors are scoped under
 * #autheonSplash so nothing leaks into styles.css / pwa.css.
 */
(() => {
  "use strict";

  const CSS = `
  #autheonSplash {
    position: fixed;
    inset: 0;
    z-index: 9999;
    overflow: hidden;
    isolation: isolate;
    contain: strict;
    touch-action: none;
    background:
      radial-gradient(circle at 50% 42%, rgba(111, 41, 255, .11), transparent 36%),
      #0e0a17;
    opacity: 1;
    transition: opacity .45s ease;
  }
  #autheonSplash.splash-done { opacity: 0; pointer-events: none; }

  /* Center a content-tight stage so phone, landscape, and desktop all keep
     the brand optically centered without cropping (old 390×844 + slice). */
  #autheonSplash .splash-stage {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding:
      max(1.25rem, env(safe-area-inset-top, 0px))
      max(1rem, env(safe-area-inset-right, 0px))
      max(1.25rem, env(safe-area-inset-bottom, 0px))
      max(1rem, env(safe-area-inset-left, 0px));
  }

  #autheonSplash .splash-world {
    position: relative;
    display: block;
    width: min(92vw, 28rem, calc(72dvh * 460 / 300));
    aspect-ratio: 460 / 300;
    max-height: min(72dvh, 100%);
    height: auto;
    overflow: visible;
    transform: translateZ(0);
  }

  @media (orientation: landscape) and (max-height: 480px) {
    #autheonSplash .splash-world {
      width: min(70vw, 22rem, calc(88dvh * 460 / 300));
      max-height: min(88dvh, 100%);
    }
  }

  @media (min-width: 900px) {
    #autheonSplash .splash-world {
      width: min(32rem, calc(64dvh * 460 / 300));
    }
  }

  #autheonSplash #logoTile,
  #autheonSplash #logoFront,
  #autheonSplash #roadBack,
  #autheonSplash #brandLockup,
  #autheonSplash #carMove,
  #autheonSplash #carBodyGroup,
  #autheonSplash #wordmark {
    transform-box: fill-box;
    backface-visibility: hidden;
  }

  #autheonSplash #logoTile,
  #autheonSplash #brandLockup { transform-origin: center; }

  /* Both faces of the flip share one pivot; roadBack's fill-box is wider
     (it contains the outgoing road), so "center" would put its pivot elsewhere. */
  #autheonSplash #logoFront,
  #autheonSplash #roadBack { transform-origin: 23.81px 16px; }

  #autheonSplash #carMove,
  #autheonSplash #carBodyGroup { transform-origin: center; }

  #autheonSplash #logoTile { opacity: 0; transform: scale(.9); }
  #autheonSplash #roadBack { opacity: 0; transform: scaleY(.035) skewX(7deg); }

  #autheonSplash .draw-ribbon {
    fill: #fff;
    stroke: #fff;
    stroke-width: .55;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill-opacity: 0;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
  }

  /* Road body drawn as a stroke along the route path — the bg-colored cut on top
     leaves two thin white edges, matching the outgoing road's edge style. */
  #autheonSplash .road-body {
    fill: none;
    stroke: #fff;
    stroke-width: 6.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  #autheonSplash .road-cut {
    fill: none;
    stroke: #0e0a17;
    stroke-width: 5.15;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  #autheonSplash .route-dash {
    fill: none;
    stroke: #9b6bff;
    stroke-width: .72;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 2.5 3.1;
  }

  #autheonSplash .route-dash.secondary {
    opacity: .54;
    stroke-width: .60;
    stroke-dasharray: 2.2 3.6;
  }

  #autheonSplash .route-mask {
    fill: none;
    stroke: #fff;
    stroke-width: 12;
    stroke-linecap: round;
    stroke-linejoin: round;
    /* Long gap so retract offsets can overshoot past the endpoint (clearing the
       round cap, which extends stroke-width/2 beyond the dash) without the
       next dash of the pattern wrapping back onto the path. */
    stroke-dasharray: 1 3;
    stroke-dashoffset: 0;
  }

  #autheonSplash .road-edge {
    fill: none;
    stroke: #fff;
    stroke-width: 1.02;
    stroke-linecap: round;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
  }
  `;

  const MARKUP = `
  <div class="splash-stage">
  <svg class="splash-world" viewBox="-35 250 460 300" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Autheon is loading">
    <defs>
      <mask id="roadMask1" maskUnits="userSpaceOnUse" x="-8" y="-8" width="118" height="55">
        <rect x="-8" y="-8" width="118" height="55" fill="black"/>
        <path id="routeMask1" class="route-mask" pathLength="1" d="M38.7 4.8 C27.6 3.2 21.5 3.9 16.5 10.5 C10 19.5 5 29 0 31.95"/>
      </mask>
      <mask id="roadMask2" maskUnits="userSpaceOnUse" x="-8" y="-8" width="64" height="55">
        <rect x="-8" y="-8" width="64" height="55" fill="black"/>
        <path id="routeMask2" class="route-mask" pathLength="1" d="M39 14.5 C33.3 14.3 29 14.3 25.6 17.1 C21.2 20.7 18.6 26.2 15.3 31.6"/>
      </mask>
      <mask id="roadMask3" maskUnits="userSpaceOnUse" x="-8" y="-8" width="64" height="55">
        <rect x="-8" y="-8" width="64" height="55" fill="black"/>
        <path id="routeMask3" class="route-mask" pathLength="1" d="M40.8 31.5 L38.4 24.2 C36.9 20.5 34.1 18.9 31 20.2 C27 21.9 24.2 27 21.4 31.6"/>
      </mask>
      <mask id="roadMask4" maskUnits="userSpaceOnUse" x="-8" y="-8" width="64" height="55">
        <rect x="-8" y="-8" width="64" height="55" fill="black"/>
        <path id="routeMask4" class="route-mask" pathLength="1" d="M45.8 31.5 C44.1 27 42.4 22.8 41 18.8"/>
      </mask>
      <!-- Erases the outgoing road left-to-right behind the car, so nothing dark is painted over the glow. -->
      <mask id="outgoingMask" maskUnits="userSpaceOnUse" x="-12" y="16" width="130" height="32">
        <rect x="-12" y="16" width="130" height="32" fill="black"/>
        <path id="outgoingMaskLine" class="route-mask" pathLength="1" d="M-3 31.95 H108"/>
      </mask>
    </defs>

    <g id="brandLockup">
      <g id="logoAssembly" transform="translate(123 290) scale(3)">
        <rect id="logoTile" width="48" height="48" rx="10" fill="#6F29FF" opacity="0"/>

        <g transform="translate(0 8)">
          <g id="logoFront">
            <path class="draw-ribbon" pathLength="1" d="M28.7452 0.0499943C29.3687 -0.0214756 30.9431 0.0174098 31.6381 0.0180174C33.6279 0.0329038 35.6176 0.0269789 37.6073 0.000244141C37.9458 1.15288 38.4111 2.45984 38.7891 3.62569L41.1318 10.8437C38.7802 10.9527 36.152 10.7687 33.7703 10.8188C32.0193 10.8557 30.1961 10.7226 28.4612 11.2014C22.0467 12.9713 19.8914 18.3673 16.7499 23.549C15.1759 26.1455 13.6026 28.6479 12.0805 31.2103L11.6666 31.9194C10.5996 31.9722 9.42407 31.9176 8.34659 31.9306C5.58855 31.964 2.75097 31.8662 0 31.9517C0.997865 30.5292 2.50586 27.8959 3.46749 26.3335L10.5896 14.7129C12.8592 10.9904 14.5347 7.73199 17.8721 4.82268C21.2443 1.883 24.3891 0.573297 28.7452 0.0499943Z"/>
            <path class="draw-ribbon" pathLength="1" d="M38.3618 17.8626C38.3839 18.3225 39.4974 21.737 39.7447 22.4479C40.7885 25.4482 41.7117 29.0015 42.8468 31.9303C41.7937 31.9141 40.7088 31.9275 39.653 31.9275C38.8473 29.1833 37.9224 26.436 37.0768 23.7013C36.7626 22.685 35.9017 21.6732 34.9229 21.2676C33.7384 20.7767 32.2683 20.8416 31.0836 21.3173C30.3712 21.6337 29.7327 22.0982 29.2099 22.6805C28.5719 23.4055 27.1835 25.8009 26.6472 26.7238C25.6773 28.3928 24.4654 30.2545 23.5761 31.9292C22.505 31.9238 20.7214 31.8709 19.7114 31.9733C20.4259 30.5267 21.7266 28.4617 22.6104 27.09C25.1161 23.2008 26.6843 18.2008 31.9865 17.9032C32.4559 17.8373 33.7521 17.8563 34.2521 17.8566L38.3618 17.8626Z"/>
            <path class="draw-ribbon" pathLength="1" d="M30.693 13.1161C32.8075 12.965 36.2745 13.0789 38.499 13.0869C38.6766 14.0339 39.1326 15.2447 39.3859 16.2471C37.5936 16.3169 35.7941 16.2525 34.0053 16.2721C32.7015 16.2864 31.2113 16.1606 29.9673 16.5009C26.065 17.5685 24.7269 20.5448 22.8602 23.6919L19.7354 28.9582C19.1403 29.937 18.5601 30.9247 17.9947 31.9212C17.0191 31.9231 14.7918 31.8713 13.897 32.0002C14.6112 30.9063 15.3757 29.5605 16.0567 28.4225L19.6507 22.4045C22.4928 17.5959 24.5497 13.7028 30.693 13.1161Z"/>
            <path class="draw-ribbon" pathLength="1" d="M39.459 17.9398C40.5644 17.9793 41.8666 17.9475 42.9877 17.9492C43.1074 18.7702 43.924 21.0614 44.235 22.0024L47.622 31.9301L43.9359 31.9237C42.5317 27.2651 40.8029 22.6291 39.459 17.9398Z"/>
          </g>

          <g id="roadBack">
            <g id="roadRoute1" mask="url(#roadMask1)">
              <path class="road-body" d="M38.7 4.8 C27.6 3.2 21.5 3.9 16.5 10.5 C10 19.5 5 29 0 31.95"/>
              <path class="road-cut" d="M38.7 4.8 C27.6 3.2 21.5 3.9 16.5 10.5 C10 19.5 5 29 0 31.95"/>
              <path id="heroDashLogo" class="route-dash" d="M38.7 4.8 C27.6 3.2 21.5 3.9 16.5 10.5 C10 19.5 5 29 0 31.95"/>
            </g>

            <g id="roadRoute2" mask="url(#roadMask2)">
              <path class="road-body" d="M39 14.5 C33.3 14.3 29 14.3 25.6 17.1 C21.2 20.7 18.6 26.2 15.3 31.6"/>
              <path class="road-cut" d="M39 14.5 C33.3 14.3 29 14.3 25.6 17.1 C21.2 20.7 18.6 26.2 15.3 31.6"/>
              <path class="route-dash secondary" d="M39 14.5 C33.3 14.3 29 14.3 25.6 17.1 C21.2 20.7 18.6 26.2 15.3 31.6"/>
            </g>

            <g id="roadRoute3" mask="url(#roadMask3)">
              <path class="road-body" d="M40.8 31.5 L38.4 24.2 C36.9 20.5 34.1 18.9 31 20.2 C27 21.9 24.2 27 21.4 31.6"/>
              <path class="road-cut" d="M40.8 31.5 L38.4 24.2 C36.9 20.5 34.1 18.9 31 20.2 C27 21.9 24.2 27 21.4 31.6"/>
              <path class="route-dash secondary" d="M40.8 31.5 L38.4 24.2 C36.9 20.5 34.1 18.9 31 20.2 C27 21.9 24.2 27 21.4 31.6"/>
            </g>

            <g id="roadRoute4" mask="url(#roadMask4)">
              <path class="road-body" d="M45.8 31.5 C44.1 27 42.4 22.8 41 18.8"/>
              <path class="road-cut" d="M45.8 31.5 C44.1 27 42.4 22.8 41 18.8"/>
              <path class="route-dash secondary" d="M45.8 31.5 C44.1 27 42.4 22.8 41 18.8"/>
            </g>

            <g id="outgoingRoad" opacity="0" mask="url(#outgoingMask)">
              <path id="roadEdgeTop" class="road-edge" pathLength="1" d="M0 29.1 H105"/>
              <path id="roadEdgeBottom" class="road-edge" pathLength="1" d="M0 34.8 H105"/>
              <path id="outgoingDash" class="route-dash" d="M0 31.95 H105"/>
            </g>
          </g>
        </g>
      </g>

      <g id="wordmark" opacity="0">
        <text x="195" y="492" text-anchor="middle" fill="#ffffff" font-family="'Inter Tight', Inter, system-ui, sans-serif" font-size="24" font-weight="760" letter-spacing="3.2">AUTHEON</text>
      </g>
    </g>

    <g id="carMove" opacity="0" transform="translate(124 384.5)">
      <g id="carBodyGroup">
        <path d="M-22 4 H-17 L-11 -5 Q-9 -8 -6 -8 H8 Q11 -8 13 -5 L19 4 H23 Q26 4 26 8 V12 H-26 V8 Q-26 4 -22 4Z" fill="#ece7f7"/>
        <path d="M-9 -4 H0 V3 H-14Z" fill="#0e0a17"/>
        <path d="M2 -4 H8 Q10 -4 11 -2 L15 3 H2Z" fill="#0e0a17"/>
        <circle cx="-15" cy="12" r="4.2" fill="#0e0a17" stroke="#ece7f7" stroke-width="1.8"/>
        <circle cx="16" cy="12" r="4.2" fill="#0e0a17" stroke="#ece7f7" stroke-width="1.8"/>
        <circle cx="22" cy="7" r="1.4" fill="#9b6bff"/>
      </g>
    </g>
  </svg>
  </div>
  `;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const shell = document.createElement("div");
  shell.id = "autheonSplash";
  shell.setAttribute("role", "status");
  shell.setAttribute("aria-label", "Autheon is loading");
  shell.innerHTML = MARKUP;
  document.body.appendChild(shell);

  const $ = (selector) => shell.querySelector(selector);
  const $$ = (selector) => [...shell.querySelectorAll(selector)];

  const tile = $("#logoTile");
  const front = $("#logoFront");
  const roadBack = $("#roadBack");
  const ribbons = $$(".draw-ribbon");
  const wordmark = $("#wordmark");
  const outgoingRoad = $("#outgoingRoad");
  const roadEdges = [$("#roadEdgeTop"), $("#roadEdgeBottom")];
  const heroDashLogo = $("#heroDashLogo");
  const outgoingDash = $("#outgoingDash");
  const secondaryDashes = $$(".route-dash.secondary");
  const routeMasks = [$("#routeMask1"), $("#routeMask2"), $("#routeMask3"), $("#routeMask4")];
  const outgoingMaskLine = $("#outgoingMaskLine");
  const car = $("#carMove");
  const carBody = $("#carBodyGroup");

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const EASE = {
    draw: "cubic-bezier(.45,0,.15,1)",
    soft: "cubic-bezier(.22,.72,.18,1)",
    flipOut: "cubic-bezier(.52,.08,.72,.32)",
    flipIn: "cubic-bezier(.2,.68,.2,1)",
    move: "cubic-bezier(.38,.03,.18,1)",
    settle: "cubic-bezier(.16,.84,.26,1)"
  };

  const running = [];

  function animate(el, keyframes, delay, duration, easing = EASE.soft) {
    // Prefer compositor-friendly props; WAAPI still drives SVG stroke work on
    // the main thread, so keep the timeline lean and avoid filters.
    const anim = el.animate(keyframes, {
      delay,
      duration,
      fill: "forwards",
      easing,
      // Composite replace avoids stacking work when phases hand off.
      composite: "replace"
    });
    running.push(anim);
    return anim;
  }

  function finish(atMs) {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("autheon-splash-complete", {
        detail: { direction: "logo-to-journey" }
      }));
      shell.classList.add("splash-done");
      setTimeout(() => {
        running.forEach((anim) => {
          try { anim.cancel(); } catch (_) { /* already finished */ }
        });
        shell.remove();
        style.remove();
      }, 500);
    }, atMs);
  }

  if (reduced) {
    tile.style.opacity = "1";
    tile.style.transform = "scale(1)";
    ribbons.forEach((ribbon) => {
      ribbon.style.strokeDashoffset = "0";
      ribbon.style.fillOpacity = "1";
      ribbon.style.strokeOpacity = "0";
    });
    wordmark.style.opacity = "1";
    finish(900);
    return;
  }

  // Continue the purple dash rhythm across the exact connection point instead of restarting it.
  const dashPeriod = 5.6;
  const heroRemainder = heroDashLogo.getTotalLength() % dashPeriod;
  outgoingDash.style.strokeDashoffset = String(-heroRemainder);

  /* PHASE 1 — draw the exact official logo */
  animate(tile, [
    { opacity: 0, transform: "scale(.9)" },
    { opacity: 1, transform: "scale(1)" }
  ], 0, 430, EASE.settle);

  const starts = [240, 460, 680, 900];
  ribbons.forEach((ribbon, index) => {
    const start = starts[index];
    animate(ribbon, [
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0 }
    ], start, 580, EASE.draw);

    animate(ribbon, [
      { fillOpacity: 0, strokeOpacity: 1 },
      { fillOpacity: 1, strokeOpacity: .28 }
    ], start + 310, 300, "ease-out");
  });

  // The wordmark stays up for the whole journey and only leaves with the road at the end.
  animate(wordmark, [
    { opacity: 0, transform: "translateY(7px)", letterSpacing: "5px" },
    { opacity: 1, transform: "translateY(0px)", letterSpacing: "3.2px" }
  ], 1020, 380, EASE.settle);

  /* PHASE 2 — the white logo flips into its road face.
     Starts while the last ribbon fill is still settling so there is never a
     fully static frame between "logo done" and "flip begins". */
  animate(tile, [
    { opacity: 1, transform: "scale(1)" },
    { opacity: 0, transform: "scale(.94)" }
  ], 1450, 280, EASE.soft);

  animate(front, [
    { opacity: 1, transform: "scaleY(1) skewX(0deg)" },
    { opacity: .92, transform: "scaleY(.045) skewX(-7deg)" }
  ], 1480, 210, EASE.flipOut);

  animate(roadBack, [
    { opacity: 0, transform: "scaleY(.045) skewX(7deg)" },
    { opacity: 1, transform: "scaleY(1) skewX(0deg)" }
  ], 1660, 250, EASE.flipIn);

  animate(front, [{ opacity: .92 }, { opacity: 0 }], 1670, 80, "linear");

  /* PHASE 3 — one continuous road leaves the logo */
  animate(outgoingRoad, [{ opacity: 0 }, { opacity: 1 }], 1845, 120, "linear");
  roadEdges.forEach((edge) => {
    animate(edge, [
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0 }
    ], 1860, 450, EASE.draw);
  });

  // Secondary Autheon roads drain downward into the road baseline, leaving one hero route.
  // The dashoffset sign controls which end of the path disappears first;
  // ±1.5 overshoots the endpoint far enough that the round cap fully clears the path.
  [
    { mask: routeMasks[3], to: 1.5, start: 2030 },
    { mask: routeMasks[2], to: 1.5, start: 2110 },
    { mask: routeMasks[1], to: -1.5, start: 2190 }
  ].forEach(({ mask, to, start }) => {
    animate(mask, [
      { strokeDashoffset: 0 },
      { strokeDashoffset: to }
    ], start, 400, EASE.draw);
  });

  secondaryDashes.forEach((dash, index) => {
    animate(dash, [
      { opacity: .58 },
      { opacity: 0 }
    ], 2010 + index * 60, 240, "ease-out");
  });

  /* PHASE 4 — the hero road hands the motion to the car */
  animate(routeMasks[0], [
    { strokeDashoffset: 0 },
    { strokeDashoffset: -1.5 }
  ], 2260, 470, EASE.draw);

  animate(car, [
    { opacity: 0, transform: "translate(124px, 384.5px)" },
    { opacity: 1, transform: "translate(136px, 384.5px)" }
  ], 2430, 220, EASE.settle);

  animate(carBody, [
    { transform: "translateY(0px)" },
    { transform: "translateY(1.4px)" },
    { transform: "translateY(0px)" }
  ], 2560, 230, EASE.settle);

  /* PHASE 5 — car + road exit as one connected gesture */
  animate(car, [
    { opacity: 1, transform: "translate(136px, 384.5px)" },
    { opacity: 1, transform: "translate(254px, 384.5px)", offset: .44 },
    { opacity: 1, transform: "translate(418px, 384.5px)", offset: .92 },
    { opacity: 0, transform: "translate(446px, 384.5px)" }
  ], 2670, 1300, EASE.move);

  // Erase the road left-to-right behind the car, tethered to the same easing.
  // -1.15 (not -1) so the round cap of the mask stroke clears the road's right end.
  animate(outgoingMaskLine, [
    { strokeDashoffset: 0 },
    { strokeDashoffset: -1.15 }
  ], 2870, 1300, EASE.move);

  // The brand name is the last element to leave.
  animate(wordmark, [
    { opacity: 1, transform: "translateY(0px)" },
    { opacity: 0, transform: "translateY(4px)" }
  ], 3560, 380, "ease-out");

  // Reveal the app the moment the car exits — the erase tail and wordmark
  // finish inside the overlay's own fade-out.
  finish(3960);
})();
