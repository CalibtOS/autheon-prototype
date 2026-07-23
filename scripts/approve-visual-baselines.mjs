#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const options = {
  help: args.includes('--help') || args.includes('-h'),
  dryRun: args.includes('--dry-run'),
  from: valueArg(args, '--from'),
};

if (options.help) {
  console.log(`Usage: npm run test:regression:baseline:approve -- [--dry-run] [--from <candidate-dir>]

Promotes reviewed baseline CANDIDATES (produced by
"npm run test:regression:baseline") into the approved baseline
directory tests/regression/snapshots.

This command is the explicit approval step. It never runs automatically, and
nothing is committed for you: review the resulting git diff and commit the
snapshot changes to finish the approval.

Options:
  --dry-run   List what would be approved without copying anything.
  --from      Candidate directory. Default:
              visual-regression-artifacts/docker-ci/baseline-candidates
`);
  process.exit(0);
}

const candidateRoot = path.resolve(
  repoRoot,
  options.from ||
    process.env.VISUAL_BASELINE_CANDIDATE_DIR ||
    path.join('visual-regression-artifacts', 'docker-ci', 'baseline-candidates'),
);
const candidateSnapshots = path.join(candidateRoot, 'tests', 'regression', 'snapshots');
const approvedSnapshots = path.join(repoRoot, 'tests', 'regression', 'snapshots');
const manifestPath = path.join(candidateRoot, 'manifest.json');

if (!fsSync.existsSync(candidateSnapshots)) {
  console.error(
    `[baseline-approve] No baseline candidates found at ${toWorkspacePath(candidateSnapshots)}.`,
  );
  console.error(
    '[baseline-approve] Generate candidates first: npm run test:regression:baseline',
  );
  process.exit(1);
}

const manifest = readJsonIfExists(manifestPath);
if (manifest) {
  console.log(
    `[baseline-approve] Candidate set: platform=${manifest.platform} project=${manifest.project} createdAt=${manifest.createdAt} playwrightExitCode=${manifest.playwrightExitCode}`,
  );
  if (manifest.playwrightExitCode !== 0) {
    console.error(
      '[baseline-approve] Refusing to approve: the candidate-generation run did not finish cleanly (non-zero Playwright exit code). Regenerate candidates first.',
    );
    process.exit(1);
  }
}

const candidates = [];
for (const filePath of walkSync(candidateSnapshots)) {
  if (!filePath.endsWith('.png')) continue;
  candidates.push(filePath);
}

if (candidates.length === 0) {
  console.error('[baseline-approve] Candidate directory exists but contains no PNG files.');
  process.exit(1);
}

let added = 0;
let updated = 0;
let unchanged = 0;

for (const candidatePath of candidates.sort()) {
  const relative = path.relative(candidateSnapshots, candidatePath);
  const targetPath = path.join(approvedSnapshots, relative);
  const candidateSha = sha256(candidatePath);

  let action = 'add';
  if (fsSync.existsSync(targetPath)) {
    action = sha256(targetPath) === candidateSha ? 'unchanged' : 'update';
  }

  if (action === 'unchanged') {
    unchanged += 1;
    continue;
  }

  if (!options.dryRun) {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(candidatePath, targetPath);
  }

  if (action === 'add') added += 1;
  else updated += 1;
  console.log(
    `[baseline-approve] ${options.dryRun ? 'would ' : ''}${action}: tests/regression/snapshots/${relative
      .split(path.sep)
      .join('/')} (sha256 ${candidateSha.slice(0, 12)})`,
  );
}

console.log(
  `[baseline-approve] ${options.dryRun ? 'Dry run — ' : ''}${added} added, ${updated} updated, ${unchanged} unchanged of ${candidates.length} candidate(s).`,
);
if (!options.dryRun && (added > 0 || updated > 0)) {
  console.log(
    '[baseline-approve] Review the git diff under tests/regression/snapshots and commit it to finalize the approval.',
  );
}

function* walkSync(root) {
  for (const entry of fsSync.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) yield* walkSync(entryPath);
    else yield entryPath;
  }
}

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fsSync.readFileSync(filePath));
  return hash.digest('hex');
}

function readJsonIfExists(filePath) {
  try {
    return JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function valueArg(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] || null;
}

function toWorkspacePath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}
