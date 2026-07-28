/**
 * SMTP configuration preflight and failure classification.
 *
 * Two jobs:
 *   1. Answer "can we even attempt delivery?" without ever printing the password.
 *   2. Turn whatever nodemailer throws into a named cause, so "email didn't
 *      arrive" stops being one undifferentiated mystery.
 *
 * Configuration model (repository owner's decision)
 * -------------------------------------------------
 * `SMTP_PASSWORD` is the ONLY value kept in GitHub Secrets. The transport host,
 * the sending account, the sender, the recipient, the port, and the TLS mode are
 * committed defaults below. They are routing configuration for a dedicated CI
 * mailbox, not credentials, and keeping them in one place in the repository means
 * the scripts, the workflows, and the docs cannot drift apart — and a run log
 * shows exactly which mailbox was used.
 *
 * An environment variable still wins over every default, so a local `.env`, a
 * repository variable, or a one-off override all work unchanged.
 *
 * The password is never defaulted, never logged, and never returned by this
 * module. Presence checks report variable NAMES only.
 */

/**
 * Committed non-secret defaults.
 *
 * Change these here, not in the workflows: the workflows read the environment
 * and the environment falls through to these.
 */
export const NOTIFICATION_DEFAULTS = {
  SMTP_HOST: 'smtppro.zoho.eu',
  SMTP_PORT: '465',
  SMTP_SECURE: 'true',
  SMTP_USER: 'youssef.elkondakly@calibtos.com',
  SMTP_FROM: 'youssef.elkondakly@calibtos.com',
  REGRESSION_NOTIFICATION_EMAIL: 'calibtos.services@gmail.com',
};

/** The only value that must come from a secret. */
export const REQUIRED_SECRETS = ['SMTP_PASSWORD'];

/** Everything else resolves from the environment or the committed defaults. */
export const DEFAULTED_CONFIG = Object.keys(NOTIFICATION_DEFAULTS);

const EMAIL_SHAPE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/**
 * Resolve a notification setting: environment first, committed default second.
 *
 * Never used for SMTP_PASSWORD — a defaulted password would be a real problem,
 * so it is read directly from the environment everywhere.
 */
export function notificationSetting(name) {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return NOTIFICATION_DEFAULTS[name] ?? '';
}

/** True when a value is set in the environment (ignoring defaults). */
export function setInEnvironment(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() !== '';
}

function present(name) {
  return setInEnvironment(name) || Boolean(NOTIFICATION_DEFAULTS[name]);
}

/**
 * Is this run in a context where GitHub deliberately withholds secrets?
 *
 * Distinguishing this from "the secrets were never created" matters: one is a
 * setup task for the repository owner, the other is expected platform behavior
 * that no amount of configuration will change.
 */
export function secretAvailabilityContext() {
  const event = process.env.GITHUB_EVENT_NAME || null;
  const repository = process.env.GITHUB_REPOSITORY || null;
  const headRepository = process.env.GITHUB_HEAD_REPOSITORY || null;
  const actor = process.env.GITHUB_ACTOR || null;
  const isForkPr = process.env.IS_FORK_PR === 'true'
    || Boolean(event === 'pull_request' && headRepository && repository && headRepository !== repository);
  const isDependabot = actor === 'dependabot[bot]'
    || (process.env.GITHUB_REF || '').startsWith('refs/heads/dependabot/');

  if (isForkPr) {
    return {
      secretsExpected: false,
      reason: 'fork-pull-request',
      explanation:
        'This run is a pull request from a fork. GitHub withholds repository secrets from fork PRs by design, so SMTP variables are empty no matter how they are configured. This is not a misconfiguration. Fork PR email requires the fork-safe two-workflow architecture (see tests/docs/visual-regression-notifications.md).',
    };
  }

  if (isDependabot) {
    return {
      secretsExpected: false,
      reason: 'dependabot',
      explanation:
        'Dependabot runs receive Dependabot secrets, not Actions secrets. Repository Actions secrets are unavailable here by design.',
    };
  }

  return { secretsExpected: true, reason: 'trusted-context', explanation: null };
}

/**
 * Validate SMTP configuration.
 *
 * Returns `{ ok, status, failureKind, missingVariables, problems, config }`.
 * `config` carries only non-sensitive, derived values (port number, secure flag,
 * whether a sender is set) — never a host, user, or password.
 */
export function smtpPreflight({ dryRun = false } = {}) {
  const availability = secretAvailabilityContext();
  const missingSecrets = REQUIRED_SECRETS.filter((name) => !setInEnvironment(name));
  const problems = [];

  const rawPort = notificationSetting('SMTP_PORT');
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    problems.push(`SMTP_PORT must be an integer between 1 and 65535 (received "${rawPort}").`);
  }

  const rawSecure = notificationSetting('SMTP_SECURE').toLowerCase();
  const secureAllowed = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
  if (!secureAllowed.includes(rawSecure)) {
    problems.push(`SMTP_SECURE must be true or false (received "${rawSecure}").`);
  }
  const secure = ['1', 'true', 'yes', 'on'].includes(rawSecure);

  const host = notificationSetting('SMTP_HOST');
  const user = notificationSetting('SMTP_USER');
  const sender = notificationSetting('SMTP_FROM') || user;

  if (!host) problems.push('SMTP_HOST resolved to an empty value.');
  if (!user) problems.push('SMTP_USER resolved to an empty value.');

  if (sender && !EMAIL_SHAPE.test(extractAddress(sender))) {
    problems.push(
      `SMTP_FROM "${sender}" is not an email address or a "Name <address>" pair.`,
    );
  }

  const recipients = notificationSetting('REGRESSION_NOTIFICATION_EMAIL')
    .split(/[,;]/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    problems.push('REGRESSION_NOTIFICATION_EMAIL resolved to no recipients.');
  }

  for (const recipient of recipients) {
    if (!EMAIL_SHAPE.test(extractAddress(recipient))) {
      problems.push(`REGRESSION_NOTIFICATION_EMAIL entry "${recipient}" is not a valid email address.`);
      break;
    }
  }

  // Implicit-TLS on 587 (or STARTTLS on 465) is the single most common cause of
  // a silent connection hang, so name it explicitly rather than letting it
  // surface later as an opaque timeout.
  if (secure && port === 587) {
    problems.push(
      'SMTP_SECURE=true with SMTP_PORT=587 is almost always wrong: 587 expects STARTTLS (SMTP_SECURE=false), 465 expects implicit TLS (SMTP_SECURE=true).',
    );
  }
  if (!secure && port === 465) {
    problems.push(
      'SMTP_SECURE=false with SMTP_PORT=465 is almost always wrong: 465 expects implicit TLS (SMTP_SECURE=true).',
    );
  }

  const missingVariables = [...missingSecrets];

  if (dryRun) {
    return {
      ok: true,
      status: 'dry-run',
      failureKind: null,
      missingVariables,
      problems,
      availability,
      config: { host, user, sender, port, secure, recipients, recipientCount: recipients.length },
      message:
        'REGRESSION_NOTIFICATION_DRY_RUN is set: the email payload is written to the artifact and no SMTP connection is attempted.',
    };
  }

  if (missingVariables.length > 0) {
    return {
      ok: false,
      status: 'not-configured',
      failureKind: availability.secretsExpected ? 'config-missing' : 'secrets-unavailable-by-design',
      missingVariables,
      problems,
      availability,
      config: { host, user, sender, port, secure, recipients, recipientCount: recipients.length },
      message: availability.secretsExpected
        ? `Email not sent. Missing required secret(s): ${missingVariables.join(', ')}. ` +
          'SMTP_PASSWORD is the only value not committed as a default — set it as a repository secret ' +
          '(see tests/docs/visual-regression-notifications.md), or set REGRESSION_NOTIFICATION_DRY_RUN=true ' +
          'to validate the notification path without SMTP.'
        : `Email not sent: ${availability.explanation}`,
    };
  }

  if (problems.length > 0) {
    return {
      ok: false,
      status: 'not-configured',
      failureKind: 'config-invalid',
      missingVariables,
      problems,
      availability,
      config: { host, user, sender, port, secure, recipients, recipientCount: recipients.length },
      message: `Email not sent. SMTP configuration is invalid: ${problems.join(' ')}`,
    };
  }

  return {
    ok: true,
    status: 'configured',
    failureKind: null,
    missingVariables: [],
    problems: [],
    availability,
    config: { port, secure, senderConfigured: Boolean(sender), recipientCount: recipients.length },
    message: `SMTP configuration is complete: ${user} via ${host}:${port} (secure ${secure}) -> ${recipients.join(', ')}.`,
  };
}

/**
 * Classify a delivery failure into a named cause.
 *
 * "Email failed" is not actionable. "TLS handshake failed" and "credentials
 * rejected" lead to different fixes, and the error text is where the difference
 * lives. The returned message never includes the error's own text verbatim if it
 * could contain a credential, so only the code and a generic reason are used.
 */
export function classifySmtpError(error) {
  const code = error?.code || error?.errno || null;
  const responseCode = error?.responseCode || null;
  const text = String(error?.message || '');

  if (responseCode === 535 || responseCode === 534 || responseCode === 530 || code === 'EAUTH') {
    return {
      failureKind: 'auth-rejected',
      message:
        'The SMTP server rejected the credentials. Rotate SMTP_USER / SMTP_PASSWORD. ' +
        'Providers that enforce 2FA usually need an app-specific password rather than the account password.',
    };
  }

  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'EHOSTUNREACH' || code === 'ENOTFOUND' || code === 'EDNS' || code === 'ECONNECTION') {
    return {
      failureKind: 'network-failure',
      message:
        `Could not reach the SMTP server (${code}). Check SMTP_HOST and SMTP_PORT, and whether the runner's egress allows that port. ` +
        'GitHub-hosted runners can reach 587 and 465; some corporate relays are reachable only from self-hosted runners.',
    };
  }

  if (
    code === 'ESOCKET' ||
    code === 'EPROTO' ||
    /wrong version number|SSL routines|self.signed|certificate|TLS/i.test(text)
  ) {
    return {
      failureKind: 'tls-failure',
      message:
        'TLS negotiation with the SMTP server failed. This is nearly always a SMTP_SECURE/SMTP_PORT mismatch: ' +
        'use SMTP_SECURE=false with port 587 (STARTTLS) or SMTP_SECURE=true with port 465 (implicit TLS).',
    };
  }

  if (code === 'EMESSAGE' || responseCode === 552 || responseCode === 554 || /message.*(size|too large)/i.test(text)) {
    return {
      failureKind: 'attachment-too-large',
      message:
        'The server rejected the message, most likely for size. Reduce attachments: the PDF report and summary.json are attached by default, ' +
        'and the tar.gz archive only when REGRESSION_ATTACH_ARCHIVE=true. Link the GitHub artifact instead.',
    };
  }

  if (responseCode === 550 || responseCode === 553) {
    return {
      failureKind: 'recipient-rejected',
      message:
        'The server rejected a recipient or sender address. Check REGRESSION_NOTIFICATION_EMAIL and SMTP_FROM, ' +
        'and whether the relay permits that envelope sender.',
    };
  }

  return {
    failureKind: 'send-failed',
    message: `SMTP delivery failed${code ? ` (${code})` : ''}${responseCode ? ` with response code ${responseCode}` : ''}.`,
  };
}

function extractAddress(value) {
  const match = String(value).match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}
