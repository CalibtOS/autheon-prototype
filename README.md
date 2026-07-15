# AUTHEON resources

This repository is the shared home for AUTHEON documentation, research, meeting material, and interactive prototypes.

## Repository map

| Location | Purpose |
| --- | --- |
| [`docs/product/`](docs/product/) | Current product brief. |
| [`docs/design-system.md`](docs/design-system.md) | Current visual and interaction system. |
| [`docs/database/`](docs/database/) | Production database design draft. |
| [`docs/requirements/`](docs/requirements/) | Canonical PRD, validation records, and change history. |
| [`docs/research/`](docs/research/) | Client-feedback analysis and supporting research. |
| [`meetings/source/`](meetings/source/) | Source meeting notes and transcripts. |
| [`prototype/`](prototype/) | Original design handoff and supporting files. |

## Start here

- [Current product brief](docs/product/current-product-brief.md)
- [Current sitemap](docs/product/sitemap.md)
- [Design system guide](docs/design-system.md)
- [Database design](docs/database/README.md)
- [Canonical PRD](docs/requirements/prd.json)
- [Prototype validation](docs/requirements/prd-prototype-validation.md)
- [Client-feedback comparison](docs/research/client-feedback-comparison.md)
- [Prototype export](prototype/project/AUTHEON%20Prototype.html)

The GitHub Pages entry point is [index.html](index.html).

Driver installable PWA: [`/pwa/`](pwa/) (manifest + service worker).

```bash
# Serve from this repo root (required for / and /pwa)
npm run serve
# http://localhost:3000/      → framed client preview
# http://localhost:3000/pwa/  → installable driver PWA
```
