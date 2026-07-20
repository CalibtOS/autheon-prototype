# PRD changelog: 2026-07-20 (v2.2 → v2.4)

> Historical snapshot for decision traceability. Use [`../../requirements/prd.json`](../../requirements/prd.json) for the current specification.

**Canonical file:** `docs/requirements/prd.json`
**Baseline:** PRD v2.1 (2026-07-14)
**Source:** Work order 2026-07-20 (three-task session) — prototype UI/UX + requirements updates.

This session delivers three tasks, each with its own version bump:

- **T3 → v2.2** — Sticky sidebars on the Admin Create/Edit Job page.
- **T1 → v2.3** — Driver self-service email change (Account & sign-in card).
- **T2 → v2.4** — Order cancellation & empty-run workflow.

Scope note: the deliverable is an updated **clickable prototype** plus updated **requirements docs**. Backend behaviour (persistence, real push, permissions, admin review side-effects) is **simulated** in the prototype via existing mocks and captured here as requirements for the dev team; it is not a production backend implementation.

---

## T3 — Sticky Create/Edit Job sidebars [v2.2]

**Requirement (prd.json `tasks[id=5]` "Job Creation", new acceptance criterion).**

On the Admin **Create Job** / **Edit Draft** page the central form is the primary scroll area, and the two supporting sidebars stay visible while it scrolls:

- Left **form-section navigation** (TOC) is sticky.
- Right **live-summary** sidebar is sticky and keeps updating while sticky.
- Both sidebars start below the app header/top bar and never overlap the header, footer, form, or each other.
- If a sidebar is taller than the available viewport space it scrolls independently instead of overlapping the footer.
- Sticky behaviour applies **only** where there is room for three columns. Below the breakpoint (≤1200px effective width) the layout stacks to a single column and the sidebars return to normal, non-sticky flow. Tablet/mobile are reviewed separately and are not forced into the desktop sticky layout.
- No configuration introduces a horizontal scrollbar.

**Root-cause fix captured as a requirement:** the app shell must be a **fixed-height** container (`100dvh`) whose admin content region (`.admin-content`) scrolls **internally**, rather than a `min-height` shell that grows to content height and scrolls the whole document. The previous `min-height:100vh` shell caused the document to scroll, so the header, nav, top bar, footer, **and** the (already `position:sticky`) sidebars all scrolled out of view because their sticky scroll-context never scrolled. With the fixed shell the header, admin nav, top bar, and action footer stay fixed and only the content scrolls — the intended app-shell behaviour (the driver phone-shell was already sized to `100vh`).

### Prototype changes (T3)

- `prototype/project/styles.css`
  - `.app` — `min-height:100vh` → `height:100dvh; overflow:hidden` (fixed-height shell).
  - `.admin` — added `grid-template-rows: minmax(0,1fr); min-height:0` so `.admin-main`/`.admin-content` inherit a bounded height and scroll internally.
  - `.admin-nav` — added `min-height:0; overflow-y:auto` so a tall nav scrolls instead of clipping.
  - `.grid-form-layout > aside` — sticky, `max-height: calc(100dvh - 172px)`, `overflow-y:auto`, `overscroll-behavior:contain`; new `@media (max-width:1200px)` collapses to one column and drops sticky.
- `prototype/project/admin.jsx` — removed the inline `position:sticky; top:0` from both `NewOrder` sidebars so the stylesheet (including the responsive fallback) controls positioning.

### Validation (T3)

Playwright across widths: desktop 1440 (both sidebars stay pinned while form scrolls, document does not scroll, header fixed), 1100 (single-column, non-sticky, no horizontal scroll), 390 (single-column, no horizontal scroll — also fixes a pre-existing mobile horizontal scroll), admin overview and driver views unaffected, **no console errors**.

## Version bump

- `version`: **v2.1 → v2.2** — sticky Create/Edit Job sidebars + fixed-height app shell (2026-07-20).

## Related files (T3)

- `docs/requirements/prd.json` — `tasks[id=5]` acceptance criterion + `version`.
- `prototype/project/styles.css`, `prototype/project/admin.jsx` — implementation.

---

## T1 — Driver self-service email change [v2.3]

**Requirement (prd.json `tasks[id=19]` "Driver Profile & Notification Settings", new acceptance criteria + `important_notes`).**

Email is the driver's own sign-in credential, so routing changes through the ops master-data approval loop was slow, the wrong ownership, and a security risk. Email now leaves ops-managed master data and lives in a driver-owned **"Account & sign-in"** card, changed **self-serve with no operations approval** and gated by a **6-digit code sent to the new address** (verify, don't approve).

Behaviour:

- **Separate ownership** — master data (ops-owned) keeps Company, Address, Phone, Status. Email is removed from the master-data change-request scope entirely.
- **Its own home** — a new "Account & sign-in" card sits directly under the identity block, showing the email, a **Verified** indicator, and a **Change** action.
- **Verify, don't approve** — a single sheet advances *enter new address → confirm with code → updated*. The system sends a 6-digit code to the **new** address; the address only becomes active after the correct code is entered. The **old address stays live** until confirmed.
- **Fail-safe** — wrong/expired codes error inline and never change the address; the new address must be a valid, non-duplicate email different from the current one; the code can be **resent** (throttled, 30s in the prototype); once the change succeeds the **old inbox is notified** with a security message. A pending change is shown on the card and never blocks sign-in with the current address.
- **State & audit** — verification state tracked (verified/unverified; at most one pending change per account); both `driver_email_change_requested` and `driver_email_changed` are written to the audit log.

Matches the approved design handoff `Email UX Consultation.html` (layout, "Account & sign-in" card, four-step sheet).

### Data model (T1)

- `docs/database/schema.dbml`:
  - New `email_change_requests` table + `email_change_status` enum (`pending | confirmed | expired | cancelled`). Stores a **hash** of the code (never plaintext), `current_email`, `new_email`, `attempts`, `resend_count`, `expires_at`, `confirmed_at`. At most one pending request per user (partial unique index, documented in logical-model.md).
  - `master_data_change_type.contact` annotated: email is **not** master data.
  - `users.email` (existing) is changed only via a confirmed `email_change_request`; `users.email_verified` (existing) is set on confirm.
- `docs/database/logical-model.md` — "Driver self-service email change" section (constraints DBML can't express).

### Prototype changes (T1)

- `prototype/project/i18n.js` — EN + DE strings for the Account & sign-in card, the change-email sheet (all four states), inline errors, the old-inbox notification, and a prototype demo hint that surfaces the mock code.
- `prototype/project/store.js` — driver seed gains `emailVerified` / `pendingEmailChange`; new mocked API `getDriverEmailChange`, `startDriverEmailChange`, `resendDriverEmailCode`, `confirmDriverEmailChange`, `cancelDriverEmailChange`; `requestMasterDataChange` no longer accepts/validates email (email preserved unchanged); audit + old-inbox notification on confirm.
- `prototype/project/driver.jsx` — email removed from `PROFILE_MDR_FIELDS`; new `Account & sign-in` card in `ProfilePaneFull`; new `ChangeEmailSheet` + `CodeInput` (6-box auto-advance, paste, resend countdown).
- `prototype/project/admin.jsx` — `MASTER_DATA_CHANGE_FIELDS` no longer lists email (ops review never shows email as a change field).
- `prototype/project/styles.css` — Account & sign-in card, verified badge, and code-input styling.

### Validation (T1)

Playwright: Account & sign-in card renders under identity; email absent from the master-data card; invalid-email, same-email, wrong-code, and expired-code all error inline; valid change sends a code, confirming it updates the displayed address; DE locale renders the sheet strings; **no console errors**.

## Version bump

- `version`: **v2.2 → v2.3** — driver self-service email change (2026-07-20).

## Open item (T1)

- The change-email code is delivered to a real inbox in production; the prototype surfaces the mock code inline as a demo affordance. Real delivery, code hashing, expiry/attempt/resend throttling, and persistence are captured as requirements (schema + logical-model) for the dev team.
