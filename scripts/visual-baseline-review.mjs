#!/usr/bin/env node
/**
 * Old-vs-candidate baseline review report.
 *
 * Turns "here are 46 PNGs" into a reviewable diff: what was added, changed,
 * removed, or renamed, plus the guard-rail checks that catch the ways a bulk
 * baseline update goes wrong (blank pages, collapsed layouts, missing fonts,
 * wrong viewport, a fixture that failed to load).
 *
 *   node scripts/visual-baseline-review.mjs \
 *     --before <dir> --candidates <dir> [--reason <text>] [--out <dir>]
 *
 * Writes review.json + review.md into --out. Exits 0 always: this is a review
 * aid, and the decision to approve stays with a person.
 */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import {
  APPROVED_PLATFORM,
  inspectPng,
  sha256File,
  snapshotIdFromBaselineFile,
  walkFiles,
} from './lib/visual-baseline.mjs';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/visual-baseline-review.mjs --before <dir> --candidates <dir> [--reason <text>] [--out <dir>]

  --before      Directory holding the CURRENT approved baselines.
  --candidates  Directory holding freshly rendered candidates.
  --reason      Why baselines are being regenerated (recorded in the report).
  --out         Where to write review.json and review.md. Default: <candidates>/review
  --platform    Baseline platform. Default: ${APPROVED_PLATFORM}
`);
  process.exit(0);
}

const beforeDir = readOption('--before');
const candidateDir = readOption('--candidates');
const reason = readOption('--reason') || '(no reason recorded)';
const platform = readOption('--platform') || APPROVED_PLATFORM;
const outDir = readOption('--out') || path.join(candidateDir || '.', 'review');

if (!beforeDir || !candidateDir) {
  console.error('[baseline-review] --before and --candidates are both required.');
  process.exit(1);
}

const before = await indexBaselines(beforeDir, platform);
const candidates = await indexBaselines(candidateDir, platform);

const review = {
  generatedAt: new Date().toISOString(),
  reason,
  platform,
  beforeDir,
  candidateDir,
  counts: {
    before: before.size,
    candidates: candidates.size,
    added: 0,
    changed: 0,
    unchanged: 0,
    removed: 0,
    renamed: 0,
  },
  added: [],
  changed: [],
  unchanged: [],
  removed: [],
  renamed: [],
  warnings: [],
  approvalBlockers: [],
};

// Content hash -> snapshot IDs, used to spot renames (identical pixels under a
// new name) instead of reporting them as one removal plus one addition.
const beforeByHash = new Map();
for (const entry of before.values()) {
  const list = beforeByHash.get(entry.sha256) || [];
  list.push(entry);
  beforeByHash.set(entry.sha256, list);
}

for (const [snapshotId, candidate] of candidates) {
  const previous = before.get(snapshotId);

  if (!previous) {
    const sameContent = (beforeByHash.get(candidate.sha256) || []).filter(
      (entry) => !candidates.has(entry.snapshotId),
    );

    if (sameContent.length > 0) {
      review.renamed.push({
        from: sameContent[0].snapshotId,
        to: snapshotId,
        sha256: candidate.sha256,
        note: 'Identical pixels under a new snapshot ID.',
      });
      continue;
    }

    review.added.push({
      snapshotId,
      file: candidate.file,
      sha256: candidate.sha256,
      dimensions: `${candidate.width}x${candidate.height}`,
      bytes: candidate.bytes,
    });
    continue;
  }

  if (previous.sha256 === candidate.sha256) {
    review.unchanged.push({ snapshotId, sha256: candidate.sha256 });
    continue;
  }

  review.changed.push({
    snapshotId,
    file: candidate.file,
    beforeSha256: previous.sha256,
    afterSha256: candidate.sha256,
    beforeDimensions: `${previous.width}x${previous.height}`,
    afterDimensions: `${candidate.width}x${candidate.height}`,
    beforeBytes: previous.bytes,
    afterBytes: candidate.bytes,
    dimensionsChanged:
      previous.width !== candidate.width || previous.height !== candidate.height,
    bytesDeltaPercent:
      previous.bytes > 0
        ? Math.round(((candidate.bytes - previous.bytes) / previous.bytes) * 10000) / 100
        : null,
  });
}

const renamedFrom = new Set(review.renamed.map((entry) => entry.from));
for (const [snapshotId, entry] of before) {
  if (candidates.has(snapshotId) || renamedFrom.has(snapshotId)) continue;
  review.removed.push({
    snapshotId,
    file: entry.file,
    note: 'Present in the approved set but not rendered by this candidate run.',
  });
}

review.counts.added = review.added.length;
review.counts.changed = review.changed.length;
review.counts.unchanged = review.unchanged.length;
review.counts.removed = review.removed.length;
review.counts.renamed = review.renamed.length;

applyGuardRails();

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'review.json'), `${JSON.stringify(review, null, 2)}\n`, 'utf8');
await fs.writeFile(path.join(outDir, 'review.md'), renderMarkdown(), 'utf8');

console.log(
  `[baseline-review] ${review.counts.added} added, ${review.counts.changed} changed, ${review.counts.removed} removed, ${review.counts.renamed} renamed, ${review.counts.unchanged} unchanged.`,
);
for (const blocker of review.approvalBlockers) {
  console.log(`[baseline-review] DO NOT APPROVE: ${blocker}`);
}
for (const warning of review.warnings) {
  console.log(`[baseline-review] WARNING: ${warning}`);
}
console.log(`[baseline-review] Report written to ${path.join(outDir, 'review.md')}`);

process.exit(0);

// -----------------------------------------------------------------------------

/**
 * Heuristics for accidental mass approval.
 *
 * These do not decide anything; they tell a reviewer where to look first. Every
 * one of them corresponds to a way a bulk baseline update has gone wrong before:
 * a stylesheet that 404'd, a font that never loaded, a fixture that returned
 * nothing, or a viewport that was not applied.
 */
function applyGuardRails() {
  const total = review.counts.before;
  const churn = review.counts.changed + review.counts.removed;

  if (total > 0 && churn / total > 0.5) {
    review.approvalBlockers.push(
      `${churn} of ${total} approved baselines changed or disappeared (${Math.round(
        (churn / total) * 100,
      )}%). A change that large is far more often broken CSS, a font that did not load, or a failed fixture than a real design change. Confirm the intent screen by screen before approving.`,
    );
  }

  if (review.counts.candidates === 0) {
    review.approvalBlockers.push(
      'The candidate run produced no baselines at all. Approving this would delete the entire approved set.',
    );
  }

  // A near-empty PNG at full viewport size is the classic blank-page signature:
  // large canvas, tiny compressed payload.
  for (const entry of [...candidates.values()]) {
    const pixels = entry.width * entry.height;
    if (pixels > 200_000 && entry.bytes < 15_000) {
      review.approvalBlockers.push(
        `${entry.snapshotId} is ${entry.width}x${entry.height} but only ${entry.bytes} bytes. That compression ratio usually means a blank or nearly blank page (failed data load, missing stylesheet, or an auth redirect).`,
      );
    }
  }

  for (const entry of review.changed) {
    if (entry.dimensionsChanged) {
      review.warnings.push(
        `${entry.snapshotId} changed size (${entry.beforeDimensions} -> ${entry.afterDimensions}). Confirm the viewport and device scale factor are unchanged before treating this as a design change.`,
      );
    }

    if (typeof entry.bytesDeltaPercent === 'number' && entry.bytesDeltaPercent < -60) {
      review.warnings.push(
        `${entry.snapshotId} shrank ${Math.abs(entry.bytesDeltaPercent)}% in file size. Large drops usually mean content or webfonts failed to render.`,
      );
    }
  }

  const distinctWidths = new Set([...candidates.values()].map((entry) => entry.width));
  if (distinctWidths.size > 1) {
    review.warnings.push(
      `Candidates span ${distinctWidths.size} distinct widths (${[...distinctWidths].sort((a, b) => a - b).join(', ')}). Expected when multiple viewport projects render; suspicious when only one project ran.`,
    );
  }

  if (review.counts.removed > 0) {
    review.warnings.push(
      `${review.counts.removed} previously approved baseline(s) were not re-rendered. Confirm each one is genuinely retired — the approval command does not delete files, so a stale baseline will linger as a coverage orphan.`,
    );
  }
}

async function indexBaselines(root, platformName) {
  const index = new Map();
  if (!fsSync.existsSync(root)) return index;

  const suffix = `-${platformName}.png`;
  for (const filePath of await walkFiles(root)) {
    if (!filePath.endsWith(suffix)) continue;

    const png = await inspectPng(filePath);
    index.set(snapshotIdFromBaselineFile(filePath, platformName), {
      snapshotId: snapshotIdFromBaselineFile(filePath, platformName),
      file: path.relative(root, filePath).split(path.sep).join('/'),
      sha256: await sha256File(filePath),
      bytes: png.bytes ?? 0,
      width: png.width ?? 0,
      height: png.height ?? 0,
      valid: png.valid,
    });
  }

  return index;
}

function renderMarkdown() {
  const lines = [
    '# Approved Baseline Review',
    '',
    `- Generated: ${review.generatedAt}`,
    `- Platform: \`${review.platform}\``,
    `- Reason given: ${review.reason}`,
    `- Approved baselines before: ${review.counts.before}`,
    `- Candidates rendered: ${review.counts.candidates}`,
    '',
    '| Change | Count |',
    '| --- | ---: |',
    `| Added | ${review.counts.added} |`,
    `| Changed | ${review.counts.changed} |`,
    `| Removed (not re-rendered) | ${review.counts.removed} |`,
    `| Renamed (identical pixels) | ${review.counts.renamed} |`,
    `| Unchanged | ${review.counts.unchanged} |`,
    '',
  ];

  if (review.approvalBlockers.length > 0) {
    lines.push('## ⛔ Do not approve without resolving these', '');
    for (const blocker of review.approvalBlockers) lines.push(`- ${blocker}`);
    lines.push('');
  }

  if (review.warnings.length > 0) {
    lines.push('## ⚠️ Check before approving', '');
    for (const warning of review.warnings) lines.push(`- ${warning}`);
    lines.push('');
  }

  pushTable('Added snapshots', review.added, ['snapshotId', 'dimensions', 'bytes']);
  pushTable('Changed snapshots', review.changed, [
    'snapshotId',
    'beforeDimensions',
    'afterDimensions',
    'bytesDeltaPercent',
  ]);
  pushTable('Renamed snapshots', review.renamed, ['from', 'to']);
  pushTable('Removed snapshots', review.removed, ['snapshotId', 'note']);

  lines.push(
    '## How to approve',
    '',
    '1. Open every **Added** and **Changed** image and confirm the change is intended.',
    '2. Resolve every ⛔ blocker above. A blocker means the candidate run itself is suspect.',
    '3. Extract this artifact into `visual-regression-artifacts/docker-ci/baseline-candidates/`.',
    '4. Run `npm run test:regression:baseline:approve` (add `--dry-run` first to preview).',
    '5. Run `npm run test:regression:baseline:manifest` to regenerate the provenance record.',
    '6. Commit the changed files under `tests/regression/snapshots/` **together with** `baseline-manifest.json`.',
    '',
    'The approval command never deletes an approved baseline. Retire a snapshot by marking its',
    'registry scenario `deprecated` with an `exclusionReason`, then removing the file in the same',
    'reviewed commit.',
    '',
  );

  return `${lines.join('\n')}\n`;

  function pushTable(title, rows, columns) {
    if (rows.length === 0) return;
    lines.push(`## ${title} (${rows.length})`, '');
    lines.push(`| ${columns.join(' | ')} |`);
    lines.push(`| ${columns.map(() => '---').join(' | ')} |`);
    for (const row of rows) {
      lines.push(`| ${columns.map((column) => String(row[column] ?? '')).join(' | ')} |`);
    }
    lines.push('');
  }
}

function readOption(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}
