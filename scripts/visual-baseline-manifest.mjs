#!/usr/bin/env node
/**
 * Approved-baseline manifest tool.
 *
 *   node scripts/visual-baseline-manifest.mjs --write    Regenerate the manifest
 *   node scripts/visual-baseline-manifest.mjs --verify   Verify disk vs manifest
 *
 * The manifest (`tests/regression/snapshots/baseline-manifest.json`) records the
 * checksum, byte size, and pixel dimensions of every approved baseline plus the
 * environment that produced them. It is the provenance record the CI preflight
 * checks before Playwright starts, so a baseline that was edited outside the
 * approval command is detected instead of silently trusted.
 *
 * `--write` is a *provenance* update, not an approval: it only records what is
 * already in tests/regression/snapshots. Images get there through
 * scripts/approve-visual-baselines.mjs after human review.
 */
import {
  APPROVED_PLATFORM,
  baselineVerificationBlocking,
  baselineVerificationMessages,
  buildManifest,
  toWorkspacePath,
  verifyBaselines,
  writeManifest,
} from './lib/visual-baseline.mjs';

const args = process.argv.slice(2);
const mode = args.includes('--verify') ? 'verify' : 'write';
const platform = readOption('--platform') || APPROVED_PLATFORM;
const asJson = args.includes('--json');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/visual-baseline-manifest.mjs [--write|--verify] [--platform <name>] [--json]

  --write    (default) Regenerate baseline-manifest.json from the approved
             baselines currently in tests/regression/snapshots.
  --verify   Verify the approved baselines against the manifest: presence,
             checksums, PNG validity, and unexpected extra files.
  --platform Platform whose baselines are the approved set. Default: ${APPROVED_PLATFORM}.
  --json     Print the machine-readable report instead of the human summary.
`);
  process.exit(0);
}

if (mode === 'write') {
  const manifest = await buildManifest({
    platform,
    environment: {
      generatedOnPlatform: process.platform,
      node: process.version,
    },
  });

  const invalid = manifest.baselines.filter((entry) => !entry.valid);
  if (invalid.length > 0) {
    for (const entry of invalid) {
      console.error(`[baseline-manifest] Refusing to record ${entry.file}: ${entry.invalidReason}.`);
    }
    console.error(
      '[baseline-manifest] Fix or re-render the corrupt baseline(s) before regenerating the manifest.',
    );
    process.exit(1);
  }

  const written = await writeManifest(manifest);

  if (asJson) {
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    console.log(
      `[baseline-manifest] Recorded ${manifest.baselineCount} approved ${platform} baseline(s) in ${toWorkspacePath(
        written,
      )}.`,
    );
    console.log(
      '[baseline-manifest] Commit the manifest together with the baseline images so CI can verify provenance.',
    );
  }

  process.exit(0);
}

const report = await verifyBaselines({ platform });

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`[baseline-manifest] Baseline directory: ${report.baselineDir}`);
  console.log(`[baseline-manifest] Baseline revision:  ${report.baselineRevision || 'unknown'}`);
  console.log(`[baseline-manifest] Manifest present:   ${report.manifestPresent ? 'yes' : 'no'}`);
  console.log(
    `[baseline-manifest] Expected ${report.expectedCount}, found ${report.foundCount}, verified ${report.verifiedCount}.`,
  );

  if (report.unexpectedFiles.length > 0) {
    // Cap the list: an empty or relocated manifest makes every file unexpected,
    // and printing hundreds of paths buries the actual finding.
    const shown = report.unexpectedFiles.slice(0, 10);
    console.log(
      `[baseline-manifest] ${report.unexpectedFiles.length} baseline file(s) on disk are not recorded in the manifest:`,
    );
    for (const file of shown) console.log(`[baseline-manifest]   - ${file}`);
    if (report.unexpectedFiles.length > shown.length) {
      console.log(
        `[baseline-manifest]   … and ${report.unexpectedFiles.length - shown.length} more. Regenerate with "npm run test:regression:baseline:manifest".`,
      );
    }
  }

  for (const message of baselineVerificationMessages(report)) {
    console.error(`[baseline-manifest] ${message}`);
  }
}

process.exit(baselineVerificationBlocking(report) ? 1 : 0);

function readOption(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}
