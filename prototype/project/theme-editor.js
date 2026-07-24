/* =============================================================================
   AUTHEON — Floating Theme Editor
   -----------------------------------------------------------------------------
   A movable, persistent design-evaluation overlay for the prototype. Lets you
   inspect and edit the application's theme colours (CSS custom properties) in
   real time, across the admin dashboard, the embedded mobile preview and the
   standalone PWA (all same-origin, so overrides are shared via localStorage).

   Framework-agnostic on purpose: it renders its own DOM at document.body and
   never touches the app's React trees. Stored overrides are applied before the
   first paint (no flash of the default theme). See the feature spec for the
   full behaviour contract.

   Public API (window.AutheonThemeEditor):
     show() / hide() / toggle()      — launcher visibility
     open() / close()                — editor panel
     resetTheme() / resetLauncherPosition()
     __test                          — pure helpers, exercised by unit specs
   ========================================================================== */
(function () {
  'use strict';

  if (window.AutheonThemeEditor && window.AutheonThemeEditor.__mounted) return;

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  const NS = 'autheon.themeEditor';
  const STORAGE = {
    overrides: NS + '.overrides.v1',
    launcher: NS + '.launcher.v1',
    ui: NS + '.ui.v1',
    hidden: NS + '.hidden',
  };
  const SCHEMA_VERSION = 1;
  const LAUNCHER_SIZE = 48;
  const EDGE_MARGIN = 16;
  const DRAG_THRESHOLD = 6; // px of movement before a press becomes a drag
  const AA_CONTRAST = 4.5;

  const MODES = ['light', 'dark'];

  // Editable colour registry — solid hex tokens, grouped for scanning. Default
  // values are NOT hardcoded: they are read from the authored stylesheet at
  // runtime so this stays correct if the design tokens change.
  const REGISTRY = [
    {
      group: 'Brand',
      items: [
        { cssVar: '--brand-accent', name: 'Accent' },
        { cssVar: '--primary-ink', name: 'Accent (pressed)' },
        { cssVar: '--cta', name: 'Call to action' },
        { cssVar: '--destructive', name: 'Destructive' },
      ],
    },
    {
      group: 'Backgrounds',
      items: [
        { cssVar: '--brand-canvas', name: 'Canvas' },
        { cssVar: '--brand-surface', name: 'Surface' },
        { cssVar: '--paper-2', name: 'Surface (subtle)' },
      ],
    },
    {
      group: 'Text',
      items: [
        { cssVar: '--brand-text', name: 'Text (primary)' },
        { cssVar: '--brand-text-secondary', name: 'Text (secondary)' },
        { cssVar: '--ink-3', name: 'Text (tertiary)' },
        { cssVar: '--muted-2', name: 'Text (muted)' },
      ],
    },
    {
      group: 'Borders',
      items: [
        { cssVar: '--brand-border', name: 'Border' },
        { cssVar: '--line-2', name: 'Border (strong)' },
        { cssVar: '--line-dash', name: 'Border (dashed)' },
      ],
    },
    {
      group: 'Status',
      items: [
        { cssVar: '--st-draft', name: 'Draft' },
        { cssVar: '--st-published', name: 'Published' },
        { cssVar: '--st-assigned', name: 'Assigned' },
        { cssVar: '--st-accepted', name: 'Accepted' },
        { cssVar: '--st-special-case', name: 'Special case' },
        { cssVar: '--st-performed', name: 'Performed' },
        { cssVar: '--st-cancelled', name: 'Cancelled' },
        { cssVar: '--st-warn', name: 'Warning' },
        { cssVar: '--st-published-bg', name: 'Published · surface' },
        { cssVar: '--st-assigned-bg', name: 'Assigned · surface' },
        { cssVar: '--st-accepted-bg', name: 'Accepted · surface' },
        { cssVar: '--st-special-bg', name: 'Special case · surface' },
        { cssVar: '--st-cancelled-bg', name: 'Cancelled · surface' },
        { cssVar: '--st-warn-bg', name: 'Warning · surface' },
      ],
    },
    {
      group: 'Navigation & chrome',
      items: [
        { cssVar: '--chrome-header-bg', name: 'Header background' },
        { cssVar: '--chrome-header-fg', name: 'Header text' },
      ],
    },
  ];

  // Read-only derived aliases — shown so users can see (but not edit) colours
  // that are computed from an editable source. Prevents inconsistent themes
  // from editing both a source and its derived result.
  const DERIVED = [
    { cssVar: '--primary', name: 'Primary', follows: '--brand-accent' },
    { cssVar: '--canvas', name: 'Canvas (applied)', follows: '--brand-canvas' },
    { cssVar: '--paper', name: 'Surface (applied)', follows: '--brand-surface' },
    { cssVar: '--text', name: 'Text (applied)', follows: '--brand-text' },
    { cssVar: '--line', name: 'Border (applied)', follows: '--brand-border' },
  ];

  // Known text-on-background relationships for non-blocking contrast warnings.
  const CONTRAST_PAIRS = [
    { fg: '--brand-text', bg: '--brand-surface', label: 'Text on surface' },
    { fg: '--brand-text', bg: '--brand-canvas', label: 'Text on canvas' },
    { fg: '--brand-text-secondary', bg: '--brand-surface', label: 'Secondary text on surface' },
    { fg: '--chrome-header-fg', bg: '--chrome-header-bg', label: 'Header text on header' },
  ];

  const ALL_EDITABLE = REGISTRY.flatMap((g) => g.items.map((i) => i.cssVar));
  const NAME_BY_VAR = {};
  const CATEGORY_BY_VAR = {};
  REGISTRY.forEach((g) =>
    g.items.forEach((i) => {
      NAME_BY_VAR[i.cssVar] = i.name;
      CATEGORY_BY_VAR[i.cssVar] = g.group;
    }),
  );

  // ===========================================================================
  // Pure helpers (no DOM/side-effects) — exposed on __test for unit specs
  // ===========================================================================

  /** Normalize user hex input to `#RRGGBB` uppercase, or null if invalid. */
  function normalizeHex(input) {
    if (typeof input !== 'string') return null;
    let s = input.trim().replace(/^#/, '').toLowerCase();
    if (/^[0-9a-f]{3}$/.test(s)) {
      s = s.split('').map((c) => c + c).join('');
    }
    if (!/^[0-9a-f]{6}$/.test(s)) return null;
    return '#' + s.toUpperCase();
  }

  function isValidHex(input) {
    return normalizeHex(input) !== null;
  }

  function hexToRgb(hex) {
    const n = normalizeHex(hex);
    if (!n) return null;
    return {
      r: parseInt(n.slice(1, 3), 16),
      g: parseInt(n.slice(3, 5), 16),
      b: parseInt(n.slice(5, 7), 16),
    };
  }

  function rgbToHex(r, g, b) {
    const to2 = (v) => {
      const h = Math.max(0, Math.min(255, Math.round(v))).toString(16).toUpperCase();
      return h.length === 1 ? '0' + h : h;
    };
    return '#' + to2(r) + to2(g) + to2(b);
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    return { h, s, v: max };
  }

  function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }

  function relativeLuminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const lin = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
  }

  /** WCAG contrast ratio between two hex colours (1..21). */
  function contrastRatio(hexA, hexB) {
    const la = relativeLuminance(hexA);
    const lb = relativeLuminance(hexB);
    const lighter = Math.max(la, lb);
    const darker = Math.min(la, lb);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function meetsContrast(fg, bg, threshold) {
    return contrastRatio(fg, bg) >= (threshold || AA_CONTRAST);
  }

  /** Clamp a launcher {x,y} to keep it fully inside the viewport + margin. */
  function clampPosition(pos, box) {
    const maxX = Math.max(box.margin, box.vw - box.size - box.margin);
    const maxY = Math.max(box.margin, box.vh - box.size - box.margin);
    return {
      x: Math.min(Math.max(pos.x, box.margin), maxX),
      y: Math.min(Math.max(pos.y, box.margin), maxY),
    };
  }

  /** Build the per-mode override stylesheet from an {light,dark} override map. */
  function buildOverrideCss(overrides) {
    let out = '';
    for (const mode of MODES) {
      const map = (overrides && overrides[mode]) || {};
      const entries = Object.keys(map)
        .filter((k) => map[k])
        .map((k) => k + ': ' + map[k]);
      if (!entries.length) continue;
      out += ':root[data-theme="' + mode + '"]{' + entries.join(';') + '}\n';
    }
    return out;
  }

  /**
   * Serialize per-mode overrides to a compact, URL-safe `theme` value:
   *   light:brand-accent=ff0000,brand-text=111111|dark:brand-accent=8f5bff
   * Variable names drop the leading `--`; hex drops `#`. Registry order is used
   * so two exports/URLs compare cleanly.
   */
  function serializeOverrides(overrides) {
    const blocks = [];
    for (const mode of MODES) {
      const map = (overrides && overrides[mode]) || {};
      const entries = [];
      for (const cssVar of ALL_EDITABLE) {
        const norm = normalizeHex(map[cssVar]);
        if (!norm) continue;
        entries.push(cssVar.replace(/^--/, '') + '=' + norm.slice(1).toLowerCase());
      }
      if (entries.length) blocks.push(mode + ':' + entries.join(','));
    }
    return blocks.join('|');
  }

  /**
   * Parse a `theme` param into validated per-mode overrides. Injection-safe by
   * construction: an entry is kept only when the variable is a known editable
   * token AND the value normalizes to `#RRGGBB`. Everything else is dropped, so
   * no arbitrary CSS/HTML/JS can reach the DOM.
   */
  function parseThemeParam(str) {
    const result = { light: {}, dark: {} };
    if (typeof str !== 'string' || !str) return result;
    str.split('|').forEach(function (block) {
      const sep = block.indexOf(':');
      if (sep === -1) return;
      const mode = block.slice(0, sep).trim();
      if (mode !== 'light' && mode !== 'dark') return;
      block
        .slice(sep + 1)
        .split(',')
        .forEach(function (pair) {
          const eq = pair.indexOf('=');
          if (eq === -1) return;
          const cssVar = '--' + pair.slice(0, eq).trim();
          if (!ALL_EDITABLE.includes(cssVar)) return;
          const hex = normalizeHex(pair.slice(eq + 1).trim());
          if (!hex) return;
          result[mode][cssVar] = hex;
        });
    });
    return result;
  }

  /** Escape a value for a Markdown table cell (pipe would break the row). */
  function escapeMarkdownCell(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  }

  /**
   * Build a stable, mode-scoped JSON export from a {var: hex} value map.
   * `variables` is the full visible snapshot for the mode; `modified` lists the
   * variables the user actually changed from the code default, so a reader can
   * tell the active configuration apart from the baseline it sits on.
   */
  function buildThemeJson(mode, valueMap, modified) {
    const variables = {};
    const modifiedList = [];
    ALL_EDITABLE.forEach(function (cssVar) {
      if (valueMap && Object.prototype.hasOwnProperty.call(valueMap, cssVar)) {
        variables[cssVar] = valueMap[cssVar];
      }
      if (modified && modified.indexOf(cssVar) !== -1) modifiedList.push(cssVar);
    });
    return JSON.stringify(
      {
        name: 'Autheon prototype theme (' + mode + ')',
        mode: mode,
        generatedBy: 'floating-theme-editor',
        modified: modifiedList,
        variables: variables,
      },
      null,
      2,
    );
  }

  /** Build a readable Markdown table export from a {var: hex} value map. The
   *  Modified column flags variables the user changed from the code default. */
  function buildThemeMarkdown(mode, valueMap, modified) {
    const mods = modified || [];
    const lines = [
      '# Autheon prototype theme — ' + mode,
      '',
      '| Category | Variable | Value | Modified |',
      '| --- | --- | --- | --- |',
    ];
    ALL_EDITABLE.forEach(function (cssVar) {
      if (!valueMap || !Object.prototype.hasOwnProperty.call(valueMap, cssVar)) return;
      lines.push(
        '| ' +
          escapeMarkdownCell(CATEGORY_BY_VAR[cssVar] || '') +
          ' | `' +
          cssVar +
          '` | `' +
          escapeMarkdownCell(valueMap[cssVar]) +
          '` | ' +
          (mods.indexOf(cssVar) !== -1 ? 'yes' : '') +
          ' |',
      );
    });
    return lines.join('\n');
  }

  const __test = {
    normalizeHex,
    isValidHex,
    hexToRgb,
    rgbToHex,
    rgbToHsv,
    hsvToRgb,
    relativeLuminance,
    contrastRatio,
    meetsContrast,
    clampPosition,
    buildOverrideCss,
    serializeOverrides,
    parseThemeParam,
    escapeMarkdownCell,
    buildThemeJson,
    buildThemeMarkdown,
  };

  // ===========================================================================
  // Storage layer (degrades gracefully when localStorage is unavailable)
  // ===========================================================================
  let storageOk = true;
  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      storageOk = false;
      return null;
    }
  }
  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {
      storageOk = false;
    }
  }
  function safeRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (_) {
      storageOk = false;
    }
  }

  /** Actively probe whether writes work (private mode / full disk fail here). */
  function probeStorage() {
    try {
      const k = NS + '.__probe';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      storageOk = true;
    } catch (_) {
      storageOk = false;
    }
    return storageOk;
  }

  function loadOverrides() {
    const empty = { light: {}, dark: {} };
    const raw = safeGet(STORAGE.overrides);
    if (!raw) return empty;
    try {
      const parsed = JSON.parse(raw);
      const src = parsed && parsed.overrides ? parsed.overrides : {};
      // Keep only known editable vars → removed/renamed tokens fall back safely.
      for (const mode of MODES) {
        const clean = {};
        const m = src[mode] || {};
        for (const key of Object.keys(m)) {
          if (ALL_EDITABLE.includes(key)) {
            const hex = normalizeHex(m[key]);
            if (hex) clean[key] = hex;
          }
        }
        empty[mode] = clean;
      }
    } catch (_) {
      /* corrupt payload → defaults */
    }
    return empty;
  }

  // The single commit point: write the active overrides to BOTH persistence
  // targets (localStorage + the shareable URL). Called only from user actions,
  // never from init/URL-read, so there is no circular update loop.
  function persistOverrides() {
    const hasAny = MODES.some(
      (m) => Object.keys(state.overrides[m] || {}).length > 0,
    );
    if (hasAny) {
      safeSet(
        STORAGE.overrides,
        JSON.stringify({ v: SCHEMA_VERSION, overrides: state.overrides }),
      );
    } else {
      safeRemove(STORAGE.overrides);
    }
    syncUrl();
  }

  // ===========================================================================
  // Runtime state
  // ===========================================================================
  const state = {
    overrides: { light: {}, dark: {} },
    defaults: null, // { light: {var:hex}, dark: {var:hex} } — parsed lazily
    launcherPos: null, // {x,y} or null (=default bottom-right)
    open: false,
    filter: '',
    picker: null, // active picker session
    lastCategory: null,
  };

  const els = {}; // cached DOM references
  let probeEl = null;

  // ===========================================================================
  // URL layer — a single shareable `theme` query param.
  //
  // The prototype page is loaded inside a same-origin <iframe> (root index.html),
  // so we operate on the TOP-LEVEL browsing context's URL where reachable; that
  // way the copyable browser-bar URL carries the config. The standalone /pwa/
  // and directly-opened prototype are top-level already, so hostWindow === window.
  //
  // State flow is strictly one-way to avoid loops:
  //   init:  URL param → (else) localStorage → (else) defaults   [read only]
  //   user change: state → DOM → localStorage → URL (replaceState) [write only]
  // We never listen for URL changes, so writes can't feed back into reads.
  // ===========================================================================
  const URL_PARAM = 'theme';
  const hostWindow = (function () {
    try {
      const top = window.top;
      if (top && top !== window) {
        void top.location.search; // throws for a cross-origin parent
        return top;
      }
    } catch (_) {
      /* cross-origin parent — fall back to this window */
    }
    return window;
  })();

  function readUrlOverrides() {
    try {
      const params = new URLSearchParams(hostWindow.location.search);
      return parseThemeParam(params.get(URL_PARAM) || '');
    } catch (_) {
      return { light: {}, dark: {} };
    }
  }

  /** The host URL with the `theme` param reflecting the active overrides and
   *  every unrelated param (e.g. the PWA's ?tab) left intact. */
  function currentUrlWithTheme() {
    const url = new URL(hostWindow.location.href);
    const value = serializeOverrides(state.overrides);
    if (value) url.searchParams.set(URL_PARAM, value);
    else url.searchParams.delete(URL_PARAM);
    return url;
  }

  function syncUrl() {
    try {
      const url = currentUrlWithTheme();
      hostWindow.history.replaceState(hostWindow.history.state, '', url.href);
    } catch (_) {
      /* history unavailable — non-fatal, the theme still applies */
    }
  }

  function currentMode() {
    const m = document.documentElement.getAttribute('data-theme');
    return m === 'dark' ? 'dark' : 'light';
  }

  // ===========================================================================
  // Default resolution — parse authored values straight from the stylesheet so
  // "reset" and "modified" comparisons use the real code-defined defaults.
  // ===========================================================================
  function parseAuthoredDefaults() {
    const light = {};
    const dark = {};
    const sheets = document.styleSheets || [];
    for (let i = 0; i < sheets.length; i++) {
      let rules;
      try {
        rules = sheets[i].cssRules;
      } catch (_) {
        continue; // cross-origin sheet — skip
      }
      if (!rules) continue;
      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];
        if (!rule || rule.type !== 1 || !rule.selectorText) continue;
        const sel = rule.selectorText.trim();
        let target = null;
        if (sel === ':root') target = light;
        else if (sel === '[data-theme="dark"]' || sel === ":root[data-theme=\"dark\"]") target = dark;
        else continue;
        for (const cssVar of ALL_EDITABLE) {
          const val = rule.style.getPropertyValue(cssVar).trim();
          if (val) {
            const hex = normalizeHex(val);
            if (hex) target[cssVar] = hex;
          }
        }
      }
    }
    // Dark inherits light where it does not override (matches the cascade).
    return { light, dark: Object.assign({}, light, dark) };
  }

  function getDefaults() {
    if (!state.defaults) state.defaults = parseAuthoredDefaults();
    return state.defaults;
  }

  function defaultHex(cssVar, mode) {
    const d = getDefaults();
    return (d[mode] && d[mode][cssVar]) || null;
  }

  /** Effective hex for a var in a mode: override if set, else authored default. */
  function effectiveHex(cssVar, mode) {
    const ov = state.overrides[mode] && state.overrides[mode][cssVar];
    return ov || defaultHex(cssVar, mode);
  }

  /** Resolve any CSS var (incl. derived) to a concrete #RRGGBB via a probe. */
  function resolveVarColor(cssVar) {
    if (!probeEl) {
      probeEl = document.createElement('span');
      probeEl.setAttribute('aria-hidden', 'true');
      probeEl.style.cssText =
        'position:absolute;left:-9999px;top:-9999px;width:0;height:0;';
      document.body.appendChild(probeEl);
    }
    probeEl.style.color = 'var(' + cssVar + ')';
    const rgb = getComputedStyle(probeEl).color; // rgb(r, g, b)
    const m = rgb.match(/(\d+(?:\.\d+)?)/g);
    if (!m || m.length < 3) return null;
    return rgbToHex(+m[0], +m[1], +m[2]);
  }

  // ===========================================================================
  // Apply overrides to the document
  // ===========================================================================
  function ensureOverrideStyle() {
    let el = document.getElementById('autheon-theme-editor-overrides');
    if (!el) {
      el = document.createElement('style');
      el.id = 'autheon-theme-editor-overrides';
      (document.head || document.documentElement).appendChild(el);
    }
    return el;
  }

  function applyOverrides() {
    ensureOverrideStyle().textContent = buildOverrideCss(state.overrides);
  }

  // ===========================================================================
  // Small DOM helpers
  // ===========================================================================
  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
          el.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === 'style') {
          el.style.cssText = v;
        } else {
          el.setAttribute(k, v === true ? '' : String(v));
        }
      }
    }
    (Array.isArray(children) ? children : children != null ? [children] : []).forEach(
      (c) => {
        if (c == null) return;
        el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      },
    );
    return el;
  }

  const ICONS = {
    palette:
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-.9.8-1.7 1.7-1.7H16a6 6 0 0 0 6-6c0-5-4.5-8-10-8Z"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    lock:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    warn:
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg>',
  };

  // ===========================================================================
  // Launcher
  // ===========================================================================
  function loadLauncherPos() {
    const raw = safeGet(STORAGE.launcher);
    if (!raw) return null;
    try {
      const p = JSON.parse(raw);
      if (p && typeof p.x === 'number' && typeof p.y === 'number') return p;
    } catch (_) {
      /* ignore */
    }
    return null;
  }

  function viewportBox() {
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      size: LAUNCHER_SIZE,
      margin: EDGE_MARGIN,
    };
  }

  function positionLauncher() {
    const el = els.launcher;
    if (!el) return;
    if (state.launcherPos) {
      const clamped = clampPosition(state.launcherPos, viewportBox());
      state.launcherPos = clamped;
      el.classList.remove('ate-launcher--default');
      el.style.left = clamped.x + 'px';
      el.style.top = clamped.y + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    } else {
      // Default bottom-right, respecting mobile safe areas.
      el.classList.add('ate-launcher--default');
      el.style.left = 'auto';
      el.style.top = 'auto';
      el.style.removeProperty('right');
      el.style.removeProperty('bottom');
    }
  }

  function buildLauncher() {
    const btn = h('button', {
      type: 'button',
      class: 'ate-launcher ate-launcher--default',
      'aria-label': 'Open Theme Editor',
      'aria-haspopup': 'dialog',
      title: 'Theme Editor',
      html: ICONS.palette,
    });
    els.launcher = btn;
    attachDrag(btn);
    btn.addEventListener('click', function () {
      if (drag.justDragged) {
        drag.justDragged = false;
        return; // a drag just ended — do not open
      }
      openPanel();
    });
    document.body.appendChild(btn);
    positionLauncher();
  }

  // Click-vs-drag via Pointer Events (mouse / touch / stylus unified).
  const drag = { active: false, moved: false, justDragged: false, sx: 0, sy: 0, ox: 0, oy: 0 };
  function attachDrag(btn) {
    btn.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      drag.active = true;
      drag.moved = false;
      // Clear any stale flag from a prior gesture that ended via pointercancel
      // (which fires no click to reset it) so this tap can still open the editor.
      drag.justDragged = false;
      drag.sx = e.clientX;
      drag.sy = e.clientY;
      const rect = btn.getBoundingClientRect();
      drag.ox = rect.left;
      drag.oy = rect.top;
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    });
    btn.addEventListener('pointermove', function (e) {
      if (!drag.active) return;
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      btn.classList.add('ate-launcher--dragging');
      state.launcherPos = clampPosition(
        { x: drag.ox + dx, y: drag.oy + dy },
        viewportBox(),
      );
      positionLauncher();
    });
    function end(e) {
      if (!drag.active) return;
      drag.active = false;
      btn.classList.remove('ate-launcher--dragging');
      try {
        btn.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
      if (drag.moved) {
        drag.justDragged = true;
        // Gentle snap to the nearest horizontal edge.
        const vw = window.innerWidth;
        const cx = state.launcherPos.x + LAUNCHER_SIZE / 2;
        state.launcherPos.x =
          cx < vw / 2 ? EDGE_MARGIN : vw - LAUNCHER_SIZE - EDGE_MARGIN;
        positionLauncher();
        safeSet(STORAGE.launcher, JSON.stringify(state.launcherPos));
      }
    }
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
  }

  function resetLauncherPosition() {
    state.launcherPos = null;
    safeRemove(STORAGE.launcher);
    positionLauncher();
    if (els.launcher) els.launcher.focus();
  }

  // ===========================================================================
  // Editor panel
  // ===========================================================================
  let focusTrapHandler = null;
  let lastFocusBeforeOpen = null;

  function openPanel() {
    if (state.open) return;
    state.open = true;
    lastFocusBeforeOpen = document.activeElement;
    buildPanel();
    document.addEventListener('keydown', onGlobalKeydown, true);
    // Focus the first control for keyboard users.
    requestAnimationFrame(function () {
      if (els.search) els.search.focus();
    });
    if (els.launcher) els.launcher.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    if (!state.open) return;
    cancelPicker(); // discard any live picker preview
    state.open = false;
    document.removeEventListener('keydown', onGlobalKeydown, true);
    if (els.root) {
      els.root.remove();
      els.root = null;
    }
    if (els.launcher) {
      els.launcher.setAttribute('aria-expanded', 'false');
      // Return focus to the launcher when the editor closes.
      els.launcher.focus();
    }
  }

  function onGlobalKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (state.picker) cancelPicker();
      else closePanel();
    }
  }

  function statusText(msg, tone) {
    if (!els.status) return;
    els.status.textContent = msg;
    els.status.className = 'ate-status' + (tone ? ' ate-status--' + tone : '');
  }

  function buildPanel() {
    probeStorage(); // refresh availability so the storage warning is accurate
    const backdrop = h('div', {
      class: 'ate-backdrop',
      onclick: function (e) {
        if (e.target === backdrop) closePanel();
      },
    });

    const closeBtn = h('button', {
      type: 'button',
      class: 'ate-iconbtn ate-close',
      'aria-label': 'Close Theme Editor',
      html: ICONS.close,
      onclick: closePanel,
    });

    els.status = h('div', { class: 'ate-status', 'aria-live': 'polite' });
    els.status.textContent = 'Changes save automatically';

    const header = h('div', { class: 'ate-header' }, [
      h('div', { class: 'ate-header-main' }, [
        h('h2', { class: 'ate-title', id: 'ate-title', text: 'Theme Editor' }),
        els.status,
      ]),
      closeBtn,
    ]);

    els.search = h('input', {
      type: 'search',
      class: 'ate-search',
      placeholder: 'Filter colours…',
      'aria-label': 'Filter colours',
      value: state.filter,
      oninput: function (e) {
        state.filter = e.target.value;
        renderRows();
      },
    });

    const modeTag = h('span', {
      class: 'ate-modetag',
      text: modeLabel(currentMode()),
    });
    els.modeTag = modeTag;

    const intro = h('div', { class: 'ate-intro' }, [
      modeTag,
      els.search,
    ]);

    els.rows = h('div', { class: 'ate-rows' });

    if (!storageOk) {
      els.rows.appendChild(
        h('div', { class: 'ate-alert', role: 'status' }, [
          h('span', { html: ICONS.warn }),
          h('span', {
            text:
              'Local storage is unavailable — changes apply now but will not persist after reload.',
          }),
        ]),
      );
    }

    const resetTheme = h('button', {
      type: 'button',
      class: 'ate-btn ate-btn--danger',
      text: 'Reset to defaults',
      onclick: confirmResetTheme,
    });
    const resetPos = h('button', {
      type: 'button',
      class: 'ate-btn ate-btn--ghost',
      text: 'Reset launcher position',
      onclick: function () {
        resetLauncherPosition();
        statusText('Launcher moved to default position', 'ok');
      },
    });
    const footer = h('div', { class: 'ate-footer' }, [resetTheme, resetPos]);

    const panel = h('div', {
      class: 'ate-panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'ate-title',
    }, [header, intro, els.rows, buildExportSection(), footer]);
    els.panel = panel;

    const root = h('div', { class: 'ate-root' }, [backdrop, panel]);
    els.root = root;
    document.body.appendChild(root);

    // Render rows first so the panel has its real height before we anchor it —
    // otherwise the footer can end up below the viewport and be unclickable.
    renderRows();
    placePanel();
    setupFocusTrap(panel);
  }

  function placePanel() {
    const panel = els.panel;
    if (!panel) return;
    if (window.innerWidth <= 560) {
      panel.classList.add('ate-panel--sheet');
      return;
    }
    panel.classList.remove('ate-panel--sheet');
    // Anchor near the launcher, clamped fully inside the viewport.
    const rect = els.launcher
      ? els.launcher.getBoundingClientRect()
      : { left: window.innerWidth - 64, top: window.innerHeight - 64, right: window.innerWidth - 16, bottom: window.innerHeight - 16 };
    const pw = panel.offsetWidth || 360;
    const ph = panel.offsetHeight || 480;
    let left = rect.right - pw;
    if (left + pw + EDGE_MARGIN > window.innerWidth) left = window.innerWidth - pw - EDGE_MARGIN;
    if (left < EDGE_MARGIN) left = EDGE_MARGIN;
    // Prefer above the launcher; fall back to below if there is no room.
    let top = rect.top - ph - 12;
    if (top < EDGE_MARGIN) top = rect.bottom + 12;
    // Final clamp so the whole panel (incl. its footer) stays on-screen.
    top = Math.min(top, window.innerHeight - ph - EDGE_MARGIN);
    top = Math.max(top, EDGE_MARGIN);
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  function setupFocusTrap(panel) {
    focusTrapHandler = function (e) {
      if (e.key !== 'Tab') return;
      const focusables = panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const list = Array.prototype.filter.call(focusables, function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      });
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', focusTrapHandler);
  }

  // ===========================================================================
  // Colour rows
  // ===========================================================================
  function isModified(cssVar, mode) {
    return !!(state.overrides[mode] && state.overrides[mode][cssVar]);
  }

  function matchesFilter(item, filter) {
    if (!filter) return true;
    return (
      item.name.toLowerCase().includes(filter) ||
      item.cssVar.toLowerCase().includes(filter)
    );
  }

  function modeLabel(mode) {
    return mode === 'dark' ? 'Editing dark theme' : 'Editing light theme';
  }

  function renderRows() {
    const container = els.rows;
    if (!container) return;
    // Preserve the storage alert if present.
    Array.prototype.slice
      .call(container.querySelectorAll('.ate-group, .ate-empty'))
      .forEach((n) => n.remove());

    const mode = currentMode();
    if (els.modeTag) els.modeTag.textContent = modeLabel(mode);
    const filter = state.filter.trim().toLowerCase();
    let anyShown = false;

    REGISTRY.forEach(function (group) {
      const matching = group.items.filter(function (item) {
        return matchesFilter(item, filter);
      });
      if (!matching.length) return;
      anyShown = true;

      const groupEl = h('section', { class: 'ate-group' }, [
        h('h3', { class: 'ate-group-title', text: group.group }),
      ]);
      matching.forEach(function (item) {
        groupEl.appendChild(buildRow(item, mode));
      });
      container.appendChild(groupEl);
    });

    // Derived (read-only) group — only when not filtering it out.
    const derivedMatching = DERIVED.filter(function (item) {
      return matchesFilter(item, filter);
    });
    if (derivedMatching.length) {
      anyShown = true;
      const g = h('section', { class: 'ate-group' }, [
        h('h3', { class: 'ate-group-title', text: 'Derived · read-only' }),
      ]);
      derivedMatching.forEach(function (item) {
        g.appendChild(buildDerivedRow(item));
      });
      container.appendChild(g);
    }

    if (!anyShown) {
      container.appendChild(
        h('div', { class: 'ate-empty', text: 'No colours match “' + state.filter + '”.' }),
      );
    }

    renderContrastWarnings();
  }

  function buildRow(item, mode) {
    const value = effectiveHex(item.cssVar, mode) || '#000000';
    const modified = isModified(item.cssVar, mode);

    const swatch = h('button', {
      type: 'button',
      class: 'ate-swatch',
      'aria-label': 'Pick colour for ' + item.name + ' (currently ' + value + ')',
      style: 'background:' + value,
    });
    swatch.addEventListener('click', function () {
      openPicker(item, mode, swatch);
    });

    const input = h('input', {
      type: 'text',
      class: 'ate-hex',
      spellcheck: 'false',
      autocomplete: 'off',
      'aria-label': 'Hex value for ' + item.name,
      value: value,
    });
    const hint = h('div', { class: 'ate-hex-hint', 'aria-live': 'polite' });

    function commit() {
      const hex = normalizeHex(input.value);
      if (!hex) {
        input.setAttribute('aria-invalid', 'true');
        input.classList.add('ate-hex--invalid');
        hint.textContent = 'Use a hex colour like #1A2B3C';
        // Keep the previous valid value intact (do not apply / save).
        return;
      }
      input.removeAttribute('aria-invalid');
      input.classList.remove('ate-hex--invalid');
      hint.textContent = '';
      setColor(item.cssVar, mode, hex);
      input.value = hex;
      swatch.style.background = hex;
      swatch.setAttribute(
        'aria-label',
        'Pick colour for ' + item.name + ' (currently ' + hex + ')',
      );
      refreshRowMeta(row, item, mode);
      renderContrastWarnings();
    }
    input.addEventListener('change', commit);
    input.addEventListener('blur', function () {
      if (normalizeHex(input.value)) commit();
      else {
        // Restore last valid value on blur so nothing is corrupted.
        input.value = effectiveHex(item.cssVar, mode) || value;
        input.removeAttribute('aria-invalid');
        input.classList.remove('ate-hex--invalid');
        hint.textContent = '';
      }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      }
    });

    const nameEl = h('div', { class: 'ate-row-name' }, [
      h('span', { class: 'ate-row-label', text: item.name }),
      h('code', { class: 'ate-row-var', text: item.cssVar }),
    ]);

    const dot = h('span', {
      class: 'ate-mod-dot' + (modified ? ' is-on' : ''),
      title: modified ? 'Modified — default ' + (defaultHex(item.cssVar, mode) || '—') : '',
      'aria-hidden': 'true',
    });

    const row = h('div', { class: 'ate-row', 'data-var': item.cssVar }, [
      dot,
      nameEl,
      h('div', { class: 'ate-controls' }, [swatch, input]),
    ]);
    row.appendChild(hint);
    row._els = { swatch, input, dot, hint };
    return row;
  }

  function refreshRowMeta(row, item, mode) {
    const modified = isModified(item.cssVar, mode);
    const dot = row._els.dot;
    dot.className = 'ate-mod-dot' + (modified ? ' is-on' : '');
    dot.title = modified
      ? 'Modified — default ' + (defaultHex(item.cssVar, mode) || '—')
      : '';
  }

  function buildDerivedRow(item) {
    const resolved = resolveVarColor(item.cssVar) || '#000000';
    const swatch = h('span', {
      class: 'ate-swatch ate-swatch--ro',
      style: 'background:' + resolved,
      'aria-hidden': 'true',
    });
    const nameEl = h('div', { class: 'ate-row-name' }, [
      h('span', { class: 'ate-row-label', text: item.name }),
      h('code', { class: 'ate-row-var', text: item.cssVar }),
    ]);
    const meta = h('div', { class: 'ate-derived-meta' }, [
      h('span', { class: 'ate-lock', html: ICONS.lock, 'aria-hidden': 'true' }),
      h('span', {
        class: 'ate-follows',
        text: 'follows ' + (NAME_BY_VAR[item.follows] || item.follows),
      }),
    ]);
    return h('div', { class: 'ate-row ate-row--derived', 'data-var': item.cssVar }, [
      h('span', { class: 'ate-mod-dot', 'aria-hidden': 'true' }),
      nameEl,
      h('div', { class: 'ate-controls' }, [
        swatch,
        h('code', { class: 'ate-ro-value', text: resolved }),
      ]),
      meta,
    ]);
  }

  /** Re-resolve the read-only derived rows so they track edits to their source. */
  function refreshDerivedRows() {
    if (!els.rows) return;
    els.rows.querySelectorAll('.ate-row--derived').forEach(function (row) {
      const cssVar = row.getAttribute('data-var');
      if (!cssVar) return;
      const resolved = resolveVarColor(cssVar) || '#000000';
      const sw = row.querySelector('.ate-swatch');
      const val = row.querySelector('.ate-ro-value');
      if (sw) sw.style.background = resolved;
      if (val) val.textContent = resolved;
    });
  }

  function renderContrastWarnings() {
    if (!els.rows) return;
    let box = els.rows.querySelector('.ate-contrast');
    if (box) box.remove();
    const mode = currentMode();
    const issues = [];
    CONTRAST_PAIRS.forEach(function (pair) {
      const fg = effectiveHex(pair.fg, mode);
      const bg = effectiveHex(pair.bg, mode);
      if (!fg || !bg) return;
      if (meetsContrast(fg, bg, AA_CONTRAST)) return;
      const ratio = contrastRatio(fg, bg);
      issues.push(pair.label + ' — ' + ratio.toFixed(1) + ':1');
    });
    if (!issues.length) return;
    box = h('div', { class: 'ate-contrast', role: 'status' }, [
      h('div', { class: 'ate-contrast-head' }, [
        h('span', { html: ICONS.warn }),
        h('span', { text: 'Low contrast (below AA 4.5:1)' }),
      ]),
      h('ul', {}, issues.map((t) => h('li', { text: t }))),
      h('div', { class: 'ate-contrast-note', text: 'You can still save these — experimentation is allowed.' }),
    ]);
    els.rows.appendChild(box);
  }

  // ===========================================================================
  // Colour mutation
  // ===========================================================================
  function setColor(cssVar, mode, hex, opts) {
    state.overrides[mode][cssVar] = hex;
    applyOverrides();
    refreshDerivedRows(); // keep read-only derived rows in step with their source
    if (!opts || !opts.transient) {
      persistOverrides();
      statusText('Saved locally', 'ok');
    }
  }

  function clearColor(cssVar, mode) {
    if (state.overrides[mode]) delete state.overrides[mode][cssVar];
    applyOverrides();
    refreshDerivedRows();
  }

  function confirmResetTheme() {
    const overlay = h('div', { class: 'ate-confirm-backdrop' });
    const dialog = h('div', {
      class: 'ate-confirm',
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': 'ate-confirm-title',
    }, [
      h('h3', { id: 'ate-confirm-title', text: 'Reset all theme colours?' }),
      h('p', {
        text:
          'This removes every custom colour (light and dark) and restores the application defaults. Prototype data is not affected.',
      }),
      h('div', { class: 'ate-confirm-actions' }, [
        h('button', {
          type: 'button',
          class: 'ate-btn ate-btn--ghost',
          text: 'Cancel',
          onclick: function () {
            overlay.remove();
            if (els.launcher && !state.open) els.launcher.focus();
          },
        }),
        h('button', {
          type: 'button',
          class: 'ate-btn ate-btn--danger',
          text: 'Reset colours',
          onclick: function () {
            doResetTheme();
            overlay.remove();
          },
        }),
      ]),
    ]);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
    (els.root || document.body).appendChild(overlay);
    requestAnimationFrame(function () {
      dialog.querySelector('.ate-btn--danger').focus();
    });
  }

  function doResetTheme() {
    state.overrides = { light: {}, dark: {} };
    applyOverrides();
    persistOverrides(); // empty → clears both localStorage and the URL param
    renderRows();
    statusText('Restored default theme', 'ok');
  }

  function resetTheme() {
    doResetTheme();
  }

  // ===========================================================================
  // Export & share
  // ===========================================================================
  /** Snapshot of the *visible* theme for the active mode: {var: effective hex}.
   *  Only editable theme tokens — never launcher/picker/UI runtime state. */
  function activeValueMap() {
    const mode = currentMode();
    const map = {};
    ALL_EDITABLE.forEach(function (cssVar) {
      const hex = effectiveHex(cssVar, mode);
      if (hex) map[cssVar] = hex;
    });
    return map;
  }

  /** Variable names the user overrode for the active mode (registry order). */
  function modifiedVars() {
    const overrides = state.overrides[currentMode()] || {};
    return ALL_EDITABLE.filter(function (cssVar) {
      return Object.prototype.hasOwnProperty.call(overrides, cssVar);
    });
  }

  function copyText(text, okMsg) {
    const ok = function () {
      statusText(okMsg, 'ok');
    };
    const manual = function () {
      // Fallback when the async Clipboard API is unavailable or denied.
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
        (els.panel || document.body).appendChild(ta);
        ta.select();
        const copied = document.execCommand && document.execCommand('copy');
        ta.remove();
        if (copied) ok();
        else statusText('Copy failed — select the text manually', 'warn');
      } catch (_) {
        statusText('Copy failed — select the text manually', 'warn');
      }
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, manual);
      } else {
        manual();
      }
    } catch (_) {
      manual();
    }
  }

  function downloadFile(filename, text, mime) {
    try {
      const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      (els.panel || document.body).appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 0);
      statusText('Downloaded ' + filename, 'ok');
    } catch (_) {
      statusText('Download failed', 'warn');
    }
  }

  function exportFilename(ext) {
    return 'autheon-theme-' + currentMode() + '.' + ext;
  }

  function buildExportSection() {
    function actionBtn(label, onClick) {
      return h('button', {
        type: 'button',
        class: 'ate-btn ate-btn--ghost ate-btn--sm',
        text: label,
        onclick: onClick,
      });
    }
    return h('details', { class: 'ate-export' }, [
      h('summary', { class: 'ate-export-summary', text: 'Export & share' }),
      h('div', { class: 'ate-export-grid' }, [
        actionBtn('Copy JSON', function () {
          copyText(
            buildThemeJson(currentMode(), activeValueMap(), modifiedVars()),
            'Copied JSON',
          );
        }),
        actionBtn('Download JSON', function () {
          downloadFile(
            exportFilename('json'),
            buildThemeJson(currentMode(), activeValueMap(), modifiedVars()),
            'application/json;charset=utf-8',
          );
        }),
        actionBtn('Copy Markdown', function () {
          copyText(
            buildThemeMarkdown(currentMode(), activeValueMap(), modifiedVars()),
            'Copied Markdown',
          );
        }),
        actionBtn('Download Markdown', function () {
          downloadFile(
            exportFilename('md'),
            buildThemeMarkdown(currentMode(), activeValueMap(), modifiedVars()),
            'text/markdown;charset=utf-8',
          );
        }),
        actionBtn('Copy shareable link', function () {
          copyText(currentUrlWithTheme().href, 'Copied shareable link');
        }),
      ]),
    ]);
  }

  // ===========================================================================
  // Custom HSV colour picker
  // ===========================================================================
  function openPicker(item, mode, anchorSwatch) {
    cancelPicker();
    const startHex = effectiveHex(item.cssVar, mode) || '#000000';
    const hadOverride = isModified(item.cssVar, mode);
    const rgb = hexToRgb(startHex) || { r: 0, g: 0, b: 0 };
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

    const session = {
      item,
      mode,
      startHex,
      hadOverride,
      hsv,
      anchorSwatch,
      committed: false,
    };
    state.picker = session;

    // Full-screen catcher: clicking outside the picker = Cancel (spec §7.4),
    // and it must NOT close the editor behind it.
    const outside = h('div', { class: 'ate-picker-catcher' });
    outside.addEventListener('pointerdown', function (e) {
      if (e.target === outside) cancelPicker();
    });

    const area = h('div', { class: 'ate-sv', tabindex: '0', role: 'group', 'aria-label': 'Saturation and brightness' });
    const areaThumb = h('div', { class: 'ate-sv-thumb' });
    area.appendChild(areaThumb);

    const hue = h('input', {
      type: 'range',
      class: 'ate-hue',
      min: '0',
      max: '360',
      step: '1',
      'aria-label': 'Hue',
      value: String(Math.round(hsv.h)),
    });

    const preview = h('span', { class: 'ate-preview', 'aria-hidden': 'true' });
    const hexOut = h('input', {
      type: 'text',
      class: 'ate-hex ate-picker-hex',
      spellcheck: 'false',
      autocomplete: 'off',
      'aria-label': 'Hex value',
      value: startHex,
    });

    const okBtn = h('button', {
      type: 'button',
      class: 'ate-btn ate-btn--primary',
      text: 'OK',
      onclick: confirmPicker,
    });
    const cancelBtn = h('button', {
      type: 'button',
      class: 'ate-btn ate-btn--ghost',
      text: 'Cancel',
      onclick: cancelPicker,
    });

    const picker = h('div', {
      class: 'ate-picker',
      role: 'dialog',
      'aria-label': 'Colour picker for ' + item.name,
    }, [
      area,
      hue,
      h('div', { class: 'ate-picker-foot' }, [
        preview,
        hexOut,
        h('div', { class: 'ate-picker-actions' }, [cancelBtn, okBtn]),
      ]),
    ]);

    session.els = { picker, area, areaThumb, hue, preview, hexOut, outside };

    function renderPicker(applyLive) {
      const c = hsvToRgb(session.hsv.h, session.hsv.s, session.hsv.v);
      const hex = rgbToHex(c.r, c.g, c.b);
      area.style.background =
        'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(' +
        session.hsv.h +
        ',100%,50%))';
      areaThumb.style.left = session.hsv.s * 100 + '%';
      areaThumb.style.top = (1 - session.hsv.v) * 100 + '%';
      areaThumb.style.background = hex;
      preview.style.background = hex;
      hexOut.value = hex;
      hexOut.removeAttribute('aria-invalid');
      if (applyLive) setColor(item.cssVar, mode, hex, { transient: true });
    }

    function setFromPointer(e) {
      const rect = area.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);
      session.hsv.s = rect.width ? x / rect.width : 0;
      session.hsv.v = rect.height ? 1 - y / rect.height : 0;
      renderPicker(true);
    }

    let svDragging = false;
    area.addEventListener('pointerdown', function (e) {
      svDragging = true;
      try { area.setPointerCapture(e.pointerId); } catch (_) {}
      setFromPointer(e);
    });
    area.addEventListener('pointermove', function (e) {
      if (svDragging) setFromPointer(e);
    });
    area.addEventListener('pointerup', function () { svDragging = false; });
    area.addEventListener('keydown', function (e) {
      const step = e.shiftKey ? 0.1 : 0.02;
      let handled = true;
      if (e.key === 'ArrowRight') session.hsv.s = Math.min(1, session.hsv.s + step);
      else if (e.key === 'ArrowLeft') session.hsv.s = Math.max(0, session.hsv.s - step);
      else if (e.key === 'ArrowUp') session.hsv.v = Math.min(1, session.hsv.v + step);
      else if (e.key === 'ArrowDown') session.hsv.v = Math.max(0, session.hsv.v - step);
      else handled = false;
      if (handled) {
        e.preventDefault();
        renderPicker(true);
      }
    });

    hue.addEventListener('input', function () {
      session.hsv.h = +hue.value;
      renderPicker(true);
    });

    hexOut.addEventListener('change', function () {
      const hex = normalizeHex(hexOut.value);
      if (!hex) {
        hexOut.setAttribute('aria-invalid', 'true');
        return;
      }
      const rr = hexToRgb(hex);
      session.hsv = rgbToHsv(rr.r, rr.g, rr.b);
      hue.value = String(Math.round(session.hsv.h));
      renderPicker(true);
    });

    session.render = renderPicker;
    (els.root || document.body).appendChild(outside);
    outside.appendChild(picker);
    positionPicker(session, anchorSwatch);
    renderPicker(false);
    requestAnimationFrame(function () { area.focus(); });
  }

  function positionPicker(session, anchor) {
    const picker = session.els.picker;
    if (window.innerWidth <= 560) {
      picker.classList.add('ate-picker--sheet');
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const pw = picker.offsetWidth || 240;
    const ph = picker.offsetHeight || 260;
    let left = rect.left;
    if (left + pw + EDGE_MARGIN > window.innerWidth) left = window.innerWidth - pw - EDGE_MARGIN;
    if (left < EDGE_MARGIN) left = EDGE_MARGIN;
    let top = rect.top - ph - 10; // above the swatch (spec §7)
    if (top < EDGE_MARGIN) top = Math.min(rect.bottom + 10, window.innerHeight - ph - EDGE_MARGIN);
    picker.style.left = left + 'px';
    picker.style.top = top + 'px';
  }

  function confirmPicker() {
    const s = state.picker;
    if (!s) return;
    const hex = normalizeHex(s.els.hexOut.value) ||
      rgbToHex.apply(null, (function () {
        const c = hsvToRgb(s.hsv.h, s.hsv.s, s.hsv.v);
        return [c.r, c.g, c.b];
      })());
    s.committed = true;
    setColor(s.item.cssVar, s.mode, hex); // saves + status
    teardownPicker();
    syncRowFromState(s.item, s.mode);
  }

  function cancelPicker() {
    const s = state.picker;
    if (!s) return;
    // Restore the pre-picker value (spec §7.3/§7.4).
    if (s.hadOverride) {
      setColor(s.item.cssVar, s.mode, s.startHex, { transient: true });
      persistOverrides();
    } else {
      clearColor(s.item.cssVar, s.mode);
      persistOverrides();
    }
    teardownPicker();
    syncRowFromState(s.item, s.mode);
  }

  function teardownPicker() {
    const s = state.picker;
    if (!s) return;
    if (s.els && s.els.outside) s.els.outside.remove();
    state.picker = null;
  }

  function syncRowFromState(item, mode) {
    if (!els.rows) return;
    const row = els.rows.querySelector('.ate-row[data-var="' + item.cssVar + '"]');
    if (!row || !row._els) return;
    const val = effectiveHex(item.cssVar, mode) || '#000000';
    row._els.input.value = val;
    row._els.swatch.style.background = val;
    refreshRowMeta(row, item, mode);
    renderContrastWarnings();
  }

  // ===========================================================================
  // Injected stylesheet for the editor's own UI
  // ===========================================================================
  function injectStyles() {
    if (document.getElementById('autheon-theme-editor-styles')) return;
    const css = EDITOR_CSS;
    const el = document.createElement('style');
    el.id = 'autheon-theme-editor-styles';
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
  }

  // ===========================================================================
  // Visibility / lifecycle
  // ===========================================================================
  function isHiddenByFlag() {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('themeEditor');
      if (q === 'off' || q === '0' || q === 'false') return true;
    } catch (_) {
      /* ignore */
    }
    return safeGet(STORAGE.hidden) === '1';
  }

  function show() {
    injectStyles();
    if (!els.launcher) buildLauncher();
    els.launcher.style.display = '';
    safeRemove(STORAGE.hidden);
  }

  function hide() {
    if (state.open) closePanel();
    if (els.launcher) els.launcher.style.display = 'none';
    safeSet(STORAGE.hidden, '1');
  }

  function toggle() {
    if (els.launcher && els.launcher.style.display !== 'none') hide();
    else show();
  }

  function onResize() {
    positionLauncher();
    if (state.open) placePanel();
  }

  // Reflect external light/dark switches into the panel + keep overrides applied.
  function watchThemeMode() {
    const mo = new MutationObserver(function (records) {
      for (const r of records) {
        if (r.attributeName === 'data-theme') {
          if (state.open) renderRows();
          break;
        }
      }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // Cross-tab sync: another tab edited the theme → adopt it here.
  function watchStorage() {
    window.addEventListener('storage', function (e) {
      if (e.key !== STORAGE.overrides) return;
      state.overrides = loadOverrides();
      applyOverrides();
      if (state.open) renderRows();
    });
  }

  function init() {
    probeStorage();

    // 1) Ensure a theme mode is active before first paint. Our overrides are
    //    mode-scoped (:root[data-theme="…"]) so they only apply once <html> has
    //    a data-theme. The PWA sets it in an inline pre-paint script, but the
    //    desktop prototype only sets it once React mounts (after paint) — so
    //    without this, a stored override would flash the default theme first.
    //    Mirror the app's own default (persisted choice, else light) so we never
    //    disagree with what React sets a moment later.
    if (!document.documentElement.getAttribute('data-theme')) {
      const initialMode = safeGet('autheon-theme') === 'dark' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', initialMode);
    }

    // 2) Resolve overrides by precedence — URL > localStorage > defaults — and
    //    apply immediately (no flash of the default theme). Reading is the only
    //    thing that happens here; we do NOT write back on load, so a shareable
    //    URL keeps winning on refresh and nothing loops.
    const urlOverrides = readUrlOverrides();
    const urlHasConfig = MODES.some(
      (m) => Object.keys(urlOverrides[m]).length > 0,
    );
    state.overrides = urlHasConfig ? urlOverrides : loadOverrides();
    applyOverrides();

    // 3) Defer any DOM mounting until the body exists.
    function mount() {
      state.launcherPos = loadLauncherPos();
      injectStyles();
      watchThemeMode();
      watchStorage();
      window.addEventListener('resize', onResize);
      if (!isHiddenByFlag()) {
        buildLauncher();
      }
    }
    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount, { once: true });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.AutheonThemeEditor = {
    __mounted: true,
    __test: __test,
    show: show,
    hide: hide,
    toggle: toggle,
    open: openPanel,
    close: closePanel,
    resetTheme: resetTheme,
    resetLauncherPosition: resetLauncherPosition,
    isOpen: function () {
      return state.open;
    },
  };

  // ===========================================================================
  // Editor CSS — a self-contained dark-glass palette, deliberately independent
  // of the app's theme tokens so the tool stays legible no matter what colours
  // the user sets. Assigned before init() so injectStyles() can read it.
  // ===========================================================================
  const EDITOR_CSS = [
    /* Launcher */
    '.ate-launcher{position:fixed;z-index:2147482000;width:48px;height:48px;min-width:44px;min-height:44px;display:grid;place-items:center;border-radius:14px;',
    'background:rgba(28,28,32,.62);color:#fff;border:1px solid rgba(255,255,255,.22);',
    'box-shadow:0 6px 20px rgba(0,0,0,.28),0 1px 2px rgba(0,0,0,.35);',
    '-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);opacity:.82;cursor:grab;',
    'transition:opacity .15s ease,transform .12s ease,box-shadow .15s ease;touch-action:none;padding:0;}',
    '.ate-launcher--default{right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));}',
    '.ate-launcher:hover,.ate-launcher:focus-visible{opacity:1;transform:translateY(-1px);}',
    '.ate-launcher:focus-visible{outline:3px solid #7cc4ff;outline-offset:2px;}',
    '.ate-launcher--dragging{cursor:grabbing;opacity:1;transform:scale(1.04);}',
    '.ate-launcher svg{pointer-events:none;}',

    /* Root / backdrop */
    '.ate-root{position:fixed;inset:0;z-index:2147483000;font-family:"Inter Tight",system-ui,-apple-system,sans-serif;}',
    '.ate-backdrop{position:absolute;inset:0;background:rgba(10,12,18,.28);-webkit-backdrop-filter:blur(1px);backdrop-filter:blur(1px);animation:ate-fade .12s ease;}',
    '@keyframes ate-fade{from{opacity:0}to{opacity:1}}',

    /* Panel */
    '.ate-panel{position:absolute;width:360px;max-width:calc(100vw - 24px);max-height:min(78vh,640px);display:flex;flex-direction:column;',
    'background:rgba(24,25,30,.94);color:#e9eaee;border:1px solid rgba(255,255,255,.12);border-radius:16px;',
    'box-shadow:0 24px 64px rgba(0,0,0,.45),0 2px 10px rgba(0,0,0,.35);overflow:hidden;-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);}',
    '.ate-panel--sheet{left:0!important;right:0;bottom:0;top:auto!important;width:100%;max-width:100%;border-radius:16px 16px 0 0;max-height:88vh;padding-bottom:env(safe-area-inset-bottom,0px);}',

    /* Header */
    '.ate-header{display:flex;align-items:flex-start;gap:12px;padding:14px 14px 10px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:inherit;}',
    '.ate-header-main{flex:1;min-width:0;}',
    '.ate-title{margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em;}',
    '.ate-status{font-size:12px;color:#9aa0ab;margin-top:2px;transition:color .2s ease;}',
    '.ate-status--ok{color:#57d08a;}',
    '.ate-status--warn{color:#ffca8a;}',
    '.ate-iconbtn{display:grid;place-items:center;width:32px;height:32px;border-radius:9px;background:transparent;border:1px solid transparent;color:#c7cbd3;cursor:pointer;flex-shrink:0;}',
    '.ate-iconbtn:hover{background:rgba(255,255,255,.08);color:#fff;}',
    '.ate-iconbtn:focus-visible{outline:2px solid #7cc4ff;outline-offset:1px;}',

    /* Intro / search */
    '.ate-intro{padding:10px 14px 6px;display:flex;flex-direction:column;gap:8px;}',
    '.ate-modetag{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#8b909b;}',
    '.ate-search{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e9eaee;font-size:13px;}',
    '.ate-search:focus-visible{outline:2px solid #7cc4ff;outline-offset:0;border-color:transparent;}',

    /* Rows scroller */
    '.ate-rows{flex:1;overflow-y:auto;padding:6px 14px 12px;}',
    '.ate-group{margin-top:12px;}',
    '.ate-group-title{margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#8b909b;}',
    '.ate-empty{padding:24px 4px;color:#8b909b;font-size:13px;text-align:center;}',

    /* Row */
    '.ate-row{display:grid;grid-template-columns:8px 1fr auto;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);}',
    '.ate-row--derived{opacity:.9;}',
    '.ate-mod-dot{width:7px;height:7px;border-radius:50%;background:transparent;}',
    '.ate-mod-dot.is-on{background:#7cc4ff;box-shadow:0 0 0 3px rgba(124,196,255,.18);}',
    '.ate-row-name{min-width:0;display:flex;flex-direction:column;gap:1px;}',
    '.ate-row-label{font-size:13px;font-weight:600;color:#f2f3f6;line-height:1.2;}',
    '.ate-row-var{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:10.5px;color:#868c98;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}',
    '.ate-controls{display:flex;align-items:center;gap:8px;}',
    '.ate-swatch{width:30px;height:30px;min-width:30px;border-radius:8px;border:1px solid rgba(255,255,255,.25);box-shadow:inset 0 0 0 1px rgba(0,0,0,.15);cursor:pointer;padding:0;background-clip:padding-box;}',
    '.ate-swatch:focus-visible{outline:2px solid #7cc4ff;outline-offset:2px;}',
    '.ate-swatch--ro{cursor:default;}',
    '.ate-hex{width:92px;box-sizing:border-box;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#eef0f3;',
    'font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:12px;text-transform:uppercase;}',
    '.ate-hex:focus-visible{outline:2px solid #7cc4ff;outline-offset:0;border-color:transparent;}',
    '.ate-hex--invalid{border-color:#ff6b6b;background:rgba(255,107,107,.12);}',
    '.ate-hex-hint{grid-column:2 / -1;font-size:11px;color:#ff9d9d;min-height:0;}',
    '.ate-hex-hint:empty{display:none;}',
    '.ate-ro-value{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:12px;color:#aeb3bd;width:92px;text-align:center;}',
    '.ate-derived-meta{grid-column:2 / -1;display:flex;align-items:center;gap:6px;color:#868c98;font-size:11px;}',
    '.ate-lock{display:inline-flex;color:#868c98;}',

    /* Alerts / contrast */
    '.ate-alert{display:flex;gap:8px;align-items:flex-start;margin:10px 0 0;padding:10px;border-radius:10px;background:rgba(255,196,84,.12);border:1px solid rgba(255,196,84,.3);color:#ffd88a;font-size:12px;line-height:1.4;}',
    '.ate-contrast{margin-top:14px;padding:10px 12px;border-radius:10px;background:rgba(255,175,90,.1);border:1px solid rgba(255,175,90,.28);color:#ffca8a;font-size:12px;}',
    '.ate-contrast-head{display:flex;align-items:center;gap:6px;font-weight:600;}',
    '.ate-contrast ul{margin:6px 0 0;padding-left:18px;}',
    '.ate-contrast li{margin:2px 0;}',
    '.ate-contrast-note{margin-top:6px;color:#c9a878;font-size:11px;}',

    /* Footer + buttons */
    '.ate-footer{display:flex;gap:8px;padding:12px 14px;border-top:1px solid rgba(255,255,255,.08);background:inherit;}',
    '.ate-btn{padding:8px 12px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid transparent;font-family:inherit;}',
    '.ate-btn:focus-visible{outline:2px solid #7cc4ff;outline-offset:1px;}',
    '.ate-btn--danger{background:rgba(255,107,107,.14);color:#ff9d9d;border-color:rgba(255,107,107,.35);flex:1;}',
    '.ate-btn--danger:hover{background:rgba(255,107,107,.24);}',
    '.ate-btn--ghost{background:rgba(255,255,255,.06);color:#d3d7df;border-color:rgba(255,255,255,.14);}',
    '.ate-btn--ghost:hover{background:rgba(255,255,255,.12);}',
    '.ate-btn--primary{background:#3b82f6;color:#fff;}',
    '.ate-btn--primary:hover{background:#2f6fe0;}',
    '.ate-btn--sm{padding:6px 10px;font-size:12px;}',

    /* Export & share (collapsible to stay compact on small screens) */
    '.ate-export{border-top:1px solid rgba(255,255,255,.08);}',
    '.ate-export-summary{padding:10px 14px;font-size:12px;font-weight:600;color:#c7cbd3;cursor:pointer;list-style:none;user-select:none;}',
    '.ate-export-summary::-webkit-details-marker{display:none;}',
    '.ate-export-summary::before{content:"\\25B8  ";color:#8b909b;}',
    'details[open] > .ate-export-summary::before{content:"\\25BE  ";}',
    '.ate-export-summary:focus-visible{outline:2px solid #7cc4ff;outline-offset:-2px;}',
    '.ate-export-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 14px 12px;}',
    '.ate-export-grid .ate-btn{width:100%;}',
    '.ate-export-grid .ate-btn:last-child{grid-column:1 / -1;}',

    /* Confirm dialog */
    '.ate-confirm-backdrop{position:absolute;inset:0;z-index:2147483200;display:grid;place-items:center;background:rgba(6,8,12,.5);padding:16px;}',
    '.ate-confirm{width:320px;max-width:100%;background:rgba(28,29,35,.98);color:#e9eaee;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:18px;box-shadow:0 24px 64px rgba(0,0,0,.5);}',
    '.ate-confirm h3{margin:0 0 8px;font-size:15px;}',
    '.ate-confirm p{margin:0 0 16px;font-size:13px;color:#b6bbc5;line-height:1.5;}',
    '.ate-confirm-actions{display:flex;gap:8px;justify-content:flex-end;}',

    /* Colour picker */
    '.ate-picker-catcher{position:absolute;inset:0;z-index:2147483100;}',
    '.ate-picker{position:absolute;width:236px;background:rgba(24,25,30,.98);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:12px;box-shadow:0 24px 64px rgba(0,0,0,.5);}',
    '.ate-picker--sheet{left:0;right:0;bottom:0;top:auto;width:100%;box-sizing:border-box;border-radius:14px 14px 0 0;padding-bottom:calc(12px + env(safe-area-inset-bottom,0px));}',
    '.ate-sv{position:relative;width:100%;height:150px;border-radius:9px;cursor:crosshair;border:1px solid rgba(255,255,255,.14);touch-action:none;}',
    '.ate-sv:focus-visible{outline:2px solid #7cc4ff;outline-offset:2px;}',
    '.ate-sv-thumb{position:absolute;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.4);transform:translate(-50%,-50%);pointer-events:none;}',
    '.ate-hue{-webkit-appearance:none;appearance:none;width:100%;height:12px;border-radius:7px;margin:12px 0;',
    'background:linear-gradient(to right,#f00 0%,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00 100%);}',
    '.ate-hue::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid rgba(0,0,0,.3);cursor:pointer;}',
    '.ate-hue::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid rgba(0,0,0,.3);cursor:pointer;}',
    '.ate-hue:focus-visible{outline:2px solid #7cc4ff;outline-offset:2px;}',
    '.ate-picker-foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
    '.ate-preview{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.25);}',
    '.ate-picker-hex{flex:1;min-width:78px;}',
    '.ate-picker-actions{display:flex;gap:6px;width:100%;justify-content:flex-end;margin-top:4px;}',
    '.ate-picker-actions .ate-btn{padding:6px 12px;}',

    '@media (prefers-reduced-motion: reduce){.ate-launcher,.ate-backdrop{transition:none;animation:none;}}',
  ].join('');

  try {
    init();
  } catch (err) {
    if (window.console && console.warn) {
      console.warn('[autheon-theme-editor] init failed', err);
    }
  }
})();
