---
name: Imported workspace dependencies
description: Dependency bootstrap behavior for imported pnpm workspaces with package-firewall restrictions
---

Imported workspaces may have no node_modules even when the lockfile is valid. A full frozen install can be blocked by a codegen-only package while the runtime packages are otherwise available.

**Why:** The app workflows need the frontend, API, database, and shared library dependencies, but not every workspace package is required to run or build the app.

**How to apply:** If a full frozen install is blocked by an unrelated codegen dependency, install the runtime workspace packages with pnpm filters and leave the lockfile and declared dependency versions unchanged. Keep the blocked package available for a later explicit codegen setup.

Keep package overrides in this workspace's existing `overrides` section in `pnpm-workspace.yaml`. Do not add a root-level `pnpm.overrides` object to `package.json`; it can replace the workspace override set and remove platform-specific package exclusions.

**Why:** A root-level override caused unrelated lockfile churn and dropped the workspace's non-Linux optional-binary exclusions. Adding the needed override alongside the existing workspace rules reduced the lockfile change to the intended package.

**How to apply:** Extend `pnpm-workspace.yaml`'s existing `overrides`, then review the lockfile diff to confirm the platform exclusions remain.