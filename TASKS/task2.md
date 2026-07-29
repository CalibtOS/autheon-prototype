# Task Title

**Implement Type-Aware Notification Previews and Contextual Deep Links**

---

# Task Description

Update the Driver PWA Notification Center so notifications provide enough context before the driver leaves the overview and route directly to the relevant content.

This work extends **PRD Task 20 — Driver Push Notifications & Admin Critical Alerts** and must remain consistent with:

- Existing notification channel matrix
- Driver Marketplace visibility rules
- Infopoint behavior
- Notification preferences

The current notification cards already display:

- Unread indicator
- Heading
- Short description
- Date and time
- Related order number

However, they currently lack:

- Notification categories
- Expandable tour previews
- Consistent deep linking to the relevant destination

---

# Notification Overview

Each notification card must display:

- Notification category
- Meaningful heading identifying the event
- Short preview text (maximum two lines)
- Date and time
- Read/unread indication

Example notification categories include:

- Order
- Account
- System
- General Information

> **Note:** The final category taxonomy still requires confirmation.

The following existing behaviors must remain unchanged unless the final design explicitly changes them:

- Date grouping
- Unread indicators
- **Mark all read**
- Notification Center close behavior

---

# Tour-Related Notifications

Tour-related notifications must use an **inline expandable preview**.

Examples include:

- New matching Marketplace order
- Order updated after booking
- Order cancelled by Autheon
- Empty run recognised
- Empty run not recognised
- Other tour-specific operational updates

The collapsed notification card must identify the event and provide an expand/collapse control positioned on the right side.

### Expanded Preview

When expanded, the notification should display recognizable tour information where applicable:

- Pickup location
- Delivery location
- Company or address information (when permitted)
- Scheduled date
- Vehicle information
- Licence plate
- Relevant status or update details

All displayed information must follow the existing driver visibility rules.

A notification for an unaccepted Marketplace order **must not** expose:

- Customer details
- Full addresses
- Any information hidden in the Marketplace preview before acceptance

### Contextual Primary Actions

The expanded notification must provide a context-aware primary action, such as:

- **View order**
- **To my orders**
- **View more orders**

**View order** must open the appropriate destination based on the current order state:

- Full order details
- Marketplace preview

---

# Unavailable Marketplace Orders

If a Marketplace order referenced by a notification has since become unavailable (for example, assigned, withdrawn, cancelled, or expired):

- The notification must clearly indicate that the order is no longer available.
- The original **View order** action must be disabled or removed.
- The driver may instead be offered **View more orders**, which opens the Marketplace.
- The notification must not display stale availability information or allow an invalid acceptance attempt.

---

# Non-Tour Notifications

Infopoint messages and document notifications must **not** use the expandable tour preview.

Instead, selecting these notification types must deep-link directly to the relevant destination.

### Infopoint Notifications

- Open the exact message
- Or open the message detail page

### Document Notifications

- Open the exact document
- Or open the document preview

Other non-tour notification types (such as profile approval or rejection) should deep-link to their final destination once that destination has been confirmed.

---

# Push Notification Behavior

Selecting a smartphone push notification must **not** simply open the generic Notification Center.

Instead, navigation depends on the notification type.

### Tour-Related Push

- Open the corresponding notification
- Automatically expand its preview

### Infopoint Push

- Open the relevant Infopoint message

### Document Push

- Open the relevant document or document preview

The application must safely handle:

- Missing targets
- Invalid targets
- Expired targets
- Unauthorized targets

A safe fallback should always be shown instead of an empty or broken screen.

The following existing behavior must remain unchanged:

- Push notification opt-in rules
- Marketplace preference matching
- Direct assignments must **not** generate Marketplace-style new-order push notifications by default

---

# Notification Coverage

The Notification Center must surface the driver-facing events already defined by the PRD, including:

- Profile-change approvals
- Profile-change rejections
- Document-related updates
- New Infopoint messages
- Newly published matching Marketplace orders
- Order cancellation by Autheon
- Booked-order changes
- Empty-run review outcomes

This task only changes:

- Notification presentation
- Notification previews
- Navigation behavior

It **must not** independently change which events generate push notifications until the notification channel matrix is explicitly updated.

A universal overlay or bottom sheet must **not** become the default notification interaction model.

The agreed interaction model is:

- Expandable notification cards for tour-related events
- Direct deep links for Infopoint messages and documents

---

# Acceptance Criteria

- [ ] Every notification card displays a category.
- [ ] Every notification card displays a meaningful event heading.
- [ ] Preview text in the collapsed card is limited to a maximum of two lines.
- [ ] Every notification card displays its date and time.
- [ ] Read and unread notifications remain visually distinguishable.
- [ ] Existing date grouping remains available.
- [ ] Existing **Mark all read** behavior remains functional.
- [ ] Tour-related notifications display an expand/collapse control on the right side.
- [ ] Selecting the control expands the notification inline.
- [ ] Selecting the control again collapses the notification.
- [ ] Expanding a notification does not navigate away from the Notification Center.
- [ ] The expanded tour preview displays pickup and delivery information when available.
- [ ] The expanded tour preview displays the scheduled date when available.
- [ ] The expanded tour preview displays relevant vehicle information when available.
- [ ] The expanded tour preview displays the licence plate when available.
- [ ] Tour information follows the existing driver visibility matrix.
- [ ] Marketplace notifications shown before acceptance do not reveal protected customer or full-address information.
- [ ] Tour-related notifications provide an appropriate primary action.
- [ ] **View order** opens the correct order detail or Marketplace preview.
- [ ] Navigation is resolved using the notification's stable entity reference rather than display text or tour title.
- [ ] Unavailable Marketplace orders are clearly indicated.
- [ ] **View order** is unavailable when the referenced Marketplace order is no longer available.
- [ ] Unavailable notifications may provide **View more orders**.
- [ ] **View more orders** opens the Marketplace.
- [ ] Infopoint notifications do not display a tour-style accordion.
- [ ] Selecting an Infopoint notification opens the exact related message or message detail.
- [ ] Document notifications do not display a tour-style accordion.
- [ ] Selecting a document notification opens the exact related document or document preview.
- [ ] Tapping a tour-related push notification opens the corresponding notification in its expanded state.
- [ ] Tapping an Infopoint push notification opens the corresponding Infopoint message instead of the Notification Center overview.
- [ ] Tapping a document push notification opens the corresponding document instead of the Notification Center overview.
- [ ] Missing, unavailable, unauthorized, or invalid deep-link targets produce a safe fallback state.
- [ ] Notification behavior works when the PWA is:
  - Already open
  - Running in the background
  - Launched from a closed state
- [ ] Existing push preferences and event eligibility rules remain unchanged.
- [ ] Directly assigned orders do not begin generating Marketplace-style new-order push notifications as part of this task.
- [ ] The implementation does not introduce a universal bottom sheet for all notification types.

---

# Open Questions

1. What is the final approved category taxonomy and event-to-category mapping?
2. What is the approved visual design for the collapsed and expanded notification cards?
3. Which exact document event is meant by **new documents**?
   - Newly available admin documents
   - Document review outcomes
   - Both
4. Where should profile-change approval and rejection notifications deep-link within the Driver PWA?
5. Does **corresponding push notifications** change the current PRD notification channel matrix for profile approvals and document acceptance, which are currently in-app-only events?
6. For an unavailable Marketplace order, should **View more orders** always be shown, or only when additional Marketplace orders are currently available?