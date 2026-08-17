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

// An absent, unreadable, or schema-invalid summary is an INFRASTRUCTURE_FAILURE.
// Like every other category it is non-blocking by default: visual regression must
// not gate the application pipeline. It is annotated as `error` (not `warning`) so
// it can never be skimmed as a successful comparison, and the same explicit opt-in
// that makes infra failures blocking in the engine applies here too.
const failOnInfrastructure = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.VISUAL_REGRESSION_FAIL_ON_INFRASTRUCTURE || '').toLowerCase(),
);
const infrastructureBlocking = failOnInfrastructure ? 'true' : 'false';

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
  await setOutput('blocking', infrastructureBlocking);
  await setOutput('state', 'INFRASTRUCTURE_FAILURE');
  await setOutput('classification', 'INFRASTRUCTURE_FAILURE');
  await setOutput('categories', 'INFRASTRUCTURE_FAILURE');
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
  await setOutput('blocking', infrastructureBlocking);
  await setOutput('state', 'INFRASTRUCTURE_FAILURE');
  await setOutput('classification', 'INFRASTRUCTURE_FAILURE');
  await setOutput('categories', 'INFRASTRUCTURE_FAILURE');
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
  await setOutput('blocking', infrastructureBlocking);
  await setOutput('state', 'INFRASTRUCTURE_FAILURE');
  await setOutput('classification', 'INFRASTRUCTURE_FAILURE');
  await setOutput('categories', 'INFRASTRUCTURE_FAILURE');
  process.exit(0);
}

// Everything here is READ from the canonical summary. The gate does not derive a
// verdict of its own: the engine already classified the run, and a second
// derivation is exactly how the old pipeline ended up with the workflow, the
// engine, and the notifier disagreeing about the same result.
const visual = summary.visualDifferences.length;
const captureFailures = (summary.captureFailures || []).length;
const missing = summary.missingBaselines.length;
const coverageProblems = (summary.coverageProblems || []).length;
const infrastructure = (summary.infrastructureFailures || []).length;
const strict = Boolean(summary.gate?.strict ?? summary.strict);
const blocking = Boolean(summary.gate?.blocking);
const state = summary.state || 'UNKNOWN';
const categories = summary.categories || [];
const comparison = summary.comparison || null;
const notification = summary.notification || { status: 'unknown' };
const coverage = summary.coverage && !summary.coverage.error ? summary.coverage : null;

// Reported for humans and for the workflow's step outputs; NOT a decision.
const classification = categories.length > 0 ? categories.join('+') : 'CLEAN';

await writeStepSummary(renderJobSummary());

// Annotations. Each category gets its own, so the run page never conflates a
// framework failure with a visual change. Severity signals "needs attention",
// not "blocks the build" — the gate below is separate and non-blocking.
for (const failure of summary.missingBaselines) {
  await annotate(
    'warning',
    'Visual regression: baseline approval required (non-blocking)',
    `${failure.snapshot || failure.title}: no approved baseline, so it could not be compared. ` +
      'Render candidates with the Visual Regression Baseline workflow, review, then approve.',
  );
}

for (const failure of summary.captureFailures || []) {
  await annotate(
    'warning',
    'Visual regression: spec requires attention (non-blocking)',
    `${failure.snapshot || failure.title} was NOT compared — ${firstLine(failure.error || failure.message)} ` +
      `Coverage for this screen is unavailable until the spec is repaired (${failure.spec || failure.file}).`,
  );
}

for (const problem of summary.coverageProblems || []) {
  await annotate(
    'notice',
    'Visual regression: coverage maintenance (non-blocking)',
    `${problem.snapshot} [${problem.kind}] — ${firstLine(problem.reason)}`,
  );
}

// `error` on purpose: a broken engine must never be skimmed as a green run, even
// though it does not block.
for (const failure of summary.infrastructureFailures || []) {
  await annotate(
    'error',
    'Visual regression: infrastructure failure',
    `${failure.title}: ${firstLine(failure.message)} ` +
      'This run cannot be read as a successful visual comparison.',
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
await setOutput('state', state);
await setOutput('classification', classification);
await setOutput('categories', categories.join(','));
await setOutput('visual_differences', String(visual));
await setOutput('capture_failures', String(captureFailures));
await setOutput('missing_baselines', String(missing));
await setOutput('coverage_problems', String(coverageProblems));
await setOutput('infrastructure_failures', String(infrastructure));
// Compat with any consumer written against the previous output name.
await setOutput('execution_failures', String(captureFailures + infrastructure));
await setOutput('notification_status', notification.status || 'unknown');

console.log(
  `[gate] state=${state} blocking=${blocking} visual=${visual} capture=${captureFailures} ` +
    `missing=${missing} coverage=${coverageProblems} infra=${infrastructure} notification=${notification.status}`,
);

process.exit(0);

// -----------------------------------------------------------------------------

function validateSummary(value) {
  const problems = [];

  for (const field of [
    'visualDifferences',
    'captureFailures',
    'missingBaselines',
    'coverageProblems',
    'infrastructureFailures',
  ]) {
    if (!Array.isArray(value?.[field])) problems.push(`\`${field}\` must be an array`);
  }

  if (typeof value?.status !== 'string') problems.push('`status` must be a string');
  if (typeof value?.state !== 'string') problems.push('`state` must be a string');
  if (!value?.gate || typeof value.gate !== 'object') {
    problems.push('`gate` must be an object produced by the engine');
  } else if (typeof value.gate.blocking !== 'boolean') {
    problems.push('`gate.blocking` must be a boolean');
  }

  return problems;
}

function renderJobSummary() {
  const verdict = blocking
    ? '❌ BLOCKING'
    : infrastructure > 0
      ? '🚨 INFRASTRUCTURE FAILURE (non-blocking)'
      : visual > 0
        ? '⚠️ VISUAL CHANGES (non-blocking)'
        : missing > 0 || captureFailures > 0 || coverageProblems > 0
          ? '⚠️ INCOMPLETE (non-blocking)'
          : '✅ CLEAN';

  const lines = [
    `## Visual Regression — ${verdict}`,
    '',
    '| | |',
    '| --- | --- |',
    `| State | \`${state}\` |`,
    `| Categories | ${categories.length > 0 ? categories.map((c) => `\`${c}\``).join(', ') : '`none`'} |`,
    `| Blocking | ${blocking ? 'yes' : 'no'} |`,
    `| Strict mode | ${strict ? 'on' : 'off'} |`,
    `| Legacy status | \`${summary.status}\` |`,
    `| Execution profile | \`${summary.environment?.profile || 'unknown'}\` |`,
    `| Visual execution performed | ${summary.executed === false ? 'no' : 'yes'} |`,
    `| Visual differences | ${visual} |`,
    `| Capture failures (not compared) | ${captureFailures} |`,
    `| Missing baselines (approval required) | ${missing} |`,
    `| Coverage problems | ${coverageProblems} |`,
    `| Infrastructure failures | ${infrastructure} |`,
    `| Pipeline exit code | \`${pipelineExitCode}\` |`,
    `| Notification | \`${notification.status}\` |`,
    '',
  ];

  if (comparison) {
    lines.push(
      '### Comparison',
      '',
      '| Expected | Captured | Compared | Unchanged | Changed |',
      '| ---: | ---: | ---: | ---: | ---: |',
      `| ${comparison.expected} | ${comparison.captured} | ${comparison.compared} | ${comparison.unchanged} | ${comparison.changed} |`,
      '',
    );
  }

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

  if (captureFailures > 0) {
    lines.push(
      '### Visual specs requiring attention (non-blocking)',
      '',
      'These specs never reached their screenshot assertion, so **no visual comparison was performed**. This is not a visual change — coverage for these screens is temporarily unavailable.',
      '',
      '| Snapshot | Spec | Reason | Comparison |',
      '| --- | --- | --- | --- |',
    );
    for (const failure of summary.captureFailures) {
      lines.push(
        `| \`${failure.snapshot || 'unknown'}\` | \`${failure.spec || failure.file || 'n/a'}\` | ${escapeCell(
          firstLine(failure.error || failure.message),
        )} | NOT PERFORMED |`,
      );
    }
    lines.push('');
  }

  if (missing > 0) {
    lines.push(
      '### Baselines requiring approval (non-blocking)',
      '',
      'A current screenshot may have been captured, but there is no approved previous screenshot to compare it against. Current screenshots are **never** promoted automatically.',
      '',
    );
    for (const failure of summary.missingBaselines) {
      lines.push(
        `- \`${failure.snapshot || failure.title}\` — ${firstLine(failure.reason || failure.message)}`,
      );
    }
    lines.push(
      '',
      'Render candidates with the **Visual Regression Baseline** workflow, review them, then approve with `npm run test:regression:baseline:approve` and commit.',
      '',
    );
  }

  if (coverageProblems > 0) {
    lines.push(
      '### Coverage maintenance findings (non-blocking)',
      '',
      'The coverage registry, the visual specs and the approved baselines disagree. Framework maintenance — other screenshots were still compared.',
      '',
    );
    for (const problem of summary.coverageProblems) {
      lines.push(
        `- \`${problem.snapshot}\` [${problem.kind || 'coverage'}] — ${firstLine(problem.reason)}`,
      );
    }
    lines.push('');
  }

  if (infrastructure > 0) {
    lines.push(
      '### Visual regression infrastructure failure',
      '',
      '**The visual-regression engine could not complete reliably. This run must not be read as a successful visual comparison.**',
      '',
    );
    for (const failure of summary.infrastructureFailures) {
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
