---
name: Imported workspace dependencies
description: Dependency bootstrap behavior for imported pnpm workspaces with package-firewall restrictions
---

Imported workspaces may have no node_modules even when the lockfile is valid. A full frozen install can be blocked by a codegen-only package while the runtime packages are otherwise available.

**Why:** The app workflows need the frontend, API, database, and shared library dependencies, but not every workspace package is required to run or build the app.

**How to apply:** If a full frozen install is blocked by an unrelated codegen dependency, install the runtime workspace packages with pnpm filters and leave the lockfile and declared dependency versions unchanged. Keep the blocked package available for a later explicit codegen setup.