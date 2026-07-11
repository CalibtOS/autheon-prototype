# Driver PWA — Screenshot baseline

Capture these screens at **375px width** in light and dark themes for visual regression reference.

## How to capture

1. Serve the prototype: `npx serve` from the `Autheon` repo root
2. Open `http://localhost:3000/prototype/project/AUTHEON%20Prototype.html`
3. Switch Driver / Admin and Light / Dark via the top bar
4. Save PNGs as `{screen}-{theme}.png` in this folder

## Driver screens (9)

| File name | How to reach |
|-----------|--------------|
| `marketplace-light.png` | Driver → Marketplace tab |
| `marketplace-dark.png` | Same, dark theme |
| `myjobs-light.png` | My Jobs tab |
| `myjobs-dark.png` | Same, dark theme |
| `job-locked-light.png` | Marketplace → tap published job |
| `job-unlocked-light.png` | My Jobs → active job |
| `notifications-light.png` | Bell icon on Marketplace |
| `profile-light.png` | Profile tab |
| `infopoint-light.png` | Infopoint tab |

## Admin (brand pass)

| File name | How to reach |
|-----------|--------------|
| `admin-overview-light.png` | Admin → Jobs overview |
| `admin-overview-dark.png` | Same, dark theme |

Screenshots are optional for CI in the prototype repo; production autheon-fe should add Playwright visual diffs against these baselines.
