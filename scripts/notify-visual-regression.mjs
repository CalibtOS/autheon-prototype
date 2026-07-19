#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { chromium } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';

const repoRoot = process.cwd();

for (const fileName of ['.env.testing', '.env.e2e', '.env']) {
  loadDotenv({
    path: path.join(repoRoot, fileName),
    override: false,
  });
}

const artifactDir =
  process.env.VISUAL_REGRESSION_ARTIFACT_DIR || path.join(repoRoot, 'visual-regression-artifacts');
const summaryDir = path.join(artifactDir, 'visual-regression-summary');
const summaryPath = path.join(summaryDir, 'summary.json');
const recipient =
  process.env.REGRESSION_NOTIFICATION_EMAIL || 'youssef.elkondakly@calibtos.com';
const hostArtifactDir = process.env.REGRESSION_ARTIFACT_HOST_DIR || artifactDir;
const ciExitCode = Number(process.env.REGRESSION_CI_EXIT_CODE || '0');
const dryRun = isTruthy(process.env.REGRESSION_NOTIFICATION_DRY_RUN);
const notifyOnSuccess = isTruthy(process.env.REGRESSION_NOTIFY_ON_SUCCESS);
const notificationRequired = isTruthy(process.env.REGRESSION_NOTIFICATION_REQUIRED);

let summary;
try {
  summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
} catch (error) {
  const fallback = await createMissingSummaryFallback(error);
  const result = await notify(fallback);
  process.exit(!result.ok && notificationRequired ? 1 : 0);
}

const classification = classify(summary);

if (classification.kind === 'success' && !notifyOnSuccess) {
  console.log('[visual-regression-notify] No notification sent for a clean successful run.');
  process.exit(0);
}

const reportModel = buildReportModel(summary, classification);
const reportArtifacts = await writeReportArtifacts(reportModel);
const email = await buildEmail(reportModel, reportArtifacts);
const result = await notify({ classification, email, reportArtifacts });

if (!result.ok && notificationRequired) {
  process.exit(1);
}

process.exit(0);

function classify(summaryJson) {
  const executionFailures = summaryJson.executionFailures?.length || 0;
  const missingBaselines = summaryJson.missingBaselines?.length || 0;
  const visualDifferences = summaryJson.visualDifferences?.length || 0;

  if (executionFailures > 0 || missingBaselines > 0 || (ciExitCode !== 0 && visualDifferences === 0)) {
    return {
      kind: 'failure',
      label: 'FAILURE — EXECUTION ERROR',
      subjectStatus: 'CI failed',
      blocking: true,
      reason: 'Visual regression execution failed.',
    };
  }

  if (summaryJson.strict && visualDifferences > 0) {
    return {
      kind: 'failure',
      label: 'FAILURE — VISUAL CHANGES DETECTED',
      subjectStatus: 'CI failed',
      blocking: true,
      reason: 'Visual regression differences were found in strict mode.',
    };
  }

  if (visualDifferences > 0) {
    return {
      kind: 'warning',
      label: 'WARNING — VISUAL CHANGES DETECTED',
      subjectStatus: 'CI passed',
      blocking: false,
      reason: 'Visual differences were detected, but CI execution succeeded.',
    };
  }

  return {
    kind: 'success',
    label: 'PASS',
    subjectStatus: 'passed',
    blocking: false,
    reason: 'Visual regression completed without differences or execution failures.',
  };
}

function buildReportModel(summaryJson, classification) {
  const visualDifferences = (summaryJson.visualDifferences || []).map((diff, index) =>
    buildVisualDifference(diff, index),
  );
  const executionFailures = (summaryJson.executionFailures || []).map((failure, index) =>
    buildFailure(failure, index, 'execution failure'),
  );
  const missingBaselines = (summaryJson.missingBaselines || []).map((failure, index) =>
    buildFailure(failure, index, 'missing baseline'),
  );
  const browser = inferBrowser(summaryJson, visualDifferences, executionFailures, missingBaselines);
  const viewport = inferViewport(visualDifferences);

  return {
    classification,
    summary: summaryJson,
    generatedAt: new Date().toISOString(),
    metadata: {
      branch: gitMetadata('branch'),
      commit: gitMetadata('commit'),
      runTimestamp: summaryJson.createdAt,
      environment: firstEnv([
        'REGRESSION_ENVIRONMENT',
        'VISUAL_REGRESSION_ENVIRONMENT',
        'APP_ENV',
        'NODE_ENV',
      ]),
      browser,
      viewport,
      totalTests: summaryJson.totalTests,
      passed: summaryJson.expected,
      skipped: summaryJson.skipped,
      visualDifferences: visualDifferences.length,
      executionFailures: executionFailures.length,
      missingBaselines: missingBaselines.length,
      wrapperStatus: summaryJson.status,
      playwrightExitCode: summaryJson.playwrightExitCode,
      strict: summaryJson.strict,
      platform: summaryJson.platform,
      node: summaryJson.node,
    },
    artifact: {
      hostDir: hostArtifactDir,
      archivePath: path.join(
        hostArtifactDir,
        summaryJson.archiveName || 'autheon-visual-regression-artifact.tar.gz',
      ),
      archiveSourcePath: path.join(
        artifactDir,
        summaryJson.archiveName || 'autheon-visual-regression-artifact.tar.gz',
      ),
      artifactUrl: firstEnv(['REGRESSION_ARTIFACT_URL', 'VISUAL_REGRESSION_ARTIFACT_URL']),
      playwrightReport: summaryJson.playwrightReport,
      testResults: summaryJson.testResults,
    },
    visualDifferences,
    executionFailures,
    missingBaselines,
    needsDetailedReport:
      visualDifferences.length > 0 || executionFailures.length > 0 || missingBaselines.length > 0,
  };
}

function buildVisualDifference(diff, index) {
  const area = inferApplicationArea(diff);
  const expectedPath = resolveRunPath(diff.expected);
  const actualPath = resolveRunPath(diff.actual);
  const diffPath = resolveRunPath(diff.diff);

  return {
    index: index + 1,
    classification: 'visual warning',
    snapshot: diff.snapshot || snapshotNameFromPath(diff.actual) || diff.title,
    title: diff.title,
    file: diff.file,
    applicationArea: area,
    route: inferRoute(diff),
    browser: diff.project,
    viewport: formatDimensions(diff.dimensions),
    changedPixels: diff.changedPixels,
    changedRatio: diff.changedRatio,
    rawChangedPixels: diff.rawChangedPixels,
    rawChangedRatio: diff.rawChangedRatio,
    changedRegion: diff.changedRegion,
    dimensions: diff.dimensions,
    threshold: extractThreshold(diff.message),
    durationMs: diff.durationMs,
    status: diff.status,
    baselineModified: false,
    message: diff.message,
    paths: {
      expected: diff.expected,
      actual: diff.actual,
      diff: diff.diff,
    },
    artifactPaths: {
      expected: artifactPathFor(diff.expected),
      actual: artifactPathFor(diff.actual),
      diff: artifactPathFor(diff.diff),
    },
    images: {
      expected: buildImageRef('Expected / Approved baseline', diff.expected, expectedPath),
      actual: buildImageRef('Actual / Current result', diff.actual, actualPath),
      diff: buildImageRef('Visual difference', diff.diff, diffPath),
    },
    attachments: diff.attachments || [],
  };
}

function buildFailure(failure, index, classification) {
  const attachments = normalizeAttachments(failure.attachments || []);
  return {
    index: index + 1,
    classification,
    title: failure.title || 'Unknown test',
    file: failure.file || 'unknown',
    applicationArea: inferApplicationArea(failure),
    browser: failure.project,
    status: failure.status,
    durationMs: failure.durationMs,
    message: failure.message,
    attachments,
    trace: firstAttachment(attachments, (attachment) => /trace/i.test(attachment.name) || /trace\.zip$/i.test(attachment.path)),
    screenshot: firstAttachment(
      attachments,
      (attachment) =>
        attachment.contentType === 'image/png' ||
        /screenshot|test-failed|\.png$/i.test(`${attachment.name} ${attachment.path}`),
    ),
    video: firstAttachment(attachments, (attachment) => /video|\.webm$/i.test(`${attachment.name} ${attachment.path}`)),
    errorContext: firstAttachment(
      attachments,
      (attachment) =>
        /error-context/i.test(attachment.name) ||
        attachment.contentType === 'text/markdown' ||
        /\.md$/i.test(attachment.path),
    ),
  };
}

function buildImageRef(label, workspacePath, absolutePath) {
  return {
    label,
    workspacePath,
    artifactPath: artifactPathFor(workspacePath),
    path: absolutePath,
    exists: Boolean(absolutePath && fsSync.existsSync(absolutePath)),
    cid: null,
  };
}

async function writeReportArtifacts(model) {
  await fs.mkdir(summaryDir, { recursive: true });

  const artifacts = {
    emailHtmlPath: path.join(summaryDir, 'notification-email.html'),
    pdfPath: null,
    pdfError: null,
    archiveUpdated: false,
    archiveSha256: null,
  };

  if (model.needsDetailedReport) {
    artifacts.pdfPath = path.join(summaryDir, 'visual-regression-report.pdf');
    try {
      await generatePdfReport(model, artifacts.pdfPath);
      console.log(`[visual-regression-notify] PDF report written to ${toWorkspacePath(artifacts.pdfPath)}`);
    } catch (error) {
      artifacts.pdfError = error.message || String(error);
      artifacts.pdfPath = null;
      console.warn(`[visual-regression-notify] PDF report failed: ${artifacts.pdfError}`);
    }
  }

  return artifacts;
}

async function buildEmail(model, reportArtifacts) {
  const inlineImageAttachments = attachInlineImages(model);
  const fileAttachments = await buildFileAttachments(model, reportArtifacts);
  const attachments = [...inlineImageAttachments, ...fileAttachments];
  const html = renderHtmlEmail(model, reportArtifacts);
  const text = renderTextEmail(model, reportArtifacts);

  await fs.writeFile(reportArtifacts.emailHtmlPath, html, 'utf8');

  return {
    to: recipient,
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'visual-regression@localhost',
    subject: subjectFor(model),
    text,
    html,
    attachments,
  };
}

function attachInlineImages(model) {
  const attachments = [];

  for (const diff of model.visualDifferences) {
    for (const [kind, image] of Object.entries(diff.images)) {
      if (!image.exists) continue;
      const cid = `visual-regression-${diff.index}-${kind}@autheon.local`;
      image.cid = cid;
      attachments.push({
        filename: `${String(diff.index).padStart(2, '0')}-${kind}-${path.basename(image.path)}`,
        path: image.path,
        cid,
        contentType: 'image/png',
      });
    }
  }

  return attachments;
}

async function buildFileAttachments(model, reportArtifacts) {
  const attachments = [];

  if (reportArtifacts.pdfPath && fsSync.existsSync(reportArtifacts.pdfPath)) {
    attachments.push({
      filename: 'autheon-visual-regression-report.pdf',
      path: reportArtifacts.pdfPath,
      contentType: 'application/pdf',
    });
  }

  const archiveAttachment = await optionalArchiveAttachment(model);
  if (archiveAttachment) attachments.push(archiveAttachment);

  return attachments;
}

async function optionalArchiveAttachment(model) {
  if (!isTruthy(process.env.REGRESSION_ATTACH_ARCHIVE)) return null;
  if (!fsSync.existsSync(model.artifact.archiveSourcePath)) return null;

  const maxMb = Number(process.env.REGRESSION_ARCHIVE_ATTACHMENT_MAX_MB || '10');
  const stat = await fs.stat(model.artifact.archiveSourcePath);
  if (stat.size > maxMb * 1024 * 1024) {
    console.warn(
      `[visual-regression-notify] Archive not attached because it is ${formatBytes(
        stat.size,
      )}, above REGRESSION_ARCHIVE_ATTACHMENT_MAX_MB=${maxMb}.`,
    );
    return null;
  }

  return {
    filename: path.basename(model.artifact.archiveSourcePath),
    path: model.artifact.archiveSourcePath,
    contentType: 'application/gzip',
  };
}

async function notify({ classification, email, reportArtifacts }) {
  await fs.mkdir(summaryDir, { recursive: true });
  await fs.writeFile(
    path.join(summaryDir, 'notification-email.json'),
    `${JSON.stringify(
      {
        classification,
        email: {
          ...email,
          attachments: (email.attachments || []).map((attachment) => ({
            filename: attachment.filename,
            contentType: attachment.contentType,
            cid: attachment.cid,
            path: attachment.path ? toWorkspacePath(attachment.path) : undefined,
          })),
        },
        reportArtifacts: normalizeReportArtifacts(reportArtifacts),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  await refreshExistingArtifactArchive(reportArtifacts);

  if (dryRun) {
    console.log(
      `[visual-regression-notify] Dry run: ${classification.label} email payload written to ${toWorkspacePath(
        path.join(summaryDir, 'notification-email.json'),
      )}`,
    );
    return { ok: true };
  }

  const missing = requiredSmtpVars().filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.warn(
      `[visual-regression-notify] Email not sent. Missing SMTP environment variable(s): ${missing.join(
        ', ',
      )}. Set REGRESSION_NOTIFICATION_DRY_RUN=true for local notification-path validation.`,
    );
    return { ok: false };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || '587'),
      secure: isTruthy(process.env.SMTP_SECURE),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const sent = await transporter.sendMail(email);
    console.log(`[visual-regression-notify] Email sent to ${recipient}: ${sent.messageId}`);
    return { ok: true };
  } catch (error) {
    console.warn(`[visual-regression-notify] Email failed: ${error.message || String(error)}`);
    return { ok: false };
  }
}

function subjectFor(model) {
  const visualCount = model.visualDifferences.length;
  const executionCount = model.executionFailures.length;
  const missingCount = model.missingBaselines.length;
  const failureCount = executionCount + missingCount;

  if (model.classification.kind === 'warning') {
    return `[AUTHEON Visual Regression] ⚠️ ${visualCount} visual ${plural(
      visualCount,
      'change',
      'changes',
    )} detected — CI passed`;
  }

  if (model.classification.kind === 'failure') {
    if (failureCount > 0) {
      return `[AUTHEON Visual Regression] ❌ CI failed — ${failureCount} execution ${plural(
        failureCount,
        'failure',
        'failures',
      )}`;
    }

    return `[AUTHEON Visual Regression] ❌ CI failed — ${visualCount} visual ${plural(
      visualCount,
      'change',
      'changes',
    )}`;
  }

  return '[AUTHEON Visual Regression] ✅ Passed — no visual changes';
}

function renderTextEmail(model, reportArtifacts) {
  const lines = [
    `AUTHEON Visual Regression: ${model.classification.label}`,
    '',
    model.classification.reason,
    '',
    `Blocking result: ${model.classification.blocking ? 'yes' : 'no'}`,
    ...metadataRows(model).map(([label, value]) => `${label}: ${value}`),
    `Host artifact directory: ${model.artifact.hostDir}`,
    `Artifact archive: ${model.artifact.archivePath}`,
    reportArtifacts.pdfPath ? `PDF report: ${hostSummaryPath('visual-regression-report.pdf')}` : null,
    '',
    'Approved baselines were NOT automatically updated.',
    '',
  ].filter(Boolean);

  if (model.visualDifferences.length > 0) {
    lines.push('Visual differences:', '');
    for (const diff of model.visualDifferences) {
      lines.push(
        `#${diff.index} ${diff.snapshot}`,
        `Test: ${diff.title}`,
        diff.applicationArea ? `Application area: ${diff.applicationArea}` : null,
        diff.browser ? `Browser/project: ${diff.browser}` : null,
        diff.viewport ? `Viewport/image dimensions: ${diff.viewport}` : null,
        `Changed pixels: ${formatNumber(diff.changedPixels)}`,
        `Difference ratio: ${formatPercent(diff.changedRatio)}`,
        `Changed region: ${formatBoundingBox(diff.changedRegion)}`,
        `Baseline modified: ${diff.baselineModified ? 'yes' : 'no'}`,
        `Expected: ${diff.paths.expected || 'n/a'}`,
        `Actual: ${diff.paths.actual || 'n/a'}`,
        `Diff: ${diff.paths.diff || 'n/a'}`,
        '',
      );
    }
  }

  if (model.executionFailures.length > 0 || model.missingBaselines.length > 0) {
    lines.push('Execution failures / missing baselines:', '');
    for (const failure of [...model.executionFailures, ...model.missingBaselines]) {
      lines.push(
        `#${failure.index} ${failure.title}`,
        `Classification: ${failure.classification}`,
        `Spec: ${failure.file}`,
        failure.browser ? `Browser/project: ${failure.browser}` : null,
        failure.screenshot ? `Screenshot: ${failure.screenshot.path}` : 'Screenshot: not available',
        failure.trace ? `Trace: ${failure.trace.path}` : 'Trace: not available',
        failure.trace ? `Open trace: npx playwright show-trace ${failure.trace.path}` : null,
        `Error: ${firstLine(failure.message)}`,
        '',
      );
    }
  }

  return `${lines.filter(Boolean).join('\n')}\n`;
}

function renderHtmlEmail(model, reportArtifacts) {
  const statusColor = {
    success: '#137333',
    warning: '#b06000',
    failure: '#b3261e',
  }[model.classification.kind];
  const backgroundColor = {
    success: '#e8f5e9',
    warning: '#fff4df',
    failure: '#fdecea',
  }[model.classification.kind];

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      @media only screen and (max-width: 720px) {
        .container { width: 100% !important; }
        .metric { display: block !important; width: 100% !important; }
        .compare-column { display: block !important; width: 100% !important; padding-right: 0 !important; }
      }
    </style>
  </head>
  <body style="margin:0;background:#f6f7f9;color:#202124;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f9;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" class="container" width="960" cellspacing="0" cellpadding="0" style="width:960px;max-width:960px;background:#ffffff;border:1px solid #dadce0;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:${backgroundColor};border-bottom:1px solid #dadce0;">
                <div style="font-size:13px;line-height:18px;color:#5f6368;text-transform:uppercase;letter-spacing:0;">AUTHEON Visual Regression</div>
                <h1 style="margin:6px 0 8px;font-size:26px;line-height:32px;color:${statusColor};">${escapeHtml(
                  model.classification.label,
                )}</h1>
                <p style="margin:0;font-size:15px;line-height:22px;color:#3c4043;">${escapeHtml(
                  model.classification.reason,
                )}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;">
                ${renderHtmlMetrics(model)}
                <p style="margin:16px 0 0;padding:12px 14px;background:#fff8e1;border:1px solid #f4d06f;border-radius:6px;font-size:14px;line-height:20px;color:#3c4043;"><strong>Approved baselines were NOT automatically updated.</strong></p>
                ${renderHtmlAttachmentSummary(model, reportArtifacts)}
              </td>
            </tr>
            ${model.visualDifferences.length > 0 ? renderVisualDifferenceCards(model) : ''}
            ${
              model.executionFailures.length > 0 || model.missingBaselines.length > 0
                ? renderFailureCards(model)
                : ''
            }
            <tr>
              <td style="padding:20px 28px 28px;border-top:1px solid #e8eaed;">
                <h2 style="margin:0 0 10px;font-size:18px;line-height:24px;color:#202124;">Artifact References</h2>
                ${renderArtifactReferences(model, reportArtifacts)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderHtmlMetrics(model) {
  const rows = metadataRows(model);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    ${chunk(rows, 3)
      .map(
        (row) => `<tr>${row
          .map(
            ([label, value]) => `<td class="metric" width="33.33%" valign="top" style="padding:6px 8px 10px 0;">
              <div style="font-size:12px;line-height:16px;color:#5f6368;">${escapeHtml(label)}</div>
              <div style="font-size:15px;line-height:21px;color:#202124;font-weight:700;">${escapeHtml(
                value,
              )}</div>
            </td>`,
          )
          .join('')}</tr>`,
      )
      .join('')}
  </table>`;
}

function renderHtmlAttachmentSummary(model, reportArtifacts) {
  const items = [];

  if (reportArtifacts.pdfPath) {
    items.push('Detailed PDF report attached.');
  } else if (reportArtifacts.pdfError) {
    items.push(`PDF report could not be generated: ${reportArtifacts.pdfError}`);
  }

  const inlineCount = model.visualDifferences.reduce(
    (count, diff) => count + Object.values(diff.images).filter((image) => image.cid).length,
    0,
  );
  if (inlineCount > 0) items.push(`${inlineCount} screenshots embedded with CID inline attachments.`);

  if (isTruthy(process.env.REGRESSION_ATTACH_ARCHIVE)) {
    items.push('Artifact archive attachment requested when under the configured size limit.');
  } else {
    items.push('Full artifact archive is not attached by default because it can grow large.');
  }

  return `<p style="margin:12px 0 0;font-size:13px;line-height:19px;color:#5f6368;">${items
    .map(escapeHtml)
    .join(' ')}</p>`;
}

function renderVisualDifferenceCards(model) {
  return model.visualDifferences
    .map(
      (diff) => `<tr>
        <td style="padding:0 28px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dadce0;border-radius:8px;">
            <tr>
              <td style="padding:18px 18px 12px;border-bottom:1px solid #e8eaed;">
                <h2 style="margin:0 0 8px;font-size:20px;line-height:26px;color:#202124;">Visual Difference #${diff.index}</h2>
                ${renderKeyValueTable([
                  ['Snapshot', codeHtml(diff.snapshot)],
                  ['Classification', escapeHtml(diff.classification)],
                  ['Test', escapeHtml(diff.title)],
                  ['Spec file', escapeHtml(diff.file)],
                  ['Application area', diff.applicationArea ? escapeHtml(diff.applicationArea) : null],
                  ['Route', diff.route ? escapeHtml(diff.route) : null],
                  ['Browser/project', diff.browser ? escapeHtml(diff.browser) : null],
                  ['Viewport/image dimensions', diff.viewport ? escapeHtml(diff.viewport) : null],
                  ['Changed pixels', escapeHtml(formatNumber(diff.changedPixels))],
                  ['Difference ratio', escapeHtml(formatPercent(diff.changedRatio))],
                  ['Changed region', escapeHtml(formatBoundingBox(diff.changedRegion))],
                  ['Relevant threshold', diff.threshold ? escapeHtml(diff.threshold) : null],
                  ['Baseline modified', 'No. Automatic baseline updates are disabled.'],
                ])}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 18px 18px;">
                ${renderImageComparison(diff)}
                ${renderPathReferences(diff)}
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join('');
}

function renderImageComparison(diff) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      ${['expected', 'actual', 'diff']
        .map((kind) => renderImageColumn(diff.images[kind], kind))
        .join('')}
    </tr>
  </table>`;
}

function renderImageColumn(image, kind) {
  const title = {
    expected: 'EXPECTED / APPROVED BASELINE',
    actual: 'ACTUAL / CURRENT RESULT',
    diff: 'VISUAL DIFFERENCE',
  }[kind];
  const imageMarkup =
    image.exists && image.cid
      ? `<img src="cid:${image.cid}" alt="${escapeHtml(
          title,
        )}" style="display:block;width:100%;max-width:100%;height:auto;border:1px solid #dadce0;border-radius:4px;">`
      : `<div style="padding:24px 12px;border:1px dashed #dadce0;border-radius:4px;color:#5f6368;font-size:13px;line-height:18px;">Image unavailable in local workspace. See artifact path below.</div>`;

  return `<td class="compare-column" width="33.33%" valign="top" style="padding:0 10px 12px 0;">
    <div style="margin:0 0 8px;font-size:12px;line-height:16px;color:#5f6368;font-weight:700;">${title}</div>
    ${imageMarkup}
  </td>`;
}

function renderPathReferences(diff) {
  return `<div style="margin-top:8px;font-size:12px;line-height:18px;color:#5f6368;">
    <div><strong>Expected:</strong> ${escapeHtml(diff.paths.expected || 'n/a')}</div>
    <div><strong>Actual:</strong> ${escapeHtml(diff.paths.actual || 'n/a')}</div>
    <div><strong>Diff:</strong> ${escapeHtml(diff.paths.diff || 'n/a')}</div>
    ${
      diff.artifactPaths.actual
        ? `<div><strong>Persisted artifact path:</strong> ${escapeHtml(diff.artifactPaths.actual)}</div>`
        : ''
    }
  </div>`;
}

function renderFailureCards(model) {
  const failures = [...model.executionFailures, ...model.missingBaselines];
  return failures
    .map(
      (failure) => `<tr>
        <td style="padding:0 28px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dadce0;border-radius:8px;">
            <tr>
              <td style="padding:18px;">
                <h2 style="margin:0 0 8px;font-size:20px;line-height:26px;color:#202124;">${escapeHtml(
                  titleCase(failure.classification),
                )} #${failure.index}</h2>
                ${renderKeyValueTable([
                  ['Test', escapeHtml(failure.title)],
                  ['Spec file', escapeHtml(failure.file)],
                  ['Application area', failure.applicationArea ? escapeHtml(failure.applicationArea) : null],
                  ['Browser/project', failure.browser ? escapeHtml(failure.browser) : null],
                  ['Screenshot availability', failure.screenshot ? escapeHtml(failure.screenshot.path) : 'Not available'],
                  ['Trace availability', failure.trace ? escapeHtml(failure.trace.path) : 'Not available'],
                  [
                    'Trace command',
                    failure.trace
                      ? codeHtml(`npx playwright show-trace ${failure.trace.path}`)
                      : null,
                  ],
                  ['Video', failure.video ? escapeHtml(failure.video.path) : null],
                  ['Error context', failure.errorContext ? escapeHtml(failure.errorContext.path) : null],
                ])}
                <pre style="white-space:pre-wrap;margin:12px 0 0;padding:12px;background:#f8fafd;border:1px solid #e8eaed;border-radius:6px;font-size:12px;line-height:18px;color:#3c4043;">${escapeHtml(
                  truncate(failure.message, 2200),
                )}</pre>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join('');
}

function renderArtifactReferences(model, reportArtifacts) {
  const rows = [
    ['Host artifact directory', model.artifact.hostDir],
    ['Artifact archive', model.artifact.archivePath],
    ['CI artifact URL', model.artifact.artifactUrl],
    ['Playwright HTML report', model.artifact.playwrightReport],
    ['Test results', model.artifact.testResults],
    ['PDF report', reportArtifacts.pdfPath ? hostSummaryPath('visual-regression-report.pdf') : null],
    ['Notification HTML preview', hostSummaryPath('notification-email.html')],
  ];

  return renderKeyValueTable(
    rows.map(([label, value]) => [label, value ? escapeHtml(value) : null]),
  );
}

function renderKeyValueTable(rows) {
  const visibleRows = rows.filter(([, value]) => hasValue(value));
  if (visibleRows.length === 0) return '';

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${visibleRows
    .map(
      ([label, value]) => `<tr>
        <td valign="top" style="width:180px;padding:4px 12px 4px 0;font-size:13px;line-height:18px;color:#5f6368;">${escapeHtml(
          label,
        )}</td>
        <td valign="top" style="padding:4px 0;font-size:13px;line-height:18px;color:#202124;">${value}</td>
      </tr>`,
    )
    .join('')}</table>`;
}

async function generatePdfReport(model, pdfPath) {
  const html = await renderPdfHtml(model);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '14mm',
        right: '12mm',
        bottom: '14mm',
        left: '12mm',
      },
    });
  } finally {
    await browser.close();
  }
}

async function renderPdfHtml(model) {
  const visualSections = [];

  for (const diff of model.visualDifferences) {
    visualSections.push(renderPdfDifferenceInfo(diff));
    visualSections.push(await renderPdfImagePage(diff, 'expected', 'Expected / Approved Baseline'));
    visualSections.push(await renderPdfImagePage(diff, 'actual', 'Actual / Current Result'));
    visualSections.push(await renderPdfImagePage(diff, 'diff', 'Visual Difference'));
  }

  const failureSections =
    model.executionFailures.length > 0 || model.missingBaselines.length > 0
      ? [renderPdfFailures([...model.executionFailures, ...model.missingBaselines])]
      : [];

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      @page { size: A4; margin: 14mm 12mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #202124; background: #ffffff; }
      h1 { margin: 0 0 8px; font-size: 30px; line-height: 36px; }
      h2 { margin: 0 0 12px; font-size: 22px; line-height: 28px; }
      h3 { margin: 0 0 8px; font-size: 16px; line-height: 22px; }
      p { margin: 0 0 10px; font-size: 12px; line-height: 18px; }
      table { width: 100%; border-collapse: collapse; }
      td, th { padding: 6px 8px; border-bottom: 1px solid #e8eaed; text-align: left; vertical-align: top; font-size: 11px; line-height: 16px; }
      th { width: 34%; color: #5f6368; font-weight: 700; }
      code { font-family: Menlo, Consolas, monospace; font-size: 10px; }
      .page { page-break-after: always; }
      .status { display: inline-block; padding: 7px 10px; border-radius: 6px; font-weight: 700; font-size: 13px; line-height: 16px; }
      .status.success { color: #137333; background: #e8f5e9; }
      .status.warning { color: #9a4d00; background: #fff4df; }
      .status.failure { color: #b3261e; background: #fdecea; }
      .note { margin-top: 14px; padding: 10px 12px; border: 1px solid #f4d06f; background: #fff8e1; border-radius: 6px; }
      .image-page img { display: block; max-width: 100%; max-height: 235mm; width: auto; height: auto; margin: 0 auto; border: 1px solid #dadce0; }
      .caption { margin-bottom: 10px; color: #5f6368; }
      pre { white-space: pre-wrap; padding: 10px; border: 1px solid #e8eaed; background: #f8fafd; font-size: 10px; line-height: 15px; }
    </style>
  </head>
  <body>
    <section class="page">
      <p style="text-transform:uppercase;color:#5f6368;font-weight:700;">AUTHEON Visual Regression Report</p>
      <h1>${escapeHtml(model.classification.label)}</h1>
      <p class="status ${model.classification.kind}">${escapeHtml(model.classification.reason)}</p>
      ${
        model.classification.kind === 'warning'
          ? '<p class="note"><strong>Visual differences were detected, but CI execution succeeded.</strong></p>'
          : ''
      }
      <p class="note"><strong>Approved baselines were NOT automatically updated.</strong></p>
      ${renderPdfTable(metadataRows(model))}
      ${renderPdfTable([
        ['Host artifact directory', model.artifact.hostDir],
        ['Artifact archive', model.artifact.archivePath],
        ['CI artifact URL', model.artifact.artifactUrl],
      ])}
    </section>
    ${visualSections.join('')}
    ${failureSections.join('')}
  </body>
</html>`;
}

function renderPdfDifferenceInfo(diff) {
  return `<section class="page">
    <h2>Visual Difference #${diff.index}</h2>
    ${renderPdfTable([
      ['Snapshot', diff.snapshot],
      ['Classification', diff.classification],
      ['Spec file', diff.file],
      ['Complete test title', diff.title],
      ['Application area', diff.applicationArea],
      ['Route', diff.route],
      ['Browser/project', diff.browser],
      ['Viewport/image dimensions', diff.viewport],
      ['Changed pixels', formatNumber(diff.changedPixels)],
      ['Difference ratio', formatPercent(diff.changedRatio)],
      ['Raw changed pixels', formatNumber(diff.rawChangedPixels)],
      ['Raw ratio', formatPercent(diff.rawChangedRatio)],
      ['Changed region', formatBoundingBox(diff.changedRegion)],
      ['Relevant threshold', diff.threshold],
      ['Baseline modified', 'No. Automatic baseline updates are disabled.'],
      ['Expected path', diff.paths.expected],
      ['Actual path', diff.paths.actual],
      ['Diff path', diff.paths.diff],
    ])}
  </section>`;
}

async function renderPdfImagePage(diff, kind, title) {
  const image = diff.images[kind];
  const src = image.exists ? await imageDataUrl(image.path) : null;
  return `<section class="page image-page">
    <h2>${escapeHtml(title)}</h2>
    <p class="caption">${escapeHtml(diff.snapshot)} · ${escapeHtml(diff.title)}</p>
    ${
      src
        ? `<img src="${src}" alt="${escapeHtml(title)}">`
        : `<p>Image unavailable. Artifact reference: ${escapeHtml(image.workspacePath || 'n/a')}</p>`
    }
  </section>`;
}

function renderPdfFailures(failures) {
  return `<section class="page">
    <h2>Execution Failures / Missing Baselines</h2>
    ${failures
      .map(
        (failure) => `<h3>${escapeHtml(titleCase(failure.classification))} #${failure.index}</h3>
        ${renderPdfTable([
          ['Test', failure.title],
          ['Spec file', failure.file],
          ['Application area', failure.applicationArea],
          ['Browser/project', failure.browser],
          ['Screenshot availability', failure.screenshot ? failure.screenshot.path : 'Not available'],
          ['Trace availability', failure.trace ? failure.trace.path : 'Not available'],
          [
            'Trace command',
            failure.trace ? `npx playwright show-trace ${failure.trace.path}` : null,
          ],
          ['Video', failure.video ? failure.video.path : null],
          ['Error context', failure.errorContext ? failure.errorContext.path : null],
        ])}
        <pre>${escapeHtml(truncate(failure.message, 3500))}</pre>`,
      )
      .join('')}
  </section>`;
}

function renderPdfTable(rows) {
  const visibleRows = rows.filter(([, value]) => hasValue(value));
  if (visibleRows.length === 0) return '';

  return `<table>${visibleRows
    .map(
      ([label, value]) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('')}</table>`;
}

async function imageDataUrl(filePath) {
  const buffer = await fs.readFile(filePath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

async function createMissingSummaryFallback(error) {
  const classification = {
    kind: 'failure',
    label: 'FAILURE — EXECUTION ERROR',
    subjectStatus: 'CI failed',
    blocking: true,
    reason: 'Visual regression summary JSON was not available for notification.',
  };
  const html = `<!doctype html>
<html>
  <body style="font-family:Arial,Helvetica,sans-serif;">
    <h1>AUTHEON Visual Regression: ${escapeHtml(classification.label)}</h1>
    <p>${escapeHtml(classification.reason)}</p>
    <p><strong>Summary path:</strong> ${escapeHtml(summaryPath)}</p>
    <p><strong>Host artifact directory:</strong> ${escapeHtml(hostArtifactDir)}</p>
    <pre>${escapeHtml(error.message || String(error))}</pre>
  </body>
</html>`;
  const text = `AUTHEON Visual Regression: ${classification.label}

${classification.reason}
Summary path: ${summaryPath}
Host artifact directory: ${hostArtifactDir}
Error: ${error.message || String(error)}
`;

  await fs.mkdir(summaryDir, { recursive: true });
  const emailHtmlPath = path.join(summaryDir, 'notification-email.html');
  await fs.writeFile(emailHtmlPath, html, 'utf8');

  return {
    classification,
    reportArtifacts: {
      emailHtmlPath,
      pdfPath: null,
      pdfError: null,
    },
    email: {
      to: recipient,
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'visual-regression@localhost',
      subject: '[AUTHEON Visual Regression] ❌ CI failed — summary unavailable',
      text,
      html,
      attachments: [],
    },
  };
}

function metadataRows(model) {
  const metadata = model.metadata;
  return [
    ['Branch', metadata.branch],
    ['Commit SHA', metadata.commit],
    ['Run date/time', metadata.runTimestamp],
    ['Environment', metadata.environment],
    ['Browser/project', metadata.browser],
    ['Viewport/image dimensions', metadata.viewport],
    ['Total tests', formatNumber(metadata.totalTests)],
    ['Passed', formatNumber(metadata.passed)],
    ['Skipped', formatNumber(metadata.skipped)],
    ['Visual differences', formatNumber(metadata.visualDifferences)],
    ['Execution failures', formatNumber(metadata.executionFailures)],
    ['Missing baselines', formatNumber(metadata.missingBaselines)],
    ['Wrapper status', metadata.wrapperStatus],
    ['Playwright exit code', hasValue(metadata.playwrightExitCode) ? String(metadata.playwrightExitCode) : null],
    ['Strict visual mode', hasValue(metadata.strict) ? (metadata.strict ? 'yes' : 'no') : null],
    ['Platform', metadata.platform],
  ].filter(([, value]) => hasValue(value));
}

function inferBrowser(summaryJson, visualDifferences, executionFailures, missingBaselines) {
  const projects = new Set(
    [...visualDifferences, ...executionFailures, ...missingBaselines]
      .map((item) => item.browser)
      .filter(Boolean),
  );
  if (projects.size === 1) return [...projects][0];
  if (projects.size > 1) return [...projects].join(', ');

  const commandProject = summaryJson.command?.match(/--project(?:=|\s+)([^\s]+)/)?.[1];
  return commandProject || firstEnv(['VISUAL_REGRESSION_PROJECT']);
}

function inferViewport(visualDifferences) {
  const values = new Set(visualDifferences.map((diff) => diff.viewport).filter(Boolean));
  if (values.size === 1) return [...values][0];
  if (values.size > 1) return [...values].join(', ');
  return null;
}

function inferApplicationArea(record) {
  const haystack = `${record.title || ''} ${record.file || ''}`.toLowerCase();
  if (haystack.includes('admin')) return 'Admin Backend';
  if (haystack.includes('driver')) return 'Driver PWA';
  if (haystack.includes('prototype shell')) return 'Prototype Shell';
  return null;
}

function inferRoute(record) {
  const message = `${record.message || ''}\n${record.title || ''}`;
  const match = message.match(/\bhttps?:\/\/[^\s)]+/);
  return match ? match[0] : null;
}

function extractThreshold(message) {
  if (!message) return null;
  const patterns = [
    /maxDiffPixels[:\s]+([\d,]+)/i,
    /maxDiffPixelRatio[:\s]+([0-9.]+)/i,
    /threshold[:\s]+([0-9.]+)/i,
  ];
  const match = patterns.map((pattern) => message.match(pattern)).find(Boolean);
  return match ? match[0] : null;
}

function normalizeAttachments(attachments) {
  return attachments
    .filter((attachment) => attachment.path)
    .map((attachment) => ({
      name: attachment.name || path.basename(attachment.path),
      contentType: attachment.contentType || 'application/octet-stream',
      path: attachment.path,
      absolutePath: resolveRunPath(attachment.path),
      artifactPath: artifactPathFor(attachment.path),
    }));
}

function firstAttachment(attachments, predicate) {
  return attachments.find(predicate) || null;
}

function resolveRunPath(ref) {
  if (!ref) return null;
  const cleaned = String(ref).trim().replace(/^["']|["']$/g, '');
  const candidates = [];

  if (path.isAbsolute(cleaned)) {
    candidates.push(cleaned);
  } else {
    candidates.push(
      path.resolve(repoRoot, cleaned),
      path.resolve(artifactDir, cleaned),
      path.resolve(artifactDir, 'visual-regression-artifact', cleaned),
    );

    if (cleaned.startsWith('tests/regression/snapshots/')) {
      candidates.push(path.resolve(artifactDir, 'visual-regression-artifact', 'approved-baseline', cleaned));
    }
  }

  return candidates.find((candidate) => fsSync.existsSync(candidate)) || null;
}

function artifactPathFor(ref) {
  if (!ref) return null;
  const cleaned = String(ref).trim().replace(/^["']|["']$/g, '');
  if (path.isAbsolute(cleaned)) return cleaned;

  if (cleaned.startsWith('test-results/') || cleaned.startsWith('playwright-report/')) {
    return path.join(hostArtifactDir, 'visual-regression-artifact', cleaned);
  }

  if (cleaned.startsWith('tests/regression/snapshots/')) {
    return path.join(hostArtifactDir, 'visual-regression-artifact', 'approved-baseline', cleaned);
  }

  if (cleaned.startsWith('visual-regression-summary/')) {
    return path.join(hostArtifactDir, cleaned);
  }

  return path.join(hostArtifactDir, cleaned);
}

function hostSummaryPath(fileName) {
  return path.join(hostArtifactDir, 'visual-regression-summary', fileName);
}

function normalizeReportArtifacts(reportArtifacts) {
  if (!reportArtifacts) return null;
  return {
    emailHtmlPath: reportArtifacts.emailHtmlPath ? toWorkspacePath(reportArtifacts.emailHtmlPath) : null,
    pdfPath: reportArtifacts.pdfPath ? toWorkspacePath(reportArtifacts.pdfPath) : null,
    pdfError: reportArtifacts.pdfError,
  };
}

async function refreshExistingArtifactArchive(reportArtifacts) {
  const packageRoot = path.join(artifactDir, 'visual-regression-artifact');
  if (!fsSync.existsSync(packageRoot)) return;

  const packageSummaryDir = path.join(packageRoot, 'visual-regression-summary');
  await fs.mkdir(packageSummaryDir, { recursive: true });

  const reportFiles = [
    path.join(summaryDir, 'notification-email.json'),
    reportArtifacts.emailHtmlPath,
    reportArtifacts.pdfPath,
  ].filter((filePath) => filePath && fsSync.existsSync(filePath));

  for (const filePath of reportFiles) {
    await fs.copyFile(filePath, path.join(packageSummaryDir, path.basename(filePath)));
  }

  const archivePath = path.join(
    artifactDir,
    summary?.archiveName || 'autheon-visual-regression-artifact.tar.gz',
  );

  try {
    execFileSync('tar', ['-czf', archivePath, '-C', artifactDir, 'visual-regression-artifact'], {
      cwd: repoRoot,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    reportArtifacts.archiveUpdated = true;
    reportArtifacts.archiveSha256 = await sha256File(archivePath);
    console.log(
      `[visual-regression-notify] Artifact archive refreshed with notification report files: ${toWorkspacePath(
        archivePath,
      )}`,
    );
    console.log(`[visual-regression-notify] Refreshed archive SHA-256: ${reportArtifacts.archiveSha256}`);
  } catch (error) {
    console.warn(
      `[visual-regression-notify] Existing artifact archive was not refreshed: ${
        error.message || String(error)
      }`,
    );
  }
}

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const data = await fs.readFile(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function gitMetadata(kind) {
  const env =
    kind === 'branch'
      ? firstEnv(['GITHUB_HEAD_REF', 'GITHUB_REF_NAME', 'BRANCH_NAME', 'GIT_BRANCH'])
      : firstEnv(['GITHUB_SHA', 'GIT_COMMIT']);
  if (env) return env;

  try {
    return execFileSync('git', kind === 'branch' ? ['rev-parse', '--abbrev-ref', 'HEAD'] : ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function firstEnv(names) {
  return names.map((name) => process.env[name]).find((value) => hasValue(value)) || null;
}

function requiredSmtpVars() {
  return ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
}

function snapshotNameFromPath(filePath) {
  if (!filePath) return null;
  return path.basename(filePath).replace(/-(actual|expected|diff)\.png$/i, '.png');
}

function formatDimensions(dimensions) {
  if (!dimensions) return null;
  if (typeof dimensions === 'string') return dimensions;
  if (dimensions.expected === dimensions.actual) return dimensions.expected;
  return `expected ${dimensions.expected}, actual ${dimensions.actual}`;
}

function formatNumber(value) {
  return typeof value === 'number' ? new Intl.NumberFormat('en-US').format(value) : 'n/a';
}

function formatPercent(value) {
  if (typeof value !== 'number') return 'n/a';
  return `${(value * 100).toFixed(value * 100 >= 10 ? 1 : 2)}%`;
}

function formatBoundingBox(box) {
  if (!box) return 'n/a';
  return `x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function firstLine(message) {
  return String(message || '').split('\n').find(Boolean) || 'No message available.';
}

function truncate(value, maxLength) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n... truncated ...` : text;
}

function plural(count, singular, pluralValue) {
  return count === 1 ? singular : pluralValue;
}

function titleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function codeHtml(value) {
  return `<code style="font-family:Menlo,Consolas,monospace;font-size:12px;background:#f1f3f4;border-radius:4px;padding:1px 4px;">${escapeHtml(
    value,
  )}</code>`;
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function toWorkspacePath(filePath) {
  if (!filePath) return null;
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(repoRoot, filePath);
  const relative = path.relative(repoRoot, absolute).split(path.sep).join('/');
  return relative.startsWith('..') ? filePath : relative;
}
