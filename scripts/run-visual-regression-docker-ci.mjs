#!/usr/bin/env node
import { spawn } from 'node:child_process';
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
};

if (options.help) {
  console.log(`Usage: npm run test:regression:visual:docker-ci -- [--no-build]

Builds and runs the local Docker CI simulation for visual regression testing.

Useful environment:
  REGRESSION_NOTIFICATION_DRY_RUN=true  Write email payloads without SMTP.
  SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD / SMTP_SECURE
  REGRESSION_NOTIFICATION_EMAIL         Recipient, default youssef.elkondakly@calibtos.com
  VISUAL_REGRESSION_DOCKER_ARTIFACT_DIR Host artifact directory.
  VISUAL_REGRESSION_DOCKER_BASE_IMAGE   Docker base image, default node:24-bookworm-slim.
  VISUAL_REGRESSION_TEST_DIR            Override test dir for controlled failure simulation.
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
    'VISUAL_BASELINE_SOURCE_PLATFORM',
    'VISUAL_BASELINE_TARGET_PLATFORM',
    'VISUAL_BASELINE_SKIP_PLATFORM_ALIAS',
  ];

  const pairs = Object.entries(extra);
  for (const name of names) {
    if (process.env[name] !== undefined) {
      pairs.push([name, process.env[name]]);
    }
  }

  return pairs.flatMap(([name, value]) => ['--env', `${name}=${value}`]);
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
