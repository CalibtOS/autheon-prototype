/**
 * Shared approved-baseline logic.
 *
 * One module owns the answer to "what is an approved baseline, where does it
 * live, and is it intact?" so the CI wrapper, the manifest generator, the
 * approval command, and the coverage audit cannot drift apart.
 *
 * Docker/Linux is the canonical rendering environment: only
 * `*-<project>-linux.png` files count as approved. macOS/Windows PNGs are
 * developer scratch output and are ignored by git on purpose.
 */
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(__dirname, '..', '..');

/**
 * Platform whose baselines are the approved set.
 *
 * Always `linux` in CI. `VISUAL_REGRESSION_APPROVED_PLATFORM` exists so a
 * developer can validate the *framework itself* against their own platform's
 * scratch baselines without Docker. The value is recorded in summary.json and
 * in every report, so a run against a non-canonical baseline set can never be
 * mistaken for a canonical one.
 */
export const APPROVED_PLATFORM = process.env.VISUAL_REGRESSION_APPROVED_PLATFORM || 'linux';

export const CANONICAL_PLATFORM = 'linux';

export const MANIFEST_VERSION = 1;
export const MANIFEST_FILE_NAME = 'baseline-manifest.json';

const PNG_SIGNATURE = '89504e470d0a1a0a';

export function baselineDir() {
  return path.resolve(
    repoRoot,
    process.env.VISUAL_BASELINE_DIR || 'tests/regression/snapshots',
  );
}

/**
 * The canonical Linux set uses `baseline-manifest.json`. A non-canonical local
 * set gets its own `baseline-manifest.<platform>.json` (gitignored) so a
 * developer validating the framework on macOS can never overwrite the committed
 * provenance record for the approved Linux baselines.
 */
export function manifestPath(platform = APPROVED_PLATFORM) {
  const fileName =
    platform === CANONICAL_PLATFORM
      ? MANIFEST_FILE_NAME
      : `baseline-manifest.${platform}.json`;
  return path.join(baselineDir(), fileName);
}

export function toWorkspacePath(filePath) {
  if (!filePath) return null;
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

/** Recursively list files under `root`. Returns [] when the root is absent. */
export async function walkFiles(root) {
  if (!fsSync.existsSync(root)) return [];

  const found = [];
  const entries = await fs.readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) found.push(...(await walkFiles(entryPath)));
    else found.push(entryPath);
  }

  return found.sort();
}

/**
 * Approved baseline PNGs for `platform`.
 *
 * Snapshot files are named `<snapshotId>-<projectName>-<platform>.png` by the
 * `snapshotPathTemplate` in playwright.config.ts.
 */
export async function listApprovedBaselines(platform = APPROVED_PLATFORM) {
  const suffix = `-${platform}.png`;
  const files = await walkFiles(baselineDir());

  return files
    .filter((filePath) => filePath.endsWith(suffix))
    .map((filePath) => ({
      absolutePath: filePath,
      file: toWorkspacePath(filePath),
      snapshotId: snapshotIdFromBaselineFile(filePath, platform),
      project: projectFromBaselineFile(filePath, platform),
      specDir: path.basename(path.dirname(filePath)),
    }));
}

/** `admin-overview-chromium-linux.png` -> `admin-overview.png` */
export function snapshotIdFromBaselineFile(filePath, platform = APPROVED_PLATFORM) {
  const base = path.basename(filePath);
  const withoutPlatform = base.replace(new RegExp(`-${platform}\\.png$`), '');
  // Drop the trailing `-<projectName>` segment that the path template adds.
  return `${withoutPlatform.replace(/-[^-]+$/, '')}.png`;
}

export function projectFromBaselineFile(filePath, platform = APPROVED_PLATFORM) {
  const base = path.basename(filePath);
  const match = base.match(new RegExp(`-([^-]+)-${platform}\\.png$`));
  return match ? match[1] : null;
}

export async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(await fs.readFile(filePath));
  return hash.digest('hex');
}

/**
 * Structural PNG check.
 *
 * A truncated or zero-byte baseline is worse than a missing one: Playwright
 * would fail with an opaque decode error instead of a classified
 * missing-baseline result. Verify the signature, the IHDR dimensions, and that
 * an IEND chunk terminates the file.
 */
export async function inspectPng(filePath) {
  const buffer = await fs.readFile(filePath);

  if (buffer.length === 0) {
    return { valid: false, reason: 'file is empty (0 bytes)' };
  }

  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) {
    return { valid: false, reason: 'missing PNG signature' };
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  if (width === 0 || height === 0) {
    return { valid: false, reason: `degenerate dimensions ${width}x${height}` };
  }

  if (!buffer.subarray(-12).includes(Buffer.from('IEND', 'ascii'))) {
    return { valid: false, reason: 'no IEND chunk (file is truncated)' };
  }

  return { valid: true, bytes: buffer.length, width, height };
}

/** Build a manifest object from whatever is currently on disk. */
export async function buildManifest({
  platform = APPROVED_PLATFORM,
  environment = {},
} = {}) {
  const baselines = await listApprovedBaselines(platform);
  const entries = [];

  for (const baseline of baselines) {
    const png = await inspectPng(baseline.absolutePath);
    entries.push({
      file: baseline.file,
      snapshotId: baseline.snapshotId,
      project: baseline.project,
      sha256: await sha256File(baseline.absolutePath),
      bytes: png.bytes ?? null,
      width: png.width ?? null,
      height: png.height ?? null,
      valid: png.valid,
      ...(png.valid ? {} : { invalidReason: png.reason }),
    });
  }

  return {
    manifestVersion: MANIFEST_VERSION,
    platform,
    // Playwright's {platform} token is only "linux" — it does NOT distinguish
    // linux/arm64 from linux/amd64, but Chromium rasterizes text differently on
    // the two. Recording the architecture is what lets a run detect that it is
    // comparing against a baseline set rendered on a different CPU architecture
    // instead of silently reporting the difference as a visual change.
    architecture: process.arch,
    generatedAt: new Date().toISOString(),
    generator: 'scripts/visual-baseline-manifest.mjs',
    approvalNote:
      'Approved baselines are rendered inside docker/visual-regression-ci.Dockerfile and promoted only by scripts/approve-visual-baselines.mjs after human review.',
    environment: {
      playwrightVersion: playwrightVersion(),
      architecture: process.arch,
      dockerBaseImage:
        process.env.VISUAL_REGRESSION_DOCKER_BASE_IMAGE || 'node:24-bookworm-slim',
      // The base image tag is floating, so the tag alone does not identify the
      // font stack that rendered these images. The digest does.
      imageDigest: process.env.VISUAL_REGRESSION_IMAGE_DIGEST || null,
      ...environment,
    },
    baselineCount: entries.length,
    baselines: entries,
  };
}

export async function readManifest(platform = APPROVED_PLATFORM) {
  const filePath = manifestPath(platform);
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw new Error(`${path.basename(filePath)} is not readable JSON: ${error.message}`);
  }
}

export async function writeManifest(manifest) {
  const filePath = manifestPath(manifest.platform);
  await fs.mkdir(baselineDir(), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return filePath;
}

/**
 * Verify the approved baseline set for `platform`.
 *
 * Returns a structured report. Callers decide the gate policy; this function
 * never exits the process, so the same check can drive the CI preflight, the
 * approval command, and a local sanity check.
 */
export async function verifyBaselines({ platform = APPROVED_PLATFORM } = {}) {
  const report = {
    platform,
    baselineDir: toWorkspacePath(baselineDir()),
    manifestFile: toWorkspacePath(manifestPath(platform)),
    manifestPresent: false,
    manifestVersion: null,
    manifestGeneratedAt: null,
    manifestEnvironment: null,
    // CPU architecture the approved set was rendered on. null for a manifest
    // written before architecture was recorded.
    manifestArchitecture: null,
    baselineRevision: gitBaselineRevision(),
    expectedCount: 0,
    foundCount: 0,
    verifiedCount: 0,
    missingFiles: [],
    unexpectedFiles: [],
    corruptFiles: [],
    checksumMismatches: [],
    errors: [],
  };

  const found = await listApprovedBaselines(platform);
  report.foundCount = found.length;
  // The approved set as it existed BEFORE any test ran.
  //
  // This matters because `toHaveScreenshot()` writes a missing snapshot into the
  // snapshot directory and then fails the test. Those files are NOT approved, but
  // anything that re-lists the directory after the run would count them as if
  // they were — overstating coverage and, worse, putting unapproved images into
  // the artifact's "approved-baseline" copy where someone could commit them.
  // Callers that need the approved set after the run must use this snapshot.
  report.approvedFiles = found.map((entry) => entry.file);
  report.approvedSnapshotIds = found.map((entry) => entry.snapshotId);

  if (found.length === 0) {
    report.errors.push(
      `No approved visual baselines for platform "${platform}" were found in ${report.baselineDir}. ` +
        'Generate candidates with "npm run test:regression:baseline" (or the "Visual Regression Baseline" workflow), ' +
        'review them, approve with "npm run test:regression:baseline:approve", and commit the snapshots.',
    );
    return report;
  }

  const manifest = await readManifest(platform).catch((error) => {
    report.errors.push(error.message);
    return null;
  });

  const foundByFile = new Map(found.map((entry) => [entry.file, entry]));

  if (manifest) {
    report.manifestPresent = true;
    report.manifestVersion = manifest.manifestVersion ?? null;
    report.manifestGeneratedAt = manifest.generatedAt ?? null;
    report.manifestEnvironment = manifest.environment ?? null;
    report.manifestArchitecture =
      manifest.architecture ?? manifest.environment?.architecture ?? null;

    if (manifest.manifestVersion !== MANIFEST_VERSION) {
      report.errors.push(
        `${path.basename(manifestPath(platform))} declares manifestVersion ${manifest.manifestVersion}, but this framework expects ${MANIFEST_VERSION}. Regenerate it with "npm run test:regression:baseline:manifest".`,
      );
    }

    if (manifest.platform && manifest.platform !== platform) {
      report.errors.push(
        `${path.basename(manifestPath(platform))} was generated for platform "${manifest.platform}" but this run compares platform "${platform}".`,
      );
    }

    const manifestEntries = Array.isArray(manifest.baselines) ? manifest.baselines : [];
    report.expectedCount = manifestEntries.length;

    for (const entry of manifestEntries) {
      const onDisk = foundByFile.get(entry.file);
      if (!onDisk) {
        report.missingFiles.push(entry.file);
        continue;
      }
      foundByFile.delete(entry.file);

      const png = await inspectPng(onDisk.absolutePath);
      if (!png.valid) {
        report.corruptFiles.push({ file: entry.file, reason: png.reason });
        continue;
      }

      if (entry.sha256) {
        const actual = await sha256File(onDisk.absolutePath);
        if (actual !== entry.sha256) {
          report.checksumMismatches.push({
            file: entry.file,
            expectedSha256: entry.sha256,
            actualSha256: actual,
          });
          continue;
        }
      }

      report.verifiedCount += 1;
    }

    report.unexpectedFiles = [...foundByFile.keys()];
  } else {
    // No manifest yet: still refuse to run against unreadable images, but say
    // plainly that provenance cannot be proven for this run.
    report.expectedCount = found.length;
    report.errors.push(
      `${path.basename(manifestPath(platform))} is missing from ${report.baselineDir}. The run cannot prove which baseline revision or environment produced these images. Regenerate it with "npm run test:regression:baseline:manifest" and commit it.`,
    );

    for (const entry of found) {
      const png = await inspectPng(entry.absolutePath);
      if (png.valid) report.verifiedCount += 1;
      else report.corruptFiles.push({ file: entry.file, reason: png.reason });
    }
  }

  return report;
}

/** True when the verification report should block the run. */
export function baselineVerificationBlocking(report) {
  return (
    report.errors.length > 0 ||
    report.missingFiles.length > 0 ||
    report.corruptFiles.length > 0 ||
    report.checksumMismatches.length > 0
  );
}

/** Human-readable reasons a verification report is blocking. */
export function baselineVerificationMessages(report) {
  const messages = [...report.errors];

  if (report.missingFiles.length > 0) {
    messages.push(
      `${report.missingFiles.length} baseline file(s) listed in ${MANIFEST_FILE_NAME} are absent from the checkout: ${report.missingFiles
        .slice(0, 10)
        .join(', ')}${report.missingFiles.length > 10 ? ', …' : ''}`,
    );
  }

  for (const corrupt of report.corruptFiles) {
    messages.push(`Corrupt approved baseline ${corrupt.file}: ${corrupt.reason}.`);
  }

  for (const mismatch of report.checksumMismatches) {
    messages.push(
      `Checksum mismatch for ${mismatch.file}: ${MANIFEST_FILE_NAME} records ${mismatch.expectedSha256.slice(
        0,
        12,
      )}… but the file on disk hashes to ${mismatch.actualSha256.slice(
        0,
        12,
      )}…. Either the image or the manifest was changed without going through the approval command.`,
    );
  }

  return messages;
}

export function playwrightVersion() {
  try {
    const pkg = JSON.parse(
      fsSync.readFileSync(
        path.join(repoRoot, 'node_modules', '@playwright', 'test', 'package.json'),
        'utf8',
      ),
    );
    return pkg.version || null;
  } catch {
    try {
      const pkg = JSON.parse(fsSync.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
      return pkg.devDependencies?.['@playwright/test'] || null;
    } catch {
      return null;
    }
  }
}

/**
 * Last commit that touched the approved baseline directory.
 *
 * Inside the Docker container there is no .git (it is excluded from the build
 * context), so the host launcher injects VISUAL_BASELINE_REVISION. That takes
 * precedence; the git calls are the local-run fallback.
 */
export function gitBaselineRevision() {
  if (process.env.VISUAL_BASELINE_REVISION) return process.env.VISUAL_BASELINE_REVISION;

  const relative = toWorkspacePath(baselineDir());

  const sha = git(['log', '-1', '--format=%H', '--', relative]);
  if (sha) return sha;

  // Shallow clones may not carry the commit that last touched the directory.
  return git(['rev-parse', 'HEAD']);
}

export function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || null;
  } catch {
    return null;
  }
}
