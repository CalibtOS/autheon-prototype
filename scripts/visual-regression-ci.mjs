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
  buildCoverage,
  coverageBlockingReasons,
  readPlaywrightOutcomes,
  scenariosForProfile,
  readRegistry,
} from './lib/visual-coverage.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const options = {
  strict: args.includes('--strict') || isTruthy(process.env.VISUAL_REGRESSION_STRICT),
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

try {
  await prepareOutputDirectories();

  log(`Visual regression CI run started at ${startedAt.toISOString()}`);
  log(`Command: ${command}`);
  log(`Execution profile: ${options.profile}`);
  log(`Playwright report directory: ${settings.playwrightReportDir}`);
  log(`Test results directory: ${settings.testResultsDir}`);

  // ---------------------------------------------------------------------------
  // Preflight. Runs BEFORE Playwright so a baseline problem is reported as a
  // classified, blocking framework failure instead of 46 opaque test failures.
  // ---------------------------------------------------------------------------
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

  if (preflight.blocking.length > 0) {
    analysis = createPreflightFailure(preflight);
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
    analysis.coverage = await buildRunCoverage();
    applyCoverageToAnalysis(analysis);
  }

  analysis.gate = buildGate(analysis);
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
  console.error(`[visual-regression] ERROR: ${error.stack || error.message || String(error)}`);
  process.exitCode = 1;
}

/**
 * Baseline + coverage preflight.
 *
 * Both checks must pass before Playwright is allowed to start:
 *   - the approved baseline set exists, is intact, and matches its manifest;
 *   - the coverage registry is valid JSON with a usable expected-snapshot list.
 *
 * A failure here is deliberately NOT "continue-on-error": comparing against an
 * unknown or corrupt baseline set produces results nobody can act on.
 */
async function runPreflight() {
  const result = {
    baseline: null,
    coverage: null,
    registryValid: false,
    blocking: [],
  };

  result.baseline = await verifyBaselines({ platform: APPROVED_PLATFORM });

  if (baselineVerificationBlocking(result.baseline)) {
    result.blocking.push(
      ...baselineVerificationMessages(result.baseline).map((message) => ({
        kind: 'missing-baseline',
        title: 'Approved baseline preflight',
        file: settings.baselineDir,
        message,
      })),
    );
  }

  // Guard against comparing baselines with a different renderer. macOS and
  // Linux rasterize fonts differently, so a Darwin screenshot against a Linux
  // baseline reports 1-3% false diffs on every text-bearing screen.
  if (process.platform !== APPROVED_PLATFORM) {
    result.blocking.push({
      kind: 'execution-failure',
      title: 'Wrong rendering platform',
      file: settings.baselineDir,
      message:
        `This wrapper compares against approved "${APPROVED_PLATFORM}" baselines but is running on "${process.platform}". ` +
        'Run the pipeline through Docker instead: "npm run test:regression:ci".',
    });
  } else if (APPROVED_PLATFORM !== CANONICAL_PLATFORM) {
    // Not blocking — but loud, and recorded in the summary.
    log(
      `NON-CANONICAL RUN: comparing against "${APPROVED_PLATFORM}" baselines via VISUAL_REGRESSION_APPROVED_PLATFORM. ` +
        `Only "${CANONICAL_PLATFORM}" baselines are approved for merge decisions.`,
    );
  }

  try {
    result.coverage = await buildCoverage({
      platform: APPROVED_PLATFORM,
      profile: options.profile,
    });
    result.registryValid = true;

    for (const reason of coverageBlockingReasons(result.coverage)) {
      result.blocking.push({
        kind: reason.startsWith('Missing approved baseline')
          ? 'missing-baseline'
          : 'execution-failure',
        title: 'Visual coverage preflight',
        file: result.coverage.registry,
        message: reason,
      });
    }
  } catch (error) {
    result.blocking.push({
      kind: 'execution-failure',
      title: 'Invalid visual coverage registry',
      file: 'tests/regression/visual-coverage.manifest.json',
      message: error.message,
    });
  }

  return result;
}

/** Coverage scored against what the run actually produced. */
async function buildRunCoverage() {
  try {
    const outcomes = await readPlaywrightOutcomes(paths.resultsJson);
    return await buildCoverage({
      platform: APPROVED_PLATFORM,
      profile: options.profile,
      outcomes,
    });
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Fold post-run coverage findings into the classified result lists.
 *
 * A snapshot that was expected but never captured is a *missing capture*, not a
 * passing test. Without this, a suite whose test silently stopped short would
 * report "all green".
 */
function applyCoverageToAnalysis(analysis) {
  const coverage = analysis.coverage;
  if (!coverage || coverage.error) return;

  for (const entry of coverage.missingCaptures) {
    analysis.executionFailures.push({
      title: `Expected snapshot never captured: ${entry.snapshotId}`,
      file: entry.spec,
      status: 'missing-capture',
      durationMs: 0,
      message: entry.reason,
    });
  }

  if (analysis.executionFailures.length > 0 || analysis.missingBaselines.length > 0) {
    analysis.status = 'failed';
  }
}

/**
 * The single gate decision.
 *
 * Everything downstream — the terminal summary, the GitHub step summary, the
 * annotations, the email, and the workflow's final exit code — reads this
 * object. Nothing re-derives the verdict from raw counters.
 */
function buildGate(analysis) {
  const reasons = [];

  for (const failure of analysis.missingBaselines) {
    reasons.push({ classification: 'missing-baseline', blocking: true, detail: firstLine(failure.message) });
  }

  for (const failure of analysis.executionFailures) {
    reasons.push({ classification: 'execution-failure', blocking: true, detail: firstLine(failure.message) });
  }

  for (const diff of analysis.visualDifferences) {
    reasons.push({
      classification: 'visual-difference',
      blocking: Boolean(analysis.strict),
      detail: `${diff.snapshot || diff.title} changed.`,
    });
  }

  const blocking = reasons.some((reason) => reason.blocking);

  return {
    blocking,
    strict: Boolean(analysis.strict),
    exitCode: blocking ? 1 : 0,
    // Notification is reported separately and never overwrites this verdict.
    // The notifier fills in `analysis.notification`.
    policy: {
      'visual-difference': analysis.strict ? 'blocking (strict mode)' : 'non-blocking',
      'missing-baseline': 'blocking',
      'missing-capture': 'blocking',
      'execution-failure': 'blocking',
      'corrupt-baseline': 'blocking',
      'invalid-coverage-registry': 'blocking',
      'notification-failure': 'reported separately, never blocking the regression verdict',
    },
    reasons,
  };
}

function environmentMetadata() {
  return {
    platform: process.platform,
    approvedPlatform: APPROVED_PLATFORM,
    canonicalPlatform: CANONICAL_PLATFORM,
    canonicalBaselineSet: APPROVED_PLATFORM === CANONICAL_PLATFORM,
    node: process.version,
    playwrightVersion: playwrightVersion(),
    dockerBaseImage: process.env.VISUAL_REGRESSION_DOCKER_BASE_IMAGE || 'node:24-bookworm-slim',
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
    totalTests: 0,
    expected: 0,
    skipped: 0,
    flaky: [],
    visualDifferences: [],
    missingBaselines: [],
    executionFailures: [],
    status: 'unknown',
    preflightFailed: false,
    // Filled in by scripts/notify-visual-regression.mjs. Present up front so
    // consumers can rely on the field existing even if notification never ran.
    notification: {
      status: 'not-attempted',
      attempted: false,
      delivered: false,
      failureKind: null,
      missingVariables: [],
      message: 'Notification has not run yet.',
    },
  };

  const resultsJson = await readJsonIfExists(paths.resultsJson);
  if (!resultsJson) {
    if (playwrightExitCode === 0) {
      base.status = 'passed';
    } else {
      base.executionFailures.push({
        title: 'Playwright JSON report missing',
        file: toWorkspacePath(paths.resultsJson),
        message:
          'Playwright exited non-zero and test-results/results.json was not produced. Treating this as a regression execution failure.',
      });
      base.status = 'failed';
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

    if (classification.kind === 'visual-difference') {
      base.visualDifferences.push(classification.record);
    } else if (classification.kind === 'missing-baseline') {
      base.missingBaselines.push(classification.record);
    } else {
      base.executionFailures.push(classification.record);
    }
  }

  if (
    playwrightExitCode !== 0 &&
    base.visualDifferences.length === 0 &&
    base.missingBaselines.length === 0 &&
    base.executionFailures.length === 0
  ) {
    base.executionFailures.push({
      title: 'Playwright exited non-zero without a classified test failure',
      file: settings.testDir,
      project: settings.project,
      status: 'failed',
      durationMs: 0,
      message:
        tests.length === 0
          ? 'Playwright did not find any matching tests. Check VISUAL_REGRESSION_TEST_DIR, VISUAL_REGRESSION_GREP, and project filters.'
          : `Playwright exited with code ${playwrightExitCode}, but the JSON report did not contain a screenshot diff, missing baseline, or explicit failed test result.`,
    });
  }

  if (base.executionFailures.length > 0 || base.missingBaselines.length > 0) {
    base.status = 'failed';
  } else if (base.visualDifferences.length > 0) {
    base.status = options.strict ? 'visual-differences-failed' : 'visual-differences-non-blocking';
  } else {
    base.status = 'passed';
  }

  return base;
}

/**
 * Result shape for a preflight that refused to start Playwright.
 *
 * Every blocking preflight finding keeps its own classification, so a missing
 * baseline is never reported as an execution failure and vice versa.
 */
function createPreflightFailure(preflight) {
  const missingBaselines = preflight.blocking
    .filter((entry) => entry.kind === 'missing-baseline')
    .map(({ kind, ...record }) => record);
  const executionFailures = preflight.blocking
    .filter((entry) => entry.kind !== 'missing-baseline')
    .map(({ kind, ...record }) => record);

  return {
    createdAt: new Date().toISOString(),
    command,
    ci: Boolean(process.env.CI),
    strict: options.strict,
    platform: process.platform,
    node: process.version,
    playwrightExitCode: 1,
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
    missingBaselines,
    executionFailures,
    status: 'failed',
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

  if (missingBaseline) {
    return {
      kind: 'missing-baseline',
      record: {
        ...record,
        snapshot: evidenceRefs.snapshot || null,
        expected: toWorkspacePath(evidence.expected),
        actual: toWorkspacePath(evidence.actual),
        diff: toWorkspacePath(evidence.diff),
      },
    };
  }

  if (hasScreenshotAssertion && evidence.expected && evidence.actual && evidence.diff) {
    const parsedPixelSummary = parsePixelSummary(message);
    const imageStats = await buildImageStats(evidence.expected, evidence.actual);

    return {
      kind: 'visual-difference',
      record: {
        ...record,
        snapshot: evidenceRefs.snapshot || snapshotNameFromPath(evidence.actual),
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

  return { kind: 'execution-failure', record };
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
  const statusLabel = {
    passed: 'Passed',
    failed: 'Failed',
    'visual-differences-non-blocking': 'Visual Differences Detected',
    'visual-differences-failed': 'Visual Differences Detected',
  }[run.status] || run.status;

  const coverage = run.coverage && !run.coverage.error ? run.coverage : null;

  const lines = [
    '# Visual Regression CI Summary',
    '',
    `- Status: ${statusLabel}`,
    `- Blocking result: ${isBlocking(run) ? 'yes' : 'no'}`,
    `- Strict visual mode: ${run.strict ? 'yes' : 'no'}`,
    `- Execution profile: ${run.environment?.profile || options.profile}`,
    `- Playwright exit code: ${run.playwrightExitCode}`,
    `- Total tests: ${run.totalTests}`,
    `- Expected/pass count: ${run.expected}`,
    `- Visual differences: ${run.visualDifferences.length}`,
    `- Missing baselines: ${run.missingBaselines.length}`,
    `- Execution failures: ${run.executionFailures.length}`,
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

  if (run.missingBaselines.length > 0) {
    lines.push('## Missing Baselines', '');
    for (const failure of run.missingBaselines) {
      lines.push(`- ${failure.title} (${failure.file}): ${firstLine(failure.message)}`);
    }
    lines.push('');
  }

  if (run.executionFailures.length > 0) {
    lines.push('## Execution Failures', '');
    for (const failure of run.executionFailures) {
      lines.push(`- ${failure.title} (${failure.file}): ${firstLine(failure.message)}`);
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
        status: run.status,
        blocking: isBlocking(run),
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
  const blocking = isBlocking(run);
  const coverage = run.coverage && !run.coverage.error ? run.coverage : null;

  log(
    `Completed with status=${run.status}, blocking=${blocking ? 'yes' : 'no'}, visualDifferences=${run.visualDifferences.length}, executionFailures=${run.executionFailures.length}, missingBaselines=${run.missingBaselines.length}`,
  );

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

  for (const failure of [...run.missingBaselines, ...run.executionFailures]) {
    log(`BLOCKING FAILURE: ${failure.title} (${failure.file}) ${firstLine(failure.message)}`);
  }
}

function emitGitHubAnnotations(run) {
  if (!process.env.GITHUB_ACTIONS) return;

  for (const diff of run.visualDifferences) {
    console.log(
      `::warning title=${gha('Visual regression')}::${gha(
        `${diff.title}: ${diff.snapshot || 'snapshot'} changed. Review ${diff.diff || 'diff image'} in the artifact.`,
      )}`,
    );
  }

  for (const failure of [...run.missingBaselines, ...run.executionFailures]) {
    console.log(
      `::error title=${gha('Visual regression execution failure')}::${gha(
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

  if (fsSync.existsSync(paths.baselineDir)) {
    await fs.mkdir(path.join(packageRoot, 'approved-baseline', 'tests', 'regression'), {
      recursive: true,
    });
    await fs.cp(
      paths.baselineDir,
      path.join(packageRoot, 'approved-baseline', 'tests', 'regression', 'snapshots'),
      { recursive: true },
    );
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

Run status: ${run.status}
Blocking: ${isBlocking(run) ? 'yes' : 'no'}
Visual differences: ${run.visualDifferences.length}
Execution failures: ${run.executionFailures.length}
Missing baselines: ${run.missingBaselines.length}
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

function isBlocking(run) {
  return (
    run.executionFailures.length > 0 ||
    run.missingBaselines.length > 0 ||
    (run.visualDifferences.length > 0 && run.strict)
  );
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
