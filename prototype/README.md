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

In the client preview header use **Open driver PWA**. On `/pwa/` use **Install app** (Chrome/Edge) or **Add to Home Screen** (iOS). **Framed preview** returns to `/`. After install, the app launches standalone without the install chrome.

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
| `_export-driver-i18n.mjs` | Generates `docs/design/driver-i18n-index.md` |

## Validation

```bash
node project/_audit-prototype.mjs   # PRD + design contract
node project/_verify-seed.mjs         # Seed data integrity
node project/_export-driver-i18n.mjs      # writes docs/design/driver-i18n-index.md
```

## Authority

- **Behavior:** [`../docs/requirements/prd.json`](../docs/requirements/prd.json)
- **Design:** [`../docs/design/brand-tokens.md`](../docs/design/brand-tokens.md), [`../docs/design/ui-ux-production-plan.md`](../docs/design/ui-ux-production-plan.md)
- **Terminology:** `project/DOMAIN.md`

When the prototype and PRD differ, the PRD wins for behavior; the prototype wins for UI/UX presentation.
