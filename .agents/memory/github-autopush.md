---
name: GitHub auto-push
description: How to push to GitHub after completing any task in this project
---

# GitHub publishing workflow

The user wants completed code changes pushed to GitHub at the end of each task.

**Why:** The user explicitly requested that every task end with a GitHub push, but pushing code must remain separate from changing the production server.

**How to apply:** Use the repository's push-only helper after the work builds. Do not use `scripts/push-to-github.sh` for a push-only request; it also deploys to the VPS. Never put a token in a Git remote or command URL. If the Replit GitHub proxy reports a disconnected connection, stop and ask the user to reconnect GitHub through the integration instead of retrying with a token URL.
