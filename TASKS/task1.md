# Task Title

**Create Audit Log Entries for Every Driver Document, Notification, and Infopoint Message View or Download**

---

# Task Description

Extend the existing Audit Log so that every relevant driver interaction in the Driver PWA is recorded as a separate audit entry.

This includes:

- Opening (viewing) documents
- Downloading documents
- Viewing notifications
- Viewing Infopoint messages (including the message detail view)

The PRD already requires traceability for driver-accessible content. This change ensures that all content interactions in the Driver PWA are consistently logged.

---

# Scope of Logging

An audit entry must be created for every:

- Document view (opened in the Driver PWA)
- Document download
- Notification view
- Infopoint message view (including opening the message detail page)

---

# Required Audit Log Data

Each audit entry must include, at minimum:

- A stable English action key
- The driver who performed the action
- The affected document, notification, or message
- The document version (where applicable)
- The timestamp of the action
- The action type (e.g. `viewed` or `downloaded`)
- The linked tour or job identifier (when applicable)
- Any additional metadata already available in the backend context

---

# Behavior Requirements

- Every interaction must create a separate audit entry (no merging or deduplication).
- Repeated views or downloads must each generate a new audit entry.
- Opening an Infopoint message (detail view) must always be logged as a **view**.
- The system must clearly distinguish between **viewed** and **downloaded** actions where applicable.

---

# Technical Constraints

- No new backend endpoint should be introduced for document logging.
- If document or notification data is already requested from the backend, the audit log entry should be created within that existing request flow.
- For Infopoint messages, every message detail view must generate an audit log entry immediately when opened.

---

# What Must Not Change

- Existing document preview functionality
- Existing document download behavior
- Existing document sharing
- Existing document printing
- Existing access control and permission logic
- Existing Infopoint message behavior
- Existing Infopoint navigation

Only the additional audit logging should be introduced.

---

# Acceptance Criteria

- [ ] Every document view in the Driver PWA creates a new Audit Log entry.
- [ ] Every document download creates a new Audit Log entry.
- [ ] Every notification view creates a new Audit Log entry.
- [ ] Every Infopoint message view (including opening the detail page) creates a new Audit Log entry.
- [ ] Each audit entry includes the driver identity.
- [ ] Each audit entry includes the affected document, notification, or message.
- [ ] Document entries include the document version when applicable.
- [ ] Each audit entry includes the timestamp of the action.
- [ ] Each audit entry clearly distinguishes between **viewed** and **downloaded** events where applicable.
- [ ] Every interaction creates a separate audit entry (no updates or merging).
- [ ] Repeated views or downloads generate multiple distinct audit entries.
- [ ] No new backend endpoint is introduced for document logging.
- [ ] Audit entries reuse existing backend request flows where possible.
- [ ] Infopoint message views are logged when the message detail page is opened.
- [ ] Existing document functionality remains unchanged.
- [ ] Existing notification functionality remains unchanged.
- [ ] Existing Infopoint navigation and behavior remain unchanged.

---

# Open Questions

1. Should **share** and **print** actions also be logged, or only **view** and **download**?
2. What is the preferred naming convention for audit action keys (e.g. `document_viewed`, `document_downloaded`, `message_viewed`)?
3. Should failed or unauthorized access attempts also be recorded, or only successful interactions?