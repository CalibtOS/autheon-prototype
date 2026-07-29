#!/usr/bin/env node
/**
 * Workflow result classifier and gate.
 *
 * Reads the canonical summary.json the CI wrapper produced, validates it,
 * writes the GitHub job summary and annotations, and reports the verdict as a
 * step OUTPUT. It deliberately does NOT exit non-zero on a blocking result: the
 * workflow applies the gate in a final step, after artifact upload and
 * notification have had their chance to run.
 *
 * Why this is a Node script and not inline bash
 * ---------------------------------------------
 * The previous inline gate used:
 *
 *   read STATUS VISUAL EXECFAIL MISSING < <(node -e '... process.stdout.write(...)')
 *
 * under GitHub's default `bash -e` shell. `process.stdout.write` emits no
 * trailing newline, so `read` hits EOF and returns 1 *after* assigning the
 * variables — and `set -e` then aborted the step before it wrote the job summary
 * or emitted a single annotation. That made every run exit 1, pass or fail; the
 * one blocking verdict it appeared to produce was a coincidence. Reproduce with:
 *
 *   printf '%s' 'a b' > /tmp/x; bash -ec 'read A B < /tmp/x; echo reached'
 *
 * Keeping the logic in Node removes the whole class of shell-quoting and
 * word-splitting failure alongside it.
 */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';

const summaryPath = process.env.VISUAL_REGRESSION_SUMMARY;
const pipelineExitCode = process.env.PIPELINE_EXIT_CODE ?? 'unknown';
const artifactName = process.env.REGRESSION_ARTIFACT_NAME || 'visual-regression-artifacts';
const runUrl = process.env.REGRESSION_ARTIFACT_URL || '';

if (!summaryPath) {
  fail('VISUAL_REGRESSION_SUMMARY is not set; the gate does not know which summary to read.');
}

if (!fsSync.existsSync(summaryPath)) {
  await annotate(
    'error',
    'Visual regression infrastructure failure',
    `The pipeline produced no summary.json at ${summaryPath} (pipeline exit ${pipelineExitCode}). ` +
      'Treating this as an infrastructure failure: without the canonical result there is nothing to classify.',
  );
  await writeStepSummary(
    [
      '## Visual Regression — INFRASTRUCTURE FAILURE',
      '',
      `The pipeline exited \`${pipelineExitCode}\` without writing \`${summaryPath}\`.`,
      '',
      'Nothing could be classified. Check the "Run visual regression pipeline" step log for a Docker build or container startup failure.',
      '',
    ].join('\n'),
  );
  await setOutput('blocking', 'true');
  await setOutput('classification', 'infrastructure-failure');
  process.exit(0);
}

let summary;
try {
  summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
} catch (error) {
  await annotate(
    'error',
    'Visual regression infrastructure failure',
    `summary.json at ${summaryPath} is not readable JSON: ${error.message}`,
  );
  await setOutput('blocking', 'true');
  await setOutput('classification', 'corrupt-summary');
  process.exit(0);
}

const schemaProblems = validateSummary(summary);
if (schemaProblems.length > 0) {
  await annotate(
    'error',
    'Visual regression infrastructure failure',
    `summary.json is missing required fields: ${schemaProblems.join('; ')}`,
  );
  await writeStepSummary(
    `## Visual Regression — CORRUPT SUMMARY\n\n${schemaProblems
      .map((problem) => `- ${problem}`)
      .join('\n')}\n`,
  );
  await setOutput('blocking', 'true');
  await setOutput('classification', 'corrupt-summary');
  process.exit(0);
}

const visual = summary.visualDifferences.length;
const execFailures = summary.executionFailures.length;
const missing = summary.missingBaselines.length;
const strict = Boolean(summary.strict);
const blocking = Boolean(summary.gate?.blocking ?? (execFailures > 0 || missing > 0 || (visual > 0 && strict)));
const notification = summary.notification || { status: 'unknown' };
const coverage = summary.coverage && !summary.coverage.error ? summary.coverage : null;

const classification = missing > 0
  ? 'missing-baseline'
  : execFailures > 0
    ? 'execution-failure'
    : visual > 0
      ? strict ? 'visual-difference-blocking' : 'visual-difference-non-blocking'
      : 'passed';

await writeStepSummary(renderJobSummary());

// Annotations. Each classification gets its own, so the run page never conflates
// a framework failure with a visual change.
for (const failure of summary.missingBaselines) {
  await annotate(
    'error',
    'Visual regression: missing baseline (blocking)',
    `${failure.title}: ${firstLine(failure.message)}`,
  );
}

for (const failure of summary.executionFailures) {
  await annotate(
    'error',
    'Visual regression: execution failure (blocking)',
    `${failure.title}: ${firstLine(failure.message)}`,
  );
}

if (visual > 0) {
  await annotate(
    strict ? 'error' : 'warning',
    `Visual regression: ${visual} visual difference(s)${strict ? ' (blocking — strict mode)' : ' (non-blocking)'}`,
    `Review the expected/actual/diff images in the "${artifactName}" artifact. ` +
      'Approve intentional changes with the Visual Regression Baseline workflow, then "npm run test:regression:baseline:approve".',
  );
}

if (notification.status === 'failed' || notification.status === 'not-configured') {
  await annotate(
    'warning',
    'Visual regression: notification not delivered',
    `${notification.message || notification.status}. This does not change the regression verdict.`,
  );
}

await setOutput('blocking', blocking ? 'true' : 'false');
await setOutput('classification', classification);
await setOutput('visual_differences', String(visual));
await setOutput('execution_failures', String(execFailures));
await setOutput('missing_baselines', String(missing));
await setOutput('notification_status', notification.status || 'unknown');

console.log(
  `[gate] classification=${classification} blocking=${blocking} visual=${visual} exec=${execFailures} missing=${missing} notification=${notification.status}`,
);

process.exit(0);

// -----------------------------------------------------------------------------

function validateSummary(value) {
  const problems = [];

  for (const field of ['visualDifferences', 'executionFailures', 'missingBaselines']) {
    if (!Array.isArray(value?.[field])) problems.push(`\`${field}\` must be an array`);
  }

  if (typeof value?.status !== 'string') problems.push('`status` must be a string');

  return problems;
}

function renderJobSummary() {
  const verdict = blocking ? '❌ BLOCKING' : visual > 0 ? '⚠️ NON-BLOCKING DIFFERENCES' : '✅ PASSED';

  const lines = [
    `## Visual Regression — ${verdict}`,
    '',
    '| | |',
    '| --- | --- |',
    `| Status | \`${summary.status}\` |`,
    `| Classification | \`${classification}\` |`,
    `| Blocking | ${blocking ? 'yes' : 'no'} |`,
    `| Strict mode | ${strict ? 'on' : 'off'} |`,
    `| Execution profile | \`${summary.environment?.profile || 'unknown'}\` |`,
    `| Visual differences (non-blocking by default) | ${visual} |`,
    `| Execution failures (blocking) | ${execFailures} |`,
    `| Missing baselines (blocking) | ${missing} |`,
    `| Pipeline exit code | \`${pipelineExitCode}\` |`,
    `| Notification | \`${notification.status}\` |`,
    '',
  ];

  if (summary.git) {
    lines.push(
      '### Provenance',
      '',
      '| | |',
      '| --- | --- |',
      `| Event | \`${summary.git.event || 'n/a'}\` |`,
      `| Branch | \`${summary.git.branch || 'n/a'}\` |`,
      `| Pull request | ${summary.git.pullRequestNumber ? `#${summary.git.pullRequestNumber}` : 'n/a'} |`,
      `| Base SHA | \`${short(summary.git.baseSha)}\` |`,
      `| Head SHA | \`${short(summary.git.headSha)}\` |`,
      `| Merge SHA | \`${short(summary.git.mergeSha)}\` |`,
      `| Baseline SHA | \`${short(summary.baseline?.baselineRevision)}\` |`,
      `| Baseline manifest | ${summary.baseline?.manifestPresent ? `present · ${summary.baseline.verifiedCount}/${summary.baseline.expectedCount} checksum-verified` : '**missing**'} |`,
      `| Playwright | \`${summary.environment?.playwrightVersion || 'n/a'}\` |`,
      `| Docker base image | \`${summary.environment?.dockerBaseImage || 'n/a'}\` |`,
      `| Platform | \`${summary.environment?.platform || summary.platform}\` |`,
      '',
    );
  }

  if (coverage) {
    lines.push(
      '### Coverage',
      '',
      '| | |',
      '| --- | --- |',
      `| Registered scenarios | ${coverage.counts.registered} (active ${coverage.counts.active}, planned ${coverage.counts.planned}, excluded ${coverage.counts.excluded}, deprecated ${coverage.counts.deprecated}) |`,
      `| Expected snapshots | ${coverage.counts.expectedSnapshots} (${coverage.counts.expectedInProfile} in this profile) |`,
      `| Produced snapshots | ${coverage.counts.producedSnapshots ?? 'n/a'} |`,
      `| Approved baselines | ${coverage.counts.approvedBaselines} |`,
      `| Coverage | **${coverage.coveragePercent}%** — ${coverage.coverageBasis} |`,
      `| Surfaces / screens / viewports / locales / themes | ${coverage.counts.surfaces} / ${coverage.counts.screens} / ${coverage.counts.viewports} / ${coverage.counts.locales} / ${coverage.counts.themes} |`,
      `| Orphan baselines | ${coverage.orphanBaselines.length} |`,
      `| Declared missing coverage | ${coverage.missingCoverage.length} |`,
      '',
    );

    if (coverage.missingCoverage.length > 0) {
      lines.push(
        '<details><summary>Declared missing coverage (non-blocking)</summary>',
        '',
      );
      for (const entry of coverage.missingCoverage) {
        lines.push(`- **${entry.group || entry.snapshotId}** — ${firstLine(entry.reason)}`);
      }
      lines.push('', '</details>', '');
    }
  }

  if (missing > 0) {
    lines.push('### Missing baselines (blocking)', '');
    for (const failure of summary.missingBaselines) {
      lines.push(`- \`${failure.title}\` — ${firstLine(failure.message)}`);
    }
    lines.push(
      '',
      'A missing baseline is a framework failure, not a visual change. Render candidates with the **Visual Regression Baseline** workflow, review them, then approve and commit.',
      '',
    );
  }

  if (execFailures > 0) {
    lines.push('### Execution failures (blocking)', '');
    for (const failure of summary.executionFailures) {
      lines.push(`- \`${failure.title}\` (${failure.file}) — ${firstLine(failure.message)}`);
    }
    lines.push('');
  }

  if (visual > 0) {
    lines.push(
      `### Visual differences (${strict ? 'blocking — strict mode' : 'non-blocking'})`,
      '',
      '| Snapshot | Changed pixels | Ratio | Test |',
      '| --- | ---: | ---: | --- |',
    );
    for (const diff of summary.visualDifferences) {
      lines.push(
        `| \`${diff.snapshot || 'unknown'}\` | ${formatNumber(diff.changedPixels)} | ${
          typeof diff.changedRatio === 'number' ? diff.changedRatio.toFixed(6) : 'n/a'
        } | ${escapeCell(diff.title)} |`,
      );
    }
    lines.push('');
  }

  lines.push(
    '### Artifacts',
    '',
    `Download the **${artifactName}** artifact${runUrl ? ` from [this run](${runUrl})` : ''}.`,
    '',
    '```bash',
    `gh run download ${summary.git?.runId || '<run-id>'} --name ${artifactName}`,
    `npx playwright show-trace <extracted>/test-results/<test-dir>/trace.zip`,
    '```',
    '',
    'See `tests/docs/visual-regression-traces.md` for the first-five-minutes investigation guide.',
    '',
  );

  return lines.join('\n');
}

async function writeStepSummary(markdown) {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    console.log(markdown);
    return;
  }
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`, 'utf8');
}

/** Multi-line-safe GitHub step output. */
async function setOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) {
    console.log(`[gate] ${name}=${value}`);
    return;
  }
  await fs.appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, 'utf8');
}

async function annotate(level, title, message) {
  console.log(`::${level} title=${escapeProperty(title)}::${escapeData(message)}`);
}

function escapeData(value) {
  return String(value ?? '')
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}

function escapeProperty(value) {
  return escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function firstLine(message) {
  return String(message ?? '').split('\n').find(Boolean) || 'No message available.';
}

function short(sha) {
  return sha ? String(sha).slice(0, 12) : 'n/a';
}

function formatNumber(value) {
  return typeof value === 'number' ? new Intl.NumberFormat('en-US').format(value) : 'n/a';
}

function fail(message) {
  console.log(`::error title=Visual regression gate misconfigured::${escapeData(message)}`);
  process.exit(1);
}
