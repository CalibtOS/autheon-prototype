# Task Title

**Implement Separate Marketplace Empty States for Unfiltered and Filtered Results**

---

# Task Description

Update the Marketplace empty-state logic so the displayed message accurately reflects whether Marketplace filters are currently active.

The current interface displays a filter-related empty-state message even when no filters have been applied. This is misleading because it suggests that orders exist but are being excluded by the active filters.

Implement two distinct Marketplace empty states based on the current filter state.

---

# Empty State: No Filters Active

When no Marketplace filters are active and there are no available open orders or tours, display a general availability message such as:

> **"There are currently no open orders."**

The message must **not** suggest that filters are responsible for the empty result.

---

# Empty State: Filters Active

When one or more Marketplace filters are active and no orders or tours match those filters, continue displaying the existing filter-related empty state.

The existing filtered-results message and behavior should remain unchanged.

---

# Behavior Requirements

The Marketplace empty state must update automatically whenever filters are:

- Applied
- Modified
- Cleared
- Reset

The displayed message must always reflect whether the empty result is caused by:

- No available Marketplace orders, or
- Active filters excluding all matching results

---

# Acceptance Criteria

- [ ] The system determines whether any Marketplace filters are currently active.
- [ ] When no filters are active and no open orders or tours exist, a general Marketplace empty state is displayed.
- [ ] The general empty state does not mention filters or imply that results were filtered out.
- [ ] When one or more filters are active and no results match, the existing filter-related empty state is displayed.
- [ ] The filter-related empty state is not displayed when no filters are active.
- [ ] Applying a filter updates the empty state to the filter-related version when no matching results exist.
- [ ] Clearing or resetting all filters updates the empty state to the general version when no open orders or tours exist.
- [ ] Available Marketplace results continue to be displayed normally whenever at least one matching order or tour exists.
- [ ] The existing filtered-results message and behavior remain unchanged apart from the new empty-state selection logic.

---

# Open Questions

1. What exact wording should be used for the general Marketplace empty-state message?
2. Should the user-facing terminology consistently use **"orders"** or **"tours"** throughout the Marketplace?
