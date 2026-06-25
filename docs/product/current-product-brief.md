# AUTHEON — Current Product Brief

> **Status:** Current. For complete requirements, use [`../requirements/prd.json`](../requirements/prd.json).

## Product and users

AUTHEON is a vehicle-transport operations platform with two surfaces: a mobile-first driver PWA for drivers and an admin console for dispatch. The first release supports simple A-to-B vehicle tours only.

## Version 1 workflow

1. Dispatch creates a draft with a customer, separate pickup and delivery locations, schedules, vehicle data, and operational notes.
2. Dispatch either publishes the tour to the marketplace or directly assigns an active driver. These paths are mutually exclusive.
3. A driver accepts a published tour through a binding confirmation; the driver receives full tour data only after acceptance or direct assignment.
4. The driver marks the tour as performed, uploads any required tour documents, or uses **Report Problem** to cancel with a reason or report the tour as not performable.
5. Dispatch resolves special cases, reviews tour documents, and manages settlement separately from operational status.

## Core rules

- Operational statuses are: Draft, Published, Assigned, Accepted, Performed, Cancelled, and Special Case.
- The former return-request and return-window flow is not part of Version 1.
- Driver master data is maintained by dispatch; drivers submit change requests.
- Marketplace data is anonymised before acceptance. Full addresses, contacts, vehicle identifiers, and operational notes unlock only after commitment.
- The product uses external map-app handoff, not in-app GPS tracking.
- Full finance dashboards, accounting integration, historical Excel migration, CSV mass import, vehicle-condition documentation, and complex tour chains are out of scope.

## Evidence and validation

- [Current sitemap](sitemap.md)
- [Design system guide](../design-system.md)
- [Client written feedback](../../meetings/source/autheon_aw_written_feedback_en.md)
- [Meeting transcript with requirement index](../../meetings/source/autheon_aw_meeting_transcript_en_with_index.md)
- [Client-feedback comparison](../research/client-feedback-comparison.md)
- [Prototype validation](../requirements/prd-prototype-validation.md)

## Open production decisions

Keycloak is selected for authentication and role management. Map/distance provider, admin-alert recipients, file retention/security, exact Keycloak realm/client setup, and the final application display name still require production decisions before implementation.
