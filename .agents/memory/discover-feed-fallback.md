---
name: Discover feed fallback
description: User-confirmed recovery behavior for keeping the default Discover feed populated when the primary search fails.
---

For the default, unfiltered Discover feed, fall back to the existing suggestions endpoint if paginated search fails. Continue honoring the member's gender preference and age range. Do not use this fallback when text search or other filters are active, since that could show unrelated profiles.

**Why:** The user confirmed profiles appeared again after this recovery behavior was added.

**How to apply:** Preserve the default-feed-only condition and the gender/age checks when changing Discover search or error handling. Keep the primary search as the normal path.
