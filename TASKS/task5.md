# Task Title

**Standardize All System Dialogs Using the “Accept Tour” Dialog as the Reference**

---

# Task Description

Audit and update all dialogs across the Driver PWA and Admin Backend so they follow one consistent visual structure.

The existing **"Accept Tour"** dialog shown in the reference image must serve as the baseline for:

- Dialog proportions
- Spacing
- Corner treatment
- Content hierarchy
- Action placement

This task supports the existing **Task 9 – Job Acceptance** requirements and extends **Task 26** with system-wide visual QA coverage.

> **Note:** The reference is structural only. Its specific text, tour summary, slide-to-confirm control, and secondary action **must not** be copied into dialogs where those elements are not relevant.

---

# Standard Dialog Structure

Every dialog must use:

- Consistent outer corner rounding
- Clear spacing between the title, supporting content, and actions
- A clear primary title
- A title that is visually larger and more prominent than supporting text
- Centered title and supporting description by default
- Consistent action button sizing, spacing, and alignment

The dialog title should communicate the purpose immediately without requiring the user to read the supporting description.

Supporting text should explain:

- The consequence
- The required decision
- The expected outcome

while remaining visually subordinate to the title.

---

# Dialog Icons

Icons should only be displayed when they provide meaningful context, such as:

- Success
- Warning
- Error
- Destructive actions
- Recognizable action or content types

Icons must **not** be added purely for decoration.

Removing an unnecessary icon must **not** remove information required for the user to understand the dialog.

---

# Dialog Actions

### Single-Action Dialogs

Dialogs containing a single action may use:

- A wide
- Centered
- Primary action button

### Multiple-Action Dialogs

Dialogs containing multiple actions must clearly distinguish between:

- Primary action
- Secondary or cancel action
- Destructive action (where applicable)

Existing deliberate-confirmation mechanisms must remain unchanged where required.

For example, the **Accept Tour** slide-to-confirm interaction **must not** be replaced with a standard button as part of this visual standardization.

---

# QA and Implementation Scope

Review all existing dialog types, including:

- Confirmation dialogs
- Warning dialogs
- Success dialogs
- Error dialogs
- Destructive-action dialogs
- Selection or decision dialogs
- Dialogs containing forms
- Dialogs containing operational summaries

Where technically appropriate, dialogs should reuse shared dialog components or styling to prevent visual inconsistencies across the application.

Updated dialogs must remain fully usable across:

- Mobile
- Tablet
- Desktop

Dialog content must not:

- Overflow
- Become clipped
- Push actions outside the visible dialog area

---

# What Must Not Change

This task must **not** modify:

- Dialog business logic
- Validation rules
- Status transitions
- Permissions
- Existing action availability
- Approved button labels
- Legal wording
- Slide-to-confirm requirements
- Workflow-specific content

Only the following visual aspects are in scope:

- Layout
- Visual hierarchy
- Alignment
- Spacing
- Corner treatment
- Icon usage
- Action presentation

---

# Acceptance Criteria

- [ ] The **Accept Tour** dialog is documented or implemented as the visual reference for all system dialogs.
- [ ] All existing Driver PWA dialogs are reviewed against the agreed dialog standard.
- [ ] All existing Admin Backend dialogs are reviewed against the agreed dialog standard.
- [ ] Dialogs use consistent outer corner rounding.
- [ ] Dialogs use consistent internal spacing between headings, descriptions, content, and actions.
- [ ] Every dialog has a clear title that communicates its purpose.
- [ ] Dialog titles are visually larger and more prominent than supporting text.
- [ ] Titles and supporting descriptions are centered by default.
- [ ] Any dialog that does not use centered text has a documented, content-driven reason.
- [ ] Supporting text remains visually subordinate to the title.
- [ ] Icons appear only where they communicate meaningful status or context.
- [ ] Decorative or unnecessary dialog icons are removed.
- [ ] Removing an icon does not remove required meaning or status communication.
- [ ] Single-action dialogs use a wide, centered action button where appropriate.
- [ ] Multi-action dialogs clearly distinguish primary and secondary actions.
- [ ] Destructive actions remain visually distinguishable from safe or cancel actions.
- [ ] Action controls use consistent sizing, spacing, and alignment across all dialogs.
- [ ] Existing slide-to-confirm controls remain in workflows that require deliberate confirmation.
- [ ] The **Accept Tour** slide-to-confirm behavior remains unchanged.
- [ ] Dialog-specific summaries, forms, warnings, and legal text remain intact.
- [ ] No status transitions, validation rules, permissions, or workflow behavior change as part of this task.
- [ ] Long dialog content remains readable without clipping or overlapping action controls.
- [ ] Dialog actions remain reachable on supported mobile screen sizes.
- [ ] Dialog layouts remain usable across mobile, tablet, and desktop devices.
- [ ] Shared dialog components or design tokens are used wherever technically appropriate.
- [ ] QA verifies representative confirmation, warning, success, error, destructive, and selection dialogs against the agreed standard.

---

# Open Questions

1. What exact design tokens (corner radius, spacing, typography, and button widths) should define the shared dialog standard?
2. Which content-heavy dialogs are approved exceptions to the default centered title and description alignment?
3. Should bottom sheets and action sheets follow the same visual standard, or should they continue using a separate component specification?