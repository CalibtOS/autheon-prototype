# AUTHEON — Current Sitemap

> **Status:** Current for PRD v1.6. This document describes the active prototype structure and required product flows. The canonical requirements remain [`../requirements/prd.json`](../requirements/prd.json).

## Shared shell

- Product display name is configurable; the prototype default is **Transport Portal**.
- Users can switch language (EN/DE) and theme (light/dark).
- The driver PWA and admin console share a design language but serve different roles.

## Driver PWA

| Area | Entry | Primary content and actions |
| --- | --- | --- |
| Marketplace | Bottom tab: Marketplace | Published tours, filters, pull-to-refresh, reduced-data preview, binding slide-to-confirm acceptance. |
| My Jobs | Bottom tab: My Jobs | Active, Performed, Cancelled, and Special Case tours; full tour detail after assignment or acceptance; mark performed; upload permitted tour documents after performed. |
| Report Problem | Tour detail action | Cancel Order with reason, explanation, warning, terms link, and slide confirmation; or Report Order as Not Performable with optional evidence. |
| Infopoint | Bottom tab: Infopoint | General documents and news; unread-news badge; document view/download is a prototype stub. |
| Profile | Bottom tab: Profile | Read-only master data, master-data change request, in-app notifications, and notification preferences. |

### Driver visibility and transitions

Before acceptance, marketplace users see only decision-safe information: rough route, relevant dates, vehicle type, axle type, and driver offer. Customer, full locations, contacts, vehicle identifiers, and operational notes remain hidden.

```text
Draft ──publish──> Published ──binding acceptance──> Accepted ──mark performed──> Performed
  │
  └─direct assign──> Assigned ───────────────────────mark performed──> Performed

Assigned / Accepted ──Cancel Order──> Cancelled
Assigned / Accepted ──Not Performable──> Special Case ──dispatch decision──> Draft / Published / Performed / Cancelled
```

The former return-request and return-window flow is not part of the current product.

## Admin console

| Area | Purpose |
| --- | --- |
| Jobs | Daily operational overview, filters, New Job primary action, job detail, publish, direct assignment, reassignment, draft deletion, cancellation, and special-case resolution. |
| Notifications | Critical-event feed with deep links to the related tour or master-data request. |
| Profile change requests | Review, edit, approve, or reject driver master-data changes. |
| Users | Driver and admin account management. |
| Customers | Reusable reporting and billing entities. |
| Addresses | Reusable pickup and delivery locations and contacts. |
| Infopoint | General documents and news publishing. |
| Tour documents | Per-tour document review, document type/review/source filters, and billing-invoice handling. |
| Finance | Optional feature-flagged module only; it is not base Version 1 scope. |
| Audit log | Operational audit history and exports. |
| Features | Feature-flag configuration. |

## Cross-surface system flows

- A published tour is visible on the next marketplace fetch; direct assignments never appear in the marketplace.
- Acceptance, cancellation, not-performable reports, performed status, and document uploads create audit history and relevant notifications.
- Document review and settlement are separate from the operational tour status.
- Admins can resolve Special Case tours by continuing/adjusting work, republishing, administratively closing, or cancelling, subject to the PRD rules.

## Out of scope

No internal GPS tracking, customer booking portal, chat, full finance dashboard, accounting integration, CSV mass import, historical Excel migration, vehicle-condition module, or complex tour chains are included in Version 1.
