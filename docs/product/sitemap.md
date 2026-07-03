# AUTHEON sitemap (prototype + production targets)

> **Status:** Current for PRD v1.8. Canonical requirements: [`../requirements/prd.json`](../requirements/prd.json).

## Driver PWA

| Area | Entry | Notes |
|------|-------|-------|
| Marketplace | Bottom tab | Pull-to-refresh; accept with daily limit + same-day overlap prompt |
| My Jobs | Bottom tab | Active, Performed, Cancelled, Special case |
| Tour detail | From My Jobs / marketplace | Map handoff; mark performed; upload documents on **active or performed** tours |
| Cancelled tour | My Jobs → Cancelled | Shows admin cancellation **reason + message** |
| Report Problem | Tour footer | Cancel (7 codes, 10+ chars) or Not performable |
| Infopoint | Bottom tab | General documents + news |
| Profile | Bottom tab | Read-only master data; profile + **daily limit increase** change requests |

## Admin console

| Area | Entry | Notes |
|------|-------|-------|
| Jobs overview | Sidebar Jobs | Primary **New job** CTA; filters |
| Job detail | Row click | Publish, assign, reassign, **Cancel** (reason modal), special case resolution |
| New / edit job | Jobs overview CTA | Customer + pickup + delivery; optional admin document attach |
| Tour documents | Sidebar | Review / reject / replace |
| Users / drivers | Sidebar | Driver profile incl. **daily job limit** |
| Profile change requests | Sidebar | Approve / reject queue |
| Settings | Sidebar Features | Branding display name + **operational policies** (cutoffs, message rules) |
| Infopoint | Sidebar | General docs + news |
| Audit log | Sidebar | Immutable actions |

## Operational policies (app_settings)

Managed under Admin → Settings:

- Minimum hours before pickup — admin cancel
- Minimum hours before pickup — schedule change
- Minimum characters — message to driver on admin cancel
- Default daily job acceptance limit
