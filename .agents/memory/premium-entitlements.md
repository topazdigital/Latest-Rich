---
name: Premium entitlement recovery
description: How paid membership access stays correct when stored tier fields or historical duration data are stale
---

Active package subscriptions must be recalculated from the current admin-configured package days and priority, using completed order history, even for existing subscribers. Apply recalculation only while the stored subscription is active so later package increases do not reactivate expired members. Preserve manual grants without package orders. Historical duration labels must preserve their units; a week is not a month.

**Why:** The user wants admin package edits to take effect for current subscribers; a shorter configured duration must be able to expire an older subscription instead of leaving the old code duration in force.

**How to apply:** After saving package settings, recompute active package-backed users from completed card and manual orders using the current package slot's days and priority, then persist the result. Recompute a member lazily on authenticated reads/chat too, and do not reactivate an already-expired row.