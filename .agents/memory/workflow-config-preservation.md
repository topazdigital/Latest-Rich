---
name: Workflow config preservation
description: Replit workflow and artifact metadata changes can replace rather than merge the project configuration
---

When changing workflow configuration, preserve the entire existing `.replit` file and validate replacements through the platform config flow rather than reconstructing only the workflow blocks.

**Why:** An artifact metadata update can remove configured workflows, and a validated replacement that contains only modules, deployment router, and workflows can silently drop deployment, ports, environment, and post-merge settings.

**How to apply:** Read or copy the current full config before replacing it, preserve unrelated sections byte-for-byte, then restart and verify every existing workflow.