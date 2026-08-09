# Prototype

`project/` is the **implementation reference** for the AUTHEON driver PWA (Figma replacement). It must comply with the PRD (behavior authority) and the client Design Direction Board, July 2026 (visual authority) — see `docs/design/ui-ux-production-plan.md` §0. It is an interactive reference — not production application code.

## Quick start

**Important:** always serve from the **Autheon repo root** (the folder that contains both `pwa/` and `prototype/`). Serving only `prototype/project` makes `/pwa/` return 404.

```bash
# From Autheon repo root
npm run serve
# or: npx serve . -l 3000

# Client preview (framed phone + admin):
#   http://localhost:3000/
# Installable driver PWA (full viewport):
#   http://localhost:3000/pwa/
```

On GitHub Pages (root custom domain): `https://autheon.calibtos.com/` and `https://autheon.calibtos.com/pwa/`.

**Two driver surfaces**

| Route | What it is |
| --- | --- |
| Client preview → **Driver PWA** | Phone-framed mock inside the prototype shell |
| `/pwa/` | **Installable driver PWA** — full viewport, manifest + service worker |

In the client preview header use **Open driver PWA** (the only entry to `/pwa`). The phone-mock caption is a label only, not a second link. On `/pwa/` use **Install app** (Chrome/Edge) or **Add to Home Screen** (iOS). **Framed preview** returns to `/`. After install, the app launches standalone without the install chrome.

### GitHub Pages / Cloudflare note

`autheon.calibtos.com` is behind **Cloudflare HTTP Basic Auth**. Browsers **will not** offer PWA install on password-gated origins (that is why localhost works and the hosted site does not).

To enable install on the hosted site: in Cloudflare, bypass or disable Basic Auth for `/pwa*` (or the whole prototype), deploy, then hard-refresh `/pwa/`.

## Developer workflow (implementing in autheon-fe)

1. Read [`../docs/design/brand-tokens.md`](../docs/design/brand-tokens.md) for colors and usage rules
2. Read [`../docs/design/driver-screen-spec.md`](../docs/design/driver-screen-spec.md) for the screen you are building
3. Open the prototype at the target screen + theme (Driver/Admin, Light/Dark switcher)
4. Inspect **CSS classes and tokens** in DevTools — do not copy inline styles
5. Copy **i18n keys** from `project/i18n.js` (EN+DE parity required)
6. Use **formatters** from `project/formatters.js` for dates/money/PLZ
7. Map tokens using the handoff table in `driver-screen-spec.md` → autheon-fe Tailwind preset

## Key files

| File | Purpose |
|------|---------|
| `driver.jsx` | Driver PWA screens |
| `driver-ui.jsx` | Shared UI primitives (Sheet, Badge, EmptyState, etc.) |
| `formatters.js` | Intl date/time/money formatters |
| `styles.css` | Design tokens + component CSS |
| `admin.jsx` | Admin console reference |
| `store.js` | Demo data + PRD business rules (do not change for UI-only work) |
| `i18n.js` | EN/DE copy |
| `theme-editor.js` | Floating Theme Editor — movable overlay to edit theme colours (CSS vars) live; loaded by the prototype page and `/pwa/`, overrides persist in localStorage |
| `_export-driver-i18n.mjs` | Generates `docs/design/driver-i18n-index.md` |

## Reviewing the tour-document upload states

Uploading a tour document runs through two phases so the client can see what a
driver sees. Go to **My Jobs → a tour → My documents → Upload document → Other
proof** (any category that asks for no amounts), pick files, press Upload:

| To reach | Do this |
|---|---|
| Sending | Press Upload — a determinate bar fills and the action is **Cancel upload** |
| Processing | Wait for 100% — the bar is *replaced* by an indeterminate one and the action becomes **Close** |
| Success | Wait — the file leaves the list and the documents card confirms it |
| Cancel during sending | Press **Cancel upload** while the bar is still moving |
| Close during processing | Press **Close** during the processing phase — the document still lands |
| Timeout | Pick a file whose **name contains `slow`** (e.g. `slow-receipt.pdf`) — it stalls part-way, then reports a slow connection with a safe retry |

The `slow` file name is the only simulation lever, and deliberately not a control
in the driver's sheet — nothing on that screen should be something a driver will
never have. The phases are timers, not a transport layer. Idempotency,
persistence across reload and HEIC are **not** modelled; `driver.jsx` records why
next to the simulation.

## Validation

```bash
node project/_audit-prototype.mjs   # PRD + design contract
node project/_verify-seed.mjs         # Seed data integrity
node project/_export-driver-i18n.mjs      # writes docs/design/driver-i18n-index.md
```

## Authority

- **Behavior:** [`../docs/requirements/prd.json`](../docs/requirements/prd.json)
- **Partner/staff access (status consolidation):** [`../../tasks/status-consolidation-decision-brief.md`](../../tasks/status-consolidation-decision-brief.md) — binding; overrides Phase 8 status vocabulary in the admin requirements doc
- **Design:** [`../docs/design/brand-tokens.md`](../docs/design/brand-tokens.md), [`../docs/design/ui-ux-production-plan.md`](../docs/design/ui-ux-production-plan.md)
- **Terminology:** `project/DOMAIN.md`
- **DB draft:** [`../docs/database/schema.dbml`](../docs/database/schema.dbml), [`../docs/database/logical-model.md`](../docs/database/logical-model.md)

When the prototype and PRD differ, the PRD wins for behavior; the prototype wins for UI/UX presentation. For access axes (`operationalAccess` / `accountAccess` / `inviteState`), the decision brief wins over older Phase 8 wording.
