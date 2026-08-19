#!/usr/bin/env node
/**
 * Notification smoke check.
 *
 *   node scripts/visual-regression-notify-check.mjs            Verify + send a test message
 *   node scripts/visual-regression-notify-check.mjs --verify-only   Connect, do not send
 *   node scripts/visual-regression-notify-check.mjs --dry-run       Neither connect nor send
 *
 * Validates the SMTP configuration end to end without running the visual suite.
 * Builds a tiny synthetic report so the message is representative of a real
 * notification, but nothing here touches baselines, screenshots, or the gate.
 *
 * Never prints a secret value. Missing configuration is reported by variable
 * NAME; delivery failures are reported by classified cause.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { config as loadDotenv } from 'dotenv';

import {
  NOTIFICATION_DEFAULTS,
  classifySmtpError,
  notificationSetting,
  setInEnvironment,
  smtpPreflight,
  smtpTransportOptions,
} from './lib/smtp-preflight.mjs';
import { APPROVED_PLATFORM, playwrightVersion, verifyBaselines } from './lib/visual-baseline.mjs';

const repoRoot = process.cwd();

for (const fileName of ['.env.testing', '.env.e2e', '.env']) {
  loadDotenv({ path: path.join(repoRoot, fileName), override: false });
}

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/visual-regression-notify-check.mjs [--verify-only] [--dry-run]

  (default)      Verify the SMTP connection AND send a clearly-labeled test message.
  --verify-only  Verify connection and credentials; do not send anything.
  --dry-run      Report configuration only; make no network connection.

Environment: the same variables the real notifier uses. See
tests/docs/visual-regression-notifications.md.
`);
  process.exit(0);
}

const verifyOnly = args.includes('--verify-only');
const dryRun = args.includes('--dry-run');
const outDir = path.join(
  process.env.VISUAL_REGRESSION_ARTIFACT_DIR || path.join(repoRoot, 'visual-regression-artifacts'),
  'notification-check',
);

console.log('[notify-check] AUTHEON visual regression notification check');
console.log(`[notify-check] Mode: ${dryRun ? 'dry-run' : verifyOnly ? 'verify-only' : 'verify-and-send'}`);

const preflight = smtpPreflight({ dryRun });

console.log(`[notify-check] Secret availability context: ${preflight.availability.reason}`);
if (preflight.availability.explanation) {
  console.log(`[notify-check] ${preflight.availability.explanation}`);
}

// Resolved configuration. Non-secret values are shown, because they are
// committed defaults in this repository and seeing the actual mailbox is the
// point of the check. SMTP_PASSWORD is reported by presence only.
console.log('[notify-check] Resolved configuration:');
for (const name of Object.keys(NOTIFICATION_DEFAULTS)) {
  const source = setInEnvironment(name) ? 'env     ' : 'default ';
  console.log(`[notify-check]   ${source} ${name.padEnd(30)} ${notificationSetting(name)}`);
}
console.log(
  `[notify-check]   ${setInEnvironment('SMTP_PASSWORD') ? 'secret   SMTP_PASSWORD' : 'MISSING  SMTP_PASSWORD'}${
    setInEnvironment('SMTP_PASSWORD') ? '                  (set; value not shown)' : '                  <- the only required secret'
  }`,
);

console.log(
  `[notify-check] Transport: ${preflight.config.user} via ${preflight.config.host}:${preflight.config.port} ` +
    `(secure ${preflight.config.secure}) -> ${preflight.config.recipients.join(', ')}`,
);

for (const problem of preflight.problems) {
  console.warn(`[notify-check] CONFIG PROBLEM: ${problem}`);
}

const report = {
  checkedAt: new Date().toISOString(),
  mode: dryRun ? 'dry-run' : verifyOnly ? 'verify-only' : 'verify-and-send',
  status: preflight.status,
  failureKind: preflight.failureKind,
  missingVariables: preflight.missingVariables,
  problems: preflight.problems,
  context: preflight.availability,
  config: preflight.config,
  connectionVerified: false,
  messageSent: false,
  message: preflight.message,
};

if (dryRun) {
  await writeReport(report);
  console.log(`[notify-check] ${preflight.message}`);
  process.exit(0);
}

if (!preflight.ok) {
  await writeReport(report);
  console.error(`[notify-check] FAILED: ${preflight.message}`);
  process.exit(1);
}

let transporter;
try {
  transporter = nodemailer.createTransport(smtpTransportOptions(preflight));
} catch (error) {
  report.status = 'failed';
  report.failureKind = 'transport-wiring';
  report.message = error.message;
  await writeReport(report);
  console.error(`[notify-check] FAILED (transport-wiring): ${error.message}`);
  process.exit(1);
}

try {
  await transporter.verify();
  report.connectionVerified = true;
  console.log('[notify-check] SMTP connection and credentials verified.');
} catch (error) {
  const classified = classifySmtpError(error);
  report.status = 'failed';
  report.failureKind = classified.failureKind;
  report.message = classified.message;
  await writeReport(report);
  console.error(`[notify-check] FAILED (${classified.failureKind}): ${classified.message}`);
  process.exit(1);
}

if (verifyOnly) {
  report.status = 'verified';
  report.message = 'Connection and credentials verified; no message sent (--verify-only).';
  await writeReport(report);
  console.log(`[notify-check] ${report.message}`);
  process.exit(0);
}

// Small synthetic report so the message looks like a real notification without
// running the suite. Baseline state is read live, because "are my baselines
// even present?" is the other thing a maintainer wants confirmed at setup time.
const baseline = await verifyBaselines({ platform: APPROVED_PLATFORM }).catch(() => null);

const context = {
  repository: process.env.GITHUB_REPOSITORY || 'local checkout',
  workflow: process.env.GITHUB_WORKFLOW || 'Visual Regression Notification Check',
  runNumber: process.env.GITHUB_RUN_NUMBER || 'n/a',
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || 'n/a',
  event: process.env.GITHUB_EVENT_NAME || 'manual',
  branch: process.env.GITHUB_REF_NAME || 'n/a',
  actor: process.env.GITHUB_ACTOR || 'n/a',
  runUrl: process.env.REGRESSION_ARTIFACT_URL || 'n/a',
  playwright: playwrightVersion() || 'n/a',
  approvedPlatform: APPROVED_PLATFORM,
  baselineCount: baseline?.foundCount ?? 'unknown',
  baselineVerified: baseline?.verifiedCount ?? 'unknown',
  baselineRevision: baseline?.baselineRevision ?? 'unknown',
  manifestPresent: baseline?.manifestPresent ? 'yes' : 'no',
};

const rows = Object.entries(context)
  .map(([key, value]) => `  ${key.padEnd(20)} ${value}`)
  .join('\n');

const email = {
  to: notificationSetting('REGRESSION_NOTIFICATION_EMAIL'),
  from: notificationSetting('SMTP_FROM') || notificationSetting('SMTP_USER'),
  subject: '[AUTHEON Visual Regression] Notification check — configuration OK',
  text: `This is a TEST message from the AUTHEON visual regression notification check.

No regression run happened. Nothing failed. If you received this, SMTP delivery
for visual regression notifications is working.

Context
${rows}

Approved baseline state is included so setup can be confirmed in one message:
a baseline count of 0 means CI would block on the missing-baseline preflight
even though email is now working.

Sent by scripts/visual-regression-notify-check.mjs
`,
  html: `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;">
  <h2 style="margin:0 0 4px;">AUTHEON Visual Regression — Notification Check</h2>
  <p style="margin:0 0 16px;color:#555;">This is a <strong>test message</strong>. No regression run happened and nothing failed.</p>
  <p>If you received this, SMTP delivery for visual regression notifications is working.</p>
  <table cellpadding="6" cellspacing="0" border="0" style="border-collapse:collapse;font-size:14px;">
    ${Object.entries(context)
      .map(
        ([key, value]) =>
          `<tr><td style="border-bottom:1px solid #eee;color:#666;">${key}</td><td style="border-bottom:1px solid #eee;"><code>${String(value)}</code></td></tr>`,
      )
      .join('')}
  </table>
  <p style="margin-top:16px;color:#555;font-size:13px;">
    Approved baseline state is included so setup can be confirmed in one message: a baseline count of
    <code>0</code> means CI would still block on the missing-baseline preflight even though email now works.
  </p>
  <p style="color:#888;font-size:12px;">Sent by <code>scripts/visual-regression-notify-check.mjs</code></p>
</body></html>`,
};

try {
  const sent = await transporter.sendMail(email);
  report.status = 'delivered';
  report.messageSent = true;
  report.message = `Test message delivered (id ${sent.messageId || 'unknown'}).`;
  await writeReport(report);
  console.log(`[notify-check] ${report.message}`);
  process.exit(0);
} catch (error) {
  const classified = classifySmtpError(error);
  report.status = 'failed';
  report.failureKind = classified.failureKind;
  report.message = classified.message;
  await writeReport(report);
  console.error(`[notify-check] FAILED (${classified.failureKind}): ${classified.message}`);
  process.exit(1);
}

async function writeReport(value) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, 'notification-check.json'),
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8',
  );
  console.log(`[notify-check] Report written to ${path.relative(repoRoot, outDir)}/notification-check.json`);
}
