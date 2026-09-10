---
name: Premium entitlement recovery
description: How paid membership access stays correct when stored user tier fields are missing or stale
---

Active premium access must be resolved from both the user entitlement fields and completed premium order history. A paid order can predate the priority field or be manually approved while leaving the user row at a lower tier.

**Why:** Contact sharing is a tiered benefit, and relying only on `users.premium_priority` caused valid Priority 2 purchases to be rejected as non-premium.

**How to apply:** Keep the user row as the fast path, recover a higher priority from completed card or manual premium orders when needed, and persist the repaired priority. Always enforce the membership expiry when authorizing benefits.