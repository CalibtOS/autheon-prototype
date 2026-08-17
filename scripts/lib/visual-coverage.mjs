/**
 * Visual coverage model.
 *
 * Cross-checks three independent sources and produces one coverage result:
 *
 *   registry  tests/regression/visual-coverage.manifest.json  what MUST exist
 *   specs     tests/regression/*.visual.spec.ts               what is captured
 *   baselines tests/regression/snapshots                      what is approved
 *
 * Plus, when a Playwright run has happened, the produced/attempted snapshot set
 * from test-results/results.json. This is what stops a run from claiming
 * "complete coverage" merely because every executed test passed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  APPROVED_PLATFORM,
  listApprovedBaselines,
  repoRoot,
  toWorkspacePath,
} from './visual-baseline.mjs';
import { discoverSpecSnapshots, findDuplicateSnapshotIds } from './visual-scenarios.mjs';

export const REGISTRY_VERSION = 1;

const SNAPSHOT_ATTACHMENT = /-(actual|expected|diff|previous)\.png$/;

export function registryPath() {
  return path.resolve(
    repoRoot,
    process.env.VISUAL_COVERAGE_REGISTRY || 'tests/regression/visual-coverage.manifest.json',
  );
}

export async function readRegistry() {
  const filePath = registryPath();

  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(
        `Visual coverage registry not found at ${toWorkspacePath(filePath)}. The coverage gate cannot run without it.`,
      );
    }
    throw error;
  }

  let registry;
  try {
    registry = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Visual coverage registry ${toWorkspacePath(filePath)} is not valid JSON: ${error.message}`,
    );
  }

  validateRegistry(registry, toWorkspacePath(filePath));
  return registry;
}

/**
 * Fail loudly on a malformed registry. An invalid coverage manifest is a
 * blocking infrastructure failure, not a warning: if the expected list cannot
 * be trusted, neither can the coverage percentage derived from it.
 */
export function validateRegistry(registry, label = 'visual coverage registry') {
  const problems = [];

  if (registry?.registryVersion !== REGISTRY_VERSION) {
    problems.push(
      `registryVersion is ${registry?.registryVersion}, expected ${REGISTRY_VERSION}`,
    );
  }

  if (!Array.isArray(registry?.scenarios)) {
    problems.push('`scenarios` must be an array');
  }

  if (!registry?.defaults || typeof registry.defaults !== 'object') {
    problems.push('`defaults` must be an object');
  }

  const validStatuses = new Set(['active', 'planned', 'excluded', 'deprecated']);
  const seenIds = new Set();

  for (const [index, scenario] of (registry?.scenarios || []).entries()) {
    const where = `scenarios[${index}]`;

    if (!scenario?.snapshotId || typeof scenario.snapshotId !== 'string') {
      problems.push(`${where} is missing a string snapshotId`);
      continue;
    }

    if (seenIds.has(scenario.snapshotId)) {
      problems.push(`${where} duplicates snapshotId "${scenario.snapshotId}"`);
    }
    seenIds.add(scenario.snapshotId);

    const status = scenario.status ?? registry.defaults?.status ?? 'active';
    if (!validStatuses.has(status)) {
      problems.push(`${where} has unknown status "${status}"`);
    }

    if ((status === 'excluded' || status === 'deprecated') && !scenario.exclusionReason) {
      problems.push(
        `${where} ("${scenario.snapshotId}") is ${status} but has no exclusionReason. An excluded scenario without a documented reason is treated as a coverage failure.`,
      );
    }

    const viewport = scenario.viewport ?? registry.defaults?.viewport;
    if (viewport && !registry.viewports?.[viewport]) {
      problems.push(`${where} references unknown viewport "${viewport}"`);
    }

    const locale = scenario.locale ?? registry.defaults?.locale;
    if (locale && !registry.locales?.[locale]) {
      problems.push(`${where} references unknown locale "${locale}"`);
    }

    const theme = scenario.theme ?? registry.defaults?.theme;
    if (theme && !registry.themes?.[theme]) {
      problems.push(`${where} references unknown theme "${theme}"`);
    }

    const mode = scenario.mode ?? registry.defaults?.mode;
    if (mode && !registry.screenshotModes?.[mode]) {
      problems.push(`${where} references unknown screenshot mode "${mode}"`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid ${label}:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`,
    );
  }
}

/** Resolve a scenario against the registry defaults. */
export function resolveScenario(registry, scenario) {
  const merged = { ...registry.defaults, ...scenario };
  const viewport = registry.viewports?.[merged.viewport] || {};

  return {
    ...merged,
    project: merged.project || viewport.project || null,
    viewportWidth: viewport.width ?? null,
    viewportHeight: viewport.height ?? null,
    viewportClass: viewport.class ?? null,
  };
}

export function resolvedScenarios(registry) {
  return (registry.scenarios || []).map((scenario) => resolveScenario(registry, scenario));
}

/** Scenarios selected by an execution profile. */
export function scenariosForProfile(registry, profile) {
  const all = resolvedScenarios(registry).filter(
    (scenario) => scenario.status === 'active' || scenario.status === 'planned',
  );

  if (profile === 'full' || profile === 'baseline' || profile === 'diagnostic') return all;
  return all.filter((scenario) => (scenario.profiles || []).includes(profile));
}

/**
 * Per-test outcomes from the Playwright JSON reporter.
 *
 * Returns null when there is no readable report, so callers can distinguish
 * "no run analysed" from "a run that produced nothing".
 */
export async function readPlaywrightOutcomes(resultsJsonPath) {
  let results;
  try {
    results = JSON.parse(await fs.readFile(resultsJsonPath, 'utf8'));
  } catch {
    return null;
  }

  const outcomes = [];

  function visitSuite(suite) {
    for (const spec of suite.specs || []) {
      for (const testCase of spec.tests || []) {
        const attachments = (testCase.results || []).flatMap(
          (result) => result.attachments || [],
        );

        outcomes.push({
          file: spec.file || suite.file || '',
          title: spec.title,
          status: testCase.status,
          // Playwright names screenshot attachments `<snapshotId>-actual.png`,
          // `-expected.png`, `-diff.png`, `-previous.png`. The extension is
          // part of the attachment name, so it has to be matched explicitly.
          attachedSnapshotIds: [
            ...new Set(
              attachments
                .map((attachment) => attachment.name || '')
                .filter((name) => SNAPSHOT_ATTACHMENT.test(name))
                .map((name) => `${name.replace(SNAPSHOT_ATTACHMENT, '')}.png`),
            ),
          ],
        });
      }
    }

    for (const child of suite.suites || []) visitSuite(child);
  }

  for (const suite of results.suites || []) visitSuite(suite);
  return outcomes;
}

/**
 * Snapshot IDs a run actually compared.
 *
 * A *passing* `toHaveScreenshot()` writes no attachments at all, so attachments
 * alone cannot tell a green comparison apart from one that never ran. Resolve a
 * passing test back to the snapshot IDs its spec declares, and fall back to the
 * attachment names for failing tests. Without this, every green run would report
 * its snapshots as "never captured".
 */
export function resolveProducedSnapshots(outcomes, specSnapshots) {
  const declaredByTest = new Map();
  for (const snapshot of specSnapshots) {
    const key = `${snapshot.spec}::${snapshot.testTitle}`;
    const existing = declaredByTest.get(key) || [];
    existing.push(snapshot.snapshotId);
    declaredByTest.set(key, existing);
  }

  const produced = new Set();

  for (const outcome of outcomes) {
    for (const id of outcome.attachedSnapshotIds) produced.add(id);

    if (outcome.status !== 'expected' && outcome.status !== 'flaky') continue;

    // Spec paths in results.json are relative to testDir; declaredByTest keys
    // are workspace-relative. Match on the trailing path segment.
    for (const [key, ids] of declaredByTest) {
      const [specPath, testTitle] = key.split('::');
      if (testTitle !== outcome.title) continue;
      if (!specPath.endsWith(outcome.file) && !outcome.file.endsWith(path.basename(specPath))) {
        continue;
      }
      for (const id of ids) produced.add(id);
    }
  }

  return produced;
}

/**
 * Build the coverage result.
 *
 * `producedSnapshotIds` is the set of snapshot IDs the run actually compared.
 * When it is null (no Playwright run yet, e.g. a static audit), capture-related
 * fields are reported as null rather than zero so a static audit is never
 * mistaken for a run that produced nothing.
 */
export async function buildCoverage({
  platform = APPROVED_PLATFORM,
  profile = 'full',
  outcomes = null,
  // Snapshot IDs that were approved BEFORE the run, from the preflight.
  //
  // Required for any post-run scoring: `toHaveScreenshot()` writes a missing
  // snapshot into the snapshot directory before failing, so re-listing the
  // directory afterwards would count those unapproved images as approved and
  // silently inflate the coverage percentage.
  approvedSnapshotIds = null,
} = {}) {
  const registry = await readRegistry();
  const specSnapshots = await discoverSpecSnapshots({ grep: registry.grep });
  const baselines = approvedSnapshotIds
    ? approvedSnapshotIds.map((snapshotId) => ({ snapshotId, file: null }))
    : await listApprovedBaselines(platform);
  const producedSnapshotIds = outcomes
    ? resolveProducedSnapshots(outcomes, specSnapshots)
    : null;

  const scenarios = resolvedScenarios(registry);
  const byId = new Map(scenarios.map((scenario) => [scenario.snapshotId, scenario]));
  const specById = new Map(specSnapshots.map((snapshot) => [snapshot.snapshotId, snapshot]));
  const baselineIds = new Set(baselines.map((baseline) => baseline.snapshotId));
  const selected = new Set(
    scenariosForProfile(registry, profile).map((scenario) => scenario.snapshotId),
  );

  const coverage = {
    registry: toWorkspacePath(registryPath()),
    registryVersion: registry.registryVersion,
    platform,
    profile,
    counts: {
      registered: scenarios.length,
      active: 0,
      planned: 0,
      excluded: 0,
      deprecated: 0,
      selectedByProfile: selected.size,
      approvedBaselines: baselines.length,
      expectedSnapshots: 0,
      expectedInProfile: 0,
      attemptedSnapshots: producedSnapshotIds ? producedSnapshotIds.size : null,
      producedSnapshots: producedSnapshotIds ? 0 : null,
      passedComparisons: null,
      viewports: Object.keys(registry.viewports || {}).length,
      locales: Object.keys(registry.locales || {}).length,
      themes: Object.keys(registry.themes || {}).length,
      screens: new Set(
        scenarios.filter((scenario) => scenario.screen).map((scenario) => scenario.screen),
      ).size,
      surfaces: new Set(scenarios.map((scenario) => scenario.surface)).size,
      plannedGroups: (registry.planned || []).length,
    },
    // Blocking findings.
    missingBaselines: [],
    baselineGapsOutsideProfile: [],
    missingCaptures: [],
    unregisteredSnapshots: [],
    duplicateSnapshotIds: findDuplicateSnapshotIds(specSnapshots),
    // Non-blocking findings.
    orphanBaselines: [],
    scenariosWithoutSpec: [],
    missingCoverage: [],
    excludedScenarios: [],
    coveragePercent: 0,
  };

  for (const scenario of scenarios) {
    coverage.counts[scenario.status] += 1;
  }

  for (const scenario of scenarios) {
    const spec = specById.get(scenario.snapshotId);
    const hasBaseline = baselineIds.has(scenario.snapshotId);

    if (scenario.status === 'excluded' || scenario.status === 'deprecated') {
      coverage.excludedScenarios.push({
        snapshotId: scenario.snapshotId,
        status: scenario.status,
        reason: scenario.exclusionReason,
        baselinePresent: hasBaseline,
      });

      if (hasBaseline) {
        coverage.orphanBaselines.push({
          snapshotId: scenario.snapshotId,
          reason: `Scenario is ${scenario.status}: ${scenario.exclusionReason}`,
        });
      }
      continue;
    }

    if (scenario.status === 'planned') {
      coverage.missingCoverage.push({
        snapshotId: scenario.snapshotId,
        screen: scenario.screen,
        reason: 'Registered as planned; no approved baseline yet.',
        specPresent: Boolean(spec),
        baselinePresent: hasBaseline,
      });
      continue;
    }

    // status === 'active'
    if (!spec) {
      coverage.scenariosWithoutSpec.push({
        snapshotId: scenario.snapshotId,
        screen: scenario.screen,
        reason:
          'Registered as active but no visual spec declares this snapshot. Either implement it or change its status.',
      });
      continue;
    }

    if (spec.skipped) {
      coverage.missingCoverage.push({
        snapshotId: scenario.snapshotId,
        screen: scenario.screen,
        reason: `Spec at ${spec.spec}:${spec.line} is skipped, but the registry marks the scenario active.`,
        specPresent: true,
        baselinePresent: hasBaseline,
      });
      continue;
    }

    coverage.counts.expectedSnapshots += 1;
    if (selected.has(scenario.snapshotId)) coverage.counts.expectedInProfile += 1;

    if (!hasBaseline) {
      const entry = {
        snapshotId: scenario.snapshotId,
        screen: scenario.screen,
        spec: `${spec.spec}:${spec.line}`,
        reason: `No approved ${platform} baseline for an active registered scenario.`,
      };

      // A baseline gap only blocks the run that would actually have compared
      // against it. A narrower profile still *reports* the gap, so it can never
      // be lost, but it does not fail a run that never touches that screen.
      if (selected.has(scenario.snapshotId)) {
        coverage.missingBaselines.push(entry);
      } else {
        coverage.baselineGapsOutsideProfile.push({
          ...entry,
          reason: `${entry.reason} Not selected by the "${profile}" profile, so reported rather than blocking.`,
        });
      }
    }

    if (producedSnapshotIds && selected.has(scenario.snapshotId)) {
      if (producedSnapshotIds.has(scenario.snapshotId)) {
        coverage.counts.producedSnapshots += 1;
      } else {
        coverage.missingCaptures.push({
          snapshotId: scenario.snapshotId,
          screen: scenario.screen,
          spec: `${spec.spec}:${spec.line}`,
          reason:
            'Selected by the execution profile but the run produced no comparison for it.',
        });
      }
    }
  }

  // Snapshots the specs capture that the registry does not know about.
  for (const snapshot of specSnapshots) {
    if (byId.has(snapshot.snapshotId)) continue;
    coverage.unregisteredSnapshots.push({
      snapshotId: snapshot.snapshotId,
      spec: `${snapshot.spec}:${snapshot.line}`,
      reason:
        'Captured by a spec but absent from the coverage registry. Register it (or remove the capture) so the expected-snapshot list stays authoritative.',
    });
  }

  // Approved baselines with no registered scenario at all.
  for (const baseline of baselines) {
    if (byId.has(baseline.snapshotId)) continue;
    coverage.orphanBaselines.push({
      snapshotId: baseline.snapshotId,
      file: baseline.file,
      reason: 'Approved baseline with no registered scenario.',
    });
  }

  // Planned coverage groups are the declared gap.
  for (const group of registry.planned || []) {
    coverage.missingCoverage.push({
      group: group.id,
      reason: group.reason,
      mode: group.mode ?? null,
      locale: group.locale ?? null,
      theme: group.theme ?? null,
      viewport: group.viewport ?? null,
      surface: group.surface ?? null,
      blockedBy: group.blockedBy ?? null,
      owner: group.owner ?? null,
    });
  }

  // Score against the snapshots this profile is responsible for. Scoring a
  // narrowed profile against the whole registry would report a low percentage
  // that says nothing about whether the run did its job.
  const denominator = coverage.counts.expectedInProfile;
  const numerator =
    producedSnapshotIds && denominator > 0
      ? coverage.counts.producedSnapshots
      : denominator > 0
        ? denominator - coverage.missingBaselines.length
        : 0;

  coverage.coveragePercent =
    denominator > 0 ? Math.round((numerator / denominator) * 10000) / 100 : 0;
  coverage.coverageBasis = producedSnapshotIds
    ? `produced snapshots / expected snapshots in the "${profile}" profile`
    : `approved baselines / expected snapshots in the "${profile}" profile (no run analysed)`;

  return coverage;
}

/**
 * Coverage findings, split by what they actually MEAN.
 *
 * These used to be one flat "blocking reasons" list, which is why a registry
 * inconsistency and an absent approved image were reported identically and both
 * aborted the run. They are three different problems with three different
 * owners, so each maps to its own classification:
 *
 *   coverageMismatchFindings  COVERAGE_MISMATCH  framework maintenance
 *   baselineMissingFindings   BASELINE_MISSING   awaiting human approval
 *   captureFailureFindings    CAPTURE_FAILURE    a spec did not produce a capture
 *
 * None of them block. See scripts/lib/visual-classification.mjs for the policy.
 */

/**
 * Registry / spec / baseline disagreements.
 *
 * `missingCoverage` is deliberately excluded: it is the declared,
 * reason-documented gap, not an inconsistency.
 */
export function coverageMismatchFindings(coverage) {
  const findings = [];

  for (const entry of coverage.scenariosWithoutSpec) {
    findings.push({
      snapshot: entry.snapshotId,
      kind: 'active-scenario-without-spec',
      reason: entry.reason,
      screen: entry.screen ?? null,
      spec: null,
    });
  }

  for (const entry of coverage.unregisteredSnapshots) {
    findings.push({
      snapshot: entry.snapshotId,
      kind: 'unregistered-snapshot',
      reason: entry.reason,
      screen: null,
      spec: entry.spec,
    });
  }

  for (const entry of coverage.duplicateSnapshotIds) {
    findings.push({
      snapshot: entry.snapshotId,
      kind: 'duplicate-snapshot-id',
      reason: `Declared more than once, at ${entry.locations.join(' and ')}. The expected-snapshot list cannot be authoritative while a single ID maps to two captures.`,
      screen: null,
      spec: entry.locations[0] ?? null,
    });
  }

  for (const entry of coverage.orphanBaselines) {
    findings.push({
      snapshot: entry.snapshotId,
      kind: 'orphan-baseline',
      reason: entry.reason,
      screen: null,
      spec: null,
      file: entry.file ?? null,
    });
  }

  return findings;
}

/**
 * Active, spec-backed scenarios with no approved baseline for this platform.
 *
 * Not a visual difference: without an expected image there is nothing to compare
 * against. Never resolved by promoting the current screenshot automatically.
 */
export function baselineMissingFindings(coverage) {
  return coverage.missingBaselines.map((entry) => ({
    snapshot: entry.snapshotId,
    spec: entry.spec,
    screen: entry.screen ?? null,
    reason: entry.reason,
    comparisonPerformed: false,
  }));
}

/**
 * Snapshots this profile expected but for which the run produced no comparison.
 *
 * Only meaningful after a run: `missingCaptures` is empty on a static audit.
 */
export function captureFailureFindings(coverage) {
  return coverage.missingCaptures.map((entry) => ({
    snapshot: entry.snapshotId,
    spec: entry.spec,
    screen: entry.screen ?? null,
    error: entry.reason,
    comparisonPerformed: false,
    source: 'coverage',
  }));
}

