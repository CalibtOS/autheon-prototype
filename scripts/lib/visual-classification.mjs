/**
 * Canonical visual-regression result semantics.
 *
 * This module is the ONLY place that decides what a visual-regression run means.
 * The engine, the CI gate, the notification generator, the artifact manifest and
 * any future Jenkins integration all read the vocabulary defined here. Nothing
 * downstream re-derives a verdict from raw counters, and nothing derives one
 * from a raw Playwright exit code.
 *
 * Why the categories are separate
 * -------------------------------
 * The system answers one question: "did the UI visually change compared with the
 * last APPROVED baseline?" A run can fail to answer that question for reasons
 * that are not visual changes at all, and collapsing them into a single "failed"
 * makes the report actively misleading:
 *
 *   VISUAL_CHANGES         a comparison happened and the pixels differ
 *   CAPTURE_FAILURE        the spec never reached its screenshot assertion, so
 *                          NO comparison happened — an outdated locator is not a
 *                          visual change
 *   BASELINE_MISSING       there is no approved image to compare against, so no
 *                          comparison is even possible
 *   COVERAGE_MISMATCH      the registry, the specs and the baselines disagree —
 *                          a framework-maintenance finding
 *   INFRASTRUCTURE_FAILURE the visual engine itself could not run reliably
 *   CLEAN                  everything expected was compared and nothing changed
 *
 * Multiple categories legitimately coexist in one run. "3 visual differences, 2
 * specs that failed before capture, 1 missing baseline" is a valid result and
 * must not be forced into one reason.
 *
 * Blocking policy
 * ---------------
 * This is an observability / review system, not a deployment gate. NOTHING here
 * blocks by default — not a visual difference, not a missing baseline, not a
 * broken spec, not a coverage inconsistency, not even an infrastructure failure.
 * The goal is NON-BLOCKING, not INVISIBLE: every finding stays loudly reported
 * and correctly classified while the application pipeline continues.
 *
 * Two deliberate opt-ins exist for teams that later want a harder policy:
 *   VISUAL_REGRESSION_STRICT                  visual differences become blocking
 *   VISUAL_REGRESSION_FAIL_ON_INFRASTRUCTURE  infra failures become blocking
 * Both default to off.
 */

/** The finding categories. Order is report order, not severity order. */
export const CATEGORY = {
  VISUAL_CHANGES: 'VISUAL_CHANGES',
  CAPTURE_FAILURE: 'CAPTURE_FAILURE',
  BASELINE_MISSING: 'BASELINE_MISSING',
  COVERAGE_MISMATCH: 'COVERAGE_MISMATCH',
  INFRASTRUCTURE_FAILURE: 'INFRASTRUCTURE_FAILURE',
};

/** Derived top-level run states. */
export const STATE = {
  CLEAN: 'CLEAN',
  VISUAL_CHANGES: 'VISUAL_CHANGES',
  INCOMPLETE: 'INCOMPLETE',
  INCOMPLETE_WITH_VISUAL_CHANGES: 'INCOMPLETE_WITH_VISUAL_CHANGES',
  INFRASTRUCTURE_FAILURE: 'INFRASTRUCTURE_FAILURE',
};

/**
 * The summary field each category lives in.
 *
 * Kept as data rather than hardcoded in five places so a consumer can iterate
 * categories generically (the email sections and the job summary both do).
 */
export const CATEGORY_FIELD = {
  [CATEGORY.VISUAL_CHANGES]: 'visualDifferences',
  [CATEGORY.CAPTURE_FAILURE]: 'captureFailures',
  [CATEGORY.BASELINE_MISSING]: 'missingBaselines',
  [CATEGORY.COVERAGE_MISMATCH]: 'coverageProblems',
  [CATEGORY.INFRASTRUCTURE_FAILURE]: 'infrastructureFailures',
};

/** Human-facing section headings, fixed by the reporting contract. */
export const CATEGORY_HEADING = {
  [CATEGORY.VISUAL_CHANGES]: 'Visual differences',
  [CATEGORY.CAPTURE_FAILURE]: 'Visual specs requiring attention',
  [CATEGORY.BASELINE_MISSING]: 'Baselines requiring approval',
  [CATEGORY.COVERAGE_MISMATCH]: 'Coverage maintenance findings',
  [CATEGORY.INFRASTRUCTURE_FAILURE]: 'Visual regression infrastructure failure',
};

/**
 * One-line explanation per category, reused by the email, the job summary and
 * the artifact README so the three can never explain the same thing differently.
 */
export const CATEGORY_MEANING = {
  [CATEGORY.VISUAL_CHANGES]:
    'A comparison against the approved baseline ran and the pixels differ. Review the expected/actual/diff evidence; this is a review signal, not a deployment failure.',
  [CATEGORY.CAPTURE_FAILURE]:
    'The spec could not reach its screenshot assertion, so NO visual comparison was performed. Coverage for this screen is temporarily unavailable until the spec is repaired.',
  [CATEGORY.BASELINE_MISSING]:
    'There is no approved baseline to compare against. A current screenshot may have been captured, but nothing can be concluded from it. Baseline approval is a deliberate human action.',
  [CATEGORY.COVERAGE_MISMATCH]:
    'The coverage registry, the visual specs and the approved baselines disagree. This is a framework-maintenance finding and does not stop other screenshots from being compared.',
  [CATEGORY.INFRASTRUCTURE_FAILURE]:
    'The visual-regression engine itself could not complete reliably. This run cannot be read as a successful visual comparison.',
};

export const ALL_CATEGORIES = [
  CATEGORY.VISUAL_CHANGES,
  CATEGORY.CAPTURE_FAILURE,
  CATEGORY.BASELINE_MISSING,
  CATEGORY.COVERAGE_MISMATCH,
  CATEGORY.INFRASTRUCTURE_FAILURE,
];

/** Categories that mean "the run could not fully answer the question". */
const INCOMPLETE_CATEGORIES = [
  CATEGORY.CAPTURE_FAILURE,
  CATEGORY.BASELINE_MISSING,
  CATEGORY.COVERAGE_MISMATCH,
];

/** Findings present in a summary-shaped object, in report order. */
export function presentCategories(summary) {
  return ALL_CATEGORIES.filter((category) => countFor(summary, category) > 0);
}

export function countFor(summary, category) {
  const value = summary?.[CATEGORY_FIELD[category]];
  return Array.isArray(value) ? value.length : 0;
}

/**
 * Derive the top-level state.
 *
 * Infrastructure failure wins outright: if the engine did not run reliably, the
 * other counters cannot be trusted to be complete. Otherwise the state records
 * both axes — did anything change, and was the run able to check everything.
 */
export function deriveState(summary) {
  if (countFor(summary, CATEGORY.INFRASTRUCTURE_FAILURE) > 0) {
    return STATE.INFRASTRUCTURE_FAILURE;
  }

  const changed = countFor(summary, CATEGORY.VISUAL_CHANGES) > 0;
  const incomplete = INCOMPLETE_CATEGORIES.some(
    (category) => countFor(summary, category) > 0,
  );

  if (incomplete && changed) return STATE.INCOMPLETE_WITH_VISUAL_CHANGES;
  if (incomplete) return STATE.INCOMPLETE;
  if (changed) return STATE.VISUAL_CHANGES;
  return STATE.CLEAN;
}

/**
 * Comparison counters.
 *
 * `expected`  snapshots this profile is responsible for
 * `captured`  snapshots the run actually produced an image for
 * `compared`  captures that had an approved baseline to compare against
 * `changed`   comparisons whose pixels differed
 * `unchanged` compared - changed
 *
 * A missing baseline reduces `compared` without becoming a `changed`, which is
 * what stops "no expected image" from masquerading as a visual difference.
 */
export function buildComparison({ expected, captured, changed, missingBaselines }) {
  const safeExpected = numberOr(expected, 0);
  const safeCaptured = numberOr(captured, 0);
  const safeChanged = numberOr(changed, 0);
  const safeMissing = numberOr(missingBaselines, 0);

  const compared = Math.max(0, safeCaptured - safeMissing);

  return {
    expected: safeExpected,
    captured: safeCaptured,
    compared,
    unchanged: Math.max(0, compared - safeChanged),
    changed: safeChanged,
  };
}

/**
 * The single gate decision.
 *
 * Returns the verdict plus the reason list and the policy that produced it, so
 * the CI layer only has to read `blocking` and never has to reason about counts.
 */
export function buildGate(summary, { strict = false, failOnInfrastructure = false } = {}) {
  const categories = presentCategories(summary);
  const reasons = [];

  for (const category of categories) {
    const blocking =
      (category === CATEGORY.VISUAL_CHANGES && strict) ||
      (category === CATEGORY.INFRASTRUCTURE_FAILURE && failOnInfrastructure);

    for (const finding of summary[CATEGORY_FIELD[category]]) {
      reasons.push({
        category,
        blocking,
        detail: describeFinding(category, finding),
      });
    }
  }

  const blocking = reasons.some((reason) => reason.blocking);

  return {
    blocking,
    strict,
    failOnInfrastructure,
    // The visual-regression workflow must not fail the application pipeline.
    exitCode: blocking ? 1 : 0,
    policy: {
      [CATEGORY.VISUAL_CHANGES]: strict
        ? 'blocking (strict mode explicitly enabled)'
        : 'non-blocking — review signal',
      [CATEGORY.CAPTURE_FAILURE]: 'non-blocking — reported, coverage temporarily unavailable',
      [CATEGORY.BASELINE_MISSING]: 'non-blocking — reported, awaiting human baseline approval',
      [CATEGORY.COVERAGE_MISMATCH]: 'non-blocking — framework-maintenance finding',
      [CATEGORY.INFRASTRUCTURE_FAILURE]: failOnInfrastructure
        ? 'blocking (VISUAL_REGRESSION_FAIL_ON_INFRASTRUCTURE enabled)'
        : 'non-blocking — reported loudly, never mistakable for a successful comparison',
      'notification-failure': 'reported separately, never affects the regression verdict',
    },
    reasons,
  };
}

/** Short, category-appropriate description of one finding. */
export function describeFinding(category, finding) {
  const snapshot = finding?.snapshot || finding?.snapshotId || finding?.title || 'unknown';

  switch (category) {
    case CATEGORY.VISUAL_CHANGES:
      return `${snapshot} changed.`;
    case CATEGORY.CAPTURE_FAILURE:
      return `${snapshot} was not compared: ${firstLine(finding?.error || finding?.message)}`;
    case CATEGORY.BASELINE_MISSING:
      return `${snapshot} has no approved baseline.`;
    case CATEGORY.COVERAGE_MISMATCH:
      return `${snapshot}: ${firstLine(finding?.reason || finding?.message)}`;
    case CATEGORY.INFRASTRUCTURE_FAILURE:
      return `${snapshot}: ${firstLine(finding?.message || finding?.error)}`;
    default:
      return String(snapshot);
  }
}

/**
 * Whether a notification should be sent.
 *
 * One notification per run, only when there is something to act on. A clean run
 * stays silent unless success notifications are explicitly configured on.
 */
export function shouldNotify(summary, { notifyOnSuccess = false } = {}) {
  if (presentCategories(summary).length > 0) return true;
  return Boolean(notifyOnSuccess);
}

/** Legacy `status` string, kept so existing consumers keep working. */
export function legacyStatus(summary, { strict = false } = {}) {
  const state = deriveState(summary);

  if (state === STATE.CLEAN) return 'passed';
  if (state === STATE.INFRASTRUCTURE_FAILURE) return 'failed';
  if (state === STATE.VISUAL_CHANGES) {
    return strict ? 'visual-differences-failed' : 'visual-differences-non-blocking';
  }
  // INCOMPLETE / INCOMPLETE_WITH_VISUAL_CHANGES: the run did not fully answer
  // the question, but it is not a hard failure any more.
  return 'incomplete';
}

/** Human-readable one-line verdict for logs and email subjects. */
export function describeState(state, comparison) {
  const counts = comparison
    ? ` (${comparison.compared}/${comparison.expected} compared, ${comparison.changed} changed)`
    : '';

  switch (state) {
    case STATE.CLEAN:
      return `No visual changes${counts}.`;
    case STATE.VISUAL_CHANGES:
      return `Visual changes detected${counts}.`;
    case STATE.INCOMPLETE:
      return `Run incomplete — some snapshots could not be compared${counts}.`;
    case STATE.INCOMPLETE_WITH_VISUAL_CHANGES:
      return `Visual changes detected and some snapshots could not be compared${counts}.`;
    case STATE.INFRASTRUCTURE_FAILURE:
      return 'Visual regression could not complete reliably.';
    default:
      return String(state);
  }
}

function numberOr(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function firstLine(message) {
  return String(message ?? '').split('\n').find(Boolean) || 'No detail available.';
}
