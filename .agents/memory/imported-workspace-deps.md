---
name: Imported workspace dependencies
description: Dependency bootstrap behavior for imported pnpm workspaces with package-firewall restrictions
---

Imported workspaces may have no node_modules even when the lockfile is valid. A full frozen install can be blocked by a codegen-only package while the runtime packages are otherwise available.

**Why:** The app workflows need the frontend, API, database, and shared library dependencies, but not every workspace package is required to run or build the app.

**How to apply:** If a full frozen install is blocked by an unrelated codegen dependency, install the runtime workspace packages with pnpm filters and leave the lockfile and declared dependency versions unchanged. Keep the blocked package available for a later explicit codegen setup.

Offline lockfile-only refreshes can also fail when the Replit package mirror has no cached metadata for an already-locked dependency. For workspace-link-only changes, keep the existing versions, update only the importer entries, and install the affected workspaces with a frozen lockfile.

**Why:** Offline resolution still needs mirror metadata even when the dependency version is already present in the lockfile.

**How to apply:** Avoid offline lockfile regeneration when adding only local workspace packages; use a filtered frozen install and verify the importer links.

Keep package overrides in this workspace's existing `overrides` section in `pnpm-workspace.yaml`. Do not add a root-level `pnpm.overrides` object to `package.json`; it can replace the workspace override set and remove platform-specific package exclusions.

**Why:** A root-level override caused unrelated lockfile churn and dropped the workspace's non-Linux optional-binary exclusions. Adding the needed override alongside the existing workspace rules reduced the lockfile change to the intended package.

**How to apply:** Extend `pnpm-workspace.yaml`'s existing `overrides`, then review the lockfile diff to confirm the platform exclusions remain.