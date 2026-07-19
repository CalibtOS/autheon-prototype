#!/usr/bin/env node
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const options = {
  strict: args.includes('--strict') || isTruthy(process.env.VISUAL_REGRESSION_STRICT),
  noClean: args.includes('--no-clean'),
  reuseResults: args.includes('--reuse-results'),
  help: args.includes('--help') || args.includes('-h'),
};

const passthroughArgs = args.filter(
  (arg) => !['--strict', '--no-clean', '--reuse-results', '--help', '-h'].includes(arg),
);

const settings = {
  testDir: process.env.VISUAL_REGRESSION_TEST_DIR || 'tests/regression',
  grep: process.env.VISUAL_REGRESSION_GREP || '@visual-regression',
  project: process.env.VISUAL_REGRESSION_PROJECT || 'chromium',
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
const command = [
  relativeCommand(playwrightBinary()),
  'test',
  settings.testDir,
  '--grep',
  settings.grep,
  '--project',
  settings.project,
  ...passthroughArgs,
].join(' ');

let playwrightExitCode = 0;
let analysis;
let summaryMarkdown = '';
let archivePath = path.resolve(paths.artifactDir, settings.archiveName);

try {
  await prepareOutputDirectories();

  const visualBaselineCount = await countFiles(paths.baselineDir, (filePath) =>
    filePath.endsWith('.png'),
  );

  log(`Visual regression CI run started at ${startedAt.toISOString()}`);
  log(`Command: ${command}`);
  log(`Baseline directory: ${settings.baselineDir} (${visualBaselineCount} PNG files)`);
  log(`Playwright report directory: ${settings.playwrightReportDir}`);
  log(`Test results directory: ${settings.testResultsDir}`);

  if (visualBaselineCount === 0) {
    analysis = createPreflightFailure(
      'No approved visual baselines were found. Restore or commit tests/regression/snapshots before running CI comparison.',
      visualBaselineCount,
    );
  } else {
    if (!options.reuseResults) {
      playwrightExitCode = await runPlaywright();
    } else {
      log('Skipping Playwright execution and packaging existing results (--reuse-results).');
    }

    analysis = await analyzeRun(playwrightExitCode, visualBaselineCount);
  }

  summaryMarkdown = renderSummaryMarkdown(analysis);
  await writeSummaryFiles(analysis, summaryMarkdown);
  await appendGitHubStepSummary(summaryMarkdown);
  printTerminalSummary(analysis);
  emitGitHubAnnotations(analysis);

  archivePath = await createArchive(analysis, summaryMarkdown);
  const archiveSha256 = await sha256File(archivePath);
  log(`Artifact archive: ${toWorkspacePath(archivePath)}`);
  log(`Archive SHA-256: ${archiveSha256}`);

  if (analysis.executionFailures.length > 0 || analysis.missingBaselines.length > 0) {
    process.exitCode = playwrightExitCode || 1;
  } else if (analysis.visualDifferences.length > 0 && options.strict) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
} catch (error) {
  console.error(`[visual-regression] ERROR: ${error.stack || error.message || String(error)}`);
  process.exitCode = 1;
}

function printHelp() {
  console.log(`Usage: node scripts/visual-regression-ci.mjs [--strict] [--no-clean] [--reuse-results] [playwright args...]

Runs the @visual-regression Playwright suite, writes structured summaries, and
packages one CI artifact archive without auto-updating approved baselines.

Environment:
  VISUAL_REGRESSION_GREP          Playwright grep filter. Default: @visual-regression
  VISUAL_REGRESSION_PROJECT       Playwright project. Default: chromium
  VISUAL_BASELINE_DIR             Approved snapshots. Default: tests/regression/snapshots
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
  const playwrightArgs = [
    'test',
    settings.testDir,
    '--grep',
    settings.grep,
    '--project',
    settings.project,
    ...passthroughArgs,
  ];

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

function createPreflightFailure(message, visualBaselineCount) {
  return {
    createdAt: new Date().toISOString(),
    command,
    ci: Boolean(process.env.CI),
    strict: options.strict,
    platform: process.platform,
    node: process.version,
    playwrightExitCode: 1,
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
    missingBaselines: [
      {
        title: 'Approved baseline preflight',
        file: settings.baselineDir,
        message,
      },
    ],
    executionFailures: [],
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

  const lines = [
    '# Visual Regression CI Summary',
    '',
    `- Status: ${statusLabel}`,
    `- Blocking result: ${isBlocking(run) ? 'yes' : 'no'}`,
    `- Strict visual mode: ${run.strict ? 'yes' : 'no'}`,
    `- Playwright exit code: ${run.playwrightExitCode}`,
    `- Total tests: ${run.totalTests}`,
    `- Expected/pass count: ${run.expected}`,
    `- Visual differences: ${run.visualDifferences.length}`,
    `- Missing baselines: ${run.missingBaselines.length}`,
    `- Execution failures: ${run.executionFailures.length}`,
    `- Approved baseline: ${run.baselineDir} (${run.visualBaselineCount} PNG files)`,
    `- HTML report: ${run.playwrightReport}`,
    `- Test results: ${run.testResults}`,
    `- Archive: ${path.join(settings.artifactDir, run.archiveName)}`,
    '',
  ];

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
    '## Baseline Approval Rule',
    '',
    'Detected visual differences do not update approved baselines automatically. Review the HTML report and image evidence first. Only after approval, run `npm run test:regression:visual:update` and commit the changed files under `tests/regression/snapshots`.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

async function writeSummaryFiles(run, summaryMarkdown) {
  const summaryDir = path.join(paths.artifactDir, 'visual-regression-summary');
  await fs.mkdir(summaryDir, { recursive: true });
  await fs.writeFile(path.join(summaryDir, 'summary.md'), summaryMarkdown, 'utf8');
  await fs.writeFile(path.join(summaryDir, 'summary.json'), `${JSON.stringify(run, null, 2)}\n`, 'utf8');
  await fs.writeFile(
    path.join(summaryDir, 'manifest.json'),
    `${JSON.stringify(
      {
        createdAt: run.createdAt,
        status: run.status,
        blocking: isBlocking(run),
        archiveName: settings.archiveName,
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

async function appendGitHubStepSummary(summaryMarkdown) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `\n${summaryMarkdown}\n`, 'utf8');
}

function printTerminalSummary(run) {
  const blocking = isBlocking(run);
  log(
    `Completed with status=${run.status}, blocking=${blocking ? 'yes' : 'no'}, visualDifferences=${run.visualDifferences.length}, executionFailures=${run.executionFailures.length}, missingBaselines=${run.missingBaselines.length}`,
  );

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
