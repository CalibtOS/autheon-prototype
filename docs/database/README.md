# Database design

This directory is the proposed production data design for AUTHEON Version 1.

- [`logical-model.md`](logical-model.md) explains the decisions, lifecycle rules, and implementation boundaries.
- [`schema.dbml`](schema.dbml) is the relational schema draft for review in DBML-compatible tools.

## Status

**Draft for architecture review.** The model targets PostgreSQL 16+ and deliberately does not select an authentication provider, object-storage provider, map/distance provider, or email provider. Those decisions change integrations and security configuration, not the core operational entities.

## Sources analysed

- [`../requirements/prd.json`](../requirements/prd.json) — canonical requirements and business rules.
- [`../product/current-product-brief.md`](../product/current-product-brief.md) — current Version 1 scope.
- [`../../prototype/project/store.js`](../../prototype/project/store.js) — prototype state, field shapes, and workflow behavior.
- [`../../meetings/source/autheon_aw_meeting_transcript_en_with_index.md`](../../meetings/source/autheon_aw_meeting_transcript_en_with_index.md) and [`../../meetings/source/autheon_aw_written_feedback_en.md`](../../meetings/source/autheon_aw_written_feedback_en.md) — client-source evidence.

## Design decisions already made

- Relational source of truth; no document database or spreadsheet-style job record.
- UUID primary keys, `timestamptz` timestamps, `numeric(12,2)` monetary values, and ISO country codes.
- Job addresses and ordering-party details are snapshotted at order creation; later master-data edits do not rewrite historical tours.
- Operational status, document-review status, and settlement status are independent.
- Job status, assignment, document review, and audit history are append-only records; current values are stored on the primary row for query efficiency.
- File bytes stay in object storage; PostgreSQL stores metadata, version references, review state, and access/audit information only.
- Notification events use an outbox so a committed business event cannot be lost if email or push delivery fails.

## Before implementation

Approve the open decisions in [`logical-model.md`](logical-model.md#open-decisions-that-affect-the-physical-schema), then translate this draft into versioned SQL migrations and database-level role/RLS policies.
