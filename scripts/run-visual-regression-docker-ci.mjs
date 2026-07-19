#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

for (const fileName of ['.env.testing', '.env.e2e', '.env']) {
  loadDotenv({
    path: path.join(repoRoot, fileName),
    override: false,
  });
}

const args = process.argv.slice(2);
const options = {
  help: args.includes('--help') || args.includes('-h'),
  noBuild: args.includes('--no-build'),
  baseline: args.includes('--baseline'),
};

if (options.help) {
  console.log(`Usage: npm run test:regression:visual:docker-ci -- [--no-build] [--baseline]

Builds and runs the local Docker CI simulation for visual regression testing.
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

if (!options.noBuild) {
  const buildCode = await run('docker', [
    'build',
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

const dockerEnv = dockerEnvironment({
  REGRESSION_ARTIFACT_HOST_DIR: artifactHostDir,
  VISUAL_REGRESSION_ARTIFACT_DIR: '/app/visual-regression-artifacts',
  ...(options.baseline ? { VISUAL_REGRESSION_MODE: 'baseline' } : {}),
  // .git is excluded from the build context, so resolve git metadata on the
  // host and hand it to the container for the notification report.
  ...gitEnvironment(),
});

const runCode = await run('docker', [
  'run',
  '--rm',
  '--init',
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
    'VISUAL_REGRESSION_CI_ARGS',
    'VISUAL_REGRESSION_MODE',
    'VISUAL_REGRESSION_RETRIES',
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
  try {
    env.GIT_BRANCH = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    env.GIT_COMMIT = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // Not a git checkout — the report simply omits branch/commit.
  }
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
