#!/usr/bin/env node
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import {
  APPROVED_PLATFORM,
  CANONICAL_PLATFORM,
  baselineVerificationBlocking,
  baselineVerificationMessages,
  git,
  playwrightVersion,
  verifyBaselines,
} from './lib/visual-baseline.mjs';
import {
  baselineMissingFindings,
  buildCoverage,
  captureFailureFindings,
  coverageMismatchFindings,
  readPlaywrightOutcomes,
  scenariosForProfile,
  readRegistry,
} from './lib/visual-coverage.mjs';
import {
  CATEGORY,
  buildComparison,
  buildGate,
  deriveState,
  describeState,
  legacyStatus,
  presentCategories,
} from './lib/visual-classification.mjs';
import { discoverSpecSnapshots } from './lib/visual-scenarios.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const options = {
  strict: args.includes('--strict') || isTruthy(process.env.VISUAL_REGRESSION_STRICT),
  // Opt-in only. Visual regression is an observability system: by default not
  // even an infrastructure failure blocks the application pipeline. It is still
  // reported loudly enough that it cannot be read as a successful comparison.
  failOnInfrastructure:
    args.includes('--fail-on-infrastructure') ||
    isTruthy(process.env.VISUAL_REGRESSION_FAIL_ON_INFRASTRUCTURE),
  noClean: args.includes('--no-clean'),
  reuseResults: args.includes('--reuse-results'),
  help: args.includes('--help') || args.includes('-h'),
  profile:
    readFlagValue('--profile') || process.env.VISUAL_REGRESSION_PROFILE || 'full',
};

const RESERVED_FLAGS = ['--strict', '--no-clean', '--reuse-results', '--help', '-h'];
const passthroughArgs = args.filter((arg, index) => {
  if (RESERVED_FLAGS.includes(arg)) return false;
  if (arg === '--profile') return false;
  if (args[index - 1] === '--profile') return false;
  return true;
});

function readFlagValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

const settings = {
  testDir: process.env.VISUAL_REGRESSION_TEST_DIR || 'tests/regression',
  grep: process.env.VISUAL_REGRESSION_GREP || '@visual-regression',
  project: process.env.VISUAL_REGRESSION_PROJECT || 'chromium',
  // Screenshot comparisons are deterministic: an unexpected diff reproduces
  // identically on every retry, so retries only slow the suite down and
  // triple the noise. Functional E2E projects keep their own retry policy.
  retries: process.env.VISUAL_REGRESSION_RETRIES ?? '0',
  baselineDir: process.env.VISUAL_BASELINE_DIR || 'tests/regression/snapshots',
  testResultsDir: process.env.PLAYWRIGHT_TEST_OUTPUT_DIR || 'test-results',
  playwrightReportDir: process.env.PLAYWRIGHT_HTML_OUTPUT_DIR || 'playwright-report',
  artifactDir: process.env.VISUAL_REGRESSION_ARTIFACT_DIR || 'visual-regression-artifacts',
  archiveName:
    process.env.VISUAL_REGRESSION_ARCHIVE_NAME ||
    'autheon-visual-regression-artifact.tar.gz',
};

const paths = {
  baselineDir: path.resolve(repoRoot, settings.baselineDir),
  testResultsDir: path.resolve(repoRoot, settings.testResultsDir),
  playwrightReportDir: path.resolve(repoRoot, settings.playwrightReportDir),
  artifactDir: path.resolve(repoRoot, settings.artifactDir),
  resultsJson: path.resolve(repoRoot, settings.testResultsDir, 'results.json'),
};

if (options.help) {
  printHelp();
  process.exit(0);
}

const startedAt = new Date();

// The execution profile decides which tests Playwright selects. `changed` is
// intentionally not narrowed — see the registry note; a wrong change-impact
// heuristic silently skips the screen the PR actually broke.
const profileGrep = await resolveProfileGrep(options.profile);
const playwrightArgs = [
  'test',
  settings.testDir,
  '--grep',
  profileGrep,
  '--project',
  settings.project,
  ...(passthroughArgs.some((arg) => arg.startsWith('--retries'))
    ? []
    : [`--retries=${settings.retries}`]),
  ...passthroughArgs,
];
const command = [relativeCommand(playwrightBinary()), ...playwrightArgs].join(' ');

let playwrightExitCode = 0;
let analysis;
let summaryMarkdown = '';
let archivePath = path.resolve(paths.artifactDir, settings.archiveName);

// ---------------------------------------------------------------------------
// Module state and lookup tables used by the run below.
//
// These MUST stay above the top-level `try`. Function declarations hoist, but
// `const`/`let` do not initialise until the interpreter reaches them — and the
// top-level `await` in that try block executes first. Declaring either of these
// further down the file throws a temporal-dead-zone ReferenceError the moment the
// run touches it, which is exactly how an engine crash was introduced here once.
// ---------------------------------------------------------------------------

/** Snapshot IDs declared by each spec/test, indexed before the run. */
let declaredSnapshotIndex = null;

/**
 * Infrastructure-level failure signatures.
 *
 * These are failures of the harness, not of the spec: no amount of fixing a
 * locator would help. Kept narrow on purpose — anything that merely means "the
 * test did not get where it expected to be" is a CAPTURE_FAILURE, which is the
 * finding an application developer can actually act on.
 */
const INFRASTRUCTURE_SIGNATURES = [
  /browserType\.launch/i,
  /Failed to launch/i,
  /Target (?:page|browser|context) closed/i,
  /Browser has been closed/i,
  /browser has disconnected/i,
  /Protocol error/i,
  /Cannot find module/i,
  /ERR_MODULE_NOT_FOUND/i,
  /Executable doesn't exist/i,
  /playwright install/i,
  /worker process (?:exited|crashed)/i,
  /ENOSPC|EACCES|EMFILE|ENOMEM/,
  /net::ERR_CONNECTION_REFUSED/i,
  /ECONNREFUSED/i,
];

try {
  await prepareOutputDirectories();

  log(`Visual regression CI run started at ${startedAt.toISOString()}`);
  log(`Command: ${command}`);
  log(`Execution profile: ${options.profile}`);
  log(`Playwright report directory: ${settings.playwrightReportDir}`);
  log(`Test results directory: ${settings.testResultsDir}`);

  // ---------------------------------------------------------------------------
  // Preflight. Records findings; it does NOT decide whether the run happens.
  //
  // A missing baseline, an outdated spec, or a registry inconsistency is
  // evidence to collect, not a reason to abort: aborting produced a run that
  // reported "0 visual differences" simply because nothing was ever compared.
  // Execution stops only when comparison is technically impossible (see
  // `preflight.fatal`), and even then the summary, artifacts and notification
  // are still produced below.
  // ---------------------------------------------------------------------------
  // Indexed before the run so a spec that crashes before producing any
  // attachment can still be reported against the snapshot it was meant to cover.
  await loadDeclaredSnapshotIndex();

  const preflight = await runPreflight();
  const visualBaselineCount = preflight.baseline.foundCount;

  log(
    `Baseline directory: ${settings.baselineDir} (${visualBaselineCount} approved ${APPROVED_PLATFORM} PNG files, ${preflight.baseline.verifiedCount} checksum-verified)`,
  );
  log(`Baseline revision: ${preflight.baseline.baselineRevision || 'unknown'}`);
  log(
    `Coverage registry: ${preflight.registryValid ? 'valid' : 'INVALID'} (${
      preflight.coverage?.counts.registered ?? 0
    } registered scenarios, ${preflight.coverage?.counts.expectedSnapshots ?? 0} expected snapshots)`,
  );
  logPreflightReport(preflight);

  if (preflight.fatal.length > 0) {
    // Cannot compare at all. Still classified, still reported, still archived.
    log('Preflight status: FATAL — visual execution cannot proceed.');
    analysis = createUnexecutedRun(preflight);
  } else {
    if (!options.reuseResults) {
      playwrightExitCode = await runPlaywright();
    } else {
      log('Skipping Playwright execution and packaging existing results (--reuse-results).');
    }

    analysis = await analyzeRun(playwrightExitCode, visualBaselineCount);
    analysis.baseline = preflight.baseline;
    analysis.environment = environmentMetadata();
    analysis.git = gitMetadata();
    analysis.coverage = await buildRunCoverage(preflight);
    applyCoverageToAnalysis(analysis, preflight);
  }

  finalizeAnalysis(analysis);
  summaryMarkdown = renderSummaryMarkdown(analysis);
  await writeSummaryFiles(analysis, summaryMarkdown);
  await appendGitHubStepSummary(summaryMarkdown);
  printTerminalSummary(analysis);
  emitGitHubAnnotations(analysis);

  archivePath = await createArchive(analysis, summaryMarkdown);
  const archiveSha256 = await sha256File(archivePath);
  analysis.archiveSha256 = archiveSha256;
  // Re-write summary.json so the archive checksum is part of the canonical
  // machine-readable result the notifier and the workflow gate read.
  await writeSummaryFiles(analysis, summaryMarkdown);
  log(`Artifact archive: ${toWorkspacePath(archivePath)}`);
  log(`Archive SHA-256: ${archiveSha256}`);

  process.exitCode = analysis.gate.exitCode;
} catch (error) {
  // The engine itself threw. Evidence generation must still happen: without a
  // summary.json the downstream gate and notifier have nothing to classify, and
  // the run is indistinguishable from "no result at all". Previously this branch
  // only logged, so an engine crash produced a bare exit code and no artifact.
  console.error(`[visual-regression] ERROR: ${error.stack || error.message || String(error)}`);

  try {
    analysis = createEngineFailureRun(error, analysis);
    finalizeAnalysis(analysis);
    summaryMarkdown = renderSummaryMarkdown(analysis);
    await writeSummaryFiles(analysis, summaryMarkdown);
    await appendGitHubStepSummary(summaryMarkdown);
    printTerminalSummary(analysis);
    emitGitHubAnnotations(analysis);
    log('Engine failure recorded in summary.json; downstream reporting can proceed.');
    process.exitCode = analysis.gate.exitCode;
  } catch (writeError) {
    // Nothing else can be done — but say so explicitly rather than exiting
    // silently, so the absent summary is attributable.
    console.error(
      `[visual-regression] FATAL: could not record the engine failure: ${
        writeError.stack || writeError.message || String(writeError)
      }`,
    );
    process.exitCode = 1;
  }
}

/**
 * Result shape for an engine crash.
 *
 * Preserves whatever the run had already classified before it threw, so a crash
 * during archiving does not discard real visual differences that were found.
 */
function createEngineFailureRun(error, partial) {
  const base = partial && typeof partial === 'object' ? partial : {};

  return {
    createdAt: new Date().toISOString(),
    command,
    ci: Boolean(process.env.CI),
    strict: options.strict,
    platform: process.platform,
    node: process.version,
    playwrightExitCode: base.playwrightExitCode ?? null,
    executed: base.executed ?? false,
    engineFailed: true,
    baselineDir: settings.baselineDir,
    visualBaselineCount: base.visualBaselineCount ?? 0,
    baseline: base.baseline ?? null,
    coverage: base.coverage ?? null,
    environment: base.environment ?? safely(environmentMetadata),
    git: base.git ?? safely(gitMetadata),
    playwrightReport: path.join(settings.playwrightReportDir, 'index.html'),
    testResults: settings.testResultsDir,
    archiveName: settings.archiveName,
    totalTests: base.totalTests ?? 0,
    expected: base.expected ?? 0,
    skipped: base.skipped ?? 0,
    flaky: base.flaky ?? [],
    visualDifferences: base.visualDifferences ?? [],
    captureFailures: base.captureFailures ?? [],
    missingBaselines: base.missingBaselines ?? [],
    coverageProblems: base.coverageProblems ?? [],
    infrastructureFailures: [
      ...(base.infrastructureFailures ?? []),
      {
        snapshot: 'visual regression engine',
        title: 'Visual regression engine threw',
        file: 'scripts/visual-regression-ci.mjs',
        message: `${error.message || String(error)}\n\n${error.stack || ''}`.trim(),
        comparisonPerformed: false,
      },
    ],
    notification: base.notification ?? initialNotificationState(),
  };
}

/** Best-effort metadata collection that must not mask the original error. */
function safely(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

/**
 * Baseline + coverage preflight.
 *
 * Collects findings and classifies them. It answers exactly one yes/no question:
 * "can a meaningful screenshot comparison happen at all?" Everything else is
 * recorded and carried into the summary while the run continues.
 *
 * FATAL (comparison technically impossible):
 *   - running on a platform whose renderer does not match the approved baselines
 *   - no approved baseline set whatsoever for this platform
 *   - the visual spec directory does not exist
 *
 * NON-FATAL (recorded, run continues):
 *   - individual missing approved baselines   -> BASELINE_MISSING
 *   - coverage registry inconsistencies       -> COVERAGE_MISMATCH
 *   - an unreadable/invalid registry          -> COVERAGE_MISMATCH (the suite can
 *     still run; only the expected-snapshot list is untrustworthy)
 *   - baseline checksum mismatches            -> INFRASTRUCTURE_FAILURE
 */
async function runPreflight() {
  const result = {
    baseline: null,
    coverage: null,
    registryValid: false,
    // Findings, already classified.
    baselineMissing: [],
    coverageProblems: [],
    infrastructureFailures: [],
    // Only conditions that make comparison impossible.
    fatal: [],
  };

  result.baseline = await verifyBaselines({ platform: APPROVED_PLATFORM });

  // A checksum mismatch means the approved set on disk is not the approved set
  // that was reviewed. That is an integrity problem with the engine's inputs,
  // not a visual change — but it does not stop the other screens comparing.
  if (baselineVerificationBlocking(result.baseline)) {
    for (const message of baselineVerificationMessages(result.baseline)) {
      result.infrastructureFailures.push({
        snapshot: 'approved baseline set',
        title: 'Approved baseline integrity',
        file: settings.baselineDir,
        message,
      });
    }
  }

  if ((result.baseline.foundCount ?? 0) === 0) {
    result.fatal.push({
      snapshot: 'approved baseline set',
      title: 'No approved baselines',
      file: settings.baselineDir,
      message:
        `No approved "${APPROVED_PLATFORM}" baselines exist in ${settings.baselineDir}, so no comparison is possible. ` +
        'Render candidates with the Visual Regression Baseline workflow, review them, then approve and commit.',
    });
  }

  // Guard against comparing baselines with a different renderer. macOS and
  // Linux rasterize fonts differently, so a Darwin screenshot against a Linux
  // baseline reports 1-3% false diffs on every text-bearing screen. Continuing
  // would produce confidently wrong "visual differences", which is worse than
  // not running.
  if (process.platform !== APPROVED_PLATFORM) {
    result.fatal.push({
      snapshot: 'rendering environment',
      title: 'Wrong rendering platform',
      file: settings.baselineDir,
      message:
        `This wrapper compares against approved "${APPROVED_PLATFORM}" baselines but is running on "${process.platform}". ` +
        'Every text-bearing screen would report a false difference. Run the pipeline through Docker instead: "npm run test:regression:ci".',
    });
  } else if (APPROVED_PLATFORM !== CANONICAL_PLATFORM) {
    log(
      `NON-CANONICAL RUN: comparing against "${APPROVED_PLATFORM}" baselines via VISUAL_REGRESSION_APPROVED_PLATFORM. ` +
        `Only "${CANONICAL_PLATFORM}" baselines are approved for merge decisions.`,
    );
  }

  // Playwright's {platform} token is "linux" for BOTH linux/amd64 and
  // linux/arm64, but Chromium rasterizes text differently on the two. Comparing
  // an amd64 render against an arm64-approved baseline produces a small
  // difference on every text-bearing screen, which would be reported as ~50
  // visual changes that no developer caused. Reported as an infrastructure
  // problem so the run cannot be mistaken for a trustworthy comparison, but NOT
  // fatal: the comparison still runs and the evidence is still worth having.
  const baselineArch = result.baseline?.manifestArchitecture ?? null;
  if (baselineArch && baselineArch !== process.arch) {
    result.infrastructureFailures.push({
      snapshot: 'rendering architecture',
      title: 'Baseline architecture mismatch',
      file: settings.baselineDir,
      message:
        `The approved baselines were rendered on "${baselineArch}" but this run is on "${process.arch}". ` +
        'Chromium rasterizes text differently across CPU architectures, so text-bearing screens will report ' +
        'differences that are rendering artefacts rather than real UI changes. Pin the canonical architecture ' +
        '(VISUAL_REGRESSION_DOCKER_PLATFORM) or re-approve the baseline set on the architecture CI uses.',
      comparisonPerformed: false,
    });
  }

  // Rendering-environment drift.
  //
  // The base image tag is floating, so an image rebuilt weeks later can carry a
  // different fontconfig/freetype and shift Chromium text rasterization on every
  // text-bearing screen. That produces a run where ~every compared snapshot
  // "changed" while no application code did. Recorded as a coverage-maintenance
  // finding so the report explains the pattern instead of presenting 40+ false
  // visual changes with no context.
  const baselineDigest = result.baseline?.manifestEnvironment?.imageDigest ?? null;
  const runDigest = process.env.VISUAL_REGRESSION_IMAGE_DIGEST || null;
  if (baselineDigest && runDigest && baselineDigest !== runDigest) {
    result.coverageProblems.push({
      snapshot: 'rendering environment',
      kind: 'image-digest-drift',
      reason:
        `The approved baselines were rendered by image ${short(baselineDigest)} but this run used ${short(runDigest)}. ` +
        'The base image tag is floating, so the font stack may differ. If many unrelated snapshots report ' +
        'full-page differences, suspect this before suspecting the UI.',
      spec: settings.baselineDir,
    });
  } else if (!baselineDigest && runDigest) {
    result.coverageProblems.push({
      snapshot: 'rendering environment',
      kind: 'baseline-provenance-incomplete',
      reason:
        'The approved baseline manifest records no image digest, so this run cannot prove it rendered in the ' +
        'same environment the baselines were approved in. Regenerate the manifest on the next approved ' +
        'baseline update to close this gap.',
      spec: settings.baselineDir,
    });
  }

  if (!fsSync.existsSync(path.resolve(repoRoot, settings.testDir))) {
    result.fatal.push({
      snapshot: 'visual spec directory',
      title: 'Visual spec directory missing',
      file: settings.testDir,
      message:
        `The configured visual spec directory "${settings.testDir}" does not exist, so no scenario can execute. ` +
        'Check VISUAL_REGRESSION_TEST_DIR.',
    });
  }

  try {
    result.coverage = await buildCoverage({
      platform: APPROVED_PLATFORM,
      profile: options.profile,
    });
    result.registryValid = true;

    result.baselineMissing.push(...baselineMissingFindings(result.coverage));
    result.coverageProblems.push(...coverageMismatchFindings(result.coverage));
  } catch (error) {
    // An invalid registry makes the expected-snapshot list untrustworthy, so
    // coverage scoring is suppressed — but the specs themselves are unaffected
    // and their comparisons are still worth having.
    result.coverageProblems.push({
      snapshot: 'visual coverage registry',
      kind: 'invalid-registry',
      reason: `${error.message} Coverage scoring is unavailable for this run; screenshot comparison continues.`,
      spec: 'tests/regression/visual-coverage.manifest.json',
    });
  }

  return result;
}

/** Human-readable preflight block, mirroring the required PRECHECK shape. */
function logPreflightReport(preflight) {
  const coverage = preflight.coverage;
  const status = preflight.fatal.length > 0
    ? 'FATAL'
    : preflight.baselineMissing.length > 0 ||
        preflight.coverageProblems.length > 0 ||
        preflight.infrastructureFailures.length > 0
      ? 'WARNING / INCOMPLETE'
      : 'OK';

  log('PRECHECK');
  log(`  baseline manifest integrity:   ${preflight.infrastructureFailures.length === 0 ? 'OK' : 'FAILED'}`);
  log(`  expected screenshots:          ${coverage?.counts.expectedInProfile ?? 'unknown'}`);
  log(`  approved baselines:            ${coverage?.counts.approvedBaselines ?? 'unknown'}`);
  log(`  missing baselines:             ${preflight.baselineMissing.length}`);
  log(`  coverage inconsistencies:      ${preflight.coverageProblems.length}`);
  log(`  Preflight status:              ${status}`);
  log(`  Continue visual execution:     ${preflight.fatal.length > 0 ? 'NO' : 'YES'}`);

  for (const finding of preflight.fatal) {
    log(`  FATAL: ${finding.title} — ${firstLine(finding.message)}`);
  }
}

/**
 * Coverage scored against what the run actually produced.
 *
 * `approvedSnapshotIds` comes from the PREFLIGHT, not from re-listing the
 * snapshot directory. Playwright writes a missing snapshot to disk before failing
 * the test, so re-listing here would count those unapproved images as approved
 * and report better coverage than the repository actually has.
 */
async function buildRunCoverage(preflight) {
  try {
    const outcomes = await readPlaywrightOutcomes(paths.resultsJson);
    return await buildCoverage({
      platform: APPROVED_PLATFORM,
      profile: options.profile,
      outcomes,
      approvedSnapshotIds: preflight.baseline?.approvedSnapshotIds ?? null,
    });
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Fold coverage findings into the classified result lists.
 *
 * A snapshot that was expected but never captured is a *capture failure*, not a
 * passing test. Without this, a suite whose test silently stopped short would
 * report "all green".
 *
 * Coverage-derived capture failures are deduplicated against the ones the
 * Playwright report already produced: a spec that threw before its screenshot
 * assertion shows up in BOTH sources, and reporting it twice would double-count
 * the same broken screen.
 */
function applyCoverageToAnalysis(analysis, preflight) {
  // Registry inconsistencies and integrity problems are known before the run
  // and are unaffected by it.
  analysis.coverageProblems.push(...preflight.coverageProblems);
  analysis.infrastructureFailures.push(...preflight.infrastructureFailures);

  const coverage = analysis.coverage;
  if (!coverage || coverage.error) return;

  const alreadyReported = new Set(
    [
      ...analysis.captureFailures.map((entry) => entry.snapshot),
      ...analysis.visualDifferences.map((entry) => entry.snapshot),
      ...analysis.missingBaselines.map((entry) => entry.snapshot),
    ].filter(Boolean),
  );

  for (const entry of captureFailureFindings(coverage)) {
    if (alreadyReported.has(entry.snapshot)) continue;
    analysis.captureFailures.push({
      title: `Expected snapshot never captured: ${entry.snapshot}`,
      ...entry,
    });
  }

  // Baselines that the registry knows are absent, but which Playwright never
  // reported because the spec did not get far enough to ask for them.
  const reportedMissing = new Set(analysis.missingBaselines.map((entry) => entry.snapshot));
  for (const entry of baselineMissingFindings(coverage)) {
    if (reportedMissing.has(entry.snapshot)) continue;
    if (alreadyReported.has(entry.snapshot)) continue;
    analysis.missingBaselines.push({
      title: `No approved baseline: ${entry.snapshot}`,
      ...entry,
    });
  }
}

function environmentMetadata() {
  return {
    platform: process.platform,
    // Recorded because {platform} in the snapshot path cannot distinguish
    // linux/arm64 from linux/amd64, yet they render text differently.
    architecture: process.arch,
    dockerPlatform: process.env.VISUAL_REGRESSION_DOCKER_PLATFORM || null,
    approvedPlatform: APPROVED_PLATFORM,
    canonicalPlatform: CANONICAL_PLATFORM,
    canonicalBaselineSet: APPROVED_PLATFORM === CANONICAL_PLATFORM,
    node: process.version,
    playwrightVersion: playwrightVersion(),
    dockerBaseImage: process.env.VISUAL_REGRESSION_DOCKER_BASE_IMAGE || 'node:24-bookworm-slim',
    imageDigest: process.env.VISUAL_REGRESSION_IMAGE_DIGEST || null,
    dockerImage: process.env.VISUAL_REGRESSION_DOCKER_IMAGE || null,
    project: settings.project,
    profile: options.profile,
    retries: settings.retries,
    timezone: process.env.TZ || null,
    ci: Boolean(process.env.CI),
    diagnosticMode: isTruthy(process.env.VISUAL_REGRESSION_DIAGNOSTIC),
  };
}

/**
 * Run provenance. In CI these come from the workflow (the container has no
 * .git, so the launcher passes them in); locally they come from git directly.
 */
function gitMetadata() {
  return {
    branch: process.env.GIT_BRANCH || git(['rev-parse', '--abbrev-ref', 'HEAD']),
    headSha: process.env.GITHUB_HEAD_SHA || process.env.GIT_COMMIT || git(['rev-parse', 'HEAD']),
    baseSha: process.env.GITHUB_BASE_SHA || null,
    mergeSha: process.env.GITHUB_MERGE_SHA || null,
    baseRef: process.env.GITHUB_BASE_REF || null,
    pullRequestNumber: process.env.GITHUB_PR_NUMBER || null,
    event: process.env.GITHUB_EVENT_NAME || null,
    repository: process.env.GITHUB_REPOSITORY || null,
    runId: process.env.GITHUB_RUN_ID || null,
    runNumber: process.env.GITHUB_RUN_NUMBER || null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
    workflow: process.env.GITHUB_WORKFLOW || null,
  };
}

/**
 * Playwright `--grep` for an execution profile.
 *
 * `VISUAL_REGRESSION_GREP` still wins when set explicitly, so the controlled
 * failure-simulation commands in the docs keep working unchanged.
 */
async function resolveProfileGrep(profile) {
  if (process.env.VISUAL_REGRESSION_GREP) return process.env.VISUAL_REGRESSION_GREP;

  try {
    const registry = await readRegistry();
    const entry = registry.profiles?.[profile];

    if (!entry) {
      log(
        `Unknown execution profile "${profile}"; falling back to the full set (${settings.grep}).`,
      );
      return settings.grep;
    }

    if (profile === 'changed') {
      log(
        'Profile "changed" is not implemented as a narrowed selection: it runs the full registered set so a change-impact miss cannot hide a broken screen.',
      );
    }

    return entry.grep || settings.grep;
  } catch {
    // A broken registry is caught and classified by the preflight; do not fail
    // here, or the run would die before it can report *why*.
    return settings.grep;
  }
}

function printHelp() {
  console.log(`Usage: node scripts/visual-regression-ci.mjs [--strict] [--no-clean] [--reuse-results] [--profile <name>] [playwright args...]

Runs the @visual-regression Playwright suite, writes structured summaries, and
packages one CI artifact archive without auto-updating approved baselines.

Profiles (see tests/regression/visual-coverage.manifest.json):
  full         Every non-excluded registered scenario. Default.
  smoke        Critical representative subset (@visual-smoke).
  changed      Falls back to full on purpose; never silently narrows.
  baseline     Same set as full, used by candidate generation.
  diagnostic   Same set as full with traces/video retained for every scenario.

Environment:
  VISUAL_REGRESSION_PROFILE       Execution profile. Default: full
  VISUAL_REGRESSION_GREP          Explicit Playwright grep filter; overrides the profile.
  VISUAL_REGRESSION_PROJECT       Playwright project. Default: chromium
  VISUAL_REGRESSION_RETRIES       Playwright retries for the visual suite. Default: 0
  VISUAL_REGRESSION_DIAGNOSTIC    When true, retain traces/video for every scenario.
  VISUAL_BASELINE_DIR             Approved snapshots. Default: tests/regression/snapshots
  VISUAL_COVERAGE_REGISTRY        Coverage registry path.
  VISUAL_REGRESSION_ARTIFACT_DIR  Artifact output directory. Default: visual-regression-artifacts
  VISUAL_REGRESSION_STRICT        When true, visual diffs return exit code 1.
`);
}

async function prepareOutputDirectories() {
  await fs.mkdir(paths.artifactDir, { recursive: true });

  if (options.noClean || options.reuseResults) {
    return;
  }

  await Promise.all([
    fs.rm(paths.testResultsDir, { recursive: true, force: true }),
    fs.rm(paths.playwrightReportDir, { recursive: true, force: true }),
    emptyDirectory(paths.artifactDir),
  ]);

  await fs.mkdir(paths.artifactDir, { recursive: true });
}

async function emptyDirectory(directoryPath) {
  if (!fsSync.existsSync(directoryPath)) return;

  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  await Promise.all(
    entries.map((entry) =>
      fs.rm(path.join(directoryPath, entry.name), { recursive: true, force: true }),
    ),
  );
}

async function runPlaywright() {
  const bin = playwrightBinary();

  return await new Promise((resolve, reject) => {
    const child = spawn(bin, playwrightArgs, {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => resolve(code || 0));
  });
}

async function analyzeRun(playwrightExitCode, visualBaselineCount) {
  const base = {
    createdAt: new Date().toISOString(),
    command,
    ci: Boolean(process.env.CI),
    strict: options.strict,
    platform: process.platform,
    node: process.version,
    playwrightExitCode,
    baselineDir: settings.baselineDir,
    visualBaselineCount,
    playwrightReport: path.join(settings.playwrightReportDir, 'index.html'),
    testResults: settings.testResultsDir,
    archiveName: settings.archiveName,
    executed: true,
    totalTests: 0,
    expected: 0,
    skipped: 0,
    flaky: [],
    visualDifferences: [],
    captureFailures: [],
    missingBaselines: [],
    coverageProblems: [],
    infrastructureFailures: [],
    preflightFailed: false,
    // Filled in by scripts/notify-visual-regression.mjs. Present up front so
    // consumers can rely on the field existing even if notification never ran.
    notification: initialNotificationState(),
  };

  const resultsJson = await readJsonIfExists(paths.resultsJson);
  if (!resultsJson) {
    // No JSON report at all. Playwright could not report, so the engine cannot
    // classify anything: that is an infrastructure failure, not a clean run.
    if (playwrightExitCode !== 0) {
      base.infrastructureFailures.push({
        snapshot: 'playwright json report',
        title: 'Playwright JSON report missing',
        file: toWorkspacePath(paths.resultsJson),
        message:
          `Playwright exited ${playwrightExitCode} and ${settings.testResultsDir}/results.json was not produced, so no result could be classified. ` +
          'Check the pipeline log for a browser launch or worker crash.',
      });
    }
    return base;
  }

  const tests = flattenPlaywrightTests(resultsJson);
  base.totalTests = tests.length;

  for (const testCase of tests) {
    if (testCase.status === 'expected') {
      base.expected += 1;
      continue;
    }

    if (testCase.status === 'skipped') {
      base.skipped += 1;
      continue;
    }

    if (testCase.status === 'flaky') {
      base.flaky.push(toFailureRecord(testCase, latestNonPassingResult(testCase)));
      continue;
    }

    const result = latestNonPassingResult(testCase);
    const classification = await classifyFailure(testCase, result);

    switch (classification.category) {
      case CATEGORY.VISUAL_CHANGES:
        base.visualDifferences.push(classification.record);
        break;
      case CATEGORY.BASELINE_MISSING:
        base.missingBaselines.push(classification.record);
        break;
      case CATEGORY.INFRASTRUCTURE_FAILURE:
        base.infrastructureFailures.push(classification.record);
        break;
      default:
        base.captureFailures.push(classification.record);
        break;
    }
  }

  if (
    playwrightExitCode !== 0 &&
    base.visualDifferences.length === 0 &&
    base.missingBaselines.length === 0 &&
    base.captureFailures.length === 0 &&
    base.infrastructureFailures.length === 0
  ) {
    // Playwright failed but the report explains nothing. Selecting zero tests is
    // a configuration/infrastructure problem, not a clean run.
    base.infrastructureFailures.push({
      snapshot: tests.length === 0 ? 'test selection' : 'playwright run',
      title: 'Playwright exited non-zero without a classified test failure',
      file: settings.testDir,
      project: settings.project,
      status: 'failed',
      durationMs: 0,
      message:
        tests.length === 0
          ? `Playwright selected no tests (grep "${profileGrep}", project "${settings.project}", dir "${settings.testDir}"). Nothing was compared.`
          : `Playwright exited with code ${playwrightExitCode}, but the JSON report contained no screenshot diff, missing baseline, or failed test result.`,
    });
  }

  return base;
}

/** Notification state placeholder, so the field always exists. */
function initialNotificationState() {
  return {
    status: 'not-attempted',
    attempted: false,
    delivered: false,
    failureKind: null,
    missingVariables: [],
    message: 'Notification has not run yet.',
  };
}

/**
 * Derive every downstream field from the classified finding lists.
 *
 * This is the ONLY place the run's state, comparison counters, categories, gate
 * and legacy status are computed. The CI gate, the notifier and the artifact
 * manifest read these fields; none of them recompute a verdict.
 */
function finalizeAnalysis(analysis) {
  for (const field of [
    'visualDifferences',
    'captureFailures',
    'missingBaselines',
    'coverageProblems',
    'infrastructureFailures',
  ]) {
    if (!Array.isArray(analysis[field])) analysis[field] = [];
  }

  const coverage = analysis.coverage && !analysis.coverage.error ? analysis.coverage : null;

  // A missing baseline only counts as a CAPTURE when a screenshot was actually
  // taken — i.e. Playwright ran the assertion, wrote an `actual` image, and found
  // no approved image to compare it with. Baselines the coverage registry knows
  // are absent for a scenario that never executed captured nothing, and counting
  // those would report captures for a run that took no screenshots at all.
  const capturedWithoutBaseline = analysis.missingBaselines.filter(
    (entry) => entry.actual,
  ).length;

  // `producedSnapshots` already includes these: it counts a snapshot as produced
  // when the run attached an image for it, and a missing-baseline failure attaches
  // its `-actual.png`. Adding them again reported captured > expected.
  const captured = coverage?.counts.producedSnapshots ?? capturedWithoutBaseline;

  analysis.comparison = buildComparison({
    expected: coverage?.counts.expectedInProfile ?? 0,
    captured,
    changed: analysis.visualDifferences.length,
    missingBaselines: capturedWithoutBaseline,
  });

  analysis.categories = presentCategories(analysis);
  analysis.state = deriveState(analysis);
  analysis.status = legacyStatus(analysis, { strict: options.strict });
  analysis.gate = buildGate(analysis, {
    strict: options.strict,
    failOnInfrastructure: options.failOnInfrastructure,
  });

  // Backwards compatibility. `executionFailures` was the single bucket for
  // "something other than a visual difference went wrong"; it is now the union
  // of the two categories that replaced it. Consumers should prefer the
  // specific fields — this exists so an older reader does not silently see zero.
  analysis.executionFailures = [
    ...analysis.captureFailures,
    ...analysis.infrastructureFailures,
  ];

  return analysis;
}

/**
 * Result shape for a run that could not execute at all.
 *
 * Reached only from `preflight.fatal`. Every finding keeps its own
 * classification, and the summary/artifact/notification path still runs, so a
 * fatal preflight produces evidence rather than silence.
 */
function createUnexecutedRun(preflight) {
  return {
    createdAt: new Date().toISOString(),
    command,
    ci: Boolean(process.env.CI),
    strict: options.strict,
    platform: process.platform,
    node: process.version,
    playwrightExitCode: null,
    executed: false,
    preflightFailed: true,
    baselineDir: settings.baselineDir,
    visualBaselineCount: preflight.baseline?.foundCount ?? 0,
    baseline: preflight.baseline,
    coverage: preflight.coverage,
    environment: environmentMetadata(),
    git: gitMetadata(),
    playwrightReport: path.join(settings.playwrightReportDir, 'index.html'),
    testResults: settings.testResultsDir,
    archiveName: settings.archiveName,
    totalTests: 0,
    expected: 0,
    skipped: 0,
    flaky: [],
    visualDifferences: [],
    captureFailures: [],
    missingBaselines: preflight.baselineMissing,
    coverageProblems: preflight.coverageProblems,
    // A fatal preflight IS an infrastructure failure: the engine could not do
    // its job, so this run must never read as a successful comparison.
    infrastructureFailures: [...preflight.infrastructureFailures, ...preflight.fatal],
    notification: initialNotificationState(),
  };
}

function flattenPlaywrightTests(resultsJson) {
  const tests = [];

  function visitSuite(suite, titles) {
    const nextTitles = suite.title ? [...titles, suite.title] : titles;

    for (const spec of suite.specs || []) {
      for (const testCase of spec.tests || []) {
        tests.push({
          title: [...nextTitles, spec.title].filter(Boolean).join(' > '),
          file: spec.file || suite.file || '',
          line: spec.line,
          column: spec.column,
          projectName: testCase.projectName || testCase.projectId || '',
          expectedStatus: testCase.expectedStatus,
          status: testCase.status,
          results: testCase.results || [],
        });
      }
    }

    for (const child of suite.suites || []) {
      visitSuite(child, nextTitles);
    }
  }

  for (const suite of resultsJson.suites || []) {
    visitSuite(suite, []);
  }

  return tests;
}

/**
 * Classify one non-passing Playwright test into a category.
 *
 * The order matters:
 *   1. missing baseline  — no expected image, so no comparison was possible
 *   2. visual difference — a real comparison ran and produced expected/actual/diff
 *   3. infrastructure    — the harness itself broke
 *   4. capture failure   — the spec never reached its screenshot assertion
 *
 * Step 4 is the default because it is the honest answer for "the test failed and
 * we have no comparison": an outdated locator must never be reported as a visual
 * change, because no pixels were ever compared.
 */
async function classifyFailure(testCase, result) {
  const record = toFailureRecord(testCase, result);
  const message = record.message;
  const hasScreenshotAssertion =
    /toHaveScreenshot|image snapshot|screenshot comparison|snapshot.*image|pixels?.*different/i.test(
      message,
    );
  const missingBaseline =
    /snapshot doesn't exist|snapshot does not exist|missing snapshot|no approved visual baseline|writing actual/i.test(
      message,
    );

  const evidenceRefs = extractEvidenceRefs(message);
  const attachmentRefs = extractAttachmentRefs(result);
  const allRefs = { ...evidenceRefs, ...attachmentRefs };
  const resolved = resolveEvidencePaths(allRefs, testCase.file);

  const inferred = inferSiblingEvidence(resolved);
  const evidence = { ...resolved, ...inferred };

  // Snapshot IDs the spec declares for this test, so a failure that produced no
  // attachments can still name the screen whose coverage was lost.
  const declared = declaredSnapshotsFor(testCase);

  if (missingBaseline) {
    return {
      category: CATEGORY.BASELINE_MISSING,
      record: {
        ...record,
        snapshot:
          evidenceRefs.snapshot || snapshotNameFromPath(evidence.actual) || declared[0] || null,
        expected: null,
        actual: toWorkspacePath(evidence.actual),
        diff: null,
        comparisonPerformed: false,
        reason:
          'Playwright found no approved baseline for this snapshot. A current screenshot may exist, ' +
          'but there is no approved previous screenshot to compare it against.',
      },
    };
  }

  if (hasScreenshotAssertion && evidence.expected && evidence.actual && evidence.diff) {
    const parsedPixelSummary = parsePixelSummary(message);
    const imageStats = await buildImageStats(evidence.expected, evidence.actual);

    return {
      category: CATEGORY.VISUAL_CHANGES,
      record: {
        ...record,
        snapshot: evidenceRefs.snapshot || snapshotNameFromPath(evidence.actual),
        spec: record.file,
        comparisonPerformed: true,
        changedPixels: parsedPixelSummary.changedPixels ?? imageStats.changedPixels,
        changedRatio: parsedPixelSummary.changedRatio ?? imageStats.changedRatio,
        rawChangedPixels: imageStats.changedPixels,
        rawChangedRatio: imageStats.changedRatio,
        changedRegion: imageStats.boundingBox,
        dimensions: imageStats.dimensions,
        expected: toWorkspacePath(evidence.expected),
        actual: toWorkspacePath(evidence.actual),
        diff: toWorkspacePath(evidence.diff),
      },
    };
  }

  if (INFRASTRUCTURE_SIGNATURES.some((pattern) => pattern.test(message))) {
    return {
      category: CATEGORY.INFRASTRUCTURE_FAILURE,
      record: {
        ...record,
        snapshot: declared[0] || record.title,
        spec: record.file,
        comparisonPerformed: false,
      },
    };
  }

  // The spec failed before it could assert a screenshot. This is the case that
  // used to be reported as an opaque "execution failure" next to real Docker
  // breakage, and the one a renamed button produces.
  return {
    category: CATEGORY.CAPTURE_FAILURE,
    record: {
      ...record,
      snapshot: declared[0] || record.title,
      snapshots: declared,
      spec: record.file,
      error: firstLine(message),
      comparisonPerformed: false,
      reason:
        'The spec did not reach its screenshot assertion, so no visual comparison was performed. ' +
        'Coverage for this screen is unavailable until the spec is repaired.',
    },
  };
}

/**
 * Populate the declared-snapshot index from the static spec scan, so a test that
 * crashed before producing any attachment can still be reported against the
 * screen it covers. `declaredSnapshotIndex` is declared at the top of the module.
 */
async function loadDeclaredSnapshotIndex() {
  const index = new Map();
  try {
    const snapshots = await discoverSpecSnapshots({ grep: settings.grep });
    for (const snapshot of snapshots) {
      const key = declaredKey(snapshot.spec, snapshot.testTitle);
      index.set(key, [...(index.get(key) || []), snapshot.snapshotId]);
    }
  } catch (error) {
    log(`Could not index declared snapshots: ${error.message}`);
  }
  declaredSnapshotIndex = index;
}

function declaredKey(specPath, testTitle) {
  return `${path.basename(String(specPath || ''))}::${testTitle}`;
}

function declaredSnapshotsFor(testCase) {
  if (!declaredSnapshotIndex) return [];
  // `testCase.title` is "describe > test"; the index keys on the test title.
  const titles = String(testCase.title || '').split(' > ');
  const leaf = titles[titles.length - 1];
  return declaredSnapshotIndex.get(declaredKey(testCase.file, leaf)) || [];
}

function toFailureRecord(testCase, result) {
  return {
    title: testCase.title,
    file: formatFileLine(testCase.file, testCase.line),
    project: testCase.projectName,
    status: result?.status || testCase.status || 'unknown',
    durationMs: result?.duration || 0,
    attachments: summarizeAttachments(result),
    message: compactErrorMessage(result),
  };
}

function summarizeAttachments(result) {
  return (result?.attachments || [])
    .filter((attachment) => attachment.path)
    .map((attachment) => ({
      name: attachment.name || path.basename(attachment.path),
      contentType: attachment.contentType || 'application/octet-stream',
      path: toWorkspacePath(attachment.path),
    }));
}

function latestNonPassingResult(testCase) {
  const results = testCase.results || [];
  return (
    [...results].reverse().find((result) => !['passed', 'skipped'].includes(result.status)) ||
    results[results.length - 1] ||
    null
  );
}

function compactErrorMessage(result) {
  if (!result) return '';
  const messages = [];

  for (const error of result.errors || []) {
    if (error.message) messages.push(error.message);
    if (error.stack) messages.push(error.stack);
  }

  if (result.error?.message) messages.push(result.error.message);
  if (result.error?.stack) messages.push(result.error.stack);

  return stripAnsi(messages.join('\n\n')).slice(0, 8000);
}

function extractEvidenceRefs(message) {
  return {
    snapshot: matchLineValue(message, /Snapshot:\s*(.+)/i),
    expected: matchLineValue(message, /Expected:\s*(.+)/i),
    actual:
      matchLineValue(message, /Received:\s*(.+)/i) ||
      matchLineValue(message, /Actual:\s*(.+)/i),
    diff: matchLineValue(message, /Diff:\s*(.+)/i),
  };
}

function extractAttachmentRefs(result) {
  const refs = {};

  for (const attachment of result?.attachments || []) {
    if (!attachment.path) continue;
    const name = `${attachment.name || ''} ${attachment.path}`.toLowerCase();

    if (name.includes('expected')) refs.expected = attachment.path;
    if (name.includes('actual') || name.includes('received')) refs.actual = attachment.path;
    if (name.includes('diff')) refs.diff = attachment.path;
  }

  return refs;
}

function matchLineValue(message, pattern) {
  const match = message.match(pattern);
  if (!match) return null;
  return match[1].trim().replace(/^["']|["']$/g, '');
}

function resolveEvidencePaths(refs, specFile) {
  return Object.fromEntries(
    Object.entries(refs).map(([key, ref]) => [key, resolveExistingPath(ref, specFile)]),
  );
}

function inferSiblingEvidence(evidence) {
  const inferred = {};
  const known = evidence.actual || evidence.diff || evidence.expected;
  if (!known) return inferred;

  const fileName = path.basename(known);
  const dir = path.dirname(known);
  const baseName = fileName
    .replace(/-(actual|expected|diff)\.png$/i, '')
    .replace(/\.png$/i, '');

  for (const type of ['expected', 'actual', 'diff']) {
    if (!evidence[type]) {
      const candidate = path.join(dir, `${baseName}-${type}.png`);
      if (fsSync.existsSync(candidate)) inferred[type] = candidate;
    }
  }

  return inferred;
}

function resolveExistingPath(ref, specFile) {
  if (!ref) return null;

  const cleaned = ref.trim();
  if (path.isAbsolute(cleaned)) {
    return fsSync.existsSync(cleaned) ? cleaned : null;
  }

  const specPath = specFile
    ? path.resolve(repoRoot, specFile.startsWith('tests/') ? specFile : path.join('tests', specFile))
    : null;
  const candidates = [
    path.resolve(repoRoot, cleaned),
    path.resolve(repoRoot, 'tests', cleaned),
    path.resolve(repoRoot, settings.testResultsDir, cleaned),
    specPath ? path.resolve(path.dirname(specPath), cleaned) : null,
  ].filter(Boolean);

  return candidates.find((candidate) => fsSync.existsSync(candidate)) || null;
}

function parsePixelSummary(message) {
  const match = message.match(
    /([\d,]+)\s+pixels?\s+\(ratio\s+([0-9.]+)\s+of all image pixels\)\s+are different/i,
  );
  if (!match) return { changedPixels: null, changedRatio: null };

  return {
    changedPixels: Number(match[1].replace(/,/g, '')),
    changedRatio: Number(match[2]),
  };
}

async function buildImageStats(expectedPath, actualPath) {
  try {
    const [expected, actual] = await Promise.all([
      decodePng(expectedPath),
      decodePng(actualPath),
    ]);

    if (expected.width !== actual.width || expected.height !== actual.height) {
      return {
        dimensions: {
          expected: `${expected.width}x${expected.height}`,
          actual: `${actual.width}x${actual.height}`,
        },
        changedPixels: null,
        changedRatio: null,
        boundingBox: null,
      };
    }

    let changedPixels = 0;
    let minX = expected.width;
    let minY = expected.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < expected.height; y += 1) {
      for (let x = 0; x < expected.width; x += 1) {
        const offset = (y * expected.width + x) * 4;
        const different =
          expected.pixels[offset] !== actual.pixels[offset] ||
          expected.pixels[offset + 1] !== actual.pixels[offset + 1] ||
          expected.pixels[offset + 2] !== actual.pixels[offset + 2] ||
          expected.pixels[offset + 3] !== actual.pixels[offset + 3];

        if (!different) continue;

        changedPixels += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    return {
      dimensions: `${expected.width}x${expected.height}`,
      changedPixels,
      changedRatio: expected.width * expected.height > 0
        ? Number((changedPixels / (expected.width * expected.height)).toFixed(6))
        : null,
      boundingBox:
        changedPixels > 0
          ? {
              x: minX,
              y: minY,
              width: maxX - minX + 1,
              height: maxY - minY + 1,
            }
          : null,
    };
  } catch {
    return {
      dimensions: readPngDimensionsSafe(expectedPath) || readPngDimensionsSafe(actualPath),
      changedPixels: null,
      changedRatio: null,
      boundingBox: null,
    };
  }
}

async function decodePng(filePath) {
  const buffer = await fs.readFile(filePath);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`Not a PNG file: ${filePath}`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || ![0, 2, 4, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG format: ${filePath}`);
  }

  const channelsByColorType = new Map([
    [0, 1],
    [2, 3],
    [4, 2],
    [6, 4],
  ]);
  const channels = channelsByColorType.get(colorType);
  const rowBytes = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const rows = Buffer.alloc(height * rowBytes);

  let sourceOffset = 0;
  let targetOffset = 0;
  let previousRow = Buffer.alloc(rowBytes);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const rawRow = inflated.subarray(sourceOffset, sourceOffset + rowBytes);
    sourceOffset += rowBytes;

    const row = Buffer.alloc(rowBytes);
    for (let x = 0; x < rowBytes; x += 1) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = previousRow[x] || 0;
      const upLeft = x >= channels ? previousRow[x - channels] || 0 : 0;
      const raw = rawRow[x];

      if (filter === 0) row[x] = raw;
      else if (filter === 1) row[x] = (raw + left) & 0xff;
      else if (filter === 2) row[x] = (raw + up) & 0xff;
      else if (filter === 3) row[x] = (raw + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) row[x] = (raw + paeth(left, up, upLeft)) & 0xff;
      else throw new Error(`Unsupported PNG filter ${filter}: ${filePath}`);
    }

    row.copy(rows, targetOffset);
    targetOffset += rowBytes;
    previousRow = row;
  }

  const pixels = Buffer.alloc(width * height * 4);
  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    const source = pixelIndex * channels;
    const target = pixelIndex * 4;

    if (colorType === 0) {
      pixels[target] = rows[source];
      pixels[target + 1] = rows[source];
      pixels[target + 2] = rows[source];
      pixels[target + 3] = 255;
    } else if (colorType === 2) {
      pixels[target] = rows[source];
      pixels[target + 1] = rows[source + 1];
      pixels[target + 2] = rows[source + 2];
      pixels[target + 3] = 255;
    } else if (colorType === 4) {
      pixels[target] = rows[source];
      pixels[target + 1] = rows[source];
      pixels[target + 2] = rows[source];
      pixels[target + 3] = rows[source + 1];
    } else {
      pixels[target] = rows[source];
      pixels[target + 1] = rows[source + 1];
      pixels[target + 2] = rows[source + 2];
      pixels[target + 3] = rows[source + 3];
    }
  }

  return { width, height, pixels };
}

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

function readPngDimensionsSafe(filePath) {
  if (!filePath || !fsSync.existsSync(filePath)) return null;
  const buffer = fsSync.readFileSync(filePath);
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  return `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;
}

function renderSummaryMarkdown(run) {
  const coverage = run.coverage && !run.coverage.error ? run.coverage : null;
  const comparison = run.comparison || {};

  const lines = [
    '# Visual Regression CI Summary',
    '',
    `- State: ${run.state}`,
    `- Verdict: ${describeState(run.state, run.comparison)}`,
    `- Categories: ${run.categories.length > 0 ? run.categories.join(', ') : 'none'}`,
    `- Blocking result: ${run.gate.blocking ? 'yes' : 'no'}`,
    `- Legacy status: ${run.status}`,
    `- Strict visual mode: ${run.strict ? 'yes' : 'no'}`,
    `- Execution profile: ${run.environment?.profile || options.profile}`,
    `- Visual execution performed: ${run.executed === false ? 'no' : 'yes'}`,
    `- Playwright exit code: ${run.playwrightExitCode ?? 'n/a (not executed)'}`,
    '',
    '## Comparison',
    '',
    `- Expected: ${comparison.expected ?? 'n/a'}`,
    `- Captured: ${comparison.captured ?? 'n/a'}`,
    `- Compared: ${comparison.compared ?? 'n/a'}`,
    `- Unchanged: ${comparison.unchanged ?? 'n/a'}`,
    `- Changed: ${comparison.changed ?? 'n/a'}`,
    '',
    `- Visual differences: ${run.visualDifferences.length}`,
    `- Capture failures (no comparison performed): ${run.captureFailures.length}`,
    `- Missing baselines: ${run.missingBaselines.length}`,
    `- Coverage problems: ${run.coverageProblems.length}`,
    `- Infrastructure failures: ${run.infrastructureFailures.length}`,
    `- Total tests: ${run.totalTests}`,
    `- Expected/pass count: ${run.expected}`,
    `- Approved baseline: ${run.baselineDir} (${run.visualBaselineCount} PNG files)`,
    `- Baseline revision: ${run.baseline?.baselineRevision || 'unknown'}`,
    `- Baseline manifest: ${run.baseline?.manifestPresent ? `present, ${run.baseline.verifiedCount} checksum-verified` : 'MISSING'}`,
    `- HTML report: ${run.playwrightReport}`,
    `- Test results: ${run.testResults}`,
    `- Archive: ${path.join(settings.artifactDir, run.archiveName)}`,
    '',
  ];

  if (run.git?.headSha) {
    lines.push(
      '## Run Provenance',
      '',
      `- Repository: ${run.git.repository || 'n/a'}`,
      `- Event: ${run.git.event || 'local'}`,
      `- Branch: ${run.git.branch || 'n/a'}`,
      `- Pull request: ${run.git.pullRequestNumber ? `#${run.git.pullRequestNumber}` : 'n/a'}`,
      `- Base SHA: ${run.git.baseSha || 'n/a'}`,
      `- Head SHA: ${run.git.headSha || 'n/a'}`,
      `- Merge SHA: ${run.git.mergeSha || 'n/a'}`,
      `- Baseline SHA: ${run.baseline?.baselineRevision || 'n/a'}`,
      `- Playwright: ${run.environment?.playwrightVersion || 'n/a'}`,
      `- Docker base image: ${run.environment?.dockerBaseImage || 'n/a'}`,
      `- Platform: ${run.environment?.platform || run.platform}`,
      '',
    );
  }

  if (coverage) {
    lines.push(
      '## Coverage',
      '',
      `- Registered scenarios: ${coverage.counts.registered} (active ${coverage.counts.active}, planned ${coverage.counts.planned}, excluded ${coverage.counts.excluded}, deprecated ${coverage.counts.deprecated})`,
      `- Expected snapshots: ${coverage.counts.expectedSnapshots} (${coverage.counts.expectedInProfile} selected by the "${coverage.profile}" profile)`,
      `- Produced snapshots: ${coverage.counts.producedSnapshots ?? 'n/a'}`,
      `- Approved baselines: ${coverage.counts.approvedBaselines}`,
      `- Coverage: ${coverage.coveragePercent}% (${coverage.coverageBasis})`,
      `- Surfaces ${coverage.counts.surfaces} · screens ${coverage.counts.screens} · viewports ${coverage.counts.viewports} · locales ${coverage.counts.locales} · themes ${coverage.counts.themes}`,
      `- Orphan baselines: ${coverage.orphanBaselines.length}`,
      `- Declared missing coverage: ${coverage.missingCoverage.length}`,
      '',
    );

    if (coverage.missingCoverage.length > 0) {
      lines.push('### Declared Missing Coverage (non-blocking)', '');
      for (const entry of coverage.missingCoverage) {
        lines.push(`- **${entry.group || entry.snapshotId}** — ${firstLine(entry.reason)}`);
      }
      lines.push('');
    }

    if (coverage.orphanBaselines.length > 0) {
      lines.push('### Orphan Baselines', '');
      for (const entry of coverage.orphanBaselines) {
        lines.push(`- ${entry.snapshotId} — ${firstLine(entry.reason)}`);
      }
      lines.push('');
    }
  }

  if (run.visualDifferences.length > 0) {
    lines.push('## Visual Differences', '');
    lines.push(
      '| Test | Snapshot | Changed pixels | Ratio | Changed region | Dimensions | Evidence |',
    );
    lines.push('| --- | --- | ---: | ---: | --- | --- | --- |');
    for (const diff of run.visualDifferences) {
      lines.push(
        `| ${md(diff.title)} | ${md(diff.snapshot || '')} | ${formatNumber(
          diff.changedPixels,
        )} | ${formatRatio(diff.changedRatio)} | ${md(formatBoundingBox(diff.changedRegion))} | ${md(
          formatDimensions(diff.dimensions),
        )} | ${md(formatEvidence(diff))} |`,
      );
    }
    lines.push('');
  }

  if (run.captureFailures.length > 0) {
    lines.push(
      '## Visual Specs Requiring Attention',
      '',
      'These specs could not reach their screenshot assertion, so **no visual comparison was performed**. This is not a visual change.',
      '',
    );
    for (const failure of run.captureFailures) {
      lines.push(
        `- **${failure.snapshot || failure.title}**`,
        `  - Spec: ${failure.spec || failure.file}`,
        `  - Reason: ${firstLine(failure.error || failure.message)}`,
        '  - Visual comparison: NOT PERFORMED',
      );
    }
    lines.push('');
  }

  if (run.missingBaselines.length > 0) {
    lines.push(
      '## Baselines Requiring Approval',
      '',
      'A current screenshot may have been captured, but there is no approved previous screenshot to compare against. Current screenshots are never promoted automatically.',
      '',
    );
    for (const failure of run.missingBaselines) {
      lines.push(
        `- **${failure.snapshot || failure.title}** — ${firstLine(failure.reason || failure.message)}`,
      );
    }
    lines.push('');
  }

  if (run.coverageProblems.length > 0) {
    lines.push('## Coverage Maintenance Findings', '');
    for (const problem of run.coverageProblems) {
      lines.push(
        `- **${problem.snapshot}** [${problem.kind || 'coverage'}] — ${firstLine(problem.reason)}`,
      );
    }
    lines.push('');
  }

  if (run.infrastructureFailures.length > 0) {
    lines.push(
      '## Visual Regression Infrastructure Failure',
      '',
      'The visual-regression engine itself could not complete reliably. This run must not be read as a successful visual comparison.',
      '',
    );
    for (const failure of run.infrastructureFailures) {
      lines.push(`- **${failure.title}** (${failure.file}): ${firstLine(failure.message)}`);
    }
    lines.push('');
  }

  if (run.flaky.length > 0) {
    lines.push('## Flaky Tests', '');
    for (const flaky of run.flaky) {
      lines.push(`- ${flaky.title} (${flaky.file})`);
    }
    lines.push('');
  }

  lines.push(
    '## Gate Classification',
    '',
    '| Finding | Policy |',
    '| --- | --- |',
  );
  for (const [classification, policy] of Object.entries(run.gate?.policy || {})) {
    lines.push(`| ${classification} | ${policy} |`);
  }
  lines.push('');

  lines.push(
    '## Baseline Approval Rule',
    '',
    'Detected visual differences do not update approved baselines automatically. Review the HTML report and image evidence first. Only after approval, regenerate candidates with `npm run test:regression:baseline` (or the **Visual Regression Baseline** workflow), promote them with `npm run test:regression:baseline:approve`, and commit the changed files under `tests/regression/snapshots` together with the regenerated `baseline-manifest.json`.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

async function writeSummaryFiles(run, summaryMarkdown) {
  const summaryDir = path.join(paths.artifactDir, 'visual-regression-summary');
  await fs.mkdir(summaryDir, { recursive: true });
  await fs.writeFile(path.join(summaryDir, 'summary.md'), summaryMarkdown, 'utf8');
  await fs.writeFile(path.join(summaryDir, 'summary.json'), `${JSON.stringify(run, null, 2)}\n`, 'utf8');

  // Coverage result as its own artifact so the gap can be tracked over time
  // without parsing the whole run summary.
  if (run.coverage) {
    await fs.writeFile(
      path.join(summaryDir, 'coverage.json'),
      `${JSON.stringify(run.coverage, null, 2)}\n`,
      'utf8',
    );
  }

  // The exact coverage registry and baseline manifest used by this run travel
  // with the artifact, so a failure can be reproduced against the same inputs.
  await copyIfExists(
    path.resolve(repoRoot, 'tests/regression/visual-coverage.manifest.json'),
    path.join(summaryDir, 'visual-coverage.manifest.json'),
  );
  await copyIfExists(
    path.join(paths.baselineDir, 'baseline-manifest.json'),
    path.join(summaryDir, 'baseline-manifest.json'),
  );

  await fs.writeFile(
    path.join(summaryDir, 'manifest.json'),
    `${JSON.stringify(
      {
        createdAt: run.createdAt,
        state: run.state,
        categories: run.categories,
        comparison: run.comparison ?? null,
        status: run.status,
        blocking: run.gate?.blocking ?? false,
        gate: run.gate ?? null,
        archiveName: settings.archiveName,
        archiveSha256: run.archiveSha256 ?? null,
        baselineRevision: run.baseline?.baselineRevision ?? null,
        environment: run.environment ?? null,
        git: run.git ?? null,
        includedPaths: [
          'README.md',
          'visual-regression-summary/',
          settings.playwrightReportDir + '/',
          settings.testResultsDir + '/',
          'approved-baseline/tests/regression/snapshots/',
        ],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

async function copyIfExists(source, target) {
  if (!fsSync.existsSync(source)) return;
  await fs.copyFile(source, target);
}

async function appendGitHubStepSummary(summaryMarkdown) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `\n${summaryMarkdown}\n`, 'utf8');
}

function printTerminalSummary(run) {
  const coverage = run.coverage && !run.coverage.error ? run.coverage : null;
  const comparison = run.comparison || {};

  log(
    `Completed with state=${run.state}, blocking=${run.gate.blocking ? 'yes' : 'no'}, ` +
      `visualChanges=${run.visualDifferences.length}, captureFailures=${run.captureFailures.length}, ` +
      `missingBaselines=${run.missingBaselines.length}, coverageProblems=${run.coverageProblems.length}, ` +
      `infrastructureFailures=${run.infrastructureFailures.length}`,
  );
  log(
    `Comparison: expected=${comparison.expected} captured=${comparison.captured} ` +
      `compared=${comparison.compared} unchanged=${comparison.unchanged} changed=${comparison.changed}`,
  );
  log(describeState(run.state, run.comparison));

  if (coverage) {
    log(
      `Coverage: ${coverage.coveragePercent}% — expected ${coverage.counts.expectedSnapshots}, produced ${
        coverage.counts.producedSnapshots ?? 'n/a'
      }, approved baselines ${coverage.counts.approvedBaselines}, orphans ${coverage.orphanBaselines.length}, declared gaps ${coverage.missingCoverage.length}`,
    );
  }

  for (const diff of run.visualDifferences) {
    log(
      `VISUAL CHANGE: ${diff.title} (${diff.snapshot || 'snapshot unknown'}) changedPixels=${formatNumber(
        diff.changedPixels,
      )} ratio=${formatRatio(diff.changedRatio)} region=${formatBoundingBox(diff.changedRegion)}`,
    );
  }

  for (const failure of run.captureFailures) {
    log(
      `CAPTURE FAILURE (no comparison performed): ${failure.snapshot || failure.title} ` +
        `(${failure.spec || failure.file}) ${firstLine(failure.error || failure.message)}`,
    );
  }

  for (const failure of run.missingBaselines) {
    log(
      `BASELINE MISSING (approval required): ${failure.snapshot || failure.title} ` +
        `${firstLine(failure.reason || failure.message)}`,
    );
  }

  for (const problem of run.coverageProblems) {
    log(`COVERAGE MISMATCH: ${problem.snapshot} [${problem.kind}] ${firstLine(problem.reason)}`);
  }

  for (const failure of run.infrastructureFailures) {
    log(
      `INFRASTRUCTURE FAILURE: ${failure.title} (${failure.file}) ${firstLine(failure.message)}`,
    );
  }
}

/**
 * GitHub annotations, one severity per category.
 *
 * Annotation severity communicates "needs attention", not "blocks the build" —
 * the gate is separate and non-blocking by default. Infrastructure failures use
 * `error` specifically so a broken engine can never be skimmed as a green run.
 */
function emitGitHubAnnotations(run) {
  if (!process.env.GITHUB_ACTIONS) return;

  for (const diff of run.visualDifferences) {
    console.log(
      `::warning title=${gha('Visual regression: visual change')}::${gha(
        `${diff.title}: ${diff.snapshot || 'snapshot'} changed. Review ${diff.diff || 'diff image'} in the artifact.`,
      )}`,
    );
  }

  for (const failure of run.captureFailures) {
    console.log(
      `::warning title=${gha('Visual regression: spec requires attention')}::${gha(
        `${failure.snapshot || failure.title} was NOT compared — ${firstLine(failure.error || failure.message)}`,
      )}`,
    );
  }

  for (const failure of run.missingBaselines) {
    console.log(
      `::warning title=${gha('Visual regression: baseline approval required')}::${gha(
        `${failure.snapshot || failure.title} has no approved baseline, so it could not be compared.`,
      )}`,
    );
  }

  for (const problem of run.coverageProblems) {
    console.log(
      `::notice title=${gha('Visual regression: coverage maintenance')}::${gha(
        `${problem.snapshot} [${problem.kind}] — ${firstLine(problem.reason)}`,
      )}`,
    );
  }

  for (const failure of run.infrastructureFailures) {
    console.log(
      `::error title=${gha('Visual regression: infrastructure failure')}::${gha(
        `${failure.title}: ${firstLine(failure.message)}`,
      )}`,
    );
  }
}

async function createArchive(run, summaryMarkdown) {
  const packageRoot = path.join(paths.artifactDir, 'visual-regression-artifact');
  await fs.rm(packageRoot, { recursive: true, force: true });
  await fs.mkdir(packageRoot, { recursive: true });

  await fs.writeFile(path.join(packageRoot, 'README.md'), artifactReadme(run), 'utf8');
  await fs.cp(path.join(paths.artifactDir, 'visual-regression-summary'), path.join(packageRoot, 'visual-regression-summary'), {
    recursive: true,
  });

  if (fsSync.existsSync(paths.playwrightReportDir)) {
    await fs.cp(paths.playwrightReportDir, path.join(packageRoot, settings.playwrightReportDir), {
      recursive: true,
    });
  }

  if (fsSync.existsSync(paths.testResultsDir)) {
    await fs.cp(paths.testResultsDir, path.join(packageRoot, settings.testResultsDir), {
      recursive: true,
    });
  }

  // Copy ONLY the files the preflight saw as approved.
  //
  // `toHaveScreenshot()` writes a missing snapshot into the snapshot directory
  // before failing the test, so by now the directory can contain images that were
  // never reviewed. Copying it wholesale would ship unapproved screenshots in a
  // folder literally named "approved-baseline", which is exactly the file someone
  // would copy back into the repository to "fix" a missing baseline.
  const approvedFiles = run.baseline?.approvedFiles ?? null;

  if (fsSync.existsSync(paths.baselineDir)) {
    const targetRoot = path.join(packageRoot, 'approved-baseline');
    let copied = 0;
    let skipped = 0;

    if (approvedFiles) {
      for (const workspaceFile of approvedFiles) {
        const source = path.resolve(repoRoot, workspaceFile);
        if (!fsSync.existsSync(source)) continue;
        const target = path.join(targetRoot, workspaceFile);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(source, target);
        copied += 1;
      }

      const onDisk = await countFiles(paths.baselineDir, (filePath) =>
        filePath.endsWith(`-${APPROVED_PLATFORM}.png`),
      );
      skipped = Math.max(0, onDisk - copied);

      // Also carry the manifest so a reviewer can verify checksums.
      await copyIfExists(
        path.join(paths.baselineDir, 'baseline-manifest.json'),
        path.join(targetRoot, settings.baselineDir, 'baseline-manifest.json'),
      );
    } else {
      // No preflight listing (engine failed very early). Copy nothing rather than
      // risk shipping unapproved images as approved.
      skipped = -1;
    }

    if (skipped > 0) {
      log(
        `Archive: copied ${copied} approved baseline(s); excluded ${skipped} unapproved image(s) ` +
          'written by Playwright during the run.',
      );
    } else if (skipped < 0) {
      log('Archive: approved-baseline copy omitted (no verified approved set available).');
    }
  }

  const archivePath = path.join(paths.artifactDir, settings.archiveName);
  await fs.rm(archivePath, { force: true });
  await spawnChecked('tar', ['-czf', archivePath, '-C', paths.artifactDir, 'visual-regression-artifact']);
  return archivePath;
}

function artifactReadme(run) {
  return `# AUTHEON Visual Regression Artifact

Open \`${settings.playwrightReportDir}/index.html\` after extracting this archive to inspect the Playwright report with the normal diff, actual, expected, side-by-side, and slider views.

Start with:

- \`visual-regression-summary/summary.md\`
- \`${settings.playwrightReportDir}/index.html\`
- \`${settings.testResultsDir}/\`

The approved baseline copy is included under \`approved-baseline/tests/regression/snapshots\` for review only. Do not promote current screenshots into that baseline without human approval.

State: ${run.state}
Verdict: ${describeState(run.state, run.comparison)}
Blocking: ${run.gate.blocking ? 'yes' : 'no'}

Comparison: expected ${run.comparison?.expected ?? 'n/a'}, captured ${run.comparison?.captured ?? 'n/a'}, compared ${run.comparison?.compared ?? 'n/a'}, unchanged ${run.comparison?.unchanged ?? 'n/a'}, changed ${run.comparison?.changed ?? 'n/a'}

Visual differences:      ${run.visualDifferences.length}
Capture failures:        ${run.captureFailures.length}  (no comparison performed)
Missing baselines:       ${run.missingBaselines.length}  (approval required)
Coverage problems:       ${run.coverageProblems.length}
Infrastructure failures: ${run.infrastructureFailures.length}
`;
}

async function spawnChecked(commandName, commandArgs) {
  return await new Promise((resolve, reject) => {
    const child = spawn(commandName, commandArgs, {
      cwd: repoRoot,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${commandName} exited with code ${code}`));
    });
  });
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function countFiles(root, predicate) {
  if (!fsSync.existsSync(root)) return 0;
  let count = 0;
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) count += await countFiles(entryPath, predicate);
    else if (predicate(entryPath)) count += 1;
  }
  return count;
}

function playwrightBinary() {
  const localBin = path.join(
    repoRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'playwright.cmd' : 'playwright',
  );
  return fsSync.existsSync(localBin) ? localBin : process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

function relativeCommand(commandName) {
  if (path.isAbsolute(commandName) && commandName.startsWith(repoRoot)) {
    return toWorkspacePath(commandName);
  }
  return commandName;
}

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const data = await fs.readFile(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function snapshotNameFromPath(filePath) {
  if (!filePath) return null;
  return path.basename(filePath).replace(/-(actual|expected|diff)\.png$/i, '.png');
}

function formatFileLine(file, line) {
  if (!file) return 'unknown';
  return line ? `${file}:${line}` : file;
}

function formatNumber(value) {
  return typeof value === 'number' ? new Intl.NumberFormat('en-US').format(value) : 'n/a';
}

function formatRatio(value) {
  return typeof value === 'number' ? value.toFixed(6) : 'n/a';
}

function formatBoundingBox(box) {
  if (!box) return 'n/a';
  return `x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`;
}

function formatDimensions(dimensions) {
  if (!dimensions) return 'n/a';
  if (typeof dimensions === 'string') return dimensions;
  return `expected ${dimensions.expected}, actual ${dimensions.actual}`;
}

function formatEvidence(diff) {
  return [`expected: ${diff.expected}`, `actual: ${diff.actual}`, `diff: ${diff.diff}`].join('<br>');
}

function firstLine(message) {
  return String(message || '').split('\n').find(Boolean) || 'No error message available.';
}

/** Abbreviate a SHA/digest for log and report lines. */
function short(value) {
  const text = String(value || '');
  const bare = text.startsWith('sha256:') ? text.slice(7) : text;
  return bare ? bare.slice(0, 12) : 'unknown';
}

function md(value) {
  return String(value || '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function gha(value) {
  return String(value || '')
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');
}

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function toWorkspacePath(filePath) {
  if (!filePath) return null;
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function log(message) {
  console.log(`[visual-regression] ${message}`);
}

function stripAnsi(value) {
  return String(value || '').replace(/\u001b\[[0-9;]*m/g, '');
}
