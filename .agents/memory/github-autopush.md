---
name: GitHub auto-push
description: How to push to GitHub after completing any task in this project
---

# GitHub Auto-Push

After completing any task (or at the end of every session), push changes to GitHub.

**Command:**
```bash
bash scripts/push-to-github.sh
```

**Why:** The user explicitly requested that every agent session end with a push to GitHub.

**How to apply:** Run the push script as the final step of every task, after all code changes are done and the server builds successfully. `scripts/push-to-github.sh` bundles GitHub push AND an SSH deploy to the production server in one command — it requires both `GITHUB_TOKEN` and `SSH_PRIVATE_KEY` secrets and exits early if either is missing. If only `GITHUB_TOKEN` is available, just push directly instead: `git push https://<user>:${GITHUB_TOKEN}@github.com/topazdigital/Latest-Rich.git main` — don't chase down `SSH_PRIVATE_KEY` unless the user actually wants a production deploy, since that's a separate, more consequential action.

Note: Replit Secrets do not survive a project re-import — after any import/rollback, check `viewEnvVars({ type: "secret" })` before assuming `GITHUB_TOKEN` or `SSH_PRIVATE_KEY` still exist; request them again if missing rather than trusting old memory.

**Remote:** `https://github.com/topazdigital/Latest-Rich` (branch: `main`)

**Manual alternative:**
```bash
git push https://topazdigital:${GITHUB_TOKEN}@github.com/topazdigital/Latest-Rich.git main
```
