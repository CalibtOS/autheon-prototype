# Task Title

**Replace Expandable Infopoint Messages with a Dedicated Message Detail Page**

---

# Task Description

Replace the current expandable message-card behavior in the Infopoint with a dedicated detail page for each message.

This change is required because longer announcements—such as updated Terms and Conditions (AGB) or client instructions—are difficult to read within an expandable list card.

---

# Infopoint Message List

Each message entry must display:

- Message title
- Message date
- Read/unread status

The following elements must be removed from the message list:

- Preview text
- Expandable message content

---

# Message Detail Page

Selecting a message must open a dedicated detail page containing:

- Message title
- Message date
- Full message content
- A back arrow in the upper-left corner

Opening a message must automatically:

- Mark the message as **read**
- Update its read/unread status in the Infopoint message list

Selecting the back arrow must return the user to the complete Infopoint message list.

---

# Nice-to-Have Navigation

Where technically supported, allow users to return to the Infopoint message list by swiping from the left edge of the screen, similar to the standard iPhone back-navigation gesture.

This gesture is optional and **must not** replace the visible back arrow.

---

# Acceptance Criteria

- [ ] Infopoint messages no longer expand within the message list.
- [ ] No message preview text is displayed in the list.
- [ ] Each message entry displays the message title.
- [ ] Each message entry displays the message date.
- [ ] Each message entry clearly indicates whether the message has been read or is unread.
- [ ] Selecting a message opens a dedicated message detail page.
- [ ] The detail page displays the message title.
- [ ] The detail page displays the message date.
- [ ] The detail page displays the complete message content.
- [ ] Opening an unread message automatically marks it as read.
- [ ] The updated read state is reflected when returning to the message list.
- [ ] A back arrow is displayed in the upper-left corner of the detail page.
- [ ] Selecting the back arrow returns the user to the complete Infopoint message list.
- [ ] Long messages remain fully readable without being truncated or constrained within an expandable list card.
- [ ] If implemented, swiping from the left edge returns the user to the Infopoint message list.
- [ ] The optional swipe gesture does not remove or replace the visible back arrow.

---

# Open Questions

1. Should the left-edge swipe gesture be implemented only on iOS, or on every supported platform where equivalent navigation is technically available?