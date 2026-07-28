# Visual Coverage Registry

`tests/regression/visual-coverage.manifest.json` is the machine-readable source of
truth for **what must be captured**. The specs own **how** each state is reached.

---

## Why a registry at all

A suite where every executed test passes tells you nothing about coverage. It
cannot distinguish "the marketplace screen is verified" from "the marketplace test
was deleted last week". Playwright has no concept of a snapshot that *should*
exist.

The registry supplies that missing side of the comparison. Three independent
sources are cross-checked on every run:

```text
registry   visual-coverage.manifest.json     what MUST be captured
specs      tests/regression/*.visual.spec.ts what IS captured
baselines  tests/regression/snapshots/       what is APPROVED
+ per-run  test-results/results.json         what the run actually PRODUCED
```

Any disagreement between them is a finding. That is what stops a run from
claiming complete coverage on the strength of a green test list.

An automatic crawler cannot replace this. It can find routes; it cannot know that
a job in `assigned` state renders different action panels than one in `draft`, or
that the account-access dialog only appears after a successful create. Explicit
scenario definitions remain the source of truth for stateful screens; route
discovery supplements them.

---

## Structure

Registry-level keys:

| Key | Purpose |
| --- | --- |
| `registryVersion` | Schema version. A mismatch is a blocking failure. |
| `grep` | The Playwright tag that marks visual tests. |
| `approvedPlatform` | Platform whose baselines are approved (`linux`). |
| `viewports` | Viewport catalogue → Playwright project name, width, height, class. |
| `locales` | Supported locales, and which is primary. |
| `themes` | Production themes. |
| `screenshotModes` | The capture modes and when each is the right one. |
| `profiles` | Execution profiles → the `--grep` each selects. |
| `defaults` | Inherited by every scenario. |
| `scenarios` | The registered snapshot inventory. |
| `planned` | Declared coverage gaps, with reasons. |

Every scenario inherits `defaults` and overrides only what differs, so an entry
stays readable:

```json
{
  "snapshotId": "admin-job-detail-assigned.png",
  "screen": "Job detail",
  "scenario": "assigned lifecycle status",
  "state": "lifecycle:assigned",
  "interactions": ["open job 0848-26 from the overview table"],
  "tags": ["screen", "detail", "lifecycle"]
}
```

Available fields: `snapshotId`, `surface`, `route`, `screen`, `scenario`, `state`,
`role`, `fixture`, `locale`, `theme`, `viewport`, `orientation`, `mode`,
`interactions`, `mask`, `animations`, `owner`, `tags`, `status`,
`exclusionReason`, `profiles`.

---

## Status semantics

| Status | Must have a spec | Must have a baseline | Missing → |
| --- | --- | --- | --- |
| `active` | yes | yes | **BLOCKING** |
| `planned` | no | no | reported as missing coverage (non-blocking) |
| `excluded` | no | no | reported, with a mandatory reason |
| `deprecated` | no | baseline is an orphan to remove | reported, with a mandatory reason |

`excluded` and `deprecated` **require** `exclusionReason`. An entry without one is
a validation failure, so a scenario cannot be quietly dropped by relabelling it.

---

## Findings

Blocking:

| Finding | Meaning |
| --- | --- |
| `missingBaselines` | Active scenario, selected by the profile, has no approved baseline |
| `missingCaptures` | Expected snapshot the run never compared — the test died first |
| `scenariosWithoutSpec` | Registered `active` but no spec declares it |
| `unregisteredSnapshots` | A spec captures a snapshot the registry does not know |
| `duplicateSnapshotIds` | The same ID declared in two places |
| invalid registry | Unparseable, wrong version, unknown viewport/locale/theme/mode, or an undocumented exclusion |

Non-blocking, but always reported:

| Finding | Meaning |
| --- | --- |
| `baselineGapsOutsideProfile` | A baseline gap in a scenario this profile does not run |
| `orphanBaselines` | An approved baseline with no active registered scenario |
| `missingCoverage` | `planned` entries and declared gap groups |
| `excludedScenarios` | Documented exclusions |

A baseline gap blocks only the run that would actually have compared against it. A
`smoke` run still *reports* a gap in a non-smoke screen, so nothing is lost, but
it does not fail for a screen it never touched.

---

## Coverage percentage

```text
coveragePercent = producedSnapshots / expectedSnapshots-in-this-profile
```

Scored against the profile's own set, not the whole registry — otherwise a
narrowed profile always reports a misleadingly low number that says nothing about
whether the run did its job. When no Playwright run has been analysed (a static
audit), the basis falls back to approved baselines over expected snapshots and
says so in `coverageBasis`.

**100% coverage means every snapshot this profile is responsible for was
produced.** It does not mean the product is fully covered — that is what the
`planned` gaps below are for.

---

## Execution profiles

| Profile | Selects | Use |
| --- | --- | --- |
| `full` | `@visual-regression` — everything | Default; PRs, pushes, nightly |
| `smoke` | `@visual-smoke` | Fast representative check |
| `changed` | `@visual-regression` | **Deliberately not narrowed.** See below. |
| `baseline` | `@visual-regression` | Candidate generation |
| `diagnostic` | `@visual-regression` | `full` + traces/video for every scenario |

`changed` falls back to the full set on purpose, and logs that it did. A wrong
change-impact heuristic silently skips the screen the PR actually broke, which is
worse than running everything. It stays in the registry as a named intent so
nobody assumes a narrowed run happened.

`full` runs on every pull request. It is not reduced to a sample. If runtime ever
becomes unacceptable, move `full` to the nightly and pre-merge workflows rather
than shrinking it — the matrix job and shard-merge hooks exist for that, and the
merge step detects a missing shard and duplicate snapshot IDs across shards.

---

## Running the audit

```bash
# Static: registry vs specs vs baselines. No suite execution.
npm run test:regression:coverage

# Score a specific profile.
node scripts/visual-coverage-audit.mjs --profile smoke

# Score against what a run actually produced.
node scripts/visual-coverage-audit.mjs --results test-results/results.json

# Machine-readable.
node scripts/visual-coverage-audit.mjs --json
```

Exit code is non-zero when a blocking finding exists. The CI wrapper calls the
same model, so the standalone audit and the pipeline can never disagree.

---

## Current inventory

| | |
| --- | --- |
| Registered scenarios | 48 |
| — active | 46 |
| — excluded | 1 |
| — deprecated | 1 |
| Application surfaces | 3 (shell, admin, driver) |
| Distinct screens | 20 |
| Viewports catalogued | 6 (1 with baselines) |
| Locales catalogued | 2 (1 with baselines) |
| Themes catalogued | 2 (1 with baselines) |
| Expected snapshots (`full`) | 46 |
| Approved baselines | 44 |
| Declared gap groups | 8 |

---

## Declared coverage gaps

These are recorded in the registry's `planned` array and reported on every run.
They are the honest statement of what this framework does **not** yet prove.

| Gap | Why it matters |
| --- | --- |
| `viewport-mode-sticky-chrome` | All 47 existing snapshots use `fullPage: true`. A full-page render stitches the document at full height, so it cannot prove the driver's fixed bottom tabbar, the admin's sticky job sidebars, or a sticky table header sit correctly at real viewport height. |
| `segmented-scroll-sticky` | Sticky elements change appearance *while* scrolling. A single capture at scroll offset 0 cannot detect one that detaches mid-scroll. |
| `locale-de-matrix` | German is the longest-translation locale and the wrapping risk case. No snapshot is captured in DE. |
| `theme-dark-matrix` | Dark is a production theme with its own tabbar treatment. Every baseline is light-only. |
| `pwa-standalone-route` | `/pwa/` is a second real surface (real-viewport driver PWA, deep-linkable via `?tab=portal\|mine\|info\|profile`) with zero visual coverage, plus an install mode bar and iOS install sheet the iframe shell never renders. |
| `admin-large-desktop` | Admin is captured only at 1440px. A large-desktop width changes table column visibility and sidebar proportions. |
| `interaction-states` | Focus-visible, hover, expanded selects and open autocompletes are unregistered. Two specs that once covered focus states were deleted, leaving orphan Darwin baselines behind. |
| `empty-error-loading-states` | Only populated states exist. **Blocked**: the prototype seeds a fixed in-memory store on every load with no fixture override hook. Capturing empty/loading/error/offline states needs a test-only seeding hook first — a prototype change, out of scope for CI work. |

### Closing a gap

1. Implement the scenarios in a spec (for the matrix gaps, `matrix.visual.spec.ts`
   — the viewport projects in `playwright.config.ts` already point at it).
2. Add the registry entries with `status: "planned"`.
3. Render candidates with the baseline workflow; review and approve.
4. Flip the entries to `status: "active"` **in the same commit as their approved
   baselines**, and remove the corresponding `planned` group.

Step 4 in one commit is what keeps the gate honest: a scenario becomes blocking at
exactly the moment it becomes verifiable.
