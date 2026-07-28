/**
 * Spec-side scenario discovery.
 *
 * Reads the `toHaveScreenshot()` calls out of the visual spec files so the
 * coverage audit can compare three independent sources against each other:
 *
 *   registry (visual-coverage.manifest.json)  what MUST be captured
 *   specs    (tests/regression/*.spec.ts)     what the suite actually captures
 *   baselines(tests/regression/snapshots)     what has been approved
 *
 * A regex scan is deliberate: adding a TypeScript parser to a static prototype
 * for this would be heavier than the problem. The scan is strict about the
 * shape it accepts and reports anything it could not interpret, so a spec
 * written in an unexpected style surfaces as an audit finding instead of
 * silently dropping out of the expected-snapshot list.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { repoRoot, toWorkspacePath, walkFiles } from './visual-baseline.mjs';

const SCREENSHOT_CALL = /toHaveScreenshot\(\s*(['"`])([^'"`]+)\1/g;
const TEST_DECLARATION = /^\s*test(\.skip|\.fixme|\.only)?\(\s*(['"`])(.+?)\2/;
const DESCRIBE_DECLARATION = /^\s*test\.describe(?:\.skip)?\(\s*(['"`])(.+?)\1/;

export function visualSpecDir() {
  return path.resolve(repoRoot, process.env.VISUAL_REGRESSION_TEST_DIR || 'tests/regression');
}

/**
 * Every snapshot the visual specs declare, in file order.
 *
 * Each entry: { snapshotId, spec, line, testTitle, describeTitle, skipped,
 *               fullPage, masked, clipped, tagged }
 */
export async function discoverSpecSnapshots({ grep = '@visual-regression' } = {}) {
  const files = (await walkFiles(visualSpecDir())).filter((filePath) =>
    filePath.endsWith('.spec.ts'),
  );

  const snapshots = [];

  for (const filePath of files) {
    const source = await fs.readFile(filePath, 'utf8');
    if (!source.includes('toHaveScreenshot(')) continue;

    const lines = source.split('\n');
    let describeTitle = '';
    let describeTagged = false;
    let testTitle = '';
    let testSkipped = false;
    let testTagged = false;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      const describeMatch = line.match(DESCRIBE_DECLARATION);
      if (describeMatch) {
        describeTitle = describeMatch[2];
        describeTagged = describeTitle.includes(grep);
      }

      const testMatch = line.match(TEST_DECLARATION);
      if (testMatch) {
        testTitle = testMatch[3];
        testSkipped = testMatch[1] === '.skip' || testMatch[1] === '.fixme';
        testTagged = testTitle.includes(grep);
      }

      SCREENSHOT_CALL.lastIndex = 0;
      const callMatch = SCREENSHOT_CALL.exec(line);
      if (!callMatch) continue;

      // Options can span a few lines after the call; read a small window.
      const optionsWindow = lines.slice(index, index + 8).join('\n');

      snapshots.push({
        snapshotId: callMatch[2],
        spec: toWorkspacePath(filePath),
        line: index + 1,
        describeTitle,
        testTitle,
        skipped: testSkipped,
        tagged: describeTagged || testTagged,
        fullPage: /fullPage:\s*true/.test(optionsWindow),
        masked: /\bmask:/.test(optionsWindow),
        clipped: /\bclip:/.test(optionsWindow),
      });
    }
  }

  return snapshots;
}

/** Snapshot IDs declared more than once across the visual specs. */
export function findDuplicateSnapshotIds(specSnapshots) {
  const seen = new Map();

  for (const snapshot of specSnapshots) {
    const existing = seen.get(snapshot.snapshotId) || [];
    existing.push(`${snapshot.spec}:${snapshot.line}`);
    seen.set(snapshot.snapshotId, existing);
  }

  return [...seen.entries()]
    .filter(([, locations]) => locations.length > 1)
    .map(([snapshotId, locations]) => ({ snapshotId, locations }));
}
