#!/usr/bin/env node
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const artifactDir =
  process.env.VISUAL_REGRESSION_ARTIFACT_DIR || '/app/visual-regression-artifacts';
const mode = (process.env.VISUAL_REGRESSION_MODE || 'test').toLowerCase();
const snapshotsDir = path.join(repoRoot, 'tests', 'regression', 'snapshots');
const platformSuffix = `-${process.platform}.png`;

const settings = {
  testDir: process.env.VISUAL_REGRESSION_TEST_DIR || 'tests/regression',
  grep: process.env.VISUAL_REGRESSION_GREP || '@visual-regression',
  project: process.env.VISUAL_REGRESSION_PROJECT || 'chromium',
};

await fs.mkdir(artifactDir, { recursive: true });

if (mode === 'baseline') {
  process.exit(await generateBaselineCandidates());
} else if (mode === 'test') {
  process.exit(await runVisualComparison());
} else {
  console.error(
    `[docker-visual-ci] Unknown VISUAL_REGRESSION_MODE "${mode}". Use "test" (compare against approved baselines) or "baseline" (generate reviewable baseline candidates).`,
  );
  process.exit(2);
}

// Normal CI mode: compare current Linux screenshots against the approved
// Linux baselines committed in tests/regression/snapshots. Baselines are
// never created or modified here; a missing platform baseline is a blocking
// failure reported by the visual CI wrapper.
async function runVisualComparison() {
  // Call the wrapper binary directly rather than via an npm script so the
  // container flow does not depend on a public package.json entry point.
  const visualExitCode = await run('node', [
    'scripts/visual-regression-ci.mjs',
    ...splitArgs(process.env.VISUAL_REGRESSION_CI_ARGS),
  ]);

  const notificationExitCode = await run('node', ['scripts/notify-visual-regression.mjs'], {
    REGRESSION_CI_EXIT_CODE: String(visualExitCode),
  });

  if (visualExitCode !== 0) return visualExitCode;
  if (notificationExitCode !== 0 && isTruthy(process.env.REGRESSION_NOTIFICATION_REQUIRED)) {
    return notificationExitCode;
  }
  return 0;
}

// Baseline mode: render every visual snapshot in this container's
// deterministic Linux environment and export the resulting PNGs as
// *candidates* into the mounted artifact directory. Nothing is approved
// here: the container workspace is disposable, the repository snapshots on
// the host are untouched, and promotion into tests/regression/snapshots
// requires the separate, explicit approval command on the host.
async function generateBaselineCandidates() {
  console.log(
    `[docker-visual-ci] Baseline mode: generating ${process.platform} baseline CANDIDATES. Approved baselines are not modified.`,
  );

  const playwrightExitCode = await run(path.join('node_modules', '.bin', 'playwright'), [
    'test',
    settings.testDir,
    '--grep',
    settings.grep,
    '--project',
    settings.project,
    '--update-snapshots',
    '--retries=0',
    ...splitArgs(process.env.VISUAL_REGRESSION_CI_ARGS),
  ]);

  const candidateRoot = path.join(artifactDir, 'baseline-candidates');
  await fs.rm(candidateRoot, { recursive: true, force: true });

  const candidates = [];
  if (fsSync.existsSync(snapshotsDir)) {
    for await (const filePath of walk(snapshotsDir)) {
      if (!filePath.endsWith(platformSuffix)) continue;

      const relative = path.relative(repoRoot, filePath);
      const targetPath = path.join(candidateRoot, relative);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(filePath, targetPath);
      candidates.push({ file: relative.split(path.sep).join('/'), sha256: await sha256File(filePath) });
    }
  }

  await fs.mkdir(candidateRoot, { recursive: true });
  await fs.writeFile(
    path.join(candidateRoot, 'manifest.json'),
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        platform: process.platform,
        project: settings.project,
        grep: settings.grep,
        playwrightExitCode,
        approved: false,
        candidateCount: candidates.length,
        candidates,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(
    `[docker-visual-ci] Exported ${candidates.length} ${process.platform} baseline candidate(s) to the artifact directory under baseline-candidates/.`,
  );
  console.log(
    '[docker-visual-ci] Candidates are NOT approved. Review them, then run "npm run test:regression:baseline:approve" on the host and commit the changes.',
  );

  if (playwrightExitCode !== 0) {
    console.error(
      `[docker-visual-ci] Playwright exited with code ${playwrightExitCode} while generating candidates. Inspect the run before approving anything.`,
    );
  }

  return playwrightExitCode;
}

async function* walk(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walk(entryPath);
    } else {
      yield entryPath;
    }
  }
}

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(await fs.readFile(filePath));
  return hash.digest('hex');
}

async function run(command, args, extraEnv = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => resolve(code || 0));
  });
}

function splitArgs(value) {
  if (!value) return [];
  return String(value)
    .split(/\s+/)
    .map((arg) => arg.trim())
    .filter(Boolean);
}

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}
