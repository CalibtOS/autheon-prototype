# ADR-0001 — Driver access is two independent binary axes

- **Status:** Accepted
- **Date:** 2026-08-06
- **Scope:** `autheon-be`, `autheon-fe`, `Autheon/prototype`, `Autheon/docs`
- **Source of authority:** client resolution, recorded in `tasks/status-consolidation-decision-brief.md`
- **PRD:** v2.33

## Context

Driver access was modelled as two multi-valued enums that had drifted apart from what the product
actually needed.

`DriverStatus = active | blocked | inactive` expressed marketplace eligibility, plus two legacy
prototype-only values (`archived`, `soft_deleted`) that were removed from the production enum on
2026-07-31 but still appear in written specs and test coverage maps today.

`UserStatus = pending_verification | active | suspended | inactive | invite_failed` conflated three
unrelated facts in one field: whether the identity may log in, where an invitation is in its
lifecycle, and whether the invitation email bounced.

Two consequences followed.

First, the multi-valued operational enum existed to express _how_ a driver lost access, but the only
thing any guard ever asked was _whether_ they had it. `ACCESS_RESTRICTING_DRIVER_STATUSES =
[BLOCKED, INACTIVE]` and `ASSIGNMENT_ELIGIBLE = [ACTIVE]` are the complete set of questions the
system asks — both are binary partitions of a five-value space. The extra values bought no
behaviour and cost a guard, a filter facet, a badge, and a test row in each of three codebases.
Worse, the two values were not behaviourally identical: `blocked` was lenient (upload on assigned
tours permitted) while `inactive` was strict, which meant the automated inactivity sweep could
strand a partner mid-tour.

Second, the client was asked (OQ-6, meeting 2026-06-29) whether blocking needed to be granular —
marketplace blocked while document correction stayed open. The backend shipped granular blocking as
the PRD default pending confirmation. The client has now answered: granular blocking is **not**
required. What is required is an **audit entry** for every access change and an **admin dashboard
notification** when one happens. The client explicitly does **not** need the driver management
overview to reveal how a driver arrived at the disabled state.

Two decisions on record run contrary to this and are superseded here:
`Autheon/docs/requirements/admin-client-requirements-status.md` Phase 8 row 8, and
`tasks/admin-prototype-client-change-plan.md:169`.

## Decision

Driver access is modelled as **two independent binary axes**, plus one supporting non-status field.

    OperationalAccess = enabled | disabled     // marketplace visibility, assignability, job acceptance
    AccountAccess     = enabled | disabled     // login
    InviteState       = pending | failed | accepted   // NOT a status

**D1 — `disabled` is lenient.** A driver whose operational access is disabled cannot see or accept
marketplace jobs, cannot be direct-assigned or reassigned, and cannot accept new jobs by any path.
They **can** continue and complete already-assigned tours and **can** upload documents on those
tours. This preserves today's `blocked` semantics, keeps `canUploadOnAssignedTours` /
`canPerformAssignedTours` meaningful, and keeps the `DriverHasActiveJobsException` (409) guard
meaningful. Disabling must never strand an in-flight tour.

**D2 — invite lifecycle is its own field.** `AccountAccess` is strictly binary. `InviteState` is
never rendered as a status pill and is never a filter facet. Its only jobs are to gate the _Resend
access_ affordance (`inviteState !== 'accepted'`) and to preserve the bounced-invite signal
previously carried by `invite_failed`. It is orthogonal to `AccountAccess`.

**D3 — every access change notifies and audits, on both axes.** Admin enable/disable on either
axis, and the automated inactivity sweep, each produce an admin notification, a driver notification,
and an audit entry. Invite resend and invite failure remain audit-only, unchanged. The notification
payload carries driver identity, which axis changed, the new value, the actor (admin name, or
`System`), and the provenance where one exists (`deactivationReason`). This is a genuine expansion:
previously only the sweep notified admins. New notification-registry entries are required.

**D4 — the overview simplifies.** Two columns (Operational access, Account access), each a binary
enabled/disabled pill. The "Auto" inactivity sub-badge is removed from the overview list. Each
filter dropdown collapses to All / Enabled / Disabled.

**D5 — one column per axis, no migration.** Each axis keeps a single column; no parallel or shadow
columns are introduced. The project is pre-launch, so the new vocabulary arrives by wiping the database,
letting `synchronize: true` build the schema, and re-seeding — there is no data migration of any kind.
Unknown or unrecognised values resolve to `disabled`, inverting today's fail-open default; that is
retained as defensive coding rather than as rollout protection.

**Value mapping**

| Legacy operational value | New        | Legacy account value   | New AccountAccess | New InviteState |
| ------------------------ | ---------- | ---------------------- | ----------------- | --------------- |
| `active`                 | `enabled`  | `pending_verification` | `disabled`        | `pending`       |
| `blocked`                | `disabled` | `active`               | `enabled`         | `accepted`      |
| `inactive`               | `disabled` | `suspended`            | `disabled`        | `accepted`      |
| `archived` (legacy)      | `disabled` | `inactive`             | `disabled`        | `accepted`      |
| `soft_deleted` (legacy)  | `disabled` | `invite_failed`        | `disabled`        | `failed`        |

**D6 — the automatic inactivity run removes ACCOUNT access, with operational access as a fallback.**
This is the most consequential clause in this ADR, because it reverses a behaviour that the existing
documentation states explicitly and correctly for the pre-2026-08-06 system.

Until now the nightly inactivity sweep disabled a dormant partner on the **operational** axis only,
and `logical-model.md`, `prd.json` → `driver_inactivity_auto_deactivation_v1`, and the v2.32
traceability row all recorded that the account/login axis was **untouched by design**. The client has
restated the requirement — in the meeting and again in writing on 2026-08-06 — and it is the
opposite: a partner who has been dormant past the threshold is meant to **lose the ability to log
in**. Operational access is no longer the objective. It is the consolation prize.

The sweep must not, however, lock a partner out of work they are still obliged to finish. So for each
partner past the dormancy threshold:

- **Branch A — the partner holds no active jobs.** Account access **and** operational access are
  disabled **atomically, in a single transaction**, and `deactivationReason = inactivity` is stamped.
  Both axes move together on purpose: a partner who cannot sign in must not remain marketplace-visible
  or direct-assignable. Audited as `driver_auto_deactivated` — retained, but its `changes` diff now
  spans **both** axes rather than one — and notified to the admin dashboard **and** to the partner.
- **Branch B — the partner holds active jobs.** The account-access removal **FAILS**. This is a
  blocked operation, not a skipped one. Operational access is disabled as a **fallback**, and account
  access is **deliberately left enabled** so the partner can still sign in and complete their tours.
  The failed attempt is recorded with its reason and the identifiers of the blocking jobs, and admins
  are warned **once per partner** — on the first failure only — staying silent for that partner until
  the pending removal clears. Every subsequent attempt is still audited even though it is not
  re-notified.

Audit runs in **both** branches. There is no silent path.

**D6 resolved parameters.**

| Question                                             | Decision                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does operational access go too, on the success path? | **Yes — both axes, one transaction.** A partial removal that disables login while leaving the partner marketplace-eligible is not a permitted intermediate state.                                                                         |
| Is the fallback terminal or retried?                 | **Retried on every subsequent run.** Branch B is a _pending_ state, not an outcome. Once the blocking jobs resolve, the next run completes the account-access removal via Branch A.                                                       |
| What counts as blocking?                             | **Today's active-jobs guard, unchanged** — the set behind `DriverHasActiveJobsException`, the same rule that already stops an admin mid-tour. No new cross-module query. Documents, problem reports and settlements are **not** blocking. |
| What is the dormancy clock?                          | **`last_activity_at`, semantically unchanged** — no `last_login_at`, no backfill, no new interceptor. Its **table** changes: it moves from `drivers` to `users`. See **D6a**.                                                             |
| Is the fallback visible in the overview?             | **No — notification and audit only.** Per D4 the overview keeps two clean binary pills: no row marker, no badge, no worklist view.                                                                                                        |
| How often are admins warned?                         | **Once per partner, until it clears.** Requires new persistent state (below).                                                                                                                                                             |

### D6a — the activity clock lives on `users`, and only the clock moves

`last_activity_at` moves from `drivers` to `users`. Decided 2026-08-06, together with D6 and because
of it.

**Why the answer changed.** While the run only flipped an operational flag, the clock sat naturally
next to the thing it affected. Under D6 the trigger is a fact about a _person's_ usage and the primary
consequence is revoking a _person's_ account. Leaving the clock on `drivers` would mean reading the
trigger from one aggregate and writing the main consequence to another.

Four concrete gains, not tidiness:

1. **One fewer query on the hottest path.** The activity interceptor already holds the resolved user
   identity, and the stamping service then performs a driver lookup purely to reach the row it is
   about to write. Writing to `users` removes that lookup from every authenticated driver request.
2. **An edge case disappears.** A user holding the driver role but with no `drivers` row is currently
   skipped and never stamped. On `users` there is no such gap.
3. **The dormancy candidate query simplifies.** D6 already re-keys it onto the account axis with a
   join to `users`; putting the clock there means the dormancy predicate and the target axis are read
   from the same table.
4. **Staff dormancy becomes free if it is ever wanted.** It is explicitly out of scope and this does
   not add it — but the clock would already exist at the right level.

**Pre-launch, this costs nothing: no migration, no backfill, no `ALTER TABLE`. This is the only moment
it is free.** The column arrives in its new home the same way every other schema change in this
consolidation does — wipe, let the ORM build the schema, reseed, reconcile Keycloak. Nothing in this
ADR or in `logical-model.md` may describe the relocation as a migration; there is no migration
mechanism in this project and none is created.

**The boundary — do not blur it. Only the clock moves.**

| Field                        | Table     | Rationale                                       |
| ---------------------------- | --------- | ----------------------------------------------- |
| `last_activity_at`           | `users`   | A fact about the person's usage of the platform |
| `inactivity_warning_sent_at` | `drivers` | Sweep bookkeeping; the sweep is drivers-only    |
| `access_removal_deferred_at` | `drivers` | Sweep bookkeeping                               |
| `deactivation_reason`        | `drivers` | Operational-axis provenance                     |

The rule, stated once so no future column has to be argued from first principles: **the clock is a
user fact; the sweep's own progress markers are driver facts.**

**Knock-on effects, to be handled rather than discovered.** The dormancy query reads the clock from
`users`; the driver repository's activity-touch operation becomes a `users` write; the admin driver
list's last-activity column reads through the `users` join the list already performs to resolve
account access, so it is a read-path change and not a new query; the index moves with the column and
is renamed `idx_users_last_activity_at`. Semantics, the hourly write throttle, and the meaning of
`NULL` are all unchanged. The prototype does not model two tables — its driver objects are flat — so
there is no structural change there, but the prototype plan records the semantics so the model does
not drift from production.

**D6 composes with D1 rather than conflicting with it — and D1's leniency is now load-bearing.**
Branch B leaves account access enabled precisely so the partner can finish in-flight tours, which is
the leniency D1 mandates. In Branch A there are no active tours by definition, so D1's "can complete
assigned tours" carve-out is moot. The two rules were not reconciled after the fact; they fit.

But the relationship is stronger than compatibility. Before D6, "an access-disabled driver can still
complete assigned tours and upload documents on them" was a _convenience_ that avoided stranding
in-flight work. After D6 it is **the entire justification for Branch B's existence**. Branch B
preserves the partner's login so they can do the work — if that permission were ever tightened,
Branch B would preserve a login that grants the partner nothing, and the fallback would collapse into
pointless ceremony while the blocked account-access removal still never happens. **Any future change
to `canUploadOnAssignedTours` or `canPerformAssignedTours` must therefore be evaluated against D6, not
only against D1.** Narrowing either permission is a change to the inactivity design, whether or not
the sweep code is touched.

**Clearing the deferred state is counterintuitive and must be documented as such.** A reader assumes
that finishing the blocking tours restores the partner's standing. It does the opposite: the open
tours are the only thing _preventing_ full access removal, so resolving them lets the next run
complete the lockout via Branch A. The real exit is **activity** — `last_activity_at` is stamped on
authenticated partner requests, so a partner who signs in and works leaves the dormant set entirely
and the deferred marker clears. No prose anywhere may imply that completing the blocking tours
restores access.

**Sweep result fields are disjoint.** A run reports `accessRemovedIds` (Branch A) and `deferredIds`
(Branch B). A partner appears in exactly one, never both, and the two are **never summed into a single
"deactivated" figure** — a deferred partner has not lost account access, and combining the counts
overstates removals in every report that consumes them.

**D6 requires new persistent state.** Once-per-partner warning suppression cannot be satisfied
statelessly — the sweep must know it has already warned about this partner. A nullable marker records
when the pending access removal was first detected and last notified, and clears when the removal
succeeds or the partner becomes active again. The backend plan owns naming and placement and calls it
`drivers.access_removal_deferred_at`; _that_ it must exist is not optional.

**D6 amends C5 — exactly one new audit action key is required after all.** The earlier resolution
that no new audit keys were needed held only while every audited transition was a success. A _failed_
access removal with an operational fallback is a distinct, auditable event with no existing key. Add
one, and only one:

- **`driver_access_removal_deferred`** — emitted on **every** fallback attempt, including retries,
  even when the admin warning is suppressed. Payload carries: the dormancy figure that triggered the
  run, the count and identifiers of the blocking jobs, confirmation that operational access was taken
  as the fallback, and confirmation that account access was intentionally preserved.

`driver_inactivity_warning_sent` and `driver_auto_deactivated` are retained unchanged as keys;
`driver_auto_deactivated`'s `changes` diff widens to both axes. No other key is added or renamed.

**D6 changes the pre-removal warning copy.** The driver-facing warning currently says the partner is
about to lose operational status. It must now say they are about to lose **account access** — a
materially more serious consequence — in EN and DE.

**D6 makes reversal per-axis and manual.** An admin re-enabling account access does **not** implicitly
re-enable operational access, and vice versa; the admin action surface must offer both. This is an
assumption rather than an explicit client decision — flag it if review shows otherwise.

**D6 extends disable provenance to the account axis.** `DriverDeactivationReason` lives on the driver
row today. Since the success path now removes account access automatically, the same reason must be
recordable against the account axis. Per D4 it stays out of the overview.

**Retained unchanged.** `DriverDeactivationReason = inactivity`. It is removed from the overview
list but retained on the record and surfaced in the audit log and notification payload. The dormancy
clock's **semantics**, the threshold policy, the daily advisory-locked schedule, and the on-demand
sweep endpoint are all unchanged by D6. The clock's **table** is not — see D6a.

**Scope expansion, accepted and communicated: staff account access also becomes binary.**
`DriverResponse.userStatus` and `UserResponse.status` read the **same** `users` column, so once D5
rewrites that column in place a 2→5 reverse mapping is information-theoretically impossible. Staff
account access therefore becomes binary too. This is wider than what the client asked for — they
spoke only about the driver management overview — and it is a forced consequence of the shared
column, not a design preference. **It is accepted, not pending.** The client is informed rather than
asked; implementation does not wait on a reply. This supersession is recorded here (see the table
below) and is deliberately **not** framed anywhere as a blocking gate.

## Consequences

**Positive**

- `ACCESS_RESTRICTING_DRIVER_STATUSES` collapses to `[DISABLED]` and `ASSIGNMENT_ELIGIBLE` to
  `[ENABLED]`. Two constants stop being lists.
- The automated inactivity run now produces the lenient state on the operational axis, and under D6
  it never removes account access from a partner who still holds active jobs. It can no longer block
  document upload on, or lock a partner out of, a tour they are still obliged to complete — strictly
  safer than before on both axes.
- D6 makes dormancy mean what the client always thought it meant. A partner idle for three months
  loses their login, not merely their marketplace listing; the platform stops carrying live
  credentials for people who have stopped using it.
- The 5-value account enum stops conflating access, invite lifecycle, and delivery failure. _Resend
  access_ is gated on a fact about the invitation rather than on a status value that also means
  something about login.
- Provenance moves to the audit log and notifications, which is where the client asked for it and
  where it is queryable, rather than being encoded in an enum value that the UI then has to decode.
- **D6a removes a query from the hottest path in the application.** Stamping activity no longer
  resolves a driver row first; the interceptor writes against the identity it already holds. It also
  closes the gap where a driver-role identity with no driver row was never stamped at all, simplifies
  the dormancy candidate query to a single table, and would make staff dormancy available at no
  further cost if it is ever wanted.

**Negative / accepted costs**

- **The fail-open default must be inverted.** `driver.repository.ts` currently maps an unrecognised
  status value to `ACTIVE`; under the new model it must map to `disabled`. Because the project is
  pre-launch there is no rolling deploy and no legacy value to encounter, so this is defensive coding
  rather than a live hazard — but it must still be inverted to fail **closed** in the same commit that
  introduces the new values, since it becomes a live hazard the moment there is real data.
- **The dormancy clock becomes safety-critical.** It previously governed a reversible operational flag;
  under D6 it governs account lockouts and session revocation. Activity stamping fails silently today,
  so a persistent stamping failure could lock out drivers who were using the app throughout. Mitigated
  by a blast-radius guard, a dry-run mode, and alertable stamp failures — see the backend plan.
- Cause is no longer visible at a glance in the overview. Answering "why is this partner disabled"
  now requires opening the audit log or the notification. The client accepted this explicitly.
- `DriverStatus` is declared twice — in `shared/src/types/enums.ts` and in the backend domain value
  object — bridged by an `as unknown as` cast. The new enum must be declared **once**; duplicating
  the two-axis model would double the surface this ADR is trying to shrink.
- The sweep's no-op guard currently keys on the `active` state. Under D6 it must be re-expressed
  against the **account** axis — `account access = enabled AND deactivationReason IS NULL` — or the
  run will re-touch and re-notify partners an admin disabled by hand.
- Every downstream notification consumer must handle the new access-change entries.
- **D6 makes the inactivity run a security-relevant operation, not a housekeeping one.** It can now
  revoke login. A bug in the dormancy predicate previously cost a partner their marketplace listing;
  it now costs them their account. The sweep's tests move from "nice to have" to release-blocking.
- **D6's fallback path is deliberately invisible, and that is a real cost.** A partner can sit in the
  deferred state indefinitely if their active jobs never close, with no overview signal and only a
  single historical admin notification. This was chosen over a worklist view to keep D4's overview
  clean; if operations later needs a queue, it is a new requirement, not an oversight.
- **D6 adds persistent state and one audit key**, amending the earlier "no new audit action keys"
  resolution. Small, but it means the audit-key register is no longer closed by this change.
- **D1's leniency stops being a nicety and becomes a dependency.** `canUploadOnAssignedTours` and
  `canPerformAssignedTours` can no longer be narrowed as a local permissions decision — they now hold
  up Branch B. This constrains a future change that would otherwise look unrelated to inactivity.
- **D6a splits the inactivity feature across two tables, and the timing is not repeatable.** The
  clock is on `users` while the run's bookkeeping is on `drivers`, so a reversal writes to both and
  documentation must qualify column names that were previously unambiguous. The split is the correct
  ownership boundary, but it is a boundary a reader can now get wrong in a way they could not before.
  It is taken **now** because pre-launch is the only moment it is free — after launch it would need a
  migration and a backfill this project has deliberately built no mechanism for, and the cost would
  almost certainly buy permanent deferral instead.
- Staff account access becomes binary as a forced consequence of the shared `users` column — wider
  than the client's stated ask. Accepted and communicated rather than blocked on a reply.
- `autheon-fe-locale` is an already-stale fork missing the current account-access key set. The client
  **explicitly deferred it on 2026-08-06 with no decision recorded**, so it is neither migrated nor
  retired by this ADR. It stays stale, untouched and undeprecated, and the ambiguity is knowingly
  carried until a decision exists.

**Neutral / explicitly unaffected**

Job/order status, review status, settlement status, `Organization` status, `MasterDataChangeStatus`,
the Keycloak `enabled` mirroring, and the session-revocation mechanism are all untouched. No new
admin driver detail page is introduced.

## Superseded decisions

| Decision                                                                                   | Where recorded                                                                                                                                                                                                                                            | Superseded because                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-6 — granular driver blocking vs. coarse blocking                                        | `prd.json:1561` (open question), `prd.json:1497` (`resolved_defaults.selective_driver_blocking_v1`), `autheon-context-pack.md:163`, `meeting-closure-2026-06-25-2026-06-29.md:24`, `autheon-be/docs/prd-v1.8-backend-coverage-checklist.md:65`            | **Withdrawn by the client.** Granularity is not required; one disabled state with audit + notification is sufficient. See §5.1 of `tasks/status-consolidation-docs-plan.md`.                                                                                                                                                                                                                      |
| "Existing 5-state enum … not collapsed"                                                    | `Autheon/docs/requirements/admin-client-requirements-status.md` Phase 8, row 8 (`:316`)                                                                                                                                                                   | The rationale was that `Suspended` and `Invite failed` are "meaningful elsewhere". Under D2 that meaning is preserved — in `InviteState`, not in the access enum. The premise holds; the conclusion no longer follows.                                                                                                                                                                            |
| "not collapsed to exactly 3 since the extra states are meaningful"                         | `tasks/admin-prototype-client-change-plan.md:169`                                                                                                                                                                                                         | Same reasoning. Superseded, not retracted: the finer states were correctly retained at the time, and are now relocated rather than deleted.                                                                                                                                                                                                                                                       |
| **Inactivity sweep touches the operational axis only; `users.status` untouched by design** | `Autheon/docs/database/logical-model.md:414-423`, `prd.json:1516` (`driver_inactivity_auto_deactivation_v1`), `tasks/traceability.md:29` (v2.32 row), `Autheon/docs/product/autheon-context-pack.md:172` (OQ-15), `Autheon/docs/database/schema.dbml:275` | **Reversed by D6.** Account access is now the primary target and operational access the fallback. These records are accurate for what shipped in v2.32 and are corrected — not deleted — with an explicit "as shipped / no longer the design" boundary. `driver_inactivity_auto_deactivation_v1` is retired and superseded by `driver_inactivity_access_removal_v2` rather than amended in place. |
| "Existing 5-state enum … not collapsed", as it applies to **staff** accounts               | Same row as above (`admin-client-requirements-status.md` Phase 8)                                                                                                                                                                                         | Staff account access goes binary as a forced consequence of `users.status` being one shared column under D5. **Accepted and communicated as a scope expansion, not held open for client confirmation** (brief §8). No implementation waits on it.                                                                                                                                                 |
| DRV-Q-3 — does a Blocked driver lose the marketplace list entirely?                        | `autheon-be/docs/testing/e2e-open-questions.md:15`                                                                                                                                                                                                        | **Answered** by D1: disabled removes both list and accept; already-assigned tours and their document uploads remain.                                                                                                                                                                                                                                                                              |

OQ-15 (inactive service-partner handling) remains **resolved** — the client did not reopen the
question, they restated the answer. Its wording changes substantively under D6, from "operational
deactivation" to "account-access removal with an operational fallback" — see §5.2.

## Rollout note

There is **no data migration**. The project is pre-launch: the new vocabulary arrives by wiping the
database, letting the ORM build the schema, re-seeding, and reconciling Keycloak identities against the
freshly seeded state. The backend plan specifies that sequence. This section is documentation-side only.

1. This ADR lands **first**. Nothing else may cite the two-axis model before it exists.
2. `prd.json` is amended next (version → v2.33, changelog entry, acceptance criteria, resolved
   defaults, open questions). It is the canonical definition; every other document derives from it.
3. `logical-model.md` follows — and its "Automatic access removal" section is the **single
   highest-priority edit in the whole documentation change**, because the text it replaces states the
   opposite of D6 rather than merely using retired vocabulary. `schema.dbml` lands with it or
   immediately after, never in a separate release. Then all remaining live docs, in the wave order of
   `tasks/status-consolidation-docs-plan.md` §1.
4. Legacy value names (`active`, `blocked`, `inactive`, `archived`, `soft_deleted`,
   `pending_verification`, `suspended`, `invite_failed`) survive in exactly two places and nowhere
   else: this ADR's mapping table, and the frozen archive/transcript corpus. §9 of the docs plan is the
   grep gate that enforces this. (A third place — a migration tolerance map — was planned and then
   deleted along with the migration itself.)
5. Archived documents and meeting transcripts are **not** edited. See §6 of the docs plan.
