# AUTHEON Prototype Testing Mental Model

## App summary

AUTHEON is currently a static frontend prototype, not a production app. The repository root `index.html` renders a full-page iframe titled `AUTHEON Prototype`, which loads `AUTHEON/autheon-extracted/autheon/project/AUTHEON Prototype.html`.

Inside the iframe, the app is a React 18 UMD/Babel prototype. There is no bundler, no server-side rendering, no route file system, and no real authentication layer. The prototype loads:

- `feature-flags.js`
- `i18n.js`
- `inputFormatters.js`
- `store.js`
- `driver.jsx`
- `admin.jsx`
- `styles.css`

The single source of truth for product state is `window.AuthStore` in `store.js`. It seeds jobs, drivers, ordering parties, addresses, documents, finance data, audit logs, notifications, feature flags, and profile change requests. Driver and Admin surfaces share this store in the same browser runtime.

There was no package manifest, lockfile, existing test tooling, environment file, or CI workflow in this repository before the Playwright foundation was added. The new local dev command serves the static repository root on `http://127.0.0.1:4173`.

## Role/app surfaces

The top shell header switches between two product surfaces:

- Driver PWA: mobile phone preview for service partners.
- Admin Backend: desktop operations console for dispatch/admin workflows.

The default surface is Driver PWA. Switching surfaces does not change the URL. It updates React state inside `App`.

There is no real auth yet. The prototype assumes:

- Demo driver: `Jordan Blake`
- Demo admin: `Anna Bauer`

The current driver is read from the seeded driver list by matching `Jordan Blake`.

## Route/screen map

There is no route-based navigation. All screens are state-driven inside the iframe.

Root:

- `/` loads `index.html`
- `index.html` embeds `AUTHEON Prototype.html`

Driver PWA screens:

- Marketplace: default tab, lists jobs with `status === "published"`.
- My jobs: lists jobs related to the demo driver, including assigned, accepted, performed, cancelled, and special-case jobs.
- Infopoint: shows general documents and published admin news.
- Profile: shows the demo driver profile and lets the driver submit profile change requests.
- Job locked detail: shown for published marketplace jobs before acceptance.
- Job unlocked detail: shown for assigned/accepted/performed driver jobs.
- Filter sheet: filters marketplace jobs.
- Acceptance modal: binding acceptance flow for published jobs.
- Report problem sheet: cancellation or not-performable special-case workflow.
- Notifications pane: driver notification list.

Admin Backend screens:

- Jobs overview: default admin section with status stats, quick filters, search, density toggle, and jobs table.
- Job detail: route, vehicle, contacts, PDF, notes, finance/tour document summary, assigned driver, metadata, and status history.
- New job/Edit draft: stateful form for creating or editing draft jobs.
- Notification feed: admin email/notification queue.
- Profile change requests: admin review queue for driver master-data changes.
- Users: driver/admin management.
- Customers: ordering parties.
- Addresses: address master data.
- Infopoint: publish documents and news for drivers.
- Tour documents: uploaded tour document review and billing-related document state.
- Finance: gated by `financeModule` feature flag.
- Audit log: store activity log.
- Settings: feature flags and branding controls.

## Header controls map

The shell header is inside the iframe and is rendered by `App` in `AUTHEON Prototype.html`.

Controls:

- Surface switcher:
  - English Driver control: `Driver PWA`
  - German Driver control: `Fahrer App`
  - Admin control: `Admin Backend`
- Language switcher:
  - `EN`
  - `DE`
- Theme switcher:
  - English: `Light`, `Dark`
  - German: `Hell`, `Dunkel`

Persistence:

- Locale is stored in `localStorage` key `autheon-locale`.
- Theme is stored in `localStorage` key `autheon-theme`.
- The iframe document root receives `lang` and `data-theme` attributes.

## Main flows discovered

Driver flows:

- Browse published marketplace jobs.
- Filter marketplace jobs.
- Open a published job in locked preview mode.
- Accept a published job, which changes it to accepted, assigns it to `Jordan Blake`, and queues admin notification evidence.
- View assigned/accepted jobs in My jobs.
- Mark assigned/accepted jobs as performed.
- Report a problem as cancellation or special case.
- Upload tour documents after a tour is performed.
- Read Infopoint documents and news.
- Submit a driver profile change request.

Admin flows:

- Inspect job overview and status counts.
- Open a job from the overview table.
- Publish a draft job to the marketplace.
- Assign a draft job directly to a driver.
- Reassign assigned/accepted/special-case jobs.
- Revert a published job to draft.
- Cancel active jobs.
- Create a new draft job and optionally publish or assign it.
- Manage users, customers, addresses, documents, Infopoint news, tour documents, finance, audit log, settings, and feature flags.
- Review profile change requests submitted from Driver PWA.

## Admin -> DriverPWA interaction assumptions

Confirmed shared-state interaction:

- Admin publishing draft tour `0839-26` changes its status from `draft` to `published`.
- Driver PWA marketplace reads `store.getJobs().filter((j) => j.status === "published")`.
- After publishing `0839-26`, Driver PWA should show the Berlin -> Stuttgart marketplace card. The locked Driver marketplace preview intentionally omits the tour number, so the test asserts the visible route, distance, and Accept tour action.

Other likely cross-surface interactions to automate later:

- Admin direct assignment of draft tour `0839-26` should make it appear in Driver PWA My jobs.
- Driver accepting a published job should update Admin job status and notification feed.
- Driver reporting a special case should update Admin special-case handling and notification feed.
- Admin publishing Infopoint news should make it visible in Driver PWA Infopoint.
- Driver profile change request should appear in Admin profile change requests.

## Testing strategy for this prototype

This foundation deliberately starts small:

- Smoke tests verify the static app loads, the iframe shell renders, and the header controls work.
- The first E2E flow proves one real cross-surface state transition: Admin publishes a draft job, Driver sees and opens it.
- Regression tests focus on stable shell signals:
  - one visual baseline of the default Driver PWA shell
  - ARIA snapshots for the shell header and Driver tabbar
  - structural assertions across role, language, and theme combinations
- Console errors and page exceptions are collected for every test and attached on failure.
- Raw HTML and screenshots are attached as failure evidence, but raw DOM is not used as the main regression signal.

No auth setup project or storage state is created because the prototype does not have real authentication.

## First test candidates

Implemented first:

- Smoke: app loads and shell controls exist.
- Smoke: role, language, and theme switching leaves the app usable.
- E2E: Admin publishes draft tour `0839-26`; Driver PWA marketplace reflects it.
- Regression: default shell visual snapshot.
- Regression: header/tabbar ARIA snapshots.
- Regression: Driver/Admin x EN/DE x light/dark structural shell checks.

Good next candidates:

- Admin assigns a draft tour to `Jordan Blake`; Driver My jobs shows it.
- Driver accepts published tour `0847-26`; Admin overview shows accepted status and notification feed updates.
- Driver reports a special case; Admin detail exposes resolution controls.
- Admin publishes Infopoint news; Driver Infopoint shows the message.
- Driver submits a profile change request; Admin profile change requests shows it.

## Selector strategy

Preferred selectors:

1. `getByRole` for buttons, headings, banner, main, dialogs, and tabs where available.
2. `getByLabel` for form fields with labels.
3. `getByText` for stable prototype labels, tour numbers, and seeded city names.
4. `getByTestId` only if the UI lacks a stable accessible selector and text is unsafe.
5. Scoped locators for stable shell structures such as the iframe, header switcher groups, phone shell, admin shell, and tabbar.

Current stable selectors:

- Iframe: `iframe[title="AUTHEON Prototype"]`
- Header: role `banner` inside the iframe.
- Main content: role `main` inside the iframe.
- Surface controls: Driver PWA/Fahrer App and Admin Backend buttons.
- Language controls: EN and DE buttons scoped to `.locale-switch`.
- Theme controls: Light/Hell and Dark/Dunkel buttons scoped to `.theme-switch`.
- Driver surface: `.phone-shell` plus Marketplace/Marktplatz heading.
- Admin surface: `.admin` plus Job overview/Auftragsubersicht heading.
- E2E flow seed: tour `0839-26` and route Berlin -> Stuttgart.

Weak selectors and accessibility gaps:

- Driver job cards are clickable `div` elements, not buttons or links.
- Admin overview table rows are clickable `tr` elements, not buttons or links.
- Several icon-only buttons rely on `title` but not explicit `aria-label`.
- Some form labels are visual labels without `htmlFor`, making `getByLabel` incomplete.

No data-testid attributes were added in the first pass because the required flows can be tested with existing stable text and scoped locators. Adding semantic roles to clickable cards/rows would be a good future improvement.

## Risks and unknowns

- The app depends on CDN-hosted React, ReactDOM, Babel, and Google fonts. Offline CI would fail unless these assets are vendored or the CI environment has outbound access.
- The root app is inside an iframe, so all app locators must target the frame.
- There is no URL routing, so tests must assert visible state rather than route changes.
- Locale and theme persist in localStorage, but Playwright creates a fresh browser context per test by default.
- The Driver marketplace header includes the current date. Visual regression masks the dynamic open-tours/date line.
- The prototype uses seeded in-memory data. State resets on page reload and is not shared across tests.
- Some state transitions are intentionally demo-only and do not represent production persistence or authorization.
- German labels can change selector names for role and theme controls.
- Admin and Driver share one runtime store; this is useful for prototype E2E but different from a future multi-session production app.

## Recommended future test expansion

1. Add semantic roles or test IDs to clickable job cards and admin table rows.
2. Add a second E2E flow for direct assignment from Admin to Driver My jobs.
3. Add a Driver accept-flow E2E that verifies Admin notification feed updates.
4. Add a Driver report-problem flow and Admin special-case resolution check.
5. Add Infopoint publish/read regression across EN and DE.
6. Add profile change request E2E from Driver profile to Admin review.
7. Add targeted form validation tests for New job, especially date/time and required fields.
8. Add accessibility checks after improving semantics, instead of relying only on ARIA snapshots.
9. Add scoped normalized network evidence only if external assets/API behavior becomes important.
10. Introduce auth setup only after a real authentication layer exists.
