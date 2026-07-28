# Approved Visual Baselines — Source of Truth and Approval Process

---

## The rule

> An approved baseline is a `*-<project>-linux.png` file committed under
> `tests/regression/snapshots/`, recorded in `baseline-manifest.json`, rendered
> inside `docker/visual-regression-ci.Dockerfile`, and promoted by
> `npm run test:regression:baseline:approve` after a human reviewed it.

Anything else is a candidate, a scratch file, or a bug.

---

## Why Git, and why Linux only

**Git**, because a baseline has to be durable, versioned, reviewable, and
attributable. Workflow artifacts expire (30 days here). A cache can be evicted at
any time. Neither shows up in a pull request diff, so neither can be reviewed. A
committed PNG appears in the diff, carries an author and a reason, and can be
bisected.

**Linux only**, because the snapshot path template includes `{platform}`, and
macOS and Linux rasterize fonts differently. A Darwin PNG compared against a
Linux screenshot produces a 1–3% false pixel difference on every text-bearing
screen. Baselines are never renamed or aliased across platforms. There is exactly
one rendering environment that decides what "changed" means, and it is the pinned
Docker image.

Locally rendered `*-darwin.png` and `*-win32.png` files stay on disk for
convenience and are gitignored.

### How this was broken

`.gitignore` contained a bare `snapshots/` rule. It matched
`tests/regression/snapshots/`, so all 44 approved Linux baselines existed on the
author's disk and **none of them were in git**. Every CI checkout therefore found
zero baselines and the missing-baseline preflight blocked the run — correctly. The
fix was to scope the ignore rule to the per-platform scratch files, not to weaken
the preflight.

If a baseline ever seems to "disappear in CI but exist locally", check
`git check-ignore -v <path>` first.

---

## Threat model: a PR cannot hide a visual difference

For a `pull_request` event GitHub checks out the **merge commit**
(`refs/pull/N/merge`) — the PR's code as it would look on `main`. The approved
baselines in that tree come from the **base branch**, because a PR that also
edited `tests/regression/snapshots/` would show those edits in its own diff, in
review, alongside the code change.

So the only way to change an approved baseline is a reviewed commit. A PR cannot
change application code and silently re-approve its own screenshots in the same
untrusted execution. The pipeline additionally records the base SHA, head SHA,
merge SHA, and the commit that last touched the baseline directory in
`summary.json`, so every comparison states exactly which baseline version it used.

The baseline workflow is read-only (`permissions: contents: read`). It cannot
write an approved baseline even if someone wanted it to.

---

## The manifest

`tests/regression/snapshots/baseline-manifest.json` is the provenance record. For
every approved baseline it stores the SHA-256, byte size, pixel dimensions,
snapshot ID, and project; plus, for the set as a whole, the platform, the
generation timestamp, the Playwright version, the Docker base image, and the
approval reason carried over from the candidate run.

The CI preflight uses it to detect:

- a baseline listed in the manifest but absent from the checkout;
- a baseline whose bytes no longer hash to the recorded value — i.e. an image
  edited outside the approval command;
- a corrupt or truncated PNG (signature, IHDR dimensions, IEND terminator);
- a baseline present on disk that the manifest does not know about;
- a manifest generated for a different platform, or at a different schema version.

All of these are **blocking**. Comparing against a baseline set whose provenance
cannot be established produces results nobody can act on.

`baseline-manifest.<platform>.json` (e.g. `.darwin.json`) is a local scratch
manifest for framework validation and is gitignored. Only the canonical
`baseline-manifest.json` is committed.

---

## Approval process

### Step 1 — render candidates in the canonical image

Preferred, in CI:

1. **Actions → Visual Regression Baseline → Run workflow.**
2. Choose the profile and give a **reason** — it is recorded in the candidate
   manifest and carried into the approved manifest.
3. Wait for the run.

Locally, if you have a working Docker daemon:

```bash
npm run test:regression:baseline
```

Either way, candidates land in
`visual-regression-artifacts/docker-ci/baseline-candidates/` with a
`manifest.json`. **Nothing is approved.** The container workspace is disposable
and the repository snapshots are untouched.

### Step 2 — review

Download the `visual-regression-baseline-candidates` artifact and open
`review/review.md`. It reports:

- **added** snapshots
- **changed** snapshots, with dimension and file-size deltas
- **removed** snapshots (present in the approved set, not re-rendered)
- **renamed** snapshots (identical pixels under a new ID)
- **⛔ blockers** and **⚠️ warnings** from the guard rails below

Open every added and changed image. Also download
`visual-regression-baseline-diagnostics` if anything looks wrong — a candidate
rendered by a test that limped through a dead selector is exactly what must not
be approved.

#### Guard rails against accidental mass approval

Every one of these corresponds to a way a bulk update has gone wrong before:

| Signal | Usual real cause |
| --- | --- |
| More than half the approved set changed or vanished | Broken CSS, a stylesheet that 404'd, or a failed fixture — not a design change |
| Zero candidates rendered | Approving would delete the entire approved set |
| Large canvas, tiny file (e.g. 1440×1100 under 15 KB) | Blank or near-blank page: failed data load, missing stylesheet, or an auth redirect |
| Dimensions changed | Wrong viewport or device scale factor, not a design change |
| File size dropped more than 60% | Content or webfonts failed to render |
| Unexpected spread of widths | Wrong project set ran |
| Previously approved baselines not re-rendered | A retired snapshot that will linger as a coverage orphan |
| Non-zero Playwright exit code on the candidate run | **Hard stop.** The approval command refuses to run. |

The candidate run's exit code is checked twice: the workflow fails the render job,
and `approve-visual-baselines.mjs` refuses to promote candidates whose
`manifest.json` records a non-zero `playwrightExitCode`.

### Step 3 — promote

Extract the artifact so the candidate tree sits at
`visual-regression-artifacts/docker-ci/baseline-candidates/`, then:

```bash
# Preview first. Nothing is written.
npm run test:regression:baseline:approve -- --dry-run

# Promote.
npm run test:regression:baseline:approve
```

The command copies candidates into `tests/regression/snapshots/`, prints a
per-file add/update/unchanged line with each SHA-256, and **regenerates
`baseline-manifest.json` in the same operation** so the images and their
provenance can never drift apart.

It never deletes an approved baseline. Retiring one is a separate, explicit act —
see below.

### Step 4 — commit

```bash
npm run test:regression:baseline:verify   # confirm the manifest matches the images
git add tests/regression/snapshots
git status                                # review before committing
```

Commit the images **together with** `baseline-manifest.json`, with a message
saying what changed visually and why it is approved. The commit is the approval.

---

## Retiring a baseline

Do not just delete the file. In one reviewed commit:

1. Set the scenario's `status` to `deprecated` in
   `tests/regression/visual-coverage.manifest.json` and give it an
   `exclusionReason`. The registry rejects a deprecated entry without one.
2. Delete the `*-linux.png` file.
3. Run `npm run test:regression:baseline:manifest` to drop it from the manifest.
4. Commit all three changes together.

Until step 2, the coverage audit reports the file as an **orphan baseline** — a
visible, non-blocking finding, so a retired snapshot cannot quietly rot.

There is one such orphan today: `admin-infopoint-rename-modal.png`, superseded
when the rename action became a full edit modal. It is registered as `deprecated`
with a reason and is reported on every run, awaiting the next approved update.

---

## Commands

| Command | Purpose | Where |
| --- | --- | --- |
| `npm run test:regression:baseline` | Render candidates in Docker/Linux | Local (needs Docker) or the workflow |
| `npm run test:regression:baseline:approve` | Promote reviewed candidates + regenerate the manifest | Local only, after review |
| `npm run test:regression:baseline:manifest` | Regenerate the provenance record | Local |
| `npm run test:regression:baseline:verify` | Verify images against the manifest | Local and CI preflight |
| `npm run test:regression:coverage` | Report coverage, orphans, and gaps | Local and CI |

`npm run test:regression:update` (raw `--update-snapshots`) still exists for the
non-visual regression signals. **It is not the visual baseline path**: run on
macOS it writes Darwin PNGs that CI will never use.

---

## Current state

- **44** approved Linux baselines, all checksum-verified against the manifest.
- **9** active registered scenarios have no approved Linux baseline. Their specs
  exist and run, so this is correctly reported as blocking. Seven of the nine have
  a macOS baseline, which **cannot** be promoted — see the table in
  [`visual-regression-coverage.md`](./visual-regression-coverage.md). Render them
  with the **Visual Regression Baseline** workflow.
- `driver-myjobs-special.png` is registered `deprecated`: the My jobs "Special
  cases" tab became "Empty run" and the spec no longer declares it. It has no
  baseline on any platform, so there is nothing to remove.
- **1** orphan baseline: `admin-infopoint-rename-modal.png` (see above).
- **1** excluded scenario: `driver-daily-limit-sheet.png`, whose UI was replaced
  by the probation progress card. Its spec is `test.skip` and its absence is
  intentional; re-registering it is a product decision, not a baseline update.
- The determinism pins added to `playwright.config.ts` (`timezoneId`, `locale`,
  `colorScheme`, `reducedMotion`, `deviceScaleFactor`) change rendering inputs.
  **The existing 44 baselines predate them and must be refreshed once** through
  the process above. Until then, expect non-blocking visual differences.
