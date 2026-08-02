# AUTHEON sitemap (prototype + production targets)

> **Status:** Auth entries added for PRD v2.24. The remaining rows are **stale at PRD v1.8** — they still say "Special case" (removed in v2.6), "daily limit" (replaced by probation in v1.9) and "Not performable" (replaced by the empty-run workflow in v2.4). That drift is pre-existing and is **not** corrected here; canonical requirements: [`../requirements/prd.json`](../requirements/prd.json).

## Driver PWA

| Area | Entry | Notes |
|------|-------|-------|
| **Sign in** | **App entry** | Login gate (PR #32) — email + password; every row below is reachable only after sign-in. Forgot password → email → 6-digit code → new password. Set password from an invite link |
| Marketplace | Bottom tab | Pull-to-refresh; accept with daily limit + same-day overlap prompt |
| My Jobs | Bottom tab | Active, Performed, Cancelled, Special case |
| Tour detail | From My Jobs / marketplace | Map handoff; mark performed; upload documents on **active or performed** tours |
| Cancelled tour | My Jobs → Cancelled | Shows admin cancellation **reason + message** |
| Report Problem | Tour footer | Cancel (7 codes, 10+ chars) or Not performable |
| Infopoint | Bottom tab | General documents + news |
| Profile | Bottom tab | Navigation-list/drill-down structure; read-only master data + change request; account/email and password actions; notification and appearance/language settings; Feedback and Report an error open separate system-configured `mailto:` actions |

## Admin console

| Area | Entry | Notes |
|------|-------|-------|
| **Sign in** | **Console entry** | Login gate (PR #32) — same shared `LoginForm` / forgot-password / set-password primitives as the Driver PWA |
| Jobs overview | Sidebar Jobs | Primary **New job** CTA; filters |
| Job detail | Row click | Publish, assign, reassign, **Cancel** (reason modal), special case resolution |
| New / edit job | Jobs overview CTA | Customer + pickup + delivery; optional admin document attach |
| Tour documents | Sidebar | Review / reject / replace |
| Users / drivers | Sidebar | Driver profile incl. **daily job limit** |
| Profile change requests | Sidebar | Approve / reject queue |
| Settings | Sidebar Features | Three tabs: **User settings** (change email + change password, language + appearance) · **System settings** (operational policies plus one Help contacts card: Infopoint hotline/email, Feedback email, Report-an-error email) · **Prototype settings** (branding display name) |
| Infopoint | Sidebar | General docs + news |
| Audit log | Sidebar | Immutable actions |

## Operational policies (app_settings)

Managed under Admin → Settings:

- Minimum hours before pickup — admin cancel
- Minimum hours before pickup — schedule change
- Minimum characters — message to driver on admin cancel
- Default daily job acceptance limit
