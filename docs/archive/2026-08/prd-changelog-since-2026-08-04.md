# PRD changelog: 2026-08-04 (v2.31 → v2.32)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`

> **Scope of this file:** the **v2.32** entry. Baseline is **v2.31** (driver/user schema fix, 2026-08-01 — see [`../2026-07/prd-changelog-since-2026-07-30.md`](../2026-07/prd-changelog-since-2026-07-30.md)).

---

## PRD v2.32 — Type-aware notification design finalised: no categories, five-value ride preview, generic Marketplace push, origin-aware Back (2026-08-04)

**Baseline:** PRD v2.31
**Source:** work item ["Implement the Final Type-Aware Notification Design and Contextual Navigation"](https://absolutweb-team.monday.com/boards/18417529138/pulses/12649244379), refining **Task 20 — Driver Push Notifications & Admin Critical Alerts**.
**Deciding input:** the final confirmed Thursday meeting decision plus the reported notification back-navigation defect, both supplied in the work order. Six interpretation points were confirmed by the product owner before implementation (recorded in §8 below).

### Source precedence applied

| Rank | Source | Effect on this entry |
| --- | --- | --- |
| 1 | Final confirmed meeting decision | Authoritative. Drove every change below. |
| 2 | Reported back-navigation defect | Authoritative. Drove §5. |
| 3 | Monday work item | Consistent with 1 and 2. **Not read directly** — the `monday_com` MCP connector was unauthenticated in the implementation session; the work order text in the prompt was used instead. |
| 4–6 | `prd.json`, Context Pack, implementation and tests | Updated to match 1 and 2. |
| 7 | Older Figma comments and the original **v2.20** notification specification | **Historical.** Marked superseded where it conflicts; never silently merged. |

The v2.20 presentation rules are **not** deleted. `resolved_defaults.driver_notification_presentation_v1`
is retained verbatim behind a `SUPERSEDED 2026-08-04` prefix, and the four affected Task 20 acceptance
criteria keep their original sentences under a dated "supersedes the v2.20 wording" preamble. The new
rule set lives in `resolved_defaults.driver_notification_presentation_v2`.

---

### 1. Categories removed

| Concern | Before (v2.20) | After (v2.32) |
| --- | --- | --- |
| Card chip | Every card rendered a category chip: Order · Account · System · General information | **No chip.** The element is gone, not hidden |
| Taxonomy in code | `NOTIF_CATEGORY_*`, `NOTIF_CATEGORY_I18N`, `notificationCategory()`, `notificationCategoryI18nKey()`, `category` on every resolved target | **All deleted** |
| i18n | `notifCategoryOrder` / `Account` / `System` / `GeneralInfo`, EN + DE | **All four removed** |
| Category tabs / filtering | Not implemented | **Still not implemented**, and not introduced |
| Type-awareness | Category *and* interaction model derived from `notification_type` | **Interaction model only.** `notification_type` still decides expansion, destination, content and fallback |

No compatibility shim was kept, and none is needed: the taxonomy was **always derived at render time
and never stored**, so no persisted row carries a category that could go unlabelled. `.notification-row-cat`
was removed from `styles.css` too, so no empty container survives in the DOM and no accessible name
announces a removed category.

### 2. Ride expansion reduced to five values

The confirmed field set is the ride id, pickup city, delivery city, the full date and the application's
existing vehicle display name.

| Row | Before | After |
| --- | --- | --- |
| Ride id | Tour number + **status `Pill`** | Tour number alone |
| Pickup | `postalCode + city`, plus a muted sub-line with the date and time window | **City only** |
| Delivery | Same as pickup | **City only** |
| Date | Per-leg schedule inside each stop's sub-line | **One row.** Full date `DD.MM.YYYY` via the shared `formatDate`, taken from the **pickup** date |
| Vehicle | `vehicleType · manufacturer · model`, plus a sub-line with transport type + registration status | **The app's existing vehicle display name** |
| Licence plate | A whole row, rendered whenever the driver was committed | **Removed** |
| Protected-data hint | `notifPreviewProtectedHint` on a restricted card | **Removed** |

**The vehicle name was the subtle problem.** v2.20 invented a notification-only format
(`type · manufacturer · model`) that existed nowhere else in the product, so the same vehicle read one
way on a Marketplace card and another way in a notification. The requirement was to reuse the
*existing* display name, so the composition already used by `JobCardBody` — shared by the Marketplace
card and the My Jobs card — was extracted into `AuthStore.vehicleDisplayName()` and both call sites now
go through it. Output is unchanged for the cards; the notification simply stopped having its own format.

**Removal happened at the data layer, not in the view.** `store.driverNotificationJobPreview()` now
returns exactly `{ jobId, tour, pickupCity, deliveryCity, date, vehicleName }`. Previously it returned
postal codes, per-leg date/window fields, `distanceKm`, `startPlz`/`endPlz`, `vehicleType`,
`manufacturer`, `vehicleModel`, `transportType`, `registrationStatus`, `status`, `displayStatus`, a
`restricted` flag, and — once the driver was committed — `customerName`, `plate` and `vin`. None of
those reach the component now, so no styling or markup mistake can leak them and no future edit can
re-add a field by rendering it.

**One consequence worth stating.** The projection is now **identical before and after acceptance**.
That is why `notifPreviewProtectedHint` had to go rather than merely being hidden: "customer, full
addresses and licence plate become visible after you accept" had become **false**, because nothing in
this preview is revealed on commitment any more. `driver_visibility_matrix` is unchanged and remains
authoritative for every other surface.

### 3. Generic Marketplace push

| Concern | Before | After |
| --- | --- | --- |
| Push copy | `notifNewPublishedJobBody` — *"{from} → {to} is now available on the marketplace."* — served as **both** the in-app body and the simulated push | **Split.** The in-app card keeps that copy; the push is generic |
| Generic copy | — | `pushNewOrdersTitle` / `pushNewOrdersBody` — *"New orders are available."* / *"Neue Aufträge sind verfügbar."*, **uninterpolated** |
| Payload | No push payload object existed; `maybeNotifyPublishedJob` wrote the in-app row and logged `push_notification_simulated` | New `store.driverPushProjection()` returns `{ title, body, destination, generic }` |
| Tap destination | Notification Center **with that card already expanded** | **The Marketplace**, current availability |
| Stale order | Card stated the reason and offered *View more orders* | Order simply is not listed; **empty Marketplace is a correct outcome** |

**Why a payload builder rather than just shorter copy.** "The push contains no job count, no vehicle,
no route, no price and no ride id" is only enforceable if there is an object to inspect. The projection
for a Marketplace-availability event has **no field capable of carrying** any of them — not even the
triggering notification id — so the rule is a property of the payload rather than a convention of the
copy, and it is asserted as absence-from-the-payload in the tests. It also removes the mechanism by
which a push could go stale: a message that named no order cannot make a claim about one.

`maybeNotifyPublishedJob` now routes its simulated send through the projection, so the audit meta
records the *generic* body. The audit entry still names the triggering tour in its entity column —
that is admin-facing internal traceability (Task 20: "notification sending is logged or traceable"),
not push content.

**Eligibility is untouched.** Driver push enabled + newly-published toggle + postal-area match still
gates both the push and the in-app row, for exactly the same set of drivers as before.

### 4. Contextual deep links, including profile events

| Event | Before | After |
| --- | --- | --- |
| Marketplace ride | Expand → *View order* → Marketplace preview | Unchanged in-app; **push** now opens the Marketplace |
| `job_assigned` | ⚠ **`plain`** — no expansion, no deep link | **Ride type.** Expands; opens the assigned ride's full detail (fallback My Jobs) |
| `order_updated`, `cancelled_by_autheon`, empty-run outcomes | Ride | Unchanged (fallback My Jobs, not the Marketplace) |
| `document_accepted` / `document_rejected` | Deep link to the document | Unchanged |
| `document_correction_required` | ⚠ **`plain`**, and **hardcoded English** copy | **Document type**, carries its `documentId`, copy moved to EN + DE i18n |
| `infopoint_news` | Deep link to the message | Unchanged destination, **new** origin-aware Back |
| `master_data_change_sent` / `_approved` / `_rejected` | ⚠ **`plain`** — informational dead end | Deep link to the Profile **Basic data** subpage |
| `email_changed` | ⚠ **`plain`** | Deep link to the Profile **landing page** |
| probation | **No event exists** | **Still none.** Recorded as a gap, not invented |

`email_changed` routes to the landing page because that is where the Account group and the sign-in
email row actually live; no Account & sign-in subpage exists, and inventing one for this task was
explicitly out of scope. Destinations are stable route keys (`masterData`, `""`), never localized
labels — and `""` is a real value, so target availability is decided by the driver session existing
rather than by the key being truthy.

Two latent defects surfaced while building the map: `job_assigned` and `document_correction_required`
were **absent from the notification-type registry** and silently degraded to untyped informational
cards. A driver could not open an assigned ride from its own notification, and a correction-required
notice did not link to the file the driver had to replace. Both are fixed; **no channel boolean
changed** (`job_assigned` remains `driver_in_app: true`, `driver_push: false`).

### 5. Origin-aware Back — the reported defect

**Reported:** following a notification deep link and pressing Back should return to the menu page the
Notification Center was opened from. It worked for rides and not for Infopoint messages.

**Why rides worked:** the pane called `handleOpenJob(job, mode)` and `fromTab` defaulted to the current
tab, so the origin was captured *incidentally* and `back()` restored it.

**Why messages failed:** `onOpenNews` did only `setDeepLinkNewsId(newsId); setTab("info")` — the origin
was discarded — and `InfopointMessageDetail`'s Back was hardwired to `setDetailNewsId(null)`, which
always lands on the Infopoint list. Profile events failed more completely: they had no destination at all.

**Fix.** Each shell holds `notifOrigin`, set to the current tab when the bell is tapped, and passes it
through every notification navigation. `Infopoint` and `ProfilePaneFull` each track whether **the
currently open** detail/subpage is the deep-linked one; that flag — not the screen — decides the parent.

| Journey | Back destination |
| --- | --- |
| Marketplace / My Jobs / Infopoint / Profile → NC → Infopoint message | the originating menu page |
| Marketplace / My Jobs / Infopoint → NC → Profile subpage | the originating menu page |
| Infopoint / Profile / My Jobs → NC → document | the originating menu page |
| Profile / Infopoint / Marketplace → NC → ride detail | the originating menu page |
| Infopoint list → message | **the Infopoint list** (unchanged) |
| My Jobs → ride detail | **My Jobs** (unchanged) |
| Profile → subpage | **the Profile landing page** (unchanged) |

Binding the origin to one *opening* rather than to a screen is what keeps ordinary navigation intact:
without a `returnTab`, every target keeps the parent it always had. The origin is **consumed on use**,
cleared when the pane closes without navigating, and cleared by any deliberate tab navigation, so no
later journey inherits a stale one.

**Data model:** the origin is transient shell state. It is **not** persisted and **not** written to
`user_notifications`, per the work order's explicit instruction.

**Push launches fabricate no origin.** Each target inherits its own parent screen — ride and document →
My Jobs, message → Infopoint, profile → Profile, Marketplace availability → the Marketplace root — and
an unresolvable id opens the Notification Center over the safe root.

**Browser/app Back is deliberately not wired** (confirmed decision 6). The driver shells have no
`pushState` history for their own screens; only the admin app does. The **visible** Back control is the
Back they support and the one made origin-aware. Recorded as a separate open implementation item: if
the driver shells gain a history stack, the origin must move into history state so a `popstate` Back
honours it too.

### 6. Removed: the dedicated unavailable-order presentation

v2.20 required an unavailable Marketplace card to state its reason, drop *View order*, and offer
*View more orders*. The reason line **stays** — a dead card that says nothing is worse than one that
explains itself. The *View more orders* action and its i18n key are **gone**: a dead-end card must not
grow a second journey out of it, and reaching current work belongs to push/deep-link resolution falling
back to the Marketplace. No dedicated "no longer available" screen was created, and no stale acceptance
path survives — the action only renders from a freshly resolved, still-`published` target.

### 7. Safe target resolution

`store.resolveDriverNotificationTarget()` remains the single navigation authority for both the list and
push taps, so neither can reach a screen the other would refuse. One hardening was added: a value that
is **neither a string nor a notification row** (a number, an array, a stray URL fragment) was previously
waved through as if it were a row and reported `ok: true` for a target that does not exist. A
`findDriverNotification()` type guard now rejects it, so a malformed deep-link id fails safe like every
other bad target.

Covered and verified: missing, deleted, expired, withdrawn, cancelled, already-booked, unauthorized and
malformed targets, plus legacy rows with no target metadata, across PWA-closed, PWA-open and
backgrounded launches. Never a blank screen, never a crash, never unauthorized data, never an invalid
acceptance attempt. An unauthorized document target also **withholds the document id**, so a caller
cannot navigate with it by ignoring `available`.

### 8. Confirmed interpretation points

| # | Question | Decision |
| --- | --- | --- |
| 1 | `email_changed` destination, given no Account & sign-in subpage exists | Profile **landing page**, recorded as a confirmed mapping based on the current information architecture |
| 2 | Status pill in the ride expansion | **Remove.** Five values only |
| 3 | Which date is "the full date" | The **pickup** date, `DD.MM.YYYY`, via the existing `formatDate` |
| 4 | In-app Marketplace body vs push copy | **Split.** Push generic; the in-app card keeps city → city |
| 5 | Seeded `job_assigned` row | **Approved** as demo data only; adds no event, channel or eligibility rule |
| 6 | Browser Back | Implement origin-aware **visible** Back; no `pushState` architecture in this task |

### 9. Data-model impact

**None.** No new field, no new column, no migration, and no category field anywhere. The existing row
already carried every stable reference the design needs (`type`, `jobId`, `newsId`, `documentId`,
`driverId`, `read`, `createdAt`). Profile destinations are derived from `notification_type`, not stored.
The navigation origin is transient client state.

### 10. Explicitly unchanged

`notification_channels_matrix` booleans (two rows gained explanatory notes only) · push eligibility ·
the postal-prefix matching rule · Marketplace push opt-in · load-on-open and pull-to-refresh
synchronisation · direct-assignment rules, which still generate **no** Marketplace-style push · admin
critical-email behaviour · read/unread and `Mark all read` · date grouping · the two-line clamp · pane
close behaviour · notification preferences · `driver_visibility_matrix` · content-access auditing —
**opening a notification is still not audited**, and opening the destination content still writes its
existing `news_item_viewed` / `tour_document_viewed` entry. No driver workflow email was introduced. No
probation notification event was added.

### 11. Test coverage

60 new tests in `tests/e2e/driver-notifications/`, all passing, plus a shared
`tests/regression/support/helpers/notifications.ts`:

| Spec | Covers |
| --- | --- |
| `cards-and-expansion.spec.ts` | No chip, no tabs, no empty container; heading / two-line clamp / date-time / unread; date grouping; Mark all read; close; inline ride expansion; the five values; absence of every excluded value **in the rendered panel and in the projection**, committed and uncommitted; no accordion on non-ride cards; unavailable card has no action; no bottom sheet |
| `deep-links.spec.ts` | Message, document, profile, assigned-ride and Marketplace-ride destinations; resolution survives scrambling every title, body and tour number; missing / malformed / unauthorized / legacy targets; notification-open writes no audit event while the destination content still does |
| `origin-aware-back.spec.ts` | All four origins × message; three origins × Profile subpage; three × document; three × ride; the three ordinary-navigation regressions; consumed-origin, closed-pane and repeated-journey isolation |
| `marketplace-push.spec.ts` | Generic payload with no count / vehicle / route / price / job id and no field able to carry them; DE copy; identical payload for a vanished order; tap opens the Marketplace cold, open and backgrounded; booked-away order and empty Marketplace; other push destinations; per-driver push-toggle and postal-prefix gating; direct assignment emits no availability push |

The suite drives the rendered UI rather than asserting on store output alone, per the work order's
requirement that store-level target resolution is not proof of rendered navigation behaviour.

### 12. Remaining open questions

- **Driver-shell browser-history wiring** — out of scope here; hardware Back still exits the app.
- Whether production introduces a dedicated **Account & sign-in** subpage, which would then become the
  `email_changed` destination.
- Approved **card visuals** for the chip-free card (the layout is the existing one minus the chip).
- Whether **profile-approval** or **document-acceptance** events should gain push.
- **No probation notification event exists** anywhere — adding triggers or channels needs separate approval.
- Production notification-type registries should **fail loudly** on an unregistered type rather than
  degrading to an untyped card, which is how the `job_assigned` and `document_correction_required`
  defects stayed invisible.
- Push **delivery** remains simulated; production still needs a real FCM/APNs transport wired to the
  existing matrix triggers, with `?notify=<id>` as the documented `notificationclick` seam.
