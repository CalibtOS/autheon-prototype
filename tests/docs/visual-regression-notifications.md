# Visual Regression Email Notifications — Setup Guide

Audience: the repository administrator for `CalibtOS/autheon-prototype`.

This document is the complete configuration procedure for visual regression
email notifications. Every value below is a **placeholder**. No real credential
appears in this repository, and none should ever be added to it.

---

## 1. What you are configuring

The visual regression pipeline sends one email per run that has something worth
reporting: visual differences, missing baselines, execution failures,
infrastructure failures, or a report-generation failure with a usable fallback.
A clean run sends nothing unless success notifications are explicitly enabled.

Delivery is **non-blocking by design**. A mail outage never changes the
regression verdict — a broken SMTP server must not turn a non-blocking visual
warning into a failed build, and it must not mask a real blocking failure
either. The notification outcome is reported separately in
`summary.json → notification` and as a workflow annotation.

---

## 2. Required GitHub configuration

### Secrets — `Settings → Secrets and variables → Actions → Secrets`

| Secret name | Purpose | Example placeholder |
| --- | --- | --- |
| `SMTP_HOST` | SMTP server hostname | `smtp.example.com` |
| `SMTP_USER` | SMTP account / login | `visual-regression@example.com` |
| `SMTP_PASSWORD` | SMTP password or app password | *(never write this on a command line)* |
| `SMTP_FROM` | Envelope sender. Falls back to `SMTP_USER` | `AUTHEON CI <ci@example.com>` |
| `REGRESSION_NOTIFICATION_EMAIL` | Recipient(s), comma-separated | `qa@example.com,lead@example.com` |

### Variables — `Settings → Secrets and variables → Actions → Variables`

Transport settings are **not secret**, and keeping them as variables means their
values are visible in the run log, where a wrong port is obvious instead of
invisible.

| Variable name | Purpose | Default if unset |
| --- | --- | --- |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | `true` = implicit TLS (port 465), `false` = STARTTLS (port 587) | `false` |
| `VISUAL_REGRESSION_STRICT` | `true` makes visual differences blocking on every run | `false` |

> **Port and TLS must agree.** `587` + `SMTP_SECURE=false` (STARTTLS) or `465` +
> `SMTP_SECURE=true` (implicit TLS). The preflight rejects the two wrong
> combinations explicitly, because a mismatch otherwise surfaces much later as an
> opaque connection timeout.

---

## 3. Method A — GitHub web interface

1. Open the repository on GitHub.
2. Click **Settings** (repository settings, not your account settings).
3. In the left sidebar, expand **Secrets and variables**.
4. Click **Actions**.

**To add each secret:**

5. Stay on the **Secrets** tab.
6. Click **New repository secret**.
7. Enter the exact name from the table in section 2. Names are
   case-sensitive; `Smtp_Host` is a different secret from `SMTP_HOST`.
8. Paste the value into **Secret**.
9. Click **Add secret**.
10. Repeat for all five secrets.

**To add each variable:**

11. Switch to the **Variables** tab.
12. Click **New repository variable**.
13. Enter the name and value from the variables table.
14. Click **Add variable**.

### Values cannot be read back

Once saved, a secret's value is never displayed again — not to you, not to an
administrator, not in a log. The UI shows only the name and the last-updated
date. If you need to know a value, you must look it up in your password manager
or your mail provider, not in GitHub.

### Replacing or rotating a secret

1. **Settings → Secrets and variables → Actions**.
2. Find the secret in the list.
3. Click the pencil / **Update** icon next to it.
4. Enter the new value and save. The name and every workflow reference stay
   unchanged; the next run picks up the new value automatically.

Rotate `SMTP_PASSWORD` whenever someone with access leaves, and immediately if a
value was ever pasted somewhere shared. Rotation is a value change only — no
workflow edit is needed.

### Verifying names without exposing values

Two safe ways:

- The secrets list page shows every name. Compare it against section 2
  character by character.
- Run the **Visual Regression Notification Check** workflow (section 5). It
  prints a `SET` / `MISSING` table by variable **name** and never prints a
  value, not even partially masked.

---

## 4. Method B — GitHub CLI

Requires `gh auth login` with admin access to the repository.

```bash
REPO=CalibtOS/autheon-prototype
```

### Set secrets — interactive, no value on the command line

`gh secret set NAME` with no `--body` prompts for the value and reads it without
echoing it. Prefer this always: a value passed as an argument lands in your shell
history, in `ps` output, and possibly in a terminal scrollback that gets shared.

```bash
gh secret set SMTP_HOST                     --repo "$REPO"
gh secret set SMTP_USER                     --repo "$REPO"
gh secret set SMTP_PASSWORD                 --repo "$REPO"
gh secret set SMTP_FROM                     --repo "$REPO"
gh secret set REGRESSION_NOTIFICATION_EMAIL --repo "$REPO"
```

### Set a secret from a protected local file or stdin

For scripted setup, read from a file with restrictive permissions, or from
stdin. Note the leading space in the `printf` line: in `bash` and `zsh` with
`HIST_IGNORE_SPACE` / `HISTCONTROL=ignorespace`, a leading space keeps the
command out of history.

```bash
# From a file only you can read.
umask 077
printf '%s' 'PLACEHOLDER_PASSWORD' > ./smtp-password.txt
gh secret set SMTP_PASSWORD --repo "$REPO" < ./smtp-password.txt
shred -u ./smtp-password.txt 2>/dev/null || rm -P ./smtp-password.txt

# Or from stdin, prompted by your password manager.
 gh secret set SMTP_PASSWORD --repo "$REPO" < <(pass show autheon/smtp-password)
```

Never do this:

```bash
# WRONG: the password is now in shell history, in ps output, and in any log.
gh secret set SMTP_PASSWORD --body 'realpassword' --repo "$REPO"
```

### Set variables

```bash
gh variable set SMTP_PORT                --body '587'   --repo "$REPO"
gh variable set SMTP_SECURE              --body 'false' --repo "$REPO"
gh variable set VISUAL_REGRESSION_STRICT --body 'false' --repo "$REPO"
```

### List names to verify (values are never returned)

```bash
gh secret list   --repo "$REPO"
gh variable list --repo "$REPO"
```

Expected secret names: `REGRESSION_NOTIFICATION_EMAIL`, `SMTP_FROM`,
`SMTP_HOST`, `SMTP_PASSWORD`, `SMTP_USER`.

---

## 5. Verifying the configuration

Run the **Visual Regression Notification Check** workflow
(`Actions → Visual Regression Notification Check → Run workflow`). It does not
run the visual suite.

| Mode | What it does |
| --- | --- |
| `dry-run` | Reports which variables are present, by name. No network connection. |
| `verify-only` | Connects and authenticates. Sends nothing. **Start here.** |
| `send` | Connects and sends one clearly-labeled test message. |

Locally, the same check:

```bash
npm run test:regression:notify-check              # verify-only
node scripts/visual-regression-notify-check.mjs --dry-run
node scripts/visual-regression-notify-check.mjs   # verify and send
```

The test message includes the approved-baseline count on purpose: email working
while the baseline set is empty still means CI blocks on the missing-baseline
preflight, and it is better to learn both facts from one message.

---

## 6. When the variables look empty

An empty SMTP variable has more than one cause. The preflight distinguishes them
rather than guessing, because the fixes are different:

| Reported cause | Meaning | Fix |
| --- | --- | --- |
| `config-missing` | The secrets do not exist, or a name does not match exactly | Add them per section 3 or 4. Check for case and typos. |
| `config-invalid` | Present but malformed — bad port, bad `SMTP_SECURE`, bad address, or a port/TLS mismatch | Correct the value. The specific problem is named in the log. |
| `secrets-unavailable-by-design` / `fork-pull-request` | A pull request from a fork. GitHub withholds repository secrets from fork PRs | Nothing to fix. See section 7. |
| `secrets-unavailable-by-design` / `dependabot` | A Dependabot run. Those receive Dependabot secrets, not Actions secrets | Add the values under **Dependabot secrets** only if Dependabot runs need email. |
| `auth-rejected` | The server refused the credentials | Rotate `SMTP_USER` / `SMTP_PASSWORD`. Providers enforcing 2FA usually require an app-specific password. |
| `network-failure` | The server was unreachable | Check `SMTP_HOST` / `SMTP_PORT` and whether the runner's egress permits that port. |
| `tls-failure` | TLS negotiation failed | Almost always a `SMTP_SECURE` / `SMTP_PORT` mismatch. See section 2. |
| `attachment-too-large` | The message was rejected, most likely for size | Unset `REGRESSION_ATTACH_ARCHIVE`. Large evidence is linked, not attached. |
| `recipient-rejected` | A sender or recipient address was refused | Check `REGRESSION_NOTIFICATION_EMAIL` and `SMTP_FROM`, and whether the relay allows that envelope sender. |

Other causes worth ruling out if the table above does not explain it:

- **Organization secrets not authorized for this repository.** An org-level
  secret with a repository access policy that excludes this repo resolves to
  empty. Check `Organization Settings → Secrets and variables → Actions` and the
  secret's repository access list.
- **Environment secrets without a declared environment.** A secret stored on a
  GitHub *environment* is only available to a job that declares
  `environment: <name>`. The visual regression job declares no environment, so
  it reads **repository** secrets only. Either move the secrets to repository
  scope, or add `environment:` to the job.
- **Reusable workflow without `secrets:`.** A called workflow receives nothing
  unless the caller passes `secrets: inherit` or names them explicitly. The
  visual regression workflows are not reusable workflows, so this does not
  currently apply.
- **A malformed expression.** `${{ secrets.SMTP-HOST }}` (hyphen) or
  `${{ secret.SMTP_HOST }}` (singular) resolve to empty without erroring.
  `${{ vars.SMTP_HOST }}` resolves to empty when the value is a *secret*.

### What the original failing run actually showed

In run `30024613183` the workflow correctly referenced `secrets.SMTP_HOST` and
friends, on a **same-repository** pull request, in a job that declares no
environment. The expressions were well formed. The values were empty because
**the repository secrets had never been created.** Section 3 or 4 is the whole
fix. Nothing in the workflow syntax needed to change for email to start working.

---

## 7. Fork and untrusted pull requests

**Chosen strategy: A — same-repository trusted branches.**

- The `pull_request` workflow runs with repository secrets for branches in this
  repository.
- For a pull request opened **from a fork**, GitHub withholds the secrets. The
  regression still runs, still produces the full artifact, still classifies, and
  still gates. Only the email is skipped, with a precise annotation saying the
  cause is the fork context rather than a misconfiguration.

Why A: this is a private prototype repository developed on branches inside the
organization. Every pull request in its history is same-repository. Strategy B
adds a second workflow, an artifact trust boundary, and an untrusted-input
parser to serve a case that does not currently occur.

**What was deliberately not done:** the workflow was not switched to
`pull_request_target`. `pull_request_target` runs the *base branch's* workflow
with full secrets, and checking out and executing the PR head under it hands
repository secrets to untrusted code. That is a credential-exfiltration path, and
it is the wrong fix for a missing-email problem.

### If fork PRs are ever needed — Strategy B

Two workflows, in this order:

1. **Workflow 1** (`pull_request`) — runs the regression against PR code with
   **no** SMTP secrets in its environment. Produces the sanitized
   `summary.json`, report, and artifacts. Sends nothing.
2. **Workflow 2** (`workflow_run`, `types: [completed]`) — runs from the
   **trusted base branch's** workflow definition, so the PR cannot modify it.
   It downloads workflow 1's artifact and sends the email using repository
   secrets.

Non-negotiable rules for workflow 2:

- Never execute a script, binary, or `package.json` lifecycle hook from the
  downloaded artifact. Read data only.
- Treat every field in the downloaded JSON as untrusted input: validate the
  schema, bound string lengths, and escape before interpolating into HTML or a
  shell command.
- Never extract to a path derived from artifact content. Reject entries
  containing `..` or an absolute path.
- Do not check out or run the PR head.
- Grant `permissions: contents: read` and nothing more.

---

## 8. Never store credentials in

- Workflow YAML
- `package.json`
- Committed `.env` files
- Test fixtures
- Documentation examples (this file contains placeholders only)
- Git history — a value committed once stays in history after deletion and must
  be treated as compromised and rotated

`.env` is listed in `.gitignore` and in `.dockerignore`, so a local `.env` is
neither committed nor baked into the Docker image. See `.env.example` for the
variable names with placeholder descriptions.

---

## 9. Local runs

For local development, put the values in `.env` (gitignored) and use dry-run so
nothing is delivered while you iterate:

```bash
cp .env.example .env
# fill in .env, then:
REGRESSION_NOTIFICATION_DRY_RUN=true npm run test:regression:ci
```

Dry-run writes the full email payload to
`visual-regression-artifacts/docker-ci/visual-regression-summary/notification-email.json`
and `notification-email.html` without opening an SMTP connection.

### Optional behavior

| Variable | Effect | Default |
| --- | --- | --- |
| `REGRESSION_NOTIFICATION_DRY_RUN` | Write the payload, do not send | unset |
| `REGRESSION_NOTIFY_ON_SUCCESS` | Also email on clean passing runs | unset |
| `REGRESSION_NOTIFICATION_REQUIRED` | Make a delivery failure fail the pipeline | unset |
| `REGRESSION_ATTACH_ARCHIVE` | Attach the tar.gz when under the size limit | unset |
| `REGRESSION_ARCHIVE_ATTACHMENT_MAX_MB` | Archive attachment size limit | `10` |
| `REGRESSION_SUMMARY_ATTACHMENT_MAX_KB` | `summary.json` attachment size limit | `512` |

---

## 10. What the email contains

**Subject** — classification first, then count, then scope:

```
[AUTHEON Visual Regression] BLOCKED — Missing baselines (3) — PR #123
[AUTHEON Visual Regression] INFRA FAILURE — 2 execution failures — PR #123
[AUTHEON Visual Regression] 4 visual differences — PR #123
[AUTHEON Visual Regression] BLOCKED — 4 visual differences — PR #123      (strict mode)
[AUTHEON Visual Regression] Passed — main                                 (opt-in only)
```

**Body** — repository, workflow, run number, run attempt, event, branch, PR
number, base SHA, head SHA, merge SHA, baseline SHA, baseline manifest state,
approved and checksum-verified baseline counts, regression status, blocking flag,
strict-mode flag, execution profile, browser/project, Playwright version, Docker
base image, viewport, visual-difference count, execution-failure count,
missing-baseline count, passed-snapshot count, expected and produced snapshot
counts, coverage percentage, declared missing coverage, orphan baseline count,
the direct GitHub run link, the artifact name, the `gh run download` command, and
the next action to take.

Each visual difference is shown as expected → actual → diff, inlined by
`cid:` content-id attachment (never a local Docker filesystem path in an
`<img src>`), with snapshot name, spec file, full test title, browser/project,
dimensions, changed pixel count, difference ratio, and changed-region
coordinates.

**Attachments** — the compact PDF report and `summary.json`, both size-capped.

**Linked, not attached** — traces, videos, the full HTML report, the
expected/actual/diff image set, and the tar.gz archive. These routinely exceed
SMTP message limits, and a rejected message loses the whole report.
