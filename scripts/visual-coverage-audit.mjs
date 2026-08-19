#!/usr/bin/env node
/**
 * Visual coverage audit.
 *
 *   node scripts/visual-coverage-audit.mjs                Static audit
 *   node scripts/visual-coverage-audit.mjs --results <p>  Audit against a run
 *   node scripts/visual-coverage-audit.mjs --json         Machine-readable output
 *
 * Compares the coverage registry against the visual specs and the approved
 * baselines (and, with --results, against what a Playwright run actually
 * produced). Exits non-zero when a blocking coverage finding exists.
 *
 * Run this on its own to answer "what is not covered?" without executing the
 * suite. The CI wrapper calls the same model, so the two can never disagree.
 */
import path from 'node:path';

import { APPROVED_PLATFORM, repoRoot } from './lib/visual-baseline.mjs';
import {
  baselineMissingFindings,
  buildCoverage,
  captureFailureFindings,
  coverageMismatchFindings,
  readPlaywrightOutcomes,
} from './lib/visual-coverage.mjs';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/visual-coverage-audit.mjs [options]

  --profile <name>   Execution profile to audit. Default: full
  --platform <name>  Approved baseline platform. Default: ${APPROVED_PLATFORM}
  --results <path>   Playwright JSON report to score produced snapshots against
  --json             Print the coverage result as JSON
`);
  process.exit(0);
}

const profile = readOption('--profile') || 'full';
const platform = readOption('--platform') || APPROVED_PLATFORM;
const resultsPath = readOption('--results');

let outcomes = null;
if (resultsPath) {
  outcomes = await readPlaywrightOutcomes(path.resolve(repoRoot, resultsPath));
  if (!outcomes) {
    console.error(`[visual-coverage] Could not read a Playwright JSON report at ${resultsPath}.`);
    process.exit(1);
  }
}

let coverage;
try {
  coverage = await buildCoverage({ platform, profile, outcomes });
} catch (error) {
  console.error(`[visual-coverage] ${error.message}`);
  process.exit(1);
}

const findings = {
  baselineMissing: baselineMissingFindings(coverage),
  captureFailures: captureFailureFindings(coverage),
  coverageMismatches: coverageMismatchFindings(coverage),
};
const findingCount =
  findings.baselineMissing.length +
  findings.captureFailures.length +
  findings.coverageMismatches.length;

if (args.includes('--json')) {
  console.log(JSON.stringify({ ...coverage, findings }, null, 2));
} else {
  printHumanReport(coverage, findings, findingCount);
}

// Exit 0 even with findings. This audit is an observability tool: a coverage
// inconsistency is a maintenance finding, not a reason to fail a pipeline step.
// `--exit-code` opts into a non-zero exit for a developer who wants to chain it.
process.exit(args.includes('--exit-code') && findingCount > 0 ? 1 : 0);

function printHumanReport(result, grouped, total) {
  const { counts } = result;

  console.log('[visual-coverage] AUTHEON visual coverage audit');
  console.log(`[visual-coverage] Registry:  ${result.registry} (v${result.registryVersion})`);
  console.log(`[visual-coverage] Profile:   ${result.profile}`);
  console.log(`[visual-coverage] Platform:  ${result.platform}`);
  console.log('');
  console.log(
    `[visual-coverage] Registered scenarios: ${counts.registered} ` +
      `(active ${counts.active}, planned ${counts.planned}, excluded ${counts.excluded}, deprecated ${counts.deprecated})`,
  );
  console.log(
    `[visual-coverage] Surfaces ${counts.surfaces}, screens ${counts.screens}, viewports ${counts.viewports}, locales ${counts.locales}, themes ${counts.themes}`,
  );
  console.log(
    `[visual-coverage] Expected snapshots: ${counts.expectedSnapshots} (${counts.expectedInProfile} in the "${result.profile}" profile), approved baselines: ${counts.approvedBaselines}` +
      (counts.producedSnapshots === null
        ? ''
        : `, produced: ${counts.producedSnapshots}`),
  );
  console.log(
    `[visual-coverage] Coverage: ${result.coveragePercent}% (${result.coverageBasis})`,
  );

  // Every finding below is NON-BLOCKING. Visual regression is an observability
  // system; these are reported so they get fixed, not to stop a pipeline.
  section('BASELINE_MISSING — approval required', grouped.baselineMissing, (entry) =>
    `${entry.snapshot} (${entry.spec}) — ${entry.reason}`,
  );
  section('CAPTURE_FAILURE — expected snapshots never captured', grouped.captureFailures, (entry) =>
    `${entry.snapshot} (${entry.spec}) — ${entry.error}`,
  );
  section('COVERAGE_MISMATCH — registry maintenance', grouped.coverageMismatches, (entry) =>
    `${entry.snapshot} [${entry.kind}] — ${entry.reason}`,
  );

  section(
    'Baseline gaps outside this profile (reported)',
    result.baselineGapsOutsideProfile,
    (entry) => `${entry.snapshotId} (${entry.spec}) — ${entry.reason}`,
  );
  section('Excluded scenarios (documented)', result.excludedScenarios, (entry) =>
    `${entry.snapshotId} [${entry.status}] — ${entry.reason}`,
  );
  section('Missing coverage (declared gap, non-blocking)', result.missingCoverage, (entry) =>
    entry.group
      ? `${entry.group} — ${entry.reason}${entry.blockedBy ? ` (blocked by: ${entry.blockedBy})` : ''}`
      : `${entry.snapshotId} — ${entry.reason}`,
  );

  console.log('');
  if (total === 0) {
    console.log('[visual-coverage] No coverage findings.');
  } else {
    console.log(
      `[visual-coverage] ${total} coverage finding(s) — ` +
        `${grouped.baselineMissing.length} BASELINE_MISSING, ` +
        `${grouped.captureFailures.length} CAPTURE_FAILURE, ` +
        `${grouped.coverageMismatches.length} COVERAGE_MISMATCH.`,
    );
    console.log(
      '[visual-coverage] All non-blocking: reported for maintenance, visual execution continues.',
    );
  }
}

function section(title, entries, format) {
  if (!entries || entries.length === 0) return;
  console.log('');
  console.log(`[visual-coverage] ${title} (${entries.length}):`);
  for (const entry of entries) {
    console.log(`[visual-coverage]   - ${format(entry)}`);
  }
}

function readOption(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}
