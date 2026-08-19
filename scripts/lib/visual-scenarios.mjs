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

      // A snapshot name built from a loop variable, e.g.
      //   for (const key of ['pkw', 'lkw'] as const)
      //     await expect(page).toHaveScreenshot(`transport-order-${key}.png`)
      //
      // Without expansion the scan yields the literal `transport-order-${key}.png`
      // — one snapshot ID that does not exist — while the real per-key snapshots
      // stay invisible to the registry and their approved baselines look like
      // orphans forever. Resolve the loop's string literals instead.
      const names = expandSnapshotName(callMatch[2], lines, index);

      // Options can span a few lines after the call; read a small window.
      const optionsWindow = lines.slice(index, index + 8).join('\n');
      const fullPage = /fullPage:\s*true/.test(optionsWindow);

      // `expect(page).toHaveScreenshot()` is a page capture;
      // `expect(someLocator).toHaveScreenshot()` is a component capture. The
      // subject can be a few lines above the call when the expect is wrapped,
      // so look back as well as at the current line.
      const subjectWindow = lines.slice(Math.max(0, index - 4), index + 1).join('\n');
      const pageSubject = /expect\(\s*page\s*\)/.test(subjectWindow);
      const mode = pageSubject ? (fullPage ? 'fullPage' : 'viewport') : 'locator';

      for (const snapshotId of names) {
        snapshots.push({
          snapshotId,
          spec: toWorkspacePath(filePath),
          line: index + 1,
          describeTitle,
          testTitle,
          skipped: testSkipped,
          tagged: describeTagged || testTagged,
          mode,
          fullPage,
          masked: /\bmask:/.test(optionsWindow),
          clipped: /\bclip:/.test(optionsWindow),
        });
      }
    }
  }

  return snapshots;
}

const TEMPLATE_SLOT = /\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g;

/**
 * Expand a snapshot name that interpolates a loop variable.
 *
 * Handles the one shape the suite actually uses — a `for (const <var> of [...])`
 * over string literals, enclosing the `toHaveScreenshot()` call:
 *
 *   for (const key of ['pkw', 'lkw-over-7-5t'] as const) {
 *     await expect(page).toHaveScreenshot(`transport-order-${key}.png`, { ... });
 *   }
 *
 * Returns one name per literal. A name with no interpolation returns itself, and
 * an interpolation whose loop cannot be resolved returns the raw name unchanged —
 * so it surfaces as an unregistered snapshot finding rather than disappearing
 * silently. That is the honest failure mode: a coverage gap you can see.
 */
function expandSnapshotName(rawName, lines, callIndex) {
  TEMPLATE_SLOT.lastIndex = 0;
  const slots = [...rawName.matchAll(TEMPLATE_SLOT)].map((match) => match[1]);
  if (slots.length === 0) return [rawName];

  let names = [rawName];

  for (const variable of new Set(slots)) {
    const values = findLoopLiterals(variable, lines, callIndex);
    if (values.length === 0) return [rawName];

    names = names.flatMap((name) =>
      values.map((value) =>
        name.replace(new RegExp(`\\$\\{\\s*${variable}\\s*\\}`, 'g'), value),
      ),
    );
  }

  return names;
}

/**
 * String literals a `for (const <variable> of [...])` above this line iterates.
 *
 * Scans upward from the call, which is enough for a spec-local loop and avoids
 * pulling a TypeScript parser into a static prototype for one construct.
 */
function findLoopLiterals(variable, lines, callIndex) {
  const opener = new RegExp(
    `for\\s*\\(\\s*(?:const|let|var)\\s+${variable}\\s+of\\s*\\[`,
  );

  for (let index = callIndex; index >= 0; index -= 1) {
    if (!opener.test(lines[index])) continue;

    // Collect literals from the opening bracket until it closes.
    const window = lines.slice(index, callIndex + 1).join('\n');
    const start = window.indexOf('[');
    if (start < 0) return [];

    let depth = 0;
    let end = -1;
    for (let position = start; position < window.length; position += 1) {
      const character = window[position];
      if (character === '[') depth += 1;
      else if (character === ']') {
        depth -= 1;
        if (depth === 0) {
          end = position;
          break;
        }
      }
    }
    if (end < 0) return [];

    return [...window.slice(start, end).matchAll(/['"]([^'"]+)['"]/g)].map(
      (match) => match[1],
    );
  }

  return [];
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
