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
| `active` | yes | yes | reported as `BASELINE_MISSING` / `COVERAGE_MISMATCH` (non-blocking) |
| `planned` | no | no | reported as missing coverage (non-blocking) |
| `excluded` | no | no | reported, with a mandatory reason |
| `deprecated` | no | baseline is an orphan to remove | reported, with a mandatory reason |

`excluded` and `deprecated` **require** `exclusionReason`. An entry without one is
a validation failure, so a scenario cannot be quietly dropped by relabelling it.

---

## Findings

**No coverage finding blocks.** Each maps to a classification category (see
[the CI doc](./visual-regression-ci.md#classification-model)) and is reported
while the rest of the suite still runs:

| Finding | Category | Meaning |
| --- | --- | --- |
| `missingBaselines` | `BASELINE_MISSING` | Active scenario, selected by the profile, has no approved baseline |
| `missingCaptures` | `CAPTURE_FAILURE` | Expected snapshot the run never compared — the test died first |
| `scenariosWithoutSpec` | `COVERAGE_MISMATCH` | Registered `active` but no spec declares it |
| `unregisteredSnapshots` | `COVERAGE_MISMATCH` | A spec captures a snapshot the registry does not know |
| `duplicateSnapshotIds` | `COVERAGE_MISMATCH` | The same ID declared in two places |
| `orphanBaselines` | `COVERAGE_MISMATCH` | An approved baseline with no active registered scenario |
| invalid registry | `COVERAGE_MISMATCH` | Unparseable, wrong version, unknown viewport/locale/theme/mode, or an undocumented exclusion. Coverage scoring is suppressed for the run; screenshot comparison continues. |

Reported separately as declared/expected gaps:

| Finding | Meaning |
| --- | --- |
| `baselineGapsOutsideProfile` | A baseline gap in a scenario this profile does not run |
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

The audit exits **0 even when findings exist** — it is an observability tool, not
a pipeline gate. Pass `--exit-code` to opt into a non-zero exit for chaining. The
CI wrapper calls the same model, so the standalone audit and the pipeline can
never disagree.

---

## Current inventory

| | |
| --- | --- |
| Registered scenarios | 55 |
| — active | 52 |
| — excluded | 1 |
| — deprecated | 2 |
| Application surfaces | 4 (shell, admin, driver, component-gallery) |
| Distinct screens | 22 |
| Viewports catalogued | 6 (1 with baselines) |
| Locales catalogued | 2 (1 with baselines) |
| Themes catalogued | 2 (1 with baselines) |
| Expected snapshots (`full`) | 52 |
| Approved baselines | 44 |
| Missing Linux baselines | **9** — see below |
| Declared gap groups | 8 |
| Capture modes in use | 51 `fullPage`, 2 `locator`, 0 `viewport` |

### The 9 missing Linux baselines

These have specs that run, so they are correctly `active`. They are reported as
`BASELINE_MISSING` — **non-blocking**, and awaiting deliberate human approval.
The current screenshot is never promoted automatically, so the gap persists in the
report until someone approves a baseline:

| Snapshot | Spec | macOS baseline exists? |
| --- | --- | --- |
| `admin-infopoint-edit-doc-modal.png` | `admin.visual.spec.ts:271` | no |
| `admin-infopoint-delete-doc-modal.png` | `admin.visual.spec.ts:282` | no |
| `driver-marketplace-filter-1.png` | `driver.visual.spec.ts:91` | yes |
| `driver-marketplace-filter-3.png` | `driver.visual.spec.ts:107` | yes |
| `driver-myjobs-empty-run.png` | `driver.visual.spec.ts:157` | yes |
| `driver-header-states.png` | `driver-header-states.visual.spec.ts:44` | yes |
| `driver-header-focus-visible.png` | `driver-header-states.visual.spec.ts:65` | yes |
| `marketplace-filter-states.png` | `marketplace-filter-states.visual.spec.ts:41` | yes |
| `marketplace-filter-focus-visible.png` | `marketplace-filter-states.visual.spec.ts:61` | yes |

A macOS baseline cannot be promoted — different font rasterization means a Darwin
PNG compared against a Linux screenshot reports a false 1–3% diff on every
text-bearing screen. Run the **Visual Regression Baseline** workflow.

Marking these `planned` would not silence them. Playwright reports a missing
snapshot on its own ("writing actual"), so the run classifies them as
`BASELINE_MISSING` regardless of the registry label. The gap has to be closed by
rendering and approving, not by relabelling.

> **Playwright writes missing snapshots to disk.** `toHaveScreenshot()` writes the
> actual image into the snapshot directory *and then fails the test*, even with
> `CI=true`. Inside the container that write is discarded with the container, but
> it means anything re-listing the snapshot directory after a run would count those
> unapproved images as approved. Two guards exist:
>
> - post-run coverage scores against the **preflight** baseline listing, so the
>   approved count cannot drift upward mid-run;
> - the artifact's `approved-baseline/` copy contains only preflight-verified files,
>   so an unapproved screenshot can never be extracted from the artifact and
>   committed as if it had been reviewed.
>
> Never bind-mount the repository into the visual-regression container.

### Resolution of the original 10 coverage findings

The 10 findings from the first failing CI run resolved as follows. Eight were
already corrected in commit `b11951b`, which registered them — that moved them out
of `COVERAGE_MISMATCH` and into `BASELINE_MISSING`, which is why the finding count
looked unchanged.

| Finding | Correct resolution | State now |
| --- | --- | --- |
| `admin-infopoint-edit-doc-modal.png` | `active` — real spec at `admin.visual.spec.ts:271` | `BASELINE_MISSING`, awaiting approval |
| `admin-infopoint-delete-doc-modal.png` | `active` — real spec at `admin.visual.spec.ts:282` | `BASELINE_MISSING`, awaiting approval |
| `driver-myjobs-special.png` | `deprecated` — the "Special cases" tab was replaced by "Empty run"; no spec declares it, no baseline exists | **resolved** (documented retirement) |
| `driver-header-states.png` | `registered` + `active` — gallery page exists | `BASELINE_MISSING`, awaiting approval |
| `driver-header-focus-visible.png` | `registered` + `active` — gallery page exists | `BASELINE_MISSING`, awaiting approval |
| `driver-marketplace-filter-1.png` | `registered` + `active` | `BASELINE_MISSING`, awaiting approval |
| `driver-marketplace-filter-3.png` | `registered` + `active` | `CAPTURE_FAILURE` — spec times out before capture |
| `driver-myjobs-empty-run.png` | `registered` + `active` | `BASELINE_MISSING`, awaiting approval |
| `marketplace-filter-states.png` | `registered` + `active` | `CAPTURE_FAILURE` — `toHaveCount` mismatch; spec is outdated |
| `marketplace-filter-focus-visible.png` | `registered` + `active` | `CAPTURE_FAILURE` — `toHaveCount` mismatch; spec is outdated |

Plus one finding the original run never reached, because it aborted first:

| Finding | Correct resolution |
| --- | --- |
| `admin-infopoint-rename-modal.png` | `deprecated`, superseded by the edit-doc modal. Its approved Linux **and** Darwin baselines are orphans. Deleting an approved baseline requires human approval, so it is reported as `COVERAGE_MISMATCH` (`orphan-baseline`) and left in place. |

Nothing here was resolved by generating a baseline automatically, by deleting a
scenario, or by running `--update-snapshots`.

### The three outdated specs

These need a developer, not a baseline:

| Spec | Symptom |
| --- | --- |
| `driver.visual.spec.ts:97` (`driver-marketplace-filter-3.png`) | `locator.click` times out after 15s — the third filter control no longer matches |
| `marketplace-filter-states.visual.spec.ts:39` | `expect(locator).toHaveCount()` fails — the gallery no longer renders the expected number of stories |
| `marketplace-filter-states.visual.spec.ts:46` | same root cause as above |

Until they are repaired, coverage for those screens is **unavailable** — which the
report states explicitly rather than showing them as passing or as visual changes.

### Component-gallery surface

`prototype/project/driver-header-states.html` and
`prototype/project/driver-marketplace-filter-states.html` are gallery pages that
mount a real shared component in every state. With no Storybook and no bundler in
this repository, they *are* the story catalogue, and they are the only place
component states are captured in isolation from page-level noise. They are also
the cheapest way to extend interaction-state coverage.

---

## Declared coverage gaps

These are recorded in the registry's `planned` array and reported on every run.
They are the honest statement of what this framework does **not** yet prove.

| Gap | Why it matters |
| --- | --- |
| `viewport-mode-sticky-chrome` | 51 of 53 captures are page-level `fullPage`; the other 2 are locator captures. **Nothing** uses viewport mode. A full-page render stitches the document at full height, so it cannot prove the driver's fixed bottom tabbar, the admin's sticky job sidebars, or a sticky table header sit correctly at real viewport height. |
| `segmented-scroll-sticky` | Sticky elements change appearance *while* scrolling. A single capture at scroll offset 0 cannot detect one that detaches mid-scroll. |
| `locale-de-matrix` | German is the longest-translation locale and the wrapping risk case. No snapshot is captured in DE. |
| `theme-dark-matrix` | Dark is a production theme with its own tabbar treatment. Every baseline is light-only. |
| `pwa-standalone-route` | `/pwa/` is a second real surface (real-viewport driver PWA, deep-linkable via `?tab=portal\|mine\|info\|profile`) with zero visual coverage, plus an install mode bar and iOS install sheet the iframe shell never renders. |
| `admin-large-desktop` | Admin is captured only at 1440px. A large-desktop width changes table column visibility and sidebar proportions. |
| `interaction-states` | Focus-visible **is** covered, but only for two components via the gallery pages. Hover, expanded selects, open autocompletes, disabled controls, and focus states on in-app screens are unregistered. |
| `empty-error-loading-states` | One empty state is covered (`driver-myjobs-empty-run`, a genuinely seeded empty tab). Loading, skeleton, error, permission-denied, offline, no-result-search, and admin empty lists are not. **Blocked**: the prototype seeds a fixed in-memory store with no fixture override hook, so the rest needs a test-only seeding hook first — a prototype change, out of scope for CI work. |

### Closing a gap

1. Implement the scenarios in a spec (for the matrix gaps, `matrix.visual.spec.ts`
   — the viewport projects in `playwright.config.ts` already point at it).
2. Add the registry entries with `status: "planned"`.
3. Render candidates with the baseline workflow; review and approve.
4. Flip the entries to `status: "active"` **in the same commit as their approved
   baselines**, and remove the corresponding `planned` group.

Step 4 in one commit is what keeps the gate honest: a scenario becomes blocking at
exactly the moment it becomes verifiable.
