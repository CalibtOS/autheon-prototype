#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const artifactDir =
  process.env.VISUAL_REGRESSION_ARTIFACT_DIR || '/app/visual-regression-artifacts';
const sourcePlatform = process.env.VISUAL_BASELINE_SOURCE_PLATFORM || 'darwin';
const targetPlatform = process.env.VISUAL_BASELINE_TARGET_PLATFORM || process.platform;

const visualArgs = [
  'run',
  'test:regression:visual:ci',
  '--',
  ...splitArgs(process.env.VISUAL_REGRESSION_CI_ARGS),
];

await fs.mkdir(artifactDir, { recursive: true });

if (!isTruthy(process.env.VISUAL_BASELINE_SKIP_PLATFORM_ALIAS)) {
  await hydratePlatformBaselines({
    snapshotsDir: path.join(repoRoot, 'tests', 'regression', 'snapshots'),
    sourcePlatform,
    targetPlatform,
  });
}

const visualExitCode = await run('npm', visualArgs);
const notificationExitCode = await run('node', ['scripts/notify-visual-regression.mjs'], {
  REGRESSION_CI_EXIT_CODE: String(visualExitCode),
});

if (visualExitCode !== 0) {
  process.exit(visualExitCode);
}

if (notificationExitCode !== 0 && isTruthy(process.env.REGRESSION_NOTIFICATION_REQUIRED)) {
  process.exit(notificationExitCode);
}

process.exit(0);

async function hydratePlatformBaselines({ snapshotsDir, sourcePlatform, targetPlatform }) {
  if (sourcePlatform === targetPlatform || !fsSync.existsSync(snapshotsDir)) {
    return;
  }

  let copied = 0;
  const suffix = `-${sourcePlatform}.png`;
  const targetSuffix = `-${targetPlatform}.png`;

  for await (const filePath of walk(snapshotsDir)) {
    if (!filePath.endsWith(suffix)) continue;

    const targetPath = `${filePath.slice(0, -suffix.length)}${targetSuffix}`;
    if (fsSync.existsSync(targetPath)) continue;

    await fs.copyFile(filePath, targetPath);
    copied += 1;
  }

  if (copied > 0) {
    console.log(
      `[docker-visual-ci] Hydrated ${copied} ${targetPlatform} baseline alias(es) from approved ${sourcePlatform} snapshots inside the disposable container workspace.`,
    );
  }
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

