---
name: Premium entitlement recovery
description: How paid membership access stays correct when stored tier fields or historical duration data are stale
---

Active premium access must be resolved from both the user entitlement fields and completed premium order history, but only while the stored expiry is still active. Historical duration labels must preserve their units; a week is not a month.

**Why:** Contact sharing is a tiered benefit, and stale premium flags or incorrect legacy durations can grant access after expiry.

**How to apply:** Keep the user row as the fast path, recover a higher priority from completed card or manual premium orders when needed, and persist repaired status. Normalize every API/UI representation from expiry, and parse days, weeks, months, and years distinctly.