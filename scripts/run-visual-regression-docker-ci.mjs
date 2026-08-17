#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// dotenv only loads local .env* files for convenience. In CI the environment is
// supplied directly and a fresh checkout may not have run `npm install` yet, so a
// missing dotenv must not crash the launcher.
try {
  const { config: loadDotenv } = await import('dotenv');
  for (const fileName of ['.env.testing', '.env.e2e', '.env']) {
    loadDotenv({ path: path.join(repoRoot, fileName), override: false });
  }
} catch (error) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  console.warn('[docker-visual-ci] dotenv not installed; relying on the ambient environment only.');
}

const args = process.argv.slice(2);
const profileIndex = args.indexOf('--profile');
const options = {
  help: args.includes('--help') || args.includes('-h'),
  noBuild: args.includes('--no-build'),
  baseline: args.includes('--baseline'),
  diagnostic: args.includes('--diagnostic'),
  profile:
    (profileIndex >= 0 ? args[profileIndex + 1] : null) ||
    process.env.VISUAL_REGRESSION_PROFILE ||
    'full',
};

if (options.help) {
  console.log(`Usage:
  npm run test:regression:ci -- [--no-build] [--profile <name>]   Full CI pipeline
  npm run test:regression:baseline -- [--no-build]                Baseline candidates
  npm run test:regression:diagnostic                              Full traces/video

Builds and runs the Docker/Linux visual regression pipeline.
Docker/Linux is the canonical visual-regression environment: comparisons run
against approved *-linux.png baselines committed in tests/regression/snapshots.

Modes:
  (default)    Compare current Linux screenshots against approved Linux baselines.
  --baseline   Generate Linux baseline CANDIDATES into
               <artifact-dir>/baseline-candidates/ for manual review. Candidates
               are never approved automatically; promote them explicitly with
               "npm run test:regression:visual:baseline:approve".

Useful environment:
  REGRESSION_NOTIFICATION_DRY_RUN=true  Write email payloads without SMTP.
  SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD / SMTP_SECURE
  REGRESSION_NOTIFICATION_EMAIL         Recipient, default youssef.elkondakly@calibtos.com
  VISUAL_REGRESSION_DOCKER_ARTIFACT_DIR Host artifact directory.
  VISUAL_REGRESSION_DOCKER_BASE_IMAGE   Docker base image, default node:24-bookworm-slim.
  VISUAL_REGRESSION_DOCKER_PLATFORM     Pin the image CPU architecture, e.g.
                                        linux/amd64. Unset = host-native. Approved
                                        baselines are architecture-specific even
                                        though the filename only says "linux".
  VISUAL_REGRESSION_TEST_DIR            Override test dir for controlled failure simulation.
  VISUAL_REGRESSION_RETRIES             Playwright retries for the visual suite, default 0.
`);
  process.exit(0);
}

const dockerfile = path.join(repoRoot, 'docker', 'visual-regression-ci.Dockerfile');
const imageName = process.env.VISUAL_REGRESSION_DOCKER_IMAGE || 'autheon-visual-regression-ci:local';
const baseImage = process.env.VISUAL_REGRESSION_DOCKER_BASE_IMAGE || 'node:24-bookworm-slim';
const artifactHostDir = path.resolve(
  repoRoot,
  process.env.VISUAL_REGRESSION_DOCKER_ARTIFACT_DIR ||
    path.join('visual-regression-artifacts', 'docker-ci'),
);

await fs.mkdir(artifactHostDir, { recursive: true });

// Optional CPU-architecture pin for the canonical rendering environment.
//
// Playwright's {platform} token in the snapshot path is only "linux": it cannot
// tell linux/amd64 from linux/arm64. Chromium rasterizes text differently on the
// two, so an unpinned image renders arm64 on an Apple Silicon laptop and amd64 on
// a standard CI runner, and the same approved baseline set cannot match both.
// Setting this makes the environment reproducible across machines; leaving it
// unset keeps the host-native (fast) behaviour.
const dockerPlatform = process.env.VISUAL_REGRESSION_DOCKER_PLATFORM || null;
const platformArgs = dockerPlatform ? ['--platform', dockerPlatform] : [];

if (dockerPlatform) {
  console.log(`[docker-visual-ci] Pinning Docker platform to ${dockerPlatform}.`);
}

if (!options.noBuild) {
  const buildCode = await run('docker', [
    'build',
    ...platformArgs,
    '--file',
    dockerfile,
    '--tag',
    imageName,
    '--build-arg',
    `BASE_IMAGE=${baseImage}`,
    repoRoot,
  ]);
  if (buildCode !== 0) process.exit(buildCode);
}

// Resolve the image digest on the host and hand it to the container.
//
// `node:24-bookworm-slim` is a FLOATING tag: rebuilding the image weeks later
// pulls a different fontconfig/freetype, which shifts Chromium text rasterization
// on every text-bearing screen. That reads as ~100% of screenshots "changing"
// while no application code changed at all. The container cannot inspect its own
// image, so the digest is resolved here and recorded in the summary/manifest,
// letting a run report environment drift instead of mislabelling it a UI change.
const imageDigest = resolveImageDigest(imageName);
if (imageDigest) {
  console.log(`[docker-visual-ci] Image digest: ${imageDigest}`);
}

const dockerEnv = dockerEnvironment({
  REGRESSION_ARTIFACT_HOST_DIR: artifactHostDir,
  ...(imageDigest ? { VISUAL_REGRESSION_IMAGE_DIGEST: imageDigest } : {}),
  VISUAL_REGRESSION_ARTIFACT_DIR: '/app/visual-regression-artifacts',
  VISUAL_REGRESSION_PROFILE: options.profile,
  ...(options.baseline ? { VISUAL_REGRESSION_MODE: 'baseline' } : {}),
  ...(options.diagnostic ? { VISUAL_REGRESSION_DIAGNOSTIC: 'true' } : {}),
  // .git is excluded from the build context, so resolve git metadata on the
  // host and hand it to the container for the notification report.
  ...gitEnvironment(),
});

const runCode = await run('docker', [
  'run',
  '--rm',
  '--init',
  ...platformArgs,
  ...dockerEnv,
  '--volume',
  `${artifactHostDir}:/app/visual-regression-artifacts`,
  imageName,
]);

process.exit(runCode);

function dockerEnvironment(extra) {
  const names = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_FROM',
    'REGRESSION_NOTIFICATION_EMAIL',
    'REGRESSION_NOTIFY_ON_SUCCESS',
    'REGRESSION_NOTIFICATION_DRY_RUN',
    'REGRESSION_NOTIFICATION_REQUIRED',
    'VISUAL_REGRESSION_TEST_DIR',
    'VISUAL_REGRESSION_GREP',
    'VISUAL_REGRESSION_PROJECT',
    'VISUAL_REGRESSION_STRICT',
    'VISUAL_REGRESSION_FAIL_ON_INFRASTRUCTURE',
    'VISUAL_REGRESSION_CI_ARGS',
    'VISUAL_REGRESSION_MODE',
    'VISUAL_REGRESSION_RETRIES',
    'VISUAL_REGRESSION_PROFILE',
    'VISUAL_REGRESSION_DIAGNOSTIC',
    'VISUAL_REGRESSION_APPROVED_PLATFORM',
    'REGRESSION_ARTIFACT_URL',
    'REGRESSION_ARTIFACT_NAME',
    'REGRESSION_ATTACH_ARCHIVE',
    'REGRESSION_ARCHIVE_ATTACHMENT_MAX_MB',
    'REGRESSION_SUMMARY_ATTACHMENT_MAX_KB',
    'REGRESSION_ENVIRONMENT',
    'BASELINE_REASON',
    'VISUAL_BASELINE_REVISION',
    'IS_FORK_PR',
    // GitHub provenance: the container has no .git (excluded from the build
    // context), so run identity has to be handed in explicitly.
    'GITHUB_ACTIONS',
    'GITHUB_REPOSITORY',
    'GITHUB_WORKFLOW',
    'GITHUB_RUN_ID',
    'GITHUB_RUN_NUMBER',
    'GITHUB_RUN_ATTEMPT',
    'GITHUB_EVENT_NAME',
    'GITHUB_ACTOR',
    'GITHUB_REF',
    'GITHUB_REF_NAME',
    'GITHUB_HEAD_REPOSITORY',
    'GITHUB_BASE_REF',
    'GITHUB_BASE_SHA',
    'GITHUB_HEAD_SHA',
    'GITHUB_MERGE_SHA',
    'GITHUB_PR_NUMBER',
  ];

  const pairs = Object.entries(extra);
  for (const name of names) {
    if (process.env[name] !== undefined) {
      pairs.push([name, process.env[name]]);
    }
  }

  return pairs.flatMap(([name, value]) => ['--env', `${name}=${value}`]);
}

function gitEnvironment() {
  const env = {};

  // .git is excluded from the Docker build context, so every piece of git
  // provenance has to be resolved on the host and handed in. Without the
  // baseline revision the container reports "Baseline revision: unknown", which
  // defeats the point of recording which baseline version a run compared against.
  const resolve = (args) => {
    try {
      return execFileSync('git', args, {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() || null;
    } catch {
      return null;
    }
  };

  const branch = resolve(['rev-parse', '--abbrev-ref', 'HEAD']);
  const commit = resolve(['rev-parse', 'HEAD']);
  const baselineSha =
    resolve(['log', '-1', '--format=%H', '--', 'tests/regression/snapshots']) || commit;

  if (branch) env.GIT_BRANCH = branch;
  if (commit) env.GIT_COMMIT = commit;
  if (baselineSha) env.VISUAL_BASELINE_REVISION = baselineSha;

  return env;
}

async function run(command, commandArgs) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => resolve(code || 0));
  });
}

/**
 * The built image's content ID, used as the rendering-environment fingerprint.
 *
 * Best-effort: a missing digest is reported as unknown rather than failing the
 * run, because it is diagnostic metadata, not a correctness input.
 */
function resolveImageDigest(name) {
  try {
    const output = execFileSync(
      'docker',
      ['image', 'inspect', name, '--format', '{{.Id}}'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return output.trim() || null;
  } catch {
    return null;
  }
}
